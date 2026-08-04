-- 0024_journal_and_relaxation.sql
-- Tanda 1 del catalogo: Diario breve y Relajacion muscular progresiva.

-- === Diario breve ("mi dia en tres momentos", doc §3.5/§5.5) ===
-- Texto PRIVADO del estudiante, mismo patron que gratitude_entries: RLS
-- solo-propio, sin policy de tutor, puerta de consentimiento, retencion 90 dias.
create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.activity_sessions(id) on delete set null,
  pleasant    text check (pleasant is null or length(pleasant) <= 500),
  difficult   text check (difficult is null or length(difficult) <= 500),
  helped      text check (helped is null or length(helped) <= 500),
  local_date  date not null,
  created_at  timestamptz not null default now(),
  -- al menos uno de los tres campos con contenido
  constraint journal_not_empty check (
    coalesce(length(trim(pleasant)), 0) + coalesce(length(trim(difficult)), 0)
      + coalesce(length(trim(helped)), 0) > 0
  )
);
create index journal_entries_student_idx on public.journal_entries (student_id, local_date desc);

alter table public.journal_entries enable row level security;
grant select, insert, delete on public.journal_entries to authenticated;

create policy "mi diario - leer" on public.journal_entries
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mi diario - crear" on public.journal_entries
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mi diario - borrar" on public.journal_entries
  for delete to authenticated using ( student_id = (select auth.uid()) );

create policy consent_gate_insert on public.journal_entries
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

insert into public.retention_settings (table_name, retain_days) values ('journal_entries', 90);

-- === Catalogo: entradas de las dos actividades nuevas ===
-- Diario breve (para poder registrar activity_sessions).
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('diario_breve', 'psicoeducativa', 'Diario breve',
 'Tu dia en tres momentos: lo agradable, lo dificil y lo que ayudo.',
 '{"campos":3}'::jsonb, 7);

-- Relajacion muscular progresiva (doc §4.3): guiada por tiempo, reutiliza el
-- motor GuidedSequence. Sin tabla nueva; persiste en activity_sessions (que ya
-- tiene puerta de consentimiento y retencion). Las fases salen de config.groups.
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('relajacion_muscular', 'psicoeducativa', 'Relajacion muscular',
 'Tensa y suelta cada grupo muscular, de los pies a la cabeza.',
 '{"tensa_seg":5,"suelta_seg":10,"groups":[
    {"label":"Pies y pantorrillas"},
    {"label":"Piernas y muslos"},
    {"label":"Abdomen y espalda"},
    {"label":"Manos y brazos"},
    {"label":"Hombros y cuello"},
    {"label":"Rostro"}
  ]}'::jsonb, 8);
