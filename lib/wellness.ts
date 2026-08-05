import { supabase } from './supabase';

// Columnas de wellness_indicators que el ESTUDIANTE lee (incluye details, que el
// tutor nunca ve).
const IND_COLS =
  'period_start, period_end, mood_avg, stress_avg, sleep_avg, energy_avg, ' +
  'academic_load_avg, social_perception_avg, checkin_count, adherence_pct, ' +
  'activity_days, activity_adherence_pct, activity_rating_avg, activity_completion_pct, ' +
  'emo_entries_count, emo_intensity_avg, block_regulacion_days, block_conciencia_days, ' +
  'block_afrontamiento_days, block_reflexion_days, block_organizacion_days, details';

export type Gamification = {
  points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
};

// Agregados que solo ve EL ESTUDIANTE (viven en el jsonb `details`; el tutor no
// tiene policy sobre wellness_indicators y su RPC devuelve columnas fijas).
export type IndicatorDetails = {
  por_bloque?: Record<string, { dias: number; sesiones: number; abandonadas: number; rating_avg?: number }>;
  coping_dist?: Record<string, number>;
  emo_valence_dist?: Record<string, number>;
  life_area_dist?: Record<string, number>;
  tareas?: { creadas: number; hechas: number; pct: number };
  preocupaciones?: { creadas: number; resueltas: number; accionables: number };
  pre_post?: { n: number; delta_avg: number };
  detective?: { n: number; aciertos_pct?: number; mejor_respuesta_pct?: number };
  evento?: { n: number; intensidad_avg?: number; control_avg?: number; apoyo_avg?: number };
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
  activity_days: number;
  activity_adherence_pct: number | null;
  activity_rating_avg: number | null;
  activity_completion_pct: number | null;
  emo_entries_count: number;
  emo_intensity_avg: number | null;
  block_regulacion_days: number;
  block_conciencia_days: number;
  block_afrontamiento_days: number;
  block_reflexion_days: number;
  block_organizacion_days: number;
  details: IndicatorDetails | null;
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

// Ultimas N semanas, mas reciente primero. Con 2 basta para comparar esta semana
// contra la anterior.
export async function getWeeklyIndicators(
  userId: string,
  limit = 2,
): Promise<WeeklyIndicator[]> {
  const { data } = await supabase
    .from('wellness_indicators')
    .select(IND_COLS)
    .eq('student_id', userId)
    .eq('period_kind', 'semanal')
    .order('period_start', { ascending: false })
    .limit(limit);
  return (data as unknown as WeeklyIndicator[]) ?? [];
}

export async function getLatestWeekly(userId: string): Promise<WeeklyIndicator | null> {
  const { data } = await supabase
    .from('wellness_indicators')
    .select(IND_COLS)
    .eq('student_id', userId)
    .eq('period_kind', 'semanal')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as WeeklyIndicator) ?? null;
}
