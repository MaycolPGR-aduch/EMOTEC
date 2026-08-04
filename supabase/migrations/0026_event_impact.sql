-- 0026_event_impact.sql
-- Evento e impacto (catalogo doc §3.4): registro de contexto. Que paso, en que
-- area, con que impacto e intensidad, cuanto control se percibio y cuanto apoyo.
--
-- Datos estructurados (catalogos cerrados) + una nota opcional de texto libre.
-- Mismo patron de privacidad que checkins/checkin_notes: estructurado 730d,
-- texto 90d en tabla aparte con FK compuesta. Sin policy de tutor.

create table public.event_entries (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  area              text not null check (area in ('academica','social','familiar','personal','salud','economia','otra')),
  impact            text not null check (impact in ('positivo','negativo','mixto')),
  intensity         smallint not null check (intensity between 0 and 10),
  perceived_control smallint not null check (perceived_control between 0 and 10),
  support_received  smallint not null check (support_received between 0 and 10),
  local_date        date not null,
  created_at        timestamptz not null default now()
);
-- indice unico compuesto para la FK compuesta de event_notes
create unique index event_entries_id_student_idx on public.event_entries (id, student_id);
create index event_entries_student_idx on public.event_entries (student_id, local_date desc);

create table public.event_notes (
  event_id   uuid primary key references public.event_entries(id) on delete cascade,
  student_id uuid not null,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- impide adjuntar nota al evento de otro (igual que checkin_notes)
  constraint event_notes_owner_fk
    foreign key (event_id, student_id) references public.event_entries(id, student_id) on delete cascade
);
create index event_notes_student_idx on public.event_notes (student_id);

alter table public.event_entries enable row level security;
alter table public.event_notes   enable row level security;

grant select, insert, delete on public.event_entries to authenticated;
grant select, insert, delete on public.event_notes to authenticated;

-- event_entries: solo el estudiante, sin tutor.
create policy "mis eventos - leer" on public.event_entries
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis eventos - crear" on public.event_entries
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis eventos - borrar" on public.event_entries
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- event_notes: solo el estudiante, sin tutor (texto sensible).
create policy "mis notas evento - leer" on public.event_notes
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis notas evento - crear" on public.event_notes
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis notas evento - borrar" on public.event_notes
  for delete to authenticated using ( student_id = (select auth.uid()) );

create policy consent_gate_insert on public.event_entries
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );
create policy consent_gate_insert on public.event_notes
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

insert into public.retention_settings (table_name, retain_days) values
  ('event_entries', 730),
  ('event_notes', 90);

insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('evento_impacto', 'psicoeducativa', 'Evento e impacto',
 'Registra algo que te paso y como te afecto.', '{}'::jsonb, 9);
