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
