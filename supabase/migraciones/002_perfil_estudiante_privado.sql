-- ═════════════════════════ Migración 002 · Perfil del estudiante privado ═════════════════════════
-- Ejecutar UNA vez en el SQL Editor, después de 001.
-- (El mismo bloque está al final de schema.sql para instalaciones nuevas.)
--
-- La política original dejaba al negocio leer la fila completa de student_profiles de sus postulantes
-- (periodo y fecha de fin de disponibilidad, intereses, alertas). El negocio solo debe recibir el perfil
-- público, que ya obtiene con visible_public_students(); el resto queda solo para el estudiante.

drop policy if exists "student_select_by_business" on student_profiles;
