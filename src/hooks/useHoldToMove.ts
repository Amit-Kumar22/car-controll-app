import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { CAR_COMMANDS, HOLD_REPEAT_INTERVAL_MS, type Direction } from '../config';
import { useCarStore } from '../store/carStore';

/**
 * Hold-to-move driving logic.
 *  - press-in  → send direction immediately, then every HOLD_REPEAT_INTERVAL_MS
 *  - press-out → send STOP immediately
 *  - screen blur, app background, disconnect or unmount → STOP
 */
export function useHoldToMove(enabled: boolean) {
  const send = useCarStore((s) => s.send);
  const status = useCarStore((s) => s.status);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef<Direction | null>(null);
  const [active, setActive] = useState<Direction | null>(null);

  const clear = useCallback(() => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    activeRef.current = null;
    setActive(null);
  }, []);

  const stop = useCallback(() => {
    clear();
    useCarStore.getState().send(CAR_COMMANDS.stop);
  }, [clear]);

  const pressIn = useCallback(
    (dir: Direction) => {
      if (!enabled) return;
      if (interval.current) clearInterval(interval.current);
      activeRef.current = dir;
      setActive(dir);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      const cmd = CAR_COMMANDS[dir];
      send(cmd);
      interval.current = setInterval(() => send(cmd), HOLD_REPEAT_INTERVAL_MS);
    },
    [enabled, send],
  );

  const pressOut = useCallback(
    (dir: Direction) => {
      // Ignore the release of a button that is no longer the active one
      // (e.g. a second finger took over), but always stop otherwise.
      if (activeRef.current !== null && activeRef.current !== dir) return;
      stop();
    },
    [stop],
  );

  const emergencyStop = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    stop();
  }, [stop]);

  // Stop when the link is no longer usable.
  useEffect(() => {
    if (status !== 'connected' || !enabled) clear();
  }, [status, enabled, clear]);

  // Stop when the screen loses focus.
  useFocusEffect(
    useCallback(() => {
      return () => stop();
    }, [stop]),
  );

  // Stop when the app goes to background / inactive.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stop();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [stop]);

  return { active, pressIn, pressOut, emergencyStop };
}
