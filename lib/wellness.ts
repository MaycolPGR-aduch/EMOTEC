import { supabase } from './supabase';

export type Gamification = {
  points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

export type WeeklyIndicator = {
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
};

// Cada frase del reporte guarda de que indicador salio: es lo que hace el reporte
// explicable (criterio de E6).
export type ReportSegment = {
  segment_id: string;
  text: string;
  source_indicator: string | null;
  value: number | null;
};

export type WeeklyReport = {
  period_start: string;
  period_end: string;
  template_code: string;
  template_version: number;
  content: ReportSegment[];
  generated_at: string;
};

// Invoca la Edge Function que recalcula indicadores/puntos/racha con service_role.
// El cliente NO escribe esas tablas (por eso no son falsificables); solo dispara
// el recalculo y luego LEE el resultado.
export async function recompute(): Promise<{ error: string | null }> {
  const { error } = await supabase.functions.invoke('recompute');
  return { error: error?.message ?? null };
}

export async function getGamification(userId: string): Promise<Gamification | null> {
  const { data } = await supabase
    .from('gamification_state')
    .select('points, current_streak, longest_streak, last_activity_date')
    .eq('student_id', userId)
    .maybeSingle();
  return (data as Gamification) ?? null;
}

export async function getLatestReport(userId: string): Promise<WeeklyReport | null> {
  const { data } = await supabase
    .from('reports')
    .select('period_start, period_end, template_code, template_version, content, generated_at')
    .eq('student_id', userId)
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as WeeklyReport) ?? null;
}

export async function getLatestWeekly(userId: string): Promise<WeeklyIndicator | null> {
  const { data } = await supabase
    .from('wellness_indicators')
    .select(
      'period_start, period_end, mood_avg, stress_avg, sleep_avg, energy_avg, academic_load_avg, social_perception_avg, checkin_count, adherence_pct',
    )
    .eq('student_id', userId)
    .eq('period_kind', 'semanal')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as WeeklyIndicator) ?? null;
}
