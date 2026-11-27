import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Direction } from '../config';
import { CONTROL_MIN_SIZE, cardShadow, font, radius, useTheme } from '../theme';
import { RobotEyes } from './Brand';

/**
 * Round robot face in the middle of the pad: antenna, two round eyes (the
 * motif from the "P" in the logo) and a smile. Lights up saffron while driving.
 */
function RobotFace({ size, active, disabled }: { size: number; active: boolean; disabled: boolean }) {
  const t = useTheme();
  const face = disabled ? t.colors.off : active ? t.colors.primary : t.colors.surface;
  const feature = disabled ? t.colors.textMuted : active ? t.colors.onPrimary : t.colors.primary;
  const rim = disabled ? t.colors.border : t.colors.primary;
  const stroke = Math.max(2, size * 0.05);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ alignItems: 'center' }}
    >
      {/* antenna */}
      <View style={{ alignItems: 'center', marginBottom: -stroke }}>
        <View style={{ width: size * 0.13, height: size * 0.13, borderRadius: size, backgroundColor: rim }} />
        <View style={{ width: stroke, height: size * 0.1, backgroundColor: rim }} />
      </View>
      <View
        style={[
          styles.face,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: face,
            borderColor: rim,
            borderWidth: stroke,
          },
          !disabled && cardShadow(t),
        ]}
      >
        <RobotEyes size={size * 0.2} gap={size * 0.16} color={feature} />
        {/* smile */}
        <View
          style={{
            width: size * 0.34,
            height: size * 0.14,
            marginTop: size * 0.09,
            borderColor: feature,
            borderBottomWidth: stroke,
            borderLeftWidth: stroke,
            borderRightWidth: stroke,
            borderTopWidth: 0,
            borderBottomLeftRadius: size * 0.2,
            borderBottomRightRadius: size * 0.2,
          }}
        />
      </View>
    </View>
  );
}

const ICONS: Record<Direction, LucideIcon> = {
  forward: ChevronUp,
  backward: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
};
const LABELS: Record<Direction, string> = {
  forward: 'Forward',
  backward: 'Backward',
  left: 'Left',
  right: 'Right',
};

function DirButton({
  dir,
  size,
  active,
  disabled,
  onPressIn,
  onPressOut,
}: {
  dir: Direction;
  size: number;
  active: boolean;
  disabled: boolean;
  onPressIn: (d: Direction) => void;
  onPressOut: (d: Direction) => void;
}) {
  const t = useTheme();
  const Icon = ICONS[dir];
  const bg = active ? t.colors.primary : t.colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${LABELS[dir]} – hold to move`}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPressIn={() => onPressIn(dir)}
      onPressOut={() => onPressOut(dir)}
      style={[
        styles.btn,
        {
          width: size,
          height: size,
          backgroundColor: disabled ? t.colors.off : bg,
          transform: [{ scale: active ? 0.94 : 1 }],
        },
        !disabled && cardShadow(t),
      ]}
    >
      <Icon color={disabled ? t.colors.onOff : t.colors.onInk} size={size * 0.45} strokeWidth={2.6} />
      <Text style={[styles.label, { color: disabled ? t.colors.onOff : t.colors.onInk }]}>
        {LABELS[dir]}
      </Text>
    </Pressable>
  );
}

export function DPad({
  size,
  active,
  disabled,
  onPressIn,
  onPressOut,
}: {
  /** Overall width/height of the pad. */
  size: number;
  active: Direction | null;
  disabled: boolean;
  onPressIn: (d: Direction) => void;
  onPressOut: (d: Direction) => void;
}) {
  const btn = Math.max(CONTROL_MIN_SIZE, Math.floor(size / 3) - 6);
  const common = { size: btn, disabled, onPressIn, onPressOut };
  return (
    <View style={{ width: btn * 3 + 12, height: btn * 3 + 12 }}>
      <View style={styles.row}>
        <DirButton dir="forward" active={active === 'forward'} {...common} />
      </View>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <DirButton dir="left" active={active === 'left'} {...common} />
        <View style={[styles.hub, { width: btn, height: btn }]}>
          <RobotFace size={btn * 0.82} active={!!active} disabled={disabled} />
        </View>
        <DirButton dir="right" active={active === 'right'} {...common} />
      </View>
      <View style={styles.row}>
        <DirButton dir="backward" active={active === 'backward'} {...common} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', marginVertical: 2 },
  btn: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  hub: { alignItems: 'center', justifyContent: 'center' },
  face: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: font.xs, fontWeight: '700', marginTop: -2 },
});
