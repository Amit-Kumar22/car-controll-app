import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Cloud, LogIn, LogOut, UserPlus } from 'lucide-react-native';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Hint } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { CLOUD_WEBSITE, type CloudDevice } from '../services/cloudApi';
import { isDeviceOnline, useCloudStore } from '../store/cloudStore';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';
import { useNow } from '../hooks/useNow';
import { formatCloudValue } from '../utils/cloudFormat';

/** IoT Cloud: login/sign-up when signed out, the device list when signed in. */
export function CloudScreen() {
  const auth = useCloudStore((s) => s.auth);
  const init = useCloudStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);

  if (auth === 'unknown') return <Centered />;
  return auth === 'signedIn' ? <DeviceList /> : <AuthForm />;
}

function Centered() {
  const t = useTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator color={t.colors.primary} />
    </View>
  );
}

/* ------------------------------------------------------------------ auth */

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const t = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: t.colors.textMuted }]}>{label}</Text>
      <TextInput
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={t.colors.textMuted}
        autoCorrect={false}
        style={[styles.input, { color: t.colors.text, backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }, style]}
      />
    </View>
  );
}

function AuthForm() {
  const t = useTheme();
  const { login, signup } = useCloudStore.getState();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSignup = mode === 'signup';

  async function submit() {
    if (!email.trim() || !password || (isSignup && !name.trim())) return setError('Please fill in all fields');
    if (isSignup && password.length < 8) return setError('Password must be at least 8 characters');
    setBusy(true);
    setError(null);
    try {
      if (isSignup) await signup(name, email, password);
      else await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: spacing.lg }}>
            <View style={[styles.bigIcon, { backgroundColor: t.colors.primarySoft }]}>
              <Cloud color={t.colors.primaryText} size={28} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={[styles.title, { color: t.colors.text }]}>{isSignup ? 'Create an account' : 'Log in to IoT Cloud'}</Text>
              <Text style={{ color: t.colors.textMuted, lineHeight: 20 }}>
                Control your internet-connected devices from anywhere. Use the same account as the website.
              </Text>
            </View>
            {isSignup && <Input label="Name" value={name} onChangeText={setName} autoComplete="name" />}
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              onSubmitEditing={submit}
            />
            {error && <Hint tone="error">{error}</Hint>}
            <Button
              title={isSignup ? 'Create account' : 'Log in'}
              icon={isSignup ? UserPlus : LogIn}
              variant="accent"
              loading={busy}
              onPress={submit}
            />
            <Button
              title={isSignup ? 'I already have an account' : 'Create a new account'}
              variant="ghost"
              disabled={busy}
              onPress={() => {
                setMode(isSignup ? 'login' : 'signup');
                setError(null);
              }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* --------------------------------------------------------------- devices */

function DeviceList() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const devices = useCloudStore((s) => s.devices);
  const loading = useCloudStore((s) => s.loading);
  const error = useCloudStore((s) => s.error);
  const user = useCloudStore((s) => s.user);
  const { loadDevices, logout } = useCloudStore.getState();
  const now = useNow();

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (
        <Pressable accessibilityRole="button" accessibilityLabel="Log out" hitSlop={12} onPress={logout}>
          <LogOut color={t.colors.text} size={22} />
        </Pressable>
      ),
    });
    return () => nav.setOptions({ headerRight: undefined });
  }, [nav, t, logout]);

  // Refresh when coming back to the list.
  useFocusEffect(
    useCallback(() => {
      loadDevices();
    }, [loadDevices]),
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={devices ?? []}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading && !!devices} onRefresh={loadDevices} colors={[t.colors.accent]} tintColor={t.colors.accent} />
        }
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.sm }}>
            {user && <Text style={{ color: t.colors.textMuted }}>Signed in as {user.email}</Text>}
            {error && <Hint tone="error">{error}</Hint>}
          </View>
        }
        ListEmptyComponent={
          !devices ? (
            <Centered />
          ) : (
            <Card style={{ gap: spacing.sm }}>
              <Text style={[styles.title, { color: t.colors.text }]}>No devices yet</Text>
              <Text style={{ color: t.colors.textMuted, lineHeight: 20 }}>
                Create a device on the website ({CLOUD_WEBSITE}), flash its token onto your ESP32, and it shows up here.
              </Text>
            </Card>
          )
        }
        renderItem={({ item }) => <DeviceRow device={item} now={now} onPress={() => nav.navigate('CloudDevice', { id: item.id })} />}
      />
    </SafeAreaView>
  );
}

function DeviceRow({ device: d, now, onPress }: { device: CloudDevice; now: number; onPress: () => void }) {
  const t = useTheme();
  const online = isDeviceOnline(d, now);
  const statusColor = online ? t.colors.success : t.colors.textMuted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${d.name}, ${online ? 'online' : 'offline'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: t.colors.surface, borderColor: t.colors.border, transform: [{ scale: pressed ? 0.98 : 1 }] },
        cardShadow(t),
      ]}
    >
      <View style={styles.rowHead}>
        <Text style={[styles.rowTitle, { color: t.colors.text }]} numberOfLines={1}>
          {d.name}
        </Text>
        <View style={[styles.chip, { backgroundColor: statusColor + '18' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>{online ? 'Online' : 'Offline'}</Text>
        </View>
      </View>
      {d.datastreams.length > 0 && (
        <View style={styles.values}>
          {d.datastreams.slice(0, 4).map((ds) => (
            <View key={ds.pin} style={[styles.valueBox, { backgroundColor: t.colors.surfaceAlt }]}>
              <Text style={{ color: t.colors.textMuted, fontSize: font.xs }} numberOfLines={1}>
                {ds.name}
              </Text>
              <Text style={{ color: t.colors.text, fontWeight: '800', fontSize: font.md }} numberOfLines={1}>
                {formatCloudValue(ds)}
              </Text>
            </View>
          ))}
        </View>
      )}
      {d.role !== 'owner' && <Text style={{ color: t.colors.textMuted, fontSize: font.xs }}>Shared with you · {d.role}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  list: { padding: spacing.lg, gap: spacing.md },
  title: { fontSize: font.xl, fontWeight: '800' },
  bigIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { minHeight: 52, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: font.md },
  row: { borderRadius: radius.md, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  rowTitle: { fontSize: font.lg, fontWeight: '800', flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  values: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  valueBox: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minWidth: '47%', flexGrow: 1 },
});
