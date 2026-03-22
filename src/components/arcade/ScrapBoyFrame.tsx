import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface Props {
  title?: string;
  children: React.ReactNode;
}

/**
 * Scrap-Boy — pixel-style retro handheld frame for arcade games.
 * Wraps content in a "device" with a screen bezel, speaker grille,
 * and title label. All children render inside the "screen" area.
 */
export default function ScrapBoyFrame({ title = 'SCRAP-BOY', children }: Props) {
  return (
    <View style={styles.device}>
      {/* Top label */}
      <View style={styles.labelRow}>
        <View style={styles.labelDot} />
        <Text style={styles.label}>{title}</Text>
        <View style={styles.labelDot} />
      </View>

      {/* Screen bezel */}
      <View style={styles.bezel}>
        <View style={styles.screen}>
          {children}
        </View>
      </View>

      {/* Bottom: speaker grille */}
      <View style={styles.speakerRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={styles.speakerLine} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  device: {
    flex: 1,
    backgroundColor: '#1A1E28',
    borderWidth: 2,
    borderColor: '#2A3040',
    borderRadius: 12,
    margin: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A5567',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  labelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A3040',
  },
  bezel: {
    flex: 1,
    marginHorizontal: spacing.sm,
    borderWidth: 3,
    borderColor: '#0D1117',
    borderRadius: 6,
    backgroundColor: '#0D1117',
    overflow: 'hidden',
  },
  screen: {
    flex: 1,
    backgroundColor: '#0A0E14',
    borderRadius: 3,
    overflow: 'hidden',
  },
  speakerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  speakerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#2A3040',
    borderRadius: 1,
  },
});
