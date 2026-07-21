-- 0014_functions_audit.sql
-- Auditoria de escrituras (trigger generico) y de lecturas (log_access).

-- Trigger generico. SECURITY DEFINER OBLIGATORIO: audit_logs tiene RLS y el
-- usuario no tiene INSERT. Sin definer, cada INSERT en la tabla auditada fallaria
-- con 42501. "Arreglarlo" con una policy 'insert with check (true)' dejaria
-- fabricar entradas de auditoria falsas -> peor que ninguna auditoria.
create or replace function public.audit_trigger()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor           uuid := (select auth.uid());
  v_subject         uuid;
  v_old             jsonb;
  v_new             jsonb;
  v_include_payload boolean := coalesce(TG_ARGV[0], 'true')::boolean;
  v_src             jsonb := case when TG_OP = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  v_subject := coalesce(v_src ->> 'student_id', v_src ->> 'user_id', v_src ->> 'id')::uuid;

  -- Para tablas con texto sensible (payload='false'): metadatos SI, contenido NO.
  if v_include_payload then
    v_old := case when TG_OP <> 'INSERT' then to_jsonb(old) end;
    v_new := case when TG_OP <> 'DELETE' then to_jsonb(new) end;
  end if;

  insert into public.audit_logs (actor_id, actor_role, subject_id, action,
                                 table_name, record_id, old_data, new_data)
  values (v_actor, public.current_user_role(), v_subject,
          lower(TG_OP)::public.audit_action, TG_TABLE_NAME,
          coalesce(to_jsonb(new) ->> 'id', to_jsonb(old) ->> 'id'),
          v_old, v_new);

  return coalesce(new, old);
end;
$$;

-- Que auditar y con que payload (ver diseno seccion 9.2).
create trigger audit_consents after insert or update or delete on public.consents
  for each row execute function public.audit_trigger('true');
create trigger audit_tutor_assignments after insert or update or delete on public.tutor_assignments
  for each row execute function public.audit_trigger('true');
create trigger audit_profiles after update or delete on public.profiles
  for each row execute function public.audit_trigger('true');
create trigger audit_alerts after update on public.alerts
  for each row execute function public.audit_trigger('true');
create trigger audit_followups after insert or update or delete on public.followups
  for each row execute function public.audit_trigger('true');

-- 'false' = sin payload: el texto de la nota NUNCA llega a audit_logs (que el
-- admin lee entera). Auditar el cuerpo convertiria la auditoria en el agujero
-- que checkin_notes existe para tapar.
create trigger audit_checkin_notes after insert or delete on public.checkin_notes
  for each row execute function public.audit_trigger('false');

-- Auditoria de LECTURAS: la llaman los RPC definer del panel del tutor.
create or replace function public.log_access(p_subject_id uuid, p_table text, p_rpc text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, actor_role, subject_id, action, table_name, context)
  values ((select auth.uid()), public.current_user_role(), p_subject_id, 'read', p_table,
          jsonb_build_object('rpc', p_rpc));
end;
$$;

-- NI SIQUIERA authenticated puede llamarla: solo los RPC definer, que corren como
-- postgres. Si authenticated pudiera, un tutor inyectaria lecturas falsas para
-- enturbiar el registro.
revoke execute on function public.log_access(uuid, text, text) from public, anon, authenticated;

-- audit_logs no tiene UPDATE ni DELETE para nadie: append-only por ausencia de
-- policies y de grants.
