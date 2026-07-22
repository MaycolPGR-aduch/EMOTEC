import { supabase } from './supabase';

export type Role = 'estudiante' | 'tutor' | 'admin';

export type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export type Assignment = {
  id: string;
  student_id: string;
  tutor_id: string;
  assigned_at: string;
};

// El admin ve todos los perfiles por la policy "admin ve todos los perfiles".
export async function listUsers(): Promise<AdminUser[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  return (data as AdminUser[]) ?? [];
}

// El rol NO se cambia con un update directo: la columna no esta expuesta a
// PostgREST a proposito (grant por columna). Se pasa por este RPC, que verifica
// is_admin() y queda auditado.
export async function setRole(userId: string, role: Role): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('admin_set_role', { p_user_id: userId, p_role: role });
  return { error: error?.message ?? null };
}

export async function listActiveAssignments(): Promise<Assignment[]> {
  const { data } = await supabase
    .from('tutor_assignments')
    .select('id, student_id, tutor_id, assigned_at')
    .is('ended_at', null)
    .order('assigned_at', { ascending: false });
  return (data as Assignment[]) ?? [];
}

export async function assignTutor(
  studentId: string,
  tutorId: string,
  adminId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('tutor_assignments').insert({
    student_id: studentId,
    tutor_id: tutorId,
    assigned_by: adminId,
  });
  // El indice unico parcial impide una segunda asignacion activa por estudiante.
  if (error?.code === '23505') {
    return { error: 'Ese estudiante ya tiene un tutor activo. Termina la asignacion actual primero.' };
  }
  return { error: error?.message ?? null };
}

// Terminar una asignacion deja rastro (ended_at), no borra la fila: importa para
// responder "quien podia ver los datos de X en marzo".
export async function endAssignment(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('tutor_assignments')
    .update({ ended_at: new Date().toISOString(), end_reason: 'terminada por admin' })
    .eq('id', id);
  return { error: error?.message ?? null };
}
