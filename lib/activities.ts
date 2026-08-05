import { supabase } from './supabase';

// Solo lo especifico del dominio. El registro de sesiones vive en
// lib/activity-log.ts y los catalogos (areas, emociones) en lib/catalogs.ts,
// leidos de la base -- antes estaban hardcodeados y DUPLICADOS.
//
// local_date ya no se envia en ningun insert: lo deriva el servidor con la zona
// horaria del perfil (migracion 0031), lo que ademas impide falsificarlo.

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

export type RelaxationConfig = {
  tensa_seg: number;
  suelta_seg: number;
  groups: { label: string }[];
};

// Termometro emocional: intensidad puntual 0-10 (sin etiqueta de emocion).
export async function saveTermometro(
  userId: string,
  intensity: number,
  lifeArea: string | null,
  sessionId: string | null = null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('emotional_entries').insert({
    student_id: userId,
    kind: 'termometro',
    intensity,
    life_area: lifeArea,
    session_id: sessionId,
  });
  return { error: error?.message ?? null };
}

// Rueda de emociones: emocion primaria (obligatoria), secundaria (opcional),
// intensidad y area de vida. Las emociones se guardan por CODE (con FK al
// catalogo), no por etiqueta.
export async function saveRueda(
  userId: string,
  primaryCode: string,
  secondaryCode: string | null,
  intensity: number,
  lifeArea: string | null,
  sessionId: string | null = null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('emotional_entries').insert({
    student_id: userId,
    kind: 'rueda',
    intensity,
    primary_emotion: primaryCode,
    secondary_emotion: secondaryCode,
    life_area: lifeArea,
    session_id: sessionId,
  });
  return { error: error?.message ?? null };
}

// Lee la config de una actividad del catalogo (p.ej. relajacion muscular: los
// grupos y tiempos viven en la base, no en el cliente).
export async function getActivityConfig<T>(code: string): Promise<T | null> {
  const { data } = await supabase
    .from('activity_catalog')
    .select('config')
    .eq('code', code)
    .maybeSingle();
  return (data?.config as T) ?? null;
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

// Tres cosas buenas: texto PRIVADO del estudiante (tabla aparte, el tutor no la ve).
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
  });
  return { error: error?.message ?? null };
}
