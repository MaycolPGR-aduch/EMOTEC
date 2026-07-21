-- 0001_extensions_and_enums.sql
-- Extensiones y tipos ENUM del MVP de EMOTEC.
--
-- Advertencia sobre enums: ALTER TYPE ... ADD VALUE no puede ejecutarse en la
-- misma transaccion en que se crea/usa el valor, y las migraciones de Supabase
-- corren en una transaccion. Anadir un valor requiere su propia migracion
-- aislada. Borrar un valor es imposible. Para catalogos que crezcan (tipos de
-- recurso, categorias), usa una tabla con FK, no un enum.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;

-- Labels en ASCII sin tildes: van directo a TypeScript y a URLs de PostgREST.
-- Las etiquetas "bonitas" se muestran en la app.
create type public.user_role      as enum ('estudiante', 'tutor', 'admin');
create type public.consent_status as enum ('otorgado', 'revocado');
create type public.alert_level    as enum ('informativa', 'preventiva', 'prioritaria', 'critica');
create type public.alert_status   as enum ('abierta', 'en_revision', 'cerrada', 'descartada');
create type public.emotional_kind as enum ('termometro', 'rueda');
create type public.activity_kind  as enum ('respiracion', 'rueda', 'psicoeducativa');
create type public.period_kind    as enum ('diario', 'semanal');
create type public.audit_action   as enum ('insert', 'update', 'delete', 'read');
create type public.points_reason  as enum ('checkin_diario', 'racha_hito', 'actividad_completada', 'ajuste_admin');
create type public.followup_kind  as enum ('contacto', 'derivacion', 'nota', 'cierre');
