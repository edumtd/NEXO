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
