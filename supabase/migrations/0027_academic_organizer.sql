-- 0027_academic_organizer.sql
-- Descarga mental academica (catalogo doc §5.9): sacar los pendientes de la
-- cabeza, elegir 1-3 para hoy y marcarlos hechos. Se relaciona tematicamente con
-- el indicador academic_load (sin acoplar BD).
--
-- Mismo patron que worry_entries (el estudiante gestiona su lista con update,
-- estados, borrado inmediato). Texto breve privado, sin policy de tutor.

create table public.academic_tasks (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (length(title) between 1 and 200),
  status      text not null default 'pendiente' check (status in ('pendiente', 'hoy', 'hecha', 'archivada')),
  local_date  date not null,
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);
create index academic_tasks_student_idx on public.academic_tasks (student_id, status, created_at desc);

alter table public.academic_tasks enable row level security;

-- El estudiante gestiona su propia lista (crear, cambiar estado, borrar). Es su
-- dato privado, asi que el update sin restriccion de columna es aceptable (no hay
-- tutor que lo vea), igual que en la caja de preocupaciones.
grant select, insert, update, delete on public.academic_tasks to authenticated;

create policy "mis tareas - leer" on public.academic_tasks
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis tareas - crear" on public.academic_tasks
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis tareas - actualizar" on public.academic_tasks
  for update to authenticated
  using ( student_id = (select auth.uid()) )
  with check ( student_id = (select auth.uid()) );
create policy "mis tareas - borrar" on public.academic_tasks
  for delete to authenticated using ( student_id = (select auth.uid()) );

create policy consent_gate_insert on public.academic_tasks
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

insert into public.retention_settings (table_name, retain_days) values ('academic_tasks', 90);

insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('descarga_academica', 'psicoeducativa', 'Descarga academica',
 'Saca tus pendientes de la cabeza y elige 1-3 para hoy.', '{}'::jsonb, 10);
