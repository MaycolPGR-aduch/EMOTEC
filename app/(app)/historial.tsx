import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getHistory, type Checkin } from '@/lib/checkins';

const MESES = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

function fechaBonita(local_date: string): string {
  // 'YYYY-MM-DD' -> '21 jul 2026' sin parsear a Date (evita corrimientos de zona).
  const [y, m, d] = local_date.split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]} ${y}`;
}

export default function Historial() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [items, setItems] = useState<Checkin[] | null>(null);

  useEffect(() => {
    getHistory(userId).then(setItems);
  }, [userId]);

  if (items === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu historial</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aun no tienes check-ins.</Text>
          <Text style={styles.emptySub}>Cuando registres uno, aparecera aqui.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.date}>{fechaBonita(item.local_date)}</Text>
              <View style={styles.grid}>
                <Metric label="Animo" value={item.mood} />
                <Metric label="Estres" value={item.stress} />
                <Metric label="Descanso" value={item.sleep} />
                <Metric label="Energia" value={item.energy} />
                <Metric label="Carga" value={item.academic_load} />
                <Metric label="Social" value={item.social_perception} />
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyText: { fontSize: 16, color: '#444', fontWeight: '600' },
  emptySub: { fontSize: 14, color: '#888' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  date: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metric: { width: '28%', alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  metricLabel: { fontSize: 12, color: '#888', marginTop: 2 },
});
