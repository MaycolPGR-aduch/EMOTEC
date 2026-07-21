import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { type Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Espejo del subconjunto de public.profiles que la app necesita. El rol lo fija
// el trigger handle_new_user a 'estudiante'; nunca se envia desde el cliente.
export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'estudiante' | 'tutor' | 'admin';
};

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    // RLS ("perfil propio - leer") garantiza que esto solo devuelve el fila propia.
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    // 1) Sesion existente al arrancar (restaurada desde AsyncStorage).
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setIsLoading(false);
    });

    // 2) Cambios de sesion (login, logout, refresh de token).
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await loadProfile(next.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: SessionContextValue = {
    session,
    profile,
    isLoading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password, fullName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // full_name viaja en raw_user_meta_data; el trigger lo lee. El rol NO:
        // el trigger lo fuerza a 'estudiante' pase lo que pase aqui.
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      // Sin sesion tras el registro = el proyecto exige confirmacion por correo.
      return { error: null, needsConfirmation: !data.session };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
