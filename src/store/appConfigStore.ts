import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { APP_CONFIG_REFRESH_MS, APPLIANCES, STORAGE_KEYS, type ApplianceConfig } from '../config';
import { fetchAppConfig } from '../services/appConfig';

/**
 * The Home Automation appliance list.
 *   1. Starts with the built-in APPLIANCES.
 *   2. Replaced by the list downloaded from the website (cached on the phone),
 *      so new buttons appear without a new APK.
 *   3. If a download fails (no internet, on the box hotspot), the cached list stays.
 */
interface AppConfigState {
  appliances: ApplianceConfig[];
  /** 0 = built-in list (never downloaded). */
  version: number;
  fetchedAt: number | null;
  refreshing: boolean;
  refresh(opts?: { force?: boolean }): Promise<boolean>;
}

export const useAppConfigStore = create<AppConfigState>()(
  persist(
    (set, get) => ({
      appliances: APPLIANCES,
      version: 0,
      fetchedAt: null,
      refreshing: false,

      async refresh(opts) {
        // Wait for the cached list to load first, or it would overwrite a fresh download.
        if (!useAppConfigStore.persist.hasHydrated()) {
          await new Promise<void>((resolve) => {
            const unsub = useAppConfigStore.persist.onFinishHydration(() => {
              unsub();
              resolve();
            });
          });
        }
        const { refreshing, fetchedAt } = get();
        if (refreshing) return false;
        if (!opts?.force && fetchedAt && Date.now() - fetchedAt < APP_CONFIG_REFRESH_MS) return false;
        set({ refreshing: true });
        try {
          const remote = await fetchAppConfig();
          // version 0 means the admin never saved one → keep using the built-in list.
          set({
            appliances: remote.version === 0 ? APPLIANCES : remote.appliances,
            version: remote.version,
            fetchedAt: Date.now(),
          });
          return true;
        } catch {
          return false; // offline / hotspot / server down: keep what we have
        } finally {
          set({ refreshing: false });
        }
      },
    }),
    {
      name: STORAGE_KEYS.appConfig,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ appliances: s.appliances, version: s.version, fetchedAt: s.fetchedAt }),
    },
  ),
);

export const useAppliances = () => useAppConfigStore((s) => s.appliances);
export const getAppliances = () => useAppConfigStore.getState().appliances;
