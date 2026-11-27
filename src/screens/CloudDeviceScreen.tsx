import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CloudSlider } from '../components/CloudSlider';
import { Card, Hint, StatusPill } from '../components/ui';
import { useNow } from '../hooks/useNow';
import type { RootStackParamList } from '../navigation/types';
import type { CloudDatastream, CloudDevice } from '../services/cloudApi';
import { isDeviceOnline, useCloudStore } from '../store/cloudStore';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';
import { formatCloudValue, timeAgo } from '../utils/cloudFormat';

export function CloudDeviceScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { id } = useRoute<RouteProp<RootStackParamList, 'CloudDevice'>>().params;
  const device = useCloudStore((s) => s.devices?.find((d) => d.id === id));
  const loading = useCloudStore((s) => s.loading);
  const loadDevices = useCloudStore((s) => s.loadDevices);
  const now = useNow();

  useLayoutEffect(() => {
    if (device) nav.setOptions({ title: device.name });
  }, [nav, device?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!device) {
    return (
      <View style={styles.center}>
        {loading ? <ActivityIndicator color={t.colors.primary} /> : <Text style={{ color: t.colors.textMuted }}>Device not found</Text>}
      </View>
    );
  }

  const online = isDeviceOnline(device, now);
  const canControl = device.role !== 'viewer';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDevices} colors={[t.colors.accent]} tintColor={t.colors.accent} />}
      >
        <StatusPill
          ok={online}
          label={online ? (device.connected ? 'Online · connected live' : 'Online · polling over HTTP') : `Offline · last seen ${timeAgo(device.lastSeen, now)}`}
        />
        {!canControl && <Hint>You have view-only access to this device.</Hint>}
        {device.datastreams.length === 0 && (
          <Card>
            <Text style={{ color: t.colors.textMuted, lineHeight: 20 }}>
              This device has no datastreams yet. Add them on the website (Device → Datastreams).
            </Text>
          </Card>
        )}
        <View style={styles.grid}>
          {device.datastreams.map((ds) => (
            <Widget key={ds.pin} device={device} ds={ds} canControl={canControl} now={now} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Widget({ device, ds, canControl, now }: { device: CloudDevice; ds: CloudDatastream; canControl: boolean; now: number }) {
  const t = useTheme();
  const pending = useCloudStore((s) => !!s.pending[`${device.id}:${ds.pin}`]);
  const write = useCloudStore((s) => s.write);
  const on = ds.value === 1;

  if (ds.kind === 'switch') {
    return (
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={ds.name}
        accessibilityState={{ checked: on, busy: pending, disabled: !canControl }}
        disabled={!canControl || pending}
        onPress={() => write(device.id, ds.pin, on ? 0 : 1)}
        style={({ pressed }) => [
          styles.card,
          styles.half,
          { backgroundColor: on ? t.colors.accent : t.colors.surface, borderColor: on ? t.colors.accent : t.colors.border },
          cardShadow(t),
          { opacity: canControl ? 1 : 0.6, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.pin, { color: on ? t.colors.onAccent : t.colors.textMuted }]}>{ds.pin}</Text>
          {pending && <ActivityIndicator color={on ? t.colors.onAccent : t.colors.text} />}
        </View>
        <Text style={[styles.name, { color: on ? t.colors.onAccent : t.colors.text }]} numberOfLines={1}>
          {ds.name}
        </Text>
        <Text style={[styles.big, { color: on ? t.colors.onAccent : t.colors.text }]}>{on ? 'ON' : 'OFF'}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, ds.kind === 'slider' ? styles.full : styles.half, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, cardShadow(t)]}>
      <View style={styles.cardHead}>
        <Text style={[styles.pin, { color: t.colors.textMuted }]}>{ds.pin}</Text>
        {pending && <ActivityIndicator color={t.colors.text} />}
      </View>
      <Text style={[styles.name, { color: t.colors.text }]} numberOfLines={1}>
        {ds.name}
      </Text>
      {ds.kind === 'slider' ? (
        <CloudSlider
          value={typeof ds.value === 'number' ? ds.value : ds.min}
          min={ds.min}
          max={ds.max}
          step={ds.step}
          unit={ds.unit}
          disabled={!canControl}
          onCommit={(v) => write(device.id, ds.pin, v)}
        />
      ) : (
        <Text style={[styles.big, { color: t.colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {formatCloudValue(ds)}
        </Text>
      )}
      <Text style={{ color: t.colors.textMuted, fontSize: font.xs }}>Updated {timeAgo(ds.updatedAt, now)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, gap: spacing.sm, minHeight: 140 },
  half: { flexBasis: '47%', flexGrow: 1 },
  full: { flexBasis: '100%' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pin: { fontSize: font.xs, fontWeight: '700', letterSpacing: 0.5 },
  name: { fontSize: font.md, fontWeight: '700' },
  big: { fontSize: font.xxl, fontWeight: '800', marginTop: 'auto' },
});
