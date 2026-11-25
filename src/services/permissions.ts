import { Alert, Linking, PermissionsAndroid, Platform, type Permission } from 'react-native';

/**
 * Runtime permission handling. Every permission is explained to the user in
 * plain language BEFORE the Android system dialog is shown.
 */

const P = PermissionsAndroid.PERMISSIONS;

const EXPLANATIONS: Partial<Record<Permission, string>> = {
  [P.BLUETOOTH_SCAN]: '• Nearby devices (scan): lets the app find your robot car’s HC-05 module.',
  [P.BLUETOOTH_CONNECT]:
    '• Nearby devices (connect): lets the app connect to the car and send driving commands.',
  [P.ACCESS_FINE_LOCATION]:
    '• Location: Android requires it to scan for Bluetooth devices (older phones) and to read the Wi-Fi network name. The app never tracks where you are.',
};

const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : 0;

function bluetoothPermissions(): Permission[] {
  if (Platform.OS !== 'android') return [];
  // Android 12+ uses the "Nearby devices" permissions; older versions need location for discovery.
  return apiLevel >= 31
    ? [P.BLUETOOTH_SCAN, P.BLUETOOTH_CONNECT]
    : [P.ACCESS_FINE_LOCATION];
}

function wifiPermissions(): Permission[] {
  return Platform.OS === 'android' ? [P.ACCESS_FINE_LOCATION] : [];
}

function explain(title: string, perms: Permission[]): Promise<boolean> {
  const body = perms.map((p) => EXPLANATIONS[p]).filter(Boolean).join('\n\n');
  return new Promise((resolve) => {
    Alert.alert(
      title,
      `${body}\n\nOn the next screen, tap “Allow”.`,
      [
        { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Continue', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export type PermissionResult = 'granted' | 'denied' | 'blocked';

async function ensure(title: string, perms: Permission[]): Promise<PermissionResult> {
  if (perms.length === 0) return 'granted';

  const missing: Permission[] = [];
  for (const p of perms) {
    if (!(await PermissionsAndroid.check(p))) missing.push(p);
  }
  if (missing.length === 0) return 'granted';

  if (!(await explain(title, missing))) return 'denied';

  const result = await PermissionsAndroid.requestMultiple(missing);
  const values = Object.values(result);
  if (values.every((v) => v === PermissionsAndroid.RESULTS.GRANTED)) return 'granted';

  if (values.some((v) => v === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN)) {
    Alert.alert(
      'Permission blocked',
      'This permission was denied permanently. Open App settings → Permissions and allow it to continue.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.openSettings() },
      ],
    );
    return 'blocked';
  }
  return 'denied';
}

export function ensureBluetoothPermissions() {
  return ensure('Bluetooth access needed', bluetoothPermissions());
}

export function ensureWifiPermissions() {
  return ensure('Location access needed', wifiPermissions());
}
