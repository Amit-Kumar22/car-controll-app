import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { CAR_COMMANDS, MOCK_MODE, STORAGE_KEYS, type CarCommand } from '../config';
import { carLink, CarLinkError, type CarDevice } from '../services/bluetooth';

export type CarStatus = 'disconnected' | 'connecting' | 'connected' | 'lost';

interface CarState {
  status: CarStatus;
  device: CarDevice | null;
  lastDevice: Pick<CarDevice, 'name' | 'address'> | null;
  error: string | null;
  lostReason: string | null;
  paired: CarDevice[];
  discovered: CarDevice[];
  loadingPaired: boolean;
  scanning: boolean;
  /** Only tracked in MOCK mode, to visualise what the car would receive. */
  lastCommand: CarCommand | null;

  loadPaired(): Promise<void>;
  scan(): Promise<void>;
  connect(device: Pick<CarDevice, 'name' | 'address'>): Promise<boolean>;
  disconnect(): Promise<void>;
  send(cmd: CarCommand): Promise<void>;
  stop(): Promise<void>;
  clearError(): void;
  acknowledgeLost(): void;
}

function message(e: unknown) {
  return e instanceof CarLinkError ? e.message : 'Something went wrong. Please try again.';
}

export const useCarStore = create<CarState>()(
  persist(
    (set, get) => ({
      status: 'disconnected',
      device: null,
      lastDevice: null,
      error: null,
      lostReason: null,
      paired: [],
      discovered: [],
      loadingPaired: false,
      scanning: false,
      lastCommand: null,

      async loadPaired() {
        set({ loadingPaired: true, error: null });
        try {
          await carLink.prepare();
          set({ paired: await carLink.getPairedDevices() });
        } catch (e) {
          set({ error: message(e) });
        } finally {
          set({ loadingPaired: false });
        }
      },

      async scan() {
        if (get().scanning) return;
        set({ scanning: true, error: null, discovered: [] });
        try {
          await carLink.prepare();
          const pairedAddrs = new Set(get().paired.map((d) => d.address));
          const found = await carLink.scan();
          set({ discovered: found.filter((d) => !pairedAddrs.has(d.address)) });
        } catch (e) {
          set({ error: message(e) });
        } finally {
          set({ scanning: false });
        }
      },

      async connect(device) {
        set({ status: 'connecting', error: null, lostReason: null });
        try {
          await carLink.prepare();
          const connected = await carLink.connect(device);
          set({
            status: 'connected',
            device: connected,
            lastDevice: { name: connected.name, address: connected.address },
          });
          // Safety: the car should never start moving on connect.
          carLink.send(CAR_COMMANDS.stop).catch(() => undefined);
          return true;
        } catch (e) {
          set({ status: 'disconnected', device: null, error: message(e) });
          return false;
        }
      },

      async disconnect() {
        await get().stop();
        await carLink.disconnect();
        set({ status: 'disconnected', device: null });
      },

      async send(cmd) {
        if (get().status !== 'connected') return;
        if (MOCK_MODE && get().lastCommand !== cmd) set({ lastCommand: cmd });
        try {
          await carLink.send(cmd);
        } catch {
          // carLink emits onDisconnected; handled below.
        }
      },

      async stop() {
        if (get().status !== 'connected') return;
        if (MOCK_MODE) set({ lastCommand: CAR_COMMANDS.stop });
        try {
          await carLink.send(CAR_COMMANDS.stop);
        } catch {
          // ignore
        }
      },

      clearError: () => set({ error: null }),
      acknowledgeLost: () => set({ lostReason: null }),
    }),
    {
      name: STORAGE_KEYS.car,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ lastDevice: s.lastDevice }),
    },
  ),
);

// Connection-loss safety hook-up (lives outside React so it is never missed).
carLink.onDisconnected((reason) => {
  if (useCarStore.getState().status === 'connected') {
    useCarStore.setState({ status: 'lost', device: null, lostReason: reason });
  }
});
