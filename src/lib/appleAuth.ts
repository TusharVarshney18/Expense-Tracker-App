import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Sign in with Apple through Supabase.
 *
 * Setup (see README → "Sign in with Apple"):
 * 1. Enable the Apple provider in Supabase → Authentication → Providers,
 *    using the Services ID and `.p8` key from the Apple Developer portal.
 * 2. Add the production bundle id (`com.tushar.expensecounter`) to the
 *    provider's allowed client ids.
 * 3. Build with EAS so the `com.apple.developer.applesignin` entitlement and
 *    the App ID capability are provisioned.
 *
 * Apple only returns the user's name on the very first authorization, so it is
 * copied into the profile when present and ignored on later sign-ins.
 */

export type AppleSignInResult = 'success' | 'cancelled';

/** Sign in with Apple is only offered by the iOS/iPadOS build. */
export const isAppleSignInPlatform = Platform.OS === 'ios';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (!isAppleSignInPlatform) return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

function isCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  );
}

export async function signInWithApple(): Promise<AppleSignInResult> {
  if (!isAppleSignInPlatform) {
    throw new Error('Sign in with Apple is only available on iOS.');
  }

  // Supabase expects the raw nonce; Apple receives its SHA-256 hash.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL
      ],
      nonce: hashedNonce
    });
  } catch (error) {
    if (isCancellation(error)) return 'cancelled';
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce
  });
  if (error) throw error;

  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (fullName && data.user) {
    // profiles.full_name is not client-writable (RLS grants display_name only),
    // so mirror the name into the fields the profile screen actually edits.
    await supabase.auth.updateUser({ data: { full_name: fullName } });
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ display_name: fullName })
      .eq('id', data.user.id);
    if (profileError) {
      console.warn('[apple-auth] could not save the Apple display name', profileError);
    }
  }

  return 'success';
}
