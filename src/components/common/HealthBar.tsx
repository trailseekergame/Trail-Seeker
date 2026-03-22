import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, borderRadius, fontMono } from '../../theme';

interface Props {
  value: number;
  max: number;
  label: string;
  color?: string;
  showValue?: boolean;
}

export default function HealthBar({
  value,
  max,
  label,
  color = colors.neonGreen,
  showValue = true,
}: Props) {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  const barColor =
    percentage > 60 ? color : percentage > 30 ? colors.neonAmber : colors.neonRed;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {showValue && (
          <Text style={[styles.value, { color: barColor }]}>
            {value}/{max}
          </Text>
        )}
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontMono,
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    fontFamily: fontMono,
  },
  track: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 0,
  },
});
