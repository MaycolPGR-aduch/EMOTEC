import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import { getTutorDashboard, type DashboardRow } from '@/lib/tutor';
import type { AlertLevel } from '@/lib/alerts';
import { AppText, Card, ScreenHeader } from '@/components/ui';
import { color, radius, space } from '@/theme';

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
      <ScreenHeader
        title="Mis estudiantes"
        subtitle={profile?.full_name ?? profile?.email ?? undefined}
        showClose={false}
        right={
          <Link href="/ayuda">
            <AppText variant="body" weight="semibold" color={color.brand}>
              Ayuda
            </AppText>
          </Link>
        }
      />

      {rows === null ? null : (
        <View style={styles.content}>
          {rows.length === 0 && (
            <Card>
              <AppText variant="body" color={color.textSecondary} align="center">
                Aun no tienes estudiantes asignados. Un administrador debe asignarte.
              </AppText>
            </Card>
          )}

          {rows.map((s) => (
            <Card
              key={s.student_id}
              onPress={() => router.push({ pathname: '/estudiante/[id]', params: { id: s.student_id } })}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <AppText variant="bodyStrong" color={color.textStrong}>
                  {s.full_name ?? 'Estudiante'}
                </AppText>
                {s.open_alerts > 0 && s.max_level && (
                  <View style={[styles.badge, { backgroundColor: color.alert[s.max_level] }]}>
                    <AppText variant="caption" weight="bold" color={color.onBrand}>
                      {s.open_alerts} · {NIVEL_LABEL[s.max_level]}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="small" color={color.textMuted}>
                Ultimo check-in: {diasDesde(s.last_checkin)}
              </AppText>
            </Card>
          ))}

          <AppText variant="caption" color={color.textFaint} align="center">
            Ves indicadores y senales resumidas, no las respuestas privadas de cada estudiante.
          </AppText>
        </View>
      )}

      <Pressable style={styles.logout} onPress={signOut}>
        <AppText variant="body" weight="semibold" color={color.danger} align="center">
          Cerrar sesion
        </AppText>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.lg, gap: space.md - 2, flex: 1 },
  card: { gap: space.xs + 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { borderRadius: radius.lg, paddingHorizontal: space.md - 2, paddingVertical: space.xs },
  logout: {
    paddingVertical: space.md + 2,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
});
