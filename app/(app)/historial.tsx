import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';
import { getHistory, type Checkin } from '@/lib/checkins';
import { AppText, Card, ScreenHeader } from '@/components/ui';
import { color, space } from '@/theme';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaBonita(local_date: string): string {
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Tu historial" />
      {items === null ? null : items.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="bodyStrong" color={color.textDefault}>
            Aun no tienes check-ins.
          </AppText>
          <AppText variant="body" color={color.textMuted}>
            Cuando registres uno, aparecera aqui.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card>
              <AppText variant="bodyStrong" color={color.textStrong} style={styles.date}>
                {fechaBonita(item.local_date)}
              </AppText>
              <View style={styles.grid}>
                <Metric label="Animo" value={item.mood} />
                <Metric label="Estres" value={item.stress} />
                <Metric label="Descanso" value={item.sleep} />
                <Metric label="Energia" value={item.energy} />
                <Metric label="Carga" value={item.academic_load} />
                <Metric label="Social" value={item.social_perception} />
              </View>
            </Card>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metric}>
      <AppText variant="h2" color={color.brand}>
        {String(value)}
      </AppText>
      <AppText variant="caption" color={color.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.canvas },
  list: { padding: space.lg, gap: space.md - 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs + 2 },
  date: { marginBottom: space.md - 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  metric: { width: '28%', alignItems: 'center' },
});
