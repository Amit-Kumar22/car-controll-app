import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight, Bluetooth, CarFront, House, RotateCcw, Wifi, type LucideIcon } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo, BrandMark } from '../components/Brand';
import { MOCK_MODE } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { useCarStore } from '../store/carStore';
import { useHomeStore } from '../store/homeStore';
import { cardShadow, font, palette, radius, spacing, useTheme } from '../theme';

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Compact module tile used in the 2-column grid. */
function ModuleTile({
  title,
  subtitle,
  icon: Icon,
  tone,
  online,
  onlineLabel,
  offlineLabel,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone: 'orange' | 'charcoal';
  online: boolean;
  onlineLabel: string;
  offlineLabel: string;
  onPress: () => void;
}) {
  const t = useTheme();
  const iconBg = tone === 'orange' ? t.colors.primarySoft : t.dark ? t.colors.surfaceAlt : '#EEEEED';
  const iconFg = tone === 'orange' ? t.colors.primaryText : t.dark ? t.colors.text : palette.charcoal;
  const statusColor = online ? t.colors.success : t.colors.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${online ? onlineLabel : offlineLabel}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, transform: [{ scale: pressed ? 0.97 : 1 }] },
        cardShadow(t),
      ]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
          <Icon color={iconFg} size={24} strokeWidth={2.2} />
        </View>
        <View style={[styles.arrow, { borderColor: t.colors.border }]}>
          <ArrowUpRight color={t.colors.textMuted} size={16} strokeWidth={2.4} />
        </View>
      </View>
      <Text style={[styles.tileTitle, { color: t.colors.text }]} numberOfLines={2}>
        {title}
      </Text>
      <Text style={[styles.tileSub, { color: t.colors.textMuted }]} numberOfLines={1}>
        {subtitle}
      </Text>
      <View style={[styles.statusChip, { backgroundColor: statusColor + '18' }]}>
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: online ? statusColor : t.colors.textMuted }]} numberOfLines={1}>
          {online ? onlineLabel : offlineLabel}
        </Text>
      </View>
    </Pressable>
  );
}

function QuickAction({
  label,
  icon: Icon,
  loading,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  loading?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.quick,
        { backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.quickIcon, { backgroundColor: t.colors.surface }]}>
        {loading ? <ActivityIndicator size="small" color={t.colors.primary} /> : <Icon color={t.colors.primaryText} size={18} />}
      </View>
      <Text style={[styles.quickText, { color: t.colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function HomeScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();

  const setupDone = useHomeStore((s) => s.setupDone);
  const boxReachable = useHomeStore((s) => s.reachability === 'reachable');
  const releaseWifi = useHomeStore((s) => s.releaseWifi);
  const carStatus = useCarStore((s) => s.status);
  const carDevice = useCarStore((s) => s.device);
  const lastCar = useCarStore((s) => s.lastDevice);
  const connect = useCarStore((s) => s.connect);

  // Leaving the home-automation module: give normal internet routing back.
  useFocusEffect(
    useCallback(() => {
      releaseWifi();
    }, [releaseWifi]),
  );

  const now = useMemo(() => new Date(), []);
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const carConnected = carStatus === 'connected';
  const connectedCount = Number(carConnected) + Number(boxReachable);
  const contentWidth = Math.min(width, 560);

  const showReconnect = !carConnected && !!lastCar;
  const showBoxSetup = !setupDone;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.background }} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={[styles.content, { width: contentWidth }]} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <BrandLogo width={150} />
          {MOCK_MODE && (
            <View style={[styles.demo, { backgroundColor: t.colors.primarySoft }]}>
              <Text style={[styles.demoText, { color: t.colors.primaryText }]}>DEMO</Text>
            </View>
          )}
        </View>

        {/* Welcome banner */}
        <LinearGradient
          colors={[palette.orange, palette.orangeDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerMark} pointerEvents="none">
            <BrandMark size={150} tint="rgba(255,255,255,0.14)" />
          </View>
          <Text style={styles.bannerDate}>{dateLabel}</Text>
          <Text style={styles.bannerTitle}>{greeting(now)}, Trainer</Text>
          <Text style={styles.bannerSub}>Robotics Trainer · Lab control</Text>
          <View style={styles.bannerStats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{connectedCount}/2</Text>
              <Text style={styles.statLabel}>Devices online</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue} numberOfLines={1}>
                {carConnected ? carDevice?.name ?? 'Car' : '—'}
              </Text>
              <Text style={styles.statLabel}>Active car</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Modules */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: t.colors.text }]}>Modules</Text>
          <Text style={[styles.sectionHint, { color: t.colors.textMuted }]}>Tap to open</Text>
        </View>
        <View style={styles.grid}>
          <ModuleTile
            title="Robot Car Control"
            subtitle="Bluetooth · HC-05"
            icon={CarFront}
            tone="orange"
            online={carConnected}
            onlineLabel="Connected"
            offlineLabel="Not connected"
            onPress={() => nav.navigate('CarControl')}
          />
          <ModuleTile
            title="Home Automation"
            subtitle="Wi-Fi · ESP32 box"
            icon={House}
            tone="charcoal"
            online={boxReachable}
            onlineLabel="Online"
            offlineLabel={setupDone ? 'Offline' : 'Not set up'}
            onPress={() => nav.navigate('HomeControl')}
          />
        </View>

        {/* Quick actions – only when there is something useful to do */}
        {(showReconnect || showBoxSetup) && (
          <>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: t.colors.text }]}>Quick actions</Text>
            </View>
            <View style={{ gap: spacing.sm }}>
              {showReconnect && (
                <QuickAction
                  label={`Reconnect ${lastCar!.name}`}
                  icon={carStatus === 'connecting' ? Bluetooth : RotateCcw}
                  loading={carStatus === 'connecting'}
                  onPress={async () => {
                    await connect(lastCar!);
                    nav.navigate('CarControl'); // shows the result (controls or the error/connect panel)
                  }}
                />
              )}
              {showBoxSetup && (
                <QuickAction label="Set up the control box" icon={Wifi} onPress={() => nav.navigate('HomeConnect')} />
              )}
            </View>
          </>
        )}

        <Text style={[styles.version, { color: t.colors.textMuted }]}>HiProTech · Robotics Trainer v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  demo: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5 },
  demoText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  banner: { borderRadius: radius.lg, padding: spacing.xl, overflow: 'hidden' },
  bannerMark: { position: 'absolute', right: -24, bottom: -28 },
  bannerDate: { color: 'rgba(255,255,255,0.85)', fontSize: font.xs, fontWeight: '700', letterSpacing: 0.4 },
  bannerTitle: { color: '#fff', fontSize: font.xxl, fontWeight: '800', marginTop: 6 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: font.sm, marginTop: 2 },
  bannerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  stat: { flex: 1 },
  statValue: { color: '#fff', fontSize: font.lg, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: font.xs, marginTop: 2 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: spacing.lg },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionTitle: { fontSize: font.lg, fontWeight: '800' },
  sectionHint: { fontSize: font.xs, fontWeight: '600' },

  grid: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, borderRadius: radius.lg - 4, borderWidth: 1, padding: spacing.lg, minHeight: 168 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tileIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: font.md, fontWeight: '800', marginTop: spacing.md, lineHeight: 20 },
  tileSub: { fontSize: font.xs, marginTop: 2 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: spacing.md,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },

  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickText: { fontSize: font.md, fontWeight: '700', flex: 1 },

  version: { textAlign: 'center', fontSize: font.xs, marginTop: spacing.lg },
});
