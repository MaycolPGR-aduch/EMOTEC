import { ActivityCard, Screen } from '@/components/ui';
import { ACTIVITIES } from '@/lib/activities-catalog';

export default function Actividades() {
  return (
    <Screen header={{ title: 'Actividades' }} background="canvas" scroll>
      {ACTIVITIES.map((a) => (
        <ActivityCard
          key={String(a.href)}
          href={a.href}
          icon={a.icon}
          title={a.title}
          description={a.desc}
        />
      ))}
    </Screen>
  );
}
