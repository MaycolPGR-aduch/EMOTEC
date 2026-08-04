import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { AppText, Button, Icon, Screen, type IconName } from '@/components/ui';
import { color, radius, space } from '@/theme';
import { motion } from '@/lib/motion';

type ActivityIntroProps = {
  icon: IconName;
  title: string;
  description: string;
  durationLabel?: string;
  onStart: () => void;
  onCancel?: () => void;
  startLabel?: string;
  disabled?: boolean;
  children?: React.ReactNode;
};

// Portada comun de una actividad: icono en circulo, titulo, descripcion,
// duracion y boton de inicio. Unifica las intros de anclaje/situaciones/etc.
export function ActivityIntro({
  icon,
  title,
  description,
  durationLabel,
  onStart,
  onCancel,
  startLabel = 'Empezar',
  disabled = false,
  children,
}: ActivityIntroProps) {
  return (
    <Screen background="surface" center contentContainerStyle={styles.wrap}>
      <Animated.View entering={motion.enterUp} style={styles.top}>
        <View style={styles.iconWrap}>
          <Icon name={icon} size={40} color={color.brand} />
        </View>
        <AppText variant="hero" color={color.brand} align="center">
          {title}
        </AppText>
        {durationLabel && (
          <AppText variant="small" color={color.textFaint} align="center">
            {durationLabel}
          </AppText>
        )}
        <AppText variant="body" color={color.textSecondary} align="center">
          {description}
        </AppText>
      </Animated.View>

      {children}

      <View style={styles.actions}>
        <Button title={startLabel} onPress={onStart} disabled={disabled} haptic="selection" />
        {onCancel && <Button title="Ahora no" variant="ghost" onPress={onCancel} />}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl, justifyContent: 'center' },
  top: { alignItems: 'center', gap: space.md },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: color.surfaceBrand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  actions: { gap: space.sm },
});
