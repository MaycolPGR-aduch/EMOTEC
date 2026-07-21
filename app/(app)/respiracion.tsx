import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  getBreathingActivities,
  saveBreathingSession,
  type BreathingActivity,
} from '@/lib/activities';

type Phase = { name: string; dur: number; target: number };

function phasesFor(cfg: BreathingActivity['config']): Phase[] {
  const p: Phase[] = [
    { name: 'Inhala', dur: cfg.inhala_seg, target: 1 },
    { name: 'Reten', dur: cfg.reten_seg, target: 1 },
    { name: 'Exhala', dur: cfg.exhala_seg, target: 0.45 },
  ];
  if (cfg.pausa_seg && cfg.pausa_seg > 0) {
    p.push({ name: 'Pausa', dur: cfg.pausa_seg, target: 0.45 });
  }
  return p.filter((x) => x.dur > 0);
}

export default function Respiracion() {
  const { session } = useSession();
  const userId = session!.user.id;

  const [activities, setActivities] = useState<BreathingActivity[] | null>(null);
  const [selected, setSelected] = useState<BreathingActivity | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [count, setCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scale = useRef(new Animated.Value(0.5)).current;
  const startedAt = useRef<Date | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    getBreathingActivities().then(setActivities);
  }, []);

  useEffect(() => {
    return () => {
      cancelled.current = true;
      if (timeout.current) clearTimeout(timeout.current);
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  function runPhase(phases: Phase[], pIndex: number, cyc: number, total: number) {
    if (cancelled.current) return;
    const ph = phases[pIndex];
    setPhaseLabel(ph.name);
    setCycle(cyc + 1);
    Animated.timing(scale, {
      toValue: ph.target,
      duration: ph.dur * 1000,
      useNativeDriver: true,
    }).start();

    let s = ph.dur;
    setCount(s);
    interval.current = setInterval(() => {
      s -= 1;
      setCount(Math.max(s, 0));
      if (s <= 0 && interval.current) clearInterval(interval.current);
    }, 1000);

    timeout.current = setTimeout(() => {
      if (interval.current) clearInterval(interval.current);
      if (cancelled.current) return;
      const nextP = pIndex + 1;
      if (nextP < phases.length) {
        runPhase(phases, nextP, cyc, total);
      } else if (cyc + 1 < total) {
        runPhase(phases, 0, cyc + 1, total);
      } else {
        setRunning(false);
        setFinished(true);
        setPhaseLabel('');
      }
    }, ph.dur * 1000);
  }

  function start(act: BreathingActivity) {
    setSelected(act);
    setRunning(true);
    setFinished(false);
    setRating(null);
    cancelled.current = false;
    startedAt.current = new Date();
    runPhase(phasesFor(act.config), 0, 0, act.config.ciclos);
  }

  function stop() {
    cancelled.current = true;
    if (timeout.current) clearTimeout(timeout.current);
    if (interval.current) clearInterval(interval.current);
    setRunning(false);
    setSelected(null);
    scale.setValue(0.5);
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

  // --- Cargando catalogo ---
  if (activities === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  // --- Ejecutando: circulo animado ---
  if (running) {
    return (
      <SafeAreaView style={styles.centerDark}>
        <Text style={styles.cycle}>
          Ciclo {cycle} de {selected?.config.ciclos}
        </Text>
        <View style={styles.circleWrap}>
          <Animated.View style={[styles.circle, { transform: [{ scale }] }]} />
          <View style={styles.circleCenter}>
            <Text style={styles.phase}>{phaseLabel}</Text>
            <Text style={styles.count}>{count}</Text>
          </View>
        </View>
        <Pressable style={styles.stop} onPress={stop}>
          <Text style={styles.stopText}>Detener</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // --- Terminado: valoracion ---
  if (finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneTitle}>Bien hecho</Text>
          <Text style={styles.doneSub}>Como te sientes despues de la pausa? (opcional)</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)}>
                <Text style={[styles.star, rating != null && n <= rating && styles.starOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.button} onPress={save} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Guardar</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // --- Seleccion de tecnica ---
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Respiracion guiada</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {activities.map((a) => (
          <Pressable key={a.code} style={styles.card} onPress={() => start(a)}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            {a.description && <Text style={styles.cardDesc}>{a.description}</Text>}
            <Text style={styles.cardMeta}>
              {a.config.ciclos} ciclos · inhala {a.config.inhala_seg}s · reten{' '}
              {a.config.reten_seg}s · exhala {a.config.exhala_seg}s
            </Text>
          </Pressable>
        ))}
        {activities.length === 0 && (
          <Text style={styles.cardDesc}>No hay actividades de respiracion configuradas.</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const BLUE = '#208AEF';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  centerDark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f2233',
    gap: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: BLUE },
  close: { color: '#888', fontSize: 15 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#f2f7fd', borderRadius: 14, padding: 18 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  cardDesc: { fontSize: 14, color: '#666', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#8a97a5', marginTop: 8 },
  cycle: { color: '#9fb4c6', fontSize: 15 },
  circleWrap: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  circle: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#2f6ea5',
  },
  circleCenter: { alignItems: 'center' },
  phase: { color: '#fff', fontSize: 24, fontWeight: '700' },
  count: { color: '#cfe0ee', fontSize: 40, fontWeight: '300', marginTop: 4 },
  stop: {
    borderWidth: 1,
    borderColor: '#5a7488',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  stopText: { color: '#cfe0ee', fontSize: 15 },
  doneWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  doneTitle: { fontSize: 26, fontWeight: '700', color: '#1e7e34', textAlign: 'center' },
  doneSub: { fontSize: 15, color: '#666', textAlign: 'center' },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  star: { fontSize: 40, color: '#dcdcdc' },
  starOn: { color: '#f5b301' },
  error: { color: '#c0392b', fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
