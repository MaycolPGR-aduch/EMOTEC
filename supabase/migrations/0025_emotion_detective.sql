-- 0025_emotion_detective.sql
-- Detective de emociones (catalogo doc §5.1): psicoeducacion. El estudiante lee
-- una escena, reconoce emociones y senales posibles, elige una respuesta
-- empatica y ve una explicacion. Mismo patron que scenario_catalog/responses.
--
-- No etiqueta al estudiante: la retroalimentacion admite varias interpretaciones
-- razonables. La eleccion es dato privado (sin policy de tutor).

create table public.emotion_scene_catalog (
  code        text primary key,
  category    text not null,
  title       text not null,
  scene       text not null,
  content     jsonb not null,  -- {emotions:[{id,label,plausible}], signals:[{id,text}], responses:[{id,text,best,reflexion}], explanation}
  is_active   boolean not null default true,
  sort_order  smallint not null default 0
);

create table public.emotion_scene_responses (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references public.profiles(id) on delete cascade,
  scene_code         text not null references public.emotion_scene_catalog(code) on delete restrict,
  chosen_emotions    text[] not null default '{}',
  chosen_signals     text[] not null default '{}',
  chosen_response_id text,
  local_date         date not null,
  created_at         timestamptz not null default now()
);
create index emotion_scene_responses_student_idx on public.emotion_scene_responses (student_id, local_date desc);

alter table public.emotion_scene_catalog   enable row level security;
alter table public.emotion_scene_responses enable row level security;

grant select on public.emotion_scene_catalog to authenticated;
grant insert, update, delete on public.emotion_scene_catalog to authenticated;   -- policy restringe a admin
grant select, insert, delete on public.emotion_scene_responses to authenticated;

create policy "leer escenas" on public.emotion_scene_catalog
  for select to authenticated using ( is_active or public.is_admin() );
create policy "admin gestiona escenas" on public.emotion_scene_catalog
  for all to authenticated using ( public.is_admin() ) with check ( public.is_admin() );

create policy "mis respuestas escena - leer" on public.emotion_scene_responses
  for select to authenticated using ( student_id = (select auth.uid()) );
create policy "mis respuestas escena - crear" on public.emotion_scene_responses
  for insert to authenticated with check ( student_id = (select auth.uid()) );
create policy "mis respuestas escena - borrar" on public.emotion_scene_responses
  for delete to authenticated using ( student_id = (select auth.uid()) );

create policy consent_gate_insert on public.emotion_scene_responses
  as restrictive for insert to authenticated
  with check ( public.has_active_consent((select auth.uid())) );

insert into public.retention_settings (table_name, retain_days) values ('emotion_scene_responses', 730);

-- === Seed de escenas (contenido borrador; revisar con responsable etico) ===
insert into public.emotion_scene_catalog (code, category, title, scene, content, sort_order) values
('companera_callada', 'social', 'Una companera callada',
 'En clase, Lucia, que casi siempre participa, hoy esta callada, con la mirada baja, y responde con monosilabos.',
 '{
   "emotions":[
     {"id":"tristeza","label":"Tristeza","plausible":true},
     {"id":"cansancio","label":"Cansancio","plausible":true},
     {"id":"preocupacion","label":"Preocupacion","plausible":true},
     {"id":"enojo","label":"Enojo","plausible":false},
     {"id":"alegria","label":"Alegria","plausible":false}
   ],
   "signals":[
     {"id":"mirada","text":"Mirada baja"},
     {"id":"cortas","text":"Respuestas cortas"},
     {"id":"participa","text":"Participa menos que de costumbre"}
   ],
   "responses":[
     {"id":"a","text":"Le pregunto en privado como esta, sin presionar.","best":true,
      "reflexion":"Acercarte con curiosidad y sin juzgar deja la puerta abierta. Que sea en privado respeta su espacio."},
     {"id":"b","text":"Le muestro que estoy si me necesita y le doy espacio.","best":false,
      "reflexion":"Dar espacio tambien acompana. A veces basta con que la persona sepa que no esta sola."},
     {"id":"c","text":"No hago nada; quizas solo esta cansada.","best":false,
      "reflexion":"Puede ser. Pero un gesto pequeno de interes no molesta y a veces significa mucho."}
   ],
   "explanation":"Una misma conducta puede tener muchas causas. No sabemos que le pasa a Lucia, y esta bien: acercarse con cuidado ayuda mas que suponer."
 }'::jsonb, 1),

('amigo_cancela', 'social', 'Un amigo que cancela',
 'Tu amigo cancela los planes por tercera vez esta semana, siempre con excusas cortas.',
 '{
   "emotions":[
     {"id":"decepcion","label":"Decepcion","plausible":true},
     {"id":"molestia","label":"Molestia","plausible":true},
     {"id":"preocupacion","label":"Preocupacion por el","plausible":true},
     {"id":"confusion","label":"Confusion","plausible":true},
     {"id":"indiferencia","label":"Indiferencia","plausible":false}
   ],
   "signals":[
     {"id":"excusas","text":"Excusas cortas"},
     {"id":"seguido","text":"Cancela seguido"},
     {"id":"contacto","text":"Menos contacto que antes"}
   ],
   "responses":[
     {"id":"a","text":"Le digo que lo extrano y le pregunto si esta bien.","best":true,
      "reflexion":"Nombrar lo que sientes sin reclamar abre la conversacion. Preguntar antes de concluir cambia mucho."},
     {"id":"b","text":"Le doy espacio y espero a que el hable.","best":false,
      "reflexion":"Dar espacio es valido. Solo cuida que el silencio no se vuelva distancia sin que ninguno lo diga."},
     {"id":"c","text":"Me molesto y dejo de escribirle.","best":false,
      "reflexion":"Es una reaccion humana. Pero cortar sin hablar suele dejar a los dos peor y con dudas."}
   ],
   "explanation":"Detras de una conducta que nos molesta a veces hay algo que la otra persona esta pasando. Preguntar con calma da mas informacion que suponer."
 }'::jsonb, 2),

('companero_examen', 'academico', 'Despues del examen',
 'Un companero reprobo un examen para el que habia estudiado mucho. Esta en silencio, guardando sus cosas despacio.',
 '{
   "emotions":[
     {"id":"frustracion","label":"Frustracion","plausible":true},
     {"id":"tristeza","label":"Tristeza","plausible":true},
     {"id":"desanimo","label":"Desanimo","plausible":true},
     {"id":"verguenza","label":"Verguenza","plausible":true},
     {"id":"orgullo","label":"Orgullo","plausible":false}
   ],
   "signals":[
     {"id":"silencio","text":"Silencio"},
     {"id":"lento","text":"Movimientos lentos"},
     {"id":"evita","text":"Evita mirar a los demas"}
   ],
   "responses":[
     {"id":"a","text":"Le digo que estudiar y que salga mal es muy duro, y que estoy ahi.","best":true,
      "reflexion":"Validar lo que siente (esto es duro) y reconocer su esfuerzo acompana de verdad."},
     {"id":"b","text":"Le recuerdo que es solo un examen.","best":false,
      "reflexion":"La intencion es buena, pero minimizar (no es para tanto) puede hacer que se sienta menos comprendido."},
     {"id":"c","text":"Cambio de tema para animarlo.","best":false,
      "reflexion":"Distraer a veces ayuda, pero primero suele importar que sienta que su malestar fue visto."}
   ],
   "explanation":"Acompanar no es arreglar. Reconocer el esfuerzo y validar la emocion (esto duele) suele ayudar mas que minimizar o apurar el animo."
 }'::jsonb, 3);
