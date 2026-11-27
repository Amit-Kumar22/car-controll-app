import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Settings, Wifi, WifiOff } from 'lucide-react-native';
import { useCallback, useLayoutEffect } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApplianceCard } from '../components/ApplianceCard';
import { Button, StatusPill } from '../components/ui';
import { BOX_PING_INTERVAL_MS, MOCK_MODE } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { mockBox } from '../services/homeApi';
import { useAppliances } from '../store/appConfigStore';
import { useHomeStore } from '../store/homeStore';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';

export function HomeControlScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { width } = useWindowDimensions();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;

  const applianceList = useAppliances();
  const appliances = useHomeStore((s) => s.appliances);
  const pending = useHomeStore((s) => s.pending);
  const reachability = useHomeStore((s) => s.reachability);
  const refreshing = useHomeStore((s) => s.refreshing);
  const ip = useHomeStore((s) => s.settings.ip);
  const ssid = useHomeStore((s) => s.settings.ssid);
  const setupDone = useHomeStore((s) => s.setupDone);
  const { loadStatus, toggle, checkReachable } = useHomeStore.getState();

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Box settings"
          hitSlop={12}
          onPress={() => nav.navigate('HomeConnect')}
        >
          <Settings color={t.colors.text} size={22} />
        </Pressable>
      ),
    });
  }, [nav, t]);

  // Load state on focus, then keep checking reachability while visible.
  useFocusEffect(
    useCallback(() => {
      // Silent on focus: the panel below already explains when the box is offline.
      loadStatus({ silent: true });
      const timer = setInterval(() => {
        checkReachable();
      }, BOX_PING_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadStatus, checkReachable]),
  );

  const reachable = reachability === 'reachable';

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <StatusPill
          ok={reachable}
          pending={reachability === 'checking' || reachability === 'unknown'}
          label={
            reachable
              ? `Control box online · ${ip}`
              : reachability === 'unreachable'
                ? 'Control box not reachable'
                : 'Checking control box…'
          }
        />
        {(reachability === 'unreachable' || !setupDone) && reachability !== 'reachable' && (
          <View
            style={[
              styles.connectPanel,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border },
              cardShadow(t),
            ]}
          >
            <View style={styles.connectRow}>
              <View style={[styles.connectIcon, { backgroundColor: t.colors.primarySoft }]}>
                <WifiOff color={t.colors.primaryText} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.connectTitle, { color: t.colors.text }]}>
                  {setupDone ? 'Control box offline' : 'Control box not connected'}
                </Text>
                <Text style={{ color: t.colors.textMuted, fontSize: font.sm, marginTop: 2 }}>
                  Join the “{ssid}” Wi-Fi hotspot to switch the appliances.
                </Text>
              </View>
            </View>
            <Button title="Connect to control box" icon={Wifi} onPress={() => nav.navigate('HomeConnect')} />
          </View>
        )}
      </View>

      <FlatList
        key={columns}
        data={applianceList}
        keyExtractor={(a) => a.id}
        numColumns={columns}
        columnWrapperStyle={{ gap: spacing.lg }}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadStatus()}
            colors={[t.colors.accent]}
            tintColor={t.colors.accent}
          />
        }
        renderItem={({ item }) => (
          <ApplianceCard
            appliance={item}
            on={!!appliances[item.id]}
            loading={!!pending[item.id]}
            onToggle={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text style={[styles.footer, { color: t.colors.textMuted }]}>No appliances configured yet.</Text>
        }
        ListFooterComponent={
          <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
            <Text style={[styles.footer, { color: t.colors.textMuted }]}>Pull down to refresh.</Text>
            {MOCK_MODE && (
              <Button
                title="Mock: toggle box reachable"
                variant="ghost"
                onPress={() => {
                  mockBox.reachable = !mockBox.reachable;
                  checkReachable();
                }}
              />
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  grid: { padding: spacing.lg, gap: spacing.lg },
  footer: { textAlign: 'center', fontSize: font.sm },
  connectPanel: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  connectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  connectIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  connectTitle: { fontSize: font.lg, fontWeight: '800' },
});
