/**
 * Downloads the Home Automation appliance list from the IoT Cloud backend
 * (edited on the website under Admin → App config).
 *
 * Must run while the phone has internet — i.e. NOT while traffic is pinned
 * to the control box's hotspot (see wifi.forceWifi).
 */
import { CLOUD_API_URL, CLOUD_TIMEOUT_MS, MOCK_MODE, type ApplianceConfig } from '../config';

export interface RemoteAppConfig {
  version: number;
  appliances: ApplianceConfig[];
}

const ID_RE = /^[a-z0-9_-]{1,32}$/;

/** Keeps only well-formed entries, so a bad server reply can never break the panel. */
function sanitize(raw: unknown): ApplianceConfig[] | null {
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as any).appliances)) return null;
  const seen = new Set<string>();
  const out: ApplianceConfig[] = [];
  for (const a of (raw as any).appliances) {
    const id = typeof a?.id === 'string' ? a.id : '';
    const on = a?.paths?.on;
    const off = a?.paths?.off;
    if (!ID_RE.test(id) || seen.has(id) || typeof a?.name !== 'string' || typeof on !== 'string' || typeof off !== 'string') continue;
    seen.add(id);
    out.push({
      id,
      name: a.name.slice(0, 40),
      icon: typeof a.icon === 'string' ? a.icon : 'power',
      paths: { on, off },
      altNames: Array.isArray(a.altNames) ? a.altNames.filter((n: unknown) => typeof n === 'string') : [],
    });
  }
  return out;
}

export async function fetchAppConfig(): Promise<RemoteAppConfig> {
  if (MOCK_MODE) throw new Error('Mock mode: using built-in appliances');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLOUD_TIMEOUT_MS);
  try {
    const res = await fetch(`${CLOUD_API_URL}/api/app-config`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const appliances = sanitize(json);
    if (!appliances) throw new Error('Unexpected reply');
    return { version: Number(json.version) || 0, appliances };
  } finally {
    clearTimeout(timer);
  }
}
