import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  getGamification,
  getLatestWeekly,
  type Gamification,
  type WeeklyIndicator,
} from '@/lib/wellness';

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

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi progreso</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Puntos y racha */}
        <View style={styles.statsRow}>
          <Stat big value={String(gam?.points ?? 0)} label="Puntos" />
          <Stat big value={String(gam?.current_streak ?? 0)} label="Racha (dias)" />
          <Stat big value={String(gam?.longest_streak ?? 0)} label="Mejor racha" />
        </View>

        {/* Promedios de la semana */}
        {week ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Promedios de esta semana</Text>
            <Text style={styles.cardSub}>
              {week.checkin_count} check-in(s) · {Math.round(week.adherence_pct ?? 0)}% de la semana
            </Text>
            <View style={styles.grid}>
              <Avg label="Animo" v={week.mood_avg} />
              <Avg label="Estres" v={week.stress_avg} />
              <Avg label="Descanso" v={week.sleep_avg} />
              <Avg label="Energia" v={week.energy_avg} />
              <Avg label="Carga" v={week.academic_load_avg} />
              <Avg label="Social" v={week.social_perception_avg} />
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardSub}>
              Aun no hay promedios de esta semana. Haz un check-in para empezar a ver tu evolucion.
            </Text>
          </View>
        )}

        <Text style={styles.note}>
          Estos numeros los calcula el servidor a partir de tus check-ins; no se pueden alterar
          desde la app.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string; big?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Avg({ label, v }: { label: string; v: number | null }) {
  return (
    <View style={styles.avg}>
      <Text style={styles.avgValue}>{v == null ? '-' : v.toFixed(1)}</Text>
      <Text style={styles.avgLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  close: { color: '#888', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  statValue: { fontSize: 26, fontWeight: '700', color: '#208AEF' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  avg: { width: '28%', alignItems: 'center' },
  avgValue: { fontSize: 22, fontWeight: '700', color: '#208AEF' },
  avgLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', paddingHorizontal: 8 },
});
