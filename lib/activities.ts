import { supabase } from './supabase';
import { todayStr } from './checkins';

// Rueda de emociones: emociones primarias y sus secundarias. primary_emotion se
// guarda como texto de esta lista cerrada (no texto libre), asi no hay que
// filtrar texto crudo hacia indicadores.
export const PRIMARY_EMOTIONS: { key: string; label: string; secondary: string[] }[] = [
  { key: 'alegria', label: 'Alegria', secondary: ['Entusiasmo', 'Gratitud', 'Orgullo', 'Esperanza'] },
  { key: 'tristeza', label: 'Tristeza', secondary: ['Desanimo', 'Soledad', 'Decepcion', 'Nostalgia'] },
  { key: 'miedo', label: 'Miedo', secondary: ['Ansiedad', 'Inseguridad', 'Preocupacion', 'Nerviosismo'] },
  { key: 'enojo', label: 'Enojo', secondary: ['Frustracion', 'Irritacion', 'Impotencia', 'Fastidio'] },
  { key: 'calma', label: 'Calma', secondary: ['Tranquilidad', 'Alivio', 'Serenidad'] },
  { key: 'sorpresa', label: 'Sorpresa', secondary: ['Asombro', 'Confusion', 'Desconcierto'] },
  { key: 'afecto', label: 'Afecto', secondary: ['Carino', 'Conexion', 'Agradecimiento'] },
  { key: 'verguenza', label: 'Verguenza', secondary: ['Culpa', 'Timidez', 'Retraimiento'] },
];

// Contexto: catalogo cerrado (alimenta indicadores que el tutor SI ve).
export const CONTEXTS: { key: string; label: string }[] = [
  { key: 'academico', label: 'Academico' },
  { key: 'social', label: 'Social' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'salud', label: 'Salud' },
  { key: 'otro', label: 'Otro' },
];

export type BreathingActivity = {
  code: string;
  title: string;
  description: string | null;
  config: {
    inhala_seg: number;
    reten_seg: number;
    exhala_seg: number;
    pausa_seg?: number;
    ciclos: number;
  };
};

// Termometro emocional: intensidad puntual 0-10 (sin etiqueta de emocion).
export async function saveTermometro(
  userId: string,
  intensity: number,
  context: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('emotional_entries').insert({
    student_id: userId,
    kind: 'termometro',
    intensity,
    context_tag: context,
    local_date: todayStr(),
  });
  return { error: error?.message ?? null };
}

// Rueda de emociones: emocion primaria (obligatoria), secundaria (opcional),
// intensidad y contexto.
export async function saveRueda(
  userId: string,
  primary: string,
  secondary: string | null,
  intensity: number,
  context: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('emotional_entries').insert({
    student_id: userId,
    kind: 'rueda',
    intensity,
    primary_emotion: primary,
    secondary_emotion: secondary,
    context_tag: context,
    local_date: todayStr(),
  });
  return { error: error?.message ?? null };
}

export async function getBreathingActivities(): Promise<BreathingActivity[]> {
  const { data } = await supabase
    .from('activity_catalog')
    .select('code, title, description, config')
    .eq('kind', 'respiracion')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data as BreathingActivity[]) ?? [];
}

// Registra una sesion de actividad generica (anclaje, gratitud, etc.) y
// devuelve su id, para poder enlazar datos asociados (p.ej. la gratitud).
export async function logActivitySession(
  userId: string,
  activityCode: string,
  startedAt: Date,
  durationSec: number,
  rating: number | null,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('activity_sessions')
    .insert({
      student_id: userId,
      activity_code: activityCode,
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      local_date: todayStr(),
      duration_sec: durationSec,
      rating,
    })
    .select('id')
    .single();
  return { id: (data?.id as string) ?? null, error: error?.message ?? null };
}

// Tres cosas buenas: texto PRIVADO del estudiante (tabla aparte, el tutor no la
// ve). items: hasta 3 frases breves.
export async function saveGratitude(
  userId: string,
  items: string[],
  sessionId: string | null,
): Promise<{ error: string | null }> {
  const clean = items.map((x) => x.trim()).filter((x) => x.length > 0);
  if (clean.length === 0) return { error: 'Escribe al menos una cosa buena.' };
  const { error } = await supabase.from('gratitude_entries').insert({
    student_id: userId,
    session_id: sessionId,
    items: clean,
    local_date: todayStr(),
  });
  return { error: error?.message ?? null };
}

// Respiracion: registra la sesion (para historial y adherencia) con su valoracion.
export async function saveBreathingSession(
  userId: string,
  activityCode: string,
  startedAt: Date,
  durationSec: number,
  rating: number | null,
): Promise<{ error: string | null }> {
  const now = new Date();
  const { error } = await supabase.from('activity_sessions').insert({
    student_id: userId,
    activity_code: activityCode,
    started_at: startedAt.toISOString(),
    completed_at: now.toISOString(),
    local_date: todayStr(),
    duration_sec: durationSec,
    rating,
  });
  return { error: error?.message ?? null };
}
