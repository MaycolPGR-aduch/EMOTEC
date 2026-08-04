import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { useSession } from '@/lib/session';
import { traducirError } from '@/lib/auth-errors';
import { AppText, Button, Field, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) return setError('Ingresa tu correo y contrasena.');
    setError(null);
    setLoading(true);
    const res = await signIn(email.trim(), password);
    setLoading(false);
    if (res.error) setError(traducirError(res.error));
  }

  return (
    <Screen keyboardAvoiding background="surface" center contentContainerStyle={styles.container}>
      <AppText variant="display" color={color.brand} align="center">
        EMOTEC
      </AppText>
      <AppText variant="body" color={color.textSecondary} align="center" style={styles.subtitle}>
        Inicia sesion para continuar
      </AppText>

      <Field
        value={email}
        onChangeText={setEmail}
        placeholder="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        editable={!loading}
      />
      <Field
        value={password}
        onChangeText={setPassword}
        placeholder="Contrasena"
        secureTextEntry
        editable={!loading}
      />

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}

      <Button title="Entrar" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <AppText variant="body" color={color.textSecondary}>
          No tienes cuenta?{' '}
        </AppText>
        <Link href="/registro">
          <AppText variant="body" weight="semibold" color={color.brand}>
            Registrate
          </AppText>
        </Link>
      </View>

      {/* Accesible sin sesion: si alguien necesita ayuda urgente, no deberia
          tener que recordar su contrasena para encontrar un telefono. */}
      <Link href="/ayuda" style={styles.help}>
        <AppText variant="body" weight="semibold" color={color.brand} align="center">
          Buscar apoyo
        </AppText>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.md },
  subtitle: { marginBottom: space.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: space.lg },
  help: { textAlign: 'center', marginTop: space.xxl + 4 },
});
