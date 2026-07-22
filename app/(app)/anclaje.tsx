import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { logActivitySession } from '@/lib/activities';

// Anclaje 5-4-3-2-1: pasos sensoriales para volver al presente. Contenido fijo
// (coincide con el seed 'anclaje_54321'); no depende de leerlo de la base.
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
  const [step, setStep] = useState(-1); // -1 = intro, 0..4 = pasos, 5 = fin
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <Text style={styles.title}>Anclaje 5-4-3-2-1</Text>
          <Text style={styles.body}>
            Cuando la mente se acelera, volver a los sentidos ayuda a regresar al presente. Iremos
            paso a paso, sin prisa.
          </Text>
          <Pressable style={styles.button} onPress={start}>
            <Text style={styles.buttonText}>Empezar</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Ahora no</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (step >= PASOS.length) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.wrap}>
          <Text style={styles.big}>Bien hecho</Text>
          <Text style={styles.body}>Tomate un momento antes de seguir con tu dia.</Text>
          <Pressable style={styles.button} onPress={finish}>
            <Text style={styles.buttonText}>Terminar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const p = PASOS[step];
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.counter}>
          Paso {step + 1} de {PASOS.length}
        </Text>
        <Text style={styles.number}>{p.n}</Text>
        <Text style={styles.stepText}>{p.texto}</Text>
        <Pressable style={styles.button} onPress={() => setStep(step + 1)}>
          <Text style={styles.buttonText}>
            {step + 1 < PASOS.length ? 'Siguiente' : 'Listo'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  wrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, gap: 18 },
  title: { fontSize: 26, fontWeight: '700', color: '#208AEF', textAlign: 'center' },
  big: { fontSize: 28, fontWeight: '700', color: '#1e7e34', textAlign: 'center' },
  body: { fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 },
  counter: { fontSize: 14, color: '#9aa5b1', textAlign: 'center' },
  number: { fontSize: 72, fontWeight: '300', color: '#208AEF', textAlign: 'center' },
  stepText: { fontSize: 20, color: '#222', textAlign: 'center', lineHeight: 28 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#888', fontSize: 15 },
});
