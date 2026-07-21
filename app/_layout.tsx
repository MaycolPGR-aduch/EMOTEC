import { Stack } from 'expo-router';
import { useEffect } from 'react';
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
  const { session, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  // Stack.Protected (expo-router v6): el grupo cuyo guard es true es el unico
  // accesible. Al cambiar `session`, la redireccion es automatica y declarativa;
  // no hace falta empujar rutas a mano tras login/logout.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
