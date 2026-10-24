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
