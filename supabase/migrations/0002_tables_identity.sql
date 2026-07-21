-- 0002_tables_identity.sql
-- Identidad y vinculo tutor-estudiante.

-- profiles: 1:1 con auth.users.
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          public.user_role not null default 'estudiante',
  date_of_birth date,
  timezone      text not null default 'America/Lima',
  onboarded_at  timestamptz,
  deleted_at    timestamptz,          -- baja logica; la purga real la hace retencion
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role) where deleted_at is null;

-- 'role' vive aqui pero el usuario NO puede escribirla (ver grants, 0009). Si el
-- estudiante pudiera hacer PATCH {"role":"admin"}, todo lo demas sobra.
--
-- La edad NO se valida con CHECK (funciones no inmutables no se revalidan y son
-- una trampa). Es autodeclarada; su valor legal queda en consents.declared_adult.

-- tutor_assignments: un tutor por estudiante, con historial.
create table public.tutor_assignments (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  tutor_id    uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  ended_at    timestamptz,
  end_reason  text,
  constraint tutor_not_self check (student_id <> tutor_id)
);
-- "un tutor por estudiante" = a lo sumo una asignacion ACTIVA. La base rechaza
-- la segunda, no el codigo de la app.
create unique index tutor_assignments_one_active_idx
  on public.tutor_assignments (student_id) where ended_at is null;
create index tutor_assignments_tutor_idx
  on public.tutor_assignments (tutor_id) where ended_at is null;

-- Es tabla y no profiles.tutor_id porque: (1) auditoria exige saber quien asigno
-- y cuando; (2) desasignar deja rastro (ended_at), que importa al preguntar
-- "quien podia ver a X en marzo?"; (3) evita que la tabla sujeto de la RLS
-- (profiles) sea tambien la que define el vinculo.
