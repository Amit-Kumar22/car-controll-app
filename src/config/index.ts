/**
 * Central configuration. Every hardware-specific value lives here —
 * change commands, network defaults or appliances in this file only.
 */

// ---------------------------------------------------------------------------
// MOCK MODE
// ---------------------------------------------------------------------------
/**
 * When true, the app simulates the robot car and the ESP32 box so it can be
 * demoed without hardware (works even in Expo Go, because no native Bluetooth
 * or Wi-Fi module is loaded).
 *
 * Toggle it either here, or without editing code:
 *   EXPO_PUBLIC_MOCK_MODE=true npx expo start
 */
export const MOCK_MODE: boolean =
  process.env.EXPO_PUBLIC_MOCK_MODE === 'true' || false;

// ---------------------------------------------------------------------------
// ROBOT CAR (HC-05, Classic Bluetooth SPP)
// ---------------------------------------------------------------------------
/** Single ASCII characters sent to the car. No line ending is appended. */
export const CAR_COMMANDS = {
  forward: 'F',
  backward: 'B',
  left: 'L',
  right: 'R',
  stop: 'S',
} as const;

export type Direction = 'forward' | 'backward' | 'left' | 'right';
export type CarCommand = (typeof CAR_COMMANDS)[keyof typeof CAR_COMMANDS];

/** While a direction button is held, the command is re-sent at this interval. */
export const HOLD_REPEAT_INTERVAL_MS = 150;

/** Give up connecting to the HC-05 after this long. */
export const BT_CONNECT_TIMEOUT_MS = 15000;

/** Common default PINs shown to users when pairing the HC-05. */
export const HC05_DEFAULT_PINS = ['1234', '0000'];

/** Used to highlight likely robot modules in the device list. */
export const CAR_DEVICE_NAME_HINTS = ['HC-05', 'HC-06', 'ROBOT', 'CAR'];

// ---------------------------------------------------------------------------
// HOME CONTROL BOX (ESP32 access point)
// ---------------------------------------------------------------------------
export const HOME_BOX_DEFAULTS = {
  ssid: 'HIPROTECH_HOME',
  password: '12345678',
  ip: '192.168.4.1',
};

/** Every HTTP request to the box is aborted after this long. */
export const HTTP_TIMEOUT_MS = 3000;

/** Seconds to wait for Android to join the hotspot. */
export const WIFI_JOIN_TIMEOUT_S = 20;

/** How often the control panel re-checks /ping while visible. */
export const BOX_PING_INTERVAL_MS = 5000;

export const HOME_API_PATHS = {
  /** Any HTTP reply (even 404) counts as "box reachable". */
  ping: '/ping',
  /** Optional. JSON like {"bulb":1,"fan":0}. Ignored if the box doesn't have it. */
  status: '/status',
};

/** ON / OFF URL paths for one appliance. Editable in the app under Control box settings. */
export interface AppliancePaths {
  on: string;
  off: string;
}

// ---------------------------------------------------------------------------
// APPLIANCES
// The live list comes from the IoT Cloud website (Admin → App config) and is
// cached on the phone — see src/store/appConfigStore.ts. The list below is
// only the built-in fallback used before the first download / without internet.
// `id` is the key in the optional /status JSON.
// `paths` are the default ON/OFF routes on the box (users can change them in the app).
// `icon` is a key of APPLIANCE_ICONS in src/components/ApplianceIcon.tsx
// (unknown names from the server fall back to a generic icon).
// ---------------------------------------------------------------------------
export type ApplianceIconName = string;

export interface ApplianceConfig {
  id: string;
  name: string;
  icon: ApplianceIconName;
  paths: AppliancePaths;
  /**
   * Other route names the box firmware might use. If the configured path gives
   * HTTP 404, the app tries `/<name>/on|off` for each and saves the one that works.
   */
  altNames?: string[];
}

/** Built-in fallback. Use `useAppliances()` / `getAppliances()` from appConfigStore in app code. */
export const APPLIANCES: ApplianceConfig[] = [
  {
    id: 'bulb',
    name: 'Bulb',
    icon: 'bulb',
    paths: { on: '/light/on', off: '/light/off' },
    altNames: ['bulb', 'led', 'lamp', 'light1', 'bulb1'],
  },
  { id: 'fan', name: 'Fan', icon: 'fan', paths: { on: '/fan/on', off: '/fan/off' }, altNames: ['fan1'] },
  { id: 'tv', name: 'TV', icon: 'tv', paths: { on: '/tv/on', off: '/tv/off' } },
  // { id: 'socket', name: 'Socket', icon: 'plug', paths: { on: '/socket/on', off: '/socket/off' } },
];

// ---------------------------------------------------------------------------
// IOT CLOUD (backend + website: the iot-platform project)
// ---------------------------------------------------------------------------
/**
 * Backend base URL. Override without editing code:
 *   EXPO_PUBLIC_API_URL=http://my-server:5010 npx expo start
 */
export const CLOUD_API_URL: string = (process.env.EXPO_PUBLIC_API_URL || 'http://69.62.75.151:5010').replace(/\/+$/, '');

/** Cloud requests are aborted after this long. */
export const CLOUD_TIMEOUT_MS = 8000;

/** Re-download the remote appliance list at most this often (it is also refreshed on app start). */
export const APP_CONFIG_REFRESH_MS = 60_000;

// ---------------------------------------------------------------------------
// MISC
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  car: 'robotics-trainer/car',
  home: 'robotics-trainer/home',
  appConfig: 'robotics-trainer/app-config',
  /** SecureStore key (only letters, digits, . - _ allowed). */
  cloudToken: 'robotics-trainer.cloud-token',
};

export const TOAST_DURATION_MS = 2800;
