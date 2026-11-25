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
  ssid: 'RoboHome-Box',
  password: 'robohome123',
  ip: '192.168.4.1',
};

/** Expected `device` value in the /ping response. */
export const HOME_BOX_DEVICE_ID = 'robohome';

/** Every HTTP request to the box is aborted after this long. */
export const HTTP_TIMEOUT_MS = 3000;

/** Seconds to wait for Android to join the hotspot. */
export const WIFI_JOIN_TIMEOUT_S = 20;

/** How often the control panel re-checks /ping while visible. */
export const BOX_PING_INTERVAL_MS = 5000;

export const HOME_API_PATHS = {
  ping: '/ping',
  status: '/status',
  /** /<id>/on and /<id>/off */
  toggle: (id: string, on: boolean) => `/${id}/${on ? 'on' : 'off'}`,
};

// ---------------------------------------------------------------------------
// APPLIANCES — add a new one by adding a line here.
// `id` must match the ESP32 route (/<id>/on, /<id>/off) and the key in /status.
// `icon` must be a key of APPLIANCE_ICONS in src/components/ApplianceIcon.tsx.
// ---------------------------------------------------------------------------
export type ApplianceIconName = 'bulb' | 'fan' | 'plug' | 'tv' | 'ac' | 'lamp';

export interface ApplianceConfig {
  id: string;
  name: string;
  icon: ApplianceIconName;
}

export const APPLIANCES: ApplianceConfig[] = [
  { id: 'bulb', name: 'Bulb', icon: 'bulb' },
  { id: 'fan', name: 'Fan', icon: 'fan' },
  // { id: 'socket', name: 'Socket', icon: 'plug' },
];

// ---------------------------------------------------------------------------
// MISC
// ---------------------------------------------------------------------------
export const STORAGE_KEYS = {
  car: 'robotics-trainer/car',
  home: 'robotics-trainer/home',
};

export const TOAST_DURATION_MS = 2800;
