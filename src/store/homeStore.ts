import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  APPLIANCES,
  DEFAULT_APPLIANCE_PATHS,
  HOME_BOX_DEFAULTS,
  STORAGE_KEYS,
  type AppliancePaths,
} from '../config';
import { homeApi, HomeApiError, type ApplianceState } from '../services/homeApi';
import { wifi, WifiError } from '../services/wifi';
import { showToast } from './toastStore';

export interface BoxSettings {
  ssid: string;
  password: string;
  ip: string;
  /** ON/OFF URL path per appliance id. */
  paths: Record<string, AppliancePaths>;
}

const defaultSettings = (): BoxSettings => ({
  ...HOME_BOX_DEFAULTS,
  paths: JSON.parse(JSON.stringify(DEFAULT_APPLIANCE_PATHS)),
});

/** Fills in paths for appliances added after the settings were saved. */
function withAllPaths(paths: Record<string, AppliancePaths> | undefined): Record<string, AppliancePaths> {
  const out: Record<string, AppliancePaths> = {};
  for (const a of APPLIANCES) {
    out[a.id] = {
      on: paths?.[a.id]?.on?.trim() || a.paths.on,
      off: paths?.[a.id]?.off?.trim() || a.paths.off,
    };
  }
  return out;
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
  discoverRoutes(): Promise<string[]>;
  /** Sends the ON/OFF command; on HTTP 404 tries the appliance's altNames and saves the one that works. */
  sendSwitch(id: string, on: boolean): Promise<boolean>;
  releaseWifi(): Promise<void>;
}

export const useHomeStore = create<HomeState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings(),
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
          settings: {
            ssid: s.ssid.trim(),
            password: s.password,
            ip: s.ip.trim(),
            paths: withAllPaths(s.paths),
          },
          reachability: 'unknown',
        });
      },

      resetSettings: () => set({ settings: defaultSettings(), reachability: 'unknown' }),

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
          // Boxes without /status return {} – then we keep the last known state.
          const state = await homeApi.getStatus(get().settings.ip);
          set({ appliances: { ...get().appliances, ...state }, reachability: 'reachable' });
        } catch (e) {
          const offline = !(e instanceof HomeApiError) || e.code === 'timeout' || e.code === 'network';
          if (offline) set({ reachability: 'unreachable' });
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
          const confirmed = await get().sendSwitch(id, target);
          set({ appliances: { ...get().appliances, [id]: confirmed }, reachability: 'reachable' });
        } catch (e) {
          // Some box routes switch the relay but never send a proper HTTP reply
          // (connection dropped / reply too slow). If the box still answers a
          // ping right after, the command did arrive – keep the new state.
          if (e instanceof HomeApiError && (e.code === 'timeout' || e.code === 'network')) {
            if (await homeApi.ping(get().settings.ip)) {
              set({ appliances: { ...get().appliances, [id]: target }, reachability: 'reachable' });
              return;
            }
          }
          set({ appliances: { ...get().appliances, [id]: previous } }); // revert
          if (e instanceof HomeApiError && (e.code === 'timeout' || e.code === 'network')) {
            set({ reachability: 'unreachable' });
          } else if (e instanceof HomeApiError) {
            set({ reachability: 'reachable' }); // the box answered, just not with success
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

      async sendSwitch(id, on) {
        const { ip } = get().settings;
        const paths = withAllPaths(get().settings.paths)[id];
        try {
          return await homeApi.setAppliance(ip, id, on, on ? paths.on : paths.off);
        } catch (e) {
          if (!(e instanceof HomeApiError) || e.status !== 404) throw e;
          const appliance = APPLIANCES.find((a) => a.id === id);
          const candidates = [
            ...new Set([appliance?.paths, ...(appliance?.altNames ?? []).map((n) => ({ on: `/${n}/on`, off: `/${n}/off` }))]),
          ].filter((c): c is AppliancePaths => !!c && c.on !== paths.on);
          for (const c of candidates) {
            try {
              const result = await homeApi.setAppliance(ip, id, on, on ? c.on : c.off);
              // Found the route this box uses – remember it for next time.
              const settings = get().settings;
              set({ settings: { ...settings, paths: { ...settings.paths, [id]: { ...c } } } });
              showToast(`${appliance?.name ?? id}: using “${on ? c.on : c.off}”`, 'info');
              return result;
            } catch (inner) {
              if (!(inner instanceof HomeApiError) || inner.status !== 404) throw inner;
            }
          }
          throw e;
        }
      },

      async discoverRoutes() {
        await wifi.forceWifi(true);
        return homeApi.discoverRoutes(get().settings.ip);
      },

      async releaseWifi() {
        await wifi.forceWifi(false);
      },
    }),
    {
      name: STORAGE_KEYS.home,
      storage: createJSONStorage(() => AsyncStorage),
      // Appliance state is remembered because many boxes have no /status route.
      partialize: (s) => ({ settings: s.settings, setupDone: s.setupDone, appliances: s.appliances }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HomeState>;
        return {
          ...current,
          ...p,
          settings: {
            ...current.settings,
            ...p.settings,
            paths: withAllPaths(p.settings?.paths),
          },
        };
      },
    },
  ),
);
