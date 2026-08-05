-- 0032_indicadores_y_puntos.sql
-- Prepara el destino de los indicadores de actividad y arregla la idempotencia
-- de los puntos antes de que recompute empiece a otorgarlos (fase 4).

-- ============================================================
-- 1. Columnas de indicadores de actividad (VISIBLES al tutor)
-- ============================================================
-- Regla de la frontera: columna tipada solo si el tutor la ordena/filtra o si una
-- plantilla la referencia por nombre. Todo lo demas va a details (invisible).
alter table public.wellness_indicators
  add column activity_days           smallint not null default 0,
  add column activity_adherence_pct  numeric(5,2),
  add column activity_completion_pct numeric(5,2),
  add column activity_rating_avg     numeric(4,2),
  add column emo_entries_count       smallint not null default 0,
  add column emo_intensity_avg       numeric(4,2),
  -- Desglose por bloque: SOLO dias con actividad. Decision de producto aprobada
  -- (el tutor ve que tipo de actividad usa). Nunca actividades individuales ni
  -- contenido. Anotado para la revision etica del piloto.
  add column block_regulacion_days    smallint not null default 0,
  add column block_conciencia_days    smallint not null default 0,
  add column block_afrontamiento_days smallint not null default 0,
  add column block_reflexion_days     smallint not null default 0,
  add column block_organizacion_days  smallint not null default 0;

comment on column public.wellness_indicators.activity_days is
  'Dias distintos con al menos una actividad completada. Mide CONSTANCIA, no cantidad: es el gemelo de checkin_count.';
comment on column public.wellness_indicators.activity_completion_pct is
  'completadas/(completadas+abandonadas). Si baja, las actividades son demasiado largas: es feedback de PRODUCTO, no de la persona.';

-- ============================================================
-- 2. points_ledger: idempotencia para puntos "por dia"
-- ============================================================
-- El unique actual es (student_id, reason, source_table, source_id) con source_id
-- uuid. Para "el dia X" no hay uuid natural: usar el id de la primera sesion del
-- dia es inestable (el conjunto crece durante el dia) y source_id = null NO
-- deduplica, porque en SQL dos NULL nunca son iguales -> se insertarian puntos
-- duplicados en cada ejecucion de recompute.
alter table public.points_ledger add column source_key text;

-- coalesce al id de la propia fila: si alguna fila tuviera source_id null, la
-- concatenacion daria NULL y el SET NOT NULL de abajo fallaria.
update public.points_ledger
   set source_key = coalesce(source_table, 'legacy') || ':' || coalesce(source_id::text, id::text)
 where source_key is null;

-- El trigger va ANTES del NOT NULL: recompute (index.ts) todavia inserta sin
-- source_key, y la columna no tiene default. Sin esto, todo INSERT en el ledger
-- fallaria con 23502 -> recompute devolveria 500 y se quedaria sin puntos, sin
-- racha, sin indicadores, sin reporte y sin motor de alertas.
-- El NOT NULL se comprueba DESPUES de los BEFORE triggers, asi que este relleno
-- lo satisface aunque el cliente no mande nada.
create or replace function public.set_points_source_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_key is null then
    new.source_key := coalesce(new.source_table, 'legacy') || ':' ||
                      coalesce(new.source_id::text, new.id::text);
  end if;
  return new;
end;
$$;

create trigger points_ledger_source_key
  before insert on public.points_ledger
  for each row execute function public.set_points_source_key();

alter table public.points_ledger alter column source_key set not null;

create unique index points_ledger_source_key_idx
  on public.points_ledger (student_id, reason, source_key);

comment on column public.points_ledger.source_key is
  'Clave de idempotencia legible: "checkin:<uuid>" o "dia:<fecha>". Reejecutar recompute nunca duplica puntos.';

-- El unique viejo se conserva hasta que recompute migre a source_key (fase 4b).

-- ============================================================
-- 3. Allowlist de alerts.evidence
-- ============================================================
-- Este array es, literalmente, la definicion ejecutable de que puede llegar a
-- ojos del tutor. Se anaden solo indicadores agregados de actividad.
-- NO se anaden: life_area, codigos de emocion, coping_style, activity_code.
create or replace function public.enforce_alert_evidence_allowlist()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  k text;
  allowed text[] := array[
    'mood_avg','stress_avg','sleep_avg','energy_avg','academic_load_avg',
    'social_perception_avg','checkin_count','adherence_pct','window','window_start',
    'window_end','threshold','delta','trend','period_kind','calc_version','rule_code',
    -- indicadores de actividad (0032)
    'activity_days','activity_adherence_pct','activity_completion_pct',
    'activity_rating_avg','emo_entries_count','emo_intensity_avg','block'
  ];
begin
  for k in select jsonb_object_keys(new.evidence) loop
    if not (k = any(allowed)) then
      raise exception 'evidence contiene clave no permitida: %', k using errcode = '22023';
    end if;
  end loop;
  return new;
end;
$$;
