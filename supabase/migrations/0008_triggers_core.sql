-- 0008_triggers_core.sql
-- Triggers nucleo: creacion de perfil, local_date, inmutabilidades, updated_at.

-- 1) Crear el perfil al registrarse un usuario en auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'estudiante'          -- SIEMPRE. Nunca desde metadata del cliente.
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Un trigger que falla en auth.users hace fallar el SIGNUP con un 500 opaco
    -- que no menciona el trigger. Preferimos un usuario sin perfil (reparable con
    -- un INSERT) a un registro roto.
    raise warning 'handle_new_user fallo para %: %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- role se fija a 'estudiante', JAMAS se lee de raw_user_meta_data (que controla
-- el cliente via signUp). Leerlo de ahi dejaria que cualquiera se registre como
-- admin. La promocion a tutor/admin se hace SOLO por el RPC admin_set_role
-- (0012), nunca por PATCH directo: el grant de columna de 0009 excluye 'role'
-- para todo authenticated, admin incluido.

-- 2) Derivar local_date en servidor (impide falsificar la racha).
create or replace function public.set_local_date()
returns trigger
language plpgsql security definer   -- necesita leer profiles, que tiene RLS
set search_path = ''
as $$
declare v_tz text;
begin
  select p.timezone into v_tz from public.profiles p where p.id = new.student_id;
  v_tz := coalesce(v_tz, 'America/Lima');
  -- Ignoramos cualquier local_date que mande el cliente. Se deriva. Punto.
  new.local_date := (coalesce(new.checkin_at, now()) at time zone v_tz)::date;
  return new;
end;
$$;

create trigger checkins_set_local_date
  before insert on public.checkins
  for each row execute function public.set_local_date();

-- No es columna GENERATED porque 'at time zone <variable>' es STABLE, no
-- IMMUTABLE, y GENERATED exige IMMUTABLE. El trigger es la unica via.

-- 3) consents: append-only, unica mutacion permitida revoked_at null->timestamp.
create or replace function public.enforce_consent_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id      is distinct from old.user_id
  or new.document_id  is distinct from old.document_id
  or new.granted_at   is distinct from old.granted_at
  or new.declared_adult is distinct from old.declared_adult then
    raise exception 'consents es inmutable salvo la revocacion' using errcode = '42501';
  end if;
  if old.revoked_at is not null and new.revoked_at is distinct from old.revoked_at then
    raise exception 'un consentimiento ya revocado no puede modificarse' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger consents_immutable
  before update on public.consents
  for each row execute function public.enforce_consent_immutable();

-- 4) alert_rules: totalmente inmutable (nueva version = nueva fila).
create or replace function public.enforce_alert_rule_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'alert_rules es inmutable: inserta (code, version+1)' using errcode = '42501';
  return null;
end;
$$;

create trigger alert_rules_immutable
  before update on public.alert_rules
  for each row execute function public.enforce_alert_rule_immutable();

-- 5) evidence de alerts: allowlist de claves. RLS no puede inspeccionar el
--    contenido de un jsonb, asi que este es el unico candado que impide que una
--    Edge Function copie texto del estudiante a una tabla que el tutor lee.
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
    'window_end','threshold','delta','trend','period_kind','calc_version','rule_code'
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

create trigger alerts_evidence_allowlist
  before insert or update on public.alerts
  for each row execute function public.enforce_alert_evidence_allowlist();

-- 6) updated_at automatico donde exista la columna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
