import { Pressable, StyleSheet, View } from 'react-native';
import { color as colors, radius, space } from '@/theme';
import { haptics } from '@/lib/haptics';
import { AppText } from './Text';

type IntensityScaleProps = {
  value: number | null;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
};

// Escala numerica seleccionable (migrada de wellness-inputs). Sirve para 0-10
// (intensidad) y 1-5 (check-in) segun min/max.
export function IntensityScale({ value, onChange, min = 0, max = 10 }: IntensityScaleProps) {
  const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <View style={styles.wrap}>
      {nums.map((n) => {
        const selected = value === n;
        return (
          <Pressable
            key={n}
            style={[styles.cell, selected ? styles.on : styles.off]}
            onPress={() => {
              haptics.selection();
              onChange(n);
            }}
          >
            <AppText
              variant="bodyStrong"
              weight="semibold"
              color={selected ? colors.onBrand : colors.textSecondary}
            >
              {n}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm - 2 },
  cell: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.brand, borderColor: colors.brand },
  off: { backgroundColor: 'transparent', borderColor: colors.borderInput },
});
