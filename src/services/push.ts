/**
 * Phone push notifications (alerts from the IoT Cloud: automations, failed schedules).
 * Docs: https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
 *
 * Needs a development/release build (not Expo Go), `google-services.json`
 * (see app.config.js) and an EAS project id in app.json `extra.eas.projectId`.
 * Without those, registration is skipped quietly and the app works as before.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { MOCK_MODE } from '../config';

/** Must match ANDROID_CHANNEL in iot-platform src/lib/push.ts. */
export const PUSH_CHANNEL = 'alerts';

// In the foreground the app already shows a toast for live notifications,
// so only put it in the notification list (no banner, no sound).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushResult = { token: string } | { skipped: string };

/** Asks for permission and returns this phone's Expo push token. Never throws. */
export async function getPushToken(): Promise<PushResult> {
  if (MOCK_MODE) return { skipped: 'mock mode' };
  if (Platform.OS !== 'android') return { skipped: 'Android only' };
  const projectId: string | undefined =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return { skipped: 'no EAS projectId in app.json' };
  try {
    // Android 13+: the permission prompt only appears once a channel exists.
    await Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
      name: 'Device alerts',
      description: 'Automations and schedules from the IoT Cloud',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return { skipped: 'permission denied' };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data };
  } catch (e) {
    // Typically: google-services.json missing (FirebaseApp not initialized) or no internet.
    return { skipped: e instanceof Error ? e.message : String(e) };
  }
}

/** Device id carried by a tapped notification, if any. */
export function deviceIdFrom(response: Notifications.NotificationResponse | null | undefined): string | null {
  const id = response?.notification.request.content.data?.deviceId;
  return typeof id === 'string' && id ? id : null;
}

export { Notifications };
