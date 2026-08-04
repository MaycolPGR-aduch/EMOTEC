import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color as colors, radius, space } from '@/theme';
import { haptics } from '@/lib/haptics';
import { AppText } from './Text';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  haptic?: 'selection' | 'success' | 'none';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  haptic = 'selection',
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];

  function handlePress() {
    if (isDisabled) return;
    if (haptic === 'selection') haptics.selection();
    else if (haptic === 'success') haptics.success();
    onPress();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Icon name={icon} size={18} color={v.fg} />}
          <AppText variant="bodyStrong" color={v.fg} weight="semibold">
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.brand, fg: colors.onBrand },
  secondary: { bg: 'transparent', fg: colors.brand, border: colors.brand },
  ghost: { bg: 'transparent', fg: colors.textMuted },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  md: { paddingVertical: space.md, paddingHorizontal: space.lg },
  lg: { paddingVertical: space.lg - 2, paddingHorizontal: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
