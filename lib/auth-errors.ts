// Traduce los mensajes de error de Supabase Auth (en ingles) a espanol claro.
// Si no reconoce el mensaje, devuelve el original para no ocultar informacion.
export function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contrasena incorrectos.';
  if (m.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesion.';
  if (m.includes('user already registered')) return 'Ese correo ya esta registrado.';
  if (m.includes('password should be at least')) return 'La contrasena debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email address')) return 'El correo no tiene un formato valido.';
  if (m.includes('for security purposes')) return 'Espera unos segundos antes de volver a intentarlo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexion. Revisa tu internet.';
  return msg;
}
