-- 0013_rls_consent_gate.sql
-- LA PUERTA DE CONSENTIMIENTO. "Sin consentimiento activo no se guarda NADA."
--
-- AS RESTRICTIVE, no permissive. Las policies normales (permissive) se combinan
-- con OR: una sola policy floja anadida en el futuro anularia la puerta SIN dar
-- ningun error. Las RESTRICTIVE se combinan con AND: se aplican siempre y
-- ninguna policy futura puede saltarselas. Es un invariante de la tabla.
--
-- Solo INSERT (y UPDATE donde exista), JAMAS 'for all': revocar el consentimiento
-- debe DETENER la recoleccion, no confiscarle al estudiante la vista de su propio
-- historial ni impedirle borrar. La revocacion detiene, no confisca.

create policy consent_gate_insert on public.checkins
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

create policy consent_gate_insert on public.checkin_notes
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

create policy consent_gate_insert on public.emotional_entries
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

create policy consent_gate_insert on public.activity_sessions
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

-- NOTA: la puerta NO aplica a service_role, que se salta la RLS entera
-- (restrictivas incluidas). Toda Edge Function que escriba datos de estudiante
-- DEBE llamar a has_active_consent() ella misma antes de escribir. Es el hueco
-- que la base no puede tapar sola. Ver riesgos residuales en el plan.
--
-- consents, consent_documents, profiles y help_resources NO llevan puerta:
-- si consents estuviera detras, nadie podria consentir nunca (huevo y gallina).
