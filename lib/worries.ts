import { supabase } from './supabase';
import { todayStr } from './checkins';

export type Worry = {
  id: string;
  body: string;
  actionable: boolean;
  first_step: string | null;
  target_date: string | null;
  status: 'abierta' | 'resuelta' | 'archivada';
  created_at: string;
};

export async function getOpenWorries(userId: string): Promise<Worry[]> {
  const { data } = await supabase
    .from('worry_entries')
    .select('id, body, actionable, first_step, target_date, status, created_at')
    .eq('student_id', userId)
    .eq('status', 'abierta')
    .order('created_at', { ascending: false });
  return (data as Worry[]) ?? [];
}

export async function createWorry(
  userId: string,
  body: string,
  actionable: boolean,
  firstStep: string | null,
  targetDate: string | null,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('worry_entries').insert({
    student_id: userId,
    body: body.trim(),
    actionable,
    first_step: firstStep?.trim() || null,
    target_date: targetDate,
    local_date: todayStr(),
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
