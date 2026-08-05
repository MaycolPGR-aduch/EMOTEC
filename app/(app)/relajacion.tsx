import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getActivityConfig, type RelaxationConfig } from '@/lib/activities';
import { closeActivitySession, openActivitySession } from '@/lib/activity-log';
import { Screen } from '@/components/ui';
import { ActivityComplete, ActivityIntro, GuidedSequence, type Phase } from '@/components/activities';
import { color } from '@/theme';

// Por cada grupo muscular: una fase "Tensa" (crece el circulo) y una "Suelta".
// Reutiliza el motor de la respiracion.
function phasesFor(cfg: RelaxationConfig): Phase[] {
  const phases: Phase[] = [];
  for (const g of cfg.groups) {
    phases.push({ label: `Tensa: ${g.label}`, seconds: cfg.tensa_seg, scaleTarget: 1 });
    phases.push({ label: `Suelta: ${g.label}`, seconds: cfg.suelta_seg, scaleTarget: 0.45 });
  }
  return phases;
}

export default function Relajacion() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [cfg, setCfg] = useState<RelaxationConfig | null>(null);
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [preState, setPreState] = useState<number | null>(null);
  const [postState, setPostState] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startedAt = useRef<Date | null>(null);
  const sessionId = useRef<string | null>(null);
  const closed = useRef(false);

  useEffect(() => {
    getActivityConfig<RelaxationConfig>('relajacion_muscular').then(setCfg);
  }, []);

  useEffect(() => {
    return () => {
      if (sessionId.current && !closed.current) {
        closed.current = true;
        void closeActivitySession(sessionId.current, { status: 'abandonada' });
      }
    };
  }, []);

  async function start() {
    startedAt.current = new Date();
    const { id } = await openActivitySession(userId, 'relajacion_muscular', { preState });
    sessionId.current = id;
    setPhase('running');
  }

  async function cancel() {
    if (sessionId.current && !closed.current) {
      closed.current = true;
      await closeActivitySession(sessionId.current, { status: 'abandonada' });
      sessionId.current = null;
    }
    setPhase('intro');
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
        stepTotal: cfg?.groups.length ?? null,
        stepReached: cfg?.groups.length ?? null,
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

  if (cfg === null) return <Screen loading background="surface" />;

  if (phase === 'running') {
    return (
      <SafeAreaView style={styles.immersive}>
        <GuidedSequence
          phases={phasesFor(cfg)}
          cycles={1}
          onComplete={() => setPhase('done')}
          onCancel={cancel}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <ActivityComplete
        postState={{ value: postState, onChange: setPostState }}
        rating={{ value: rating, onChange: setRating, prompt: 'Te resulto util?' }}
        primary={{ label: 'Guardar', onPress: save, loading: saving }}
        error={error}
      />
    );
  }

  const totalSeg = cfg.groups.length * (cfg.tensa_seg + cfg.suelta_seg);
  return (
    <ActivityIntro
      icon="relajacion"
      title="Relajacion muscular"
      durationLabel={`≈ ${Math.max(1, Math.round(totalSeg / 60))} min`}
      description="Vamos a tensar y soltar cada grupo muscular, de los pies a la cabeza. Al soltar, nota la diferencia entre la tension y la calma."
      preState={{ value: preState, onChange: setPreState }}
      onStart={start}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  immersive: { flex: 1, backgroundColor: color.immersive.bg },
});
