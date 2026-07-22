import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, profile, hasConsent, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  // Con sesion pero sin perfil o sin saber el consentimiento todavia.
  if (session && (!profile || hasConsent === null)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const isStudent = profile?.role === 'estudiante';
  const isTutor = profile?.role === 'tutor';
  const isAdmin = profile?.role === 'admin';

  // El consentimiento SOLO aplica al estudiante: es el consentimiento para
  // recolectar SUS datos de bienestar. Obligar a un tutor a aceptarlo no tendria
  // sentido (no registra check-ins) y ensuciaria la prueba legal de quien consintio.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && isStudent && hasConsent === false}>
        <Stack.Screen name="(consent)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && isStudent && hasConsent === true}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && isTutor}>
        <Stack.Screen name="(tutor)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session && isAdmin}>
        <Stack.Screen name="(admin)" />
      </Stack.Protected>

      {/* Recursos de ayuda: SIEMPRE accesible, incluso sin sesion ni consentimiento.
          Es la pantalla que importa en una crisis; si el login la bloqueara, el
          diseno fallaria justo en el escenario para el que existe. */}
      <Stack.Screen name="ayuda" />
    </Stack>
  );
}
