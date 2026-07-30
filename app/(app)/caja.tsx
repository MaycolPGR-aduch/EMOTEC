import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import { createWorry, deleteWorry, getOpenWorries, resolveWorry, type Worry } from '@/lib/worries';

type Vista = 'lista' | 'escribir' | 'clasificar' | 'plan';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCorta(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MESES[Number(m) - 1]}`;
}
function hoyMas(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FECHAS = [
  { label: 'Hoy', value: hoyMas(0) },
  { label: 'Manana', value: hoyMas(1) },
  { label: 'Esta semana', value: hoyMas(7) },
  { label: 'Sin fecha', value: null as string | null },
];

export default function Caja() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [worries, setWorries] = useState<Worry[] | null>(null);
  const [vista, setVista] = useState<Vista>('lista');
  const [texto, setTexto] = useState('');
  const [paso, setPaso] = useState('');
  const [fecha, setFecha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getOpenWorries(userId).then(setWorries);
  }, [userId]);

  useFocusEffect(useCallback(() => load(), [load]));

  function reset() {
    setTexto('');
    setPaso('');
    setFecha(null);
    setVista('lista');
  }

  async function guardar(actionable: boolean) {
    setBusy(true);
    const res = await createWorry(userId, texto, actionable, actionable ? paso : null, actionable ? fecha : null);
    setBusy(false);
    if (res.error) Alert.alert('Error', res.error);
    else {
      reset();
      load();
    }
  }

  async function marcarResuelta(w: Worry) {
    await resolveWorry(w.id);
    load();
  }

  function borrar(w: Worry) {
    Alert.alert('Borrar', 'Se elimina de inmediato y no se puede recuperar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteWorry(w.id);
          load();
        },
      },
    ]);
  }

  // --- Escribir ---
  if (vista === 'escribir') {
    return (
      <Marco onBack={reset}>
        <Text style={styles.h}>Que te preocupa?</Text>
        <Text style={styles.sub}>Escribelo tal cual esta en tu cabeza. Sacarlo ya ayuda.</Text>
        <TextInput
          style={styles.input}
          placeholder="Escribe aqui..."
          multiline
          value={texto}
          onChangeText={setTexto}
          maxLength={1000}
          autoFocus
        />
        <Pressable
          style={[styles.btn, !texto.trim() && styles.btnOff]}
          onPress={() => setVista('clasificar')}
          disabled={!texto.trim()}
        >
          <Text style={styles.btnText}>Siguiente</Text>
        </Pressable>
      </Marco>
    );
  }

  // --- Clasificar ---
  if (vista === 'clasificar') {
    return (
      <Marco onBack={() => setVista('escribir')}>
        <Text style={styles.h}>Puedes hacer algo sobre esto ahora?</Text>
        <Text style={styles.sub}>
          No todo depende de nosotros, y esta bien. Reconocerlo tambien ayuda.
        </Text>
        <Pressable style={styles.opt} onPress={() => setVista('plan')} disabled={busy}>
          <Text style={styles.optText}>Si, algo puedo hacer</Text>
        </Pressable>
        <Pressable style={styles.optAlt} onPress={() => guardar(false)} disabled={busy}>
          <Text style={styles.optAltText}>
            {busy ? 'Guardando...' : 'No depende de mi ahora, la guardo'}
          </Text>
        </Pressable>
      </Marco>
    );
  }

  // --- Plan ---
  if (vista === 'plan') {
    return (
      <Marco onBack={() => setVista('clasificar')}>
        <Text style={styles.h}>Cual seria un primer paso pequeno?</Text>
        <Text style={styles.sub}>No tiene que resolverlo todo. Solo un paso alcanzable.</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. escribirle al profesor..."
          multiline
          value={paso}
          onChangeText={setPaso}
          maxLength={500}
        />
        <Text style={styles.label}>Para cuando?</Text>
        <View style={styles.chips}>
          {FECHAS.map((f) => (
            <Pressable
              key={f.label}
              style={[styles.chip, fecha === f.value && styles.chipOn]}
              onPress={() => setFecha(f.value)}
            >
              <Text style={[styles.chipText, fecha === f.value && styles.chipTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          style={[styles.btn, !paso.trim() && styles.btnOff]}
          onPress={() => guardar(true)}
          disabled={!paso.trim() || busy}
        >
          <Text style={styles.btnText}>{busy ? 'Guardando...' : 'Guardar plan'}</Text>
        </Pressable>
      </Marco>
    );
  }

  // --- Lista (caja) ---
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Caja de preocupaciones</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.close}>Cerrar</Text>
        </Pressable>
      </View>

      {worries === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable style={styles.btn} onPress={() => setVista('escribir')}>
            <Text style={styles.btnText}>Anotar una preocupacion</Text>
          </Pressable>

          {worries.length === 0 && (
            <Text style={styles.empty}>Tu caja esta vacia. Cuando algo te preocupe, anotalo aqui.</Text>
          )}

          {worries.map((w) => (
            <View key={w.id} style={styles.card}>
              <Text style={styles.worryText}>{w.body}</Text>
              {w.actionable && w.first_step && (
                <View style={styles.plan}>
                  <Text style={styles.planLabel}>Primer paso</Text>
                  <Text style={styles.planStep}>{w.first_step}</Text>
                  {w.target_date && <Text style={styles.planDate}>para el {fechaCorta(w.target_date)}</Text>}
                </View>
              )}
              {!w.actionable && (
                <Text style={styles.guardada}>Guardada para revisar mas adelante.</Text>
              )}
              <View style={styles.cardActions}>
                <Pressable onPress={() => marcarResuelta(w)}>
                  <Text style={styles.done}>Marcar resuelta</Text>
                </Pressable>
                <Pressable onPress={() => borrar(w)}>
                  <Text style={styles.del}>Borrar</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Apoyo siempre visible (decision de producto). */}
          <Link href="/ayuda" asChild>
            <Pressable>
              <Text style={styles.help}>Buscar apoyo</Text>
            </Pressable>
          </Link>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Marco({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.wizard} keyboardShouldPersistTaps="handled">
          {children}
          <Pressable style={styles.back} onPress={onBack}>
            <Text style={styles.backText}>Atras</Text>
          </Pressable>
          <Link href="/ayuda" asChild>
            <Pressable>
              <Text style={styles.help}>Buscar apoyo</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  close: { color: '#888', fontSize: 15 },
  content: { padding: 16, gap: 12 },
  wizard: { padding: 24, gap: 14, flexGrow: 1 },
  h: { fontSize: 24, fontWeight: '700', color: '#208AEF' },
  sub: { fontSize: 15, color: '#666', lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#c9d6e5' },
  chipOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#5a6b7b' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  btn: { backgroundColor: '#208AEF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  btnOff: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  opt: { backgroundColor: '#208AEF', borderRadius: 12, padding: 16, alignItems: 'center' },
  optText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  optAlt: { borderWidth: 1, borderColor: '#c9d6e5', borderRadius: 12, padding: 16, alignItems: 'center' },
  optAltText: { color: '#40566b', fontSize: 16, fontWeight: '600' },
  empty: { fontSize: 15, color: '#888', textAlign: 'center', marginTop: 8 },
  card: { borderWidth: 1, borderColor: '#eef1f4', borderRadius: 12, padding: 16, gap: 8, backgroundColor: '#fff' },
  worryText: { fontSize: 16, color: '#222', lineHeight: 22 },
  plan: { backgroundColor: '#f2f7fd', borderRadius: 8, padding: 10, gap: 2 },
  planLabel: { fontSize: 11, color: '#7a97b5', fontWeight: '700', textTransform: 'uppercase' },
  planStep: { fontSize: 15, color: '#2b3d4d' },
  planDate: { fontSize: 12, color: '#7a97b5' },
  guardada: { fontSize: 13, color: '#9aa5b1', fontStyle: 'italic' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  done: { color: '#1e7e34', fontSize: 14, fontWeight: '600' },
  del: { color: '#c0392b', fontSize: 14 },
  back: { alignItems: 'center', paddingVertical: 10 },
  backText: { color: '#888', fontSize: 15 },
  help: { color: '#208AEF', fontSize: 15, fontWeight: '600', textAlign: 'center', paddingVertical: 12 },
});
