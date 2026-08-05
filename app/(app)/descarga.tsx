import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  createTask,
  deleteTask,
  getActiveTasks,
  setStatus,
  type AcademicTask,
} from '@/lib/academic-tasks';
import { AppText, Button, Callout, Card, Field, Icon, Screen } from '@/components/ui';
import { color, space } from '@/theme';

const MAX_HOY = 3;

export default function Descarga() {
  const { session } = useSession();
  const userId = session!.user.id;
  const [tasks, setTasks] = useState<AcademicTask[] | null>(null);
  const [nueva, setNueva] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getActiveTasks(userId).then(setTasks);
  }, [userId]);

  useFocusEffect(useCallback(() => load(), [load]));

  const hoy = tasks?.filter((t) => t.status === 'hoy') ?? [];
  const pendientes = tasks?.filter((t) => t.status === 'pendiente') ?? [];
  const hoyLleno = hoy.length >= MAX_HOY;

  async function agregar() {
    if (!nueva.trim()) return;
    setBusy(true);
    const res = await createTask(userId, nueva);
    setBusy(false);
    if (res.error) Alert.alert('Error', res.error);
    else {
      setNueva('');
      load();
    }
  }

  async function cambiar(t: AcademicTask, status: 'pendiente' | 'hoy' | 'hecha') {
    await setStatus(t.id, status);
    load();
  }

  function borrar(t: AcademicTask) {
    Alert.alert('Borrar', `Quitar "${t.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: async () => { await deleteTask(t.id); load(); } },
    ]);
  }

  return (
    <Screen header={{ title: 'Descarga academica' }} scroll keyboardAvoiding loading={tasks === null} background="canvas">
      <Callout tone="info">
        Sacar los pendientes de la cabeza y ponerlos aqui baja la carga mental. Luego elige 1 a 3
        para hoy: menos es mas realista.
      </Callout>

      <View style={styles.addRow}>
        <View style={styles.flex1}>
          <Field value={nueva} onChangeText={setNueva} placeholder="Anota un pendiente..." maxLength={200} editable={!busy} />
        </View>
        <Button title="Anadir" size="md" onPress={agregar} disabled={!nueva.trim() || busy} />
      </View>

      {/* Para hoy */}
      <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
        Para hoy ({hoy.length}/{MAX_HOY})
      </AppText>
      {hoy.length === 0 && (
        <AppText variant="small" color={color.textMuted}>
          Elige de tus pendientes lo que quieras enfocar hoy.
        </AppText>
      )}
      {hoy.map((t) => (
        <Card key={t.id} variant="brandSubtle" style={styles.task}>
          <Pressable style={styles.check} onPress={() => cambiar(t, 'hecha')} hitSlop={6}>
            <Icon name="check" size={18} color={color.brand} />
          </Pressable>
          <AppText variant="body" color={color.textStrong} style={styles.flex1}>
            {t.title}
          </AppText>
          <Pressable onPress={() => cambiar(t, 'pendiente')} hitSlop={6}>
            <AppText variant="small" color={color.textMuted}>
              quitar
            </AppText>
          </Pressable>
        </Card>
      ))}

      {/* Pendientes */}
      <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
        Pendientes ({pendientes.length})
      </AppText>
      {pendientes.length === 0 && (
        <AppText variant="small" color={color.textMuted}>
          Sin pendientes anotados.
        </AppText>
      )}
      {pendientes.map((t) => (
        <Card key={t.id} style={styles.task}>
          <AppText variant="body" color={color.textDefault} style={styles.flex1}>
            {t.title}
          </AppText>
          <Button
            title="Para hoy"
            size="md"
            variant="secondary"
            onPress={() => cambiar(t, 'hoy')}
            disabled={hoyLleno}
          />
          <Pressable onPress={() => borrar(t)} hitSlop={6} style={styles.del}>
            <Icon name="delete" size={18} color={color.textMuted} />
          </Pressable>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  flex1: { flex: 1 },
  section: { marginTop: space.md },
  task: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: color.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  del: { padding: space.xs },
});
