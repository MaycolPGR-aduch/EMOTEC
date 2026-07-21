-- 0004_tables_student_data.sql
-- Datos que registra el estudiante: check-ins, notas, emociones, actividades.

create table public.checkins (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles(id) on delete cascade,
  checkin_at         timestamptz not null default now(),
  local_date         date not null,                       -- derivado en trigger (0008), NO del cliente
  mood               smallint not null check (mood              between 1 and 5),
  stress             smallint not null check (stress            between 1 and 5),
  sleep              smallint not null check (sleep             between 1 and 5),
  energy             smallint not null check (energy            between 1 and 5),
  academic_load      smallint not null check (academic_load     between 1 and 5),
  social_perception  smallint not null check (social_perception between 1 and 5),
  instrument_version smallint not null default 1,
  created_at         timestamptz not null default now(),
  constraint checkins_one_per_day unique (student_id, local_date)
);
-- Indice unico compuesto: lo necesita la FK compuesta de checkin_notes.
create unique index checkins_id_student_idx on public.checkins (id, student_id);
create index checkins_student_date_idx on public.checkins (student_id, local_date desc);

-- instrument_version: el dia que cambies la escala 1-5, los indicadores
-- historicos dejan de ser comparables. Con esto, la Edge Function sabe que
-- normalizacion aplicar a cada tramo.

-- LA tabla sensible: texto libre del check-in. El tutor NUNCA tiene policy aqui.
create table public.checkin_notes (
  checkin_id uuid primary key references public.checkins(id) on delete cascade,
  student_id uuid not null,
  body       text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  -- FK compuesta: hace IMPOSIBLE adjuntar una nota al check-in de otro.
  constraint checkin_notes_owner_fk
    foreign key (checkin_id, student_id)
    references public.checkins(id, student_id) on delete cascade
);
create index checkin_notes_student_idx on public.checkin_notes (student_id);

-- La FK compuesta (checkin_id, student_id) -> checkins(id, student_id) deja la
-- policy de INSERT en el trivial student_id = auth.uid(): si mandas el checkin_id
-- de otro con tu student_id, la FK no encuentra la fila y revienta. Declarativo
-- le gana a una subconsulta EXISTS evaluada bajo RLS en cada INSERT.

-- Termometro (feature 4) y rueda de emociones (feature 5): misma forma, una tabla.
create table public.emotional_entries (
  id                uuid primary key default gen_random_uuid(),
  student_id        uuid not null references public.profiles(id) on delete cascade,
  kind              public.emotional_kind not null,
  recorded_at       timestamptz not null default now(),
  local_date        date not null,
  intensity         smallint not null check (intensity between 0 and 10),
  primary_emotion   text,      -- solo 'rueda'
  secondary_emotion text,      -- solo 'rueda', opcional
  context_tag       text,      -- catalogo cerrado, NO texto libre
  created_at        timestamptz not null default now(),
  constraint emotional_shape check (
    case kind
      when 'termometro' then primary_emotion is null and secondary_emotion is null
      when 'rueda'      then primary_emotion is not null
      else false   -- un kind nuevo no debe eludir la validacion (CASE->NULL pasa el CHECK)
    end
  )
);
create index emotional_student_date_idx on public.emotional_entries (student_id, local_date desc);

-- context_tag es catalogo cerrado a proposito: alimenta indicadores que el tutor
-- SI ve. Si fuera texto libre, o filtras texto crudo al tutor (viola el
-- requisito) o guardas texto que nadie lee. El texto libre va a checkin_notes.

create table public.activity_catalog (
  code        text primary key,          -- 'respiracion_478', 'respiracion_cuadrada'
  kind        public.activity_kind not null,
  title       text not null,
  description text,
  config      jsonb not null default '{}'::jsonb,   -- fases, duraciones, ciclos
  is_active   boolean not null default true,
  sort_order  smallint not null default 0
);

create table public.activity_sessions (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  activity_code text not null references public.activity_catalog(code) on delete restrict,
  started_at    timestamptz not null,
  completed_at  timestamptz,
  local_date    date not null,
  duration_sec  integer  check (duration_sec between 0 and 7200),
  rating        smallint check (rating between 1 and 5),   -- la "valoracion" de la feature 6
  created_at    timestamptz not null default now(),
  constraint session_end_after_start check (completed_at is null or completed_at >= started_at)
);
create index activity_sessions_student_date_idx on public.activity_sessions (student_id, local_date desc);

-- activity_catalog existe porque: (1) los parametros de la respiracion (4-7-8,
-- ciclos) NO deben venir del cliente; con FK, la Edge Function valida la sesion
-- contra config; (2) sin FK, activity_code seria texto libre y en tres meses
-- convivirian 'respiracion', 'Respiracion' y 'resp_478'.
