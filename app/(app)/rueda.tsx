import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { PRIMARY_EMOTIONS, saveRueda } from '@/lib/activities';
import { AppText, Button, Chip, ContextPicker, IntensityScale, Screen } from '@/components/ui';
import { color, space } from '@/theme';

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
    if (!primary) return setError('Elige al menos una emocion principal.');
    if (intensity == null) return setError('Indica la intensidad.');
    setError(null);
    setSaving(true);
    const res = await saveRueda(userId, primary, secondary, intensity, context);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <Screen scroll background="surface" contentContainerStyle={styles.content}>
      <AppText variant="h1" color={color.brand}>
        Rueda de emociones
      </AppText>
      <AppText variant="body" color={color.textSecondary}>
        Que emocion describe mejor como te sientes?
      </AppText>

      <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
        Emocion principal
      </AppText>
      <View style={styles.chips}>
        {PRIMARY_EMOTIONS.map((e) => (
          <Chip key={e.key} label={e.label} selected={primary === e.label} onPress={() => pickPrimary(e.label)} />
        ))}
      </View>

      {primary && secondaryOptions.length > 0 && (
        <>
          <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
            Mas especifico? (opcional)
          </AppText>
          <View style={styles.chips}>
            {secondaryOptions.map((s) => (
              <Chip key={s} label={s} size="sm" selected={secondary === s} onPress={() => setSecondary(secondary === s ? null : s)} />
            ))}
          </View>
        </>
      )}

      <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
        Intensidad
      </AppText>
      <IntensityScale value={intensity} onChange={setIntensity} />

      <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
        Con que se relaciona? (opcional)
      </AppText>
      <ContextPicker value={context} onChange={setContext} />

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button title="Guardar" onPress={onSave} loading={saving} disabled={!primary || intensity == null} style={styles.save} />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xs },
  label: { marginTop: space.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  save: { marginTop: space.lg },
});
