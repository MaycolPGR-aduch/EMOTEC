// Edge Function: recompute
// Recalcula indicadores semanales, puntos y racha de UN estudiante (el que llama).
// Corre con service_role -> se salta RLS, por eso verifica a mano: (1) que el
// llamante sea un usuario valido y (2) que tenga consentimiento activo. Escribe
// las tablas derivadas que NINGUN rol de la app puede escribir; asi los puntos y
// la racha no son falsificables desde el cliente.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CALC_VERSION = 'e4-1';
const POINTS_PER_CHECKIN = 10;

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

    // 4. Puntos: 10 por check-in, idempotente (unique student,reason,source).
    //    Reejecutar no duplica: ON CONFLICT DO NOTHING.
    if (rows.length > 0) {
      const ledger = rows.map((c) => ({
        student_id: uid,
        amount: POINTS_PER_CHECKIN,
        reason: 'checkin_diario',
        source_table: 'checkins',
        source_id: c.id,
        rule_version: CALC_VERSION,
      }));
      await admin
        .from('points_ledger')
        .upsert(ledger, {
          onConflict: 'student_id,reason,source_table,source_id',
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
    const today = new Date().toISOString().slice(0, 10);
    const wkStart = weekStart(today);
    const wkEnd = addDays(wkStart, 6);
    const inWeek = rows.filter((c) => c.local_date >= wkStart && c.local_date <= wkEnd);
    let ind: Record<string, number> | null = null;
    if (inWeek.length > 0) {
      const avg = (k: string) =>
        round2(inWeek.reduce((s, c) => s + (c[k] as number), 0) / inWeek.length);
      ind = {
        mood_avg: avg('mood'),
        stress_avg: avg('stress'),
        sleep_avg: avg('sleep'),
        energy_avg: avg('energy'),
        academic_load_avg: avg('academic_load'),
        social_perception_avg: avg('social_perception'),
        checkin_count: inWeek.length,
        adherence_pct: round2((inWeek.length / 7) * 100),
      };
      await admin.from('wellness_indicators').upsert(
        {
          student_id: uid,
          period_kind: 'semanal',
          period_start: wkStart,
          period_end: wkEnd,
          ...ind,
          calc_version: CALC_VERSION,
        },
        { onConflict: 'student_id,period_kind,period_start' },
      );
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
        const content = buildReport(tpl.segments as TemplateSegment[], ind);
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
    await admin.from('gamification_state').upsert(
      {
        student_id: uid,
        points,
        current_streak: current,
        longest_streak: longest,
        last_activity_date: last,
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
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

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
