-- 0030_vocabularios.sql
-- Unifica los vocabularios que hoy no cruzan y los pone bajo FK.
--
-- Problemas que resuelve:
--  1. emotional_entries.context_tag (5 valores masculinos: 'academico') y
--     event_entries.area (7 femeninos: 'academica') son el MISMO concepto con
--     valores que no cruzan: imposible agregar "en que area de vida" entre ambas.
--  2. La rueda guarda la emocion como LABEL ('Alegria') mientras el contexto
--     guarda la KEY ('academico'): dos convenciones en la misma fila, ninguna
--     con FK ni CHECK.
--  3. emotion_scene_responses no denormaliza los flags de analisis, asi que
--     medir aciertos exige rehacer el join contra un jsonb.
--
-- Tabla catalogo con FK, no enum: lo recomienda la propia migracion 0001.
-- Ver docs/contrato-datos.md para las cadenas exactas.

-- ============================================================
-- 1. Catalogos
-- ============================================================
create table public.life_area_catalog (
  code       text primary key,
  label      text not null,
  sort_order smallint not null default 0
);

create table public.emotion_catalog (
  code        text primary key,
  label       text not null,
  valence     text not null check (valence in ('agradable', 'desagradable', 'neutra')),
  parent_code text references public.emotion_catalog(code),
  sort_order  smallint not null default 0
);
-- 'agradable/desagradable', no 'positiva/negativa': ninguna emocion es negativa;
-- el enfado o el miedo son senales utiles. El estudiante nunca ve esta etiqueta.

create table public.coping_style_catalog (
  code       text primary key,
  label      text not null,
  sort_order smallint not null default 0
);

insert into public.life_area_catalog (code, label, sort_order) values
('academica', 'Academica', 1),
('social',    'Social',    2),
('familiar',  'Familiar',  3),
('personal',  'Personal',  4),
('salud',     'Salud',     5),
('economia',  'Economia',  6),
('otra',      'Otra',      7);

insert into public.emotion_catalog (code, label, valence, parent_code, sort_order) values
('alegria',       'Alegria',       'agradable',    null,        1),
('entusiasmo',    'Entusiasmo',    'agradable',    'alegria',   2),
('gratitud',      'Gratitud',      'agradable',    'alegria',   3),
('orgullo',       'Orgullo',       'agradable',    'alegria',   4),
('esperanza',     'Esperanza',     'agradable',    'alegria',   5),
('tristeza',      'Tristeza',      'desagradable', null,        10),
('desanimo',      'Desanimo',      'desagradable', 'tristeza',  11),
('soledad',       'Soledad',       'desagradable', 'tristeza',  12),
('decepcion',     'Decepcion',     'desagradable', 'tristeza',  13),
('nostalgia',     'Nostalgia',     'desagradable', 'tristeza',  14),
('miedo',         'Miedo',         'desagradable', null,        20),
('ansiedad',      'Ansiedad',      'desagradable', 'miedo',     21),
('inseguridad',   'Inseguridad',   'desagradable', 'miedo',     22),
('preocupacion',  'Preocupacion',  'desagradable', 'miedo',     23),
('nerviosismo',   'Nerviosismo',   'desagradable', 'miedo',     24),
('enojo',         'Enojo',         'desagradable', null,        30),
('frustracion',   'Frustracion',   'desagradable', 'enojo',     31),
('irritacion',    'Irritacion',    'desagradable', 'enojo',     32),
('impotencia',    'Impotencia',    'desagradable', 'enojo',     33),
('fastidio',      'Fastidio',      'desagradable', 'enojo',     34),
('calma',         'Calma',         'agradable',    null,        40),
('tranquilidad',  'Tranquilidad',  'agradable',    'calma',     41),
('alivio',        'Alivio',        'agradable',    'calma',     42),
('serenidad',     'Serenidad',     'agradable',    'calma',     43),
('sorpresa',      'Sorpresa',      'neutra',       null,        50),
('asombro',       'Asombro',       'neutra',       'sorpresa',  51),
('confusion',     'Confusion',     'neutra',       'sorpresa',  52),
('desconcierto',  'Desconcierto',  'neutra',       'sorpresa',  53),
('afecto',        'Afecto',        'agradable',    null,        60),
('carino',        'Carino',        'agradable',    'afecto',    61),
('conexion',      'Conexion',      'agradable',    'afecto',    62),
('agradecimiento','Agradecimiento','agradable',    'afecto',    63),
('verguenza',     'Verguenza',     'desagradable', null,        70),
('culpa',         'Culpa',         'desagradable', 'verguenza', 71),
('timidez',       'Timidez',       'desagradable', 'verguenza', 72),
('retraimiento',  'Retraimiento',  'desagradable', 'verguenza', 73);

insert into public.coping_style_catalog (code, label, sort_order) values
('accion',     'Accion directa',       1),
('apoyo',      'Buscar apoyo',         2),
('regulacion', 'Regulacion emocional', 3),
('pausa',      'Pausa / esperar',      4);

-- Catalogos: legibles por autenticados, escritura solo admin. NO llevan fila en
-- retention_settings (no son datos de estudiante; la purga generica los ignora).
alter table public.life_area_catalog   enable row level security;
alter table public.emotion_catalog     enable row level security;
alter table public.coping_style_catalog enable row level security;

grant select on public.life_area_catalog, public.emotion_catalog, public.coping_style_catalog to authenticated;
grant insert, update, delete on public.life_area_catalog, public.emotion_catalog, public.coping_style_catalog to authenticated;

create policy "leer areas" on public.life_area_catalog for select to authenticated using ( true );
create policy "admin gestiona areas" on public.life_area_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

create policy "leer emociones" on public.emotion_catalog for select to authenticated using ( true );
create policy "admin gestiona emociones" on public.emotion_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

create policy "leer coping" on public.coping_style_catalog for select to authenticated using ( true );
create policy "admin gestiona coping" on public.coping_style_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- ============================================================
-- 2. emotional_entries: context_tag -> life_area (FK) y emociones a code
-- ============================================================
alter table public.emotional_entries rename column context_tag to life_area;

update public.emotional_entries set life_area = 'academica' where life_area = 'academico';
update public.emotional_entries set life_area = 'otra'      where life_area = 'otro';
-- Cualquier valor que no exista en el catalogo se descarta (datos de prueba).
update public.emotional_entries set life_area = null
  where life_area is not null
    and life_area not in (select code from public.life_area_catalog);

-- Labels -> codes. Las etiquetas ya venian sin tildes, asi que lower() basta.
update public.emotional_entries set primary_emotion   = lower(primary_emotion)   where primary_emotion   is not null;
update public.emotional_entries set secondary_emotion = lower(secondary_emotion) where secondary_emotion is not null;

-- ORDEN IMPORTANTE: primero BORRAR, luego anular.
-- El CHECK emotional_shape (0004) exige que una rueda tenga primary_emotion no
-- nula, asi que anular una primaria desconocida daria 23514 y abortaria todo.
-- La unica salida para una rueda con emocion fuera del catalogo es borrarla
-- (son datos de prueba).
delete from public.emotional_entries
 where kind = 'rueda'
   and (primary_emotion is null
        or primary_emotion not in (select code from public.emotion_catalog));

-- secondary_emotion no lo cubre ningun CHECK: se puede anular sin problema.
update public.emotional_entries set secondary_emotion = null
 where secondary_emotion is not null
   and secondary_emotion not in (select code from public.emotion_catalog);

alter table public.emotional_entries
  add constraint emotional_entries_life_area_fk foreign key (life_area) references public.life_area_catalog(code),
  add constraint emotional_entries_primary_fk   foreign key (primary_emotion) references public.emotion_catalog(code),
  add constraint emotional_entries_secondary_fk foreign key (secondary_emotion) references public.emotion_catalog(code);

-- ============================================================
-- 3. event_entries: area -> life_area (FK)
-- ============================================================
alter table public.event_entries rename column area to life_area;
alter table public.event_entries drop constraint if exists event_entries_area_check;
alter table public.event_entries
  add constraint event_entries_life_area_fk foreign key (life_area) references public.life_area_catalog(code);

-- ============================================================
-- 4. scenario_responses: coping_style con FK
-- ============================================================
update public.scenario_responses set coping_style = lower(coping_style);
delete from public.scenario_responses
  where coping_style not in (select code from public.coping_style_catalog);
alter table public.scenario_responses
  add constraint scenario_responses_coping_fk foreign key (coping_style) references public.coping_style_catalog(code);

-- ============================================================
-- 5. session_id: agrupa filas sueltas con su sesion
-- ============================================================
-- gratitude_entries y journal_entries ya lo tenian; se extiende el patron.
alter table public.emotional_entries       add column session_id uuid references public.activity_sessions(id) on delete set null;
alter table public.scenario_responses      add column session_id uuid references public.activity_sessions(id) on delete set null;
alter table public.emotion_scene_responses add column session_id uuid references public.activity_sessions(id) on delete set null;
alter table public.event_entries           add column session_id uuid references public.activity_sessions(id) on delete set null;
alter table public.worry_entries           add column session_id uuid references public.activity_sessions(id) on delete set null;
alter table public.academic_tasks          add column session_id uuid references public.activity_sessions(id) on delete set null;

-- ============================================================
-- 6. emotion_scene_responses: denormalizar los flags de analisis
-- ============================================================
-- Los flags plausible/best viven en el jsonb del catalogo. Sin denormalizar, todo
-- indicador de acierto exigiria rehacer el join contra el jsonb en cada calculo.
-- Se hace en TRIGGER, no en el cliente: el cliente no debe poder decidir si
-- acerto (seria falsificable).
alter table public.emotion_scene_responses
  add column chose_best      boolean,
  add column plausible_hits  smallint,
  add column plausible_total smallint;

create or replace function public.denormalize_scene_response()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_content   jsonb;
  v_best      text;
  v_plausible text[];
begin
  select c.content into v_content
    from public.emotion_scene_catalog c
   where c.code = new.scene_code;
  if v_content is null then return new; end if;

  select r ->> 'id' into v_best
    from jsonb_array_elements(v_content -> 'responses') r
   where (r ->> 'best')::boolean
   limit 1;
  new.chose_best := (new.chosen_response_id is not null and new.chosen_response_id = v_best);

  select array_agg(e ->> 'id') into v_plausible
    from jsonb_array_elements(v_content -> 'emotions') e
   where (e ->> 'plausible')::boolean;

  new.plausible_total := coalesce(array_length(v_plausible, 1), 0);
  new.plausible_hits  := (
    select count(*) from unnest(coalesce(new.chosen_emotions, '{}')) x
     where x = any(coalesce(v_plausible, '{}'))
  );
  return new;
end;
$$;

create trigger emotion_scene_responses_denormalize
  before insert on public.emotion_scene_responses
  for each row execute function public.denormalize_scene_response();
