import { supabase } from './supabase';
import { todayStr } from './checkins';

export type EventArea = 'academica' | 'social' | 'familiar' | 'personal' | 'salud' | 'economia' | 'otra';
export type EventImpact = 'positivo' | 'negativo' | 'mixto';

export type EventDraft = {
  area: EventArea;
  impact: EventImpact;
  intensity: number;
  perceivedControl: number;
  supportReceived: number;
  note: string;
};

// Evento e impacto: estructurado + nota opcional privada. Como el check-in,
// inserta el evento y luego la nota (2 inserts) si hay texto.
export async function saveEvent(
  userId: string,
  draft: EventDraft,
): Promise<{ error: string | null }> {
  const { data, error } = await supabase
    .from('event_entries')
    .insert({
      student_id: userId,
      area: draft.area,
      impact: draft.impact,
      intensity: draft.intensity,
      perceived_control: draft.perceivedControl,
      support_received: draft.supportReceived,
      local_date: todayStr(),
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const note = draft.note.trim();
  if (note && data) {
    const { error: noteErr } = await supabase
      .from('event_notes')
      .insert({ event_id: data.id, student_id: userId, body: note });
    if (noteErr) return { error: noteErr.message };
  }
  return { error: null };
}
