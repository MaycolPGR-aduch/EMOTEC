import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { PRIMARY_EMOTIONS, saveRueda } from '@/lib/activities';
import { ContextPicker, IntensityScale } from '@/components/wellness-inputs';

export default function Rueda() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [primary, setPrimary] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [context, setContext] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const secondaryOptions = useMemo(
    () => PRIMARY_EMOTIONS.find((e) => e.label === primary)?.secondary ?? [],
    [primary],
  );

  function pickPrimary(label: string) {
    setPrimary(label);
    setSecondary(null); // las secundarias dependen de la primaria
  }

  async function onSave() {
    if (!primary) {
      setError('Elige al menos una emocion principal.');
      return;
    }
    if (intensity == null) {
      setError('Indica la intensidad.');
      return;
    }
    setError(null);
    setSaving(true);
    const res = await saveRueda(userId, primary, secondary, intensity, context);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Rueda de emociones</Text>
        <Text style={styles.subtitle}>Que emocion describe mejor como te sientes?</Text>

        <Text style={styles.label}>Emocion principal</Text>
        <View style={styles.chips}>
          {PRIMARY_EMOTIONS.map((e) => {
            const on = primary === e.label;
            return (
              <Pressable
                key={e.key}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => pickPrimary(e.label)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{e.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {primary && secondaryOptions.length > 0 && (
          <>
            <Text style={styles.label}>Mas especifico? (opcional)</Text>
            <View style={styles.chips}>
              {secondaryOptions.map((s) => {
                const on = secondary === s;
                return (
                  <Pressable
                    key={s}
                    style={[styles.chipSm, on && styles.chipOn]}
                    onPress={() => setSecondary(on ? null : s)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Intensidad</Text>
        <IntensityScale value={intensity} onChange={setIntensity} />

        <Text style={styles.label}>Con que se relaciona? (opcional)</Text>
        <ContextPicker value={context} onChange={setContext} />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.button, (!primary || intensity == null || saving) && styles.buttonDisabled]}
          onPress={onSave}
          disabled={!primary || intensity == null || saving}
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
  content: { padding: 24, gap: 6 },
  title: { fontSize: 24, fontWeight: '700', color: '#208AEF' },
  subtitle: { fontSize: 15, color: '#666', marginBottom: 8 },
  label: { fontSize: 16, fontWeight: '600', color: '#222', marginTop: 18, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#c9d6e5',
  },
  chipSm: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c9d6e5',
  },
  chipOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#5a6b7b' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
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
