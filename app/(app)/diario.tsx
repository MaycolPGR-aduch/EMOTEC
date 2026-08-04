import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveJournal } from '@/lib/journal';
import { AppText, Button, Callout, Field, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Diario() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [pleasant, setPleasant] = useState('');
  const [difficult, setDifficult] = useState('');
  const [helped, setHelped] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayAlgo = [pleasant, difficult, helped].some((x) => x.trim().length > 0);

  async function onSave() {
    if (!hayAlgo) return setError('Escribe al menos un momento de tu dia.');
    setError(null);
    setSaving(true);
    const res = await saveJournal(userId, { pleasant, difficult, helped });
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <Screen scroll keyboardAvoiding background="surface" contentContainerStyle={styles.content}>
      <AppText variant="h1" color={color.brand}>
        Tu dia en tres momentos
      </AppText>
      <AppText variant="body" color={color.textSecondary}>
        No tienes que llenar los tres. Escribe lo que te salga.
      </AppText>

      <Field
        label="Que fue agradable?"
        value={pleasant}
        onChangeText={setPleasant}
        placeholder="Un momento bueno del dia..."
        multiline
        maxLength={500}
        editable={!saving}
      />
      <Field
        label="Que fue dificil?"
        value={difficult}
        onChangeText={setDifficult}
        placeholder="Algo que te costo..."
        multiline
        maxLength={500}
        editable={!saving}
      />
      <Field
        label="Que te ayudo a seguir?"
        value={helped}
        onChangeText={setHelped}
        placeholder="Algo o alguien que te ayudo..."
        multiline
        maxLength={500}
        editable={!saving}
      />

      <Callout tone="privacy">
        Tu diario es privado. Tu tutor no lo ve, solo tu.
      </Callout>

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
});
