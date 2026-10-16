import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { supabase } from './supabase';

/**
 * Push notification registration. The token is stored on the user's profile row
 * (profiles.push_token). Delete Account clears this token on the server and the
 * profile cascade removes it entirely.
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const DEFAULT_CHANNEL_ID = 'default';

export async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'General',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0F766E'
  });
}

/**
 * Requests notification permission and returns an Expo push token, or null when
 * permission is denied or the device is not physical / supported.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens only work on physical devices.
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    return null;
  }

  await configureAndroidChannel();

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error(
      'Missing EAS projectId. Run `eas init` so Expo can issue a push token.'
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** Registers the push token for the signed-in user, if available. */
export async function syncPushToken(userId: string): Promise<void> {
  try {
    const token = await requestPushToken();
    if (!token) return;
    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (error) {
    console.warn('[notifications] push token sync failed', error);
  }
}

/** Clears the current user's push token (called before account deletion). */
export async function clearPushToken(userId: string): Promise<void> {
  await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
}

/** Sends a local notification immediately (used for chat reminders). */
export async function presentLocalNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null
  });
}
