import { useState } from 'react';
import {
  ActivityIndicator,
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
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { logActivitySession, saveGratitude } from '@/lib/activities';

export default function Gratitud() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [items, setItems] = useState(['', '', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayAlgo = items.some((x) => x.trim().length > 0);

  function setItem(i: number, v: string) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  async function onSave() {
    if (!hayAlgo) {
      setError('Escribe al menos una cosa buena.');
      return;
    }
    setError(null);
    setSaving(true);
    const started = new Date();
    const { id } = await logActivitySession(userId, 'tres_cosas_buenas', started, 0, null);
    const res = await saveGratitude(userId, items, id);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Tres cosas buenas</Text>
          <Text style={styles.subtitle}>
            Anota hasta tres cosas buenas de tu dia, por pequenas que sean. No tienen que ser
            grandes.
          </Text>

          {items.map((v, i) => (
            <TextInput
              key={i}
              style={styles.input}
              placeholder={`Cosa buena ${i + 1}`}
              value={v}
              onChangeText={(t) => setItem(i, t)}
              maxLength={300}
              editable={!saving}
            />
          ))}

          <Text style={styles.privacy}>
            Lo que escribas aqui es privado. Tu tutor no lo ve, igual que tu diario.
          </Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, (!hayAlgo || saving) && styles.buttonDisabled]}
            onPress={onSave}
            disabled={!hayAlgo || saving}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#208AEF' },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
  },
  privacy: { fontSize: 12, color: '#1e7e34', marginTop: 4 },
  error: { color: '#c0392b', fontSize: 14 },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancel: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: '#888', fontSize: 15 },
});
