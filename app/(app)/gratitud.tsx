import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveGratitude } from '@/lib/activities';
import { logActivityEvent } from '@/lib/activity-log';
import { AppText, Button, Callout, Field, RatingStars, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Gratitud() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [items, setItems] = useState(['', '', '']);
  const [rating, setRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayAlgo = items.some((x) => x.trim().length > 0);

  function setItem(i: number, v: string) {
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  }

  async function onSave() {
    if (!hayAlgo) return setError('Escribe al menos una cosa buena.');
    setError(null);
    setSaving(true);
    const filled = items.filter((x) => x.trim().length > 0).length;
    const { id } = await logActivityEvent(userId, 'tres_cosas_buenas', { stepReached: filled, rating });
    const res = await saveGratitude(userId, items, id);
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <Screen scroll keyboardAvoiding background="surface" contentContainerStyle={styles.content}>
      <AppText variant="h1" color={color.brand}>
        Tres cosas buenas
      </AppText>
      <AppText variant="body" color={color.textSecondary}>
        Anota hasta tres cosas buenas de tu dia, por pequenas que sean. No tienen que ser grandes.
      </AppText>

      {items.map((v, i) => (
        <Field
          key={i}
          value={v}
          onChangeText={(t) => setItem(i, t)}
          placeholder={`Cosa buena ${i + 1}`}
          maxLength={300}
          editable={!saving}
        />
      ))}

      <Callout tone="privacy">
        Lo que escribas aqui es privado. Tu tutor no lo ve, igual que tu diario.
      </Callout>

      <AppText variant="small" color={color.textMuted} align="center" style={styles.ratingLabel}>
        Te resulto util? (opcional)
      </AppText>
      <RatingStars value={rating} onChange={setRating} size={32} />

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button title="Guardar" onPress={onSave} loading={saving} disabled={!hayAlgo} style={styles.save} />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md },
  save: { marginTop: space.sm },
  ratingLabel: { marginTop: space.sm },
});
