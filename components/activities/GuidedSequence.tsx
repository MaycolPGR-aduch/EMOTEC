import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { AppText, Button } from '@/components/ui';
import { color, radius, space } from '@/theme';
import { haptics } from '@/lib/haptics';

export type Phase = { label: string; seconds: number; scaleTarget?: number };

type GuidedSequenceProps = {
  phases: Phase[];
  cycles: number;
  onComplete: () => void;
  onCancel: () => void;
  cueHaptics?: boolean;
};

// Motor de secuencia guiada por tiempo (respiracion, relajacion muscular). La
// maquina de fases vive aqui; el circulo se anima con reanimated. Extraido de la
// version original de respiracion.tsx y generalizado.
export function GuidedSequence({ phases, cycles, onComplete, onCancel, cueHaptics = true }: GuidedSequenceProps) {
  const [phaseLabel, setPhaseLabel] = useState(phases[0]?.label ?? '');
  const [count, setCount] = useState(phases[0]?.seconds ?? 0);
  const [cycle, setCycle] = useState(1);

  const scale = useSharedValue(0.5);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    runPhase(0, 0);
    return () => {
      cancelled.current = true;
      if (timeout.current) clearTimeout(timeout.current);
      if (interval.current) clearInterval(interval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function runPhase(pIndex: number, cyc: number) {
    if (cancelled.current) return;
    const ph = phases[pIndex];
    setPhaseLabel(ph.label);
    setCycle(cyc + 1);
    if (cueHaptics) haptics.impact('light');

    if (ph.scaleTarget != null) {
      scale.value = withTiming(ph.scaleTarget, {
        duration: ph.seconds * 1000,
        easing: Easing.inOut(Easing.ease),
      });
    }

    let s = ph.seconds;
    setCount(s);
    interval.current = setInterval(() => {
      s -= 1;
      setCount(Math.max(s, 0));
      if (s <= 0 && interval.current) clearInterval(interval.current);
    }, 1000);

    timeout.current = setTimeout(() => {
      if (interval.current) clearInterval(interval.current);
      if (cancelled.current) return;
      if (pIndex + 1 < phases.length) runPhase(pIndex + 1, cyc);
      else if (cyc + 1 < cycles) runPhase(0, cyc + 1);
      else {
        if (cueHaptics) haptics.success();
        onComplete();
      }
    }, ph.seconds * 1000);
  }

  const circleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.wrap}>
      <AppText variant="body" color={color.immersive.textFaint}>
        Ciclo {cycle} de {cycles}
      </AppText>
      <View style={styles.circleWrap}>
        <Animated.View style={[styles.circle, circleStyle]} />
        <View style={styles.center}>
          <AppText variant="h1" color={color.immersive.textPrimary}>
            {phaseLabel}
          </AppText>
          <AppText variant="digitLg" color={color.immersive.textSecondary}>
            {String(count)}
          </AppText>
        </View>
      </View>
      <Button title="Detener" variant="secondary" onPress={onCancel} haptic="none" style={styles.stop} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.huge },
  circleWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  circle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: color.immersive.ring,
  },
  center: { alignItems: 'center' },
  stop: { borderColor: color.immersive.border, paddingHorizontal: space.huge },
});
