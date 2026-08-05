import { supabase } from './supabase';
import { logActivityEvent } from './activity-log';

export type JournalDraft = {
  pleasant: string;
  difficult: string;
  helped: string;
};

// Diario breve: texto privado del estudiante (tabla aparte, el tutor no la ve).
// step_reached = cuantos de los tres momentos rellenó: es senal de profundidad
// de uso sin capturar nada nuevo.
export async function saveJournal(
  userId: string,
  draft: JournalDraft,
  rating: number | null = null,
): Promise<{ error: string | null }> {
  const clean = {
    pleasant: draft.pleasant.trim(),
    difficult: draft.difficult.trim(),
    helped: draft.helped.trim(),
  };
  const filled = [clean.pleasant, clean.difficult, clean.helped].filter(Boolean).length;
  if (filled === 0) return { error: 'Escribe al menos un momento de tu dia.' };

  const { id, error: sessionError } = await logActivityEvent(userId, 'diario_breve', {
    rating,
    stepReached: filled,
  });

  const { error } = await supabase.from('journal_entries').insert({
    student_id: userId,
    session_id: id,
    pleasant: clean.pleasant || null,
    difficult: clean.difficult || null,
    helped: clean.helped || null,
  });

  // La entrada es lo importante: si solo fallo la sesion, se guarda igual pero
  // se informa (antes este error se descartaba en silencio y session_id quedaba
  // null sin que nadie lo supiera).
  if (error) return { error: error.message };
  return { error: sessionError };
}
