import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/lib/session';
import {
  getLatestReport,
  getWeeklyIndicators,
  type WeeklyIndicator,
  type WeeklyReport,
} from '@/lib/wellness';
import { getHistory, type Checkin } from '@/lib/checkins';
import { BarRow, WeekBars } from '@/components/charts';
import { AppText, Card, Screen } from '@/components/ui';
import { color, space } from '@/theme';

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

  const current = weeks[0] ?? null;
  const previous = weeks[1] ?? null;

  const days =
    report != null
      ? Array.from({ length: 7 }, (_, i) => {
          const date = addDays(report.period_start, i);
          const c = checkins.find((x) => x.local_date === date);
          return { label: DIAS[i], value: c ? c.mood : null };
        })
      : [];

  return (
    <Screen header={{ title: 'Reporte semanal' }} scroll loading={loading} background="canvas">
      {!report ? (
            <Card>
              <AppText variant="body" color={color.textSecondary} align="center">
                Aun no hay un reporte. Registra un check-in y tu resumen aparecera aqui.
              </AppText>
            </Card>
          ) : (
            <>
              <AppText variant="body" color={color.textMuted} align="center">
                Semana del {fechaCorta(report.period_start)} al {fechaCorta(report.period_end)}
              </AppText>

              {current && (
                <Card>
                  <AppText variant="h3" color={color.textStrong}>
                    Tus promedios (escala 1 a 5)
                  </AppText>
                  <AppText variant="small" color={color.textMuted}>
                    {current.checkin_count} check-in(s) · {Math.round(current.adherence_pct ?? 0)}% de la semana
                  </AppText>
                  <View style={styles.block}>
                    {BARRAS.map((b) => {
                      const v = current[b.key] as number | null;
                      const prev = previous ? (previous[b.key] as number | null) : null;
                      const delta = v != null && prev != null ? v - prev : null;
                      return <BarRow key={b.key} label={b.label} value={v} delta={delta} />;
                    })}
                  </View>
                  {previous && (
                    <AppText variant="caption" color={color.textFaint}>
                      El numero pequeno compara con la semana del {fechaCorta(previous.period_start)}.
                    </AppText>
                  )}
                </Card>
              )}

              {days.length > 0 && (
                <Card>
                  <AppText variant="h3" color={color.textStrong}>
                    Tu animo dia a dia
                  </AppText>
                  <AppText variant="small" color={color.textMuted}>
                    Los dias sin registro aparecen vacios.
                  </AppText>
                  <View style={styles.block}>
                    <WeekBars days={days} />
                  </View>
                </Card>
              )}

              <Card>
                <AppText variant="h3" color={color.textStrong}>
                  Que dice tu semana
                </AppText>
                <View style={styles.segments}>
                  {report.content.map((seg) => (
                    <View key={seg.segment_id} style={styles.segment}>
                      <AppText variant="bodyStrong" color={color.textDefault} weight="regular">
                        {seg.text}
                      </AppText>
                      {seg.source_indicator && (
                        <AppText variant="caption" color={color.textFaint}>
                          basado en {INDICADOR[seg.source_indicator] ?? seg.source_indicator}
                          {seg.value != null ? `: ${seg.value}` : ''}
                        </AppText>
                      )}
                    </View>
                  ))}
                </View>
              </Card>

              <AppText variant="caption" color={color.textFaint} align="center">
                Generado con la plantilla {report.template_code} v{report.template_version}. Cada frase indica el dato que la origino.
              </AppText>
            </>
          )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: space.md + 2 },
  segments: { marginTop: space.md, gap: space.lg },
  segment: { gap: space.xs },
});
