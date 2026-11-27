import { create } from 'zustand';
import { cloudApi, CloudError, cloudToken, type CloudDevice, type CloudUser } from '../services/cloudApi';
import { cloudRealtime, type CloudEvent } from '../services/cloudRealtime';
import { showToast } from './toastStore';

type AuthStatus = 'unknown' | 'signedOut' | 'signedIn';

interface CloudState {
  auth: AuthStatus;
  user: CloudUser | null;
  devices: CloudDevice[] | null;
  loading: boolean;
  error: string | null;
  pending: Record<string, boolean>; // `${deviceId}:${pin}`

  init(): Promise<void>;
  login(email: string, password: string): Promise<void>;
  signup(name: string, email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  loadDevices(): Promise<void>;
  write(deviceId: string, pin: string, value: number | string): Promise<void>;
}

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
      await cloudToken.clear();
      set({ auth: 'signedOut', user: null, devices: null, error: null, pending: {} });
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
  };
});

/** Same rule as the website: socket devices are live; HTTP devices count as online for a while after contact. */
export function isDeviceOnline(d: CloudDevice, now: number): boolean {
  if (d.connected) return true;
  if (!d.online || !d.lastSeen) return false;
  return now - new Date(d.lastSeen).getTime() < d.onlineWindowMs;
}
