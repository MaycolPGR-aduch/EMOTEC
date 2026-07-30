-- 0023_worry_box.sql
-- Caja de preocupaciones (catalogo de actividades, doc §4.6). Separa lo
-- accionable (problema -> primer paso + fecha) de lo que solo se rumia
-- (guardar para revisar despues). Ensena una habilidad real de afrontamiento.
--
-- El texto de la preocupacion es SENSIBLE y PRIVADO: mismo patron que
-- checkin_notes. El tutor NO tiene ninguna policy sobre esta tabla. La app
-- ofrece "Buscar apoyo" siempre visible en la actividad (decision de producto:
-- sin escaneo del texto, para respetar la privacidad y evitar falsos positivos).

create table public.worry_entries (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (length(body) between 1 and 1000),
  actionable  boolean not null,
  first_step  text check (first_step is null or length(first_step) <= 500),
  target_date date,
  status      text not null default 'abierta' check (status in ('abierta', 'resuelta', 'archivada')),
  local_date  date not null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index worry_entries_student_idx on public.worry_entries (student_id, status, created_at desc);

alter table public.worry_entries enable row level security;

-- El estudiante gestiona sus propias preocupaciones (crear, marcar resuelta,
-- borrar de inmediato). Es su dato privado, asi que el update sin restriccion de
-- columna es aceptable aqui (no hay tutor que lo vea).
grant select, insert, update, delete on public.worry_entries to authenticated;

create policy "mis preocupaciones - leer" on public.worry_entries
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis preocupaciones - crear" on public.worry_entries
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis preocupaciones - actualizar" on public.worry_entries
  for update to authenticated
  using ( student_id = (select auth.uid()) )
  with check ( student_id = (select auth.uid()) );
create policy "mis preocupaciones - borrar" on public.worry_entries
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- Puerta de consentimiento (restrictiva).
create policy consent_gate_insert on public.worry_entries
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

-- Retencion: texto sensible, 90 dias. La purga generica (0022) la recoge sola.
insert into public.retention_settings (table_name, retain_days) values ('worry_entries', 90);
