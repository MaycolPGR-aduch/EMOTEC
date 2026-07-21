import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import Constants from 'expo-constants';
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

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

type SessionContextValue = {
  session: Session | null;
  profile: Profile | null;
  hasConsent: boolean | null; // null = aun no determinado
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  acceptConsent: (documentId: string) => Promise<{ error: string | null }>;
  revokeConsent: (reason?: string) => Promise<{ error: string | null }>;
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
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile(userId: string) {
    // RLS ("perfil propio - leer") garantiza que esto solo devuelve la fila propia.
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? null);
  }

  async function loadConsent(userId: string) {
    // Un consentimiento activo = fila sin revocar sobre un documento que sigue
    // habilitando la escritura (is_accepted). Es la misma condicion que impone
    // la puerta has_active_consent() en la base.
    const { data } = await supabase
      .from('consents')
      .select('id, consent_documents!inner(is_accepted)')
      .eq('user_id', userId)
      .is('revoked_at', null)
      .eq('consent_documents.is_accepted', true)
      .limit(1);
    setHasConsent((data?.length ?? 0) > 0);
  }

  async function bootstrap(next: Session | null) {
    setSession(next);
    if (next) {
      await Promise.all([loadProfile(next.user.id), loadConsent(next.user.id)]);
    } else {
      setProfile(null);
      setHasConsent(null);
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      await bootstrap(data.session);
      if (active) setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, next) => {
      // El refresco de token no cambia quien eres: solo actualiza la sesion.
      if (event === 'TOKEN_REFRESHED') {
        setSession(next);
        return;
      }
      await bootstrap(next);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: SessionContextValue = {
    session,
    profile,
    hasConsent,
    isLoading,
    signIn: async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    signUp: async (email, password, fullName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        // full_name viaja en metadata para el trigger; el rol lo fuerza la base.
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message, needsConfirmation: false };
      return { error: null, needsConfirmation: !data.session };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    acceptConsent: async (documentId) => {
      if (!session) return { error: 'No hay sesion.' };
      const { error } = await supabase.from('consents').insert({
        user_id: session.user.id,
        document_id: documentId,
        declared_adult: true,
        app_version: APP_VERSION,
      });
      if (error) return { error: error.message };
      await loadConsent(session.user.id); // refresca hasConsent -> redirige solo
      return { error: null };
    },
    revokeConsent: async (reason) => {
      if (!session) return { error: 'No hay sesion.' };
      // Solo se puede tocar revoked_at/revoke_reason (grant de columna + trigger).
      const { error } = await supabase
        .from('consents')
        .update({ revoked_at: new Date().toISOString(), revoke_reason: reason ?? null })
        .eq('user_id', session.user.id)
        .is('revoked_at', null);
      if (error) return { error: error.message };
      await loadConsent(session.user.id);
      return { error: null };
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
