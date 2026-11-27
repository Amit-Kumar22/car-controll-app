import { create } from 'zustand';
import {
  cloudApi,
  CloudError,
  cloudToken,
  type CloudDevice,
  type CloudSchedule,
  type CloudScheduleInput,
  type CloudUser,
} from '../services/cloudApi';
import { cloudRealtime, type CloudEvent } from '../services/cloudRealtime';
import { getPushToken } from '../services/push';
import { showToast } from './toastStore';

type AuthStatus = 'unknown' | 'signedOut' | 'signedIn';

interface CloudState {
  auth: AuthStatus;
  user: CloudUser | null;
  devices: CloudDevice[] | null;
  loading: boolean;
  error: string | null;
  pending: Record<string, boolean>; // `${deviceId}:${pin}`
  /** Per device id; undefined = not loaded yet. */
  schedules: Record<string, CloudSchedule[] | undefined>;

  init(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadDevices(): Promise<void>;
  write(deviceId: string, pin: string, value: number | string): Promise<void>;
  loadSchedules(deviceId: string): Promise<void>;
  /** Creates (no id) or updates a schedule. Throws on failure so the form can show it. */
  saveSchedule(deviceId: string, input: CloudScheduleInput, id?: string): Promise<void>;
  setScheduleEnabled(s: CloudSchedule, enabled: boolean): Promise<void>;
  deleteSchedule(s: CloudSchedule): Promise<void>;
}

const byTime = (a: CloudSchedule, b: CloudSchedule) => a.time.localeCompare(b.time);

function applyEvent(devices: CloudDevice[], e: CloudEvent): CloudDevice[] {
  if (e.type === 'pin') {
    return devices.map((d) =>
      d.id !== e.deviceId
        ? d
        : {
            ...d,
            ...(e.source === 'device' ? { online: true, lastSeen: e.at } : null),
            datastreams: d.datastreams.map((ds) => (ds.pin === e.pin ? { ...ds, value: e.value, updatedAt: e.at } : ds)),
          },
    );
  }
  if (e.type === 'status') {
    return devices.map((d) =>
      d.id === e.deviceId ? { ...d, online: e.online, connected: e.connected, lastSeen: e.lastSeen ?? d.lastSeen } : d,
    );
  }
  return devices;
}

/** This phone's push token once registered with the server (so logout can remove it). */
let pushToken: string | null = null;

async function registerPush() {
  const r = await getPushToken();
  if ('skipped' in r) {
    if (__DEV__) console.log('[push] not registered:', r.skipped);
    return;
  }
  try {
    await cloudApi.registerPush(r.token);
    pushToken = r.token;
  } catch (e) {
    if (__DEV__) console.log('[push] register failed:', e);
  }
}

export const useCloudStore = create<CloudState>()((set, get) => {
  function startRealtime() {
    const token = cloudToken.get();
    if (!token) return;
    cloudRealtime.start(token, (e) => {
      if (e.type === 'reconnected') return void get().loadDevices();
      if (e.type === 'notification') return showToast(`${e.title}: ${e.message}`, 'info');
      const devices = get().devices;
      if (devices) set({ devices: applyEvent(devices, e) });
    });
  }

  async function signedIn(user: CloudUser, token: string) {
    await cloudToken.save(token);
    set({ auth: 'signedIn', user, error: null });
    startRealtime();
    registerPush();
    await get().loadDevices();
  }

  async function handleAuthError(e: unknown) {
    if (e instanceof CloudError && e.status === 401) {
      await get().logout();
      showToast('Session expired – please log in again', 'info');
      return true;
    }
    return false;
  }

  return {
    auth: 'unknown',
    user: null,
    devices: null,
    loading: false,
    error: null,
    pending: {},
    schedules: {},

    async init() {
      if (get().auth !== 'unknown') return;
      const token = await cloudToken.load();
      if (!token) return set({ auth: 'signedOut' });
      // Optimistically signed in; /me confirms (or logs out on 401).
      set({ auth: 'signedIn' });
      startRealtime();
      try {
        const { user } = await cloudApi.me();
        set({ user });
        registerPush(); // token may have rotated since last launch

      } catch (e) {
        if (await handleAuthError(e)) return;
      }
      await get().loadDevices();
    },

    async login(email, password) {
      const { user, token } = await cloudApi.login(email.trim(), password);
      await signedIn(user, token);
    },

    async signup(name, email, password) {
      const { user, token } = await cloudApi.signup(name.trim(), email.trim(), password);
      await signedIn(user, token);
    },

    async logout() {
      cloudRealtime.stop();
      // Stop this phone getting the user's alerts (best effort, needs the session token).
      if (pushToken) await cloudApi.unregisterPush(pushToken).catch(() => {});
      pushToken = null;
      await cloudToken.clear();
      set({ auth: 'signedOut', user: null, devices: null, error: null, pending: {}, schedules: {} });
    },

    async loadDevices() {
      set({ loading: true });
      try {
        const { devices } = await cloudApi.devices();
        set({ devices, error: null });
        cloudRealtime.subscribe(devices.map((d) => d.id));
      } catch (e) {
        if (await handleAuthError(e)) return;
        set({ error: e instanceof Error ? e.message : 'Could not load devices' });
      } finally {
        set({ loading: false });
      }
    },

    async write(deviceId, pin, value) {
      const key = `${deviceId}:${pin}`;
      const devices = get().devices;
      const prev = devices?.find((d) => d.id === deviceId)?.datastreams.find((ds) => ds.pin === pin);
      set({
        pending: { ...get().pending, [key]: true },
        // optimistic
        devices: devices && applyEvent(devices, { type: 'pin', deviceId, pin, value, source: 'app', at: new Date().toISOString() }),
      });
      try {
        await cloudApi.write(deviceId, pin, value);
      } catch (e) {
        if (await handleAuthError(e)) return;
        // Revert just this pin, keeping any live updates that arrived meanwhile.
        const now = get().devices;
        if (now && prev) {
          set({
            devices: now.map((d) =>
              d.id !== deviceId
                ? d
                : { ...d, datastreams: d.datastreams.map((ds) => (ds.pin === pin ? { ...ds, value: prev.value, updatedAt: prev.updatedAt } : ds)) },
            ),
          });
        }
        showToast(e instanceof Error ? e.message : 'Could not send', 'error');
      } finally {
        const { [key]: _done, ...rest } = get().pending;
        set({ pending: rest });
      }
    },

    async loadSchedules(deviceId) {
      try {
        const { schedules } = await cloudApi.schedules(deviceId);
        set({ schedules: { ...get().schedules, [deviceId]: schedules.sort(byTime) } });
      } catch (e) {
        if (await handleAuthError(e)) return;
        showToast(e instanceof Error ? e.message : 'Could not load schedules', 'error');
      }
    },

    async saveSchedule(deviceId, input, id) {
      try {
        const { schedule } = id ? await cloudApi.updateSchedule(id, input) : await cloudApi.createSchedule(deviceId, input);
        const list = (get().schedules[deviceId] ?? []).filter((x) => x.id !== schedule.id);
        set({ schedules: { ...get().schedules, [deviceId]: [...list, schedule].sort(byTime) } });
      } catch (e) {
        if (await handleAuthError(e)) return;
        throw e;
      }
    },

    async setScheduleEnabled(s, enabled) {
      const replace = (next: CloudSchedule) =>
        set({
          schedules: {
            ...get().schedules,
            [s.deviceId]: (get().schedules[s.deviceId] ?? []).map((x) => (x.id === s.id ? next : x)),
          },
        });
      replace({ ...s, enabled }); // optimistic
      try {
        const { schedule } = await cloudApi.updateSchedule(s.id, { enabled });
        replace(schedule);
      } catch (e) {
        if (await handleAuthError(e)) return;
        replace(s);
        showToast(e instanceof Error ? e.message : 'Could not update schedule', 'error');
      }
    },

    async deleteSchedule(s) {
      try {
        await cloudApi.deleteSchedule(s.id);
        set({
          schedules: { ...get().schedules, [s.deviceId]: (get().schedules[s.deviceId] ?? []).filter((x) => x.id !== s.id) },
        });
      } catch (e) {
        if (await handleAuthError(e)) return;
        showToast(e instanceof Error ? e.message : 'Could not delete schedule', 'error');
      }
    },
  };
});

/** Same rule as the website: socket devices are live; HTTP devices count as online for a while after contact. */
export function isDeviceOnline(d: CloudDevice, now: number): boolean {
  if (d.connected) return true;
  if (!d.online || !d.lastSeen) return false;
  return now - new Date(d.lastSeen).getTime() < d.onlineWindowMs;
}
