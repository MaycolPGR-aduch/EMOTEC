import { supabase } from './supabase';

export type Worry = {
  id: string;
  body: string;
  actionable: boolean;
  first_step: string | null;
  target_date: string | null;
  status: 'abierta' | 'resuelta' | 'archivada';
  created_at: string;
  resolved_at?: string | null;
};

const COLS = 'id, body, actionable, first_step, target_date, status, created_at';

export async function getOpenWorries(userId: string): Promise<Worry[]> {
  const { data } = await supabase
    .from('worry_entries')
    .select(COLS)
    .eq('student_id', userId)
    .eq('status', 'abierta')
    .order('created_at', { ascending: false });
  return (data as Worry[]) ?? [];
}

// Las resueltas se escribian y no las leia nadie. Cierra el bucle de la
// actividad: "de 8 preocupaciones, resolviste 3" es el punto de la caja.
export async function getResolvedWorries(userId: string, limit = 10): Promise<Worry[]> {
  const { data } = await supabase
    .from('worry_entries')
    .select(`${COLS}, resolved_at`)
    .eq('student_id', userId)
    .eq('status', 'resuelta')
    .order('resolved_at', { ascending: false })
    .limit(limit);
  return (data as Worry[]) ?? [];
}

export async function createWorry(
  userId: string,
  body: string,
  actionable: boolean,
  firstStep: string | null,
  targetDate: string | null,
  sessionId: string | null = null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('worry_entries').insert({
    student_id: userId,
    body: body.trim(),
    actionable,
    first_step: firstStep?.trim() || null,
    target_date: targetDate,
    session_id: sessionId,
  });
  return { error: error?.message ?? null };
}

export async function resolveWorry(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('worry_entries')
    .update({ status: 'resuelta', resolved_at: new Date().toISOString() })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteWorry(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('worry_entries').delete().eq('id', id);
  return { error: error?.message ?? null };
}
