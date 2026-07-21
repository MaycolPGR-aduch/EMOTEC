import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// EXPO_PUBLIC_* se inyecta en el bundle en tiempo de build (funciona en Expo Go).
// La anon/publishable key es publica por diseno: la protege RLS, no el secreto.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY en .env. ' +
      'Tras editar .env hay que recargar la app por completo (no basta el fast refresh).',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage, // sesion persistente entre reinicios de la app
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no hay navegador ni deep-link OAuth en este flujo
  },
});

// Refrescar el token solo cuando la app esta en primer plano. Sin esto, el token
// puede caducar en segundo plano y la sesion "se cae" al volver.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
