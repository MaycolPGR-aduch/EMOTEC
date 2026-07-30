import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { getScenarios, saveScenarioResponse, type Scenario, type ScenarioOption } from '@/lib/scenarios';

const POR_SESION = 3;

// Baraja una copia y toma n. Math.random es valido en la app (la restriccion es
// solo para los scripts de workflow).
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

  useEffect(() => {
    getScenarios().then((all) => {
      setTanda(tomarAlAzar(all, POR_SESION));
      setLoading(false);
    });
  }, []);

  async function elegir(opt: ScenarioOption) {
    setElegida(opt);
    // Registra la preferencia (best-effort: si falla, la reflexion igual se muestra).
    await saveScenarioResponse(userId, tanda[idx].code, opt);
  }

  function siguiente() {
    setElegida(null);
    setIdx((i) => i + 1);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  // Intro
  if (idx === -1) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <Text style={styles.title}>Situaciones</Text>
          <Text style={styles.body}>
            Te mostraremos algunas situaciones cotidianas. No hay respuestas correctas ni
            incorrectas: elige lo que harias tu. Despues veras una idea que puede ayudarte.
          </Text>
          {tanda.length === 0 ? (
            <Text style={styles.muted}>No hay situaciones disponibles por ahora.</Text>
          ) : (
            <Pressable style={styles.button} onPress={() => setIdx(0)}>
              <Text style={styles.buttonText}>Empezar</Text>
            </Pressable>
          )}
          <Pressable style={styles.cancel} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Ahora no</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Fin
  if (idx >= tanda.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <Text style={styles.big}>Gracias por participar</Text>
          <Text style={styles.body}>
            No hay una unica forma de afrontar las cosas. Reconocer lo que sueles hacer ya es un
            paso.
          </Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Terminar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const s = tanda[idx];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.counter}>
          {idx + 1} de {tanda.length}
        </Text>
        <Text style={styles.scenarioTitle}>{s.title}</Text>
        <Text style={styles.prompt}>{s.prompt}</Text>

        {!elegida ? (
          <View style={styles.options}>
            <Text style={styles.q}>Que harias tu?</Text>
            {s.options.map((o) => (
              <Pressable key={o.id} style={styles.option} onPress={() => elegir(o)}>
                <Text style={styles.optionText}>{o.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.reflexionWrap}>
            <View style={styles.elegidaCard}>
              <Text style={styles.elegidaText}>{elegida.text}</Text>
            </View>
            <Text style={styles.reflexion}>{elegida.reflexion}</Text>
            <Pressable style={styles.button} onPress={siguiente}>
              <Text style={styles.buttonText}>
                {idx + 1 < tanda.length ? 'Siguiente situacion' : 'Terminar'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 18 },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 26, fontWeight: '700', color: '#208AEF', textAlign: 'center' },
  big: { fontSize: 26, fontWeight: '700', color: '#1e7e34', textAlign: 'center' },
  body: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 },
  muted: { fontSize: 14, color: '#999', textAlign: 'center' },
  counter: { fontSize: 13, color: '#9aa5b1' },
  scenarioTitle: { fontSize: 22, fontWeight: '700', color: '#222' },
  prompt: { fontSize: 17, color: '#444', lineHeight: 25 },
  q: { fontSize: 15, fontWeight: '600', color: '#555', marginBottom: 4 },
  options: { gap: 10, marginTop: 12 },
  option: {
    borderWidth: 1,
    borderColor: '#c9d6e5',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f7fafd',
  },
  optionText: { fontSize: 16, color: '#2b3d4d', lineHeight: 22 },
  reflexionWrap: { gap: 14, marginTop: 12 },
  elegidaCard: { backgroundColor: '#208AEF', borderRadius: 12, padding: 14 },
  elegidaText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  reflexion: { fontSize: 16, color: '#40566b', lineHeight: 24 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#888', fontSize: 15 },
});
