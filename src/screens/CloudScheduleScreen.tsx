import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Save } from 'lucide-react-native';
import { useLayoutEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Hint } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { useCloudStore } from '../store/cloudStore';
import { showToast } from '../store/toastStore';
import { font, radius, spacing, useTheme } from '../theme';
import { ALL_DAYS, deviceTimeZone, WEEK_ORDER, WEEKDAY_SHORT, WORK_DAYS } from '../utils/cloudFormat';

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? t.colors.primary : t.colors.surface, borderColor: active ? t.colors.primary : t.colors.border },
      ]}
    >
      <Text style={{ color: active ? t.colors.onPrimary : t.colors.text, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function Label({ children }: { children: string }) {
  const t = useTheme();
  return <Text style={[styles.label, { color: t.colors.textMuted }]}>{children}</Text>;
}

export function CloudScheduleScreen() {
  const t = useTheme();
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { deviceId, scheduleId } = useRoute<RouteProp<RootStackParamList, 'CloudSchedule'>>().params;
  const device = useCloudStore((s) => s.devices?.find((d) => d.id === deviceId));
  const initial = useCloudStore((s) => s.schedules[deviceId]?.find((x) => x.id === scheduleId));
  const saveSchedule = useCloudStore((s) => s.saveSchedule);
  const pins = device?.datastreams.filter((d) => d.kind !== 'value') ?? [];

  const [h0, m0] = (initial?.time ?? '19:00').split(':').map(Number);
  const [name, setName] = useState(initial?.name ?? '');
  const [pin, setPin] = useState(initial?.pin ?? pins[0]?.pin ?? '');
  const [value, setValue] = useState(initial ? String(initial.value ?? '') : '1');
  const [hour, setHour] = useState(String(((h0 + 11) % 12) + 1));
  const [minute, setMinute] = useState(String(m0).padStart(2, '0'));
  const [pm, setPm] = useState(h0 >= 12);
  const [days, setDays] = useState<number[]>(initial?.days ?? ALL_DAYS);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ds = pins.find((d) => d.pin === pin);

  useLayoutEffect(() => {
    nav.setOptions({ title: initial ? 'Edit schedule' : 'New schedule' });
  }, [nav, initial]);

  function pickPin(p: string) {
    setPin(p);
    const next = pins.find((d) => d.pin === p);
    if (next?.kind === 'switch' && value !== '0' && value !== '1') setValue('1');
    if (next?.kind === 'slider' && ds?.kind === 'switch') setValue(String(next.min));
  }

  async function onSave() {
    const h = Number(hour);
    const m = Number(minute);
    const v = Number(value);
    if (!name.trim()) return setError('Give the schedule a name');
    if (!ds) return setError('Pick a datastream');
    if (!Number.isInteger(h) || h < 1 || h > 12) return setError('Hour must be 1 – 12');
    if (!Number.isInteger(m) || m < 0 || m > 59) return setError('Minute must be 0 – 59');
    if (days.length === 0) return setError('Pick at least one day');
    if (value.trim() === '' || !Number.isFinite(v)) return setError('Enter a value');
    if (ds.kind === 'slider' && (v < ds.min || v > ds.max)) return setError(`Value must be ${ds.min} – ${ds.max}`);
    const h24 = (h % 12) + (pm ? 12 : 0);
    setError(null);
    setSaving(true);
    try {
      await saveSchedule(
        deviceId,
        {
          name: name.trim(),
          pin,
          value: v,
          time: `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          days,
          // Keep the zone it was made in, so editing while travelling doesn't shift it.
          timezone: initial?.timezone ?? deviceTimeZone(),
        },
        initial?.id,
      );
      showToast(initial ? 'Schedule saved' : 'Schedule created', 'success');
      nav.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
      setSaving(false);
    }
  }

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  const inputStyle = [styles.input, { color: t.colors.text, backgroundColor: t.colors.surfaceAlt, borderColor: t.colors.border }];

  if (!device) {
    return (
      <View style={styles.center}>
        <Text style={{ color: t.colors.textMuted }}>Device not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Name</Label>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Evening light"
                placeholderTextColor={t.colors.textMuted}
                maxLength={80}
                accessibilityLabel="Name"
                style={inputStyle}
              />
            </View>

            <View style={{ gap: spacing.sm }}>
              <Label>Datastream</Label>
              <View style={styles.wrap}>
                {pins.map((d) => (
                  <Chip key={d.pin} label={`${d.name} (${d.pin})`} active={d.pin === pin} onPress={() => pickPin(d.pin)} />
                ))}
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Label>Set to</Label>
              {ds?.kind === 'switch' ? (
                <View style={styles.wrap}>
                  <Chip label="ON" active={value === '1'} onPress={() => setValue('1')} />
                  <Chip label="OFF" active={value === '0'} onPress={() => setValue('0')} />
                </View>
              ) : (
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  keyboardType="numeric"
                  placeholder={ds ? `${ds.min} – ${ds.max}` : ''}
                  placeholderTextColor={t.colors.textMuted}
                  accessibilityLabel="Value"
                  style={inputStyle}
                />
              )}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Label>Time</Label>
              <View style={[styles.wrap, { alignItems: 'center' }]}>
                <TextInput
                  value={hour}
                  onChangeText={(v) => setHour(v.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  accessibilityLabel="Hour"
                  style={[inputStyle, styles.timeBox]}
                />
                <Text style={{ color: t.colors.text, fontSize: font.xl, fontWeight: '800' }}>:</Text>
                <TextInput
                  value={minute}
                  onChangeText={(v) => setMinute(v.replace(/\D/g, '').slice(0, 2))}
                  onBlur={() => minute && setMinute(minute.padStart(2, '0'))}
                  keyboardType="number-pad"
                  accessibilityLabel="Minute"
                  style={[inputStyle, styles.timeBox]}
                />
                <Chip label="AM" active={!pm} onPress={() => setPm(false)} />
                <Chip label="PM" active={pm} onPress={() => setPm(true)} />
              </View>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Label>Days</Label>
              <View style={styles.wrap}>
                {WEEK_ORDER.map((d) => (
                  <Chip key={d} label={WEEKDAY_SHORT[d]} active={days.includes(d)} onPress={() => toggleDay(d)} />
                ))}
              </View>
              <View style={styles.wrap}>
                <Button title="Every day" variant="ghost" onPress={() => setDays(ALL_DAYS)} />
                <Button title="Mon – Fri" variant="ghost" onPress={() => setDays(WORK_DAYS)} />
                <Button title="Weekends" variant="ghost" onPress={() => setDays([0, 6])} />
              </View>
            </View>
          </Card>

          {error && <Hint tone="error">{error}</Hint>}
          <Button title={initial ? 'Save' : 'Create schedule'} icon={Save} loading={saving} onPress={onSave} />
          <Text style={{ color: t.colors.textMuted, fontSize: font.sm, textAlign: 'center' }}>
            Runs on the server, so it works even when this phone is off.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl * 2 },
  label: { fontSize: font.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { minHeight: 52, borderWidth: 1.5, borderRadius: radius.sm, paddingHorizontal: spacing.md, fontSize: font.md },
  timeBox: { width: 64, textAlign: 'center', fontSize: font.xl, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1.5, justifyContent: 'center' },
});
