import { supabase } from './supabase';

// Registro unificado de uso de actividades. Reemplaza a logActivitySession y
// saveBreathingSession, que hacian el mismo INSERT (y relajacion, que no es
// respiracion, llamaba a la de "respiracion").
//
// Tres modos, declarados en activity_catalog.session_mode:
//   guiada  -> open + close (el abandono es informacion real)
//   evento  -> un solo INSERT completada
//   diaria  -> uno por estudiante/actividad/dia
//
// local_date NO se envia: lo deriva el servidor con la zona del perfil (0031).
// duration_sec: segundos reales o NULL. Nunca 0 (contrato de 0028).

export type SessionStatus = 'completada' | 'abandonada';

function dur(seconds: number | null | undefined): number | null {
  return seconds != null && seconds > 0 ? Math.min(seconds, 7200) : null;
}

// --- Modo guiada ---

export async function openActivitySession(
  userId: string,
  activityCode: string,
  opts: { preState?: number | null } = {},
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({
      student_id: userId,
      activity_code: activityCode,
      started_at: new Date().toISOString(),
      status: 'en_curso',
      pre_state: opts.preState ?? null,
    })
    .select('id')
    .single();
  return { id: (data?.id as string) ?? null, error: error?.message ?? null };
}

export async function closeActivitySession(
  sessionId: string,
  opts: {
    status?: SessionStatus;
    durationSec?: number | null;
    rating?: number | null;
    postState?: number | null;
    stepReached?: number | null;
    stepTotal?: number | null;
  } = {},
): Promise<{ error: string | null }> {
  const status = opts.status ?? 'completada';
  const { error } = await supabase
    .from('activity_sessions')
    .update({
      status,
      // El constraint session_status_coherent exige completed_at solo si completada.
      completed_at: status === 'completada' ? new Date().toISOString() : null,
      duration_sec: dur(opts.durationSec),
      rating: opts.rating ?? null,
      post_state: opts.postState ?? null,
      step_reached: opts.stepReached ?? null,
      step_total: opts.stepTotal ?? null,
    })
    .eq('id', sessionId);
  return { error: error?.message ?? null };
}

// --- Modo evento ---

export async function logActivityEvent(
  userId: string,
  activityCode: string,
  opts: { rating?: number | null; stepReached?: number | null; durationSec?: number | null } = {},
): Promise<{ id: string | null; error: string | null }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({
      student_id: userId,
      activity_code: activityCode,
      started_at: now,
      completed_at: now,
      status: 'completada',
      duration_sec: dur(opts.durationSec),
      rating: opts.rating ?? null,
      step_reached: opts.stepReached ?? null,
    })
    .select('id')
    .single();
  return { id: (data?.id as string) ?? null, error: error?.message ?? null };
}

// --- Modo diaria ---

export async function logDailyActivity(
  userId: string,
  activityCode: string,
): Promise<{ id: string | null; error: string | null }> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({
      student_id: userId,
      activity_code: activityCode,
      started_at: now,
      completed_at: now,
      status: 'completada',
    })
    .select('id')
    .single();
  // 23505 = ya existe la sesion de hoy (indice unico parcial de 0028). No es un
  // error: es el comportamiento esperado del modo diaria.
  if (error && (error as { code?: string }).code === '23505') return { id: null, error: null };
  return { id: (data?.id as string) ?? null, error: error?.message ?? null };
}
