import { supabase } from './supabase';

export type TaskStatus = 'pendiente' | 'hoy' | 'hecha' | 'archivada';
export type AcademicTask = {
  id: string;
  title: string;
  status: TaskStatus;
  created_at: string;
};

// Tareas no hechas (pendientes o elegidas para hoy).
export async function getActiveTasks(userId: string): Promise<AcademicTask[]> {
  const { data } = await supabase
    .from('academic_tasks')
    .select('id, title, status, created_at')
    .eq('student_id', userId)
    .in('status', ['pendiente', 'hoy'])
    .order('created_at', { ascending: false });
  return (data as AcademicTask[]) ?? [];
}

// done_at se escribia y no lo leia nadie, asi que no habia tasa de cumplimiento.
// Esto la hace visible al estudiante (y es el mismo dato que recompute agrega).
export async function getTaskStats(
  userId: string,
  sinceLocalDate: string,
): Promise<{ creadas: number; hechas: number; pct: number }> {
  const { data } = await supabase
    .from('academic_tasks')
    .select('status')
    .eq('student_id', userId)
    .gte('local_date', sinceLocalDate);
  const rows = (data as { status: TaskStatus }[]) ?? [];
  const creadas = rows.length;
  const hechas = rows.filter((r) => r.status === 'hecha').length;
  return { creadas, hechas, pct: creadas ? Math.round((hechas / creadas) * 100) : 0 };
}

export async function createTask(
  userId: string,
  title: string,
  sessionId: string | null = null,
): Promise<{ error: string | null }> {
  const clean = title.trim();
  if (!clean) return { error: 'Escribe una tarea.' };
  const { error } = await supabase.from('academic_tasks').insert({
    student_id: userId,
    title: clean,
    session_id: sessionId,
  });
  return { error: error?.message ?? null };
}

export async function setStatus(id: string, status: TaskStatus): Promise<{ error: string | null }> {
  const patch: Record<string, unknown> = { status };
  if (status === 'hecha') patch.done_at = new Date().toISOString();
  const { error } = await supabase.from('academic_tasks').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('academic_tasks').delete().eq('id', id);
  return { error: error?.message ?? null };
}
