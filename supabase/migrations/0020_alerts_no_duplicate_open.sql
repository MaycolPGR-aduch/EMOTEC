-- 0020_alerts_no_duplicate_open.sql
-- A lo sumo UNA alerta abierta o en revision por (estudiante, regla).
--
-- La deduplicacion en la Edge Function es en memoria: dos llamadas concurrentes a
-- recompute del mismo estudiante (doble tap, reintento) podrian leer ambas "cero
-- alertas abiertas" e insertar dos. Este indice lo impide en la base: la segunda
-- inserta choca con 23505 y la funcion la trata como "ya existe", no como error.
--
-- Un panel de tutor con alertas duplicadas es ruido, y el ruido hace que se
-- ignoren las alertas que si importan. Por eso la unicidad vive en la base.

create unique index alerts_one_open_per_rule_idx
  on public.alerts (student_id, rule_code)
  where status in ('abierta', 'en_revision');
