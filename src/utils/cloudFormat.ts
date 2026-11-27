import type { CloudDatastream } from '../services/cloudApi';

export function formatCloudValue(ds: Pick<CloudDatastream, 'kind' | 'value' | 'unit'>): string {
  const v = ds.value;
  if (ds.kind === 'switch') return v === 1 ? 'ON' : v === 0 ? 'OFF' : '—';
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'number') {
    const n = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, '');
    return ds.unit ? `${n} ${ds.unit}` : n;
  }
  return String(v);
}

export function timeAgo(iso: string | null, now: number): string {
  if (!iso) return 'never';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
