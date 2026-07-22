-- 0018_report_template_v2.sql
-- Plantilla de reporte semanal v2: mas segmentos y cobertura de los 6 indicadores.
-- La v1 (seed de 0017) solo cubria descanso y carga, asi que un estudiante sin esas
-- condiciones recibia un reporte practicamente vacio.
--
-- Demuestra el versionado de plantillas: NO se edita la v1, se publica una v2 y se
-- desactiva la anterior. Los reportes ya generados conservan su template_version,
-- asi que siguen siendo explicables con la plantilla que los produjo.
--
-- Sintaxis de 'condicion': 'siempre' o '<indicador><op><numero>' con op en
-- <=, >=, <, >, ==. La evalua la Edge Function con un parser propio (sin eval).
-- '{valor}' en el texto se reemplaza por el valor del indicador que disparo el segmento.

insert into public.report_templates (code, version, locale, segments, is_active) values
('reporte_semanal', 2, 'es-PE',
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

   {"id":"cierre","condicion":"siempre",
    "texto":"Este resumen es orientativo y no es un diagnostico. Si alguna sensacion continua, conversar con tu tutor puede ser util.",
    "indicador_origen":null}
 ]'::jsonb,
 true);

-- Desactivar la v1: la Edge Function toma siempre la version activa mas alta.
update public.report_templates
set is_active = false
where code = 'reporte_semanal' and version = 1;
