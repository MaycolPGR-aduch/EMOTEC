-- 0007_functions_helpers.sql
-- Funciones auxiliares SECURITY DEFINER. De aqui cuelga TODA la RLS.
--
-- Por que SECURITY DEFINER: una policy sobre profiles que consulte profiles da
-- ERROR 42P17 (recursion infinita) y deja profiles ilegible para TODOS, login
-- incluido -> outage total. Una funcion SECURITY DEFINER corre como su dueno
-- (postgres), que se salta la RLS de la tabla, y corta el ciclo.
--
-- ADVERTENCIA: nunca 'ALTER TABLE profiles FORCE ROW LEVEL SECURITY'. FORCE
-- aplica la RLS tambien al dueno y RESUCITA la recursion.

-- Rol del usuario actual. La base de todo lo demas.
create or replace function public.current_user_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid())
    and p.deleted_at is null;
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- Soy el tutor ACTIVO de este estudiante?
create or replace function public.is_tutor_of(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tutor_assignments ta
    where ta.student_id = p_student_id
      and ta.tutor_id   = (select auth.uid())
      and ta.ended_at is null
  );
$$;

-- LA PUERTA DE CONSENTIMIENTO.
create or replace function public.has_active_consent(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consents c
    join public.consent_documents d on d.id = c.document_id
    where c.user_id = p_user_id
      and c.revoked_at is null
      and d.is_accepted
  );
$$;

-- CRITICO: EXECUTE se concede a PUBLIC por defecto, y PostgREST expone toda
-- funcion de public como POST /rpc/<nombre> -> serian llamables con la anon key
-- (que va dentro del APK). Para toda funcion definer: revoke primero, grant
-- despues. search_path='' obliga a calificar todo (public.profiles, auth.uid());
-- sin ello, un atacante que cree objetos en un esquema anterior puede secuestrar
-- un nombre y ejecutar codigo como postgres (escalada de privilegios completa).
revoke execute on function public.current_user_role()      from public, anon;
revoke execute on function public.is_admin()               from public, anon;
revoke execute on function public.is_tutor_of(uuid)        from public, anon;
revoke execute on function public.has_active_consent(uuid) from public, anon;

grant execute on function public.current_user_role()      to authenticated;
grant execute on function public.is_admin()               to authenticated;
grant execute on function public.is_tutor_of(uuid)        to authenticated;
grant execute on function public.has_active_consent(uuid) to authenticated;

-- Nota: NO metemos el rol en el JWT (custom_access_token_hook). Seria mas rapido
-- pero el token vive hasta 1h: al desasignar un tutor, seguiria con acceso hasta
-- que expire. Estas funciones leen el estado ACTUAL: revocas y el efecto es
-- inmediato en la siguiente consulta.
