import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { syncPushToken } from '@/lib/notifications';
import { authenticateBiometric, getBiometricEnabled } from '@/lib/biometrics';
import { deleteAccount as deleteAccountService } from '@/services/account';

interface AuthContextValue {
  initializing: boolean;
  session: Session | null;
  user: Session['user'] | null;
  profile: Profile | null;
  /** True while the biometric lock screen should be shown. */
  locked: boolean;
  unlock: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locked, setLocked] = useState(false);
  const bootstrapped = useRef(false);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (!error) setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSession(data.session);

      if (data.session?.user) {
        await loadProfile(data.session.user.id);
        // Enforce biometric gate on cold start when enabled.
        const enabled = await getBiometricEnabled();
        if (enabled && active) {
          const ok = await authenticateBiometric();
          if (active && !ok) setLocked(true);
        }
        void syncPushToken(data.session.user.id);
      }

      if (active) {
        setInitializing(false);
        bootstrapped.current = true;
      }
    })();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id);
        if (event === 'SIGNED_IN' && bootstrapped.current) {
          void syncPushToken(nextSession.user.id);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId) throw new Error('Not signed in.');
    await deleteAccountService(userId);
    setProfile(null);
    setSession(null);
  }, [session?.user?.id]);

  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) setLocked(false);
    return ok;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session?.user?.id, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      session,
      user: session?.user ?? null,
      profile,
      locked,
      unlock,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      refreshProfile
    }),
    [
      initializing,
      session,
      profile,
      locked,
      unlock,
      signIn,
      signUp,
      signOut,
      deleteAccount,
      refreshProfile
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
