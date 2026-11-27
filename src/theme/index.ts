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

/**
 * White + saffron theme, matching the HiProTech IoT website:
 * light-grey canvas, white cards with hairline borders, saffron for actions.
 */
const light: Theme = {
  dark: false,
  colors: {
    background: '#F7F7F8',
    surface: palette.white,
    surfaceAlt: '#FBFBFB',
    border: '#E8E8EA',
    text: '#1F2224',
    textMuted: '#6B6E70',
    primary: palette.orange,
    onPrimary: palette.white,
    primaryText: '#C25A12',
    primarySoft: '#FEF3EA',
    ink: palette.charcoal,
    onInk: palette.white,
    accent: palette.orange,
    onAccent: palette.white,
    danger: palette.danger,
    success: palette.success,
    warning: palette.warning,
    off: '#F1F1F2',
    onOff: palette.charcoal,
    shadow: '#101828',
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 };
export const font = { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, title: 32 };

/** Minimum touch target for car controls (spec: 64px). */
export const CONTROL_MIN_SIZE = 64;

/** The app always uses the light (white + saffron) theme. */
export function useTheme(): Theme {
  return light;
}

export function cardShadow(theme: Theme) {
  return {
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  };
}
