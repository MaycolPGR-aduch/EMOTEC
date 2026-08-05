-- 0029_activity_catalog_v2.sql
-- El catalogo declara COMO se comporta cada actividad: a que bloque pertenece y
-- que forma tiene su sesion. Con esto, la app y recompute dejan de tener listas
-- hardcodeadas y leen el comportamiento de la base.
--
-- Nota sobre 'kind': queda DEPRECADO en favor de 'block'. No se anade un valor
-- al enum (es irreversible y no habilita ningun indicador que 'block' no de).
-- 'kind' solo lo sigue usando getBreathingActivities para filtrar respiraciones.

alter table public.activity_catalog
  add column block text not null default 'regulacion'
      check (block in ('regulacion', 'conciencia', 'afrontamiento', 'reflexion', 'organizacion')),
  add column session_mode text not null default 'evento'
      check (session_mode in ('guiada', 'evento', 'diaria')),
  -- Del documento de catalogo §9.1: ninguna actividad deberia usarse con
  -- estudiantes reales sin revision profesional. Todas arrancan en 'pendiente'.
  add column professional_review_status text not null default 'pendiente'
      check (professional_review_status in ('pendiente', 'revisada', 'aprobada'));

comment on column public.activity_catalog.session_mode is
  'guiada: INSERT en_curso + UPDATE al cerrar (el abandono informa). evento: un solo INSERT. diaria: uno por estudiante/actividad/dia (gestores persistentes).';

-- === Los 5 codigos que faltaban ===
-- Estas actividades existen como pantalla pero nunca tuvieron fila de catalogo,
-- por eso no podian registrar sesion. Ver docs/contrato-datos.md.
insert into public.activity_catalog (code, kind, title, description, config, sort_order) values
('termometro_emocional', 'psicoeducativa', 'Termometro emocional',
 'Registra rapido que tan intenso te sientes ahora.', '{}'::jsonb, 11),
('rueda_emociones', 'rueda', 'Rueda de emociones',
 'Pon nombre a lo que sientes y su contexto.', '{}'::jsonb, 12),
('situaciones_interactivas', 'psicoeducativa', 'Situaciones',
 'Explora como afrontarias situaciones cotidianas.', '{}'::jsonb, 13),
('detective_emociones', 'psicoeducativa', 'Detective de emociones',
 'Practica reconocer lo que siente alguien en una escena.', '{}'::jsonb, 14),
('caja_preocupaciones', 'psicoeducativa', 'Caja de preocupaciones',
 'Ordena lo que te preocupa y encuentra un primer paso.', '{}'::jsonb, 15);

-- === Bloque y modo de las 15 (contrato: docs/contrato-datos.md §1) ===
update public.activity_catalog set block = 'regulacion', session_mode = 'guiada'
  where code in ('respiracion_478', 'respiracion_cuadrada', 'respiracion_coherencia',
                 'respiracion_relajante', 'relajacion_muscular', 'anclaje_54321');

update public.activity_catalog set block = 'conciencia', session_mode = 'evento'
  where code in ('termometro_emocional', 'rueda_emociones');

update public.activity_catalog set block = 'afrontamiento', session_mode = 'guiada'
  where code in ('situaciones_interactivas', 'detective_emociones');

update public.activity_catalog set block = 'reflexion', session_mode = 'evento'
  where code in ('tres_cosas_buenas', 'diario_breve', 'evento_impacto');

update public.activity_catalog set block = 'organizacion', session_mode = 'diaria'
  where code in ('caja_preocupaciones', 'descarga_academica');
