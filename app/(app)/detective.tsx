import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  getEmotionScenes,
  saveSceneResponse,
  type EmotionScene,
  type SceneResponse,
} from '@/lib/emotion-scenes';
import { AppText, Button, Callout, Card, Chip, ProgressDots, Screen } from '@/components/ui';
import { ActivityIntro, StepTransition } from '@/components/activities';
import { color, space } from '@/theme';

type Step = 'intro' | 'emociones' | 'senales' | 'respuesta' | 'explicacion';
const ORDER: Step[] = ['emociones', 'senales', 'respuesta', 'explicacion'];

function pick<T>(arr: T[]): T | null {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
}

export default function Detective() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [scene, setScene] = useState<EmotionScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('intro');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [signals, setSignals] = useState<string[]>([]);
  const [chosen, setChosen] = useState<SceneResponse | null>(null);

  useEffect(() => {
    getEmotionScenes().then((all) => {
      setScene(pick(all));
      setLoading(false);
    });
  }, []);

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function elegirRespuesta(r: SceneResponse) {
    setChosen(r);
    setStep('explicacion');
    if (scene) await saveSceneResponse(userId, scene.code, emotions, signals, r.id);
  }

  if (loading) return <Screen loading background="surface" />;
  if (!scene) {
    return (
      <Screen header={{ title: 'Detective de emociones' }} background="surface" center>
        <AppText variant="body" color={color.textMuted} align="center">
          No hay escenas disponibles por ahora.
        </AppText>
      </Screen>
    );
  }

  if (step === 'intro') {
    return (
      <ActivityIntro
        icon="detective"
        title="Detective de emociones"
        durationLabel="≈ 3 min"
        description="Leeras una escena cotidiana. No hay una unica respuesta correcta: se trata de practicar como reconocemos lo que le pasa a alguien."
        onStart={() => setStep('emociones')}
        onCancel={() => router.back()}
      />
    );
  }

  const stepIndex = ORDER.indexOf(step);

  return (
    <Screen scroll background="surface">
      <ProgressDots total={ORDER.length} index={stepIndex} />
      <Card variant="brandSubtle">
        <AppText variant="bodyStrong" weight="regular" color={color.textDefault}>
          {scene.scene}
        </AppText>
      </Card>

      <StepTransition stepKey={step}>
        {step === 'emociones' && (
          <View style={styles.block}>
            <AppText variant="h3" color={color.textStrong}>
              Que podria estar sintiendo?
            </AppText>
            <AppText variant="small" color={color.textMuted}>
              Puede haber varias. Elige las que te parezcan.
            </AppText>
            <View style={styles.chips}>
              {scene.content.emotions.map((e) => (
                <Chip key={e.id} label={e.label} selected={emotions.includes(e.id)} onPress={() => toggle(emotions, setEmotions, e.id)} />
              ))}
            </View>
            <Button title="Siguiente" onPress={() => setStep('senales')} disabled={emotions.length === 0} />
          </View>
        )}

        {step === 'senales' && (
          <View style={styles.block}>
            <AppText variant="h3" color={color.textStrong}>
              Que senales lo sugieren?
            </AppText>
            <View style={styles.chips}>
              {scene.content.signals.map((s) => (
                <Chip key={s.id} label={s.text} selected={signals.includes(s.id)} onPress={() => toggle(signals, setSignals, s.id)} />
              ))}
            </View>
            <Button title="Siguiente" onPress={() => setStep('respuesta')} disabled={signals.length === 0} />
          </View>
        )}

        {step === 'respuesta' && (
          <View style={styles.block}>
            <AppText variant="h3" color={color.textStrong}>
              Como responderias?
            </AppText>
            {scene.content.responses.map((r) => (
              <Card key={r.id} variant="outlined" onPress={() => elegirRespuesta(r)}>
                <AppText variant="bodyStrong" weight="regular" color={color.textDefault}>
                  {r.text}
                </AppText>
              </Card>
            ))}
          </View>
        )}

        {step === 'explicacion' && chosen && (
          <View style={styles.block}>
            <AppText variant="h3" color={color.textStrong}>
              Tu eleccion
            </AppText>
            <Card variant="brandSubtle">
              <AppText variant="bodyStrong" color={color.brandInk}>
                {chosen.text}
              </AppText>
            </Card>
            <Callout tone="info">{chosen.reflexion}</Callout>
            <Callout tone="privacy">{scene.content.explanation}</Callout>
            <Button title="Terminar" onPress={() => router.back()} />
          </View>
        )}
      </StepTransition>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.md, marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
