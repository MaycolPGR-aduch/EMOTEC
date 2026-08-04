import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { AppText, Button, Icon, RatingStars, Screen } from '@/components/ui';
import { color, radius, space } from '@/theme';
import { haptics } from '@/lib/haptics';

type ActivityCompleteProps = {
  title?: string;
  message?: string;
  rating?: { value: number | null; onChange: (n: number) => void; prompt?: string };
  primary: { label: string; onPress: () => void; loading?: boolean };
  error?: string | null;
};

// Cierre satisfactorio de una actividad: check animado, mensaje, valoracion
// opcional y boton de guardar. Unifica los "Bien hecho" dispersos.
export function ActivityComplete({ title = 'Bien hecho', message, rating, primary, error }: ActivityCompleteProps) {
  const scale = useSharedValue(0);

  useEffect(() => {
    haptics.success();
    scale.value = withSpring(1, { damping: 10, stiffness: 120 });
  }, [scale]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Screen background="surface" center contentContainerStyle={styles.wrap}>
      <Animated.View style={[styles.badge, checkStyle]}>
        <Icon name="check" size={44} color={color.onBrand} />
      </Animated.View>

      <AppText variant="hero" color={color.success} align="center">
        {title}
      </AppText>
      {message && (
        <AppText variant="body" color={color.textSecondary} align="center">
          {message}
        </AppText>
      )}

      {rating && (
        <View style={styles.rating}>
          {rating.prompt && (
            <AppText variant="body" color={color.textSecondary} align="center">
              {rating.prompt}
            </AppText>
          )}
          <RatingStars value={rating.value} onChange={rating.onChange} />
        </View>
      )}

      {error && (
        <AppText variant="body" color={color.danger} align="center">
          {error}
        </AppText>
      )}

      <Button title={primary.label} onPress={primary.onPress} loading={primary.loading} haptic="none" style={styles.btn} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg, justifyContent: 'center' },
  badge: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: color.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rating: { gap: space.md },
  btn: { marginTop: space.sm },
});
