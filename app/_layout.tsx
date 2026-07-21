import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { SessionProvider, useSession } from '@/lib/session';

// Mantener la splash visible hasta saber si hay sesion, para no parpadear la
// pantalla de login cuando el usuario ya estaba dentro.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}

function RootNavigator() {
  const { session, hasConsent, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  // Con sesion pero aun determinando el consentimiento: breve pantalla de carga
  // (evita un parpadeo entre "consentir" y "app").
  if (session && hasConsent === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Tres estados mutuamente excluyentes, gobernados por guards declarativos:
  //   sin sesion               -> (auth)
  //   con sesion, sin consentir -> (consent)
  //   con sesion y consentido   -> (app)
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && hasConsent === false}>
        <Stack.Screen name="(consent)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session && hasConsent === true}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
