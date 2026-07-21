-- 0015_rpc_tutor_panel.sql
-- RPC del panel del tutor. Son la via de LECTURA de datos sensibles del tutor, y
-- registran el acceso (Postgres no tiene triggers ON SELECT).
--
-- Cada RPC: (1) reverifica is_tutor_of DENTRO de la funcion; (2) registra el
-- acceso ANTES de devolver; (3) devuelve SOLO columnas de indicadores/resumen,
-- nunca texto, checkins crudos ni notas. VOLATILE (no stable): se llama una vez
-- por pantalla y no queremos que el planificador se coma el log_access.

-- Lista inicial del panel: un renglon por estudiante asignado.
create or replace function public.tutor_dashboard()
returns table (
  student_id  uuid,
  full_name   text,
  open_alerts bigint,
  max_level   public.alert_level,
  last_checkin date
)
language sql volatile security definer
set search_path = ''
as $$
  select p.id, p.full_name,
         count(a.id) filter (where a.status in ('abierta','en_revision')),
         max(a.level),
         (select max(c.local_date) from public.checkins c where c.student_id = p.id)
  from public.tutor_assignments ta
  join public.profiles p on p.id = ta.student_id
  left join public.alerts a on a.student_id = p.id
  where ta.tutor_id = (select auth.uid())
    and ta.ended_at is null
    and p.deleted_at is null
  group by p.id, p.full_name;
$$;
-- last_checkin es una FECHA, no el contenido. "Hace 9 dias que no entra" es
-- acompanamiento; "escribio X" es vigilancia. Ahi esta todo el producto.

-- Resumen de indicadores de UN estudiante.
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
  calc_version          text
)
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if not (public.is_tutor_of(p_student_id) or public.is_admin()) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  perform public.log_access(p_student_id, 'wellness_indicators', 'tutor_student_summary');
  return query
    select w.period_kind, w.period_start, w.period_end,
           w.mood_avg, w.stress_avg, w.sleep_avg, w.energy_avg,
           w.academic_load_avg, w.social_perception_avg,
           w.checkin_count, w.adherence_pct, w.calc_version
    from public.wellness_indicators w
    where w.student_id = p_student_id
    order by w.period_start desc
    limit 26;
end;
$$;

-- Alertas de UN estudiante.
create or replace function public.tutor_student_alerts(p_student_id uuid)
returns table (
  id           uuid,
  rule_code    text,
  rule_version integer,
  level        public.alert_level,
  status       public.alert_status,
  evidence     jsonb,
  window_start date,
  window_end   date,
  triggered_at timestamptz
)
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  if not (public.is_tutor_of(p_student_id) or public.is_admin()) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  perform public.log_access(p_student_id, 'alerts', 'tutor_student_alerts');
  return query
    select a.id, a.rule_code, a.rule_version, a.level, a.status, a.evidence,
           a.window_start, a.window_end, a.triggered_at
    from public.alerts a
    where a.student_id = p_student_id
    order by a.triggered_at desc;
end;
$$;

-- Un reporte semanal de UN estudiante.
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
begin
  if not (public.is_tutor_of(p_student_id) or public.is_admin()) then
    raise exception 'no autorizado' using errcode = '42501';
  end if;
  perform public.log_access(p_student_id, 'reports', 'tutor_student_report');
  return query
    select r.period_start, r.period_end, r.template_code, r.template_version,
           r.content, r.generated_at
    from public.reports r
    where r.student_id = p_student_id
      and r.period_start = p_period_start;
end;
$$;

-- revoke/grant: sin esto serian llamables con la anon key via /rpc/<nombre>.
revoke execute on function public.tutor_dashboard()                     from public, anon;
revoke execute on function public.tutor_student_summary(uuid)           from public, anon;
revoke execute on function public.tutor_student_alerts(uuid)            from public, anon;
revoke execute on function public.tutor_student_report(uuid, date)      from public, anon;

grant execute on function public.tutor_dashboard()                to authenticated;
grant execute on function public.tutor_student_summary(uuid)      to authenticated;
grant execute on function public.tutor_student_alerts(uuid)       to authenticated;
grant execute on function public.tutor_student_report(uuid, date) to authenticated;
