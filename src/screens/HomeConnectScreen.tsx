import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LayoutGrid, RefreshCw, RotateCcw, Save, Settings, Wifi } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Hint, SectionTitle, StatusPill } from '../components/ui';
import { HOME_BOX_DEFAULTS } from '../config';
import type { RootStackParamList } from '../navigation/types';
import { wifi } from '../services/wifi';
import { useHomeStore } from '../store/homeStore';
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
  } = useHomeStore();

  const [ssid, setSsid] = useState(settings.ssid);
  const [password, setPassword] = useState(settings.password);
  const [ip, setIp] = useState(settings.ip);
  useEffect(() => {
    setSsid(settings.ssid);
    setPassword(settings.password);
    setIp(settings.ip);
  }, [settings]);

  const ipError = ip && !IPV4.test(ip.trim()) ? 'Enter a valid IP address, e.g. 192.168.4.1' : null;
  const dirty = ssid !== settings.ssid || password !== settings.password || ip !== settings.ip;
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
    saveSettings({ ssid, password, ip });
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
  label: { fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    fontSize: font.md,
  },
});
