import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getScenarios, saveScenarioResponse, type Scenario, type ScenarioOption } from '@/lib/scenarios';
import { closeActivitySession, openActivitySession } from '@/lib/activity-log';
import { AppText, Button, Callout, Card, ProgressDots, RatingStars, Screen } from '@/components/ui';
import { ActivityIntro, StepTransition } from '@/components/activities';
import { color, space } from '@/theme';

const POR_SESION = 3;

function tomarAlAzar<T>(arr: T[], n: number): T[] {
  const copia = [...arr];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia.slice(0, n);
}

export default function Situaciones() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [loading, setLoading] = useState(true);
  const [tanda, setTanda] = useState<Scenario[]>([]);
  const [idx, setIdx] = useState(-1); // -1 = intro
  const [elegida, setElegida] = useState<ScenarioOption | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sessionId = useRef<string | null>(null);
  const idxRef = useRef(0);
  const closed = useRef(false);
  idxRef.current = Math.max(idx, 0);

  useEffect(() => {
    getScenarios().then((all) => {
      setTanda(tomarAlAzar(all, POR_SESION));
      setLoading(false);
    });
  }, []);

  // Abandono a mitad de la tanda.
  useEffect(() => {
    return () => {
      if (sessionId.current && !closed.current) {
        closed.current = true;
        void closeActivitySession(sessionId.current, {
          status: 'abandonada',
          stepReached: idxRef.current,
          stepTotal: POR_SESION,
        });
      }
    };
  }, []);

  async function start() {
    const { id } = await openActivitySession(userId, 'situaciones_interactivas');
    sessionId.current = id;
    setIdx(0);
  }

  async function elegir(opt: ScenarioOption) {
    setElegida(opt);
    // El error ya no se descarta: si falla, se avisa sin cortar la reflexion.
    const res = await saveScenarioResponse(userId, tanda[idx].code, opt, sessionId.current);
    if (res.error) setSaveError('No pudimos guardar tu respuesta. Tu conexion pudo fallar.');
  }

  function siguiente() {
    setElegida(null);
    setIdx((i) => i + 1);
  }

  async function terminar() {
    setSaving(true);
    if (sessionId.current) {
      closed.current = true;
      await closeActivitySession(sessionId.current, {
        status: 'completada',
        rating,
        stepReached: tanda.length,
        stepTotal: POR_SESION,
      });
    }
    setSaving(false);
    router.back();
  }

  if (loading) return <Screen loading background="surface" />;

  if (idx === -1) {
    return (
      <ActivityIntro
        icon="situaciones"
        title="Situaciones"
        durationLabel="≈ 4 min"
        description="Te mostraremos algunas situaciones cotidianas. No hay respuestas correctas ni incorrectas: elige lo que harias tu. Despues veras una idea que puede ayudarte."
        onStart={start}
        onCancel={() => router.back()}
        disabled={tanda.length === 0}
      />
    );
  }

  // Fin: cierre + valoracion de la tanda completa (no por escenario).
  if (idx >= tanda.length) {
    return (
      <Screen background="surface" center contentContainerStyle={styles.center}>
        <AppText variant="hero" color={color.success} align="center">
          Gracias por participar
        </AppText>
        <AppText variant="body" color={color.textSecondary} align="center">
          No hay una unica forma de afrontar las cosas. Reconocer lo que sueles hacer ya es un paso.
        </AppText>
        <AppText variant="body" color={color.textSecondary} align="center">
          Te resulto util?
        </AppText>
        <RatingStars value={rating} onChange={setRating} />
        {saveError && <Callout tone="warning">{saveError}</Callout>}
        <Button title="Terminar" onPress={terminar} loading={saving} style={styles.btn} />
      </Screen>
    );
  }

  const s = tanda[idx];

  return (
    <Screen scroll background="surface">
      <ProgressDots total={tanda.length} index={idx} />
      <StepTransition stepKey={`${idx}-${elegida ? 'r' : 'q'}`}>
        <View style={styles.content}>
          <AppText variant="h1" color={color.textStrong}>
            {s.title}
          </AppText>
          <AppText variant="subtitle" color={color.textDefault}>
            {s.prompt}
          </AppText>

          {!elegida ? (
            <View style={styles.options}>
              <AppText variant="bodyStrong" color={color.textSecondary}>
                Que harias tu?
              </AppText>
              {s.options.map((o) => (
                <Card key={o.id} variant="outlined" onPress={() => elegir(o)}>
                  <AppText variant="bodyStrong" weight="regular" color={color.textDefault}>
                    {o.text}
                  </AppText>
                </Card>
              ))}
            </View>
          ) : (
            <View style={styles.reflexion}>
              <Card variant="brandSubtle">
                <AppText variant="bodyStrong" color={color.brandInk}>
                  {elegida.text}
                </AppText>
              </Card>
              <Callout tone="info">{elegida.reflexion}</Callout>
              {saveError && <Callout tone="warning">{saveError}</Callout>}
              <Button
                title={idx + 1 < tanda.length ? 'Siguiente situacion' : 'Terminar'}
                onPress={siguiente}
              />
            </View>
          )}
        </View>
      </StepTransition>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', gap: space.lg },
  content: { gap: space.md },
  options: { gap: space.sm, marginTop: space.sm },
  reflexion: { gap: space.md, marginTop: space.sm },
  btn: { marginTop: space.md },
});
