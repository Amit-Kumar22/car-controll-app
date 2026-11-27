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

/* ------------------------------------------------------------ schedules */

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Monday-first order for day pickers. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WORK_DAYS = [1, 2, 3, 4, 5];

export function daysLabel(days: number[]): string {
  const key = [...days].sort().join(',');
  if (key === ALL_DAYS.join(',')) return 'Every day';
  if (key === WORK_DAYS.join(',')) return 'Mon – Fri';
  if (key === '0,6') return 'Weekends';
  return WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(', ');
}

/** "19:05" → "7:05 PM" */
export function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "today 7:00 PM", "tomorrow 6:00 AM", "Mon 6:00 AM" */
export function whenLabel(iso: string | null, now: number): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const time = to12h(`${d.getHours()}:${d.getMinutes()}`);
  const day = (x: Date) => x.toDateString();
  if (day(d) === day(new Date(now))) return `today ${time}`;
  if (day(d) === day(new Date(now + 86_400_000))) return `tomorrow ${time}`;
  return `${WEEKDAY_SHORT[d.getDay()]} ${time}`;
}

/** The phone's IANA time zone, used for new schedules. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
}
