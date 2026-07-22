-- 0021_more_activities.sql
-- Amplia el catalogo de actividades (backlog aprobado, jul 2026).
--
-- Dos tecnicas de respiracion mas: entran SIN tocar codigo, porque el motor de
-- respiracion ya lee las fases desde activity_catalog.config. Esto era el
-- proposito de tener el catalogo en la base y no hardcodeado.

insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('respiracion_coherencia', 'respiracion', 'Respiracion de coherencia',
 'Inhala y exhala 5s cada uno. Ritmo parejo para calmar el cuerpo.',
 '{"inhala_seg":5,"reten_seg":0,"exhala_seg":5,"ciclos":6}'::jsonb, 3),
('respiracion_relajante', 'respiracion', 'Respiracion relajante 4-6',
 'Exhala mas largo que inhalas: ayuda a bajar la activacion.',
 '{"inhala_seg":4,"reten_seg":0,"exhala_seg":6,"ciclos":6}'::jsonb, 4);

-- Anclaje 5-4-3-2-1: actividad psicoeducativa/sensorial para momentos de
-- ansiedad. No usa el motor de respiracion; su contenido (los pasos) va en config
-- y lo renderiza una pantalla propia.
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('anclaje_54321', 'psicoeducativa', 'Anclaje 5-4-3-2-1',
 'Vuelve al presente usando tus sentidos, paso a paso.',
 '{"pasos":[
    {"n":5,"sentido":"ves","texto":"Nombra 5 cosas que puedas ver a tu alrededor."},
    {"n":4,"sentido":"tocas","texto":"Nombra 4 cosas que puedas tocar."},
    {"n":3,"sentido":"oyes","texto":"Nombra 3 sonidos que puedas escuchar."},
    {"n":2,"sentido":"hueles","texto":"Nombra 2 cosas que puedas oler."},
    {"n":1,"sentido":"saboreas","texto":"Nombra 1 cosa que puedas saborear."}
  ]}'::jsonb, 5);

-- Tres cosas buenas (gratitud): actividad psicoeducativa con tres campos de
-- texto BREVE. Es texto del estudiante, asi que -como el diario- es privado: se
-- guarda en su propia tabla y el tutor NO tiene ninguna policy sobre ella.
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('tres_cosas_buenas', 'psicoeducativa', 'Tres cosas buenas',
 'Anota tres cosas buenas de tu dia, por pequenas que sean.',
 '{"campos":3}'::jsonb, 6);

create table public.gratitude_entries (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  session_id  uuid references public.activity_sessions(id) on delete set null,
  items       text[] not null check (array_length(items, 1) between 1 and 3),
  local_date  date not null,
  created_at  timestamptz not null default now(),
  -- Cota del texto total. Un CHECK no admite subconsultas (no se puede validar
  -- cada elemento por separado ahi); array_to_string concatena y da un escalar,
  -- suficiente para evitar abuso. El limite por campo (300) lo pone la app.
  constraint gratitude_items_len check (length(array_to_string(items, '')) <= 900)
);
create index gratitude_student_idx on public.gratitude_entries (student_id, local_date desc);

-- Mismo patron de privacidad que checkin_notes: es texto del estudiante.
alter table public.gratitude_entries enable row level security;
-- (sin FORCE)

revoke all on public.gratitude_entries from anon, authenticated;
grant select, insert, delete on public.gratitude_entries to authenticated;

-- Solo el estudiante, y NADIE mas. El tutor no aparece: es texto privado.
create policy "mi gratitud - leer" on public.gratitude_entries
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mi gratitud - crear" on public.gratitude_entries
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mi gratitud - borrar" on public.gratitude_entries
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- Puerta de consentimiento (restrictiva): sin consentir no se guarda.
create policy consent_gate_insert on public.gratitude_entries
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

-- Retencion como el resto del texto libre: 90 dias.
insert into public.retention_settings (table_name, retain_days) values ('gratitude_entries', 90);

-- Sumar gratitude_entries a la purga nocturna (la funcion de 0016 no la conoce).
create or replace function public.purge_expired_data()
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_days integer;
begin
  -- Texto libre (90 dias por defecto en retention_settings).
  select retain_days into v_days from public.retention_settings where table_name = 'checkin_notes';
  if found then
    delete from public.checkin_notes where created_at < now() - (v_days || ' days')::interval;
  end if;

  select retain_days into v_days from public.retention_settings where table_name = 'gratitude_entries';
  if found then
    delete from public.gratitude_entries where created_at < now() - (v_days || ' days')::interval;
  end if;

  select retain_days into v_days from public.retention_settings where table_name = 'emotional_entries';
  if found then
    delete from public.emotional_entries where created_at < now() - (v_days || ' days')::interval;
  end if;

  select retain_days into v_days from public.retention_settings where table_name = 'activity_sessions';
  if found then
    delete from public.activity_sessions where created_at < now() - (v_days || ' days')::interval;
  end if;

  select retain_days into v_days from public.retention_settings where table_name = 'checkins';
  if found then
    delete from public.checkins where created_at < now() - (v_days || ' days')::interval;
  end if;

  -- Purga total de quien revoco hace mas de 30 dias.
  delete from public.checkins c
  where exists (
    select 1 from public.consents k
    where k.user_id = c.student_id and k.revoked_at < now() - interval '30 days'
  ) and not public.has_active_consent(c.student_id);
end;
$$;
