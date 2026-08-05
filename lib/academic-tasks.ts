import { supabase } from './supabase';
import { todayStr } from './checkins';

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

export async function createTask(userId: string, title: string): Promise<{ error: string | null }> {
  const clean = title.trim();
  if (!clean) return { error: 'Escribe una tarea.' };
  const { error } = await supabase.from('academic_tasks').insert({
    student_id: userId,
    title: clean,
    local_date: todayStr(),
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
