-- 0009_grants.sql
-- GRANTs por tabla y por columna. RLS y GRANTs son sistemas INDEPENDIENTES y
-- necesitas los dos: RLS filtra filas, los GRANTs controlan tablas y columnas.
--
-- Asimetria clave:
--   - Grants por columna para SELECT: INUTILES aqui (estudiante y tutor son el
--     mismo rol de BD 'authenticated'; por eso checkin_notes es tabla aparte).
--   - Grants por columna para UPDATE: PERFECTOS para negar algo a TODOS los
--     usuarios de la app, y mas fuertes que un WITH CHECK.

-- Supabase concede ALL a anon/authenticated en tablas nuevas de public.
-- Partimos de cero.
revoke all on all tables in schema public from anon, authenticated;

-- Y lo mismo para las tablas que se creen en migraciones futuras: sin esto, la
-- tabla de la migracion 0020 vuelve a nacer con ALL para anon.
alter default privileges in schema public revoke all on tables from anon, authenticated;

-- profiles: el usuario NUNCA puede escribir su rol.
grant select on public.profiles to authenticated;
grant update (full_name, date_of_birth, timezone, onboarded_at) on public.profiles to authenticated;
-- 'role' y 'deleted_at' NO estan: un PATCH {"role":"admin"} -> 42501.

grant select on public.tutor_assignments to authenticated;
-- INSERT/UPDATE de asignaciones: solo admin, via policy (0012). Sin grant a
-- authenticated aqui significaria bloquear tambien al admin; el admin ES
-- authenticated, asi que el grant va y la policy restringe a is_admin().
grant insert, update on public.tutor_assignments to authenticated;

-- Datos del estudiante: escribe, corrige borrando, nunca edita.
grant select, insert, delete on public.checkins          to authenticated;
grant select, insert, delete on public.checkin_notes     to authenticated;
grant select, insert, delete on public.emotional_entries to authenticated;
grant select, insert, delete on public.activity_sessions to authenticated;

-- Derivados: SOLO lectura. Sin INSERT/UPDATE = puntos y racha no falsificables.
grant select on public.wellness_indicators to authenticated;
grant select on public.gamification_state  to authenticated;
grant select on public.points_ledger       to authenticated;
grant select on public.reports             to authenticated;

-- Alertas: el tutor cambia el estado y nada mas.
grant select on public.alerts to authenticated;
grant update (status, acknowledged_at, acknowledged_by, closed_at) on public.alerts to authenticated;
-- level, evidence, rule_version y student_id son inmutables desde la app: un
-- WITH CHECK no puede comparar OLD vs NEW, pero el grant por columna si.

grant select, insert on public.followups to authenticated;

-- Catalogos y documentos: lectura para autenticados; escritura solo admin (0012).
grant select on public.consent_documents to authenticated;
grant insert, update on public.consent_documents to authenticated;
grant select on public.activity_catalog to authenticated;
grant insert, update on public.activity_catalog to authenticated;
grant select on public.alert_rules to authenticated;
grant insert on public.alert_rules to authenticated;
grant select on public.report_templates to authenticated;
grant insert, update on public.report_templates to authenticated;
grant select on public.help_resources to authenticated;
grant insert, update, delete on public.help_resources to authenticated;
grant select, insert, update on public.retention_settings to authenticated;

-- Consentimiento: el usuario crea el suyo y solo puede tocar revoked_at/reason.
grant select, insert on public.consents to authenticated;
grant update (revoked_at, revoke_reason) on public.consents to authenticated;

-- Recursos de ayuda: accesibles SIN sesion. Decision deliberada (feature 11).
grant select on public.help_resources to anon;

-- audit_logs: nadie escribe desde la app. Solo los triggers SECURITY DEFINER.
grant select on public.audit_logs to authenticated;
