import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getActivityConfig, saveBreathingSession, type RelaxationConfig } from '@/lib/activities';
import { Screen } from '@/components/ui';
import { ActivityComplete, ActivityIntro, GuidedSequence, type Phase } from '@/components/activities';
import { color } from '@/theme';

// Fases: por cada grupo muscular, una fase "Tensa" (crece el circulo) y una
// "Suelta" (se relaja). Reutiliza el motor de la respiracion.
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
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef<Date | null>(null);

  useEffect(() => {
    getActivityConfig<RelaxationConfig>('relajacion_muscular').then(setCfg);
  }, []);

  async function save() {
    if (!startedAt.current) return;
    setSaving(true);
    const dur = Math.round((Date.now() - startedAt.current.getTime()) / 1000);
    const res = await saveBreathingSession(userId, 'relajacion_muscular', startedAt.current, dur, rating);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  if (cfg === null) return <Screen loading background="surface" />;

  if (phase === 'running') {
    return (
      <SafeAreaView style={styles.immersive}>
        <GuidedSequence
          phases={phasesFor(cfg)}
          cycles={1}
          onComplete={() => setPhase('done')}
          onCancel={() => setPhase('intro')}
        />
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    return (
      <ActivityComplete
        message="Como te sientes despues de soltar la tension? (opcional)"
        rating={{ value: rating, onChange: setRating }}
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
      durationLabel={`≈ ${Math.round(totalSeg / 60)} min`}
      description="Vamos a tensar y soltar cada grupo muscular, de los pies a la cabeza. Al soltar, nota la diferencia entre la tension y la calma."
      onStart={() => {
        startedAt.current = new Date();
        setPhase('running');
      }}
      onCancel={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  immersive: { flex: 1, backgroundColor: color.immersive.bg },
});
