import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/lib/session';
import {
  getGamification,
  getLatestWeekly,
  type Gamification,
  type WeeklyIndicator,
} from '@/lib/wellness';
import { AppText, Card, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Progreso() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [gam, setGam] = useState<Gamification | null>(null);
  const [week, setWeek] = useState<WeeklyIndicator | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGamification(userId), getLatestWeekly(userId)]).then(([g, w]) => {
      setGam(g);
      setWeek(w);
      setLoading(false);
    });
  }, [userId]);

  return (
    <Screen header={{ title: 'Mi progreso' }} scroll loading={loading} background="canvas">
      <View style={styles.statsRow}>
            <Stat value={gam?.points ?? 0} label="Puntos" />
            <Stat value={gam?.current_streak ?? 0} label="Racha (dias)" />
            <Stat value={gam?.longest_streak ?? 0} label="Mejor racha" />
          </View>

          {week ? (
            <Card>
              <AppText variant="h3" color={color.textStrong}>
                Promedios de esta semana
              </AppText>
              <AppText variant="small" color={color.textMuted}>
                {week.checkin_count} check-in(s) · {Math.round(week.adherence_pct ?? 0)}% de la semana
              </AppText>
              <View style={styles.grid}>
                <Avg label="Animo" v={week.mood_avg} />
                <Avg label="Estres" v={week.stress_avg} />
                <Avg label="Descanso" v={week.sleep_avg} />
                <Avg label="Energia" v={week.energy_avg} />
                <Avg label="Carga" v={week.academic_load_avg} />
                <Avg label="Social" v={week.social_perception_avg} />
              </View>
            </Card>
          ) : (
            <Card>
              <AppText variant="body" color={color.textMuted}>
                Aun no hay promedios de esta semana. Haz un check-in para empezar a ver tu evolucion.
              </AppText>
            </Card>
          )}

          <AppText variant="caption" color={color.textFaint} align="center">
            Estos numeros los calcula el servidor a partir de tus check-ins; no se pueden alterar
            desde la app.
          </AppText>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="hero" color={color.brand}>
        {String(value)}
      </AppText>
      <AppText variant="caption" color={color.textMuted} align="center">
        {label}
      </AppText>
    </Card>
  );
}

function Avg({ label, v }: { label: string; v: number | null }) {
  return (
    <View style={styles.avg}>
      <AppText variant="h1" color={color.brand}>
        {v == null ? '-' : v.toFixed(1)}
      </AppText>
      <AppText variant="caption" color={color.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: space.md - 2 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.lg + 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg - 2, marginTop: space.md + 2 },
  avg: { width: '28%', alignItems: 'center' },
});
