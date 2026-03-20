import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../theme';
import { useGame } from '../../context/GameContext';
import { useMoveTimer } from '../../hooks/useMoveTimer';

export default function ResourceBar() {
  const { state } = useGame();
  const { movesRemaining, timeRemaining } = useMoveTimer();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ResourceItem icon="⚡" value={movesRemaining} label="Moves" color={colors.neonCyan} />
        <ResourceItem icon="🔩" value={state.resources.scrap} label="Scrap" color={colors.scrap} />
        <ResourceItem
          icon="📦"
          value={state.resources.supplies}
          label="Supplies"
          color={colors.supplies}
        />
        <ResourceItem
          icon="❤️"
          value={state.playerHealth}
          label="HP"
          color={state.playerHealth > 30 ? colors.neonGreen : colors.neonRed}
        />
      </View>
      <View style={styles.timerRow}>
        <Text style={styles.timerText}>
          Next refresh: {timeRemaining}
        </Text>
        <Text style={styles.dayText}>Day {state.dayNumber}</Text>
      </View>
    </View>
  );
}

function ResourceItem({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.item}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  item: {
    alignItems: 'center',
    minWidth: 60,
  },
  icon: {
    fontSize: 18,
    marginBottom: 2,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  timerText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  dayText: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontWeight: '600',
  },
});
