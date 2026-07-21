-- 0017_seed_catalogs.sql
-- Semilla de catalogos: consentimiento, reglas de alerta, plantilla de reporte,
-- actividades, recursos de ayuda y ajustes de retencion.
--
-- Recursos de ayuda: telefonos REALES y oficiales del MINSA (Peru), verificados.
-- Fuente: gob.pe / MINSA. Es la pantalla que importa en una crisis; no se
-- inventan datos aqui.

-- === Consentimiento informado v1.0 (borrador; revisar con responsable etico) ===
insert into public.consent_documents (version, locale, title, body_md, summary_md, is_current, is_accepted)
values (
  '1.0', 'es-PE',
  'Consentimiento informado - EMOTEC',
  E'# Consentimiento informado\n\n'
  || E'EMOTEC es una herramienta de acompanamiento preventivo del bienestar. **No es un servicio de diagnostico ni reemplaza a un profesional de salud mental.**\n\n'
  || E'## Que datos registramos\n\nRegistras voluntariamente tu estado de animo, estres, sueno, energia, carga academica y percepcion social, mas texto breve opcional.\n\n'
  || E'## Quien puede verlos\n\nTu ves tu historial completo. Tu tutor asignado ve unicamente indicadores resumidos y alertas preventivas, nunca el texto que escribes.\n\n'
  || E'## Tus derechos\n\nPuedes revocar este consentimiento en cualquier momento. Al hacerlo, dejamos de recolectar datos de inmediato. Puedes solicitar la correccion o eliminacion de tus datos.\n\n'
  || E'## Donde se almacenan\n\nTus datos se alojan en servidores gestionados por Supabase en la region de Sao Paulo (Brasil), con cifrado en transito.\n\n'
  || E'Declaro ser mayor de 18 anos y aceptar estos terminos.',
  'Acompanamiento preventivo, no diagnostico. Tu tutor ve resumenes, no tu texto. Puedes revocar cuando quieras.',
  true, true
);

-- === Reglas de alerta v1 (borrador; ajustar con responsable etico) ===
insert into public.alert_rules (code, version, name, description, level, definition) values
('estres_sostenido', 1, 'Estres sostenido',
 'Estres alto de forma repetida durante la semana.', 'preventiva',
 '{"indicador":"stress_avg","operador":">=","umbral":4,"ventana_dias":7,"min_checkins":4}'::jsonb),
('sueno_insuficiente', 1, 'Sueno insuficiente sostenido',
 'Descanso bajo de forma repetida durante la semana.', 'preventiva',
 '{"indicador":"sleep_avg","operador":"<=","umbral":2,"ventana_dias":7,"min_checkins":4}'::jsonb),
('animo_bajo_sostenido', 1, 'Animo bajo sostenido',
 'Estado de animo bajo de forma repetida durante la semana.', 'prioritaria',
 '{"indicador":"mood_avg","operador":"<=","umbral":2,"ventana_dias":7,"min_checkins":4}'::jsonb),
('caida_brusca_animo', 1, 'Cambio brusco en el animo',
 'Descenso marcado del animo respecto al patron personal.', 'prioritaria',
 '{"indicador":"mood_avg","tipo":"delta","operador":"<=","umbral":-1.5,"ventana_dias":7}'::jsonb);

-- === Plantilla de reporte semanal v1 (borrador) ===
insert into public.report_templates (code, version, locale, segments) values
('reporte_semanal', 1, 'es-PE',
 '[
   {"id":"intro","condicion":"siempre","texto":"Este es tu resumen de la semana.","indicador_origen":null},
   {"id":"descanso","condicion":"sleep_avg<=2","texto":"Registraste menos horas de descanso que otras semanas. Podria ayudarte incluir pausas breves.","indicador_origen":"sleep_avg"},
   {"id":"carga","condicion":"academic_load_avg>=4","texto":"Registraste una carga academica alta. Reorganizar algunas tareas podria aliviar la semana.","indicador_origen":"academic_load_avg"},
   {"id":"cierre","condicion":"siempre","texto":"Si alguna sensacion continua, conversar con tu tutor puede ser util.","indicador_origen":null}
 ]'::jsonb);

-- === Catalogo de actividades ===
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('respiracion_478', 'respiracion', 'Respiracion 4-7-8',
 'Inhala 4s, reten 7s, exhala 8s.',
 '{"inhala_seg":4,"reten_seg":7,"exhala_seg":8,"ciclos":4}'::jsonb, 1),
('respiracion_cuadrada', 'respiracion', 'Respiracion cuadrada',
 'Inhala, reten, exhala y reten, 4s cada fase.',
 '{"inhala_seg":4,"reten_seg":4,"exhala_seg":4,"pausa_seg":4,"ciclos":4}'::jsonb, 2);

-- === Recursos de ayuda (telefonos oficiales MINSA - Peru) ===
insert into public.help_resources (name, description, phone, whatsapp, region, is_emergency, sort_order) values
('Linea 113 - Salud Mental (MINSA)',
 'Orientacion y apoyo psicologico gratuito, 24 horas. Marca 113 y elige la opcion 5. Puedes llamar de forma anonima.',
 '113', '955557000', 'PE', true, 1),
('Linea 113 - WhatsApp (MINSA)',
 'Apoyo psicologico por WhatsApp con profesionales del MINSA.',
 null, '952842623', 'PE', true, 2),
('Emergencias (SAMU)',
 'Emergencias medicas a nivel nacional.',
 '106', null, 'PE', true, 3);

-- === Ajustes de retencion (texto 90 dias, numeros 2 anos) ===
insert into public.retention_settings (table_name, retain_days) values
('checkin_notes',     90),
('checkins',          730),
('emotional_entries', 730),
('activity_sessions', 730),
('wellness_indicators', 730),
('reports',           730),
('alerts',            1095),
('followups',         1095),
('audit_logs',        1095);
-- consents NO aparece a proposito: nunca se purga (prueba legal).
