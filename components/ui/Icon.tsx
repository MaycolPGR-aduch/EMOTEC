import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { color as colors } from '@/theme';

// Nombres semanticos -> familia + glifo. Reemplaza los emoji del hub y unifica
// los iconos de la app en un solo lugar (cambiar un icono = una linea aqui).
export type IconName =
  | 'close'
  | 'back'
  | 'chevron'
  | 'check'
  | 'add'
  | 'delete'
  | 'star'
  | 'support'
  // actividades
  | 'termometro'
  | 'rueda'
  | 'respiracion'
  | 'anclaje'
  | 'gratitud'
  | 'situaciones'
  | 'caja'
  | 'evento'
  | 'detective'
  | 'diario'
  | 'descarga'
  | 'relajacion'
  // navegacion / secciones
  | 'checkin'
  | 'historial'
  | 'progreso'
  | 'reporte'
  | 'actividades';

type Entry = { family: 'ion' | 'mci'; glyph: string };

const MAP: Record<IconName, Entry> = {
  close: { family: 'ion', glyph: 'close' },
  back: { family: 'ion', glyph: 'chevron-back' },
  chevron: { family: 'ion', glyph: 'chevron-forward' },
  check: { family: 'ion', glyph: 'checkmark' },
  add: { family: 'ion', glyph: 'add' },
  delete: { family: 'ion', glyph: 'trash-outline' },
  star: { family: 'ion', glyph: 'star' },
  support: { family: 'mci', glyph: 'lifebuoy' },

  termometro: { family: 'mci', glyph: 'thermometer' },
  rueda: { family: 'mci', glyph: 'emoticon-outline' },
  respiracion: { family: 'mci', glyph: 'weather-windy' },
  anclaje: { family: 'mci', glyph: 'leaf' },
  gratitud: { family: 'mci', glyph: 'white-balance-sunny' },
  situaciones: { family: 'mci', glyph: 'compass-outline' },
  caja: { family: 'mci', glyph: 'inbox-outline' },
  evento: { family: 'mci', glyph: 'calendar-star' },
  detective: { family: 'mci', glyph: 'magnify' },
  diario: { family: 'mci', glyph: 'book-open-variant' },
  descarga: { family: 'mci', glyph: 'clipboard-list-outline' },
  relajacion: { family: 'mci', glyph: 'spa-outline' },

  checkin: { family: 'mci', glyph: 'clipboard-check-outline' },
  historial: { family: 'mci', glyph: 'history' },
  progreso: { family: 'mci', glyph: 'chart-line' },
  reporte: { family: 'mci', glyph: 'file-document-outline' },
  actividades: { family: 'mci', glyph: 'view-grid-outline' },
};

type IconProps = { name: IconName; size?: number; color?: string };

export function Icon({ name, size = 24, color = colors.textDefault }: IconProps) {
  const entry = MAP[name];
  if (entry.family === 'ion') {
    return <Ionicons name={entry.glyph as never} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={entry.glyph as never} size={size} color={color} />;
}
