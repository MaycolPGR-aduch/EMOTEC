import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveTermometro } from '@/lib/activities';
import { AppText, Button, ContextPicker, IntensityScale, Screen } from '@/components/ui';
import { color, space } from '@/theme';

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
    <Screen scroll background="surface" contentContainerStyle={styles.content}>
      <AppText variant="h1" color={color.brand}>
        Termometro emocional
      </AppText>
      <AppText variant="body" color={color.textSecondary}>
        Que tan intenso es lo que sientes ahora mismo?
      </AppText>

      <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
        Intensidad
      </AppText>
      <IntensityScale value={intensity} onChange={setIntensity} />
      <View style={styles.anchors}>
        <AppText variant="caption" color={color.textFaint}>
          0 · nada
        </AppText>
        <AppText variant="caption" color={color.textFaint}>
          10 · muchisimo
        </AppText>
      </View>

      <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
        Con que se relaciona? (opcional)
      </AppText>
      <ContextPicker value={context} onChange={setContext} />

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button
        title="Guardar"
        onPress={onSave}
        loading={saving}
        disabled={intensity == null}
        style={styles.save}
      />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm },
  label: { marginTop: space.lg },
  anchors: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  save: { marginTop: space.xl },
});
