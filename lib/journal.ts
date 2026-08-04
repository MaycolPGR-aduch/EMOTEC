import { supabase } from './supabase';
import { todayStr } from './checkins';
import { logActivitySession } from './activities';

export type JournalDraft = {
  pleasant: string;
  difficult: string;
  helped: string;
};

// Diario breve: texto privado del estudiante (tabla aparte, el tutor no la ve).
// Registra la sesion y luego la entrada, como gratitud.
export async function saveJournal(
  userId: string,
  draft: JournalDraft,
): Promise<{ error: string | null }> {
  const clean = {
    pleasant: draft.pleasant.trim(),
    difficult: draft.difficult.trim(),
    helped: draft.helped.trim(),
  };
  if (!clean.pleasant && !clean.difficult && !clean.helped) {
    return { error: 'Escribe al menos un momento de tu dia.' };
  }
  const { id } = await logActivitySession(userId, 'diario_breve', new Date(), 0, null);
  const { error } = await supabase.from('journal_entries').insert({
    student_id: userId,
    session_id: id,
    pleasant: clean.pleasant || null,
    difficult: clean.difficult || null,
    helped: clean.helped || null,
    local_date: todayStr(),
  });
  return { error: error?.message ?? null };
}
