import { StyleSheet, View } from 'react-native';
import { color as colors, space } from '@/theme';

type ProgressDotsProps = {
  total: number;
  index: number; // 0-based
  tone?: 'brand' | 'immersive';
};

// Indicador de paso para wizards. Reemplaza el texto "Paso X de N".
export function ProgressDots({ total, index, tone = 'brand' }: ProgressDotsProps) {
  const on = tone === 'immersive' ? colors.immersive.textSecondary : colors.brand;
  const off = tone === 'immersive' ? colors.immersive.border : colors.borderInput;
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, { backgroundColor: i === index ? on : off, width: i === index ? 22 : 8 }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.xs, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 4 },
});
