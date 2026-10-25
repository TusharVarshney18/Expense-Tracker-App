import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';

import { SecureStoreAdapter } from './storage';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const supabaseUrl = extra.supabaseUrl;
const supabaseAnonKey = extra.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS === 'web' ? {} : { storage: SecureStoreAdapter }),
    autoRefreshToken: true,
    persistSession: true,
    // No deep-link session detection on native; required for React Native.
    detectSessionInUrl: false,
    flowType: 'pkce'
  }
});

/**
 * Send recovery links that can be redeemed by the static website. The app's
 * normal auth client stores PKCE verifiers in native secure storage, which the
 * browser page cannot access. A client-only implicit recovery link lets the
 * website receive the one-time recovery session in its URL fragment.
 */
export function sendPasswordResetEmail(email: string, redirectTo: string) {
  const recoveryClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return recoveryClient.auth.resetPasswordForEmail(email, { redirectTo });
}

// Supabase recommends pausing/resuming the auth refresh timer with app state
// so tokens refresh when the app returns to the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
