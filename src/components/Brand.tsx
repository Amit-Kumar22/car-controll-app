import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';

const LOGO_LIGHT = require('../../assets/brand/hiprotech-logo.png');
const MARK = require('../../assets/brand/hiprotech-mark.png');

/** Logo aspect ratio (1928 × 300). */
const LOGO_RATIO = 1928 / 300;
/** Robot "P" mark aspect ratio (284 × 263). */
const MARK_RATIO = 284 / 263;

/** Full HiProTech word-mark. */
export function BrandLogo({ width }: { width: number }) {
  return (
    <Image
      source={LOGO_LIGHT}
      style={{ width, height: width / LOGO_RATIO }}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="HiProTech"
    />
  );
}

/** The orange robot "P" from the logo. */
export function BrandMark({ size, tint }: { size: number; tint?: string }) {
  return (
    <Image
      source={MARK}
      style={{ width: size * MARK_RATIO, height: size, tintColor: tint }}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Two round "robot eyes" – the motif from the P in the logo. */
export function RobotEyes({
  size = 14,
  color,
  gap,
  style,
}: {
  size?: number;
  color?: string;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const c = color ?? t.colors.primary;
  const eye = { width: size, height: size, borderRadius: size / 2, borderColor: c, borderWidth: Math.max(2, size / 7) };
  return (
    <View style={[styles.eyes, { gap: gap ?? size * 0.9 }, style]} accessibilityElementsHidden importantForAccessibility="no">
      <View style={eye} />
      <View style={eye} />
    </View>
  );
}

const styles = StyleSheet.create({
  eyes: { flexDirection: 'row', alignItems: 'center' },
});
