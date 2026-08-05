import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import { getLatestCheckin, todayStr } from '@/lib/checkins';
import { getGamification, type Gamification } from '@/lib/wellness';
import { getOpenAlerts, mensajeApoyo, nivelMasAlto, type AlertLevel } from '@/lib/alerts';
import { getSharedFollowups, type SharedFollowup } from '@/lib/tutor';
import { AppText, Button, Card, Screen, SupportLink } from '@/components/ui';
import { color, radius, space } from '@/theme';

export default function Home() {
  const { profile, session, hasConsent, signOut, revokeConsent } = useSession();
  const userId = session!.user.id;
  const [checkedToday, setCheckedToday] = useState<boolean | null>(null);
  const [gam, setGam] = useState<Gamification | null>(null);
  const [apoyo, setApoyo] = useState<AlertLevel | null>(null);
  const [followups, setFollowups] = useState<SharedFollowup[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getLatestCheckin(userId).then((latest) => {
        if (active) setCheckedToday(!!latest && latest.local_date === todayStr());
      });
      getGamification(userId).then((g) => {
        if (active) setGam(g);
      });
      getOpenAlerts(userId).then((a) => {
        if (active) setApoyo(nivelMasAlto(a));
      });
      getSharedFollowups(userId).then((f) => {
        if (active) setFollowups(f);
      });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  function onRevoke() {
    Alert.alert(
      'Revocar consentimiento',
      'Si revocas, la app dejara de guardar nuevos datos de bienestar. Tu historial ' +
        'no se borra de inmediato. Podras volver a aceptar cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            const res = await revokeConsent('revocado por el usuario');
            if (res.error) Alert.alert('No se pudo revocar', res.error);
          },
        },
      ],
    );
  }

  return (
    <Screen scroll background="surface" contentContainerStyle={styles.container}>
      <AppText variant="display" color={color.brand}>
        EMOTEC
      </AppText>
      <AppText variant="subtitle" color={color.textDefault}>
        Hola, {profile?.full_name ?? 'estudiante'}
      </AppText>

      {/* Estado del check-in de hoy */}
      <View
        style={[
          styles.banner,
          { backgroundColor: checkedToday ? color.successSurface : color.warningSurface },
        ]}
      >
        <AppText variant="body" weight="semibold" color={color.textStrong}>
          {checkedToday === null
            ? 'Cargando...'
            : checkedToday
              ? 'Ya hiciste tu check-in de hoy'
              : 'Aun no has hecho tu check-in de hoy'}
        </AppText>
      </View>

      <Button
        title={checkedToday ? 'Ver / rehacer check-in' : 'Hacer check-in de hoy'}
        onPress={() => router.push('/checkin')}
      />

      {/* Puntos y racha (calculados por el servidor) */}
      <View style={styles.stats}>
        <Stat value={gam?.points ?? 0} label="Puntos" />
        <View style={styles.statDivider} />
        <Stat value={gam?.current_streak ?? 0} label="Racha (dias)" />
      </View>

      {/* Mensajes que el tutor marco como visibles. Antes se escribian y el
          estudiante no los veia jamas. */}
      {followups.length > 0 && (
        <Card style={styles.followups}>
          <AppText variant="bodyStrong" color={color.textStrong}>
            De tu tutor
          </AppText>
          {followups.map((f) => (
            <AppText key={f.id} variant="body" color={color.textDefault}>
              {f.notes ?? 'Registro de seguimiento.'}
            </AppText>
          ))}
        </Card>
      )}

      {apoyo && <TarjetaApoyo level={apoyo} />}

      <Button
        title="Actividades de bienestar"
        variant="secondary"
        onPress={() => router.push('/actividades')}
      />
      <Button
        title="Mi reporte semanal"
        variant="secondary"
        onPress={() => router.push('/reporte')}
      />
      <View style={styles.rowLinks}>
        <Button title="Historial" variant="secondary" onPress={() => router.push('/historial')} style={styles.flex1} />
        <Button title="Mi progreso" variant="secondary" onPress={() => router.push('/progreso')} style={styles.flex1} />
      </View>

      <View style={styles.spacer} />

      <SupportLink />
      {hasConsent && (
        <Pressable onPress={onRevoke}>
          <AppText variant="body" color={color.textFaint} align="center">
            Revocar consentimiento
          </AppText>
        </Pressable>
      )}
      <Pressable onPress={signOut}>
        <AppText variant="body" color={color.textFaint} align="center">
          Cerrar sesion
        </AppText>
      </Pressable>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="h1" color={color.brand}>
        {String(value)}
      </AppText>
      <AppText variant="caption" color={color.textMuted}>
        {label}
      </AppText>
    </View>
  );
}

function TarjetaApoyo({ level }: { level: AlertLevel }) {
  const m = mensajeApoyo(level);
  return (
    <Card variant="brandSubtle" style={styles.apoyo}>
      <AppText variant="bodyStrong" color={color.brandInk}>
        {m.titulo}
      </AppText>
      <AppText variant="body" color={color.textDefault}>
        {m.cuerpo}
      </AppText>
      <Button title={m.accion} size="md" onPress={() => router.push(m.destino)} />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: space.xxl },
  banner: { borderRadius: radius.lg, padding: space.lg, marginTop: space.sm },
  stats: {
    flexDirection: 'row',
    backgroundColor: color.surfaceBrand,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32, backgroundColor: color.borderInput },
  rowLinks: { flexDirection: 'row', gap: space.md },
  flex1: { flex: 1 },
  spacer: { flex: 1, minHeight: space.lg },
  apoyo: { gap: space.sm },
  followups: { gap: space.sm },
});
