import * as LocalAuthentication from 'expo-local-authentication';

import { getLocalSetting, setLocalSetting } from './db';

/**
 * Optional biometric app lock. Uses Face ID / Touch ID / Android biometrics when
 * the device supports it. The preference is stored locally only.
 */

const BIOMETRIC_ENABLED_KEY = 'biometric_lock_enabled';

export async function isBiometricSupported(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function getBiometricEnabled(): Promise<boolean> {
  const value = await getLocalSetting(BIOMETRIC_ENABLED_KEY);
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await setLocalSetting(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
}

/**
 * Prompts for biometric authentication. When biometrics are not available the
 * app falls back to the device passcode. Returns true on success.
 */
export async function authenticateBiometric(): Promise<boolean> {
  const supported = await isBiometricSupported();
  if (!supported) return true; // Nothing to enforce; do not lock the user out.

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Expense Counter',
    fallbackLabel: 'Use device passcode',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false
  });

  return result.success;
}
