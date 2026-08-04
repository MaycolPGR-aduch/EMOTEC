import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { logActivitySession } from '@/lib/activities';
import { AppText, Button, ProgressDots, Screen } from '@/components/ui';
import { ActivityComplete, ActivityIntro, StepTransition } from '@/components/activities';
import { color, space } from '@/theme';

const PASOS = [
  { n: 5, texto: 'Nombra 5 cosas que puedas VER a tu alrededor.' },
  { n: 4, texto: 'Nombra 4 cosas que puedas TOCAR.' },
  { n: 3, texto: 'Nombra 3 sonidos que puedas ESCUCHAR.' },
  { n: 2, texto: 'Nombra 2 cosas que puedas OLER.' },
  { n: 1, texto: 'Nombra 1 cosa que puedas SABOREAR.' },
];

export default function Anclaje() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [step, setStep] = useState(-1); // -1 intro, 0..4 pasos, 5 fin
  const startedAt = useRef<Date | null>(null);

  function start() {
    startedAt.current = new Date();
    setStep(0);
  }

  async function finish() {
    if (startedAt.current) {
      const dur = Math.round((Date.now() - startedAt.current.getTime()) / 1000);
      await logActivitySession(userId, 'anclaje_54321', startedAt.current, dur, null);
    }
    router.back();
  }

  if (step === -1) {
    return (
      <ActivityIntro
        icon="anclaje"
        title="Anclaje 5-4-3-2-1"
        durationLabel="≈ 2 min"
        description="Cuando la mente se acelera, volver a los sentidos ayuda a regresar al presente. Iremos paso a paso, sin prisa."
        onStart={start}
        onCancel={() => router.back()}
      />
    );
  }

  if (step >= PASOS.length) {
    return (
      <ActivityComplete
        message="Tomate un momento antes de seguir con tu dia."
        primary={{ label: 'Terminar', onPress: finish }}
      />
    );
  }

  const p = PASOS[step];
  return (
    <Screen background="surface" center contentContainerStyle={styles.wrap}>
      <StepTransition stepKey={step}>
        <View style={styles.step}>
          <ProgressDots total={PASOS.length} index={step} />
          <AppText variant="digitXl" color={color.brand} align="center">
            {String(p.n)}
          </AppText>
          <AppText variant="h2" color={color.textStrong} align="center">
            {p.texto}
          </AppText>
        </View>
      </StepTransition>
      <Button
        title={step + 1 < PASOS.length ? 'Siguiente' : 'Listo'}
        onPress={() => setStep(step + 1)}
        style={styles.btn}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', gap: space.xl },
  step: { alignItems: 'center', gap: space.lg },
  btn: { marginTop: space.md },
});
