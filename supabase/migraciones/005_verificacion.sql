-- ═════════════════════════ Migración 005 · Verificación de negocios y estudiantes ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor, después de 004.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
-- Después de ejecutarla, sigue la sección "Verificación" de docs/SUPABASE.md (claves de Brevo y dominios).

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_net;

-- La bitácora de administración registra también las verificaciones.
alter table admin_actions drop constraint admin_actions_action_check;
alter table admin_actions add constraint admin_actions_action_check check (action in (
  'reporte_estado', 'vacante_pausada', 'vacante_cerrada', 'servicio_pausado', 'verificacion_retirada',
  'verificacion_aprobada', 'verificacion_rechazada'
));

-- ═════════════ Negocios: comprobante de domicilio revisado por administración ═════════════

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references business_profiles (id) on delete cascade,
  status text not null default 'en_revision' check (status in ('en_revision', 'verificado', 'rechazado')),
  -- Ruta en el bucket privado "verificaciones". Se vacía al resolver: el archivo se borra.
  file_path text,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes int not null check (size_bytes between 1 and 5242880),
  reject_reason text check (reject_reason is null or length(reject_reason) between 10 and 300),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on verification_requests (business_id, created_at desc);
-- Una sola solicitud abierta por negocio.
create unique index verification_requests_one_open on verification_requests (business_id) where status = 'en_revision';

alter table verification_requests enable row level security;
create policy "verification_requests_select_own" on verification_requests for select using (business_id = auth.uid());
create policy "verification_requests_insert_own" on verification_requests for insert
  with check (business_id = auth.uid() and is_business());
create policy "verification_requests_select_admin" on verification_requests for select using (is_admin());
-- Sin UPDATE ni DELETE para usuarios: solo se resuelve con admin_resolve_verification().

-- El negocio no ve quién revisó ni la ruta del archivo.
revoke select, update, delete on verification_requests from anon, authenticated;
grant select (id, business_id, status, mime_type, size_bytes, reject_reason, reviewed_at, created_at)
  on verification_requests to authenticated;

create or replace function guard_verification_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_rejected timestamptz;
begin
  new.status := 'en_revision';
  new.reject_reason := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.created_at := now();
  if new.file_path is null or split_part(new.file_path, '/', 1) <> new.business_id::text then
    raise exception 'El comprobante debe estar en la carpeta del negocio';
  end if;
  if exists (select 1 from business_profiles b where b.id = new.business_id and b.verified) then
    raise exception 'Tu negocio ya está verificado';
  end if;
  select max(reviewed_at) into last_rejected
    from verification_requests where business_id = new.business_id and status = 'rechazado';
  if last_rejected is not null and last_rejected > now() - interval '7 days' then
    raise exception 'Podrás volver a solicitar la verificación el %', to_char(last_rejected + interval '7 days', 'DD/MM/YYYY');
  end if;
  return new;
end;
$$;

create trigger on_verification_request_insert
  before insert on verification_requests
  for each row execute function guard_verification_request();

-- Bucket privado: PDF, JPG o PNG de hasta 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificaciones', 'verificaciones', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- El negocio solo sube (y puede borrar) en su carpeta {su_id}/; no puede leer. Administración lee y borra.
create policy "verificaciones_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text and is_business());
create policy "verificaciones_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'verificaciones' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verificaciones_select_admin" on storage.objects for select to authenticated
  using (bucket_id = 'verificaciones' and is_admin());
create policy "verificaciones_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'verificaciones' and is_admin());

-- Solicitudes para el panel, con los datos del negocio para comparar con el comprobante.
create or replace function admin_verification_requests()
returns table (
  id uuid, business_id uuid, status text, file_path text, mime_type text, size_bytes int,
  reject_reason text, reviewed_at timestamptz, created_at timestamptz,
  business_name text, business_address text, business_zone text, business_phone text, business_verified boolean
)
language plpgsql security definer stable set search_path = public as $$
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  return query
  select r.id, r.business_id, r.status, r.file_path, r.mime_type, r.size_bytes,
         r.reject_reason, r.reviewed_at, r.created_at,
         b.name, b.address, b.zone, b.contact_phone, b.verified
  from verification_requests r join business_profiles b on b.id = r.business_id
  order by (r.status = 'en_revision') desc, r.created_at desc
  limit 300;
end;
$$;

-- Aprueba o rechaza. Devuelve la ruta del archivo para que el panel lo borre del bucket.
create or replace function admin_resolve_verification(p_request_id uuid, p_approve boolean, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare
  req record;
  reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not is_admin() then raise exception 'Solo administración'; end if;
  select * into req from verification_requests where id = p_request_id for update;
  if not found then raise exception 'Solicitud no encontrada'; end if;
  if req.status <> 'en_revision' then raise exception 'Esta solicitud ya fue resuelta'; end if;
  if not p_approve and (reason is null or length(reason) < 10) then
    raise exception 'El motivo debe tener al menos 10 caracteres';
  end if;

  update verification_requests
     set status = case when p_approve then 'verificado' else 'rechazado' end,
         reject_reason = case when p_approve then null else reason end,
         reviewed_by = auth.uid(), reviewed_at = now(), file_path = null
   where id = p_request_id;
  update business_profiles set verified = p_approve where id = req.business_id;

  insert into admin_actions (admin_id, action, target_type, target_id, note)
  values (auth.uid(), case when p_approve then 'verificacion_aprobada' else 'verificacion_rechazada' end,
          'negocio', req.business_id, reason);
  insert into notifications (user_id, kind, link, title, body)
  values (req.business_id, 'sistema', '/negocio/perfil',
          case when p_approve then 'Tu negocio fue verificado' else 'Verificación no aprobada' end,
          case when p_approve
            then 'Los estudiantes verán la insignia de verificación en tus vacantes.'
            else format('Motivo: %s Podrás intentarlo de nuevo en 7 días.', reason) end);
  return req.file_path;
end;
$$;

-- ═════════════ Estudiantes: código al correo institucional ═════════════

-- Dominios institucionales extra (además de la regla general ".edu.mx"). Se llenan desde el SQL Editor;
-- un dominio aquí también acepta sus subdominios. Sin acceso desde la API.
create table student_email_domains (
  domain text primary key check (domain = lower(domain) and domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  created_at timestamptz not null default now()
);
alter table student_email_domains enable row level security;

-- Solo una huella (hash con sal secreta) del correo: impide que un mismo correo verifique dos cuentas.
create table verified_student_emails (
  email_hash text primary key,
  user_id uuid not null unique references student_profiles (id) on delete cascade,
  verified_at timestamptz not null default now()
);
alter table verified_student_emails enable row level security;

-- Código pendiente por estudiante (hash del código, nunca el código).
create table student_email_codes (
  user_id uuid primary key references student_profiles (id) on delete cascade,
  email_hash text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_count int not null default 0,
  window_start timestamptz not null default now()
);
alter table student_email_codes enable row level security;

alter table student_profiles add column student_verified_at timestamptz;

-- student_verified_at solo lo escribe verify_student_email_code(); el estudiante no puede tocarlo.
create or replace function guard_student_verified()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('nexo.allow_student_verify', true), '') = 'on' then return new; end if;
  if tg_op = 'INSERT' then
    new.student_verified_at := null;
  elsif new.student_verified_at is distinct from old.student_verified_at then
    raise exception 'La verificación solo se obtiene con el código del correo institucional';
  end if;
  return new;
end;
$$;

create trigger on_student_verified_change
  before insert or update on student_profiles
  for each row execute function guard_student_verified();

-- Sal secreta para las huellas de correo (se crea una sola vez en el Vault).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'nexo_email_pepper') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'nexo_email_pepper');
  end if;
end;
$$;

create or replace function nexo_secret(p_name text)
returns text language sql security definer stable set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;
revoke execute on function nexo_secret(text) from public, anon, authenticated;

create or replace function student_email_hash(p_email text)
returns text language sql security definer stable set search_path = public as $$
  select encode(extensions.digest(lower(trim(p_email)) || coalesce(nexo_secret('nexo_email_pepper'), ''), 'sha256'), 'hex');
$$;
revoke execute on function student_email_hash(text) from public, anon, authenticated;

-- true si el dominio termina en .edu.mx o coincide (o es subdominio) con uno de student_email_domains.
create or replace function is_institutional_email(p_email text)
returns boolean language sql security definer stable set search_path = public as $$
  with d as (select lower(split_part(trim(p_email), '@', 2)) as domain)
  select trim(p_email) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     and ((select domain from d) like '%.edu.mx'
          or exists (select 1 from student_email_domains s, d
                     where d.domain = s.domain or d.domain like '%.' || s.domain));
$$;

create or replace function request_student_email_code(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  email text := lower(trim(coalesce(p_email, '')));
  h text;
  code text;
  row_ student_email_codes;
  api_key text := nexo_secret('brevo_api_key');
  sender text := nexo_secret('brevo_sender_email');
begin
  if uid is null or not exists (select 1 from student_profiles where id = uid) then
    raise exception 'Solo estudiantes pueden verificar un correo institucional';
  end if;
  if exists (select 1 from student_profiles where id = uid and student_verified_at is not null) then
    raise exception 'Tu cuenta ya está verificada';
  end if;
  if not is_institutional_email(email) then
    raise exception 'Usa el correo que te dio tu institución';
  end if;
  if api_key is null or sender is null then
    raise exception 'El envío de códigos aún no está configurado';
  end if;
  h := student_email_hash(email);
  if exists (select 1 from verified_student_emails v where v.email_hash = h and v.user_id <> uid) then
    raise exception 'Ese correo ya verificó otra cuenta';
  end if;

  select * into row_ from student_email_codes where user_id = uid;
  if found and row_.window_start > now() - interval '1 hour' and row_.sent_count >= 3 then
    raise exception 'Ya pediste 3 códigos en la última hora. Inténtalo más tarde';
  end if;

  code := lpad((('x00000000' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(64)::bigint % 1000000)::text, 6, '0');
  insert into student_email_codes (user_id, email_hash, code_hash, expires_at, attempts, sent_count, window_start)
  values (uid, h, encode(extensions.digest(code || uid::text, 'sha256'), 'hex'), now() + interval '10 minutes', 0, 1, now())
  on conflict (user_id) do update set
    email_hash = excluded.email_hash,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    sent_count = case when student_email_codes.window_start > now() - interval '1 hour'
                      then student_email_codes.sent_count + 1 else 1 end,
    window_start = case when student_email_codes.window_start > now() - interval '1 hour'
                        then student_email_codes.window_start else now() end;

  -- Envío asíncrono con la API de Brevo (pg_net). El correo no se guarda en NEXO.
  perform net.http_post(
    url := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', api_key, 'Content-Type', 'application/json', 'accept', 'application/json'),
    body := jsonb_build_object(
      'sender', jsonb_build_object('name', 'NEXO', 'email', sender),
      'to', jsonb_build_array(jsonb_build_object('email', email)),
      'subject', 'Tu código de verificación de NEXO: ' || code,
      'textContent', format(E'Tu código para verificar tu cuenta de estudiante en NEXO es: %s\n\nVence en 10 minutos. Si no lo pediste, ignora este correo.', code)
    )
  );
end;
$$;

-- Devuelve true si el código es correcto (la cuenta queda verificada) y false si no lo es.
-- Un código incorrecto no lanza error: así el intento fallido queda contado (un error revertiría el conteo).
create or replace function verify_student_email_code(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  row_ student_email_codes;
begin
  select * into row_ from student_email_codes where user_id = uid for update;
  if not found then raise exception 'Primero pide un código'; end if;
  if row_.expires_at < now() then raise exception 'El código expiró. Pide uno nuevo'; end if;
  if row_.attempts >= 5 then raise exception 'Demasiados intentos. Pide un código nuevo'; end if;

  if row_.code_hash <> encode(extensions.digest(trim(coalesce(p_code, '')) || uid::text, 'sha256'), 'hex') then
    update student_email_codes set attempts = attempts + 1 where user_id = uid;
    return false;
  end if;
  if exists (select 1 from verified_student_emails v where v.email_hash = row_.email_hash and v.user_id <> uid) then
    raise exception 'Ese correo ya verificó otra cuenta';
  end if;

  insert into verified_student_emails (email_hash, user_id) values (row_.email_hash, uid)
  on conflict (user_id) do update set email_hash = excluded.email_hash, verified_at = now();
  perform set_config('nexo.allow_student_verify', 'on', true);
  update student_profiles set student_verified_at = now() where id = uid;
  perform set_config('nexo.allow_student_verify', 'off', true);
  delete from student_email_codes where user_id = uid;
  return true;
end;
$$;

-- Estado del código pendiente para la app (sin datos del correo).
create or replace function student_email_code_status()
returns table (pending boolean, expires_at timestamptz, attempts_left int)
language sql security definer stable set search_path = public as $$
  select true, c.expires_at, greatest(0, 5 - c.attempts)
  from student_email_codes c where c.user_id = auth.uid();
$$;

-- El negocio ve si un estudiante está verificado (nada más del correo).
drop function if exists visible_public_students();
create function visible_public_students()
returns table (
  id uuid, full_name text, career text, university text,
  zone text, skills text[], academic_status academic_status, student_verified boolean
)
language sql security definer stable set search_path = public as $$
  select sp.id, sp.full_name, sp.career, sp.university, sp.zone, sp.skills, sp.academic_status,
         sp.student_verified_at is not null
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

-- Permisos de ejecución: sin sesión, nada; con sesión, cada función valida quién llama.
revoke execute on function admin_verification_requests() from public, anon;
revoke execute on function admin_resolve_verification(uuid, boolean, text) from public, anon;
revoke execute on function request_student_email_code(text) from public, anon;
revoke execute on function verify_student_email_code(text) from public, anon;
revoke execute on function student_email_code_status() from public, anon;
revoke execute on function is_institutional_email(text) from public, anon;
revoke execute on function visible_public_students() from public, anon;
grant execute on function admin_verification_requests() to authenticated;
grant execute on function admin_resolve_verification(uuid, boolean, text) to authenticated;
grant execute on function request_student_email_code(text) to authenticated;
grant execute on function verify_student_email_code(text) to authenticated;
grant execute on function student_email_code_status() to authenticated;
grant execute on function is_institutional_email(text) to authenticated;
grant execute on function visible_public_students() to authenticated;
