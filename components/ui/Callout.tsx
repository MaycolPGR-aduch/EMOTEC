import { StyleSheet, View } from 'react-native';
import { color as colors, radius, space } from '@/theme';
import { AppText } from './Text';

type Tone = 'privacy' | 'info' | 'warning';

type CalloutProps = {
  tone?: Tone;
  children: React.ReactNode;
};

// Nota destacada: privacidad (verde), info (azul suave), aviso (durazno).
// Estandariza el texto de privacidad y las cajas de acompanamiento.
export function Callout({ tone = 'info', children }: CalloutProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }]}>
      <AppText variant="small" color={t.fg}>
        {children}
      </AppText>
    </View>
  );
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  privacy: { bg: colors.successSurface, fg: colors.success },
  info: { bg: colors.surfaceBrand, fg: colors.brandInk },
  warning: { bg: colors.warningSurface, fg: colors.warning },
};

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, padding: space.md },
});
