import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  createWorry,
  deleteWorry,
  getOpenWorries,
  getResolvedWorries,
  resolveWorry,
  type Worry,
} from '@/lib/worries';
import { logDailyActivity } from '@/lib/activity-log';
import { AppText, Button, Card, Chip, Field, Screen, SupportLink } from '@/components/ui';
import { color, space } from '@/theme';

type Vista = 'lista' | 'escribir' | 'clasificar' | 'plan';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCorta(d: string): string {
  const [, m, day] = d.split('-');
  return `${Number(day)} ${MESES[Number(m) - 1]}`;
}
function hoyMas(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const FECHAS = [
  { label: 'Hoy', value: hoyMas(0) },
  { label: 'Manana', value: hoyMas(1) },
  { label: 'Esta semana', value: hoyMas(7) },
  { label: 'Sin fecha', value: null as string | null },
];

export default function Caja() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [worries, setWorries] = useState<Worry[] | null>(null);
  const [resueltas, setResueltas] = useState<Worry[]>([]);
  const [vista, setVista] = useState<Vista>('lista');
  const [texto, setTexto] = useState('');
  const [paso, setPaso] = useState('');
  const [fecha, setFecha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getOpenWorries(userId).then(setWorries);
    getResolvedWorries(userId).then(setResueltas);
  }, [userId]);

  useFocusEffect(useCallback(() => load(), [load]));

  function reset() {
    setTexto('');
    setPaso('');
    setFecha(null);
    setVista('lista');
  }

  async function guardar(actionable: boolean) {
    setBusy(true);
    // Modo diaria: una sesion por dia, aunque anote varias preocupaciones.
    const { id } = await logDailyActivity(userId, 'caja_preocupaciones');
    const res = await createWorry(userId, texto, actionable, actionable ? paso : null, actionable ? fecha : null, id);
    setBusy(false);
    if (res.error) Alert.alert('Error', res.error);
    else {
      reset();
      load();
    }
  }

  async function marcarResuelta(w: Worry) {
    await resolveWorry(w.id);
    load();
  }

  function borrar(w: Worry) {
    Alert.alert('Borrar', 'Se elimina de inmediato y no se puede recuperar.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          await deleteWorry(w.id);
          load();
        },
      },
    ]);
  }

  // --- Escribir ---
  if (vista === 'escribir') {
    return (
      <Screen scroll keyboardAvoiding background="surface" footer={<SupportLink />} contentContainerStyle={styles.wizard}>
        <AppText variant="h1" color={color.brand}>
          Que te preocupa?
        </AppText>
        <AppText variant="body" color={color.textSecondary}>
          Escribelo tal cual esta en tu cabeza. Sacarlo ya ayuda.
        </AppText>
        <Field value={texto} onChangeText={setTexto} placeholder="Escribe aqui..." multiline maxLength={1000} autoFocus />
        <Button title="Siguiente" onPress={() => setVista('clasificar')} disabled={!texto.trim()} />
        <Button title="Atras" variant="ghost" onPress={reset} />
      </Screen>
    );
  }

  // --- Clasificar ---
  if (vista === 'clasificar') {
    return (
      <Screen scroll background="surface" footer={<SupportLink />} contentContainerStyle={styles.wizard}>
        <AppText variant="h1" color={color.brand}>
          Puedes hacer algo sobre esto ahora?
        </AppText>
        <AppText variant="body" color={color.textSecondary}>
          No todo depende de nosotros, y esta bien. Reconocerlo tambien ayuda.
        </AppText>
        <Button title="Si, algo puedo hacer" onPress={() => setVista('plan')} disabled={busy} />
        <Button
          title={busy ? 'Guardando...' : 'No depende de mi ahora, la guardo'}
          variant="secondary"
          onPress={() => guardar(false)}
          disabled={busy}
        />
        <Button title="Atras" variant="ghost" onPress={() => setVista('escribir')} />
      </Screen>
    );
  }

  // --- Plan ---
  if (vista === 'plan') {
    return (
      <Screen scroll keyboardAvoiding background="surface" footer={<SupportLink />} contentContainerStyle={styles.wizard}>
        <AppText variant="h1" color={color.brand}>
          Cual seria un primer paso pequeno?
        </AppText>
        <AppText variant="body" color={color.textSecondary}>
          No tiene que resolverlo todo. Solo un paso alcanzable.
        </AppText>
        <Field value={paso} onChangeText={setPaso} placeholder="Ej. escribirle al profesor..." multiline maxLength={500} />
        <AppText variant="bodyStrong" color={color.textStrong}>
          Para cuando?
        </AppText>
        <View style={styles.chips}>
          {FECHAS.map((f) => (
            <Chip key={f.label} label={f.label} selected={fecha === f.value} onPress={() => setFecha(f.value)} />
          ))}
        </View>
        <Button title={busy ? 'Guardando...' : 'Guardar plan'} onPress={() => guardar(true)} disabled={!paso.trim() || busy} />
        <Button title="Atras" variant="ghost" onPress={() => setVista('clasificar')} />
      </Screen>
    );
  }

  // --- Lista (caja) ---
  return (
    <Screen
      header={{ title: 'Caja de preocupaciones' }}
      scroll
      loading={worries === null}
      background="surface"
    >
      <Button title="Anotar una preocupacion" onPress={() => setVista('escribir')} />

      {worries?.length === 0 && (
        <AppText variant="body" color={color.textMuted} align="center">
          Tu caja esta vacia. Cuando algo te preocupe, anotalo aqui.
        </AppText>
      )}

      {worries?.map((w) => (
        <Card key={w.id} style={styles.card}>
          <AppText variant="bodyStrong" color={color.textStrong} weight="regular">
            {w.body}
          </AppText>
          {w.actionable && w.first_step && (
            <View style={styles.plan}>
              <AppText variant="caption" color={color.brandInk} weight="bold">
                PRIMER PASO
              </AppText>
              <AppText variant="body" color={color.textDefault}>
                {w.first_step}
              </AppText>
              {w.target_date && (
                <AppText variant="caption" color={color.textMuted}>
                  para el {fechaCorta(w.target_date)}
                </AppText>
              )}
            </View>
          )}
          {!w.actionable && (
            <AppText variant="small" color={color.textFaint}>
              Guardada para revisar mas adelante.
            </AppText>
          )}
          <View style={styles.cardActions}>
            <Pressable onPress={() => marcarResuelta(w)}>
              <AppText variant="small" weight="semibold" color={color.success}>
                Marcar resuelta
              </AppText>
            </Pressable>
            <Pressable onPress={() => borrar(w)}>
              <AppText variant="small" color={color.danger}>
                Borrar
              </AppText>
            </Pressable>
          </View>
        </Card>
      ))}

      {resueltas.length > 0 && (
        <>
          <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
            Resueltas ({resueltas.length})
          </AppText>
          {resueltas.map((w) => (
            <Card key={w.id} variant="brandSubtle" style={styles.card}>
              <AppText variant="body" color={color.textSecondary}>
                {w.body}
              </AppText>
            </Card>
          ))}
        </>
      )}

      <SupportLink />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wizard: { gap: space.md },
  card: { gap: space.sm },
  plan: { backgroundColor: color.surfaceBrand, borderRadius: space.sm, padding: space.md - 2, gap: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  section: { marginTop: space.md },
});
