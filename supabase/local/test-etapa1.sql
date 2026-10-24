-- Prueba de la Etapa 1 (cuentas y perfiles) sobre la base local con supabase-shim.sql + schema.sql.
-- Cada bloque falla con un mensaje claro si algo no se cumple.
\set ON_ERROR_STOP on

-- ── Alta automática de perfiles (trigger handle_new_user) ──
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'estudiante@prueba.mx', '{"role":"estudiante","full_name":"Estudiante Prueba","academic_status":"egresado"}'),
  ('22222222-2222-2222-2222-222222222222', 'negocio@prueba.mx', '{"role":"negocio","full_name":"Negocio Prueba"}'),
  ('33333333-3333-3333-3333-333333333333', 'otro@prueba.mx', '{"role":"estudiante","full_name":"Otra Persona"}');

do $$
begin
  assert (select count(*) from profiles) = 3, 'Deberían existir 3 perfiles';
  assert (select role from profiles where id = '11111111-1111-1111-1111-111111111111') = 'estudiante', 'Rol del estudiante';
  assert (select academic_status from student_profiles where id = '11111111-1111-1111-1111-111111111111') = 'egresado', 'Estatus académico';
  assert (select alerts_enabled from student_profiles where id = '11111111-1111-1111-1111-111111111111') = false, 'Alertas apagadas por defecto';
  assert (select name from business_profiles where id = '22222222-2222-2222-2222-222222222222') = 'Negocio Prueba', 'Nombre del negocio';
  assert (select verified from business_profiles where id = '22222222-2222-2222-2222-222222222222') = false, 'Negocio sin verificar';
  raise notice 'OK: alta automática de perfiles';
end
$$;

-- Un registro con rol inválido debe rechazarse.
do $$
begin
  begin
    insert into auth.users (email, raw_user_meta_data) values ('malo@prueba.mx', '{"role":"admin","full_name":"X"}');
    raise exception 'ERROR DE PRUEBA: se aceptó un rol inválido';
  exception when others then
    if sqlerrm like 'ERROR DE PRUEBA%' then raise; end if;
  end;
  raise notice 'OK: rol inválido rechazado';
end
$$;

-- ── RLS como estudiante ──
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
begin
  assert (select count(*) from student_profiles) = 1, 'El estudiante solo debe ver su propio perfil';
  assert (select count(*) from profiles) = 1, 'Solo su propia fila en profiles';
  raise notice 'OK: el estudiante solo ve su perfil';
end
$$;

update student_profiles set career = 'Diseño' where id = '11111111-1111-1111-1111-111111111111';
update student_profiles set career = 'Intruso' where id = '33333333-3333-3333-3333-333333333333';

-- ── RLS como negocio ──
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

do $$
begin
  assert (select count(*) from student_profiles) = 0, 'Un negocio no ve estudiantes que no se le postularon';
  raise notice 'OK: el negocio no ve perfiles de estudiantes sin postulación';
end
$$;

update business_profiles set description = 'Pizzería de prueba con servicio en mesa.' where id = '22222222-2222-2222-2222-222222222222';

-- El negocio no puede auto-verificarse.
do $$
begin
  begin
    update business_profiles set verified = true where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'ERROR DE PRUEBA: el negocio se auto-verificó';
  exception when others then
    if sqlerrm like 'ERROR DE PRUEBA%' then raise; end if;
  end;
  raise notice 'OK: el negocio no puede cambiar verified';
end
$$;

reset role;

do $$
begin
  assert (select career from student_profiles where id = '11111111-1111-1111-1111-111111111111') = 'Diseño', 'El estudiante pudo editar su perfil';
  assert (select career from student_profiles where id = '33333333-3333-3333-3333-333333333333') = '', 'Nadie más pudo editar otro perfil';
  assert (select description from business_profiles where id = '22222222-2222-2222-2222-222222222222') like 'Pizzería de prueba%', 'El negocio pudo editar su perfil';
  assert (select verified from business_profiles where id = '22222222-2222-2222-2222-222222222222') = false, 'verified sigue en false';
  raise notice 'OK: ediciones permitidas y bloqueadas correctamente';
end
$$;

\echo 'Etapa 1: todas las pruebas pasaron'
