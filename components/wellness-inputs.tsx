import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CONTEXTS } from '@/lib/activities';

// Escala de intensidad 0-10 (coincide con el CHECK de emotional_entries).
export function IntensityScale({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.scaleWrap}>
      {Array.from({ length: 11 }, (_, n) => {
        const selected = value === n;
        return (
          <Pressable
            key={n}
            style={[styles.cell, selected && styles.cellOn]}
            onPress={() => onChange(n)}
          >
            <Text style={[styles.cellText, selected && styles.cellTextOn]}>{n}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Selector de contexto (catalogo cerrado); permite deseleccionar.
export function ContextPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  return (
    <View style={styles.chips}>
      {CONTEXTS.map((c) => {
        const selected = value === c.key;
        return (
          <Pressable
            key={c.key}
            style={[styles.chip, selected && styles.chipOn]}
            onPress={() => onChange(selected ? null : c.key)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  scaleWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#c9d6e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  cellText: { fontSize: 15, color: '#5a6b7b', fontWeight: '600' },
  cellTextOn: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c9d6e5',
  },
  chipOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#5a6b7b' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
});
