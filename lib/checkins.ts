import { supabase } from './supabase';

// Los 6 indicadores del check-in, cada uno en escala 1-5 (coinciden con los CHECK
// de public.checkins). local_date y checkin_at los pone la base; no el cliente.
export type CheckinValues = {
  mood: number;
  stress: number;
  sleep: number;
  energy: number;
  academic_load: number;
  social_perception: number;
};

export type Checkin = CheckinValues & {
  id: string;
  local_date: string; // 'YYYY-MM-DD'
  checkin_at: string;
};

// Fecha local del dispositivo como 'YYYY-MM-DD'. Sirve para saber si el check-in
// mas reciente es de hoy; la fuente de verdad al guardar es el unique de la base.
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

const COLS = 'id, local_date, checkin_at, mood, stress, sleep, energy, academic_load, social_perception';

export async function getLatestCheckin(userId: string): Promise<Checkin | null> {
  const { data } = await supabase
    .from('checkins')
    .select(COLS)
    .eq('student_id', userId) // redundante con RLS, pero mejora el plan de consulta
    .order('local_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Checkin) ?? null;
}

export async function getHistory(userId: string, limit = 30): Promise<Checkin[]> {
  const { data } = await supabase
    .from('checkins')
    .select(COLS)
    .eq('student_id', userId)
    .order('local_date', { ascending: false })
    .limit(limit);
  return (data as Checkin[]) ?? [];
}

// Guarda el check-in y, si hay texto, la nota (en su tabla aparte checkin_notes).
// duplicate=true cuando ya existe un check-in para hoy (unique student_id,local_date).
export async function createCheckin(
  userId: string,
  values: CheckinValues,
  note: string,
): Promise<{ error: string | null; duplicate: boolean }> {
  const { data, error } = await supabase
    .from('checkins')
    .insert({ student_id: userId, ...values })
    .select('id')
    .single();

  if (error) {
    return { error: error.message, duplicate: error.code === '23505' };
  }

  const trimmed = note.trim();
  if (trimmed && data) {
    const { error: noteErr } = await supabase
      .from('checkin_notes')
      .insert({ checkin_id: data.id, student_id: userId, body: trimmed });
    if (noteErr) return { error: noteErr.message, duplicate: false };
  }
  return { error: null, duplicate: false };
}

export async function deleteCheckin(id: string): Promise<{ error: string | null }> {
  // on delete cascade se lleva la nota asociada.
  const { error } = await supabase.from('checkins').delete().eq('id', id);
  return { error: error?.message ?? null };
}
