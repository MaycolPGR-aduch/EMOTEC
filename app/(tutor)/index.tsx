import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import { getTutorDashboard, type DashboardRow } from '@/lib/tutor';
import type { AlertLevel } from '@/lib/alerts';

const NIVEL_COLOR: Record<AlertLevel, string> = {
  informativa: '#7a8a99',
  preventiva: '#c9902a',
  prioritaria: '#d96a2a',
  critica: '#c0392b',
};
const NIVEL_LABEL: Record<AlertLevel, string> = {
  informativa: 'Informativa',
  preventiva: 'Preventiva',
  prioritaria: 'Prioritaria',
  critica: 'Critica',
};

function diasDesde(dateStr: string | null): string {
  if (!dateStr) return 'sin check-ins';
  const [y, m, d] = dateStr.split('-').map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dias = Math.round((today - then) / 86400000);
  if (dias <= 0) return 'hoy';
  if (dias === 1) return 'ayer';
  return `hace ${dias} dias`;
}

export default function TutorHome() {
  const { profile, signOut } = useSession();
  const [rows, setRows] = useState<DashboardRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTutorDashboard().then((r) => {
        if (active) setRows(r);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis estudiantes</Text>
          <Text style={styles.sub}>{profile?.full_name ?? profile?.email}</Text>
        </View>
        <Link href="/ayuda" asChild>
          <Pressable>
            <Text style={styles.link}>Ayuda</Text>
          </Pressable>
        </Link>
      </View>

      {rows === null ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {rows.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.empty}>
                Aun no tienes estudiantes asignados. Un administrador debe asignarte.
              </Text>
            </View>
          )}

          {rows.map((s) => (
            <Link key={s.student_id} href={{ pathname: '/estudiante/[id]', params: { id: s.student_id } }} asChild>
              <Pressable style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{s.full_name ?? 'Estudiante'}</Text>
                  {s.open_alerts > 0 && s.max_level && (
                    <View style={[styles.badge, { backgroundColor: NIVEL_COLOR[s.max_level] }]}>
                      <Text style={styles.badgeText}>
                        {s.open_alerts} · {NIVEL_LABEL[s.max_level]}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.meta}>Ultimo check-in: {diasDesde(s.last_checkin)}</Text>
              </Pressable>
            </Link>
          ))}

          <Text style={styles.note}>
            Ves indicadores y senales resumidas, no las respuestas privadas de cada estudiante.
          </Text>
        </ScrollView>
      )}

      <Pressable style={styles.logout} onPress={signOut}>
        <Text style={styles.logoutText}>Cerrar sesion</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fa' },
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eef1f4',
    gap: 6,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#222' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 13, color: '#888' },
  empty: { fontSize: 15, color: '#666', textAlign: 'center' },
  note: { fontSize: 12, color: '#9aa5b1', textAlign: 'center', marginTop: 8, paddingHorizontal: 8 },
  logout: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  logoutText: { color: '#c0392b', fontSize: 15, fontWeight: '600' },
});
