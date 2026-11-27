/**
 * Client for the IoT Cloud backend (the iot-platform project): login,
 * devices and writes over the internet. The session token is kept in
 * SecureStore and sent as `Authorization: Bearer <token>`.
 */
import * as SecureStore from 'expo-secure-store';
import { CLOUD_API_URL, CLOUD_TIMEOUT_MS, STORAGE_KEYS } from '../config';

export type CloudRole = 'owner' | 'operator' | 'viewer';
export type CloudPinValue = number | string | null;

export interface CloudDatastream {
  pin: string;
  name: string;
  kind: 'switch' | 'slider' | 'value';
  min: number;
  max: number;
  step: number;
  unit: string;
  value: CloudPinValue;
  updatedAt: string | null;
}

export interface CloudDevice {
  id: string;
  name: string;
  description: string;
  role: CloudRole;
  online: boolean;
  connected: boolean;
  lastSeen: string | null;
  onlineWindowMs: number;
  datastreams: CloudDatastream[];
}

export interface CloudSchedule {
  id: string;
  deviceId: string;
  name: string;
  pin: string;
  value: CloudPinValue;
  /** "HH:MM", 24-hour, in `timezone` */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  nextRunAt: string | null;
}

export type CloudScheduleInput = Pick<CloudSchedule, 'name' | 'pin' | 'time' | 'days' | 'timezone'> & {
  value: number;
  enabled?: boolean;
};

export interface CloudUser {
  id: string;
  email: string;
  name: string;
}

export class CloudError extends Error {
  constructor(
    message: string,
    public status: number, // 0 = network / timeout
  ) {
    super(message);
  }
}

/* --------------------------------------------------------------- token */

let token: string | null = null;

export const cloudToken = {
  async load(): Promise<string | null> {
    token = await SecureStore.getItemAsync(STORAGE_KEYS.cloudToken).catch(() => null);
    return token;
  },
  async save(t: string) {
    token = t;
    await SecureStore.setItemAsync(STORAGE_KEYS.cloudToken, t);
  },
  async clear() {
    token = null;
    await SecureStore.deleteItemAsync(STORAGE_KEYS.cloudToken).catch(() => {});
  },
  get: () => token,
};

/* ------------------------------------------------------------- request */

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(CLOUD_API_URL + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: {
        Accept: 'application/json',
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (e: any) {
    throw new CloudError(
      e?.name === 'AbortError' ? 'Server did not answer in time' : 'No internet connection or server unreachable',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new CloudError((data as { error?: string }).error ?? `Request failed (HTTP ${res.status})`, res.status);
  return data as T;
}

/* ----------------------------------------------------------------- API */

export const cloudApi = {
  login: (email: string, password: string) =>
    request<{ user: CloudUser; token: string }>('/api/auth/login', { body: { email, password } }),
  signup: (name: string, email: string, password: string) =>
    request<{ user: CloudUser; token: string }>('/api/auth/signup', { body: { name, email, password } }),
  me: () => request<{ user: CloudUser; unreadNotifications: number }>('/api/auth/me'),
  devices: () => request<{ devices: CloudDevice[] }>('/api/devices'),
  device: (id: string) => request<{ device: CloudDevice }>(`/api/devices/${id}`),
  write: (id: string, pin: string, value: number | string) =>
    request<{ pin: string; value: CloudPinValue }>(`/api/devices/${id}/write`, { body: { pin, value } }),
  registerPush: (pushToken: string) =>
    request<{ ok: true }>('/api/push-tokens', { body: { token: pushToken, platform: 'android' } }),
  unregisterPush: (pushToken: string) =>
    request<{ ok: true }>('/api/push-tokens', { method: 'DELETE', body: { token: pushToken } }),
  schedules: (deviceId: string) => request<{ schedules: CloudSchedule[] }>(`/api/devices/${deviceId}/schedules`),
  createSchedule: (deviceId: string, input: CloudScheduleInput) =>
    request<{ schedule: CloudSchedule }>(`/api/devices/${deviceId}/schedules`, { body: input }),
  updateSchedule: (id: string, input: Partial<CloudScheduleInput>) =>
    request<{ schedule: CloudSchedule }>(`/api/schedules/${id}`, { method: 'PATCH', body: input }),
  deleteSchedule: (id: string) => request<{ ok: true }>(`/api/schedules/${id}`, { method: 'DELETE' }),
};

export const CLOUD_WEBSITE = CLOUD_API_URL;
