import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getLatestReport, type WeeklyReport } from '@/lib/wellness';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(d: string): string {
  const [y, m, day] = d.split('-');
  return `${Number(day)} ${MESES[Number(m) - 1]}`;
}

// Nombres legibles de los indicadores, para mostrar de donde salio cada frase.
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

export default function Reporte() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLatestReport(userId).then((r) => {
      setReport(r);
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

            <View style={styles.card}>
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
    gap: 16,
  },
  segment: { gap: 4 },
  text: { fontSize: 16, color: '#333', lineHeight: 24 },
  source: { fontSize: 12, color: '#9aa5b1', fontStyle: 'italic' },
  empty: { fontSize: 15, color: '#666', textAlign: 'center' },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', paddingHorizontal: 8 },
});
