-- 0006_tables_ops.sql
-- Operacion: auditoria, recursos de ayuda, ajustes de retencion.

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id    uuid,                       -- quien actua (null = sistema/service_role)
  actor_role  public.user_role,
  subject_id  uuid,                       -- el estudiante SOBRE quien es el dato
  action      public.audit_action not null,
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  context     jsonb                       -- {rpc, reason}
);
create index audit_logs_subject_idx on public.audit_logs (subject_id, occurred_at desc);
create index audit_logs_actor_idx   on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_table_idx   on public.audit_logs (table_name, occurred_at desc);

-- help_resources se lee con anon, SIN login ni consentimiento (ver grants 0009).
-- Es la feature 11: un estudiante en crisis con la sesion caducada tiene que ver
-- el telefono. Unica tabla con acceso anon; no contiene datos personales.
create table public.help_resources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  phone        text,
  whatsapp     text,
  url          text,
  region       text default 'PE',
  is_emergency boolean not null default false,
  is_active    boolean not null default true,
  sort_order   smallint not null default 0
);

create table public.retention_settings (
  table_name  text primary key,
  retain_days integer not null check (retain_days > 0),
  purge_field text not null default 'created_at',
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id)
);
