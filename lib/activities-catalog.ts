import type { Href } from 'expo-router';
import type { IconName } from '@/components/ui';

// Catalogo de actividades para el hub. Antes vivia inline en actividades.tsx con
// emoji; ahora es dato con icono semantico.
export type ActivityItem = {
  href: Href;
  icon: IconName;
  title: string;
  desc: string;
};

export const ACTIVITIES: ActivityItem[] = [
  { href: '/termometro', icon: 'termometro', title: 'Termometro emocional', desc: 'Registra rapido que tan intenso te sientes ahora.' },
  { href: '/rueda', icon: 'rueda', title: 'Rueda de emociones', desc: 'Pon nombre a lo que sientes y su contexto.' },
  { href: '/respiracion', icon: 'respiracion', title: 'Respiracion guiada', desc: 'Una pausa breve para regularte.' },
  { href: '/anclaje', icon: 'anclaje', title: 'Anclaje 5-4-3-2-1', desc: 'Vuelve al presente usando tus sentidos.' },
  { href: '/gratitud', icon: 'gratitud', title: 'Tres cosas buenas', desc: 'Anota lo bueno de tu dia, por pequeno que sea.' },
  { href: '/situaciones', icon: 'situaciones', title: 'Situaciones', desc: 'Explora como afrontarias situaciones cotidianas.' },
  { href: '/caja', icon: 'caja', title: 'Caja de preocupaciones', desc: 'Ordena lo que te preocupa y encuentra un primer paso.' },
  { href: '/diario', icon: 'diario', title: 'Diario breve', desc: 'Tu dia en tres momentos: lo bueno, lo dificil y lo que ayudo.' },
  { href: '/relajacion', icon: 'relajacion', title: 'Relajacion muscular', desc: 'Tensa y suelta cada grupo muscular, de pies a cabeza.' },
];
