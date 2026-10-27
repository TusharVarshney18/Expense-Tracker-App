import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Required on web so the auth popup can hand its result back to the app.
WebBrowser.maybeCompleteAuthSession();

export type GoogleSignInResult = 'success' | 'cancelled';

/** The URL scheme compiled into the running build (see app.config.ts). */
export function getAppScheme(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as { appScheme?: string };
  if (extra.appScheme) return extra.appScheme;

  const configured = Constants.expoConfig?.scheme;
  const scheme = Array.isArray(configured) ? configured[0] : configured;
  return scheme ?? 'expensecounter';
}

/**
 * The exact OAuth redirect URL for this build. This is also the URL that must
 * be allow-listed in Supabase → Authentication → URL Configuration.
 */
export function getOAuthRedirectUri(): string {
  return makeRedirectUri({ scheme: getAppScheme(), path: 'auth-callback' });
}

/** True for native or web deep links that point at the OAuth callback route. */
export function isAuthCallbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const route = `${parsed.host}${parsed.pathname}`
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();
    return route === 'auth-callback' || route.endsWith('/auth-callback');
  } catch {
    return false;
  }
}

// A PKCE code can only be exchanged once. `signInWithGoogle` and the root
// deep-link listener may both observe the same callback URL, so remember which
// codes have already been redeemed.
const redeemedCodes = new Set<string>();

/**
 * Turns an OAuth callback URL into a Supabase session. Supports the PKCE `code`
 * used by native sign-in and, as a fallback, implicit-flow tokens in the hash.
 * Safe to call more than once for the same callback URL.
 */
export async function completeOAuthSignIn(url: string): Promise<void> {
  const callback = new URL(url);
  const oauthError =
    callback.searchParams.get('error_description') ?? callback.searchParams.get('error');
  if (oauthError) throw new Error(decodeURIComponent(oauthError));

  const code = callback.searchParams.get('code');
  if (code) {
    if (redeemedCodes.has(code)) return;
    redeemedCodes.add(code);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redeemedCodes.delete(code);
      throw error;
    }
    return;
  }

  const hashParams = new URLSearchParams(callback.hash.replace(/^#/, ''));
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (error) throw error;
    return;
  }

  throw new Error('Google sign-in did not return an authorization code.');
}

/**
 * Google OAuth through Supabase.
 *
 * Setup (see README → "Google sign-in"):
 * 1. Enable the Google provider in Supabase → Authentication → Providers.
 * 2. Add `<scheme>://auth-callback` for every build variant (development,
 *    preview, production) to Supabase → Authentication → URL Configuration.
 * 3. Add the Supabase callback (`https://<project>.supabase.co/auth/v1/callback`)
 *    to the Google Cloud OAuth client's Authorized redirect URIs.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const redirectTo = getOAuthRedirectUri();

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

  await completeOAuthSignIn(result.url);
  return 'success';
}
