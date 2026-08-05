-- 0034_report_template_v3.sql
-- Plantilla de reporte v3: incorpora las actividades.
--
-- La v2 solo hablaba de los 6 indicadores del check-in, asi que un estudiante
-- que usara las actividades no veia ni rastro de ello en su reporte. Ahora el
-- reporte puede reconocer su constancia y, sobre todo, decirle si las pausas le
-- estan funcionando (pre_post_delta).
--
-- Se publica v3 y se desactiva v2. NO se edita la v2: los reportes ya generados
-- siguen siendo explicables con la plantilla que los produjo.
--
-- Los indicadores 'derived' (tareas_pct, pre_post_delta, abandono_pct,
-- actividades_total) NO son columnas: los expone recompute solo al ambito de la
-- plantilla, asi que se pueden usar aqui sin migrar la tabla.

insert into public.report_templates (code, version, locale, segments, is_active) values
('reporte_semanal', 3, 'es-PE',
 '[
   {"id":"intro","condicion":"siempre",
    "texto":"Este es tu resumen de la semana.","indicador_origen":null},

   {"id":"constancia_alta","condicion":"checkin_count>=5",
    "texto":"Mantuviste una buena constancia: registraste {valor} check-ins esta semana.",
    "indicador_origen":"checkin_count"},
   {"id":"constancia_baja","condicion":"checkin_count<=2",
    "texto":"Esta semana registraste pocos check-ins. Con mas registros, tu resumen sera mas util.",
    "indicador_origen":"checkin_count"},

   {"id":"animo_bueno","condicion":"mood_avg>=4",
    "texto":"Tu animo se mantuvo en un buen nivel durante la semana.",
    "indicador_origen":"mood_avg"},
   {"id":"animo_bajo","condicion":"mood_avg<=2",
    "texto":"Tu animo estuvo mas bajo que de costumbre.",
    "indicador_origen":"mood_avg"},

   {"id":"estres_alto","condicion":"stress_avg>=4",
    "texto":"Registraste niveles altos de estres. Incluir pausas breves durante el dia podria ayudarte.",
    "indicador_origen":"stress_avg"},

   {"id":"descanso_bajo","condicion":"sleep_avg<=2",
    "texto":"Registraste menos descanso del habitual. Cuidar tus horarios de sueno suele mejorar como te sientes durante el dia.",
    "indicador_origen":"sleep_avg"},

   {"id":"energia_baja","condicion":"energy_avg<=2",
    "texto":"Tu energia estuvo baja esta semana.",
    "indicador_origen":"energy_avg"},

   {"id":"carga_alta","condicion":"academic_load_avg>=4",
    "texto":"La carga academica se sintio pesada. Reorganizar algunas tareas podria aliviar la proxima semana.",
    "indicador_origen":"academic_load_avg"},

   {"id":"social_bajo","condicion":"social_perception_avg<=2",
    "texto":"Tu vida social se sintio menos satisfactoria de lo habitual.",
    "indicador_origen":"social_perception_avg"},
   {"id":"social_bueno","condicion":"social_perception_avg>=4",
    "texto":"Te sentiste bien acompanado en el area social.",
    "indicador_origen":"social_perception_avg"},

   {"id":"actividad_constante","condicion":"activity_days>=3",
    "texto":"Dedicaste tiempo a tu bienestar en {valor} dias distintos. Esa constancia importa mas que la cantidad.",
    "indicador_origen":"activity_days"},
   {"id":"actividad_ninguna","condicion":"activity_days==0",
    "texto":"Esta semana no hiciste ninguna actividad de bienestar. Una pausa breve puede ser un buen punto de partida.",
    "indicador_origen":"activity_days"},

   {"id":"pre_post_mejora","condicion":"pre_post_delta<=-1",
    "texto":"Cuando hiciste pausas de regulacion, terminaste sintiendote mas tranquilo que al empezar. Es una senal de que te funcionan.",
    "indicador_origen":"pre_post_delta"},

   {"id":"actividad_util","condicion":"activity_rating_avg>=4",
    "texto":"Valoraste bien las actividades que hiciste.",
    "indicador_origen":"activity_rating_avg"},

   {"id":"tareas_buenas","condicion":"tareas_pct>=60",
    "texto":"Completaste buena parte de los pendientes que anotaste.",
    "indicador_origen":"tareas_pct"},

   {"id":"emociones_registradas","condicion":"emo_entries_count>=3",
    "texto":"Registraste tus emociones varias veces. Ponerles nombre ayuda a entenderlas.",
    "indicador_origen":"emo_entries_count"},

   {"id":"cierre","condicion":"siempre",
    "texto":"Este resumen es orientativo y no es un diagnostico. Si alguna sensacion continua, conversar con tu tutor puede ser util.",
    "indicador_origen":null}
 ]'::jsonb,
 true);

update public.report_templates
set is_active = false
where code = 'reporte_semanal' and version = 2;
