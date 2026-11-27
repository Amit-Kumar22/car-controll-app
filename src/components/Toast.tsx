import { CircleAlert, CircleCheck, Info } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '../store/toastStore';
import { cardShadow, font, radius, spacing, useTheme } from '../theme';

export function Toast() {
  const { message, kind, id, hide } = useToastStore();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: message ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [message, id, anim]);

  if (!message) return null;
  const color = kind === 'error' ? t.colors.danger : kind === 'success' ? t.colors.success : t.colors.primary;
  const Icon = kind === 'error' ? CircleAlert : kind === 'success' ? CircleCheck : Info;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          bottom: insets.bottom + spacing.lg,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={hide}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
        style={[styles.toast, { backgroundColor: t.colors.surface, borderLeftColor: color }, cardShadow(t)]}
      >
        <Icon color={color} size={20} />
        <Text style={[styles.text, { color: t.colors.text }]}>{message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: spacing.lg, right: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderLeftWidth: 5,
  },
  text: { flex: 1, fontSize: font.sm, fontWeight: '600' },
});
