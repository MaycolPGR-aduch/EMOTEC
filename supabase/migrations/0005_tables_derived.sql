-- 0005_tables_derived.sql
-- Datos DERIVADOS. Solo los escribe service_role desde Edge Functions.
-- Ninguna tabla de aqui tiene policy de INSERT/UPDATE/DELETE para ningun rol de
-- la app: asi "los puntos y la racha NO son falsificables" deja de ser una
-- aspiracion. No hay policy que autorice escribir -> el PATCH del cliente no
-- falla por logica de app, falla porque la base no tiene regla que lo permita.

create table public.wellness_indicators (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public.profiles(id) on delete cascade,
  period_kind           public.period_kind not null,
  period_start          date not null,
  period_end            date not null,
  mood_avg              numeric(4,2),
  stress_avg            numeric(4,2),
  sleep_avg             numeric(4,2),
  energy_avg            numeric(4,2),
  academic_load_avg     numeric(4,2),
  social_perception_avg numeric(4,2),
  checkin_count         smallint not null default 0,
  adherence_pct         numeric(5,2),
  details               jsonb not null default '{}'::jsonb,  -- tendencias, deltas, lo experimental
  calc_version          text not null,
  computed_at           timestamptz not null default now(),
  constraint indicators_period_order check (period_end >= period_start),
  constraint indicators_unique unique (student_id, period_kind, period_start)
);
create index wellness_indicators_student_idx
  on public.wellness_indicators (student_id, period_kind, period_start desc);

-- Columnas tipadas para los 6 conocidos (el tutor ordena/filtra por ellas) +
-- details jsonb para lo que crezca. calc_version hace verificable "los mismos
-- datos producen siempre los mismos indicadores".

create table public.gamification_state (
  student_id         uuid primary key references public.profiles(id) on delete cascade,
  points             integer  not null default 0 check (points >= 0),
  current_streak     smallint not null default 0 check (current_streak >= 0),
  longest_streak     smallint not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  updated_at         timestamptz not null default now(),
  constraint streak_coherent check (longest_streak >= current_streak)
);

create table public.points_ledger (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  amount       smallint not null check (amount <> 0),
  reason       public.points_reason not null,
  source_table text,
  source_id    uuid,
  rule_version text not null,
  awarded_at   timestamptz not null default now(),
  -- idempotencia: reejecutar la Edge Function no duplica puntos.
  constraint points_ledger_idempotent unique (student_id, reason, source_table, source_id)
);
create index points_ledger_student_idx on public.points_ledger (student_id, awarded_at desc);

-- El ledger ademas del estado porque "no falsificable" y "explicable" son el
-- mismo requisito: gamification_state.points=340 no dice por que; el ledger si,
-- y sum(amount) reconstruye el estado si un bug lo corrompe. El unique hace la
-- asignacion idempotente ante reintentos (que los habra).

create table public.alert_rules (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,             -- 'estres_sostenido'
  version     integer not null,
  name        text not null,
  description text not null,             -- lenguaje NO clinico
  level       public.alert_level not null,
  definition  jsonb not null,            -- umbrales, ventana, indicadores usados
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint alert_rules_versioned unique (code, version)
);
-- alert_rules es INMUTABLE: cambiar un umbral es insertar (code, version+1),
-- jamas un UPDATE. Editar la v1 in-place reescribiria por que se alerto sobre
-- una persona real. La inmutabilidad se impone con trigger en 0008.

create table public.alerts (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.profiles(id) on delete cascade,
  rule_id         uuid not null references public.alert_rules(id) on delete restrict,
  rule_code       text not null,          -- snapshot denormalizado (explicabilidad para siempre)
  rule_version    integer not null,       -- snapshot denormalizado
  level           public.alert_level not null,
  status          public.alert_status not null default 'abierta',
  evidence        jsonb not null,         -- SOLO indicadores. NUNCA texto del estudiante.
  window_start    date not null,
  window_end      date not null,
  triggered_at    timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  closed_at       timestamptz,
  constraint alerts_evidence_is_object check (jsonb_typeof(evidence) = 'object'),
  constraint alerts_window_order       check (window_end >= window_start)
);
create index alerts_student_idx on public.alerts (student_id, triggered_at desc);
create index alerts_open_idx on public.alerts (status, level, triggered_at desc)
  where status in ('abierta', 'en_revision');

-- evidence es el punto exacto por donde se filtraria el texto crudo: el tutor SI
-- lo lee. La Edge Function que lo construye NUNCA debe consultar checkin_notes.
-- Un trigger de allowlist (0008) rechaza claves fuera de una lista aprobada.

create table public.followups (
  id                 uuid primary key default gen_random_uuid(),
  alert_id           uuid references public.alerts(id) on delete cascade,
  student_id         uuid not null references public.profiles(id) on delete cascade,
  tutor_id           uuid not null references public.profiles(id) on delete restrict,
  kind               public.followup_kind not null,
  notes              text check (length(notes) <= 4000),
  visible_to_student boolean not null default false,  -- el tutor decide caso por caso
  occurred_at        timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index followups_alert_idx   on public.followups (alert_id, occurred_at desc);
create index followups_student_idx on public.followups (student_id, occurred_at desc);
create index followups_tutor_idx   on public.followups (tutor_id, occurred_at desc);

create table public.report_templates (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  version    integer not null,
  locale     text not null default 'es-PE',
  segments   jsonb not null,   -- [{id, condicion, texto, indicador_origen}]
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint report_templates_versioned unique (code, version)
);

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.profiles(id) on delete cascade,
  period_start     date not null,
  period_end       date not null,
  template_code    text not null,
  template_version integer not null,
  calc_version     text not null,
  content          jsonb not null,   -- [{segment_id, text, source_indicator, value}]
  generated_at     timestamptz not null default now(),
  constraint reports_unique unique (student_id, period_start)
);
create index reports_student_idx on public.reports (student_id, period_start desc);

-- content guarda source_indicator por frase: es literalmente el criterio de E6,
-- "puedes senalar que indicador origino cada frase". Si content fuera markdown
-- ya renderizado, esa trazabilidad se perderia al generar.
