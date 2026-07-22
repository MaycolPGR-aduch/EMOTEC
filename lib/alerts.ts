import { supabase } from './supabase';

export type AlertLevel = 'informativa' | 'preventiva' | 'prioritaria' | 'critica';

export type StudentAlert = {
  id: string;
  level: AlertLevel;
  status: string;
  triggered_at: string;
};

const ORDEN: AlertLevel[] = ['informativa', 'preventiva', 'prioritaria', 'critica'];

// El estudiante lee SUS alertas por la policy "mis alertas - leer". Se usan solo
// para decidir que apoyo ofrecerle; la app NUNCA le muestra la palabra "alerta"
// ni su nivel: eso convertiria el acompanamiento en una etiqueta.
export async function getOpenAlerts(userId: string): Promise<StudentAlert[]> {
  const { data } = await supabase
    .from('alerts')
    .select('id, level, status, triggered_at')
    .eq('student_id', userId)
    .in('status', ['abierta', 'en_revision'])
    .order('triggered_at', { ascending: false });
  return (data as StudentAlert[]) ?? [];
}

export function nivelMasAlto(alerts: StudentAlert[]): AlertLevel | null {
  if (alerts.length === 0) return null;
  return alerts.reduce<AlertLevel>(
    (max, a) => (ORDEN.indexOf(a.level) > ORDEN.indexOf(max) ? a.level : max),
    'informativa',
  );
}

// Mensajes de acompanamiento. Reglas de redaccion:
//  - Nunca "alerta", "riesgo", "nivel" ni nada que suene a diagnostico.
//  - Describir lo observado, no etiquetar a la persona.
//  - Ofrecer siempre una accion concreta y opcional.
export function mensajeApoyo(level: AlertLevel): {
  titulo: string;
  cuerpo: string;
  accion: string;
  destino: '/ayuda' | '/actividades';
} {
  switch (level) {
    case 'critica':
    case 'prioritaria':
      return {
        titulo: 'Parece que han sido dias dificiles',
        cuerpo:
          'No tienes que atravesarlo solo. Hablar con alguien ayuda, y hay lineas gratuitas que atienden las 24 horas.',
        accion: 'Buscar apoyo',
        destino: '/ayuda',
      };
    default:
      return {
        titulo: 'Has tenido una semana cuesta arriba',
        cuerpo:
          'Una pausa breve puede ayudarte a recuperar algo de calma. Tomate un par de minutos si puedes.',
        accion: 'Ver actividades',
        destino: '/actividades',
      };
  }
}
