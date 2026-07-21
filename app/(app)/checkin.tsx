import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  createCheckin,
  deleteCheckin,
  getLatestCheckin,
  todayStr,
  type CheckinValues,
} from '@/lib/checkins';

type Dim = {
  key: keyof CheckinValues;
  label: string;
  low: string;
  high: string;
};

// Orden y anclas de cada indicador. Las anclas ayudan a interpretar la escala
// (en unos "5" es bueno, en otros "5" es mucho): el numero es neutro, el texto
// da el sentido.
const DIMS: Dim[] = [
  { key: 'mood', label: 'Animo', low: 'muy bajo', high: 'muy bueno' },
  { key: 'stress', label: 'Estres', low: 'nada', high: 'muchisimo' },
  { key: 'sleep', label: 'Descanso', low: 'muy malo', high: 'muy bueno' },
  { key: 'energy', label: 'Energia', low: 'muy baja', high: 'muy alta' },
  { key: 'academic_load', label: 'Carga academica', low: 'ligera', high: 'muy pesada' },
  { key: 'social_perception', label: 'Vida social', low: 'muy mala', high: 'muy buena' },
];

export default function Checkin() {
  const { session } = useSession();
  const userId = session!.user.id;

  const [loading, setLoading] = useState(true);
  const [alreadyToday, setAlreadyToday] = useState<{ id: string } | null>(null);
  const [values, setValues] = useState<Partial<CheckinValues>>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLatestCheckin(userId).then((latest) => {
      if (latest && latest.local_date === todayStr()) {
        setAlreadyToday({ id: latest.id });
      }
      setLoading(false);
    });
  }, [userId]);

  const complete = DIMS.every((d) => values[d.key] != null);

  async function onSave() {
    if (!complete) {
      setError('Responde los 6 indicadores antes de guardar.');
      return;
    }
    setError(null);
    setSaving(true);
    const res = await createCheckin(userId, values as CheckinValues, note);
    setSaving(false);
    if (res.duplicate) {
      setError('Ya registraste tu check-in de hoy.');
      setAlreadyToday({ id: '' });
      return;
    }
    if (res.error) {
      setError(res.error);
      return;
    }
    router.back();
  }

  async function onRedo() {
    if (!alreadyToday?.id) {
      setAlreadyToday(null);
      return;
    }
    setSaving(true);
    const res = await deleteCheckin(alreadyToday.id);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setAlreadyToday(null); // muestra el formulario en blanco
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (alreadyToday) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneWrap}>
          <Text style={styles.doneTitle}>Ya hiciste tu check-in de hoy</Text>
          <Text style={styles.doneSub}>Vuelve manana para seguir tu evolucion.</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Volver</Text>
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={onRedo} disabled={saving}>
            <Text style={styles.linkText}>{saving ? 'Rehaciendo...' : 'Rehacer el de hoy'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Como estas hoy?</Text>
        <Text style={styles.subtitle}>Toma menos de un minuto.</Text>

        {DIMS.map((d) => (
          <View key={d.key} style={styles.dim}>
            <Text style={styles.dimLabel}>{d.label}</Text>
            <View style={styles.scale}>
              {[1, 2, 3, 4, 5].map((n) => {
                const selected = values[d.key] === n;
                return (
                  <Pressable
                    key={n}
                    style={[styles.dot, selected && styles.dotOn]}
                    onPress={() => setValues((v) => ({ ...v, [d.key]: n }))}
                  >
                    <Text style={[styles.dotText, selected && styles.dotTextOn]}>{n}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.anchors}>
              <Text style={styles.anchor}>{d.low}</Text>
              <Text style={styles.anchor}>{d.high}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.noteLabel}>Algo que quieras anotar? (opcional)</Text>
        <TextInput
          style={styles.noteInput}
          placeholder="Escribe libremente..."
          multiline
          value={note}
          onChangeText={setNote}
          maxLength={2000}
          editable={!saving}
        />
        <Text style={styles.notePrivacy}>
          Tu texto es privado. Tu tutor solo ve resumenes, nunca lo que escribes aqui.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!complete || saving) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!complete || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar check-in</Text>
          )}
        </Pressable>

        <Pressable style={styles.linkBtn} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.linkText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingVertical: 16, gap: 4 },
  title: { fontSize: 26, fontWeight: '700', color: '#208AEF' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 12 },
  dim: { marginTop: 14 },
  dimLabel: { fontSize: 16, fontWeight: '600', color: '#222', marginBottom: 8 },
  scale: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c9d6e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  dotText: { fontSize: 16, color: '#5a6b7b', fontWeight: '600' },
  dotTextOn: { color: '#fff' },
  anchors: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  anchor: { fontSize: 11, color: '#9aa5b1' },
  noteLabel: { fontSize: 15, fontWeight: '600', color: '#222', marginTop: 22 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  notePrivacy: { fontSize: 12, color: '#1e7e34', marginTop: 6 },
  error: { color: '#c0392b', fontSize: 14, marginTop: 12 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: 12 },
  linkText: { color: '#888', fontSize: 15 },
  doneWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  doneTitle: { fontSize: 22, fontWeight: '700', color: '#1e7e34', textAlign: 'center' },
  doneSub: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 12 },
});
