import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  createCheckin,
  deleteCheckin,
  getLatestCheckin,
  todayStr,
  type CheckinValues,
} from '@/lib/checkins';
import { recompute } from '@/lib/wellness';
import { AppText, Button, Callout, Field, IntensityScale, Screen } from '@/components/ui';
import { color, space } from '@/theme';

type Dim = { key: keyof CheckinValues; label: string; low: string; high: string };

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
      if (latest && latest.local_date === todayStr()) setAlreadyToday({ id: latest.id });
      setLoading(false);
    });
  }, [userId]);

  const complete = DIMS.every((d) => values[d.key] != null);

  async function onSave() {
    if (!complete) return setError('Responde los 6 indicadores antes de guardar.');
    setError(null);
    setSaving(true);
    const res = await createCheckin(userId, values as CheckinValues, note);
    if (res.duplicate) {
      setSaving(false);
      setError('Ya registraste tu check-in de hoy.');
      setAlreadyToday({ id: '' });
      return;
    }
    if (res.error) {
      setSaving(false);
      setError(res.error);
      return;
    }
    await recompute();
    setSaving(false);
    router.back();
  }

  async function onRedo() {
    if (!alreadyToday?.id) return setAlreadyToday(null);
    setSaving(true);
    const res = await deleteCheckin(alreadyToday.id);
    setSaving(false);
    if (res.error) setError(res.error);
    else setAlreadyToday(null);
  }

  if (loading) return <Screen loading background="surface" />;

  if (alreadyToday) {
    return (
      <Screen background="surface" center contentContainerStyle={styles.done}>
        <AppText variant="hero" color={color.success} align="center">
          Ya hiciste tu check-in de hoy
        </AppText>
        <AppText variant="body" color={color.textSecondary} align="center">
          Vuelve manana para seguir tu evolucion.
        </AppText>
        <Button title="Volver" onPress={() => router.back()} style={styles.top} />
        <Button
          title={saving ? 'Rehaciendo...' : 'Rehacer el de hoy'}
          variant="ghost"
          onPress={onRedo}
          disabled={saving}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding background="surface" contentContainerStyle={styles.content}>
      <AppText variant="hero" color={color.brand}>
        Como estas hoy?
      </AppText>
      <AppText variant="body" color={color.textSecondary}>
        Toma menos de un minuto.
      </AppText>

      {DIMS.map((d) => (
        <View key={d.key} style={styles.dim}>
          <AppText variant="bodyStrong" color={color.textStrong}>
            {d.label}
          </AppText>
          <IntensityScale value={values[d.key] ?? null} onChange={(n) => setValues((v) => ({ ...v, [d.key]: n }))} min={1} max={5} />
          <View style={styles.anchors}>
            <AppText variant="caption" color={color.textFaint}>
              {d.low}
            </AppText>
            <AppText variant="caption" color={color.textFaint}>
              {d.high}
            </AppText>
          </View>
        </View>
      ))}

      <View style={styles.note}>
        <Field
          label="Algo que quieras anotar? (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Escribe libremente..."
          multiline
          maxLength={2000}
          editable={!saving}
        />
      </View>
      <Callout tone="privacy">
        Tu texto es privado. Tu tutor solo ve resumenes, nunca lo que escribes aqui.
      </Callout>

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button title="Guardar check-in" onPress={onSave} loading={saving} disabled={!complete} style={styles.top} />
      <Button title="Cancelar" variant="ghost" onPress={() => router.back()} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xs },
  dim: { marginTop: space.md, gap: space.sm },
  anchors: { flexDirection: 'row', justifyContent: 'space-between' },
  note: { marginTop: space.lg },
  top: { marginTop: space.lg },
  done: { gap: space.md, paddingHorizontal: space.xxl },
});
