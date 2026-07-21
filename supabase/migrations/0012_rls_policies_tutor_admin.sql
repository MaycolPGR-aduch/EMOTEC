-- 0012_rls_policies_tutor_admin.sql
-- LA FRONTERA DE PRIVACIDAD. Es el unico archivo donde un error expone datos de
-- un estudiante a otra persona. Leelo con cuidado.
--
-- Regla que gobierna todo: "los tutores reciben indicadores y resumenes, NO
-- acceso indiscriminado a todas las respuestas privadas". Por eso el tutor NO
-- tiene ninguna policy de SELECT sobre checkins, checkin_notes,
-- emotional_entries, activity_sessions ni points_ledger. Su superficie de
-- LECTURA de datos sensibles es exclusivamente via los RPC del panel (0015),
-- que ademas registran el acceso (Postgres no tiene triggers ON SELECT).

-- === PERFILES ===

-- El tutor ve el perfil de sus asignados (nombre, no datos de bienestar).
create policy "tutor ve perfiles de asignados" on public.profiles
  for select to authenticated using ( public.is_tutor_of(id) );

-- El admin ve y gestiona todo. is_admin() es SECURITY DEFINER -> sin recursion.
create policy "admin ve todos los perfiles" on public.profiles
  for select to authenticated using ( public.is_admin() );
create policy "admin actualiza perfiles" on public.profiles
  for update to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

-- === ASIGNACIONES TUTOR-ESTUDIANTE ===

create policy "estudiante ve su asignacion" on public.tutor_assignments
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "tutor ve sus asignaciones" on public.tutor_assignments
  for select to authenticated using ( tutor_id = (select auth.uid()) );
create policy "admin ve asignaciones" on public.tutor_assignments
  for select to authenticated using ( public.is_admin() );
create policy "admin crea asignaciones" on public.tutor_assignments
  for insert to authenticated with check ( public.is_admin() );
create policy "admin actualiza asignaciones" on public.tutor_assignments
  for update to authenticated
  using ( public.is_admin() ) with check ( public.is_admin() );

-- === ALERTAS ===
-- HIBRIDO ELEGIDO: el tutor tiene policy de SELECT (segunda barrera si el RPC
-- falla), Y ADEMAS los RPC registran el acceso. El costo asumido: una lectura
-- directa fuera de la app (anon key + JWT) no queda registrada. Riesgo acotado
-- -- el tutor solo ve a sus asignados, nunca texto crudo -- y documentado en el
-- plan. Si se quiere auditoria estricta de lecturas, ELIMINAR esta policy y
-- dejar solo el RPC tutor_student_alerts.
create policy "tutor lee alertas de asignados" on public.alerts
  for select to authenticated using ( public.is_tutor_of(student_id) );
create policy "admin lee alertas" on public.alerts
  for select to authenticated using ( public.is_admin() );

-- El tutor gestiona el ESTADO de la alerta (columnas limitadas por grant 0009).
create policy "tutor gestiona estado de alerta" on public.alerts
  for update to authenticated
  using ( public.is_tutor_of(student_id) )
  with check ( public.is_tutor_of(student_id) );

-- === SEGUIMIENTOS ===

create policy "tutor lee sus seguimientos" on public.followups
  for select to authenticated
  using ( tutor_id = (select auth.uid()) or public.is_admin() );
create policy "tutor registra seguimiento" on public.followups
  for insert to authenticated
  with check ( tutor_id = (select auth.uid()) and public.is_tutor_of(student_id) );

-- === INDICADORES Y REPORTES: el tutor NO tiene policy directa ===
-- Los ve solo via RPC (0015). El admin si, para soporte.
create policy "admin lee indicadores" on public.wellness_indicators
  for select to authenticated using ( public.is_admin() );
create policy "admin lee reportes" on public.reports
  for select to authenticated using ( public.is_admin() );

-- === CATALOGOS: escritura solo admin ===
create policy "admin escribe consent_documents" on public.consent_documents
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "tutor/admin leen reglas de alerta" on public.alert_rules
  for select to authenticated using ( public.is_admin() or public.current_user_role() = 'tutor' );
create policy "admin escribe reglas de alerta" on public.alert_rules
  for insert to authenticated with check ( public.is_admin() );
create policy "admin escribe activity_catalog" on public.activity_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin escribe report_templates" on public.report_templates
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin lee report_templates" on public.report_templates
  for select to authenticated using ( public.is_admin() );
create policy "admin gestiona help_resources" on public.help_resources
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );
create policy "admin gestiona retention" on public.retention_settings
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- === RECURSOS DE AYUDA: lectura SIN sesion (feature 11) ===
create policy "recursos de ayuda - leer anon" on public.help_resources
  for select to anon using ( is_active );

-- === AUDITORIA: el admin la lee entera ===
create policy "admin lee la auditoria" on public.audit_logs
  for select to authenticated using ( public.is_admin() );

-- === PROMOCION DE ROLES (solo admin, via RPC) ===
-- El grant de columna de 0009 excluye 'role' para TODO authenticated (admin
-- incluido), asi que un admin no puede cambiar un rol con un PATCH directo. Esta
-- es la unica via, y es la correcta: pasa por is_admin(), queda auditada por el
-- trigger de profiles (0014), y no requiere abrir la columna 'role' a PostgREST.
create or replace function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'solo un admin puede cambiar roles' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant  execute on function public.admin_set_role(uuid, public.user_role) to authenticated;

-- NOTA para el primer arranque: no existe ningun admin todavia, asi que el
-- primer admin se designa a mano una sola vez desde el SQL Editor de Supabase:
--   update public.profiles set role = 'admin' where email = 'TU_CORREO';
-- A partir de ahi, ese admin usa admin_set_role para los demas.
