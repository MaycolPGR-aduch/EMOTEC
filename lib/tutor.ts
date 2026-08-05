import { supabase } from './supabase';
import type { AlertLevel } from './alerts';

// Todo lo que el tutor ve pasa por estos RPC (definidos en la migracion 0015).
// Cada uno reverifica is_tutor_of() y registra el acceso; devuelven SOLO
// indicadores y resumenes -- nunca checkins crudos ni el texto del estudiante.

export type DashboardRow = {
  student_id: string;
  full_name: string | null;
  open_alerts: number;
  max_level: AlertLevel | null;
  last_checkin: string | null;
};

// Espeja EXACTAMENTE lo que devuelve el RPC tutor_student_summary (0033). Si
// aqui aparece un campo que el RPC no devuelve, es que alguien amplio la
// frontera de privacidad: revisar la migracion antes de anadirlo.
export type TutorSummary = {
  period_kind: string;
  period_start: string;
  period_end: string;
  mood_avg: number | null;
  stress_avg: number | null;
  sleep_avg: number | null;
  energy_avg: number | null;
  academic_load_avg: number | null;
  social_perception_avg: number | null;
  checkin_count: number;
  adherence_pct: number | null;
  activity_days: number;
  activity_adherence_pct: number | null;
  activity_completion_pct: number | null;
  activity_rating_avg: number | null;
  emo_entries_count: number;
  emo_intensity_avg: number | null;
  block_regulacion_days: number;
  block_conciencia_days: number;
  block_afrontamiento_days: number;
  block_reflexion_days: number;
  block_organizacion_days: number;
  calc_version: string;
};

export type TutorAlert = {
  id: string;
  rule_code: string;
  rule_version: number;
  level: AlertLevel;
  status: string;
  evidence: Record<string, unknown>;
  window_start: string;
  window_end: string;
  triggered_at: string;
};

export async function getTutorDashboard(): Promise<DashboardRow[]> {
  const { data } = await supabase.rpc('tutor_dashboard');
  return (data as DashboardRow[]) ?? [];
}

export async function getStudentSummary(studentId: string): Promise<TutorSummary[]> {
  const { data } = await supabase.rpc('tutor_student_summary', { p_student_id: studentId });
  return (data as TutorSummary[]) ?? [];
}

export async function getStudentAlerts(studentId: string): Promise<TutorAlert[]> {
  const { data } = await supabase.rpc('tutor_student_alerts', { p_student_id: studentId });
  return (data as TutorAlert[]) ?? [];
}

// Cambiar el estado de una alerta. El grant por columna limita al tutor a
// status/acknowledged_*/closed_*; no puede tocar level ni evidence.
export async function updateAlertStatus(
  alertId: string,
  status: 'en_revision' | 'cerrada' | 'descartada',
  tutorId: string,
): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { status };
  if (status === 'en_revision') {
    patch.acknowledged_at = new Date().toISOString();
    patch.acknowledged_by = tutorId;
  } else {
    patch.closed_at = new Date().toISOString();
  }
  const { error } = await supabase.from('alerts').update(patch).eq('id', alertId);
  return { error: error?.message ?? null };
}

export type SharedFollowup = {
  id: string;
  kind: string;
  notes: string | null;
  occurred_at: string;
};

// Lo lee el ESTUDIANTE (policy "estudiante ve seguimientos compartidos", 0011):
// solo los que el tutor marco como visible_to_student. Hasta ahora nadie leia
// esta tabla, asi que un tutor podia compartir una nota y el estudiante no la
// veia jamas.
export async function getSharedFollowups(userId: string): Promise<SharedFollowup[]> {
  const { data } = await supabase
    .from('followups')
    .select('id, kind, notes, occurred_at')
    .eq('student_id', userId)
    .eq('visible_to_student', true)
    .order('occurred_at', { ascending: false })
    .limit(5);
  return (data as SharedFollowup[]) ?? [];
}

// Registrar una accion de seguimiento sobre el estudiante.
export async function addFollowup(
  studentId: string,
  tutorId: string,
  kind: 'contacto' | 'derivacion' | 'nota' | 'cierre',
  notes: string,
  visibleToStudent: boolean,
  alertId: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('followups').insert({
    student_id: studentId,
    tutor_id: tutorId,
    alert_id: alertId,
    kind,
    notes: notes.trim() || null,
    visible_to_student: visibleToStudent,
  });
  return { error: error?.message ?? null };
}
