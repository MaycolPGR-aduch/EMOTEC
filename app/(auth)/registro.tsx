import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useSession } from '@/lib/session';
import { traducirError } from '@/lib/auth-errors';

export default function Registro() {
  const { signUp } = useSession();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y contrasena.');
      return;
    }
    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres.');
      return;
    }
    setError(null);
    setMessage(null);
    setLoading(true);
    const res = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);
    if (res.error) {
      setError(traducirError(res.error));
    } else if (res.needsConfirmation) {
      // El proyecto exige confirmacion por correo: no hay sesion todavia.
      setMessage('Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesion.');
    }
    // Si hay sesion, Stack.Protected redirige solo al area autenticada.
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Solo para estudiantes mayores de 18 anos</Text>

          <TextInput
            style={styles.input}
            placeholder="Nombre completo (opcional)"
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Correo"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Contrasena (min. 6 caracteres)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Crear cuenta</Text>
            )}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Ya tienes cuenta? </Text>
            <Link href="/login" style={styles.link}>
              Inicia sesion
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center', color: '#208AEF' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#555', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#208AEF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#c0392b', fontSize: 14 },
  message: { color: '#1e7e34', fontSize: 14 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: '#555' },
  link: { color: '#208AEF', fontWeight: '600' },
});
