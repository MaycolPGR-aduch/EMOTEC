-- 0033_tutor_activity_summary.sql
-- El panel del tutor suma los indicadores de ACTIVIDAD.
--
-- FRONTERA DE PRIVACIDAD: esta lista de columnas ES la frontera. El tutor no
-- tiene policy sobre wellness_indicators, asi que solo ve lo que este RPC
-- devuelve. Todo lo que vive en `details` (coping_dist, emo_valence_dist,
-- life_area_dist, tareas, preocupaciones, pre_post, detective, evento) queda
-- fuera por construccion. NO anadir `details` aqui.
--
-- Se anaden los conteos por bloque (decision de producto aprobada: el tutor ve
-- que TIPO de actividad usa). Nunca actividades individuales ni contenido.
-- Anotado para la revision etica del piloto.

-- Cambiar el returns table exige DROP: create or replace no puede alterar el
-- tipo de retorno de una funcion existente.
drop function if exists public.tutor_student_summary(uuid);

create or replace function public.tutor_student_summary(p_student_id uuid)
returns table (
  period_kind           public.period_kind,
  period_start          date,
  period_end            date,
  mood_avg              numeric,
  stress_avg            numeric,
  sleep_avg             numeric,
  energy_avg            numeric,
  academic_load_avg     numeric,
  social_perception_avg numeric,
  checkin_count         smallint,
  adherence_pct         numeric,
  -- actividad (0032)
  activity_days            smallint,
  activity_adherence_pct   numeric,
  activity_completion_pct  numeric,
  activity_rating_avg      numeric,
  emo_entries_count        smallint,
  emo_intensity_avg        numeric,
  block_regulacion_days    smallint,
  block_conciencia_days    smallint,
  block_afrontamiento_days smallint,
  block_reflexion_days     smallint,
  block_organizacion_days  smallint,
  calc_version          text
)
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  -- 1. Reverificar la autorizacion DENTRO de la funcion.
  if not (public.is_tutor_of(p_student_id) or public.is_admin()) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  -- 2. Registrar el acceso ANTES de devolver nada.
  perform public.log_access(p_student_id, 'wellness_indicators', 'tutor_student_summary');

  -- 3. SOLO indicadores agregados. Notese lo que NO esta: details, life_area,
  --    coping_style, emociones, ni texto de ninguna clase.
  return query
    select w.period_kind, w.period_start, w.period_end,
           w.mood_avg, w.stress_avg, w.sleep_avg, w.energy_avg,
           w.academic_load_avg, w.social_perception_avg,
           w.checkin_count, w.adherence_pct,
           w.activity_days, w.activity_adherence_pct, w.activity_completion_pct,
           w.activity_rating_avg, w.emo_entries_count, w.emo_intensity_avg,
           w.block_regulacion_days, w.block_conciencia_days,
           w.block_afrontamiento_days, w.block_reflexion_days,
           w.block_organizacion_days,
           w.calc_version
    from public.wellness_indicators w
    where w.student_id = p_student_id
    order by w.period_start desc
    limit 26;
end;
$$;

-- El DROP se llevo los grants: hay que reponerlos.
revoke execute on function public.tutor_student_summary(uuid) from public, anon;
grant  execute on function public.tutor_student_summary(uuid) to authenticated;
