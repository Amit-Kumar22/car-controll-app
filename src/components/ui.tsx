import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.border }, cardShadow(t), style]}>
      {children}
    </View>
  );
}

type Variant = 'primary' | 'accent' | 'danger' | 'outline' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  loading,
  disabled,
  style,
  accessibilityHint,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const t = useTheme();
  const bg: Record<Variant, string> = {
    primary: t.colors.primary,
    accent: t.colors.accent,
    danger: t.colors.danger,
    outline: t.colors.surface,
    ghost: 'transparent',
  };
  const fg =
    variant === 'outline'
      ? t.colors.text
      : variant === 'ghost'
      ? t.colors.primaryText
      : variant === 'accent'
        ? t.colors.onAccent
        : t.colors.onPrimary;
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg[variant],
          borderColor: variant === 'outline' ? t.colors.border : 'transparent',
          ...(variant === 'primary' || variant === 'accent'
            ? { shadowColor: t.colors.primary, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 }
            : null),
          opacity: isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        Icon && <Icon color={fg} size={20} strokeWidth={2.2} />
      )}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function StatusPill({
  ok,
  label,
  pending,
}: {
  ok: boolean | null;
  label: string;
  pending?: boolean;
}) {
  const t = useTheme();
  const color = pending || ok === null ? t.colors.warning : ok ? t.colors.success : t.colors.danger;
  return (
    <View
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      style={[styles.pill, { backgroundColor: color + '1F', borderColor: color + '55' }]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={[styles.section, { color: t.colors.primaryText }]}>{children}</Text>;
}

export function Hint({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  const t = useTheme();
  const color = tone === 'error' ? t.colors.danger : t.colors.primary;
  return (
    <View style={[styles.hint, { backgroundColor: tone === 'error' ? color + '14' : t.colors.primarySoft, borderColor: color + '40' }]}>
      <Text style={[styles.hintText, { color: tone === 'error' ? color : t.colors.text }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg - 4, borderWidth: 1, padding: spacing.xl },
  button: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
  },
  buttonText: { fontSize: font.md, fontWeight: '700', letterSpacing: 0.2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pillText: { fontSize: font.sm, fontWeight: '700', flexShrink: 1 },
  section: {
    fontSize: font.xs,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  hint: { borderRadius: 14, borderWidth: 1, padding: spacing.lg, borderLeftWidth: 4 },
  hintText: { fontSize: font.sm, lineHeight: 20 },
});
