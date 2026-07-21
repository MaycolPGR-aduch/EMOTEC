-- 0016_retention.sql
-- Retencion: purga programada. Texto libre 90 dias, numeros 2 anos.
-- consents NUNCA se purga: es la prueba legal de que hubo consentimiento.

create or replace function public.purge_expired_data()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare v_days integer;
begin
  -- Texto libre: reloj mas corto (dato mas sensible, menos util para
  -- indicadores). Solo posible porque las notas viven en su propia tabla.
  select retain_days into v_days from public.retention_settings where table_name = 'checkin_notes';
  if found then
    delete from public.checkin_notes where created_at < now() - (v_days || ' days')::interval;
  end if;

  -- Emociones y sesiones: retencion numerica.
  select retain_days into v_days from public.retention_settings where table_name = 'emotional_entries';
  if found then
    delete from public.emotional_entries where created_at < now() - (v_days || ' days')::interval;
  end if;

  select retain_days into v_days from public.retention_settings where table_name = 'activity_sessions';
  if found then
    delete from public.activity_sessions where created_at < now() - (v_days || ' days')::interval;
  end if;

  -- Checkins: retencion numerica.
  select retain_days into v_days from public.retention_settings where table_name = 'checkins';
  if found then
    delete from public.checkins where created_at < now() - (v_days || ' days')::interval;
  end if;

  -- Purga total de quien revoco hace mas de 30 dias (ventana de arrepentimiento).
  delete from public.checkins c
  where exists (
    select 1 from public.consents k
    where k.user_id = c.student_id and k.revoked_at < now() - interval '30 days'
  ) and not public.has_active_consent(c.student_id);
end;
$$;

revoke execute on function public.purge_expired_data() from public, anon, authenticated;

-- Programar a las 4:00 (hora del servidor) cada dia. pg_cron esta en Supabase.
select cron.schedule('purga-nocturna', '0 4 * * *', $$select public.purge_expired_data()$$);
