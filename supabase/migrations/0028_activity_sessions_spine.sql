-- 0028_activity_sessions_spine.sql
-- activity_sessions pasa a ser la COLUMNA VERTEBRAL del uso de actividades.
--
-- Hoy solo 5 de 12 actividades escriben aqui y ningun codigo lo lee. La tabla ya
-- tenia la forma correcta (student_id, FK a catalogo, fechas, duracion, rating);
-- lo que faltaba era terminarla y conectarla. Se descarto una vista derivada por
-- una razon decisiva: una vista no puede reconstruir lo que nunca se escribio --
-- la tasa de abandono exige saber que alguien empezo y no termino, y las tablas
-- especificas solo reciben fila cuando el flujo tuvo exito.

-- === 1. Columnas nuevas ===
alter table public.activity_sessions
  add column status       text not null default 'completada'
       check (status in ('en_curso', 'completada', 'abandonada')),
  add column pre_state    smallint check (pre_state  between 0 and 10),
  add column post_state   smallint check (post_state between 0 and 10),
  add column step_reached smallint check (step_reached >= 0),
  add column step_total   smallint check (step_total   >= 0);

comment on column public.activity_sessions.pre_state is
  'Estado 0-10 declarado ANTES de una actividad de regulacion. Con post_state permite medir si la actividad ayudo, no solo si se uso.';

-- Coherencia: solo una sesion completada tiene completed_at.
alter table public.activity_sessions
  add constraint session_status_coherent check (
    (status =  'completada' and completed_at is not null) or
    (status <> 'completada' and completed_at is null)
  ) not valid;
alter table public.activity_sessions validate constraint session_status_coherent;

-- === 2. duration_sec: UNA sola semantica ===
-- Hoy conviven tres: real (respiracion/relajacion/anclaje), 0 hardcodeado
-- (gratitud/diario) e inexistente. Contrato nuevo: segundos reales de sesion
-- guiada, o NULL si la actividad no tiene duracion medible. Nunca 0.
-- Sin esto, avg(duration_sec) esta contaminado por los ceros y no significa nada.
update public.activity_sessions set duration_sec = null where duration_sec = 0;
alter table public.activity_sessions drop constraint if exists activity_sessions_duration_sec_check;
alter table public.activity_sessions
  add constraint activity_sessions_duration_sec_check check (duration_sec between 1 and 7200);

-- === 3. UPDATE para el modo guiada (cerrar la sesion) ===
-- Por columna, como en alerts (0009): student_id, activity_code, started_at y
-- local_date quedan INMUTABLES desde la app. De estas filas van a salir puntos.
grant update (completed_at, duration_sec, rating, status, pre_state, post_state, step_reached, step_total)
  on public.activity_sessions to authenticated;

create policy "mis sesiones - cerrar" on public.activity_sessions
  for update to authenticated
  using ( student_id = (select auth.uid()) )
  with check ( student_id = (select auth.uid()) );

create policy consent_gate_update on public.activity_sessions
  as restrictive for update to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

-- Una sesion cerrada no se reabre: impide reciclar una fila para farmear puntos.
create or replace function public.enforce_session_close_once()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status <> 'en_curso' then
    raise exception 'una sesion cerrada no se reabre' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger activity_sessions_close_once
  before update on public.activity_sessions
  for each row execute function public.enforce_session_close_once();

-- === 4. Modo diaria: una sesion por estudiante/actividad/dia ===
-- La caja de preocupaciones y la descarga academica son gestores persistentes:
-- 15 toques no son 15 sesiones. La unicidad vive en la base; el cliente intenta
-- el INSERT y traga el 23505 (mismo patron que el motor de alertas).
-- OJO: no usar .upsert({onConflict}) contra este indice -- supabase-js no sabe
-- expresar el WHERE de un indice parcial y el ON CONFLICT falla.
create unique index activity_sessions_daily_unique_idx
  on public.activity_sessions (student_id, activity_code, local_date)
  where activity_code in ('caja_preocupaciones', 'descarga_academica');

-- === 5. Barrendero de sesiones colgadas ===
-- Si la app muere con una sesion en_curso, la fila queda colgada y contamina la
-- tasa de finalizacion. Se cierra sola a las 2 horas.
create or replace function public.close_stale_activity_sessions()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.activity_sessions
     set status = 'abandonada'
   where status = 'en_curso'
     and started_at < now() - interval '2 hours';
end;
$$;

revoke execute on function public.close_stale_activity_sessions() from public, anon, authenticated;

select cron.schedule('cerrar-sesiones-colgadas', '15 * * * *',
                     $$select public.close_stale_activity_sessions()$$);

-- Indices para las consultas semanales de recompute.
create index activity_sessions_student_status_idx
  on public.activity_sessions (student_id, local_date desc, status);
