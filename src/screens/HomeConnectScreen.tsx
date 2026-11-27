import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, RefreshCw, RotateCcw, Save, Search, Settings, Wifi } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Hint, SectionTitle, StatusPill } from '../components/ui';
import { HOME_BOX_DEFAULTS, type AppliancePaths } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { wifi } from '../services/wifi';
import { useAppliances } from '../store/appConfigStore';
import { useHomeStore, withAllPaths } from '../store/homeStore';
import { showToast } from '../store/toastStore';
import { font, radius, spacing, useTheme } from '../theme';

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;

function Field({
  label,
  value,
  onChangeText,
  secure,
  keyboardType,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
  error?: string | null;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: t.colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        style={[
          styles.input,
          {
            color: t.colors.text,
            backgroundColor: t.colors.surfaceAlt,
            borderColor: error ? t.colors.danger : t.colors.border,
          },
        ]}
      />
      {error && <Text style={{ color: t.colors.danger, fontSize: font.xs }}>{error}</Text>}
    </View>
  );
}

export function HomeConnectScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    settings,
    currentSsid,
    reachability,
    joining,
    joinError,
    refreshSsid,
    connectToBox,
    checkReachable,
    saveSettings,
    resetSettings,
    discoverRoutes,
  } = useHomeStore();

  const [ssid, setSsid] = useState(settings.ssid);
  const [password, setPassword] = useState(settings.password);
  const [ip, setIp] = useState(settings.ip);
  const appliances = useAppliances();
  // Effective paths (user overrides + defaults from the website's appliance list).
  const savedPaths = useMemo(() => withAllPaths(settings.paths, appliances), [settings.paths, appliances]);
  const [paths, setPaths] = useState<Record<string, AppliancePaths>>(savedPaths);
  const [routes, setRoutes] = useState<string[] | null>(null);
  const [discovering, setDiscovering] = useState(false);
  useEffect(() => {
    setSsid(settings.ssid);
    setPassword(settings.password);
    setIp(settings.ip);
    setPaths(savedPaths);
  }, [settings, savedPaths]);

  const setPath = (id: string, key: keyof AppliancePaths, v: string) =>
    setPaths((prev) => ({ ...prev, [id]: { ...prev[id], [key]: v } }));

  async function onDiscover() {
    setDiscovering(true);
    try {
      const found = await discoverRoutes();
      setRoutes(found);
      if (!found.length) showToast('No commands found on the box home page', 'info');
    } catch {
      setRoutes(null);
      showToast('Cannot reach the box – connect to its Wi-Fi first', 'error');
    } finally {
      setDiscovering(false);
    }
  }

  const ipError = ip && !IPV4.test(ip.trim()) ? 'Enter a valid IP address, e.g. 192.168.4.1' : null;
  const pathsDirty = appliances.some(
    (a) => paths[a.id]?.on !== savedPaths[a.id]?.on || paths[a.id]?.off !== savedPaths[a.id]?.off,
  );
  const dirty = ssid !== settings.ssid || password !== settings.password || ip !== settings.ip || pathsDirty;
  const onBox = currentSsid === settings.ssid;
  const backToPanel = () => (nav.canGoBack() ? nav.goBack() : nav.replace('HomeControl'));

  useFocusEffect(
    useCallback(() => {
      refreshSsid().then(() => checkReachable());
    }, [refreshSsid, checkReachable]),
  );

  async function onConnect() {
    if (dirty) onSave();
    const ok = await connectToBox();
    if (ok) {
      showToast('Connected to the control box', 'success');
      backToPanel();
    }
  }

  function onSave() {
    if (!ssid.trim() || ipError) {
      showToast('Please fix the settings first', 'error');
      return;
    }
    saveSettings({ ssid, password, ip, paths });
    showToast('Settings saved', 'success');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: spacing.md }}>
            <Text style={[styles.title, { color: t.colors.text }]}>Connect to the control box</Text>
            <Text style={{ color: t.colors.textMuted, lineHeight: 20 }}>
              The box creates its own Wi-Fi hotspot “{settings.ssid}”. It has no internet – that’s
              normal. The app will join it and send its requests over Wi-Fi only.
            </Text>

            <StatusPill
              ok={currentSsid ? onBox : false}
              label={currentSsid ? `Wi-Fi: ${currentSsid}` : 'Wi-Fi: not connected / unknown'}
            />
            <StatusPill
              ok={reachability === 'reachable'}
              pending={reachability === 'checking'}
              label={
                reachability === 'reachable'
                  ? `Box reachable at ${settings.ip}`
                  : reachability === 'checking'
                    ? 'Checking box…'
                    : `Box not reachable at ${settings.ip}`
              }
            />

            <Button
              title={joining ? 'Joining hotspot…' : 'Connect to control box'}
              icon={Wifi}
              variant="accent"
              loading={joining}
              onPress={onConnect}
            />
            <Button
              title="Check again"
              icon={RefreshCw}
              variant="ghost"
              disabled={joining}
              onPress={async () => {
                await refreshSsid();
                await checkReachable();
              }}
            />
            {reachability === 'reachable' && (
              <Button title="Open control panel" icon={LayoutGrid} onPress={backToPanel} />
            )}
          </Card>

          {joinError && (
            <Card style={{ gap: spacing.md }}>
              <Hint tone="error">{joinError}</Hint>
              <Text style={{ color: t.colors.text, lineHeight: 22 }}>
                Join manually:{'\n'}1. Tap “Open Wi-Fi settings”.{'\n'}2. Choose “{settings.ssid}” and
                enter the password.{'\n'}3. If Android says “No internet”, choose “Stay connected” /
                “Keep”.{'\n'}4. Come back here and tap “Check again”.
              </Text>
              <Button
                title="Open Wi-Fi settings"
                icon={Settings}
                variant="outline"
                onPress={() => wifi.openWifiSettings()}
              />
            </Card>
          )}

          <SectionTitle>Box settings</SectionTitle>
          <Card style={{ gap: spacing.lg }}>
            <Field label="Hotspot name (SSID)" value={ssid} onChangeText={setSsid} placeholder={HOME_BOX_DEFAULTS.ssid} />
            <Field label="Password" value={password} onChangeText={setPassword} secure placeholder="••••••••" />
            <Field
              label="Box IP address"
              value={ip}
              onChangeText={setIp}
              keyboardType="decimal-pad"
              placeholder={HOME_BOX_DEFAULTS.ip}
              error={ipError}
            />
          </Card>

          <SectionTitle>Appliance commands</SectionTitle>
          <Card style={{ gap: spacing.lg }}>
            <Text style={{ color: t.colors.textMuted, lineHeight: 20 }}>
              The URL path the app opens on the box to switch each appliance, e.g. “/fan/on”. If a
              switch shows “HTTP 404”, ask the robotics team for the right path, or tap “Find commands
              on box”.
            </Text>
            {appliances.map((a) => (
              <View key={a.id} style={{ gap: spacing.sm }}>
                <Text style={[styles.applianceName, { color: t.colors.text }]}>{a.name}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="ON path"
                      value={paths[a.id]?.on ?? ''}
                      onChangeText={(v) => setPath(a.id, 'on', v)}
                      placeholder={a.paths.on}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="OFF path"
                      value={paths[a.id]?.off ?? ''}
                      onChangeText={(v) => setPath(a.id, 'off', v)}
                      placeholder={a.paths.off}
                    />
                  </View>
                </View>
              </View>
            ))}
            <Button
              title={discovering ? 'Searching…' : 'Find commands on box'}
              icon={Search}
              variant="ghost"
              loading={discovering}
              onPress={onDiscover}
            />
            {routes && routes.length > 0 && (
              <View style={{ gap: spacing.xs }}>
                <Text style={[styles.label, { color: t.colors.textMuted }]}>Found on the box</Text>
                <Text selectable style={{ color: t.colors.text, fontSize: font.md, lineHeight: 24 }}>
                  {routes.join('\n')}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button title="Save" icon={Save} disabled={!dirty} onPress={onSave} style={{ flex: 1 }} />
              <Button
                title="Defaults"
                icon={RotateCcw}
                variant="outline"
                onPress={() => {
                  resetSettings();
                  showToast('Defaults restored', 'info');
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  title: { fontSize: font.xl, fontWeight: '800' },
  applianceName: { fontSize: font.md, fontWeight: '700' },
  label: { fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
  },
});
