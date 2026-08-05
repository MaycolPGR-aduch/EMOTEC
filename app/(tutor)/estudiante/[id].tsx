import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  addFollowup,
  getStudentAlerts,
  getStudentSummary,
  updateAlertStatus,
  type TutorAlert,
  type TutorSummary,
} from '@/lib/tutor';
import { BarRow } from '@/components/charts';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { color, radius, space } from '@/theme';

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

  useFocusEffect(useCallback(() => load(), [load]));

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

  const week = summary?.[0] ?? null;
  const abiertas = alerts.filter((a) => a.status === 'abierta' || a.status === 'en_revision');

  return (
    <Screen header={{ title: 'Resumen del estudiante' }} scroll loading={summary === null} background="canvas">
      <AppText variant="bodyStrong" color={color.textSecondary}>
        Senales abiertas ({abiertas.length})
      </AppText>
          {abiertas.length === 0 && (
            <AppText variant="body" color={color.textMuted}>
              Ninguna senal abierta.
            </AppText>
          )}
          {abiertas.map((a) => (
            <Card key={a.id} variant="outlined" style={styles.alertCard}>
              <View style={styles.alertTop}>
                <View style={[styles.dot, { backgroundColor: color.alert[a.level] }]} />
                <AppText variant="bodyStrong" color={color.textStrong} style={styles.flex1}>
                  {REGLA_LABEL[a.rule_code] ?? a.rule_code}
                </AppText>
                <AppText variant="caption" color={color.textMuted}>
                  {a.level}
                </AppText>
              </View>
              <AppText variant="body" color={color.textDefault}>
                {explicarEvidencia(a)}
              </AppText>
              <AppText variant="caption" color={color.textFaint}>
                Ventana {a.window_start} a {a.window_end} · regla v{a.rule_version} ·{' '}
                {a.status === 'en_revision' ? 'en revision' : 'abierta'}
              </AppText>
              <View style={styles.alertActions}>
                {a.status === 'abierta' && (
                  <Button title="Registrar seguimiento" size="md" onPress={() => registrarSeguimiento(a)} disabled={busy} />
                )}
                <Button title="Cerrar" variant="secondary" size="md" onPress={() => cambiarEstado(a, 'cerrada')} disabled={busy} />
              </View>
            </Card>
          ))}

          <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
            Promedios de la semana
          </AppText>
          {week ? (
            <Card>
              <AppText variant="small" color={color.textMuted}>
                {week.checkin_count} check-in(s) · {Math.round(week.adherence_pct ?? 0)}% de la semana
              </AppText>
              <View style={styles.bars}>
                <BarRow label="Animo" value={week.mood_avg} />
                <BarRow label="Estres" value={week.stress_avg} />
                <BarRow label="Descanso" value={week.sleep_avg} />
                <BarRow label="Energia" value={week.energy_avg} />
                <BarRow label="Carga acad." value={week.academic_load_avg} />
                <BarRow label="Vida social" value={week.social_perception_avg} />
              </View>
            </Card>
          ) : (
            <AppText variant="body" color={color.textMuted}>
              Aun no hay indicadores calculados.
            </AppText>
          )}

      {/* Uso de actividades: solo constancia, utilidad y tipo. Nunca cuales
          actividades concretas ni su contenido. */}
      {week && (week.activity_days > 0 || week.emo_entries_count > 0) && (
        <>
          <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
            Uso de actividades
          </AppText>
          <Card>
            <AppText variant="small" color={color.textMuted}>
              {week.activity_days} dia(s) con actividad · {Math.round(week.activity_adherence_pct ?? 0)}% de la semana
              {week.activity_rating_avg != null ? ` · valoracion ${week.activity_rating_avg}/5` : ''}
            </AppText>
            <View style={styles.bars}>
              <BarRow label="Regulacion" value={week.block_regulacion_days} max={7} />
              <BarRow label="Conciencia" value={week.block_conciencia_days} max={7} />
              <BarRow label="Afrontam." value={week.block_afrontamiento_days} max={7} />
              <BarRow label="Reflexion" value={week.block_reflexion_days} max={7} />
              <BarRow label="Organizac." value={week.block_organizacion_days} max={7} />
            </View>
            {week.activity_completion_pct != null && week.activity_completion_pct < 60 && (
              <AppText variant="caption" color={color.textFaint}>
                Completa el {Math.round(week.activity_completion_pct)}% de las que empieza. Si es
                bajo, quiza las actividades le resultan largas.
              </AppText>
            )}
          </Card>
        </>
      )}

      <AppText variant="caption" color={color.textFaint} align="center">
        Ves indicadores agregados y la evidencia de cada senal. No tienes acceso a las respuestas
        ni al texto que el estudiante escribe.
      </AppText>
    </Screen>
  );
}

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
  section: { marginTop: space.sm },
  flex1: { flex: 1 },
  alertCard: { gap: space.xs + 2 },
  alertTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  alertActions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  bars: { marginTop: space.md },
});
