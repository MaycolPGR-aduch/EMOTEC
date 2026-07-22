import { StyleSheet, Text, View } from 'react-native';

// Graficos hechos con vistas nativas: sin librerias, funcionan en Expo Go.
//
// Decision de tono: TODAS las barras usan el mismo azul. Nada de rojo/verde por
// "bueno/malo". Un indicador alto de estres no es un suspenso, y colorearlo de
// rojo convertiria un acompanamiento en una evaluacion -- justo lo que la
// propuesta pide evitar. El dato se muestra; el juicio no.

const BLUE = '#208AEF';

export function BarRow({
  label,
  value,
  max = 5,
  delta,
}: {
  label: string;
  value: number | null;
  max?: number;
  delta?: number | null;
}) {
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value == null ? '-' : value.toFixed(1)}</Text>
        {delta != null && Math.abs(delta) >= 0.05 && (
          <Text style={styles.delta}>
            {delta > 0 ? '+' : ''}
            {delta.toFixed(1)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Barras verticales de un indicador dia a dia. Los dias sin registro se ven como
// hueco tenue: la ausencia tambien es informacion.
export function WeekBars({
  days,
  max = 5,
}: {
  days: { label: string; value: number | null }[];
  max?: number;
}) {
  return (
    <View style={styles.weekWrap}>
      {days.map((d, i) => {
        const pct = d.value == null ? 0 : Math.max(0.06, Math.min(1, d.value / max));
        return (
          <View key={i} style={styles.dayCol}>
            <View style={styles.dayTrack}>
              <View
                style={[
                  styles.dayFill,
                  { height: `${pct * 100}%` },
                  d.value == null && styles.dayEmpty,
                ]}
              />
            </View>
            <Text style={styles.dayValue}>{d.value == null ? '' : d.value}</Text>
            <Text style={styles.dayLabel}>{d.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  rowLabel: { width: 96, fontSize: 13, color: '#555' },
  track: { flex: 1, height: 10, backgroundColor: '#eef1f4', borderRadius: 5, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: BLUE, borderRadius: 5 },
  rowRight: { width: 46, alignItems: 'flex-end' },
  rowValue: { fontSize: 14, fontWeight: '700', color: '#222' },
  delta: { fontSize: 11, color: '#9aa5b1' },
  weekWrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  dayCol: { flex: 1, alignItems: 'center', gap: 4 },
  dayTrack: {
    width: '100%',
    height: 88,
    backgroundColor: '#f2f5f8',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  dayFill: { width: '100%', backgroundColor: BLUE, borderRadius: 6 },
  dayEmpty: { backgroundColor: '#e3e8ee' },
  dayValue: { fontSize: 11, color: '#666', height: 14 },
  dayLabel: { fontSize: 11, color: '#9aa5b1' },
});
