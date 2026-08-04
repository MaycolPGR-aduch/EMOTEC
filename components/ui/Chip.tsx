import { Pressable, StyleSheet } from 'react-native';
import { color as colors, radius, space } from '@/theme';
import { haptics } from '@/lib/haptics';
import { AppText } from './Text';

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

// Unifica las 4 reimplementaciones de chip seleccionable (contexto, fechas,
// emociones, roles).
export function Chip({ label, selected, onPress, disabled, size = 'md' }: ChipProps) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        haptics.selection();
        onPress();
      }}
      disabled={disabled}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        selected ? styles.on : styles.off,
        disabled && styles.disabled,
      ]}
    >
      <AppText
        variant="small"
        weight={selected ? 'semibold' : 'regular'}
        color={selected ? colors.onBrand : colors.textSecondary}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, borderWidth: 1 },
  sm: { paddingHorizontal: space.md, paddingVertical: space.sm - 1 },
  md: { paddingHorizontal: space.lg - 2, paddingVertical: space.sm + 1 },
  on: { backgroundColor: colors.brand, borderColor: colors.brand },
  off: { backgroundColor: 'transparent', borderColor: colors.borderInput },
  disabled: { opacity: 0.5 },
});
