/**
 * HTTP client for the ESP32 control box. All requests are GET, return JSON,
 * and are aborted after HTTP_TIMEOUT_MS.
 */
import {
  APPLIANCES,
  HOME_API_PATHS,
  HOME_BOX_DEVICE_ID,
  HTTP_TIMEOUT_MS,
  MOCK_MODE,
} from '../config';

export type ApplianceState = Record<string, boolean>;

export class HomeApiError extends Error {
  constructor(
    message: string,
    public code: 'timeout' | 'network' | 'http' | 'bad_response',
  ) {
    super(message);
  }
}

export interface HomeApi {
  ping(ip: string): Promise<boolean>;
  getStatus(ip: string): Promise<ApplianceState>;
  /** Returns the new state reported by the box. */
  setAppliance(ip: string, id: string, on: boolean): Promise<boolean>;
}

async function getJson(ip: string, path: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`http://${ip}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new HomeApiError(`Box replied with HTTP ${res.status}`, 'http');
    try {
      return await res.json();
    } catch {
      throw new HomeApiError('Box sent an unreadable reply', 'bad_response');
    }
  } catch (e: any) {
    if (e instanceof HomeApiError) throw e;
    if (e?.name === 'AbortError') throw new HomeApiError('Control box did not answer in time', 'timeout');
    throw new HomeApiError('Cannot reach the control box', 'network');
  } finally {
    clearTimeout(timer);
  }
}

function toBool(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

const realApi: HomeApi = {
  async ping(ip) {
    try {
      const json = await getJson(ip, HOME_API_PATHS.ping);
      return json?.ok === true && (json.device === undefined || json.device === HOME_BOX_DEVICE_ID);
    } catch {
      return false;
    }
  },
  async getStatus(ip) {
    const json = await getJson(ip, HOME_API_PATHS.status);
    if (!json || typeof json !== 'object') throw new HomeApiError('Unexpected status reply', 'bad_response');
    const state: ApplianceState = {};
    for (const a of APPLIANCES) if (a.id in json) state[a.id] = toBool(json[a.id]);
    return state;
  },
  async setAppliance(ip, id, on) {
    const json = await getJson(ip, HOME_API_PATHS.toggle(id, on));
    if (!json || json.ok === false || !(id in json)) {
      throw new HomeApiError('Box did not confirm the change', 'bad_response');
    }
    return toBool(json[id]);
  },
};

// ---------------------------------------------------------------------------
// Mock ESP32 — in-memory state with realistic latency.
// Set `mockBox.reachable = false` to test the unreachable path.
// ---------------------------------------------------------------------------
export const mockBox = {
  reachable: true,
  state: Object.fromEntries(APPLIANCES.map((a) => [a.id, false])) as ApplianceState,
};

const latency = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 350));

const mockApi: HomeApi = {
  async ping() {
    await latency();
    return mockBox.reachable;
  },
  async getStatus() {
    await latency();
    if (!mockBox.reachable) throw new HomeApiError('Cannot reach the control box', 'network');
    return { ...mockBox.state };
  },
  async setAppliance(_ip, id, on) {
    await latency();
    if (!mockBox.reachable) throw new HomeApiError('Cannot reach the control box', 'network');
    mockBox.state[id] = on;
    return on;
  },
};

export const homeApi: HomeApi = MOCK_MODE ? mockApi : realApi;
