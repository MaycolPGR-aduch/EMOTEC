import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useSession } from '@/lib/session';

// Marcador de posicion. El panel real (estudiantes asignados, alertas,
// seguimiento) se construye en E7c sobre los RPC tutor_* que ya existen en la
// base y que solo devuelven indicadores y resumenes, nunca texto del estudiante.
export default function TutorHome() {
  const { profile, signOut } = useSession();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Panel del tutor</Text>
        <Text style={styles.hello}>Hola, {profile?.full_name ?? profile?.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardText}>
            El panel de estudiantes asignados y alertas esta en construccion.
          </Text>
        </View>

        <Link href="/ayuda" asChild>
          <Pressable style={styles.secondary}>
            <Text style={styles.secondaryText}>Recursos de ayuda</Text>
          </Pressable>
        </Link>

        <View style={styles.spacer} />
        <Pressable onPress={signOut}>
          <Text style={styles.logout}>Cerrar sesion</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 24, gap: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#208AEF' },
  hello: { fontSize: 16, color: '#333' },
  card: {
    backgroundColor: '#f6f8fa',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#eef1f4',
  },
  cardText: { fontSize: 15, color: '#666', lineHeight: 22 },
  secondary: {
    borderWidth: 1,
    borderColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#208AEF', fontSize: 16, fontWeight: '600' },
  spacer: { flex: 1 },
  logout: { color: '#c0392b', fontSize: 15, textAlign: 'center', paddingVertical: 16 },
});
