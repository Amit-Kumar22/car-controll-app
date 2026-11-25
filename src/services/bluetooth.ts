/**
 * Robot-car link over Classic Bluetooth (HC-05, SPP serial).
 *
 * UI code talks only to the `carLink` object exported at the bottom. It is
 * either the real implementation (react-native-bluetooth-classic) or a mock,
 * depending on MOCK_MODE in src/config.
 */
import {
  BT_CONNECT_TIMEOUT_MS,
  CAR_COMMANDS,
  CAR_DEVICE_NAME_HINTS,
  MOCK_MODE,
  type CarCommand,
} from '../config';
import { ensureBluetoothPermissions } from './permissions';

export interface CarDevice {
  name: string;
  address: string;
  bonded: boolean;
}

export class CarLinkError extends Error {
  constructor(
    message: string,
    public code:
      | 'permission'
      | 'bluetooth_off'
      | 'unavailable'
      | 'connect_failed'
      | 'timeout'
      | 'not_connected'
      | 'write_failed',
  ) {
    super(message);
  }
}

export interface CarLink {
  /** Checks permissions + adapter state. Throws CarLinkError when not ready. */
  prepare(): Promise<void>;
  getPairedDevices(): Promise<CarDevice[]>;
  scan(): Promise<CarDevice[]>;
  cancelScan(): Promise<void>;
  connect(device: Pick<CarDevice, 'address' | 'name'>): Promise<CarDevice>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  /**
   * Sends one command. Writes are serialised. A repeat of a movement command
   * is dropped if a write is still in flight; STOP is never dropped.
   */
  send(cmd: CarCommand): Promise<void>;
  /** Fires once when the active connection drops. Returns an unsubscribe fn. */
  onDisconnected(listener: (reason: string) => void): () => void;
  openBluetoothSettings(): void;
}

export function looksLikeCar(name: string): boolean {
  const upper = name.toUpperCase();
  return CAR_DEVICE_NAME_HINTS.some((h) => upper.includes(h));
}

function sortDevices(list: CarDevice[]): CarDevice[] {
  return [...list].sort((a, b) => Number(looksLikeCar(b.name)) - Number(looksLikeCar(a.name)));
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => Error): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(onTimeout()), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Shared write queue + disconnect fan-out
// ---------------------------------------------------------------------------
abstract class BaseLink implements CarLink {
  private listeners = new Set<(reason: string) => void>();
  private writing: Promise<void> = Promise.resolve();
  private inFlight = 0;
  protected connectedAddress: string | null = null;

  abstract prepare(): Promise<void>;
  abstract getPairedDevices(): Promise<CarDevice[]>;
  abstract scan(): Promise<CarDevice[]>;
  abstract cancelScan(): Promise<void>;
  abstract connect(device: Pick<CarDevice, 'address' | 'name'>): Promise<CarDevice>;
  abstract disconnect(): Promise<void>;
  abstract isConnected(): Promise<boolean>;
  abstract openBluetoothSettings(): void;
  protected abstract write(cmd: CarCommand): Promise<void>;

  send(cmd: CarCommand): Promise<void> {
    if (!this.connectedAddress) {
      return Promise.reject(new CarLinkError('Not connected to the car', 'not_connected'));
    }
    const isStop = cmd === CAR_COMMANDS.stop;
    // Keep the queue short: if a movement write is still pending, skip this repeat.
    if (!isStop && this.inFlight > 0) return Promise.resolve();

    this.inFlight++;
    const run = this.writing.then(() => this.write(cmd));
    this.writing = run.catch(() => undefined).finally(() => {
      this.inFlight--;
    });
    return run.catch((e) => {
      const err = new CarLinkError(`Could not send command: ${String(e?.message ?? e)}`, 'write_failed');
      // A failed write almost always means the link is gone.
      this.emitDisconnected('Write failed');
      throw err;
    });
  }

  onDisconnected(listener: (reason: string) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emitDisconnected(reason: string) {
    if (!this.connectedAddress) return; // already reported
    this.connectedAddress = null;
    this.listeners.forEach((l) => l(reason));
  }
}

// ---------------------------------------------------------------------------
// Real implementation
// ---------------------------------------------------------------------------
class BluetoothClassicLink extends BaseLink {
  // Lazy require so MOCK mode works without the native module (e.g. Expo Go).
  private get rnbc(): typeof import('react-native-bluetooth-classic').default {
    return require('react-native-bluetooth-classic').default;
  }
  private subs: { remove(): void }[] = [];

  async prepare() {
    const perm = await ensureBluetoothPermissions();
    if (perm !== 'granted') {
      throw new CarLinkError('Bluetooth permission is required to talk to the car.', 'permission');
    }
    if (!(await this.rnbc.isBluetoothAvailable())) {
      throw new CarLinkError('This phone does not support Bluetooth.', 'unavailable');
    }
    if (!(await this.rnbc.isBluetoothEnabled())) {
      try {
        const enabled = await this.rnbc.requestBluetoothEnabled();
        if (!enabled) throw new Error('declined');
      } catch {
        throw new CarLinkError('Bluetooth is turned off. Please turn it on.', 'bluetooth_off');
      }
    }
    this.attachGlobalListeners();
  }

  private attachGlobalListeners() {
    if (this.subs.length) return;
    this.subs.push(
      this.rnbc.onDeviceDisconnected((e) => {
        if (e?.device?.address === this.connectedAddress) this.emitDisconnected('Device disconnected');
      }),
      this.rnbc.onBluetoothDisabled(() => this.emitDisconnected('Bluetooth turned off')),
      this.rnbc.onError((e) => {
        if (!e?.device || e.device.address === this.connectedAddress) {
          this.emitDisconnected('Bluetooth error');
        }
      }),
    );
  }

  async getPairedDevices() {
    const list = await this.rnbc.getBondedDevices();
    return sortDevices(
      list.map((d) => ({ name: d.name || d.address, address: d.address, bonded: true })),
    );
  }

  async scan() {
    const list = await this.rnbc.startDiscovery();
    return sortDevices(
      list.map((d) => ({ name: d.name || d.address, address: d.address, bonded: !!d.bonded })),
    );
  }

  async cancelScan() {
    try {
      await this.rnbc.cancelDiscovery();
    } catch {
      // not scanning — ignore
    }
  }

  async connect(device: Pick<CarDevice, 'address' | 'name'>) {
    await this.cancelScan(); // discovery slows down / breaks RFCOMM connects
    if (this.connectedAddress && this.connectedAddress !== device.address) await this.disconnect();

    const attempt = (secure: boolean) =>
      withTimeout(
        this.rnbc.connectToDevice(device.address, { secure } as never),
        BT_CONNECT_TIMEOUT_MS,
        () => new CarLinkError('Connection timed out. Is the car switched on?', 'timeout'),
      );

    try {
      let connected;
      try {
        connected = await attempt(true);
      } catch (e) {
        if (e instanceof CarLinkError) throw e;
        // Some HC-05 firmwares only accept insecure RFCOMM sockets.
        connected = await attempt(false);
      }
      this.connectedAddress = connected.address;
      return { name: connected.name || device.name, address: connected.address, bonded: true };
    } catch (e) {
      if (e instanceof CarLinkError) throw e;
      throw new CarLinkError(
        'Could not connect. Make sure the car is on, nearby, and paired (PIN 1234 or 0000).',
        'connect_failed',
      );
    }
  }

  async disconnect() {
    const addr = this.connectedAddress;
    this.connectedAddress = null; // intentional: do not fire "connection lost"
    if (addr) {
      try {
        await this.rnbc.disconnectFromDevice(addr);
      } catch {
        // already gone
      }
    }
  }

  async isConnected() {
    if (!this.connectedAddress) return false;
    try {
      return await this.rnbc.isDeviceConnected(this.connectedAddress);
    } catch {
      return false;
    }
  }

  protected async write(cmd: CarCommand) {
    const addr = this.connectedAddress;
    if (!addr) throw new Error('not connected');
    const ok = await this.rnbc.writeToDevice(addr, cmd, 'ascii');
    if (!ok) throw new Error('write returned false');
  }

  openBluetoothSettings() {
    this.rnbc.openBluetoothSettings();
  }
}

// ---------------------------------------------------------------------------
// Mock implementation (no hardware)
// ---------------------------------------------------------------------------
const MOCK_DEVICES: CarDevice[] = [
  { name: 'HC-05', address: '98:D3:31:00:00:01', bonded: true },
  { name: 'Trainer Headphones', address: '00:11:22:33:44:55', bonded: true },
];
const MOCK_SCAN_DEVICES: CarDevice[] = [
  { name: 'HC-05 (Team B)', address: '98:D3:31:00:00:02', bonded: false },
];
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

class MockLink extends BaseLink {
  /** Last commands sent, newest first — handy for demos and debugging. */
  log: { cmd: CarCommand; at: number }[] = [];

  async prepare() {
    await delay(150);
  }
  async getPairedDevices() {
    await delay(400);
    return sortDevices(MOCK_DEVICES);
  }
  async scan() {
    await delay(2000);
    return sortDevices([...MOCK_DEVICES, ...MOCK_SCAN_DEVICES]);
  }
  async cancelScan() {}
  async connect(device: Pick<CarDevice, 'address' | 'name'>) {
    await delay(900);
    if (!looksLikeCar(device.name)) {
      throw new CarLinkError(
        `“${device.name}” did not respond like a robot car. (Mock: pick an HC-05.)`,
        'connect_failed',
      );
    }
    this.connectedAddress = device.address;
    return { ...device, bonded: true };
  }
  async disconnect() {
    this.connectedAddress = null;
  }
  async isConnected() {
    return !!this.connectedAddress;
  }
  protected async write(cmd: CarCommand) {
    await delay(15);
    this.log.unshift({ cmd, at: Date.now() });
    this.log.length = Math.min(this.log.length, 50);
    if (__DEV__) console.log(`[mock-car] ${cmd}`);
  }
  openBluetoothSettings() {}
  /** Mock-only: pretend the car went out of range / lost power. */
  simulateConnectionLoss() {
    this.emitDisconnected('Simulated connection loss');
  }
}

export const mockCarLink = MOCK_MODE ? new MockLink() : null;
export const carLink: CarLink = mockCarLink ?? new BluetoothClassicLink();
