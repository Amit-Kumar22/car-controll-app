import { useColorScheme } from 'react-native';

/**
 * HiProTech brand palette (sampled from assets/brand/hiprotech-logo.png):
 *   orange  #F28735  – "Pro", primary actions, ON state, active controls
 *   charcoal #595A5A – "Hi" / "Tech", headings, D-pad, secondary surfaces
 */
export const palette = {
  orange: '#F28735',
  orangeDeep: '#D96E1E',
  orangeSoft: '#FDEBDD',
  charcoal: '#595A5A',
  charcoalDeep: '#3E3F3F',
  ink: '#2A2B2B',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#D97706',
  white: '#FFFFFF',
  black: '#000000',
  cream: '#FAF7F4',
  sand: '#F1ECE7',
  stone: '#E4DED8',
  grey400: '#9A9A98',
  grey500: '#7A7B7A',
  night: '#141414',
  nightSurface: '#1F2020',
  nightAlt: '#2A2B2B',
  nightBorder: '#343535',
};

export interface Theme {
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    /** Brand orange – filled buttons, ON state, highlights. */
    primary: string;
    onPrimary: string;
    /** Orange that is readable as text on the background. */
    primaryText: string;
    primarySoft: string;
    /** Brand charcoal – D-pad, dark cards. */
    ink: string;
    onInk: string;
    accent: string;
    onAccent: string;
    danger: string;
    success: string;
    warning: string;
    off: string;
    onOff: string;
    shadow: string;
  };
}

const light: Theme = {
  dark: false,
  colors: {
    background: palette.white,
    surface: palette.white,
    surfaceAlt: '#F7F6F4',
    border: '#ECE8E4',
    text: palette.ink,
    textMuted: palette.grey500,
    primary: palette.orange,
    onPrimary: palette.white,
    primaryText: palette.orangeDeep,
    primarySoft: palette.orangeSoft,
    ink: palette.charcoal,
    onInk: palette.white,
    accent: palette.orange,
    onAccent: palette.white,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    off: '#F1EFEC',
    onOff: palette.charcoal,
    shadow: '#3B2A1C',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    background: palette.night,
    surface: palette.nightSurface,
    surfaceAlt: palette.nightAlt,
    border: palette.nightBorder,
    text: '#F3F1EF',
    textMuted: palette.grey400,
    primary: palette.orange,
    onPrimary: palette.white,
    primaryText: '#F7A566',
    primarySoft: '#3A2717',
    ink: '#4A4B4B',
    onInk: palette.white,
    accent: palette.orange,
    onAccent: palette.white,
    danger: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    off: palette.nightAlt,
    onOff: '#C9C9C7',
    shadow: palette.black,
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const font = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, title: 32 };

/** Minimum touch target for car controls (spec: 64px). */
export const CONTROL_MIN_SIZE = 64;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export function cardShadow(theme: Theme) {
  return {
    shadowColor: theme.colors.shadow,
    shadowOpacity: theme.dark ? 0.45 : 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: theme.dark ? 2 : 3,
  };
}
