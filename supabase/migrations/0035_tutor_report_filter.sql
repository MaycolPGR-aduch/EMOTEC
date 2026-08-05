-- 0035_tutor_report_filter.sql
-- CIERRA UNA FUGA: el reporte semanal que ve el tutor filtraba indicadores
-- privados.
--
-- La frontera del tutor NO era solo tutor_student_summary: tambien existe
-- tutor_student_report (0015), que devuelve reports.content tal cual. Al anadir
-- a la plantilla v3 segmentos basados en pre_post_delta y tareas_pct -- que
-- derivan de wellness_indicators.details y de tablas SIN policy de tutor
-- (academic_tasks, activity_sessions.pre/post_state) -- esos valores quedaban
-- expuestos: el tutor podia llamar al RPC y leer
-- {"source_indicator":"tareas_pct","value":75}.
--
-- Solucion: el ESTUDIANTE sigue viendo su reporte completo (es suyo, y el
-- segmento "las pausas te funcionan" es justo el mas valioso). El TUTOR recibe
-- el mismo reporte filtrado a los segmentos cuyo indicador ya puede ver.
--
-- La allowlist de abajo es la MISMA lista de columnas de tutor_student_summary.
-- Si se anade un indicador visible al tutor, va en los dos sitios.

drop function if exists public.tutor_student_report(uuid, date);

create or replace function public.tutor_student_report(p_student_id uuid, p_period_start date)
returns table (
  period_start     date,
  period_end       date,
  template_code    text,
  template_version integer,
  content          jsonb,
  generated_at     timestamptz
)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_allowed text[] := array[
    'mood_avg','stress_avg','sleep_avg','energy_avg','academic_load_avg',
    'social_perception_avg','checkin_count','adherence_pct',
    'activity_days','activity_adherence_pct','activity_completion_pct',
    'activity_rating_avg','emo_entries_count','emo_intensity_avg',
    'block_regulacion_days','block_conciencia_days','block_afrontamiento_days',
    'block_reflexion_days','block_organizacion_days'
  ];
begin
  if not (public.is_tutor_of(p_student_id) or public.is_admin()) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;

  perform public.log_access(p_student_id, 'reports', 'tutor_student_report');

  return query
    select r.period_start, r.period_end, r.template_code, r.template_version,
           -- Solo segmentos sin indicador (texto generico: intro, cierre) o
           -- basados en un indicador que el tutor ya ve en su panel.
           (select coalesce(jsonb_agg(seg), '[]'::jsonb)
              from jsonb_array_elements(r.content) seg
             where seg ->> 'source_indicator' is null
                or seg ->> 'source_indicator' = any(v_allowed)) as content,
           r.generated_at
    from public.reports r
    where r.student_id = p_student_id
      and r.period_start = p_period_start;
end;
$$;

revoke execute on function public.tutor_student_report(uuid, date) from public, anon;
grant  execute on function public.tutor_student_report(uuid, date) to authenticated;
