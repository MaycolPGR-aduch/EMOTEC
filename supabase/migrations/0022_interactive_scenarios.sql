-- 0022_interactive_scenarios.sql
-- Situaciones interactivas (backlog, §7 de la propuesta): escenarios cotidianos
-- academicos/sociales donde el estudiante elige como afrontaria, y recibe una
-- reflexion por su eleccion (la "devolucion"). El dato que produce es la
-- preferencia de afrontamiento (coping_style).
--
-- Privacidad: la eleccion es dato del ESTUDIANTE. El tutor NO tiene policy sobre
-- scenario_responses (coherente con "recolectar poco y con devolucion"). Si mas
-- adelante se quiere una tendencia agregada para el tutor, sera una Edge Function
-- que decida el responsable etico, no un acceso directo.

-- Catalogo de escenarios (gestionado por admin, como los demas catalogos).
create table public.scenario_catalog (
  code       text primary key,
  category   text not null,           -- 'academico' | 'social'
  title      text not null,
  prompt     text not null,
  options    jsonb not null,          -- [{id, text, coping_style, reflexion}]
  is_active  boolean not null default true,
  sort_order smallint not null default 0
);

-- Respuestas del estudiante. Estructurado (que opcion eligio), no texto libre.
create table public.scenario_responses (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles(id) on delete cascade,
  scenario_code text not null references public.scenario_catalog(code) on delete restrict,
  option_id     text not null,
  coping_style  text not null,
  local_date    date not null,
  created_at    timestamptz not null default now()
);
create index scenario_responses_student_idx on public.scenario_responses (student_id, local_date desc);

alter table public.scenario_catalog   enable row level security;
alter table public.scenario_responses enable row level security;

-- Grants (las default privileges de 0009 ya niegan a anon/authenticated en tablas
-- nuevas; concedemos a mano lo justo).
grant select on public.scenario_catalog to authenticated;
grant insert, update, delete on public.scenario_catalog to authenticated;   -- policy restringe a admin
grant select, insert, delete on public.scenario_responses to authenticated;

-- Catalogo: legible por autenticados; escritura solo admin.
create policy "leer escenarios" on public.scenario_catalog
  for select to authenticated using ( is_active or public.is_admin() );
create policy "admin gestiona escenarios" on public.scenario_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

-- Respuestas: solo el estudiante, y NADIE mas (sin policy de tutor).
create policy "mis respuestas - leer" on public.scenario_responses
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis respuestas - crear" on public.scenario_responses
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis respuestas - borrar" on public.scenario_responses
  for delete to authenticated using ( student_id = (select auth.uid()) );

-- Puerta de consentimiento (restrictiva).
create policy consent_gate_insert on public.scenario_responses
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

-- Retencion: dato estructurado, 2 anos.
insert into public.retention_settings (table_name, retain_days) values ('scenario_responses', 730);

-- Refactor de la purga a version GENERICA: recorre retention_settings y borra por
-- el campo de fecha configurado. Asi las tablas nuevas (esta y las futuras) se
-- purgan solo con anadir su fila en retention_settings, sin tocar mas esta funcion.
-- Seguridad: el nombre de tabla viene de retention_settings (solo admin escribe),
-- se valida contra information_schema y se cita con %I (sin inyeccion).
create or replace function public.purge_expired_data()
returns void
language plpgsql security definer set search_path = ''
as $$
declare r record;
begin
  for r in select table_name, retain_days, coalesce(purge_field, 'created_at') as field
           from public.retention_settings loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = r.table_name
    ) then
      execute format(
        'delete from public.%I where %I < now() - ($1 || '' days'')::interval',
        r.table_name, r.field
      ) using r.retain_days;
    end if;
  end loop;

  -- Purga total de quien revoco hace mas de 30 dias.
  delete from public.checkins c
  where exists (
    select 1 from public.consents k
    where k.user_id = c.student_id and k.revoked_at < now() - interval '30 days'
  ) and not public.has_active_consent(c.student_id);
end;
$$;

-- === Seed de escenarios (contenido borrador; a revisar con responsable etico) ===
insert into public.scenario_catalog (code, category, title, prompt, options, sort_order) values
('examen_manana', 'academico', 'Examen manana',
 'Tienes un examen importante manana y sientes que no vas a llegar a repasar todo.',
 '[
   {"id":"a","text":"Hago un plan de lo que si puedo repasar esta noche.","coping_style":"accion",
    "reflexion":"Enfocarte en lo que si esta en tus manos baja la sensacion de estar abrumado. Un plan pequeno y realista suele rendir mas que intentar todo."},
   {"id":"b","text":"Le escribo a un companero para repasar juntos.","coping_style":"apoyo",
    "reflexion":"Pedir compania para estudiar no es debilidad: explicar y preguntar ayuda a fijar lo que sabes, y hace el rato menos pesado."},
   {"id":"c","text":"Respiro un momento para bajar la ansiedad antes de seguir.","coping_style":"regulacion",
    "reflexion":"Calmar el cuerpo primero ayuda a que la cabeza piense mejor. Una pausa de respiracion de un minuto puede cambiar como afrontas el resto."},
   {"id":"d","text":"Descanso ahora y retomo temprano con la mente mas clara.","coping_style":"pausa",
    "reflexion":"Descansar cuando estas saturado no es rendirte. A veces la mente rinde mas despues de dormir. Si manana la ansiedad sigue, sumar un plan concreto ayuda."}
 ]'::jsonb, 1),

('conflicto_amigo', 'social', 'Algo que te molesto',
 'Un amigo dijo algo que te molesto y no sabes como reaccionar.',
 '[
   {"id":"a","text":"Le digo con calma como me senti.","coping_style":"accion",
    "reflexion":"Nombrar lo que sentiste, sin acusar, abre la conversacion en vez de cerrarla. Hablar en primera persona (me senti...) suele ayudar."},
   {"id":"b","text":"Espero a estar mas tranquilo antes de hablarlo.","coping_style":"pausa",
    "reflexion":"Darte tiempo antes de responder es una forma de cuidar la relacion. Volver al tema cuando estas mas sereno suele salir mejor."},
   {"id":"c","text":"Lo hablo con alguien de confianza para ordenar mis ideas.","coping_style":"apoyo",
    "reflexion":"Contarlo en voz alta ayuda a entender que te molesto de verdad. A veces al hablarlo se aclara solo."},
   {"id":"d","text":"Por ahora lo dejo pasar y veo como me siento manana.","coping_style":"pausa",
    "reflexion":"Dejar reposar algo esta bien si no te sigue pesando. Si manana todavia te molesta, quizas valga la pena conversarlo."}
 ]'::jsonb, 2),

('sobrecarga', 'academico', 'Muchas entregas juntas',
 'Tienes varias entregas juntas y sientes que no te alcanza el tiempo.',
 '[
   {"id":"a","text":"Hago una lista y elijo lo mas urgente para hoy.","coping_style":"accion",
    "reflexion":"Sacar las tareas de la cabeza y ponerlas en una lista baja la carga mental. Elegir una o dos para hoy es mas realista que todo a la vez."},
   {"id":"b","text":"Le escribo a un profesor para pedir ayuda o una prorroga.","coping_style":"apoyo",
    "reflexion":"Pedir una extension no es fracasar: muchos profesores prefieren un buen trabajo un poco mas tarde. Preguntar casi nunca hace dano."},
   {"id":"c","text":"Me tomo pausas cortas para no saturarme.","coping_style":"regulacion",
    "reflexion":"Trabajar en bloques con pausas breves suele rendir mas que forzar horas seguidas. Cuidar tu energia tambien es avanzar."}
 ]'::jsonb, 3),

('soledad', 'social', 'Sentirse apartado',
 'Ultimamente te has sentido un poco solo o apartado de los demas.',
 '[
   {"id":"a","text":"Le escribo a alguien con quien quiera reconectar.","coping_style":"apoyo",
    "reflexion":"Un mensaje corto a alguien que aprecias puede abrir mas de lo que parece. No tiene que ser profundo; basta un como estas."},
   {"id":"b","text":"Me uno a alguna actividad o grupo.","coping_style":"accion",
    "reflexion":"Compartir un espacio con otros, aunque sea por un interes en comun, ayuda a sentir compania sin la presion de hacer amigos de golpe."},
   {"id":"c","text":"Me doy permiso de estar asi un tiempo, sin exigirme.","coping_style":"regulacion",
    "reflexion":"Sentirte apartado a veces es parte de una etapa, no una falla tuya. Aceptarlo sin pelearte contigo mismo tambien ayuda a que pase."}
 ]'::jsonb, 4),

('exponer', 'academico', 'Exponer en clase',
 'Manana tienes que exponer frente a la clase y te da mucho nervio.',
 '[
   {"id":"a","text":"Practico en voz alta un par de veces antes.","coping_style":"accion",
    "reflexion":"Ensayar en voz alta hace que las palabras salgan mas solas el dia de la exposicion. La preparacion baja el nervio mas que cualquier consejo."},
   {"id":"b","text":"Uso una tecnica de respiracion justo antes de empezar.","coping_style":"regulacion",
    "reflexion":"Un minuto de respiracion antes de exponer baja el ritmo y la voz sale mas firme. La app tiene ejercicios para eso."},
   {"id":"c","text":"Me recuerdo que un error no arruina toda la exposicion.","coping_style":"regulacion",
    "reflexion":"Casi nadie nota los pequenos tropiezos tanto como uno mismo. Bajar la exigencia de ser perfecto hace la exposicion mas llevadera."}
 ]'::jsonb, 5);
