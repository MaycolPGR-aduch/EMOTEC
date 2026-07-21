import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';

export default function Home() {
  const { profile, session, hasConsent, signOut, revokeConsent } = useSession();

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
            // Si revoca bien, hasConsent pasa a false y el layout lleva a (consent).
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>EMOTEC</Text>
        <Text style={styles.ok}>Sesion iniciada</Text>

        {/* Datos de public.profiles via RLS: confirma que el trigger creo el
            perfil y que el rol quedo en 'estudiante'. */}
        <View style={styles.card}>
          <Row label="Correo" value={profile?.email ?? session?.user.email ?? '-'} />
          <Row label="Nombre" value={profile?.full_name ?? '(sin nombre)'} />
          <Row label="Rol" value={profile?.role ?? '-'} />
          <Row
            label="Consentimiento"
            value={hasConsent ? 'Aceptado' : 'Pendiente'}
          />
        </View>

        {hasConsent && (
          <Pressable style={styles.secondary} onPress={onRevoke}>
            <Text style={styles.secondaryText}>Revocar consentimiento</Text>
          </Pressable>
        )}

        <Pressable style={styles.logout} onPress={signOut}>
          <Text style={styles.logoutText}>Cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 },
  title: { fontSize: 34, fontWeight: '700', textAlign: 'center', color: '#208AEF' },
  ok: { fontSize: 16, textAlign: 'center', color: '#1e7e34' },
  card: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: '#777', fontSize: 15 },
  rowValue: { color: '#222', fontSize: 15, fontWeight: '600' },
  secondary: {
    borderWidth: 1,
    borderColor: '#c9a227',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#a5811a', fontSize: 15, fontWeight: '600' },
  logout: {
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  logoutText: { color: '#c0392b', fontSize: 16, fontWeight: '600' },
});
