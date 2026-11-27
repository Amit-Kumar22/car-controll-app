import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { font, spacing, useTheme } from '../theme';

/**
 * Minimal slider built on PanResponder (no extra native module).
 * Moves locally while dragging and calls onCommit once, on release.
 */
export function CloudSlider({
  value,
  min,
  max,
  step,
  unit,
  disabled,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const t = useTheme();
  const width = useRef(1);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;

  const toValue = (x: number) => {
    const ratio = Math.min(1, Math.max(0, x / width.current));
    const raw = min + ratio * (max - min);
    const stepped = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, Number(stepped.toFixed(4))));
  };

  // Callbacks read the latest props through a ref (the PanResponder is created once).
  const latest = useRef({ disabled, onCommit, toValue, value });
  useEffect(() => {
    latest.current = { disabled, onCommit, toValue, value };
  });
  const dragRef = useRef<number | null>(null);

  // The refs are only read inside the gesture callbacks, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      onPanResponderGrant: (e) => {
        dragRef.current = latest.current.toValue(e.nativeEvent.locationX);
        setDrag(dragRef.current);
      },
      onPanResponderMove: (e) => {
        dragRef.current = latest.current.toValue(e.nativeEvent.locationX);
        setDrag(dragRef.current);
      },
      onPanResponderRelease: () => {
        const v = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (v !== null && v !== latest.current.value) latest.current.onCommit(v);
      },
      onPanResponderTerminate: () => {
        dragRef.current = null;
        setDrag(null);
      },
    }),
  );

  const ratio = max > min ? (shown - min) / (max - min) : 0;

  return (
    <View style={{ gap: spacing.sm, opacity: disabled ? 0.55 : 1 }}>
      <Text style={[styles.value, { color: t.colors.text }]}>
        {Number.isInteger(shown) ? shown : shown.toFixed(2)}
        {unit ? ` ${unit}` : ''}
      </Text>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: shown }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          const next = e.nativeEvent.actionName === 'increment' ? Math.min(max, value + step) : Math.max(min, value - step);
          if (next !== value) onCommit(next);
        }}
        onLayout={(e: LayoutChangeEvent) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
        style={styles.hit}
        {...pan.panHandlers}
      >
        <View pointerEvents="none" style={[styles.track, { backgroundColor: t.colors.off }]}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: t.colors.accent }]} />
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: `${ratio * 100}%`, backgroundColor: t.colors.surface, borderColor: t.colors.accent }]}
        />
      </View>
      <View style={styles.ends}>
        <Text style={{ color: t.colors.textMuted, fontSize: font.xs }}>{min}</Text>
        <Text style={{ color: t.colors.textMuted, fontSize: font.xs }}>{max}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { fontSize: font.xxl, fontWeight: '800' },
  hit: { height: 36, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8 },
  thumb: { position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 3, marginLeft: -13 },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
});
