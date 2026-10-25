import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Required on web so the auth popup can hand its result back to the app.
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = 'success' | 'cancelled';

/**
 * Google OAuth through Supabase.
 *
 * Setup (see README → "Google sign-in"):
 * 1. Enable the Google provider in Supabase → Authentication → Providers.
 * 2. Add this app's redirect URL (`expensecounter://auth-callback`) to
 *    Supabase → Authentication → URL Configuration → Redirect URLs.
 * 3. Add the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`)
 *    to the Google Cloud OAuth client's Authorized redirect URIs.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = makeRedirectUri({ scheme: 'expensecounter', path: 'auth-callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true }
  });
  if (error) throw error;
  if (!data.url) throw new Error('Could not start Google sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'cancel' || result.type === 'dismiss') return 'cancelled';
  if (result.type !== 'success') {
    throw new Error('Google sign-in was interrupted. Please try again.');
  }

  const callback = new URL(result.url);
  const oauthError = callback.searchParams.get('error_description') ?? callback.searchParams.get('error');
  if (oauthError) throw new Error(decodeURIComponent(oauthError));

  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Google sign-in did not return an authorization code.');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;

  return 'success';
}
