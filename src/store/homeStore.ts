import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { HOME_BOX_DEFAULTS, STORAGE_KEYS } from '../config';
import { homeApi, HomeApiError, type ApplianceState } from '../services/homeApi';
import { wifi, WifiError } from '../services/wifi';
import { showToast } from './toastStore';

export interface BoxSettings {
  ssid: string;
  password: string;
  ip: string;
}

type Reachability = 'unknown' | 'checking' | 'reachable' | 'unreachable';

interface HomeState {
  settings: BoxSettings;
  setupDone: boolean;
  currentSsid: string | null;
  reachability: Reachability;
  joining: boolean;
  joinError: string | null;
  appliances: ApplianceState;
  pending: Record<string, boolean>;
  refreshing: boolean;

  saveSettings(s: BoxSettings): void;
  resetSettings(): void;
  refreshSsid(): Promise<void>;
  connectToBox(): Promise<boolean>;
  checkReachable(): Promise<boolean>;
  loadStatus(opts?: { silent?: boolean }): Promise<void>;
  toggle(id: string): Promise<void>;
  releaseWifi(): Promise<void>;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      settings: { ...HOME_BOX_DEFAULTS },
      setupDone: false,
      currentSsid: null,
      reachability: 'unknown',
      joining: false,
      joinError: null,
      appliances: {},
      pending: {},
      refreshing: false,

      saveSettings(s) {
        set({
          settings: { ssid: s.ssid.trim(), password: s.password, ip: s.ip.trim() },
          reachability: 'unknown',
        });
      },

      resetSettings: () => set({ settings: { ...HOME_BOX_DEFAULTS }, reachability: 'unknown' }),

      async refreshSsid() {
        set({ currentSsid: await wifi.getCurrentSsid() });
      },

      async connectToBox() {
        const { ssid, password } = get().settings;
        set({ joining: true, joinError: null });
        try {
          await wifi.join(ssid, password);
          await get().refreshSsid();
          const ok = await get().checkReachable();
          if (!ok) {
            set({
              joinError: `Joined “${ssid}” but the box did not answer at ${get().settings.ip}. Check the IP address.`,
            });
            return false;
          }
          set({ setupDone: true });
          return true;
        } catch (e) {
          set({
            joinError:
              e instanceof WifiError ? e.message : 'Could not join the hotspot automatically.',
          });
          await get().refreshSsid();
          return false;
        } finally {
          set({ joining: false });
        }
      },

      async checkReachable() {
        if (get().reachability === 'unknown') set({ reachability: 'checking' });
        // If the user joined via Android settings, make sure traffic is pinned to Wi-Fi.
        if (get().reachability !== 'reachable') await wifi.forceWifi(true);
        const ok = await homeApi.ping(get().settings.ip);
        set({ reachability: ok ? 'reachable' : 'unreachable' });
        if (ok && !get().setupDone) set({ setupDone: true });
        return ok;
      },

      async loadStatus(opts) {
        if (!opts?.silent) set({ refreshing: true });
        try {
          if (get().reachability !== 'reachable') await wifi.forceWifi(true);
          const state = await homeApi.getStatus(get().settings.ip);
          set({ appliances: { ...get().appliances, ...state }, reachability: 'reachable' });
        } catch (e) {
          set({ reachability: 'unreachable' });
          if (!opts?.silent) {
            showToast(e instanceof HomeApiError ? e.message : 'Could not load status', 'error');
          }
        } finally {
          set({ refreshing: false });
        }
      },

      async toggle(id) {
        if (get().pending[id]) return;
        const previous = !!get().appliances[id];
        const target = !previous;
        set({
          pending: { ...get().pending, [id]: true },
          appliances: { ...get().appliances, [id]: target }, // optimistic
        });
        try {
          const confirmed = await homeApi.setAppliance(get().settings.ip, id, target);
          set({ appliances: { ...get().appliances, [id]: confirmed }, reachability: 'reachable' });
        } catch (e) {
          set({ appliances: { ...get().appliances, [id]: previous } }); // revert
          if (e instanceof HomeApiError && (e.code === 'timeout' || e.code === 'network')) {
            set({ reachability: 'unreachable' });
          }
          showToast(
            `${e instanceof HomeApiError ? e.message : 'Request failed'} – switch not changed`,
            'error',
          );
        } finally {
          const { [id]: _done, ...rest } = get().pending;
          set({ pending: rest });
        }
      },

      async releaseWifi() {
        await wifi.forceWifi(false);
      },
    }),
    {
      name: STORAGE_KEYS.home,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ settings: s.settings, setupDone: s.setupDone }),
    },
  ),
);
