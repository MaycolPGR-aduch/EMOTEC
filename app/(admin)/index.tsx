import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import {
  assignTutor,
  endAssignment,
  listActiveAssignments,
  listUsers,
  setRole,
  type AdminUser,
  type Assignment,
  type Role,
} from '@/lib/admin';
import { AppText, Button, Card, Chip, Screen } from '@/components/ui';
import { color, space } from '@/theme';

const ROLES: Role[] = ['estudiante', 'tutor', 'admin'];

export default function AdminHome() {
  const { profile, session, signOut } = useSession();
  const adminId = session!.user.id;
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selStudent, setSelStudent] = useState<string | null>(null);
  const [selTutor, setSelTutor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([listUsers(), listActiveAssignments()]).then(([u, a]) => {
      setUsers(u);
      setAssignments(a);
    });
  }, []);

  useFocusEffect(useCallback(() => load(), [load]));

  async function onSetRole(u: AdminUser, role: Role) {
    if (u.role === role) return;
    setBusy(true);
    const res = await setRole(u.id, role);
    setBusy(false);
    if (res.error) Alert.alert('No se pudo cambiar el rol', res.error);
    else load();
  }

  async function onAssign() {
    if (!selStudent || !selTutor) return;
    setBusy(true);
    const res = await assignTutor(selStudent, selTutor, adminId);
    setBusy(false);
    if (res.error) Alert.alert('No se pudo asignar', res.error);
    else {
      setSelStudent(null);
      setSelTutor(null);
      load();
    }
  }

  function onEnd(a: Assignment) {
    Alert.alert('Terminar asignacion', 'El tutor dejara de ver a este estudiante. Queda registro.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Terminar',
        style: 'destructive',
        onPress: async () => {
          const res = await endAssignment(a.id);
          if (res.error) Alert.alert('Error', res.error);
          else load();
        },
      },
    ]);
  }

  const students = users?.filter((u) => u.role === 'estudiante') ?? [];
  const tutors = users?.filter((u) => u.role === 'tutor') ?? [];
  const nameOf = (id: string) => {
    const u = users?.find((x) => x.id === id);
    return u ? (u.full_name ?? u.email) : id.slice(0, 8);
  };

  return (
    <Screen
      header={{
        title: 'Administracion',
        subtitle: profile?.email ?? undefined,
        showClose: false,
        right: (
          <Link href="/ayuda">
            <AppText variant="body" weight="semibold" color={color.brand}>
              Ayuda
            </AppText>
          </Link>
        ),
      }}
      scroll
      loading={users === null}
      background="canvas"
    >
      <AppText variant="bodyStrong" color={color.textSecondary}>
        Usuarios ({users?.length ?? 0})
      </AppText>
      {users?.map((u) => (
        <Card key={u.id} style={styles.card}>
          <AppText variant="bodyStrong" color={color.textStrong}>
            {u.full_name ?? '(sin nombre)'}
          </AppText>
          <AppText variant="small" color={color.textMuted}>
            {u.email}
          </AppText>
          <View style={styles.chips}>
            {ROLES.map((r) => (
              <Chip key={r} label={r} size="sm" selected={u.role === r} onPress={() => onSetRole(u, r)} disabled={busy} />
            ))}
          </View>
        </Card>
      ))}

      <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
        Asignar tutor a estudiante
      </AppText>
      <Card style={styles.card}>
        <AppText variant="small" weight="semibold" color={color.textSecondary}>
          Estudiante
        </AppText>
        <View style={styles.chips}>
          {students.length === 0 && (
            <AppText variant="small" color={color.textMuted}>
              No hay estudiantes.
            </AppText>
          )}
          {students.map((s) => (
            <Chip
              key={s.id}
              label={s.full_name ?? s.email}
              size="sm"
              selected={selStudent === s.id}
              onPress={() => setSelStudent(selStudent === s.id ? null : s.id)}
            />
          ))}
        </View>

        <AppText variant="small" weight="semibold" color={color.textSecondary}>
          Tutor
        </AppText>
        <View style={styles.chips}>
          {tutors.length === 0 && (
            <AppText variant="small" color={color.textMuted}>
              No hay tutores. Cambia el rol de alguien a &quot;tutor&quot; arriba.
            </AppText>
          )}
          {tutors.map((t) => (
            <Chip
              key={t.id}
              label={t.full_name ?? t.email}
              size="sm"
              selected={selTutor === t.id}
              onPress={() => setSelTutor(selTutor === t.id ? null : t.id)}
            />
          ))}
        </View>

        <Button title="Asignar" size="md" onPress={onAssign} disabled={!selStudent || !selTutor || busy} style={styles.assign} />
      </Card>

      <AppText variant="bodyStrong" color={color.textSecondary} style={styles.section}>
        Asignaciones activas ({assignments.length})
      </AppText>
      {assignments.length === 0 && (
        <AppText variant="small" color={color.textMuted}>
          Ninguna todavia.
        </AppText>
      )}
      {assignments.map((a) => (
        <Card key={a.id} style={styles.card}>
          <AppText variant="bodyStrong" color={color.textStrong}>
            {nameOf(a.student_id)}
          </AppText>
          <AppText variant="small" color={color.textMuted}>
            tutor: {nameOf(a.tutor_id)}
          </AppText>
          <Pressable onPress={() => onEnd(a)} style={styles.end}>
            <AppText variant="small" weight="semibold" color={color.warning}>
              Terminar asignacion
            </AppText>
          </Pressable>
        </Card>
      ))}

      <Pressable style={styles.logout} onPress={signOut}>
        <AppText variant="body" weight="semibold" color={color.danger} align="center">
          Cerrar sesion
        </AppText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs + 2 },
  section: { marginTop: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
  assign: { marginTop: space.md },
  end: { marginTop: space.xs },
  logout: { paddingVertical: space.lg },
});
