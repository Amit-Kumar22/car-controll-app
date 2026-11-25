import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ApplianceConfig } from '../config';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';
import { APPLIANCE_ICONS } from './ApplianceIcon';

export function ApplianceCard({
  appliance,
  on,
  loading,
  disabled,
  onToggle,
}: {
  appliance: ApplianceConfig;
  on: boolean;
  loading: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const t = useTheme();
  const Icon = APPLIANCE_ICONS[appliance.icon];
  const bg = on ? t.colors.accent : t.colors.surface;
  const fg = on ? t.colors.onAccent : t.colors.text;
  const muted = on ? t.colors.onAccent : t.colors.textMuted;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={appliance.name}
      accessibilityState={{ checked: on, busy: loading, disabled }}
      onPress={onToggle}
      disabled={loading || disabled}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: bg, borderColor: on ? t.colors.accent : t.colors.border },
        cardShadow(t),
        { opacity: disabled ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
    >
      <View style={styles.top}>
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: on ? 'rgba(255,255,255,0.22)' : t.colors.off },
          ]}
        >
          <Icon color={on ? t.colors.onAccent : t.colors.onOff} size={30} strokeWidth={2} />
        </View>
        {loading && <ActivityIndicator color={fg} />}
      </View>
      <Text style={[styles.name, { color: fg }]} numberOfLines={1}>
        {appliance.name}
      </Text>
      <View style={styles.bottom}>
        <Text style={[styles.state, { color: muted }]}>{on ? 'ON' : 'OFF'}</Text>
        <View style={[styles.track, { backgroundColor: on ? 'rgba(255,255,255,0.35)' : t.colors.off }]}>
          <View
            style={[
              styles.thumb,
              { backgroundColor: on ? t.colors.onAccent : t.colors.onOff, alignSelf: on ? 'flex-end' : 'flex-start' },
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  iconWrap: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: font.lg, fontWeight: '700', marginTop: spacing.md },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  state: { fontSize: font.md, fontWeight: '800', letterSpacing: 1 },
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  thumb: { width: 22, height: 22, borderRadius: 11 },
});
