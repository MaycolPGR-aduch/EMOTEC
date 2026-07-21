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
    if (inWeek.length > 0) {
      const avg = (k: string) =>
        round2(inWeek.reduce((s, c) => s + (c[k] as number), 0) / inWeek.length);
      await admin.from('wellness_indicators').upsert(
        {
          student_id: uid,
          period_kind: 'semanal',
          period_start: wkStart,
          period_end: wkEnd,
          mood_avg: avg('mood'),
          stress_avg: avg('stress'),
          sleep_avg: avg('sleep'),
          energy_avg: avg('energy'),
          academic_load_avg: avg('academic_load'),
          social_perception_avg: avg('social_perception'),
          checkin_count: inWeek.length,
          adherence_pct: round2((inWeek.length / 7) * 100),
          calc_version: CALC_VERSION,
        },
        { onConflict: 'student_id,period_kind,period_start' },
      );
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

    return json({ points, current_streak: current, longest_streak: longest });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

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
