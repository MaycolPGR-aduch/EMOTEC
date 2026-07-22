import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  getLatestReport,
  getWeeklyIndicators,
  type WeeklyIndicator,
  type WeeklyReport,
} from '@/lib/wellness';
import { getHistory, type Checkin } from '@/lib/checkins';
import { BarRow, WeekBars } from '@/components/charts';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function fechaCorta(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MESES[Number(m) - 1]}`;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const INDICADOR: Record<string, string> = {
  mood_avg: 'animo',
  stress_avg: 'estres',
  sleep_avg: 'descanso',
  energy_avg: 'energia',
  academic_load_avg: 'carga academica',
  social_perception_avg: 'vida social',
  checkin_count: 'check-ins',
  adherence_pct: 'adherencia',
};

const BARRAS: { key: keyof WeeklyIndicator; label: string }[] = [
  { key: 'mood_avg', label: 'Animo' },
  { key: 'stress_avg', label: 'Estres' },
  { key: 'sleep_avg', label: 'Descanso' },
  { key: 'energy_avg', label: 'Energia' },
  { key: 'academic_load_avg', label: 'Carga acad.' },
  { key: 'social_perception_avg', label: 'Vida social' },
];

export default function Reporte() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [weeks, setWeeks] = useState<WeeklyIndicator[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLatestReport(userId), getWeeklyIndicators(userId, 2), getHistory(userId, 30)])
      .then(([r, w, c]) => {
        setReport(r);
        setWeeks(w);
        setCheckins(c);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const current = weeks[0] ?? null;
  const previous = weeks[1] ?? null;

  // Ánimo día a día de la semana del reporte (lunes a domingo).
  const days =
    report != null
      ? Array.from({ length: 7 }, (_, i) => {
          const date = addDays(report.period_start, i);
          const c = checkins.find((x) => x.local_date === date);
          return { label: DIAS[i], value: c ? c.mood : null };
        })
      : [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Reporte semanal</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!report ? (
          <View style={styles.card}>
            <Text style={styles.empty}>
              Aun no hay un reporte. Registra un check-in y tu resumen aparecera aqui.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.period}>
              Semana del {fechaCorta(report.period_start)} al {fechaCorta(report.period_end)}
            </Text>

            {/* Resumen numerico */}
            {current && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tus promedios (escala 1 a 5)</Text>
                <Text style={styles.cardSub}>
                  {current.checkin_count} check-in(s) · {Math.round(current.adherence_pct ?? 0)}% de
                  la semana
                </Text>
                <View style={{ marginTop: 14 }}>
                  {BARRAS.map((b) => {
                    const v = current[b.key] as number | null;
                    const prev = previous ? (previous[b.key] as number | null) : null;
                    const delta = v != null && prev != null ? v - prev : null;
                    return <BarRow key={b.key} label={b.label} value={v} delta={delta} />;
                  })}
                </View>
                {previous && (
                  <Text style={styles.legend}>
                    El numero pequeno compara con la semana del {fechaCorta(previous.period_start)}.
                  </Text>
                )}
              </View>
            )}

            {/* Ánimo día a día */}
            {days.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Tu animo dia a dia</Text>
                <Text style={styles.cardSub}>Los dias sin registro aparecen vacios.</Text>
                <View style={{ marginTop: 14 }}>
                  <WeekBars days={days} />
                </View>
              </View>
            )}

            {/* Texto orientativo */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Que dice tu semana</Text>
              <View style={{ marginTop: 12, gap: 16 }}>
                {report.content.map((seg) => (
                  <View key={seg.segment_id} style={styles.segment}>
                    <Text style={styles.text}>{seg.text}</Text>
                    {seg.source_indicator && (
                      <Text style={styles.source}>
                        basado en {INDICADOR[seg.source_indicator] ?? seg.source_indicator}
                        {seg.value != null ? `: ${seg.value}` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            <Text style={styles.note}>
              Generado con la plantilla {report.template_code} v{report.template_version}. Cada
              frase indica el dato que la origino.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: 16, gap: 12 },
  period: { fontSize: 14, color: '#888', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  cardSub: { fontSize: 13, color: '#888', marginTop: 2 },
  legend: { fontSize: 11, color: '#9aa5b1', marginTop: 6 },
  segment: { gap: 4 },
  text: { fontSize: 16, color: '#333', lineHeight: 24 },
  source: { fontSize: 12, color: '#9aa5b1', fontStyle: 'italic' },
  empty: { fontSize: 15, color: '#666', textAlign: 'center' },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', paddingHorizontal: 8 },
});
