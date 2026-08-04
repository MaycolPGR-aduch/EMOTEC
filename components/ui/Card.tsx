import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color as colors, radius, space } from '@/theme';

type CardProps = {
  variant?: 'plain' | 'brandSubtle' | 'outlined';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

// Tarjeta blanca (o tinte azul). Reemplaza el patron repetido en ~10 pantallas.
export function Card({ variant = 'plain', onPress, style, children }: CardProps) {
  const v = VARIANTS[variant];
  const content = (
    <View
      style={[
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border, borderWidth: v.border ? 1 : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const VARIANTS = {
  plain: { bg: colors.surface, border: colors.border },
  brandSubtle: { bg: colors.surfaceBrand, border: colors.surfaceBrand },
  outlined: { bg: colors.surface, border: colors.borderInput },
} as const;

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, padding: space.lg },
  pressed: { opacity: 0.9 },
});
