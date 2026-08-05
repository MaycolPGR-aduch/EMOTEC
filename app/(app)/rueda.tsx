import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveRueda } from '@/lib/activities';
import { logActivityEvent } from '@/lib/activity-log';
import { getEmotions, type Emotion } from '@/lib/catalogs';
import { AppText, Button, Chip, IntensityScale, LifeAreaPicker, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Rueda() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [primary, setPrimary] = useState<string | null>(null);   // code
  const [secondary, setSecondary] = useState<string | null>(null); // code
  const [intensity, setIntensity] = useState<number | null>(null);
  const [lifeArea, setLifeArea] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEmotions().then(setEmotions);
  }, []);

  const primaries = useMemo(() => emotions.filter((e) => e.parent_code === null), [emotions]);
  const secondaries = useMemo(
    () => (primary ? emotions.filter((e) => e.parent_code === primary) : []),
    [emotions, primary],
  );

  function pickPrimary(code: string) {
    setPrimary(code);
    setSecondary(null); // las secundarias dependen de la primaria
  }

  async function onSave() {
    if (!primary) return setError('Elige al menos una emocion principal.');
    if (intensity == null) return setError('Indica la intensidad.');
    setError(null);
    setSaving(true);
    const { id } = await logActivityEvent(userId, 'rueda_emociones');
    const res = await saveRueda(userId, primary, secondary, intensity, lifeArea, id);
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
        {primaries.map((e) => (
          <Chip key={e.code} label={e.label} selected={primary === e.code} onPress={() => pickPrimary(e.code)} />
        ))}
      </View>

      {primary && secondaries.length > 0 && (
        <>
          <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
            Mas especifico? (opcional)
          </AppText>
          <View style={styles.chips}>
            {secondaries.map((s) => (
              <Chip
                key={s.code}
                label={s.label}
                size="sm"
                selected={secondary === s.code}
                onPress={() => setSecondary(secondary === s.code ? null : s.code)}
              />
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
      <LifeAreaPicker value={lifeArea} onChange={setLifeArea} />

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
