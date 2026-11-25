import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Bluetooth, BluetoothOff, BluetoothSearching, OctagonX, RefreshCw, RotateCcw, Unplug, Zap } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DPad } from '../components/DPad';
import { Button } from '../components/ui';
import { MOCK_MODE } from '../config';
import { useHoldToMove } from '../hooks/useHoldToMove';
import type { RootStackParamList } from '../navigation/types';
import { mockCarLink } from '../services/bluetooth';
import { useCarStore } from '../store/carStore';
import { cardShadow, CONTROL_MIN_SIZE, font, radius, spacing, useTheme } from '../theme';

function ConnectionBar({ onConnect }: { onConnect: () => void }) {
  const t = useTheme();
  const status = useCarStore((s) => s.status);
  const device = useCarStore((s) => s.device);
  const lastDevice = useCarStore((s) => s.lastDevice);
  const connected = status === 'connected';
  const color = connected ? t.colors.success : status === 'connecting' ? t.colors.warning : t.colors.danger;
  const label = connected
    ? `Connected to ${device?.name ?? 'car'}`
    : status === 'connecting'
      ? `Connecting to ${lastDevice?.name ?? 'car'}…`
      : status === 'lost'
        ? 'Connection lost – car stopped'
        : 'Not connected';
  const Icon = connected ? Bluetooth : BluetoothOff;
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="assertive"
      style={[styles.bar, { backgroundColor: color }]}
    >
      <Icon color="#fff" size={18} />
      <Text style={styles.barText} numberOfLines={1}>
        {label}
      </Text>
      {!connected && status !== 'connecting' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Connect to Bluetooth"
          onPress={onConnect}
          hitSlop={8}
          style={({ pressed }) => [styles.barBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={[styles.barBtnText, { color: color }]}>Connect</Text>
        </Pressable>
      )}
    </View>
  );
}

function StopButton({ onPress, size, disabled }: { onPress: () => void; size: number; disabled: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergency stop"
      onPressIn={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.stop,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: disabled ? t.colors.off : t.colors.danger,
          borderColor: disabled ? t.colors.border : t.colors.danger + '55',
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
        !disabled && cardShadow(t),
      ]}
    >
      <OctagonX color={disabled ? t.colors.onOff : '#fff'} size={size * 0.32} strokeWidth={2.4} />
      <Text style={[styles.stopText, { color: disabled ? t.colors.onOff : '#fff' }]}>STOP</Text>
    </Pressable>
  );
}

export function CarControlScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const status = useCarStore((s) => s.status);
  const lastDevice = useCarStore((s) => s.lastDevice);
  const lostReason = useCarStore((s) => s.lostReason);
  const lastCommand = useCarStore((s) => s.lastCommand);
  const { connect, disconnect, acknowledgeLost } = useCarStore.getState();

  const connected = status === 'connected';
  const { active, pressIn, pressOut, emergencyStop } = useHoldToMove(connected);

  const reconnect = useCallback(async () => {
    if (!lastDevice) {
      nav.navigate('CarConnect');
      return;
    }
    const ok = await connect(lastDevice);
    if (!ok) {
      Alert.alert('Reconnect failed', useCarStore.getState().error ?? 'Could not reconnect.', [
        { text: 'Choose device', onPress: () => nav.navigate('CarConnect') },
        { text: 'OK', style: 'cancel' },
      ]);
    }
  }, [lastDevice, connect, nav]);

  // Safety alert on connection loss (only while this screen is visible).
  useFocusEffect(
    useCallback(() => {
      if (!lostReason) return;
      Alert.alert(
        'Connection lost – car stopped',
        'The Bluetooth link to the car dropped. Controls are disabled until you reconnect.',
        [
          { text: 'Close', style: 'cancel', onPress: acknowledgeLost },
          {
            text: 'Reconnect',
            onPress: () => {
              acknowledgeLost();
              reconnect();
            },
          },
        ],
        { cancelable: true, onDismiss: acknowledgeLost },
      );
    }, [lostReason, acknowledgeLost, reconnect]),
  );

  // Never start moving on (re)connect.
  useEffect(() => {
    if (connected) useCarStore.getState().stop();
  }, [connected]);

  // Size the pad to the available space in either orientation.
  const padArea = landscape ? Math.min(height - 140, width * 0.5) : Math.min(width - spacing.lg * 2, height * 0.46);
  const padSize = Math.max(CONTROL_MIN_SIZE * 3 + 12, padArea);
  const stopSize = Math.max(CONTROL_MIN_SIZE * 1.5, landscape ? Math.min(height * 0.45, 180) : Math.min(width * 0.36, 150));

  const openDeviceList = () => nav.navigate('CarConnect');

  // Shown at the top while not connected: the main way into the Bluetooth device list.
  const connectPanel = !connected && (
    <View style={[styles.connectPanel, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, cardShadow(t)]}>
      <View style={styles.connectText}>
        <View style={[styles.connectIcon, { backgroundColor: t.colors.primarySoft }]}>
          <BluetoothSearching color={t.colors.primaryText} size={24} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.connectTitle, { color: t.colors.text }]}>
            {status === 'lost' ? 'Car disconnected' : 'Car not connected'}
          </Text>
          <Text style={[styles.connectSub, { color: t.colors.textMuted }]}>
            Connect over Bluetooth to unlock the controls.
          </Text>
        </View>
      </View>
      <View style={[styles.actions, landscape && { flexWrap: 'nowrap' }]}>
        <Button
          title="Connect to Bluetooth"
          icon={Bluetooth}
          disabled={status === 'connecting'}
          onPress={openDeviceList}
          style={{ flexGrow: 1 }}
        />
        {lastDevice && (
          <Button
            title={`Reconnect ${lastDevice.name}`}
            icon={RotateCcw}
            variant="outline"
            loading={status === 'connecting'}
            onPress={reconnect}
            style={{ flexGrow: 1 }}
          />
        )}
      </View>
    </View>
  );

  const actions = connected && (
    <View style={[styles.actions, landscape && { flexDirection: 'column' }]}>
      <Button title="Change device" icon={RefreshCw} variant="outline" onPress={openDeviceList} style={{ flexGrow: 1 }} />
      <Button title="Disconnect" icon={Unplug} variant="ghost" onPress={() => disconnect()} style={{ flexGrow: 1 }} />
      {MOCK_MODE && (
        <Button
          title="Simulate connection loss"
          icon={Zap}
          variant="ghost"
          onPress={() => mockCarLink?.simulateConnectionLoss()}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <ConnectionBar onConnect={openDeviceList} />
      <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={!active}>
        {connectPanel}
        <View style={[styles.content, landscape && styles.contentLandscape]}>
        <View style={styles.padWrap}>
          <DPad
            size={padSize}
            active={active}
            disabled={!connected}
            onPressIn={pressIn}
            onPressOut={pressOut}
          />
        </View>

        <View style={[styles.side, landscape && { flex: 1 }]}>
          <StopButton onPress={emergencyStop} size={stopSize} disabled={!connected} />
          <Text style={[styles.help, { color: t.colors.textMuted }]}>
            {connected
              ? 'Hold an arrow to drive. Let go to stop.'
              : 'Controls are disabled while not connected.'}
          </Text>
          {MOCK_MODE && (
            <Text style={[styles.mock, { color: t.colors.textMuted, borderColor: t.colors.border }]}>
              Mock car received: {lastCommand ?? '–'}
            </Text>
          )}
          {actions}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  barText: { color: '#fff', fontWeight: '800', fontSize: font.md, flex: 1 },
  barBtn: { backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  barBtnText: { fontWeight: '800', fontSize: font.sm },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  connectPanel: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  connectText: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  connectIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  connectTitle: { fontSize: font.lg, fontWeight: '800' },
  connectSub: { fontSize: font.sm, marginTop: 2 },
  content: { gap: spacing.xl, alignItems: 'center' },
  contentLandscape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  padWrap: { alignItems: 'center', justifyContent: 'center' },
  side: { alignItems: 'center', gap: spacing.lg, alignSelf: 'stretch' },
  stop: { alignItems: 'center', justifyContent: 'center', borderWidth: 6 },
  stopText: { fontSize: font.xl, fontWeight: '900', letterSpacing: 2 },
  help: { fontSize: font.sm, textAlign: 'center' },
  mock: {
    fontSize: font.sm,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignSelf: 'stretch' },
});
