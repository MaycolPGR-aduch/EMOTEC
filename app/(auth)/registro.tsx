import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { useSession } from '@/lib/session';
import { traducirError } from '@/lib/auth-errors';
import { AppText, Button, Callout, Field, Screen } from '@/components/ui';
import { color, space } from '@/theme';

export default function Registro() {
  const { signUp } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) return setError('Ingresa tu correo y contrasena.');
    if (password.length < 6) return setError('La contrasena debe tener al menos 6 caracteres.');
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (res.error) setError(traducirError(res.error));
    else if (res.needsConfirmation)
      setMessage('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesion.');
  }

  return (
    <Screen keyboardAvoiding background="surface" center contentContainerStyle={styles.container}>
      <AppText variant="display" color={color.brand} align="center">
        Crear cuenta
      </AppText>
      <AppText variant="body" color={color.textSecondary} align="center" style={styles.subtitle}>
        Solo para estudiantes mayores de 18 anos
      </AppText>

      <Field
        value={fullName}
        onChangeText={setFullName}
        placeholder="Nombre completo (opcional)"
        autoCapitalize="words"
        editable={!loading}
      />
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
        placeholder="Contrasena (min. 6 caracteres)"
        secureTextEntry
        editable={!loading}
      />

      {error && (
        <AppText variant="body" color={color.danger}>
          {error}
        </AppText>
      )}
      {message && <Callout tone="privacy">{message}</Callout>}

      <Button title="Crear cuenta" onPress={onSubmit} loading={loading} />

      <View style={styles.footer}>
        <AppText variant="body" color={color.textSecondary}>
          Ya tienes cuenta?{' '}
        </AppText>
        <Link href="/login">
          <AppText variant="body" weight="semibold" color={color.brand}>
            Inicia sesion
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.md },
  subtitle: { marginBottom: space.lg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: space.lg },
});
