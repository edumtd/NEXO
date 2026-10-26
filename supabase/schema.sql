-- NEXO · Esquema inicial con Row Level Security
-- Ejecutar en el SQL Editor de Supabase.
-- Privacidad: no se almacenan kardex, calificaciones ni horario académico completo;
-- solo bloques de disponibilidad, visibles únicamente para su dueño.

create extension if not exists "pgcrypto";

-- ───────────────────────── Tipos ─────────────────────────
create type user_role as enum ('estudiante', 'negocio');
create type business_category as enum ('cafeteria', 'restaurante', 'comercio', 'eventos', 'libreria');
create type employment_type as enum ('medio_tiempo', 'fin_de_semana', 'por_evento', 'turno_fijo');
create type salary_period as enum ('hora', 'dia', 'semana', 'mes');
create type vacancy_status as enum ('activa', 'pausada', 'cerrada');
create type application_status as enum ('recibida', 'entrevista', 'aceptada', 'rechazada');

-- ───────────────────────── Tablas ─────────────────────────
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now()
);

create table student_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  full_name text not null,
  career text not null default '',
  university text not null default '',
  zone text not null default '',
  skills text[] not null default '{}',
  interests business_category[] not null default '{}',
  availability_period text not null default '',
  updated_at timestamptz not null default now()
);

create table business_profiles (
  id uuid primary key references profiles (id) on delete cascade,
  name text not null,
  category business_category not null,
  zone text not null default '',
  address text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  description text not null default '',
  verified boolean not null default false, -- solo editable por administración (service role)
  updated_at timestamptz not null default now()
);

create table availability_blocks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles (id) on delete cascade,
  day smallint not null check (day between 0 and 6),         -- 0 = lunes
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  check (end_minute > start_minute)
);
create index on availability_blocks (student_id);

create table vacancies (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles (id) on delete cascade,
  title text not null check (length(title) >= 3),
  type employment_type not null,
  salary numeric(10, 2) not null check (salary > 0),
  salary_period salary_period not null,
  days smallint[] not null check (array_length(days, 1) >= 1),
  start_minute smallint not null check (start_minute between 0 and 1439),
  end_minute smallint not null check (end_minute between 1 and 1440),
  zone text not null,
  address text not null,
  activities text[] not null check (array_length(activities, 1) >= 1),
  requirements text[] not null check (array_length(requirements, 1) >= 1),
  start_date date not null,
  openings smallint not null check (openings >= 1),
  status vacancy_status not null default 'activa',
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index on vacancies (business_id);
create index on vacancies (status);

create table applications (
  id uuid primary key default gen_random_uuid(),
  vacancy_id uuid not null references vacancies (id) on delete cascade,
  student_id uuid not null references student_profiles (id) on delete cascade,
  status application_status not null default 'recibida',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vacancy_id, student_id)
);
create index on applications (student_id);
create index on applications (vacancy_id);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on notifications (user_id);

-- ───────────────────────── Funciones auxiliares ─────────────────────────
create or replace function is_vacancy_owner(v_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from vacancies v where v.id = v_id and v.business_id = auth.uid());
$$;

create or replace function business_has_applicant(s_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from applications a
    join vacancies v on v.id = a.vacancy_id
    where a.student_id = s_id and v.business_id = auth.uid()
  );
$$;

-- Compatibilidad calculada en servidor para que el negocio NO lea los bloques del estudiante.
-- Devuelve 'compatible' | 'parcial' | 'no_compatible'.
create or replace function application_compatibility(app_id uuid)
returns text language plpgsql security definer stable set search_path = public as $$
declare
  v record;
  d smallint;
  covered int;
  full_days int := 0;
  any_cover boolean := false;
begin
  select vac.*, a.student_id into v
  from applications a join vacancies vac on vac.id = a.vacancy_id
  where a.id = app_id and (vac.business_id = auth.uid() or a.student_id = auth.uid());
  if not found then return null; end if;

  foreach d in array v.days loop
    select coalesce(sum(greatest(0, least(b.end_minute, v.end_minute) - greatest(b.start_minute, v.start_minute))), 0)
      into covered
      from availability_blocks b
      where b.student_id = v.student_id and b.day = d;
    -- Nota: asume bloques sin traslape (la app los fusiona antes de guardar).
    if covered >= v.end_minute - v.start_minute then full_days := full_days + 1; end if;
    if covered > 0 then any_cover := true; end if;
  end loop;

  if full_days = array_length(v.days, 1) then return 'compatible';
  elsif any_cover then return 'parcial';
  else return 'no_compatible';
  end if;
end;
$$;

-- Notifica al estudiante cuando cambia el estado de su postulación.
create or replace function notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into notifications (user_id, title, body)
    select new.student_id, 'Tu postulación cambió de estado',
           format('%s marcó tu postulación a "%s" como %s.', b.name, v.title, new.status)
    from vacancies v join business_profiles b on b.id = v.business_id
    where v.id = new.vacancy_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_application_status
  before update on applications
  for each row execute function notify_application_status();

-- ───────────────────────── RLS ─────────────────────────
alter table profiles enable row level security;
alter table student_profiles enable row level security;
alter table business_profiles enable row level security;
alter table availability_blocks enable row level security;
alter table vacancies enable row level security;
alter table applications enable row level security;
alter table notifications enable row level security;

-- profiles: cada quien ve y crea solo el suyo
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());

-- student_profiles: dueño total; negocio solo lectura si el estudiante se postuló a sus vacantes
create policy "student_select_own" on student_profiles for select using (id = auth.uid());
create policy "student_select_by_business" on student_profiles for select using (business_has_applicant(id));
create policy "student_insert_own" on student_profiles for insert with check (id = auth.uid());
create policy "student_update_own" on student_profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- business_profiles: lectura pública para usuarios autenticados (necesaria para ver vacantes)
create policy "business_select_auth" on business_profiles for select to authenticated using (true);
create policy "business_insert_own" on business_profiles for insert with check (id = auth.uid() and verified = false);
create policy "business_update_own" on business_profiles for update using (id = auth.uid())
  with check (id = auth.uid() and verified = (select bp.verified from business_profiles bp where bp.id = auth.uid()));

-- availability_blocks: SOLO el estudiante dueño (nunca públicos, ni para negocios)
create policy "availability_all_own" on availability_blocks for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- vacancies: autenticados ven las activas; el negocio ve y gestiona todas las suyas
create policy "vacancies_select_active" on vacancies for select to authenticated using (status = 'activa');
create policy "vacancies_select_own" on vacancies for select using (business_id = auth.uid());
create policy "vacancies_insert_own" on vacancies for insert with check (business_id = auth.uid());
create policy "vacancies_update_own" on vacancies for update using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "vacancies_delete_own" on vacancies for delete using (business_id = auth.uid());

-- applications: el estudiante crea y ve las suyas (solo a vacantes activas);
-- el negocio ve y actualiza el estado de las recibidas en sus vacantes
create policy "applications_select_student" on applications for select using (student_id = auth.uid());
create policy "applications_insert_student" on applications for insert with check (
  student_id = auth.uid()
  and status = 'recibida'
  and exists (select 1 from vacancies v where v.id = vacancy_id and v.status = 'activa')
);
create policy "applications_select_business" on applications for select using (is_vacancy_owner(vacancy_id));
create policy "applications_update_business" on applications for update
  using (is_vacancy_owner(vacancy_id)) with check (is_vacancy_owner(vacancy_id));

-- notifications: solo el destinatario
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ═════════════════════════ Talento: servicios de estudiantes y egresados ═════════════════════════
-- Agregado después del esquema inicial. No modifica tablas ni políticas existentes;
-- solo agrega una columna nueva a student_profiles.

create type academic_status as enum ('activo', 'egresado');
alter table student_profiles add column academic_status academic_status not null default 'activo';

create type service_category as enum (
  'marketing', 'administracion', 'contabilidad', 'diseno',
  'programacion', 'fotografia_video', 'idiomas', 'eventos'
);
create type service_modality as enum ('presencial', 'remoto', 'hibrido');
create type rate_period as enum ('hora', 'proyecto');
create type service_offer_status as enum ('activo', 'pausado');
create type service_request_status as enum ('enviada', 'aceptada', 'rechazada', 'completada');

create table service_offers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references student_profiles (id) on delete cascade,
  title text not null check (length(title) between 3 and 60),
  category service_category not null,
  description text not null check (length(description) between 20 and 500),
  deliverables text[] not null check (array_length(deliverables, 1) >= 1),
  modality service_modality not null,
  zone text not null default '',
  rate numeric(10, 2) not null check (rate > 0), -- tarifa de referencia; el pago ocurre fuera de NEXO
  rate_period rate_period not null,
  portfolio_url text check (portfolio_url is null or portfolio_url ~ '^https://'),
  status service_offer_status not null default 'activo',
  created_at timestamptz not null default now(),
  check (modality = 'remoto' or zone <> '')
);
create index on service_offers (student_id);
create index on service_offers (status, category);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references service_offers (id) on delete cascade,
  business_id uuid not null references business_profiles (id) on delete cascade,
  message text not null check (length(message) between 10 and 500),
  days smallint[],                 -- solo presencial o híbrido; 0 = lunes
  start_minute smallint check (start_minute between 0 and 1439),
  end_minute smallint check (end_minute between 1 and 1440),
  status service_request_status not null default 'enviada',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (days is null and start_minute is null and end_minute is null)
    or (array_length(days, 1) >= 1 and end_minute - start_minute >= 60)
  )
);
create index on service_requests (offer_id);
create index on service_requests (business_id);
-- Una sola solicitud abierta por servicio y negocio.
create unique index service_requests_one_open
  on service_requests (offer_id, business_id)
  where status in ('enviada', 'aceptada');

-- ───────────────────────── Funciones auxiliares ─────────────────────────
create or replace function is_business()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'negocio');
$$;

create or replace function owns_service_offer(o_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from service_offers o where o.id = o_id and o.student_id = auth.uid());
$$;

-- Perfil público para Talento: solo columnas no sensibles, solo para negocios,
-- y solo de estudiantes con al menos un servicio activo. Sin correo ni disponibilidad.
create or replace function talent_profiles()
returns table (
  id uuid, full_name text, career text, university text,
  zone text, skills text[], academic_status academic_status
)
language sql security definer stable set search_path = public as $$
  select sp.id, sp.full_name, sp.career, sp.university, sp.zone, sp.skills, sp.academic_status
  from student_profiles sp
  where is_business()
    and exists (select 1 from service_offers o where o.student_id = sp.id and o.status = 'activo');
$$;

-- Correo del estudiante: solo para el negocio que envió la solicitud y solo si fue aceptada.
create or replace function service_request_contact(req_id uuid)
returns text language sql security definer stable set search_path = public, auth as $$
  select u.email
  from service_requests r
  join service_offers o on o.id = r.offer_id
  join auth.users u on u.id = o.student_id
  where r.id = req_id
    and r.business_id = auth.uid()
    and r.status in ('aceptada', 'completada');
$$;

-- Compatibilidad del horario propuesto, calculada en servidor (el negocio no lee los bloques).
create or replace function service_request_compatibility(req_id uuid)
returns text language plpgsql security definer stable set search_path = public as $$
declare
  r record;
  d smallint;
  covered int;
  full_days int := 0;
  any_cover boolean := false;
begin
  select sr.days, sr.start_minute, sr.end_minute, o.student_id into r
  from service_requests sr join service_offers o on o.id = sr.offer_id
  where sr.id = req_id and (sr.business_id = auth.uid() or o.student_id = auth.uid());
  if not found or r.days is null then return null; end if;

  foreach d in array r.days loop
    select coalesce(sum(greatest(0, least(b.end_minute, r.end_minute) - greatest(b.start_minute, r.start_minute))), 0)
      into covered
      from availability_blocks b
      where b.student_id = r.student_id and b.day = d;
    if covered >= r.end_minute - r.start_minute then full_days := full_days + 1; end if;
    if covered > 0 then any_cover := true; end if;
  end loop;

  if full_days = array_length(r.days, 1) then return 'compatible';
  elsif any_cover then return 'parcial';
  else return 'no_compatible';
  end if;
end;
$$;

-- Notificaciones y protección de campos: solo puede cambiar el estado.
create or replace function on_service_request_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o record;
  b_name text;
  s_name text;
begin
  select so.student_id, so.title into o from service_offers so where so.id = new.offer_id;
  select bp.name into b_name from business_profiles bp where bp.id = new.business_id;
  select sp.full_name into s_name from student_profiles sp where sp.id = o.student_id;

  if tg_op = 'INSERT' then
    insert into notifications (user_id, title, body)
    values (o.student_id, 'Nueva solicitud de servicio',
            format('%s te envió una solicitud para "%s".', b_name, o.title));
    return new;
  end if;

  if (new.offer_id, new.business_id, new.message, new.days, new.start_minute, new.end_minute)
     is distinct from (old.offer_id, old.business_id, old.message, old.days, old.start_minute, old.end_minute) then
    raise exception 'Solo se puede cambiar el estado de una solicitud';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('aceptada', 'rechazada') then
      insert into notifications (user_id, title, body)
      values (new.business_id,
              case when new.status = 'aceptada' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
              format('%s %s tu solicitud para "%s".', s_name,
                     case when new.status = 'aceptada' then 'aceptó' else 'rechazó' end, o.title));
    elsif new.status = 'completada' then
      insert into notifications (user_id, title, body)
      values (o.student_id, 'Servicio completado',
              format('%s marcó como completado "%s".', b_name, o.title));
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_service_request_insert
  after insert on service_requests
  for each row execute function on_service_request_change();

create trigger on_service_request_update
  before update on service_requests
  for each row execute function on_service_request_change();

-- ───────────────────────── RLS ─────────────────────────
alter table service_offers enable row level security;
alter table service_requests enable row level security;

-- service_offers: solo cuentas de negocio leen las activas; el estudiante gestiona las suyas
create policy "service_offers_select_business" on service_offers for select
  using (status = 'activo' and is_business());
create policy "service_offers_all_own" on service_offers for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- service_requests: el negocio crea y lee las suyas, y solo puede marcar como completada una aceptada
create policy "service_requests_insert_business" on service_requests for insert
  with check (
    business_id = auth.uid()
    and is_business()
    and status = 'enviada'
    and exists (select 1 from service_offers o where o.id = offer_id and o.status = 'activo')
  );
create policy "service_requests_select_business" on service_requests for select
  using (business_id = auth.uid());
create policy "service_requests_complete_business" on service_requests for update
  using (business_id = auth.uid() and status = 'aceptada')
  with check (business_id = auth.uid() and status = 'completada');

-- el estudiante lee las solicitudes a sus servicios y solo acepta o rechaza las enviadas
create policy "service_requests_select_student" on service_requests for select
  using (owns_service_offer(offer_id));
create policy "service_requests_respond_student" on service_requests for update
  using (owns_service_offer(offer_id) and status = 'enviada')
  with check (owns_service_offer(offer_id) and status in ('aceptada', 'rechazada'));

-- ═════════════════════════ Notificaciones del negocio ═════════════════════════
-- Avisa al negocio cuando un estudiante se postula a una de sus vacantes.
-- Solo incluye nombre del estudiante y título de la vacante (sin correo ni disponibilidad).
create or replace function notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, title, body)
  select v.business_id, 'Nueva postulación',
         format('%s se postuló a "%s".', sp.full_name, v.title)
  from vacancies v
  join student_profiles sp on sp.id = new.student_id
  where v.id = new.vacancy_id;
  return new;
end;
$$;

create trigger on_application_insert
  after insert on applications
  for each row execute function notify_new_application();

-- ═════════════════════════ Notificaciones interactivas ═════════════════════════
-- Cada notificación lleva un tipo y una ruta interna de la app a la que lleva al tocarla.
alter table notifications
  add column kind text not null default 'sistema'
    check (kind in ('postulacion', 'solicitud_servicio', 'sistema'));
alter table notifications
  add column link text
    check (link is null or (link like '/%' and link not like '//%'));

-- Redefinimos las funciones que insertan notificaciones para que llenen kind y link.
create or replace function notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    insert into notifications (user_id, kind, link, title, body)
    select new.student_id, 'postulacion', '/estudiante/vacante/' || v.id,
           'Tu postulación cambió de estado',
           format('%s marcó tu postulación a "%s" como %s.', b.name, v.title, new.status)
    from vacancies v join business_profiles b on b.id = v.business_id
    where v.id = new.vacancy_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, kind, link, title, body)
  select v.business_id, 'postulacion', '/negocio/postulaciones?vacancy=' || v.id,
         'Nueva postulación',
         format('%s se postuló a "%s".', sp.full_name, v.title)
  from vacancies v
  join student_profiles sp on sp.id = new.student_id
  where v.id = new.vacancy_id;
  return new;
end;
$$;

create or replace function on_service_request_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o record;
  b_name text;
  s_name text;
begin
  select so.student_id, so.title into o from service_offers so where so.id = new.offer_id;
  select bp.name into b_name from business_profiles bp where bp.id = new.business_id;
  select sp.full_name into s_name from student_profiles sp where sp.id = o.student_id;

  if tg_op = 'INSERT' then
    insert into notifications (user_id, kind, link, title, body)
    values (o.student_id, 'solicitud_servicio', '/estudiante/servicios', 'Nueva solicitud de servicio',
            format('%s te envió una solicitud para "%s".', b_name, o.title));
    return new;
  end if;

  if (new.offer_id, new.business_id, new.message, new.days, new.start_minute, new.end_minute)
     is distinct from (old.offer_id, old.business_id, old.message, old.days, old.start_minute, old.end_minute) then
    raise exception 'Solo se puede cambiar el estado de una solicitud';
  end if;

  if new.status is distinct from old.status then
    if new.status in ('aceptada', 'rechazada') then
      insert into notifications (user_id, kind, link, title, body)
      values (new.business_id, 'solicitud_servicio', '/negocio/postulaciones?tipo=servicios',
              case when new.status = 'aceptada' then 'Solicitud aceptada' else 'Solicitud rechazada' end,
              format('%s %s tu solicitud para "%s".', s_name,
                     case when new.status = 'aceptada' then 'aceptó' else 'rechazó' end, o.title));
    elsif new.status = 'completada' then
      insert into notifications (user_id, kind, link, title, body)
      values (o.student_id, 'solicitud_servicio', '/estudiante/servicios', 'Servicio completado',
              format('%s marcó como completado "%s".', b_name, o.title));
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ═════════════════════════ Seguimiento de servicios (Talento) ═════════════════════════
-- Flujo: enviada → aceptada (con fecha estimada) → en_proceso → entregada → completada
--        enviada → rechazada · enviada|aceptada → cancelada (cualquiera de las partes, con motivo)
--        entregada → en_proceso (el negocio pide ajustes)
--
-- IMPORTANTE: ejecuta primero estas 3 líneas por separado. Postgres no permite usar
-- valores nuevos de un enum en la misma transacción en que se agregan.
alter type service_request_status add value if not exists 'en_proceso';
alter type service_request_status add value if not exists 'entregada';
alter type service_request_status add value if not exists 'cancelada';

-- ── A partir de aquí, ejecútalo en una segunda corrida ──

alter table service_requests add column estimated_date date;
alter table service_requests add column cancel_reason text
  check (cancel_reason is null or length(cancel_reason) between 10 and 300);
alter table service_requests add column cancelled_by user_role;

-- Una sola solicitud abierta por servicio y negocio, ahora contando los estados nuevos.
-- (Índice adicional; el original sigue existiendo y queda cubierto por este.)
create unique index service_requests_one_open_v2
  on service_requests (offer_id, business_id)
  where status in ('enviada', 'aceptada', 'en_proceso', 'entregada');

-- Bitácora estructurada (no es chat): el prestador registra avances, cambios de fecha y entregas;
-- el negocio solo escribe al pedir ajustes.
create table service_updates (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references service_requests (id) on delete cascade,
  kind text not null check (kind in ('avance', 'ajuste', 'cambio_fecha', 'entrega')),
  message text not null check (length(message) between 10 and 300),
  link text check (link is null or link ~ '^https://'),
  created_at timestamptz not null default now()
);
create index on service_updates (request_id);

alter table service_updates enable row level security;

-- Solo las dos partes de la solicitud leen su bitácora.
create policy "service_updates_select_parties" on service_updates for select
  using (exists (
    select 1 from service_requests r
    where r.id = request_id and (r.business_id = auth.uid() or owns_service_offer(r.offer_id))
  ));

-- El prestador inserta avances/cambios de fecha/entregas mientras el trabajo está en proceso.
-- Orden esperado desde la app: insertar la entrega y después cambiar el estado a 'entregada'.
create policy "service_updates_insert_student" on service_updates for insert
  with check (
    kind in ('avance', 'cambio_fecha', 'entrega')
    and exists (
      select 1 from service_requests r
      where r.id = request_id and owns_service_offer(r.offer_id) and r.status = 'en_proceso'
    )
  );

-- El negocio solo inserta 'ajuste' sobre una entrega pendiente de revisar.
-- Orden esperado: insertar el ajuste y después regresar el estado a 'en_proceso'.
create policy "service_updates_insert_business" on service_updates for insert
  with check (
    kind = 'ajuste'
    and exists (
      select 1 from service_requests r
      where r.id = request_id and r.business_id = auth.uid() and r.status = 'entregada'
    )
  );
-- Sin políticas de UPDATE ni DELETE: la bitácora es inmutable.

-- Las políticas de UPDATE ahora solo identifican a las partes;
-- qué transición puede hacer cada rol lo valida el trigger.
drop policy "service_requests_complete_business" on service_requests;
drop policy "service_requests_respond_student" on service_requests;

create policy "service_requests_update_business" on service_requests for update
  using (business_id = auth.uid()) with check (business_id = auth.uid());
create policy "service_requests_update_student" on service_requests for update
  using (owns_service_offer(offer_id)) with check (owns_service_offer(offer_id));

-- Valida transiciones por rol, protege campos y notifica a la otra parte con enlace al detalle.
create or replace function on_service_request_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  o record;
  b_name text;
  s_name text;
  actor user_role;
  move text;
  student_link text := '/estudiante/solicitud/' || new.id;
  business_link text := '/negocio/solicitud/' || new.id;
begin
  select so.student_id, so.title into o from service_offers so where so.id = new.offer_id;
  select bp.name into b_name from business_profiles bp where bp.id = new.business_id;
  select sp.full_name into s_name from student_profiles sp where sp.id = o.student_id;

  if tg_op = 'INSERT' then
    insert into notifications (user_id, kind, link, title, body)
    values (o.student_id, 'solicitud_servicio', student_link, 'Nueva solicitud de servicio',
            format('%s te envió una solicitud para "%s".', b_name, o.title));
    return new;
  end if;

  if (new.offer_id, new.business_id, new.message, new.days, new.start_minute, new.end_minute, new.created_at)
     is distinct from (old.offer_id, old.business_id, old.message, old.days, old.start_minute, old.end_minute, old.created_at) then
    raise exception 'Solo se puede cambiar el estado, la fecha estimada o la cancelación';
  end if;

  -- auth.uid() es null cuando escribe el service role (administración): se permite sin validar.
  if auth.uid() is null then
    new.updated_at := now();
    return new;
  elsif auth.uid() = new.business_id then
    actor := 'negocio';
  elsif auth.uid() = o.student_id then
    actor := 'estudiante';
  else
    raise exception 'No participas en esta solicitud';
  end if;

  move := old.status::text || '>' || new.status::text;

  if new.status = old.status then
    -- Único cambio sin transición: el prestador mueve la fecha estimada durante el trabajo.
    if new.estimated_date is distinct from old.estimated_date then
      if actor <> 'estudiante' or new.status <> 'en_proceso' or new.estimated_date < current_date then
        raise exception 'Cambio de fecha no permitido';
      end if;
      insert into notifications (user_id, kind, link, title, body)
      values (new.business_id, 'solicitud_servicio', business_link, 'Cambio de fecha estimada',
              format('%s movió la entrega de "%s" al %s.', s_name, o.title, to_char(new.estimated_date, 'DD/MM/YYYY')));
    end if;
    new.updated_at := now();
    return new;
  end if;

  if actor = 'estudiante' and move in ('enviada>aceptada', 'enviada>rechazada', 'aceptada>en_proceso',
                                       'en_proceso>entregada', 'aceptada>cancelada') then
    null;
  elsif actor = 'negocio' and move in ('entregada>completada', 'entregada>en_proceso',
                                       'enviada>cancelada', 'aceptada>cancelada') then
    null;
  else
    raise exception 'Transición no permitida para %: %', actor, move;
  end if;

  if new.status = 'aceptada' and (new.estimated_date is null or new.estimated_date < current_date) then
    raise exception 'Aceptar requiere una fecha estimada de entrega no anterior a hoy';
  end if;
  if new.status = 'cancelada' and (new.cancel_reason is null or new.cancelled_by is distinct from actor) then
    raise exception 'Cancelar requiere motivo y debe registrarse quién cancela';
  end if;

  if actor = 'estudiante' then
    insert into notifications (user_id, kind, link, title, body)
    values (new.business_id, 'solicitud_servicio', business_link,
      case new.status
        when 'aceptada' then 'Solicitud aceptada'
        when 'rechazada' then 'Solicitud rechazada'
        when 'en_proceso' then 'Trabajo iniciado'
        when 'entregada' then 'Servicio entregado'
        else 'Solicitud cancelada' end,
      case new.status
        when 'aceptada' then format('%s aceptó tu solicitud para "%s". Entrega estimada: %s.', s_name, o.title, to_char(new.estimated_date, 'DD/MM/YYYY'))
        when 'rechazada' then format('%s rechazó tu solicitud para "%s".', s_name, o.title)
        when 'en_proceso' then format('%s comenzó a trabajar en "%s".', s_name, o.title)
        when 'entregada' then format('%s marcó como entregado "%s". Revisa y confirma.', s_name, o.title)
        else format('%s canceló la solicitud de "%s". Motivo: %s', s_name, o.title, new.cancel_reason) end);
  else
    insert into notifications (user_id, kind, link, title, body)
    values (o.student_id, 'solicitud_servicio', student_link,
      case new.status
        when 'completada' then 'Servicio finalizado'
        when 'en_proceso' then 'Ajustes solicitados'
        else 'Solicitud cancelada' end,
      case new.status
        when 'completada' then format('%s confirmó como finalizado "%s".', b_name, o.title)
        when 'en_proceso' then format('%s pidió ajustes en "%s".', b_name, o.title)
        else format('%s canceló la solicitud de "%s". Motivo: %s', b_name, o.title, new.cancel_reason) end);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- Notifica al negocio cada avance publicado (entregas, ajustes y fechas se notifican al cambiar la solicitud).
create or replace function notify_service_progress()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind = 'avance' then
    insert into notifications (user_id, kind, link, title, body)
    select r.business_id, 'solicitud_servicio', '/negocio/solicitud/' || r.id, 'Nuevo avance',
           format('%s publicó un avance en "%s".', sp.full_name, so.title)
    from service_requests r
    join service_offers so on so.id = r.offer_id
    join student_profiles sp on sp.id = so.student_id
    where r.id = new.request_id;
  end if;
  return new;
end;
$$;

create trigger on_service_update_insert
  after insert on service_updates
  for each row execute function notify_service_progress();

-- El correo del prestador se muestra al negocio a partir de que acepta (incluye los estados nuevos).
create or replace function service_request_contact(req_id uuid)
returns text language sql security definer stable set search_path = public, auth as $$
  select u.email
  from service_requests r
  join service_offers o on o.id = r.offer_id
  join auth.users u on u.id = o.student_id
  where r.id = req_id
    and r.business_id = auth.uid()
    and r.status in ('aceptada', 'en_proceso', 'entregada', 'completada');
$$;

-- ═════════════════════════ Fase A: carga semanal, periodo, guardadas y alertas ═════════════════════════
-- Todos estos datos son privados del estudiante: la RLS existente de student_profiles
-- ya impide que otros estudiantes los lean. Los negocios solo leen perfiles de quienes se
-- postularon (business_has_applicant); la app nunca les muestra estos campos.
alter table student_profiles
  add column max_weekly_hours smallint check (max_weekly_hours is null or max_weekly_hours between 1 and 60);
alter table student_profiles add column period_end_date date;
alter table student_profiles add column alerts_enabled boolean not null default false;

-- Vacantes guardadas: solo el estudiante dueño las lee y escribe. El negocio no sabe quién guardó.
create table saved_vacancies (
  student_id uuid not null references student_profiles (id) on delete cascade,
  vacancy_id uuid not null references vacancies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, vacancy_id)
);
alter table saved_vacancies enable row level security;
create policy "saved_vacancies_all_own" on saved_vacancies for all
  using (student_id = auth.uid()) with check (student_id = auth.uid());

-- true si los bloques del estudiante cubren el turno completo en todos los días (misma regla que la app).
-- Nota: asume bloques sin traslape, igual que application_compatibility (la app los fusiona al guardar).
create or replace function student_covers_shift(s_id uuid, s_days smallint[], s_start smallint, s_end smallint)
returns boolean language plpgsql security definer stable set search_path = public as $$
declare
  d smallint;
  covered int;
begin
  foreach d in array s_days loop
    select coalesce(sum(greatest(0, least(b.end_minute, s_end) - greatest(b.start_minute, s_start))), 0)
      into covered
      from availability_blocks b
      where b.student_id = s_id and b.day = d;
    if covered < s_end - s_start then return false; end if;
  end loop;
  return true;
end;
$$;

-- Alertas: al publicar una vacante activa, avisa a los estudiantes con alertas activadas
-- para quienes es 100% compatible. El negocio no recibe a quién se notificó.
create or replace function notify_compatible_students()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'activa' then return new; end if;
  insert into notifications (user_id, kind, link, title, body)
  select sp.id, 'postulacion', '/estudiante/vacante/' || new.id, 'Nueva vacante compatible',
         format('%s publicó "%s", compatible con tu disponibilidad.', b.name, new.title)
  from student_profiles sp
  join business_profiles b on b.id = new.business_id
  where sp.alerts_enabled
    and student_covers_shift(sp.id, new.days, new.start_minute, new.end_minute);
  return new;
end;
$$;

create trigger on_vacancy_insert_alerts
  after insert on vacancies
  for each row execute function notify_compatible_students();

-- ═════════════════════════ Fase B: entrevistas sin chat y reportes ═════════════════════════

-- Propuesta de entrevista: el negocio propone 2–3 horarios y el estudiante elige uno o pide otros.
-- slots = [{ "date": "AAAA-MM-DD", "start": minutos, "end": minutos, "place": "texto" }, ...]
create table interview_proposals (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references applications (id) on delete cascade,
  slots jsonb not null check (jsonb_typeof(slots) = 'array' and jsonb_array_length(slots) between 2 and 3),
  selected_index smallint,
  status text not null default 'propuesta' check (status in ('propuesta', 'confirmada', 'reprogramar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'confirmada') = (selected_index is not null))
);

alter table interview_proposals enable row level security;

create or replace function is_application_student(app_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from applications a where a.id = app_id and a.student_id = auth.uid());
$$;

create or replace function is_application_business(app_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from applications a where a.id = app_id and is_vacancy_owner(a.vacancy_id));
$$;

create policy "interviews_select_parties" on interview_proposals for select
  using (is_application_student(application_id) or is_application_business(application_id));
create policy "interviews_insert_business" on interview_proposals for insert
  with check (is_application_business(application_id) and status = 'propuesta' and selected_index is null);
create policy "interviews_update_parties" on interview_proposals for update
  using (is_application_student(application_id) or is_application_business(application_id))
  with check (is_application_student(application_id) or is_application_business(application_id));

-- Valida quién puede hacer cada cambio y notifica a la otra parte. No hay mensajes libres.
create or replace function on_interview_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  app record;
  v record;
  b_name text;
  s_name text;
  is_business boolean;
  slot jsonb;
begin
  select * into app from applications where id = new.application_id;
  select * into v from vacancies where id = app.vacancy_id;
  select name into b_name from business_profiles where id = v.business_id;
  select full_name into s_name from student_profiles where id = app.student_id;
  is_business := auth.uid() = v.business_id;

  if tg_op = 'INSERT' then
    if app.status in ('aceptada', 'rechazada') then raise exception 'La postulación ya está cerrada'; end if;
    update applications set status = 'entrevista' where id = app.id and status <> 'entrevista';
    insert into notifications (user_id, kind, link, title, body)
    values (app.student_id, 'postulacion', '/estudiante/vacante/' || v.id, 'Te proponen una entrevista',
            format('%s propuso %s horarios para "%s". Elige el que te funcione.', b_name, jsonb_array_length(new.slots), v.title));
    return new;
  end if;

  if new.application_id is distinct from old.application_id or new.created_at is distinct from old.created_at then
    raise exception 'No se puede cambiar la postulación de una propuesta';
  end if;

  if auth.uid() is null then
    -- service role (administración)
    null;
  elsif is_business then
    -- Nuevos horarios: solo si el estudiante pidió otros.
    if not (old.status = 'reprogramar' and new.status = 'propuesta' and new.selected_index is null) then
      raise exception 'El negocio solo puede proponer nuevos horarios cuando se lo piden';
    end if;
    insert into notifications (user_id, kind, link, title, body)
    values (app.student_id, 'postulacion', '/estudiante/vacante/' || v.id, 'Nuevos horarios de entrevista',
            format('%s propuso %s horarios nuevos para "%s".', b_name, jsonb_array_length(new.slots), v.title));
  elsif auth.uid() = app.student_id then
    if new.slots is distinct from old.slots or old.status <> 'propuesta'
       or new.status not in ('confirmada', 'reprogramar') then
      raise exception 'Respuesta de entrevista no permitida';
    end if;
    if new.status = 'confirmada' then
      slot := new.slots -> new.selected_index::int;
      if slot is null then raise exception 'Horario no válido'; end if;
      insert into notifications (user_id, kind, link, title, body)
      values (v.business_id, 'postulacion', '/negocio/postulaciones?vacancy=' || v.id, 'Entrevista confirmada',
              format('%s eligió el %s (%s) para "%s".', s_name, slot ->> 'date', slot ->> 'place', v.title));
    else
      insert into notifications (user_id, kind, link, title, body)
      values (v.business_id, 'postulacion', '/negocio/postulaciones?vacancy=' || v.id, 'Piden otros horarios',
              format('%s pidió otros horarios de entrevista para "%s".', s_name, v.title));
    end if;
  else
    raise exception 'No participas en esta entrevista';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger on_interview_insert
  after insert on interview_proposals
  for each row execute function on_interview_change();
create trigger on_interview_update
  before update on interview_proposals
  for each row execute function on_interview_change();

-- Reportes: el usuario solo crea y lee los suyos. Administración usa el service role.
-- No hay contadores públicos ni efecto automático sobre la vacante o el negocio.
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references profiles (id) on delete cascade,
  target_type text not null check (target_type in ('vacante', 'negocio')),
  target_id uuid not null,
  reason text not null check (reason in ('informacion_falsa', 'discriminacion', 'cobro_indebido', 'otro')),
  description text not null check (length(description) between 10 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

alter table reports enable row level security;
create policy "reports_insert_own" on reports for insert with check (reporter_id = auth.uid());
create policy "reports_select_own" on reports for select using (reporter_id = auth.uid());
-- Sin políticas de UPDATE ni DELETE para usuarios.

-- ═════════════════════════ Fase C: ubicación del negocio en el mapa ═════════════════════════
-- El propio negocio coloca su pin desde su perfil. Sin pin, el negocio solo aparece en la lista.
-- business_profiles ya es legible por usuarios autenticados (business_select_auth) y el negocio
-- solo puede editar su propio perfil (business_update_own), así que no se necesitan políticas nuevas.
alter table business_profiles
  add column latitude double precision check (latitude is null or latitude between -90 and 90);
alter table business_profiles
  add column longitude double precision check (longitude is null or longitude between -180 and 180);
alter table business_profiles
  add constraint business_location_complete check ((latitude is null) = (longitude is null));

-- ═════════════════════════ Etapa 1 Supabase: alta automática de perfiles ═════════════════════════
-- Al registrarse con supabase.auth.signUp, la app envía en options.data:
--   { role: 'estudiante' | 'negocio', full_name: text, academic_status?: 'activo' | 'egresado' }
-- Este trigger crea profiles + student_profiles / business_profiles en el mismo momento, aunque
-- el usuario aún no tenga sesión (por ejemplo, si el proyecto exige confirmar el correo).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r text := meta ->> 'role';
  name text := nullif(trim(coalesce(meta ->> 'full_name', '')), '');
begin
  if r not in ('estudiante', 'negocio') then
    raise exception 'Rol inválido en el registro';
  end if;
  if name is null then
    raise exception 'Falta el nombre en el registro';
  end if;

  insert into profiles (id, role) values (new.id, r::user_role);

  if r = 'estudiante' then
    insert into student_profiles (id, full_name, academic_status)
    values (
      new.id,
      name,
      case when meta ->> 'academic_status' = 'egresado' then 'egresado'::academic_status else 'activo'::academic_status end
    );
  else
    insert into business_profiles (id, name, category) values (new.id, name, 'restaurante');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ═════════════════════════ Migración 001 · Etapas 2 y 3 ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor del proyecto que ya tiene schema.sql.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
--
-- Agrega lo que la app necesita para leer y escribir vacantes, postulaciones, disponibilidad,
-- servicios y solicitudes directamente en Supabase, sin exponer datos privados.

-- ── Lecturas que faltaban ──

-- El estudiante sigue viendo una vacante a la que se postuló aunque el negocio la pause o la cierre.
create policy "vacancies_select_applied" on vacancies for select
  using (exists (
    select 1 from applications a
    where a.vacancy_id = vacancies.id and a.student_id = auth.uid()
  ));

-- El negocio sigue viendo un servicio al que envió una solicitud aunque el prestador lo pause.
create policy "service_offers_select_requested" on service_offers for select
  using (exists (
    select 1 from service_requests r
    where r.offer_id = service_offers.id and r.business_id = auth.uid()
  ));

-- ── Cobertura de un turno (uso interno; NUNCA expuesta por la API) ──

create or replace function shift_coverage(
  s_id uuid, s_days smallint[], s_start smallint, s_end smallint,
  out full_days int, out total_days int, out any_cover boolean
)
language plpgsql security definer stable set search_path = public as $$
declare
  d smallint;
  covered int;
begin
  full_days := 0;
  total_days := coalesce(array_length(s_days, 1), 0);
  any_cover := false;
  if total_days = 0 then return; end if;
  foreach d in array s_days loop
    select coalesce(sum(greatest(0, least(b.end_minute, s_end) - greatest(b.start_minute, s_start))), 0)
      into covered
      from availability_blocks b
      where b.student_id = s_id and b.day = d;
    if covered >= s_end - s_start then full_days := full_days + 1; end if;
    if covered > 0 then any_cover := true; end if;
  end loop;
end;
$$;

-- Estas funciones leen la disponibilidad de cualquier estudiante: solo deben llamarse desde otras
-- funciones del servidor, nunca desde la app (si no, un usuario podría adivinar horarios ajenos).
revoke execute on function shift_coverage(uuid, smallint[], smallint, smallint) from public, anon, authenticated;
revoke execute on function student_covers_shift(uuid, smallint[], smallint, smallint) from public, anon, authenticated;

-- ── Datos derivados para el negocio (sin exponer disponibilidad) ──

-- Por cada postulación a sus vacantes: compatibilidad calculada en el servidor y el correo del
-- estudiante SOLO cuando la postulación está en entrevista o aceptada.
create or replace function business_application_details()
returns table (application_id uuid, level text, full_days int, total_days int, contact_email text)
language sql security definer stable set search_path = public, auth as $$
  select
    a.id,
    case
      when c.total_days > 0 and c.full_days = c.total_days then 'compatible'
      when c.any_cover then 'parcial'
      else 'no_compatible'
    end,
    c.full_days,
    c.total_days,
    case when a.status in ('entrevista', 'aceptada') then u.email::text end
  from applications a
  join vacancies v on v.id = a.vacancy_id
  join auth.users u on u.id = a.student_id
  cross join lateral shift_coverage(a.student_id, v.days, v.start_minute, v.end_minute) c
  where v.business_id = auth.uid();
$$;

-- Por cada solicitud de servicio que envió: compatibilidad del horario propuesto (si tiene) y el
-- correo del prestador SOLO a partir de que aceptó.
create or replace function business_service_request_details()
returns table (request_id uuid, level text, contact_email text)
language sql security definer stable set search_path = public, auth as $$
  select
    r.id,
    case
      when r.days is null then null
      when c.total_days > 0 and c.full_days = c.total_days then 'compatible'
      when c.any_cover then 'parcial'
      else 'no_compatible'
    end,
    case when r.status in ('aceptada', 'en_proceso', 'entregada', 'completada') then u.email::text end
  from service_requests r
  join service_offers o on o.id = r.offer_id
  join auth.users u on u.id = o.student_id
  left join lateral shift_coverage(o.student_id, r.days, r.start_minute, r.end_minute) c on r.days is not null
  where r.business_id = auth.uid();
$$;

-- Perfil público (sin correo ni disponibilidad) de los estudiantes que el negocio puede ver:
-- quienes tienen un servicio activo, a quienes les envió una solicitud y quienes se postularon a sus vacantes.
create or replace function visible_public_students()
returns table (
  id uuid, full_name text, career text, university text,
  zone text, skills text[], academic_status academic_status
)
language sql security definer stable set search_path = public as $$
  select sp.id, sp.full_name, sp.career, sp.university, sp.zone, sp.skills, sp.academic_status
  from student_profiles sp
  where is_business() and (
    exists (select 1 from service_offers o where o.student_id = sp.id and o.status = 'activo')
    or exists (
      select 1 from service_requests r join service_offers o on o.id = r.offer_id
      where o.student_id = sp.id and r.business_id = auth.uid()
    )
    or exists (
      select 1 from applications a join vacancies v on v.id = a.vacancy_id
      where a.student_id = sp.id and v.business_id = auth.uid()
    )
  );
$$;

-- ═════════════════════════ Migración 002 · Perfil del estudiante privado ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor, después de 001.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
--
-- La política original dejaba al negocio leer la fila completa de student_profiles de sus postulantes
-- (periodo y fecha de fin de disponibilidad, intereses, alertas). El negocio solo debe recibir el perfil
-- público, que ya obtiene con visible_public_students(); el resto queda solo para el estudiante.

drop policy if exists "student_select_by_business" on student_profiles;

-- ═════════════════════════ Migración 003 · Etapa 4 ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor, después de 002. Se puede repetir sin problema.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
--
-- Las tablas de la Etapa 4 (saved_vacancies, interview_proposals, reports) ya existen desde schema.sql.
-- Esta migración solo evita un aviso duplicado: al proponer una entrevista, on_interview_change pasa la
-- postulación a "entrevista" y ya avisa con "Te proponen una entrevista"; el aviso genérico de cambio de
-- estado sobraba.

create or replace function notify_application_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status
     and not (new.status = 'entrevista' and exists (
       select 1 from interview_proposals ip where ip.application_id = new.id
     )) then
    insert into notifications (user_id, kind, link, title, body)
    select new.student_id, 'postulacion', '/estudiante/vacante/' || v.id,
           'Tu postulación cambió de estado',
           format('%s marcó tu postulación a "%s" como %s.', b.name, v.title, new.status)
    from vacancies v join business_profiles b on b.id = v.business_id
    where v.id = new.vacancy_id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ═════════════════════════ Migración 004 · Panel de administración ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor, después de 003.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
--
-- Administradores: tabla admins, que solo se llena desde el SQL Editor (ver docs/SUPABASE.md).
-- No existe un rol "admin" en user_role: el registro de la app nunca puede crear uno.
-- Todo lo de administración pasa por funciones security definer que primero comprueban is_admin().

-- ── Quién es administrador ──

create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
-- RLS activa y sin políticas: ningún usuario lee ni escribe esta tabla desde la API.
alter table admins enable row level security;

create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ── Bitácora de acciones ──

create table admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null default auth.uid() references auth.users (id) on delete set null,
  action text not null check (action in (
    'reporte_estado', 'vacante_pausada', 'vacante_cerrada', 'servicio_pausado', 'verificacion_retirada'
  )),
  target_type text not null check (target_type in ('reporte', 'vacante', 'servicio', 'negocio')),
  target_id uuid not null,
  note text check (note is null or length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index on admin_actions (created_at desc);
alter table admin_actions enable row level security;
create policy "admin_actions_select_admin" on admin_actions for select using (is_admin());
create policy "admin_actions_insert_admin" on admin_actions for insert with check (is_admin() and admin_id = auth.uid());
-- Sin políticas de UPDATE ni DELETE: la bitácora no se modifica.

-- ── Reportes con seguimiento ──

alter table reports
  add column status text not null default 'nuevo'
    check (status in ('nuevo', 'en_revision', 'resuelto', 'descartado')),
  add column admin_note text check (admin_note is null or length(admin_note) <= 1000),
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz;

create policy "reports_select_admin" on reports for select using (is_admin());
create policy "reports_update_admin" on reports for update using (is_admin()) with check (is_admin());

-- El reportante sigue leyendo sus reportes, pero no la nota interna ni quién lo revisó.
revoke select, update on reports from anon, authenticated;
grant select (id, reporter_id, target_type, target_id, reason, description, status, created_at) on reports to authenticated;

-- Al crear: siempre "nuevo" y sin datos de revisión. Al actualizar: solo columnas de revisión.
create or replace function guard_report_changes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'nuevo';
    new.admin_note := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;
  if auth.uid() is not null and not is_admin() then
    raise exception 'Solo administración puede revisar reportes';
  end if;
  if new.reporter_id is distinct from old.reporter_id
     or new.target_type is distinct from old.target_type
     or new.target_id is distinct from old.target_id
     or new.reason is distinct from old.reason
     or new.description is distinct from old.description
     or new.created_at is distinct from old.created_at then
    raise exception 'Solo se pueden cambiar el estado y la nota de un reporte';
  end if;
  if new.status is distinct from old.status or new.admin_note is distinct from old.admin_note then
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger on_report_change
  before insert or update on reports
  for each row execute function guard_report_changes();

-- Aviso genérico al reportante cuando su reporte se cierra (resuelto o descartado). Sin detalles.
create or replace function notify_report_closed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('resuelto', 'descartado') and old.status not in ('resuelto', 'descartado') then
    insert into notifications (user_id, kind, link, title, body)
    values (new.reporter_id, 'sistema', null, 'Revisamos tu reporte',
            'Revisamos tu reporte. Gracias por ayudar a mantener NEXO seguro.');
  end if;
  return new;
end;
$$;

create trigger on_report_closed
  after update on reports
  for each row execute function notify_report_closed();

-- ── Lectura para administración ──

create policy "vacancies_select_admin" on vacancies for select using (is_admin());
create policy "service_offers_select_admin" on service_offers for select using (is_admin());

-- Bandeja de reportes con un resumen del objetivo reportado y cuántos reportes acumula.
create or replace function admin_reports()
returns table (
  id uuid, target_type text, target_id uuid, reason text, description text, status text,
  admin_note text, reviewed_at timestamptz, created_at timestamptz,
  target_title text, target_status text, owner_id uuid, owner_name text, owner_verified boolean,
  target_report_count int
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  return query
  select
    r.id, r.target_type, r.target_id, r.reason, r.description, r.status,
    r.admin_note, r.reviewed_at, r.created_at,
    case when r.target_type = 'vacante' then v.title else b.name end,
    case when r.target_type = 'vacante' then v.status::text end,
    coalesce(v.business_id, b.id),
    coalesce(vb.name, b.name),
    coalesce(vb.verified, b.verified),
    (select count(*)::int from reports r2 where r2.target_type = r.target_type and r2.target_id = r.target_id)
  from reports r
  left join vacancies v on r.target_type = 'vacante' and v.id = r.target_id
  left join business_profiles vb on vb.id = v.business_id
  left join business_profiles b on r.target_type = 'negocio' and b.id = r.target_id
  order by r.created_at desc;
end;
$$;

-- Bitácora con el correo de quien hizo cada acción (solo para administración).
create or replace function admin_action_log()
returns table (id uuid, admin_email text, action text, target_type text, target_id uuid, note text, created_at timestamptz)
language plpgsql security definer stable set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  return query
  select a.id, u.email::text, a.action, a.target_type, a.target_id, a.note, a.created_at
  from admin_actions a left join auth.users u on u.id = a.admin_id
  order by a.created_at desc
  limit 300;
end;
$$;

-- ── Acciones de administración ──

create or replace function admin_update_report(p_report_id uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  update reports set status = p_status, admin_note = nullif(trim(p_note), '') where id = p_report_id;
  if not found then raise exception 'Reporte no encontrado'; end if;
  insert into admin_actions (admin_id, action, target_type, target_id, note)
  values (auth.uid(), 'reporte_estado', 'reporte', p_report_id, p_status || coalesce(': ' || nullif(trim(p_note), ''), ''));
end;
$$;

create or replace function admin_set_vacancy_status(p_vacancy_id uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v record;
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  if p_status not in ('pausada', 'cerrada') then raise exception 'Estado no válido'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'El motivo debe tener al menos 10 caracteres'; end if;
  update vacancies set status = p_status::vacancy_status where id = p_vacancy_id returning * into v;
  if not found then raise exception 'Vacante no encontrada'; end if;
  insert into admin_actions (admin_id, action, target_type, target_id, note)
  values (auth.uid(), case when p_status = 'pausada' then 'vacante_pausada' else 'vacante_cerrada' end,
          'vacante', p_vacancy_id, trim(p_reason));
  insert into notifications (user_id, kind, link, title, body)
  values (v.business_id, 'sistema', '/negocio/vacantes',
          case when p_status = 'pausada' then 'Administración pausó una vacante' else 'Administración cerró una vacante' end,
          format('"%s" fue %s por administración. Motivo: %s', v.title, p_status, trim(p_reason)));
end;
$$;

create or replace function admin_pause_offer(p_offer_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'El motivo debe tener al menos 10 caracteres'; end if;
  update service_offers set status = 'pausado' where id = p_offer_id returning * into o;
  if not found then raise exception 'Servicio no encontrado'; end if;
  insert into admin_actions (admin_id, action, target_type, target_id, note)
  values (auth.uid(), 'servicio_pausado', 'servicio', p_offer_id, trim(p_reason));
  insert into notifications (user_id, kind, link, title, body)
  values (o.student_id, 'sistema', '/estudiante/servicios', 'Administración pausó un servicio',
          format('"%s" fue pausado por administración. Motivo: %s', o.title, trim(p_reason)));
end;
$$;

create or replace function admin_revoke_verification(p_business_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then raise exception 'El motivo debe tener al menos 10 caracteres'; end if;
  update business_profiles set verified = false where id = p_business_id and verified;
  if not found then raise exception 'El negocio no existe o no está verificado'; end if;
  insert into admin_actions (admin_id, action, target_type, target_id, note)
  values (auth.uid(), 'verificacion_retirada', 'negocio', p_business_id, trim(p_reason));
  insert into notifications (user_id, kind, link, title, body)
  values (p_business_id, 'sistema', '/negocio/perfil', 'Administración retiró tu verificación',
          format('Tu verificación básica fue retirada. Motivo: %s', trim(p_reason)));
end;
$$;

-- Las funciones de administración no se ejecutan sin sesión.
revoke execute on function admin_reports() from public, anon;
revoke execute on function admin_action_log() from public, anon;
revoke execute on function admin_update_report(uuid, text, text) from public, anon;
revoke execute on function admin_set_vacancy_status(uuid, text, text) from public, anon;
revoke execute on function admin_pause_offer(uuid, text) from public, anon;
revoke execute on function admin_revoke_verification(uuid, text) from public, anon;
-- Con sesión sí se pueden llamar; cada función comprueba is_admin() antes de hacer nada.
grant execute on function admin_reports() to authenticated;
grant execute on function admin_action_log() to authenticated;
grant execute on function admin_update_report(uuid, text, text) to authenticated;
grant execute on function admin_set_vacancy_status(uuid, text, text) to authenticated;
grant execute on function admin_pause_offer(uuid, text) to authenticated;
grant execute on function admin_revoke_verification(uuid, text) to authenticated;
