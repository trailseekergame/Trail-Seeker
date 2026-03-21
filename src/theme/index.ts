/**
 * Trail Seeker Theme
 * Outlaw field console — dark, sharp, functional
 */

export const colors = {
  // Core palette — darker, more contrast
  background: '#080B10',
  surface: '#0F1319',
  surfaceLight: '#1A2030',
  surfaceHighlight: '#1E2A3C',

  // Text — slightly cooler, more terminal-like
  textPrimary: '#D8DDE5',
  textSecondary: '#7A8696',
  textMuted: '#4A5567',
  textAccent: '#00FFAA',

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
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
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
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
};

const theme = { colors, spacing, fontSize, fontWeight, borderRadius, shadows };
export default theme;
