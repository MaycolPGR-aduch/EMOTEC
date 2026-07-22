import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  addFollowup,
  getStudentAlerts,
  getStudentSummary,
  updateAlertStatus,
  type TutorAlert,
  type TutorSummary,
} from '@/lib/tutor';
import type { AlertLevel } from '@/lib/alerts';
import { BarRow } from '@/components/charts';

const NIVEL_COLOR: Record<AlertLevel, string> = {
  informativa: '#7a8a99',
  preventiva: '#c9902a',
  prioritaria: '#d96a2a',
  critica: '#c0392b',
};

const REGLA_LABEL: Record<string, string> = {
  estres_sostenido: 'Estres sostenido',
  sueno_insuficiente: 'Sueno insuficiente',
  animo_bajo_sostenido: 'Animo bajo sostenido',
  caida_brusca_animo: 'Cambio brusco en el animo',
};

export default function EstudianteDetalle() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const tutorId = session!.user.id;
  const [summary, setSummary] = useState<TutorSummary[] | null>(null);
  const [alerts, setAlerts] = useState<TutorAlert[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([getStudentSummary(id), getStudentAlerts(id)]).then(([s, a]) => {
      setSummary(s);
      setAlerts(a);
    });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function cambiarEstado(a: TutorAlert, status: 'en_revision' | 'cerrada') {
    setBusy(true);
    const res = await updateAlertStatus(a.id, status, tutorId);
    setBusy(false);
    if (res.error) Alert.alert('Error', res.error);
    else load();
  }

  function registrarSeguimiento(a: TutorAlert) {
    Alert.alert(
      'Registrar seguimiento',
      'Se guardara una nota de contacto sobre esta alerta y la alerta pasara a revision. ' +
        '(En esta version la nota es breve y no visible para el estudiante.)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Registrar',
          onPress: async () => {
            setBusy(true);
            const r1 = await addFollowup(id, tutorId, 'contacto', 'Revision de la senal', false, a.id);
            const r2 = await updateAlertStatus(a.id, 'en_revision', tutorId);
            setBusy(false);
            if (r1.error || r2.error) Alert.alert('Error', r1.error ?? r2.error ?? '');
            else load();
          },
        },
      ],
    );
  }

  if (summary === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const week = summary[0] ?? null;
  const abiertas = alerts.filter((a) => a.status === 'abierta' || a.status === 'en_revision');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Resumen del estudiante</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Alertas abiertas primero: es lo accionable */}
        <Text style={styles.section}>Senales abiertas ({abiertas.length})</Text>
        {abiertas.length === 0 && <Text style={styles.muted}>Ninguna senal abierta.</Text>}
        {abiertas.map((a) => (
          <View key={a.id} style={styles.alertCard}>
            <View style={styles.alertTop}>
              <View style={[styles.dot, { backgroundColor: NIVEL_COLOR[a.level] }]} />
              <Text style={styles.alertTitle}>{REGLA_LABEL[a.rule_code] ?? a.rule_code}</Text>
              <Text style={styles.alertLevel}>{a.level}</Text>
            </View>
            {/* Evidencia: SOLO indicadores. Nunca texto del estudiante. */}
            <Text style={styles.evidence}>{explicarEvidencia(a)}</Text>
            <Text style={styles.alertMeta}>
              Ventana {a.window_start} a {a.window_end} · regla v{a.rule_version} ·{' '}
              {a.status === 'en_revision' ? 'en revision' : 'abierta'}
            </Text>
            <View style={styles.alertActions}>
              {a.status === 'abierta' && (
                <Pressable style={styles.actionBtn} onPress={() => registrarSeguimiento(a)} disabled={busy}>
                  <Text style={styles.actionText}>Registrar seguimiento</Text>
                </Pressable>
              )}
              <Pressable style={styles.actionAlt} onPress={() => cambiarEstado(a, 'cerrada')} disabled={busy}>
                <Text style={styles.actionAltText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {/* Indicadores de la semana */}
        <Text style={styles.section}>Promedios de la semana</Text>
        {week ? (
          <View style={styles.card}>
            <Text style={styles.cardSub}>
              {week.checkin_count} check-in(s) · {Math.round(week.adherence_pct ?? 0)}% de la semana
            </Text>
            <View style={{ marginTop: 12 }}>
              <BarRow label="Animo" value={week.mood_avg} />
              <BarRow label="Estres" value={week.stress_avg} />
              <BarRow label="Descanso" value={week.sleep_avg} />
              <BarRow label="Energia" value={week.energy_avg} />
              <BarRow label="Carga acad." value={week.academic_load_avg} />
              <BarRow label="Vida social" value={week.social_perception_avg} />
            </View>
          </View>
        ) : (
          <Text style={styles.muted}>Aun no hay indicadores calculados.</Text>
        )}

        <Text style={styles.note}>
          Ves indicadores agregados y la evidencia de cada senal. No tienes acceso a las respuestas
          ni al texto que el estudiante escribe.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// Traduce la evidencia (jsonb de indicadores) a una frase legible, sin exponer
// nada que no sea un numero.
function explicarEvidencia(a: TutorAlert): string {
  const e = a.evidence;
  const partes: string[] = [];
  const nombres: Record<string, string> = {
    stress_avg: 'estres promedio',
    sleep_avg: 'descanso promedio',
    mood_avg: 'animo promedio',
    energy_avg: 'energia promedio',
    academic_load_avg: 'carga promedio',
    social_perception_avg: 'vida social promedio',
  };
  for (const [k, label] of Object.entries(nombres)) {
    if (typeof e[k] === 'number') partes.push(`${label}: ${e[k]}`);
  }
  if (typeof e.checkin_count === 'number') partes.push(`${e.checkin_count} check-ins`);
  if (typeof e.threshold === 'number') partes.push(`umbral: ${e.threshold}`);
  return partes.join(' · ');
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
  title: { fontSize: 18, fontWeight: '700', color: '#208AEF' },
  close: { color: '#888', fontSize: 15 },
  content: { padding: 16, gap: 10 },
  section: { fontSize: 15, fontWeight: '700', color: '#555', marginTop: 10 },
  muted: { fontSize: 14, color: '#999' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#eef1f4' },
  cardSub: { fontSize: 13, color: '#888' },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0e6d8',
    gap: 6,
  },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  alertTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#222' },
  alertLevel: { fontSize: 12, color: '#999' },
  evidence: { fontSize: 14, color: '#444' },
  alertMeta: { fontSize: 12, color: '#9aa5b1' },
  alertActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { backgroundColor: '#208AEF', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  actionText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actionAlt: { borderWidth: 1, borderColor: '#c9d6e5', borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14 },
  actionAltText: { color: '#5a6b7b', fontSize: 13, fontWeight: '600' },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
});
