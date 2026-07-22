-- 0019_fix_points_on_checkin_delete.sql
-- Bug detectado en pruebas: rehacer un check-in inflaba los puntos.
--
-- points_ledger referencia el check-in por (source_table, source_id) pero SIN FK
-- (a proposito: el ledger debe sobrevivir a cambios de esquema de otras tablas).
-- El efecto secundario era que al borrar un check-in su entrada de puntos quedaba
-- huerfana, y el nuevo check-in sumaba otros 10 puntos. Rehacer 3 veces daba 30
-- puntos con un solo check-in real.
--
-- Se corrige con un trigger: borrar un check-in retira sus puntos. Va en la base y
-- no en la app porque el cliente NO tiene permiso de escritura sobre points_ledger
-- (que es justo lo que hace los puntos no falsificables).

create or replace function public.cleanup_points_on_checkin_delete()
returns trigger
language plpgsql security definer   -- points_ledger no es escribible por el usuario
set search_path = ''
as $$
begin
  delete from public.points_ledger
  where student_id = old.student_id
    and source_table = 'checkins'
    and source_id = old.id;
  return old;
end;
$$;

create trigger checkins_cleanup_points
  after delete on public.checkins
  for each row execute function public.cleanup_points_on_checkin_delete();

-- Reparar los puntos ya inflados: borrar entradas cuyo check-in ya no existe.
delete from public.points_ledger pl
where pl.source_table = 'checkins'
  and not exists (select 1 from public.checkins c where c.id = pl.source_id);

-- Y recalcular el estado desde el ledger (la suma es la fuente de verdad).
update public.gamification_state gs
set points = coalesce((
      select sum(pl.amount) from public.points_ledger pl
      where pl.student_id = gs.student_id
    ), 0),
    updated_at = now();
