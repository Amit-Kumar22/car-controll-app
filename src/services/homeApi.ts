/**
 * HTTP client for the ESP32 control box.
 *
 * Kept deliberately tolerant, because different box firmwares answer differently:
 *  - The box counts as reachable when it sends ANY HTTP reply (even 404).
 *    Only timeouts / network errors mean it is offline.
 *  - A switch command succeeds on any 2xx reply. If the reply is JSON with the
 *    appliance's state we use it, otherwise we trust the command we sent.
 *  - /status is optional. If the box doesn't have it, the app keeps its own state.
 */
import { APPLIANCES, HOME_API_PATHS, HTTP_TIMEOUT_MS, MOCK_MODE } from '../config';

export type ApplianceState = Record<string, boolean>;

export class HomeApiError extends Error {
  constructor(
    message: string,
    public code: 'timeout' | 'network' | 'http' | 'bad_response',
    public status?: number,
  ) {
    super(message);
  }
}

export interface HomeApi {
  ping(ip: string): Promise<boolean>;
  /** States the box reported. Empty when the box has no usable /status route. */
  getStatus(ip: string): Promise<ApplianceState>;
  /** Calls `path` on the box. Returns the new state (from the reply, or `on` when the reply has none). */
  setAppliance(ip: string, id: string, on: boolean, path: string): Promise<boolean>;
  /** Paths found in the box's home page (links, buttons, fetch calls). */
  discoverRoutes(ip: string): Promise<string[]>;
}

interface RawReply {
  status: number;
  ok: boolean;
  text: string;
}

function normalisePath(path: string): string {
  const p = path.trim();
  return p.startsWith('/') ? p : `/${p}`;
}

async function request(ip: string, path: string): Promise<RawReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
  try {
    const res = await fetch(`http://${ip}${normalisePath(path)}`, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: controller.signal,
    });
    let text = '';
    try {
      text = await res.text();
    } catch {
      // Body is optional – some firmwares close the socket without one.
    }
    return { status: res.status, ok: res.ok, text };
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new HomeApiError('Control box did not answer in time', 'timeout');
    throw new HomeApiError('Cannot reach the control box', 'network');
  } finally {
    clearTimeout(timer);
  }
}

function tryJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Reads ON/OFF from the many shapes ESP32 sketches use. Returns undefined when unclear. */
function parseState(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (['1', 'on', 'true', 'high'].includes(s)) return true;
    if (['0', 'off', 'false', 'low'].includes(s)) return false;
  }
  return undefined;
}

const realApi: HomeApi = {
  async ping(ip) {
    try {
      // Any HTTP status proves the box is there; /ping itself is optional.
      await request(ip, HOME_API_PATHS.ping);
      return true;
    } catch {
      return false;
    }
  },

  async getStatus(ip) {
    const reply = await request(ip, HOME_API_PATHS.status);
    if (!reply.ok) return {}; // Box has no /status – that's fine.
    const json = tryJson(reply.text);
    const state: ApplianceState = {};
    if (json && typeof json === 'object') {
      for (const a of APPLIANCES) {
        const v = parseState(json[a.id]);
        if (v !== undefined) state[a.id] = v;
      }
    }
    return state;
  },

  async setAppliance(ip, id, on, path) {
    const reply = await request(ip, path);
    if (!reply.ok) {
      const hint =
        reply.status === 404
          ? ` – the box has no “${normalisePath(path)}” command. Fix it in Control box settings.`
          : '';
      throw new HomeApiError(`Box replied with HTTP ${reply.status}${hint}`, 'http', reply.status);
    }
    const json = tryJson(reply.text);
    if (json && typeof json === 'object') {
      if (json.ok === false) throw new HomeApiError('Box refused the command', 'bad_response');
      const v = parseState(json[id]) ?? parseState(json.state);
      if (v !== undefined) return v;
    }
    return on;
  },

  async discoverRoutes(ip) {
    const reply = await request(ip, '/');
    const found = new Set<string>();
    const patterns = [
      /href\s*=\s*["']([^"'#]+)["']/gi,
      /action\s*=\s*["']([^"'#]+)["']/gi,
      /fetch\(\s*["'`]([^"'`]+)["'`]/gi,
      /\.open\(\s*["'][A-Z]+["']\s*,\s*["']([^"']+)["']/gi,
      /location(?:\.href)?\s*=\s*["']([^"']+)["']/gi,
    ];
    for (const re of patterns) {
      for (const m of reply.text.matchAll(re)) {
        let p = m[1].trim();
        p = p.replace(/^https?:\/\/[^/]+/i, '');
        if (!p || p === '/' || /\.(css|js|png|jpg|ico|svg)$/i.test(p)) continue;
        found.add(normalisePath(p));
      }
    }
    return [...found].sort();
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
  async discoverRoutes() {
    await latency();
    return APPLIANCES.flatMap((a) => [`/${a.id}/on`, `/${a.id}/off`]);
  },
};

export const homeApi: HomeApi = MOCK_MODE ? mockApi : realApi;
