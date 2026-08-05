-- 0031_local_date_servidor.sql
-- local_date deja de venir del cliente en las 10 tablas.
--
-- AGUJERO QUE CIERRA (importante): el trigger set_local_date de 0008 existe para
-- impedir que se falsifique la racha, pero usa coalesce(new.checkin_at, now()) y
-- el grant de 0009 permite insertar checkin_at. Un cliente manipulado manda
-- checkin_at en el pasado, obtiene un local_date pasado, y como el unique es
-- (student_id, local_date) puede rellenar una racha dia a dia. Es decir: el
-- trigger que existia PARA impedirlo no lo impedia del todo.
--
-- Y las otras 9 tablas ni siquiera tenian trigger: recibian local_date del
-- cliente via todayStr() (reloj del dispositivo), lo que ademas desalinea los
-- joins con checkins si la zona del movil difiere de profiles.timezone.
--
-- Solucion: una sola funcion generica, con CLAMP.

create or replace function public.set_local_date_generic()
returns trigger
language plpgsql security definer   -- necesita leer profiles, que tiene RLS
set search_path = ''
as $$
declare
  v_tz  text;
  v_ts  timestamptz;
  v_col text := coalesce(TG_ARGV[0], 'created_at');
begin
  select p.timezone into v_tz from public.profiles p where p.id = new.student_id;
  v_tz := coalesce(v_tz, 'America/Lima');

  -- Solo varia la columna de ORIGEN; el destino (local_date) se llama igual en
  -- las 10 tablas, asi que no hace falta jsonb_populate_record.
  v_ts := coalesce((to_jsonb(new) ->> v_col)::timestamptz, now());

  -- CLAMP: una marca futura o de hace mas de 12 h solo puede venir de un cliente
  -- manipulado (o de un reloj muy desviado). Se ignora y se usa el reloj del
  -- servidor. Sin esto, la racha sigue siendo falsificable.
  if v_ts > now() or v_ts < now() - interval '12 hours' then
    v_ts := now();
  end if;

  new.local_date := (v_ts at time zone v_tz)::date;
  return new;
end;
$$;

-- checkins: reemplaza el trigger especifico de 0008 (que se queda sin uso).
drop trigger if exists checkins_set_local_date on public.checkins;
create trigger checkins_set_local_date
  before insert on public.checkins
  for each row execute function public.set_local_date_generic('checkin_at');

create trigger emotional_entries_set_local_date
  before insert on public.emotional_entries
  for each row execute function public.set_local_date_generic('recorded_at');

create trigger activity_sessions_set_local_date
  before insert on public.activity_sessions
  for each row execute function public.set_local_date_generic('started_at');

create trigger gratitude_entries_set_local_date
  before insert on public.gratitude_entries
  for each row execute function public.set_local_date_generic('created_at');

create trigger journal_entries_set_local_date
  before insert on public.journal_entries
  for each row execute function public.set_local_date_generic('created_at');

create trigger scenario_responses_set_local_date
  before insert on public.scenario_responses
  for each row execute function public.set_local_date_generic('created_at');

create trigger emotion_scene_responses_set_local_date
  before insert on public.emotion_scene_responses
  for each row execute function public.set_local_date_generic('created_at');

create trigger event_entries_set_local_date
  before insert on public.event_entries
  for each row execute function public.set_local_date_generic('created_at');

create trigger worry_entries_set_local_date
  before insert on public.worry_entries
  for each row execute function public.set_local_date_generic('created_at');

create trigger academic_tasks_set_local_date
  before insert on public.academic_tasks
  for each row execute function public.set_local_date_generic('created_at');

-- La funcion vieja queda sin triggers; se elimina para que no haya dos caminos.
drop function if exists public.set_local_date();
