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
import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { syncPushToken } from '@/lib/notifications';
import { authenticateBiometric, getBiometricEnabled } from '@/lib/biometrics';
import { deleteAccount as deleteAccountService } from '@/services/account';
import { wipeLocalUserData } from '@/lib/db';
import { clearAllLocalBudgets, clearLocalBudget } from '@/lib/localBudget';
import { getSitePageUrl } from '@/lib/site';
import { TERMS_VERSION } from '@/content/legal';
import { completeOAuthSignIn, isAuthCallbackUrl } from '@/lib/oauth';

interface AuthContextValue {
  initializing: boolean;
  /** True while the signed-in user's profile (including Terms) is loading. */
  profileLoading: boolean;
  /** True while an OAuth deep-link callback is being exchanged for a session. */
  authCallbackLoading: boolean;
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
  const [profileLoading, setProfileLoading] = useState(false);
  const [authCallbackLoading, setAuthCallbackLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [locked, setLocked] = useState(false);
  const bootstrapped = useRef(false);
  const profileRequestId = useRef(0);
  const currentUserId = session?.user?.id;

  const loadProfile = useCallback(async (userId: string) => {
    // Ignore a slow response for a previous account/session.
    const requestId = ++profileRequestId.current;
    setProfileLoading(true);
    try {
      const [profileResult, upiResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, display_name, avatar_url, created_at, updated_at, terms_accepted_at, terms_version')
          .eq('id', userId)
          .maybeSingle(),
        supabase.rpc('get_my_upi_id')
      ]);
      if (requestId !== profileRequestId.current) return;
      if (!profileResult.error && profileResult.data) {
        const { data: authData } = await supabase.auth.getUser();
        if (requestId !== profileRequestId.current) return;
        setProfile({
          ...(profileResult.data as Omit<Profile, 'email' | 'upi_id' | 'push_token'>),
          email: authData.user?.id === userId ? authData.user.email ?? '' : '',
          upi_id: upiResult.error ? null : upiResult.data,
          push_token: null
        });
      } else if (!profileResult.error) {
        setProfile(null);
      }
    } finally {
      if (requestId === profileRequestId.current) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      // A cold start from an OAuth callback must exchange the code before the
      // route guard decides whether the user is signed in.
      const initialUrl = await Linking.getInitialURL();
      if (active && initialUrl && isAuthCallbackUrl(initialUrl)) {
        setAuthCallbackLoading(true);
        try {
          await completeOAuthSignIn(initialUrl);
        } catch (error) {
          console.warn('Could not complete the OAuth callback.', error);
        } finally {
          if (active) setAuthCallbackLoading(false);
        }
      }

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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id).then(() => {
          if (event === 'SIGNED_IN' && bootstrapped.current) {
            void syncPushToken(nextSession.user.id);
          }
        });
      } else {
        profileRequestId.current += 1;
        setProfile(null);
        setProfileLoading(false);
        void wipeLocalUserData();
        void clearAllLocalBudgets();
      }
    });

    // Warm OAuth returns (the app was already running when the browser
    // redirected back) arrive as URL events rather than through the browser
    // helper's return value.
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (!active || !isAuthCallbackUrl(url)) return;
      setAuthCallbackLoading(true);
      void completeOAuthSignIn(url)
        .catch((error) => {
          console.warn('Could not complete the OAuth deep link.', error);
        })
        .finally(() => {
          if (active) setAuthCallbackLoading(false);
        });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      linkingSubscription.remove();
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
        options: {
          data: { full_name: fullName, terms_version: TERMS_VERSION },
          emailRedirectTo: getSitePageUrl('confirmed')
        }
      });
      if (error) throw error;
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    profileRequestId.current += 1;
    await wipeLocalUserData();
    if (currentUserId) await clearLocalBudget(currentUserId);
    setProfile(null);
    setProfileLoading(false);
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
    profileRequestId.current += 1;
    setProfile(null);
    setProfileLoading(false);
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
      profileLoading,
      authCallbackLoading,
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
      // Terms are accepted only when the timestamp exists AND it was the
      // current version. A null timestamp or an older version keeps the gate up.
      termsAccepted:
        Boolean(profile?.terms_accepted_at) && profile?.terms_version === TERMS_VERSION,
      acceptTerms
    }),
    [
      initializing,
      profileLoading,
      authCallbackLoading,
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
