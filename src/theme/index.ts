/**
 * Trail Seeker Theme
 * Grim, neon-tinted wasteland aesthetic
 */

export const colors = {
  // Core palette
  background: '#0A0E13',
  surface: '#131922',
  surfaceLight: '#1C2533',
  surfaceHighlight: '#243044',

  // Text
  textPrimary: '#E8ECF1',
  textSecondary: '#8B95A5',
  textMuted: '#5A6577',
  textAccent: '#00FFAA',

  // Neon accents
  neonGreen: '#00FFAA',
  neonCyan: '#00D4FF',
  neonAmber: '#FFB800',
  neonRed: '#FF3B5C',
  neonPurple: '#B44AFF',

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
  overlay: 'rgba(10, 14, 19, 0.85)',
  overlayLight: 'rgba(10, 14, 19, 0.6)',
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
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
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
    shadowColor: '#00FFAA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

const theme = { colors, spacing, fontSize, fontWeight, borderRadius, shadows };
export default theme;
