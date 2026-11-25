/**
 * Joining the ESP32 hotspot and pinning app traffic to Wi-Fi.
 *
 * The hotspot has no internet, so Android would normally keep sending app
 * traffic over mobile data. `forceWifiUsageWithOptions(true, { noInternet: true })`
 * binds this app's network traffic to the Wi-Fi network instead.
 */
import { Linking, Platform } from 'react-native';
import { MOCK_MODE, WIFI_JOIN_TIMEOUT_S } from '../config';
import { ensureWifiPermissions } from './permissions';

export class WifiError extends Error {
  constructor(
    message: string,
    public code: 'permission' | 'join_failed' | 'wifi_off' | 'unsupported',
  ) {
    super(message);
  }
}

export interface WifiService {
  /** Current SSID, or null when not on Wi-Fi / unknown. */
  getCurrentSsid(): Promise<string | null>;
  /** Join the hotspot (if needed) and bind app traffic to Wi-Fi. */
  join(ssid: string, password: string): Promise<void>;
  /** Bind (or unbind) app traffic to the current Wi-Fi network. */
  forceWifi(enabled: boolean): Promise<void>;
  openWifiSettings(): Promise<void>;
}

function normaliseSsid(s: string | null | undefined): string | null {
  if (!s) return null;
  const clean = s.replace(/^"|"$/g, '').trim();
  return clean && clean !== '<unknown ssid>' ? clean : null;
}

const JOIN_ERROR_MESSAGES: Record<string, string> = {
  userDenied: 'You declined the request to join the network.',
  didNotFindNetwork: 'Could not find the control box hotspot. Is the box switched on and nearby?',
  authenticationErrorOccurred:
    'Wrong password. Check the password in settings, or “forget” the network in Android Wi-Fi settings and try again.',
  timeoutOccurred: 'Joining the hotspot took too long.',
  locationPermissionMissing: 'Location permission is needed to join Wi-Fi networks.',
  locationServicesOff: 'Please turn on Location (GPS) in quick settings, then try again.',
  couldNotEnableWifi: 'Wi-Fi is off. Please turn on Wi-Fi.',
  android10ImmediatelyDroppedConnection: 'The phone dropped the connection immediately. Try again.',
};

class RealWifi implements WifiService {
  private get wm(): typeof import('react-native-wifi-reborn').default {
    return require('react-native-wifi-reborn').default;
  }

  async getCurrentSsid() {
    if ((await ensureWifiPermissions()) !== 'granted') return null;
    try {
      return normaliseSsid(await this.wm.getCurrentWifiSSID());
    } catch {
      return null;
    }
  }

  async join(ssid: string, password: string) {
    if (Platform.OS !== 'android') throw new WifiError('Android only.', 'unsupported');
    if ((await ensureWifiPermissions()) !== 'granted') {
      throw new WifiError('Location permission is needed to join the hotspot.', 'permission');
    }

    try {
      if (!(await this.wm.isEnabled())) {
        throw new WifiError('Wi-Fi is off. Please turn on Wi-Fi and try again.', 'wifi_off');
      }
    } catch (e) {
      if (e instanceof WifiError) throw e;
    }

    const current = await this.getCurrentSsid();
    if (current !== ssid) {
      try {
        await this.wm.connectToProtectedWifiSSID({
          ssid,
          password: password || null,
          isHidden: false,
          timeout: WIFI_JOIN_TIMEOUT_S,
        });
      } catch (e: any) {
        const code = String(e?.code ?? e?.message ?? '');
        throw new WifiError(
          JOIN_ERROR_MESSAGES[code] ?? `Could not join “${ssid}”. (${code || 'unknown error'})`,
          'join_failed',
        );
      }
    }
    await this.forceWifi(true);
  }

  async forceWifi(enabled: boolean) {
    try {
      await this.wm.forceWifiUsageWithOptions(enabled, { noInternet: true });
    } catch {
      // Not fatal: some ROMs reject it when not on Wi-Fi.
    }
  }

  async openWifiSettings() {
    try {
      await Linking.sendIntent('android.settings.WIFI_SETTINGS');
    } catch {
      await Linking.openSettings();
    }
  }
}

class MockWifi implements WifiService {
  private ssid: string | null = 'School-WiFi';
  async getCurrentSsid() {
    return this.ssid;
  }
  async join(ssid: string) {
    await new Promise((r) => setTimeout(r, 1500));
    this.ssid = ssid;
  }
  async forceWifi() {}
  async openWifiSettings() {
    await Linking.openSettings();
  }
}

export const wifi: WifiService = MOCK_MODE ? new MockWifi() : new RealWifi();
