import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bluetooth, BluetoothSearching, CarFront, RotateCcw, Settings } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Hint, SectionTitle } from '../components/ui';
import { HC05_DEFAULT_PINS } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { carLink, looksLikeCar, type CarDevice } from '../services/bluetooth';
import { useCarStore } from '../store/carStore';
import { font, radius, spacing, useTheme } from '../theme';

function DeviceRow({
  device,
  connecting,
  disabled,
  onPress,
}: {
  device: CarDevice;
  connecting: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const likely = looksLikeCar(device.name);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Connect to ${device.name}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? t.colors.surfaceAlt : t.colors.surface,
          borderColor: likely ? t.colors.accent : t.colors.border,
          opacity: disabled && !connecting ? 0.5 : 1,
        },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: (likely ? t.colors.accent : t.colors.primary) + '1A' }]}>
        {likely ? (
          <CarFront color={t.colors.accent} size={22} />
        ) : (
          <Bluetooth color={t.colors.primary} size={22} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowName, { color: t.colors.text }]} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={[styles.rowAddr, { color: t.colors.textMuted }]}>
          {device.address}
          {likely ? '  ·  looks like a robot car' : ''}
          {!device.bonded ? '  ·  not paired' : ''}
        </Text>
      </View>
      {connecting ? (
        <ActivityIndicator color={t.colors.primaryText} />
      ) : (
        <Text style={[styles.connect, { color: t.colors.primaryText }]}>Connect</Text>
      )}
    </Pressable>
  );
}

export function CarConnectScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    status,
    device,
    lastDevice,
    paired,
    discovered,
    loadingPaired,
    scanning,
    error,
    loadPaired,
    scan,
    connect,
  } = useCarStore();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    loadPaired();
  }, [loadPaired]);

  const busy = status === 'connecting';
  // This list is opened from the control screen, so go back to it after connecting.
  const backToControls = () => (nav.canGoBack() ? nav.goBack() : nav.replace('CarControl'));

  async function handleConnect(d: Pick<CarDevice, 'name' | 'address'>) {
    setTarget(d.address);
    const ok = await connect(d);
    setTarget(null);
    if (ok) backToControls();
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {status === 'connected' && device ? (
          <Card style={{ gap: spacing.md }}>
            <Text style={[styles.cardTitle, { color: t.colors.text }]}>Connected to {device.name}</Text>
            <Button title="Open controls" icon={CarFront} onPress={backToControls} />
          </Card>
        ) : (
          lastDevice && (
            <Card style={{ gap: spacing.md }}>
              <Text style={[styles.cardTitle, { color: t.colors.text }]}>Last used car</Text>
              <Text style={{ color: t.colors.textMuted }}>
                {lastDevice.name} · {lastDevice.address}
              </Text>
              <Button
                title={`Reconnect to ${lastDevice.name}`}
                icon={RotateCcw}
                variant="accent"
                loading={busy && target === lastDevice.address}
                disabled={busy}
                onPress={() => handleConnect(lastDevice)}
              />
            </Card>
          )
        )}

        <Hint>
          First time? Pair the car in Android Settings → Bluetooth. The HC-05 PIN is usually{' '}
          <Text style={{ fontWeight: '800' }}>{HC05_DEFAULT_PINS.join(' or ')}</Text>. Paired devices
          appear below.
        </Hint>

        {error && (
          <View style={{ gap: spacing.sm }}>
            <Hint tone="error">{error}</Hint>
            <Button
              title="Open Bluetooth settings"
              variant="outline"
              icon={Settings}
              onPress={() => carLink.openBluetoothSettings()}
            />
          </View>
        )}

        <SectionTitle>Paired devices</SectionTitle>
        {loadingPaired ? (
          <ActivityIndicator color={t.colors.primary} style={{ marginVertical: spacing.lg }} />
        ) : paired.length === 0 ? (
          <Text style={{ color: t.colors.textMuted }}>
            No paired devices yet. Pair the HC-05 in Bluetooth settings, or scan below.
          </Text>
        ) : (
          paired.map((d) => (
            <DeviceRow
              key={d.address}
              device={d}
              connecting={busy && target === d.address}
              disabled={busy}
              onPress={() => handleConnect(d)}
            />
          ))
        )}
        <Button
          title="Refresh paired list"
          variant="ghost"
          onPress={loadPaired}
          disabled={loadingPaired || busy}
        />

        <SectionTitle>New devices</SectionTitle>
        <Button
          title={scanning ? 'Scanning… (about 12 s)' : 'Scan for new devices'}
          icon={BluetoothSearching}
          variant="outline"
          loading={scanning}
          disabled={busy}
          onPress={scan}
        />
        {discovered.map((d) => (
          <DeviceRow
            key={d.address}
            device={d}
            connecting={busy && target === d.address}
            disabled={busy || scanning}
            onPress={() => handleConnect(d)}
          />
        ))}
        {!scanning && discovered.length > 0 && (
          <Text style={{ color: t.colors.textMuted, fontSize: font.sm }}>
            Connecting to an unpaired device will ask for the PIN ({HC05_DEFAULT_PINS.join(' / ')}).
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl * 2 },
  cardTitle: { fontSize: font.lg, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    minHeight: 72,
  },
  rowIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  rowName: { fontSize: font.md, fontWeight: '700' },
  rowAddr: { fontSize: font.xs, marginTop: 2 },
  connect: { fontWeight: '700', fontSize: font.sm },
});
