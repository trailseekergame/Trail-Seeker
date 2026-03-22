/**
 * Trail Seeker Theme
 * Outlaw field console — dark, sharp, functional
 */

export const colors = {
  // Core palette — field terminal darkness
  background: '#060A0E',
  surface: '#0C1018',
  surfaceLight: '#151C28',
  surfaceHighlight: '#1A2436',

  // Text — dim terminal phosphor
  textPrimary: '#C8D0DC',
  textSecondary: '#5E6E82',
  textMuted: '#3A4858',
  textAccent: '#00FFAA',

  // Subtle CRT tint
  terminalGlow: 'rgba(0, 232, 156, 0.07)',

  // Neon accents — slightly desaturated for grit
  neonGreen: '#00E89C',
  neonCyan: '#00C4EE',
  neonAmber: '#E8A800',
  neonRed: '#E8354F',
  neonPurple: '#A040E8',

  // Functional
  success: '#00FFAA',
  warning: '#FFB800',
  danger: '#FF3B5C',
  info: '#00D4FF',

  // Resources
  scrap: '#FFB800',
  supplies: '#00FFAA',
  specialLoot: '#B44AFF',

  // Faction colors
  directorate: '#FF3B5C',
  freeBands: '#00FFAA',
  raiders: '#FFB800',

  // Tab bar
  tabBarBg: '#0D1117',
  tabBarBorder: '#1C2533',
  tabActive: '#00FFAA',
  tabInactive: '#5A6577',

  // Overlay
  overlay: 'rgba(8, 11, 16, 0.9)',
  overlayLight: 'rgba(8, 11, 16, 0.65)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 36,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

export const borderRadius = {
  sm: 0,
  md: 2,
  lg: 4,
  xl: 6,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  neonGlow: {
    shadowColor: '#00E89C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
};

const theme = { colors, spacing, fontSize, fontWeight, borderRadius, shadows };
export default theme;
