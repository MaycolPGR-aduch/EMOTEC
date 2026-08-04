import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { color as colors, space } from '@/theme';
import { AppText } from './Text';
import { Icon } from './Icon';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onClose?: () => void; // por defecto router.back()
  showClose?: boolean; // false para pantallas raiz de rol
  right?: React.ReactNode;
};

// El header (titulo azul + Cerrar) estaba copiado en 8 pantallas. Aqui una vez.
export function ScreenHeader({
  title,
  subtitle,
  onClose,
  showClose = true,
  right,
}: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <AppText variant="h2" color={colors.brand}>
          {title}
        </AppText>
        {subtitle && (
          <AppText variant="caption" color={colors.textFaint}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right ??
        (showClose ? (
          <Pressable
            onPress={onClose ?? (() => router.back())}
            hitSlop={10}
            style={styles.close}
          >
            <Icon name="close" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null)}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.md + 2,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  left: { flexShrink: 1 },
  close: { padding: space.xs },
});
