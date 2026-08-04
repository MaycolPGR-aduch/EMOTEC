import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import { saveEvent, type EventArea, type EventImpact } from '@/lib/events';
import { AppText, Button, Callout, Chip, Field, IntensityScale, Screen } from '@/components/ui';
import { color, space } from '@/theme';

const AREAS: { key: EventArea; label: string }[] = [
  { key: 'academica', label: 'Academica' },
  { key: 'social', label: 'Social' },
  { key: 'familiar', label: 'Familiar' },
  { key: 'personal', label: 'Personal' },
  { key: 'salud', label: 'Salud' },
  { key: 'economia', label: 'Economia' },
  { key: 'otra', label: 'Otra' },
];

const IMPACTOS: { key: EventImpact; label: string }[] = [
  { key: 'positivo', label: 'Positivo' },
  { key: 'negativo', label: 'Negativo' },
  { key: 'mixto', label: 'Mixto' },
];

export default function Evento() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [area, setArea] = useState<EventArea | null>(null);
  const [impact, setImpact] = useState<EventImpact | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [control, setControl] = useState<number | null>(null);
  const [support, setSupport] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = area && impact && intensity != null && control != null && support != null;

  async function onSave() {
    if (!complete) return setError('Completa el area, el impacto y las tres escalas.');
    setError(null);
    setSaving(true);
    const res = await saveEvent(userId, {
      area: area!,
      impact: impact!,
      intensity: intensity!,
      perceivedControl: control!,
      supportReceived: support!,
      note,
    });
    setSaving(false);
    if (res.error) setError(res.error);
    else router.back();
  }

  return (
    <Screen header={{ title: 'Evento e impacto' }} scroll keyboardAvoiding background="surface">
      <AppText variant="body" color={color.textSecondary}>
        Paso algo que te movio? Registrarlo ayuda a entender que influye en como te sientes.
      </AppText>

      <Label>De que area?</Label>
      <View style={styles.chips}>
        {AREAS.map((a) => (
          <Chip key={a.key} label={a.label} selected={area === a.key} onPress={() => setArea(a.key)} />
        ))}
      </View>

      <Label>Como te afecto?</Label>
      <View style={styles.chips}>
        {IMPACTOS.map((i) => (
          <Chip key={i.key} label={i.label} selected={impact === i.key} onPress={() => setImpact(i.key)} />
        ))}
      </View>

      <Label>Que tan intenso fue? (0 a 10)</Label>
      <IntensityScale value={intensity} onChange={setIntensity} />

      <Label>Cuanto sentiste que dependia de ti? (0 a 10)</Label>
      <IntensityScale value={control} onChange={setControl} />

      <Label>Cuanto apoyo recibiste? (0 a 10)</Label>
      <IntensityScale value={support} onChange={setSupport} />

      <View style={styles.note}>
        <Field
          label="Quieres anotar algo? (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Que paso, en pocas palabras..."
          multiline
          maxLength={2000}
          editable={!saving}
        />
      </View>
      <Callout tone="privacy">Lo que escribas es privado. Tu tutor no lo ve.</Callout>

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button title="Guardar" onPress={onSave} loading={saving} disabled={!complete} style={styles.save} />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <AppText variant="bodyStrong" color={color.textStrong} style={styles.label}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  note: { marginTop: space.md },
  save: { marginTop: space.md },
});
