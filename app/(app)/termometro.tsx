import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveTermometro } from '@/lib/activities';
import { ContextPicker, IntensityScale } from '@/components/wellness-inputs';

export default function Termometro() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [intensity, setIntensity] = useState<number | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (intensity == null) {
      setError('Elige un nivel de intensidad.');
      return;
    }
    setError(null);
    setSaving(true);
    const res = await saveTermometro(userId, intensity, context);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Termometro emocional</Text>
        <Text style={styles.subtitle}>
          Que tan intenso es lo que sientes ahora mismo?
        </Text>

        <Text style={styles.label}>Intensidad</Text>
        <IntensityScale value={intensity} onChange={setIntensity} />
        <View style={styles.anchors}>
          <Text style={styles.anchor}>0 · nada</Text>
          <Text style={styles.anchor}>10 · muchisimo</Text>
        </View>

        <Text style={styles.label}>Con que se relaciona? (opcional)</Text>
        <ContextPicker value={context} onChange={setContext} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (intensity == null || saving) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={intensity == null || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Guardar</Text>
          )}
        </Pressable>
        <Pressable style={styles.cancel} onPress={() => router.back()} disabled={saving}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: '700', color: '#208AEF' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '600', color: '#222', marginTop: 18, marginBottom: 10 },
  anchors: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  anchor: { fontSize: 12, color: '#9aa5b1' },
  error: { color: '#c0392b', fontSize: 14, marginTop: 14 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#888', fontSize: 15 },
});
