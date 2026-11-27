import { useEffect, useState } from 'react';

/** Ticks every 5s so "online" (for HTTP devices) and "x ago" labels stay current. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);
  return now;
}
