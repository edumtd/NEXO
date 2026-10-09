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
