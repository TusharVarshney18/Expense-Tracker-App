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
import { wipeLocalUserData } from '@/lib/db';
import { clearAllLocalBudgets, clearLocalBudget } from '@/lib/localBudget';
import { TERMS_VERSION } from '@/content/legal';

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
  termsAccepted: boolean;
  acceptTerms: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locked, setLocked] = useState(false);
  const bootstrapped = useRef(false);
  const currentUserId = session?.user?.id;

  const loadProfile = useCallback(async (userId: string) => {
    const [profileResult, upiResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, display_name, avatar_url, created_at, updated_at, terms_accepted_at, terms_version')
        .eq('id', userId)
        .maybeSingle(),
      supabase.rpc('get_my_upi_id')
    ]);
    if (!profileResult.error && profileResult.data) {
      const { data: authData } = await supabase.auth.getUser();
      setProfile({
        ...(profileResult.data as Omit<Profile, 'email' | 'upi_id' | 'push_token'>),
        email: authData.user?.id === userId ? authData.user.email ?? '' : '',
        upi_id: upiResult.error ? null : upiResult.data,
        push_token: null
      });
    } else if (!profileResult.error) {
      setProfile(null);
    }
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
      } else {
        await wipeLocalUserData();
        await clearAllLocalBudgets();
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
        void wipeLocalUserData();
        void clearAllLocalBudgets();
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
        options: { data: { full_name: fullName, terms_version: TERMS_VERSION } }
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await wipeLocalUserData();
    if (currentUserId) await clearLocalBudget(currentUserId);
    setProfile(null);
  }, [currentUserId]);

  const acceptTerms = useCallback(async () => {
    if (!currentUserId) throw new Error('Not signed in.');
    const { error } = await supabase.rpc('accept_current_terms', {
      p_terms_version: TERMS_VERSION
    });
    if (error) throw error;
    await loadProfile(currentUserId);
  }, [currentUserId, loadProfile]);

  const deleteAccount = useCallback(async () => {
    if (!currentUserId) throw new Error('Not signed in.');
    await deleteAccountService(currentUserId);
    setProfile(null);
    setSession(null);
  }, [currentUserId]);

  const unlock = useCallback(async () => {
    const ok = await authenticateBiometric();
    if (ok) setLocked(false);
    return ok;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id);
  }, [session, loadProfile]);

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
      refreshProfile,
      termsAccepted: profile?.terms_version === TERMS_VERSION,
      acceptTerms
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
      refreshProfile,
      acceptTerms
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
