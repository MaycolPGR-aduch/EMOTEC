-- 0003_tables_consent.sql
-- Consentimiento informado: documentos versionados y aceptaciones.

create table public.consent_documents (
  id           uuid primary key default gen_random_uuid(),
  version      text not null unique,             -- '1.0', '1.1', '2.0'
  locale       text not null default 'es-PE',
  title        text not null,
  body_md      text not null,
  summary_md   text,
  published_at timestamptz not null default now(),
  is_current   boolean not null default false,   -- el que se muestra a usuarios nuevos
  is_accepted  boolean not null default true     -- si un consentimiento sobre el sigue habilitando la puerta
);
-- Un solo documento "actual" por locale.
create unique index consent_documents_one_current_idx
  on public.consent_documents (locale) where is_current;

-- Dos booleanos, no uno: is_current = "lo que ve quien se registra hoy";
-- is_accepted = "un consentimiento sobre este doc sigue habilitando la escritura".
-- Con uno solo, publicar la v2 bloquearia de golpe a todos los de v1. Con dos,
-- publicas v2, dejas v1.is_accepted=true durante el rollout, pides reconsentir,
-- y solo entonces pones v1.is_accepted=false. Corte deliberado, no accidental.

create table public.consents (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  document_id    uuid not null references public.consent_documents(id) on delete restrict,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoke_reason  text,
  declared_adult boolean not null,
  app_version    text,
  constraint consent_adult_required     check (declared_adult),
  constraint consent_revoke_after_grant check (revoked_at is null or revoked_at >= granted_at)
);
-- Un solo consentimiento ACTIVO por (usuario, documento).
create unique index consents_one_active_idx
  on public.consents (user_id, document_id) where revoked_at is null;
create index consents_user_active_idx
  on public.consents (user_id) where revoked_at is null;

-- consents es append-only con una unica mutacion permitida: revoked_at null->ts.
-- Se impone con trigger (0008), no con confianza.
