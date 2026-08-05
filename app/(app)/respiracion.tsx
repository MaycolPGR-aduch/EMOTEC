import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getBreathingActivities, type BreathingActivity } from '@/lib/activities';
import { closeActivitySession, openActivitySession } from '@/lib/activity-log';
import { AppText, Card, Screen } from '@/components/ui';
import { ActivityComplete, ActivityIntro, GuidedSequence, type Phase } from '@/components/activities';
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

type Vista = 'lista' | 'intro' | 'running' | 'done';

export default function Respiracion() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [activities, setActivities] = useState<BreathingActivity[] | null>(null);
  const [selected, setSelected] = useState<BreathingActivity | null>(null);
  const [vista, setVista] = useState<Vista>('lista');
  const [preState, setPreState] = useState<number | null>(null);
  const [postState, setPostState] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedAt = useRef<Date | null>(null);
  const sessionId = useRef<string | null>(null);
  const closed = useRef(false);

  useEffect(() => {
    getBreathingActivities().then(setActivities);
  }, []);

  // Abandono: la pantalla se desmonta con la sesion abierta.
  useEffect(() => {
    return () => {
      if (sessionId.current && !closed.current) {
        closed.current = true;
        void closeActivitySession(sessionId.current, { status: 'abandonada' });
      }
    };
  }, []);

  async function start() {
    if (!selected) return;
    startedAt.current = new Date();
    const { id } = await openActivitySession(userId, selected.code, { preState });
    sessionId.current = id;
    setVista('running');
  }

  async function stop() {
    if (sessionId.current && !closed.current) {
      closed.current = true;
      await closeActivitySession(sessionId.current, { status: 'abandonada' });
      sessionId.current = null;
    }
    setSelected(null);
    setVista('lista');
  }

  async function save() {
    setSaving(true);
    if (sessionId.current) {
      closed.current = true;
      const dur = startedAt.current
        ? Math.round((Date.now() - startedAt.current.getTime()) / 1000)
        : null;
      const res = await closeActivitySession(sessionId.current, {
        status: 'completada',
        durationSec: dur,
        rating,
        postState,
        stepTotal: selected?.config.ciclos ?? null,
        stepReached: selected?.config.ciclos ?? null,
      });
      if (res.error) {
        setSaving(false);
        setError('No pudimos guardar tu sesion. Tu conexion pudo fallar.');
        return;
      }
    }
    setSaving(false);
    router.back();
  }

  if (activities === null) return <Screen loading background="surface" />;

  if (vista === 'running' && selected) {
    return (
      <SafeAreaView style={styles.immersive}>
        <GuidedSequence
          phases={phasesFor(selected.config)}
          cycles={selected.config.ciclos}
          onComplete={() => setVista('done')}
          onCancel={stop}
        />
      </SafeAreaView>
    );
  }

  if (vista === 'done') {
    return (
      <ActivityComplete
        postState={{ value: postState, onChange: setPostState }}
        rating={{ value: rating, onChange: setRating, prompt: 'Te resulto util?' }}
        primary={{ label: 'Guardar', onPress: save, loading: saving }}
        error={error}
      />
    );
  }

  if (vista === 'intro' && selected) {
    return (
      <ActivityIntro
        icon="respiracion"
        title={selected.title}
        durationLabel={`${selected.config.ciclos} ciclos`}
        description={selected.description ?? 'Sigue el ritmo del circulo: inhala cuando crece, exhala cuando se encoge.'}
        preState={{ value: preState, onChange: setPreState }}
        onStart={start}
        onCancel={() => {
          setSelected(null);
          setVista('lista');
        }}
      />
    );
  }

  return (
    <Screen header={{ title: 'Respiracion guiada' }} scroll background="canvas">
      {activities.map((a) => (
        <Card
          key={a.code}
          variant="brandSubtle"
          onPress={() => {
            setSelected(a);
            setPreState(null);
            setPostState(null);
            setRating(null);
            setVista('intro');
          }}
          style={styles.card}
        >
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
  immersive: { flex: 1, backgroundColor: color.immersive.bg },
  card: { gap: space.xs + 2 },
});
