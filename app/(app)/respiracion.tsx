import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getBreathingActivities, saveBreathingSession, type BreathingActivity } from '@/lib/activities';
import { AppText, Card, Screen } from '@/components/ui';
import { ActivityComplete, GuidedSequence, type Phase } from '@/components/activities';
import { color, space } from '@/theme';

function phasesFor(cfg: BreathingActivity['config']): Phase[] {
  const p: Phase[] = [
    { label: 'Inhala', seconds: cfg.inhala_seg, scaleTarget: 1 },
    { label: 'Reten', seconds: cfg.reten_seg, scaleTarget: 1 },
    { label: 'Exhala', seconds: cfg.exhala_seg, scaleTarget: 0.45 },
  ];
  if (cfg.pausa_seg && cfg.pausa_seg > 0) {
    p.push({ label: 'Pausa', seconds: cfg.pausa_seg, scaleTarget: 0.45 });
  }
  return p.filter((x) => x.seconds > 0);
}

export default function Respiracion() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [activities, setActivities] = useState<BreathingActivity[] | null>(null);
  const [selected, setSelected] = useState<BreathingActivity | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<Date | null>(null);

  useEffect(() => {
    getBreathingActivities().then(setActivities);
  }, []);

  function start(act: BreathingActivity) {
    setSelected(act);
    setRating(null);
    startedAt.current = new Date();
    setRunning(true);
    setFinished(false);
  }

  function stop() {
    setRunning(false);
    setSelected(null);
  }

  async function save() {
    if (!selected || !startedAt.current) return;
    setSaving(true);
    const dur = Math.round((Date.now() - startedAt.current.getTime()) / 1000);
    const res = await saveBreathingSession(userId, selected.code, startedAt.current, dur, rating);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  if (activities === null) return <Screen loading background="surface" />;

  if (running && selected) {
    return (
      <SafeAreaView style={styles.immersive}>
        <GuidedSequence
          phases={phasesFor(selected.config)}
          cycles={selected.config.ciclos}
          onComplete={() => {
            setRunning(false);
            setFinished(true);
          }}
          onCancel={stop}
        />
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <ActivityComplete
        message="Como te sientes despues de la pausa? (opcional)"
        rating={{ value: rating, onChange: setRating }}
        primary={{ label: 'Guardar', onPress: save, loading: saving }}
        error={error}
      />
    );
  }

  return (
    <Screen header={{ title: 'Respiracion guiada' }} scroll background="canvas">
      {activities.map((a) => (
        <Card key={a.code} variant="brandSubtle" onPress={() => start(a)} style={styles.card}>
          <AppText variant="h3" color={color.textStrong}>
            {a.title}
          </AppText>
          {a.description && (
            <AppText variant="body" color={color.textSecondary}>
              {a.description}
            </AppText>
          )}
          <AppText variant="caption" color={color.textFaint}>
            {a.config.ciclos} ciclos · inhala {a.config.inhala_seg}s · reten {a.config.reten_seg}s · exhala {a.config.exhala_seg}s
          </AppText>
        </Card>
      ))}
      {activities.length === 0 && (
        <AppText variant="body" color={color.textMuted}>
          No hay actividades de respiracion configuradas.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.canvas },
  immersive: { flex: 1, backgroundColor: color.immersive.bg },
  card: { gap: space.xs + 2 },
});
