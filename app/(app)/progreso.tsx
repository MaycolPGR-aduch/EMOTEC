import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/lib/session';
import {
  getGamification,
  getWeeklyIndicators,
  type Gamification,
  type WeeklyIndicator,
} from '@/lib/wellness';
import { BarRow, TrendBars } from '@/components/charts';
import { AppText, Callout, Card, Chip, Screen } from '@/components/ui';
import { color, space } from '@/theme';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function etiquetaSemana(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(day)}/${MESES[Number(m) - 1]}`;
}

// Indicadores que el estudiante puede graficar en el tiempo.
const SERIES: { key: keyof WeeklyIndicator; label: string; max: number }[] = [
  { key: 'mood_avg', label: 'Animo', max: 5 },
  { key: 'stress_avg', label: 'Estres', max: 5 },
  { key: 'sleep_avg', label: 'Descanso', max: 5 },
  { key: 'energy_avg', label: 'Energia', max: 5 },
  { key: 'academic_load_avg', label: 'Carga', max: 5 },
  { key: 'social_perception_avg', label: 'Social', max: 5 },
  { key: 'activity_days', label: 'Dias activos', max: 7 },
];

const BLOQUE_LABEL: Record<string, string> = {
  regulacion: 'Regulacion',
  conciencia: 'Conciencia',
  afrontamiento: 'Afrontamiento',
  reflexion: 'Reflexion',
  organizacion: 'Organizacion',
};

export default function Progreso() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [gam, setGam] = useState<Gamification | null>(null);
  const [weeks, setWeeks] = useState<WeeklyIndicator[]>([]);
  const [serie, setSerie] = useState<keyof WeeklyIndicator>('mood_avg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getGamification(userId), getWeeklyIndicators(userId, 8)])
      .then(([g, w]) => {
        setGam(g);
        setWeeks(w);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  // getWeeklyIndicators viene de mas reciente a mas antigua: se invierte para
  // leer el grafico de izquierda (pasado) a derecha (presente).
  const cronologicas = useMemo(() => [...weeks].reverse(), [weeks]);
  const actual = weeks[0] ?? null;
  const anterior = weeks[1] ?? null;

  const serieCfg = SERIES.find((s) => s.key === serie)!;
  const puntos = cronologicas.map((w) => ({
    label: etiquetaSemana(w.period_start),
    value: (w[serie] as number | null) ?? null,
  }));

  const delta = (k: keyof WeeklyIndicator): number | null => {
    const a = actual?.[k] as number | null | undefined;
    const b = anterior?.[k] as number | null | undefined;
    return a != null && b != null ? Math.round((a - b) * 10) / 10 : null;
  };

  const prePost = actual?.details?.pre_post;
  const porBloque = actual?.details?.por_bloque ?? {};
  const tareas = actual?.details?.tareas;

  return (
    <Screen header={{ title: 'Mi progreso' }} scroll loading={loading} background="canvas">
      {/* Puntos y racha */}
      <View style={styles.statsRow}>
        <Stat value={gam?.points ?? 0} label="Puntos" />
        <Stat value={gam?.current_streak ?? 0} label="Racha (dias)" />
        <Stat value={gam?.longest_streak ?? 0} label="Mejor racha" />
      </View>

      {weeks.length === 0 ? (
        <Card>
          <AppText variant="body" color={color.textMuted} align="center">
            Aun no hay datos suficientes. Haz un check-in o una actividad para empezar a ver tu
            evolucion.
          </AppText>
        </Card>
      ) : (
        <>
          {/* Evolucion en el tiempo */}
          <Card>
            <AppText variant="h3" color={color.textStrong}>
              Tu evolucion
            </AppText>
            <AppText variant="small" color={color.textMuted}>
              Ultimas {cronologicas.length} semana(s). Elige que ver.
            </AppText>
            <View style={styles.chips}>
              {SERIES.map((s) => (
                <Chip
                  key={String(s.key)}
                  label={s.label}
                  size="sm"
                  selected={serie === s.key}
                  onPress={() => setSerie(s.key)}
                />
              ))}
            </View>
            <View style={styles.block}>
              <TrendBars points={puntos} max={serieCfg.max} />
            </View>
          </Card>

          {/* Comparativa con la semana anterior */}
          {anterior && (
            <Card>
              <AppText variant="h3" color={color.textStrong}>
                Esta semana vs la anterior
              </AppText>
              <View style={styles.block}>
                <BarRow label="Animo" value={actual?.mood_avg ?? null} delta={delta('mood_avg')} />
                <BarRow label="Estres" value={actual?.stress_avg ?? null} delta={delta('stress_avg')} />
                <BarRow label="Descanso" value={actual?.sleep_avg ?? null} delta={delta('sleep_avg')} />
                <BarRow label="Energia" value={actual?.energy_avg ?? null} delta={delta('energy_avg')} />
                <BarRow label="Carga acad." value={actual?.academic_load_avg ?? null} delta={delta('academic_load_avg')} />
                <BarRow label="Vida social" value={actual?.social_perception_avg ?? null} delta={delta('social_perception_avg')} />
              </View>
              <AppText variant="caption" color={color.textFaint}>
                El numero pequeno es el cambio respecto a la semana pasada.
              </AppText>
            </Card>
          )}

          {/* Que te esta funcionando: el pre/post de las actividades de regulacion */}
          {prePost && prePost.n > 0 && (
            <Card variant="brandSubtle">
              <AppText variant="h3" color={color.brandInk}>
                Que te esta funcionando
              </AppText>
              {prePost.delta_avg <= -0.5 ? (
                <AppText variant="body" color={color.textDefault}>
                  Tras tus pausas de regulacion terminaste, en promedio,{' '}
                  <AppText variant="bodyStrong" color={color.brandInk}>
                    {Math.abs(prePost.delta_avg)} puntos mas tranquilo
                  </AppText>{' '}
                  que al empezar ({prePost.n} {prePost.n === 1 ? 'sesion' : 'sesiones'}).
                </AppText>
              ) : prePost.delta_avg >= 0.5 ? (
                <AppText variant="body" color={color.textDefault}>
                  Esta semana terminaste las pausas algo mas tenso que al empezar. A veces pasa;
                  probar otra tecnica o hacerlas en otro momento del dia puede ayudar.
                </AppText>
              ) : (
                <AppText variant="body" color={color.textDefault}>
                  Tus pausas te dejaron mas o menos como estabas. Con mas sesiones se vera mejor si
                  te ayudan.
                </AppText>
              )}
            </Card>
          )}

          {/* Uso por bloque */}
          {Object.keys(porBloque).length > 0 && (
            <Card>
              <AppText variant="h3" color={color.textStrong}>
                Tus actividades
              </AppText>
              <AppText variant="small" color={color.textMuted}>
                {actual?.activity_days ?? 0} dia(s) con actividad esta semana
              </AppText>
              <View style={styles.block}>
                {Object.entries(porBloque).map(([b, v]) => (
                  <BarRow key={b} label={BLOQUE_LABEL[b] ?? b} value={v.dias} max={7} />
                ))}
              </View>
            </Card>
          )}

          {/* Tareas academicas */}
          {tareas && tareas.creadas > 0 && (
            <Card>
              <AppText variant="h3" color={color.textStrong}>
                Pendientes academicos
              </AppText>
              <AppText variant="body" color={color.textDefault}>
                Completaste {tareas.hechas} de {tareas.creadas} ({tareas.pct}%).
              </AppText>
            </Card>
          )}

          <Callout tone="privacy">
            Este analisis es solo tuyo. Tu tutor ve unicamente indicadores resumidos de constancia,
            nunca esta informacion detallada.
          </Callout>
        </>
      )}
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

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: space.md - 2 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: space.lg + 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  block: { marginTop: space.md },
});
