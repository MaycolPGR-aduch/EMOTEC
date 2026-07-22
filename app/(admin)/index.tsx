import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  async function onEnd(a: Assignment) {
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

  if (users === null) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const students = users.filter((u) => u.role === 'estudiante');
  const tutors = users.filter((u) => u.role === 'tutor');
  const nameOf = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? (u.full_name ?? u.email) : id.slice(0, 8);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Administracion</Text>
          <Text style={styles.sub}>{profile?.email}</Text>
        </View>
        <Link href="/ayuda" asChild>
          <Pressable>
            <Text style={styles.link}>Ayuda</Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Usuarios y roles */}
        <Text style={styles.section}>Usuarios ({users.length})</Text>
        {users.map((u) => (
          <View key={u.id} style={styles.card}>
            <Text style={styles.name}>{u.full_name ?? '(sin nombre)'}</Text>
            <Text style={styles.email}>{u.email}</Text>
            <View style={styles.chips}>
              {ROLES.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.chip, u.role === r && styles.chipOn]}
                  onPress={() => onSetRole(u, r)}
                  disabled={busy}
                >
                  <Text style={[styles.chipText, u.role === r && styles.chipTextOn]}>{r}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Asignar tutor */}
        <Text style={styles.section}>Asignar tutor a estudiante</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Estudiante</Text>
          <View style={styles.chips}>
            {students.length === 0 && <Text style={styles.muted}>No hay estudiantes.</Text>}
            {students.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.chip, selStudent === s.id && styles.chipOn]}
                onPress={() => setSelStudent(selStudent === s.id ? null : s.id)}
              >
                <Text style={[styles.chipText, selStudent === s.id && styles.chipTextOn]}>
                  {s.full_name ?? s.email}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Tutor</Text>
          <View style={styles.chips}>
            {tutors.length === 0 && (
              <Text style={styles.muted}>
                No hay tutores. Cambia el rol de alguien a &quot;tutor&quot; arriba.
              </Text>
            )}
            {tutors.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.chip, selTutor === t.id && styles.chipOn]}
                onPress={() => setSelTutor(selTutor === t.id ? null : t.id)}
              >
                <Text style={[styles.chipText, selTutor === t.id && styles.chipTextOn]}>
                  {t.full_name ?? t.email}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.button, (!selStudent || !selTutor || busy) && styles.buttonDisabled]}
            onPress={onAssign}
            disabled={!selStudent || !selTutor || busy}
          >
            <Text style={styles.buttonText}>Asignar</Text>
          </Pressable>
        </View>

        {/* Asignaciones activas */}
        <Text style={styles.section}>Asignaciones activas ({assignments.length})</Text>
        {assignments.length === 0 && <Text style={styles.muted}>Ninguna todavia.</Text>}
        {assignments.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.name}>{nameOf(a.student_id)}</Text>
            <Text style={styles.email}>tutor: {nameOf(a.tutor_id)}</Text>
            <Pressable style={styles.endBtn} onPress={() => onEnd(a)}>
              <Text style={styles.endText}>Terminar asignacion</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#208AEF' },
  sub: { fontSize: 12, color: '#999' },
  link: { color: '#208AEF', fontSize: 15, fontWeight: '600' },
  content: { padding: 16, gap: 10 },
  section: { fontSize: 15, fontWeight: '700', color: '#555', marginTop: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef1f4',
    gap: 6,
  },
  name: { fontSize: 15, fontWeight: '700', color: '#222' },
  email: { fontSize: 13, color: '#888' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c9d6e5',
  },
  chipOn: { backgroundColor: '#208AEF', borderColor: '#208AEF' },
  chipText: { fontSize: 13, color: '#5a6b7b' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
  muted: { fontSize: 13, color: '#999' },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  endBtn: { marginTop: 8 },
  endText: { color: '#a5811a', fontSize: 13, fontWeight: '600' },
  logout: { alignItems: 'center', paddingVertical: 18 },
  logoutText: { color: '#c0392b', fontSize: 15, fontWeight: '600' },
});
