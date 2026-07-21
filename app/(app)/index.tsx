import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useFocusEffect } from 'expo-router';
import { useSession } from '@/lib/session';
import { getLatestCheckin, todayStr } from '@/lib/checkins';

export default function Home() {
  const { profile, session, hasConsent, signOut, revokeConsent } = useSession();
  const userId = session!.user.id;
  const [checkedToday, setCheckedToday] = useState<boolean | null>(null);

  // Refresca el estado del check-in cada vez que se vuelve a esta pantalla
  // (p. ej. al regresar de guardar uno).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getLatestCheckin(userId).then((latest) => {
        if (active) setCheckedToday(!!latest && latest.local_date === todayStr());
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
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>EMOTEC</Text>
        <Text style={styles.hello}>Hola, {profile?.full_name ?? 'estudiante'}</Text>

        {/* Estado del check-in de hoy */}
        <View style={[styles.banner, checkedToday ? styles.bannerDone : styles.bannerPending]}>
          <Text style={styles.bannerText}>
            {checkedToday === null
              ? 'Cargando...'
              : checkedToday
                ? 'Ya hiciste tu check-in de hoy'
                : 'Aun no has hecho tu check-in de hoy'}
          </Text>
        </View>

        <Link href="/checkin" asChild>
          <Pressable style={styles.primary}>
            <Text style={styles.primaryText}>
              {checkedToday ? 'Ver / rehacer check-in' : 'Hacer check-in de hoy'}
            </Text>
          </Pressable>
        </Link>

        <Link href="/historial" asChild>
          <Pressable style={styles.secondary}>
            <Text style={styles.secondaryText}>Ver historial</Text>
          </Pressable>
        </Link>

        <View style={styles.spacer} />

        {hasConsent && (
          <Pressable onPress={onRevoke}>
            <Text style={styles.muted}>Revocar consentimiento</Text>
          </Pressable>
        )}
        <Pressable onPress={signOut}>
          <Text style={styles.muted}>Cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 14 },
  title: { fontSize: 30, fontWeight: '700', color: '#208AEF' },
  hello: { fontSize: 17, color: '#333' },
  banner: { borderRadius: 12, padding: 16, marginTop: 8 },
  bannerDone: { backgroundColor: '#e6f4ea' },
  bannerPending: { backgroundColor: '#fdf0e3' },
  bannerText: { fontSize: 15, fontWeight: '600', color: '#333' },
  primary: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#208AEF', fontSize: 16, fontWeight: '600' },
  spacer: { flex: 1 },
  muted: { color: '#999', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
});
