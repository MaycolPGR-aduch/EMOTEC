// deno-lint-ignore-file no-explicit-any
// Edge Function: recompute
// Recalcula indicadores semanales, puntos y racha de UN estudiante (el que llama).
// Corre con service_role -> se salta RLS, por eso verifica a mano: (1) que el
// llamante sea un usuario valido y (2) que tenga consentimiento activo. Escribe
// las tablas derivadas que NINGUN rol de la app puede escribir; asi los puntos y
// la racha no son falsificables desde el cliente.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CALC_VERSION = 'e9-1';
const POINTS_PER_CHECKIN = 10;
// 5 puntos por DIA con al menos una actividad completada, no por actividad: la
// octava del dia da 0, asi que no hay nada que farmear. La gamificacion premia
// constancia, no cantidad.
const POINTS_PER_ACTIVITY_DAY = 5;

// REGLA DURA: esta funcion corre con service_role y se salta la RLS entera.
// NUNCA debe seleccionar texto del estudiante: worry_entries.body,
// academic_tasks.title, journal_entries.*, gratitude_entries.items,
// event_notes.body ni checkin_notes.body. Solo columnas estructuradas.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors() });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Falta autorizacion' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Identificar al usuario con SU propio token (no confiamos en el body).
    const asUser = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: uErr,
    } = await asUser.auth.getUser();
    if (uErr || !user) return json({ error: 'Sesion invalida' }, 401);
    const uid = user.id;

    const admin = createClient(url, service);

    // 2. Puerta de consentimiento. service_role se salta la RLS y la puerta
    //    restrictiva, asi que la reimponemos aqui explicitamente.
    const { data: consent } = await admin
      .from('consents')
      .select('id, consent_documents!inner(is_accepted)')
      .eq('user_id', uid)
      .is('revoked_at', null)
      .eq('consent_documents.is_accepted', true)
      .limit(1);
    if (!consent || consent.length === 0) {
      return json({ error: 'Sin consentimiento activo' }, 403);
    }

    // 3. Leer los check-ins del usuario.
    const { data: checkins } = await admin
      .from('checkins')
      .select('id, local_date, mood, stress, sleep, energy, academic_load, social_perception')
      .eq('student_id', uid)
      .order('local_date', { ascending: true });
    const rows = checkins ?? [];

    // 3b. Ventana de la semana (lunes a domingo) y fuentes de actividad.
    //
    // La fecha se calcula en la ZONA DEL PERFIL, no en UTC: local_date lo deriva
    // el servidor con esa zona (0031), y con toISOString() entre las 19:00 y
    // medianoche de Lima "hoy" ya seria el dia siguiente -- un domingo por la
    // noche eso desplazaria la ventana a la semana siguiente y perderia el dia.
    const { data: prof } = await admin
      .from('profiles')
      .select('timezone')
      .eq('id', uid)
      .maybeSingle();
    const tz = (prof?.timezone as string) ?? 'America/Lima';
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD
    const wkStart = weekStart(today);
    const wkEnd = addDays(wkStart, 6);
    // Tambien se recalcula la semana ANTERIOR: recompute puede ejecutarse tarde
    // (p.ej. el primer check-in del lunes siguiente), y sin esto los dias de
    // actividad de la semana pasada no se pagarian nunca ni apareceria su
    // indicador.
    const prevStart = addDays(wkStart, -7);

    // Catalogo a un Map: 15 filas, evita joins y sus sorpresas semanticas.
    const { data: catalogRows } = await admin
      .from('activity_catalog')
      .select('code, block, session_mode');
    const blockOf = new Map<string, string>(
      (catalogRows ?? []).map((c) => [c.code as string, c.block as string]),
    );

    const { data: sessions } = await admin
      .from('activity_sessions')
      .select('local_date, activity_code, status, duration_sec, rating, pre_state, post_state')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: emos } = await admin
      .from('emotional_entries')
      .select('local_date, kind, intensity, primary_emotion, life_area')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: coping } = await admin
      .from('scenario_responses')
      .select('local_date, coping_style')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: scenes } = await admin
      .from('emotion_scene_responses')
      .select('local_date, chose_best, plausible_hits, plausible_total')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: events } = await admin
      .from('event_entries')
      .select('local_date, life_area, impact, intensity, perceived_control, support_received')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: tasks } = await admin
      .from('academic_tasks')
      .select('local_date, status')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    const { data: worries } = await admin
      .from('worry_entries')
      .select('local_date, actionable, status')
      .eq('student_id', uid)
      .gte('local_date', prevStart)
      .lte('local_date', wkEnd);

    // Valencia de las emociones (agradable/desagradable/neutra) desde el catalogo.
    const { data: emoCat } = await admin.from('emotion_catalog').select('code, valence');
    const valenceOf = new Map<string, string>(
      (emoCat ?? []).map((e) => [e.code as string, e.valence as string]),
    );

    const doneSessions = (sessions ?? []).filter((s) => s.status === 'completada');
    const abandoned = (sessions ?? []).filter((s) => s.status === 'abandonada');
    const activityDays = [...new Set(doneSessions.map((s) => s.local_date as string))].sort();

    // 4. Puntos: 10 por check-in, idempotente (unique student,reason,source).
    //    Reejecutar no duplica: ON CONFLICT DO NOTHING.
    if (rows.length > 0) {
      const ledger = rows.map((c) => ({
        student_id: uid,
        amount: POINTS_PER_CHECKIN,
        reason: 'checkin_diario',
        source_table: 'checkins',
        source_id: c.id,
        source_key: `checkins:${c.id}`,
        rule_version: CALC_VERSION,
      }));
      await admin
        .from('points_ledger')
        .upsert(ledger, {
          onConflict: 'student_id,reason,source_table,source_id',
          ignoreDuplicates: true,
        });
    }

    // 4b. Puntos por DIA con actividad completada. Para "el dia X" no hay uuid
    //     natural, y source_id=null no deduplica (en SQL dos NULL nunca son
    //     iguales), asi que la clave es source_key='dia:<fecha>'.
    if (activityDays.length > 0) {
      const actLedger = activityDays.map((d) => ({
        student_id: uid,
        amount: POINTS_PER_ACTIVITY_DAY,
        reason: 'actividad_completada',
        source_table: 'activity_sessions',
        source_key: `dia:${d}`,
        rule_version: CALC_VERSION,
      }));
      await admin
        .from('points_ledger')
        .upsert(actLedger, {
          onConflict: 'student_id,reason,source_key',
          ignoreDuplicates: true,
        });
    }
    // El estado se RECONSTRUYE del ledger (sum), no se acumula a ciegas.
    const { data: ledgerRows } = await admin
      .from('points_ledger')
      .select('amount')
      .eq('student_id', uid);
    const points = (ledgerRows ?? []).reduce((s, r) => s + (r.amount as number), 0);

    // 5. Rachas a partir de las fechas locales.
    const { current, longest, last } = computeStreaks(rows.map((c) => c.local_date as string));

    // 6. Indicadores de la semana actual (lunes a domingo).
    //
    //    Tres objetos con destinos distintos:
    //      ind     -> columnas tipadas de wellness_indicators. VISIBLES al tutor.
    //      details -> jsonb. INVISIBLE al tutor por construccion: no tiene policy
    //                 sobre la tabla y el RPC devuelve una lista fija de columnas.
    //      derived -> solo para el ambito de las plantillas de reporte, asi se
    //                 pueden anadir indicadores a los reportes SIN migracion.
    // Se recalculan DOS semanas: si recompute corre tarde (el primer check-in del
    // lunes siguiente), la semana pasada tambien queda al dia.
    let ind: Record<string, number> | null = null; // la de la semana en curso, para el reporte
    let derived: Record<string, number> = {};

    for (const start of [prevStart, wkStart]) {
      const end = addDays(start, 6);
      const enRango = <T extends { local_date: string }>(arr: T[]) =>
        arr.filter((x) => x.local_date >= start && x.local_date <= end);

      const inWeek = enRango(rows as { local_date: string }[]) as typeof rows;
      const wkDone = enRango(doneSessions as { local_date: string }[]) as typeof doneSessions;
      const wkAband = enRango(abandoned as { local_date: string }[]) as typeof abandoned;
      const emoRows = enRango((emos ?? []) as { local_date: string }[]) as NonNullable<typeof emos>;

      if (inWeek.length === 0 && wkDone.length === 0 && wkAband.length === 0 && emoRows.length === 0) {
        continue;
      }

      const avg = (k: string) =>
        inWeek.length ? round2(inWeek.reduce((s, c) => s + (c[k] as number), 0) / inWeek.length) : null;

      const wkDays = [...new Set(wkDone.map((s) => s.local_date as string))];
      const rated = wkDone.filter((s) => s.rating != null);
      const cerradas = wkDone.length + wkAband.length;
      const daysByBlock = (b: string) =>
        [...new Set(wkDone
          .filter((s) => blockOf.get(s.activity_code as string) === b)
          .map((s) => s.local_date as string))].length;

      const wkInd = {
        mood_avg: avg('mood'),
        stress_avg: avg('stress'),
        sleep_avg: avg('sleep'),
        energy_avg: avg('energy'),
        academic_load_avg: avg('academic_load'),
        social_perception_avg: avg('social_perception'),
        checkin_count: inWeek.length,
        adherence_pct: round2((inWeek.length / 7) * 100),

        activity_days: wkDays.length,
        activity_adherence_pct: round2((wkDays.length / 7) * 100),
        activity_completion_pct: cerradas ? round2((wkDone.length / cerradas) * 100) : null,
        activity_rating_avg: rated.length
          ? round2(rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length)
          : null,
        emo_entries_count: emoRows.length,
        emo_intensity_avg: emoRows.length
          ? round2(emoRows.reduce((s, e) => s + (e.intensity as number), 0) / emoRows.length)
          : null,

        block_regulacion_days: daysByBlock('regulacion'),
        block_conciencia_days: daysByBlock('conciencia'),
        block_afrontamiento_days: daysByBlock('afrontamiento'),
        block_reflexion_days: daysByBlock('reflexion'),
        block_organizacion_days: daysByBlock('organizacion'),
      } as Record<string, number>;

      const details = buildDetails({
        doneSessions: wkDone,
        abandoned: wkAband,
        blockOf,
        emos: emoRows,
        valenceOf,
        coping: enRango((coping ?? []) as { local_date: string }[]),
        scenes: enRango((scenes ?? []) as { local_date: string }[]),
        events: enRango((events ?? []) as { local_date: string }[]),
        tasks: enRango((tasks ?? []) as { local_date: string }[]),
        worries: enRango((worries ?? []) as { local_date: string }[]),
      });

      // Valores planos para las plantillas (no son columnas).
      const wkDerived = {
        tareas_pct: (details.tareas as Record<string, number>)?.pct ?? 0,
        pre_post_delta: (details.pre_post as Record<string, number>)?.delta_avg ?? 0,
        abandono_pct: cerradas ? round2((wkAband.length / cerradas) * 100) : 0,
        actividades_total: wkDone.length,
      };

      await admin.from('wellness_indicators').upsert(
        {
          student_id: uid,
          period_kind: 'semanal',
          period_start: start,
          period_end: end,
          ...wkInd,
          details,
          calc_version: CALC_VERSION,
        },
        { onConflict: 'student_id,period_kind,period_start' },
      );

      if (start === wkStart) {
        ind = wkInd;
        derived = wkDerived;
      }
    }

    // 6b. Reporte semanal desde la plantilla activa. El texto NO se inventa aqui:
    //     sale de segmentos aprobados, y cada frase guarda de que indicador salio
    //     (criterio de explicabilidad). Nunca incluye texto escrito por el estudiante.
    if (ind) {
      const { data: tpl } = await admin
        .from('report_templates')
        .select('code, version, segments')
        .eq('is_active', true)
        .eq('locale', 'es-PE')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tpl) {
        // Las plantillas ven ind + derived: se pueden anadir indicadores a los
        // reportes sin migracion, porque derived no necesita columna.
        const content = buildReport(tpl.segments as TemplateSegment[], { ...ind, ...derived });
        await admin.from('reports').upsert(
          {
            student_id: uid,
            period_start: wkStart,
            period_end: wkEnd,
            template_code: tpl.code,
            template_version: tpl.version,
            calc_version: CALC_VERSION,
            content,
          },
          { onConflict: 'student_id,period_start' },
        );
      }
    }

    // 7. Estado de gamificacion.
    //    last_activity_date = lo mas reciente entre check-in y actividad: ahora
    //    las actividades tambien dan puntos, asi que mirar solo el check-in
    //    mostraria una fecha vieja a quien solo hace actividades.
    const lastActivity = activityDays.length ? activityDays[activityDays.length - 1] : null;
    const lastAny = [last, lastActivity].filter(Boolean).sort().pop() ?? null;

    await admin.from('gamification_state').upsert(
      {
        student_id: uid,
        points,
        current_streak: current,
        longest_streak: longest,
        last_activity_date: lastAny,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id' },
    );

    // 9. Motor de alertas: evalua las reglas activas contra los check-ins.
    //    Las alertas son SOLICITUDES DE REVISION, no conclusiones. Nunca se
    //    escribe texto del estudiante en evidence (un trigger con allowlist lo
    //    impide en la base, ademas de esta regla de codigo).
    const nuevasAlertas = await evaluarAlertas(admin, uid, rows, today);

    return json({
      points,
      current_streak: current,
      longest_streak: longest,
      alertas_nuevas: nuevasAlertas,
      actividad_dias: activityDays.length,
      calc_version: CALC_VERSION,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// --- details: agregados que el TUTOR NO VE ---
//
// Van al jsonb `details` de wellness_indicators. La frontera es estructural: el
// tutor no tiene policy sobre esa tabla y el RPC tutor_student_summary devuelve
// una lista fija de columnas, asi que nada de aqui puede llegarle salvo que
// alguien lo anada a mano a esa lista.
//
// Por que cada uno queda fuera:
//  - coping_dist:      es un perfil de afrontamiento (scenario_responses ya no
//                      tiene policy de tutor; exponer su agregado lo contradiria)
//  - emo_valence_dist: "6 de 10 registros desagradables" empieza a ser contenido
//  - life_area_dist:   dice DONDE esta el problema (familiar, economico)
//  - tareas/preocupaciones/pre_post/detective/evento: derivan de tablas privadas
//
function buildDetails(d: {
  doneSessions: any[];
  abandoned: any[];
  blockOf: Map<string, string>;
  emos: any[];
  valenceOf: Map<string, string>;
  coping: any[];
  scenes: any[];
  events: any[];
  tasks: any[];
  worries: any[];
}): Record<string, unknown> {
  const countBy = <T,>(arr: T[], key: (x: T) => string | null | undefined) => {
    const out: Record<string, number> = {};
    for (const x of arr) {
      const k = key(x);
      if (k) out[k] = (out[k] ?? 0) + 1;
    }
    return out;
  };

  // Uso por bloque: dias, sesiones, valoracion y abandonos.
  const porBloque: Record<string, Record<string, number>> = {};
  for (const b of ['regulacion', 'conciencia', 'afrontamiento', 'reflexion', 'organizacion']) {
    const done = d.doneSessions.filter((s) => d.blockOf.get(s.activity_code) === b);
    const aband = d.abandoned.filter((s) => d.blockOf.get(s.activity_code) === b);
    if (done.length === 0 && aband.length === 0) continue;
    const rated = done.filter((s) => s.rating != null);
    porBloque[b] = {
      dias: [...new Set(done.map((s) => s.local_date))].length,
      sesiones: done.length,
      abandonadas: aband.length,
      ...(rated.length
        ? { rating_avg: round2(rated.reduce((s, r) => s + r.rating, 0) / rated.length) }
        : {}),
    };
  }

  // pre/post: el indicador que convierte "uso la actividad" en "le funciono".
  const conPrePost = d.doneSessions.filter((s) => s.pre_state != null && s.post_state != null);
  const prePost = conPrePost.length
    ? {
        n: conPrePost.length,
        delta_avg: round2(
          conPrePost.reduce((s, x) => s + (x.post_state - x.pre_state), 0) / conPrePost.length,
        ),
      }
    : { n: 0, delta_avg: 0 };

  const tareasHechas = d.tasks.filter((t) => t.status === 'hecha').length;
  const worriesResueltas = d.worries.filter((w) => w.status === 'resuelta').length;
  const scenesConDatos = d.scenes.filter((s) => s.plausible_total > 0);

  return {
    por_bloque: porBloque,
    coping_dist: countBy(d.coping, (c) => c.coping_style),
    emo_valence_dist: countBy(d.emos, (e) =>
      e.primary_emotion ? (d.valenceOf.get(e.primary_emotion) ?? null) : null,
    ),
    life_area_dist: {
      ...countBy(d.emos, (e) => e.life_area),
      ...countBy(d.events, (e) => e.life_area),
    },
    tareas: {
      creadas: d.tasks.length,
      hechas: tareasHechas,
      pct: d.tasks.length ? round2((tareasHechas / d.tasks.length) * 100) : 0,
    },
    preocupaciones: {
      creadas: d.worries.length,
      resueltas: worriesResueltas,
      accionables: d.worries.filter((w) => w.actionable).length,
    },
    pre_post: prePost,
    // Nota: los denominadores difieren a proposito. aciertos_pct solo tiene
    // sentido en escenas con emociones plausibles definidas; mejor_respuesta_pct
    // aplica a toda escena respondida.
    detective: scenesConDatos.length
      ? {
          n: scenesConDatos.length,
          aciertos_pct: round2(
            (scenesConDatos.reduce((s, x) => s + x.plausible_hits / x.plausible_total, 0) /
              scenesConDatos.length) * 100,
          ),
          mejor_respuesta_pct: round2(
            (d.scenes.filter((s) => s.chose_best).length / Math.max(d.scenes.length, 1)) * 100,
          ),
        }
      : { n: 0 },
    evento: d.events.length
      ? {
          n: d.events.length,
          intensidad_avg: round2(d.events.reduce((s, e) => s + e.intensity, 0) / d.events.length),
          control_avg: round2(
            d.events.reduce((s, e) => s + e.perceived_control, 0) / d.events.length,
          ),
          apoyo_avg: round2(
            d.events.reduce((s, e) => s + e.support_received, 0) / d.events.length,
          ),
        }
      : { n: 0 },
  };
}

// --- motor de alertas ---

type CheckinRow = Record<string, string | number>;

// deno-lint-ignore no-explicit-any
async function evaluarAlertas(
  admin: any,
  uid: string,
  rows: CheckinRow[],
  today: string,
): Promise<number> {
  const { data: rules } = await admin
    .from('alert_rules')
    .select('id, code, version, level, definition')
    .eq('is_active', true);
  if (!rules || rules.length === 0) return 0;

  // Deduplicacion: si ya hay una alerta ABIERTA o EN REVISION de esta misma
  // regla, no se crea otra. Sin esto, cada check-in generaria una alerta nueva y
  // el panel del tutor se volveria ruido -- y el ruido hace que se ignoren las
  // alertas que si importan.
  const { data: abiertas } = await admin
    .from('alerts')
    .select('rule_code')
    .eq('student_id', uid)
    .in('status', ['abierta', 'en_revision']);
  const yaAbiertas = new Set((abiertas ?? []).map((a: { rule_code: string }) => a.rule_code));

  let creadas = 0;
  for (const rule of rules) {
    if (yaAbiertas.has(rule.code)) continue;
    const res = evaluarRegla(rule.definition, rows, today);
    if (!res.triggered) continue;

    const { error } = await admin.from('alerts').insert({
      student_id: uid,
      rule_id: rule.id,
      rule_code: rule.code,       // snapshot: la alerta sigue explicandose
      rule_version: rule.version, // aunque la regla evolucione despues
      level: rule.level,
      evidence: res.evidence,
      window_start: res.windowStart,
      window_end: res.windowEnd,
    });
    if (error) {
      // 23505 = ya existe una alerta abierta de esta regla (indice unico parcial,
      // defensa contra llamadas concurrentes). No es un fallo real.
      if (error.code !== '23505') console.error('alerta no insertada', rule.code, error);
    } else {
      creadas++;
    }
    // Evita duplicar dentro de la MISMA ejecucion si dos reglas comparten code.
    yaAbiertas.add(rule.code);
  }
  return creadas;
}

function evaluarRegla(
  def: Record<string, unknown>,
  rows: CheckinRow[],
  today: string,
): {
  triggered: boolean;
  evidence?: Record<string, unknown>;
  windowStart?: string;
  windowEnd?: string;
} {
  const dias = (def.ventana_dias as number) ?? 7;
  const esDelta = def.tipo === 'delta';
  const minCheckins = (def.min_checkins as number) ?? (esDelta ? 3 : 1);

  const windowEnd = today;
  const windowStart = addDays(today, -(dias - 1));
  const inWindow = rows.filter((r) => r.local_date >= windowStart && r.local_date <= windowEnd);
  if (inWindow.length < minCheckins) return { triggered: false };

  const field = def.indicador as string;      // p.ej. 'stress_avg'
  const col = field.replace(/_avg$/, '');     // columna cruda: 'stress'
  const avg = round2(inWindow.reduce((s, r) => s + (r[col] as number), 0) / inWindow.length);

  const evidence: Record<string, unknown> = {
    window_start: windowStart,
    window_end: windowEnd,
    checkin_count: inWindow.length,
    threshold: def.umbral,
    calc_version: CALC_VERSION,
  };
  evidence[field] = avg;

  let value = avg;
  if (esDelta) {
    // Compara la ventana actual contra la inmediatamente anterior.
    const prevEnd = addDays(windowStart, -1);
    const prevStart = addDays(prevEnd, -(dias - 1));
    const prev = rows.filter((r) => r.local_date >= prevStart && r.local_date <= prevEnd);
    if (prev.length < minCheckins) return { triggered: false };
    const prevAvg = round2(prev.reduce((s, r) => s + (r[col] as number), 0) / prev.length);
    value = round2(avg - prevAvg);
    evidence.delta = value;
  }

  return compare(value, def.operador as string, def.umbral as number)
    ? { triggered: true, evidence, windowStart, windowEnd }
    : { triggered: false };
}

function compare(v: number, op: string, n: number): boolean {
  if (op === '<=') return v <= n;
  if (op === '>=') return v >= n;
  if (op === '<') return v < n;
  if (op === '>') return v > n;
  if (op === '==') return v === n;
  return false;
}

// --- reporte ---

type TemplateSegment = {
  id: string;
  condicion: string;
  texto: string;
  indicador_origen: string | null;
};

type ReportSegment = {
  segment_id: string;
  text: string;
  source_indicator: string | null;
  value: number | null;
};

function buildReport(segments: TemplateSegment[], ind: Record<string, number>): ReportSegment[] {
  const out: ReportSegment[] = [];
  for (const seg of segments ?? []) {
    const { ok, value } = evalCondition(seg.condicion, ind);
    if (!ok) continue;
    out.push({
      segment_id: seg.id,
      text: value == null ? seg.texto : seg.texto.replace('{valor}', String(value)),
      source_indicator: seg.indicador_origen ?? null,
      value,
    });
  }
  return out;
}

// Mini-DSL: 'siempre' o '<indicador><op><numero>'. Se parsea con regex, NUNCA con
// eval(): el contenido de una plantilla es dato, no codigo.
function evalCondition(
  cond: string,
  ind: Record<string, number>,
): { ok: boolean; value: number | null } {
  if (!cond || cond.trim() === 'siempre') return { ok: true, value: null };
  const m = /^([a-z_]+)\s*(<=|>=|==|<|>)\s*(-?\d+(?:\.\d+)?)$/.exec(cond.trim());
  if (!m) return { ok: false, value: null };
  const [, field, op, numStr] = m;
  const v = ind[field];
  if (v == null) return { ok: false, value: null };
  const n = parseFloat(numStr);
  let ok = false;
  if (op === '<=') ok = v <= n;
  else if (op === '>=') ok = v >= n;
  else if (op === '<') ok = v < n;
  else if (op === '>') ok = v > n;
  else if (op === '==') ok = v === n;
  return { ok, value: ok ? v : null };
}

// --- helpers ---

function computeStreaks(dates: string[]): {
  current: number;
  longest: number;
  last: string | null;
} {
  const uniq = [...new Set(dates)].sort();
  if (uniq.length === 0) return { current: 0, longest: 0, last: null };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniq.length; i++) {
    run = dayDiff(uniq[i - 1], uniq[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  let current = 1;
  for (let i = uniq.length - 1; i > 0; i--) {
    if (dayDiff(uniq[i - 1], uniq[i]) === 1) current++;
    else break;
  }
  return { current, longest, last: uniq[uniq.length - 1] };
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00Z').getTime();
  const db = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((db - da) / 86400000);
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay(); // 0=domingo .. 6=sabado
  const diff = day === 0 ? -6 : 1 - day; // mover a lunes
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cors(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'Content-Type': 'application/json' },
  });
}
