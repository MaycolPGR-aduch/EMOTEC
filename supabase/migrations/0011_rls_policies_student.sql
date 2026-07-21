-- 0011_rls_policies_student.sql
-- Politicas del ESTUDIANTE (y las de lectura de catalogos comunes).
-- Patron general: el estudiante actua sobre lo suyo (student_id = auth.uid()).
-- Siempre (select auth.uid()): se evalua como InitPlan una vez por sentencia.

-- profiles: perfil propio. is_tutor_of / is_admin son SECURITY DEFINER (0007),
-- por eso consultar el vinculo aqui NO recursa.
create policy "perfil propio - leer" on public.profiles
  for select to authenticated using ( id = (select auth.uid()) );

create policy "perfil propio - actualizar" on public.profiles
  for update to authenticated
  using ( id = (select auth.uid()) )
  with check ( id = (select auth.uid()) );
  -- El rol lo protege el GRANT de columna (0009), no esta policy. Cinturon +
  -- tirantes: dos capas independientes.
-- Sin INSERT ni DELETE: los perfiles nacen del trigger y mueren por cascade
-- desde auth.users.

-- consents: propios. INSERT crea; UPDATE solo revoked_at (grant + trigger).
create policy "consentimiento propio - leer" on public.consents
  for select to authenticated using ( user_id = (select auth.uid()) );
create policy "consentimiento propio - crear" on public.consents
  for insert to authenticated with check ( user_id = (select auth.uid()) );
create policy "consentimiento propio - revocar" on public.consents
  for update to authenticated
  using ( user_id = (select auth.uid()) )
  with check ( user_id = (select auth.uid()) );

-- Documentos de consentimiento: legibles por todo autenticado (hay que poder
-- leerlos ANTES de consentir; no llevan puerta).
create policy "documentos de consentimiento - leer" on public.consent_documents
  for select to authenticated using ( true );

-- checkins: propios. Sin UPDATE a proposito (corregir = DELETE + INSERT).
create policy "mis checkins - leer" on public.checkins
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis checkins - crear" on public.checkins
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis checkins - borrar" on public.checkins
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- checkin_notes: propias, y NADIE mas (el tutor no aparece: es el requisito n1).
create policy "mis notas - leer" on public.checkin_notes
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis notas - crear" on public.checkin_notes
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis notas - borrar" on public.checkin_notes
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- emotional_entries: propias.
create policy "mis emociones - leer" on public.emotional_entries
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis emociones - crear" on public.emotional_entries
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis emociones - borrar" on public.emotional_entries
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- activity_sessions: propias.
create policy "mis sesiones - leer" on public.activity_sessions
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis sesiones - crear" on public.activity_sessions
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis sesiones - borrar" on public.activity_sessions
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- activity_catalog: catalogo legible por todo autenticado.
create policy "catalogo de actividades - leer" on public.activity_catalog
  for select to authenticated using ( true );

-- Derivados: el estudiante LEE lo suyo. Nadie de la app escribe (solo service_role).
create policy "mis indicadores - leer" on public.wellness_indicators
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mi gamificacion - leer" on public.gamification_state
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis puntos - leer" on public.points_ledger
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis reportes - leer" on public.reports
  for select to authenticated using ( student_id = (select auth.uid()) );

-- alerts: el estudiante ve las suyas (todas, con lenguaje de acompanamiento en la
-- app; decision de producto aprobada). El tutor va por separado (0012).
create policy "mis alertas - leer" on public.alerts
  for select to authenticated using ( student_id = (select auth.uid()) );

-- followups: el estudiante ve solo los marcados visibles para el.
create policy "mis seguimientos compartidos - leer" on public.followups
  for select to authenticated
  using ( student_id = (select auth.uid()) and visible_to_student );

-- help_resources: legible por autenticados (el acceso anon lo da el grant 0009,
-- pero la policy tambien debe permitirlo; ver 0012 para la de anon).
create policy "recursos de ayuda - leer autenticado" on public.help_resources
  for select to authenticated using ( is_active );

-- audit_logs: el estudiante ve QUIEN accedio a sus datos (solo lecturas).
create policy "veo quien accedio a mis datos" on public.audit_logs
  for select to authenticated
  using ( subject_id = (select auth.uid()) and action = 'read' );
-- El filtro action='read' no es cosmetico: sin el, el estudiante veria old/new
-- de escrituras sobre el, incluidos followups no visibles. La auditoria es un
-- canal lateral de fuga y se trata como tal.
