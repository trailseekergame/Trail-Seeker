import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../../theme';
import { useGame } from '../../context/GameContext';
import { getStreakRareBoost } from '../../systems/scanEngine';

/**
 * ResourceBar — Updated for Seeker Scan system
 * Shows: Scans remaining, Streak day, Rare boost, Sector progress
 */
export default function ResourceBar() {
  const { state } = useGame();
  const ss = state.seekerScans;
  const rareBoost = getStreakRareBoost(ss.streakDay);
  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;
  const totalTiles = ss.currentSector.tiles.length || 25;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <ResourceItem
          icon="radar"
          value={ss.scansRemaining}
          label="Scans"
          color={ss.scansRemaining > 0 ? colors.neonGreen : colors.neonRed}
        />
        <ResourceItem
          icon="fire"
          value={ss.streakDay}
          label="Streak"
          color={colors.neonAmber}
        />
        <ResourceItem
          icon="star-four-points"
          value={rareBoost > 0 ? `+${Math.round(rareBoost * 100)}%` : '—'}
          label="Rare"
          color={colors.neonCyan}
        />
        <ResourceItem
          icon="map-marker-distance"
          value={`${tilesCleared}/${totalTiles}`}
          label="Sector"
          color={colors.neonPurple}
        />
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          Day {ss.streakDay} Streak
          {ss.scansUsedToday.scout + ss.scansUsedToday.seeker + ss.scansUsedToday.gambit > 0
            ? ` · ${ss.scansUsedToday.scout}S ${ss.scansUsedToday.seeker}K ${ss.scansUsedToday.gambit}G used`
            : ''}
        </Text>
        <Text style={styles.gearText}>
          {ss.activeGearSlots.length} gear active
        </Text>
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
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.item}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} style={styles.icon} />
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
    marginBottom: 2,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  label: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 1,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  infoText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  gearText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '600',
  },
});
