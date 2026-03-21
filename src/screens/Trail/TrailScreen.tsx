import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import ResourceBar from '../../components/common/ResourceBar';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
import { useGame } from '../../context/GameContext';
import { colors, spacing, fontSize } from '../../theme';

/**
 * TrailScreen — Legacy trail view.
 *
 * The primary gameplay loop is now on the DailyPlan + ScanScreen.
 * This screen exists as a secondary "lore view" showing the zone
 * description and world state. The player is directed to the new
 * Seeker Scan system from the navigation's initial route.
 */
export default function TrailScreen() {
  const { state } = useGame();
  const nav = useNavigation<any>();
  const ss = state.seekerScans;

  return (
    <ScreenWrapper padded={false}>
      <ResourceBar />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Zone Info */}
        <View style={styles.zoneHeader}>
          <Text style={styles.zoneName}>Rustbelt Verge</Text>
          <Text style={styles.zoneSubtitle}>Industrial Corridor — Season 1</Text>
        </View>

        {/* Sector Status */}
        <View style={styles.sectorCard}>
          <Text style={styles.sectorTitle}>
            Sector {ss.sectorsCompleted + 1}: {ss.currentSector.name}
          </Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill,
              { width: `${(ss.currentSector.tiles.filter(t => t.cleared).length / (ss.currentSector.tiles.length || 25)) * 100}%` }
            ]} />
          </View>
          <Text style={styles.progressText}>
            {ss.currentSector.tiles.filter(t => t.cleared).length}/{ss.currentSector.tiles.length || 25} tiles cleared
          </Text>
        </View>

        {/* Active Gear Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACTIVE GEAR</Text>
          <View style={styles.gearRow}>
            {ss.gearInventory
              .filter(g => ss.activeGearSlots.includes(g.slotId))
              .map(g => (
                <View key={g.slotId} style={styles.gearChip}>
                  <Text style={styles.gearIcon}>{g.icon}</Text>
                  <Text style={styles.gearName}>{g.name}</Text>
                </View>
              ))}
            {ss.activeGearSlots.length === 0 && (
              <Text style={styles.emptyText}>No gear selected</Text>
            )}
          </View>
        </View>

        {/* Session Results */}
        {ss.sessionResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TODAY'S RESULTS</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{ss.sessionResults.length}</Text>
                <Text style={styles.statLabel}>Scans</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.neonRed }]}>
                  {ss.sessionResults.filter(r => r.outcome === 'whiff').length}
                </Text>
                <Text style={styles.statLabel}>Whiffs</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.neonGreen }]}>
                  {ss.sessionResults.filter(r => ['rare', 'legendary', 'component'].includes(r.outcome)).length}
                </Text>
                <Text style={styles.statLabel}>Rare+</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionSection}>
          {ss.scansRemaining > 0 ? (
            <NeonButton
              title={`Continue Scanning (${ss.scansRemaining} left)`}
              onPress={() => nav.navigate('ScanMain')}
              size="lg"
            />
          ) : (
            <View style={styles.doneCard}>
              <Text style={styles.doneTitle}>Scans Complete</Text>
              <Text style={styles.doneText}>
                Come back tomorrow for {ss.streakDay < 7 ? 'a stronger streak' : 'your best odds'}.
              </Text>
            </View>
          )}
        </View>

        {/* Dev Tools */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>— Dev Tools —</Text>
            <View style={styles.devRow}>
              <NeonButton
                title="Reset Scans"
                onPress={() => {
                  const { dispatch } = useGame();
                  // Will be handled by daily refresh
                }}
                variant="ghost"
                size="sm"
              />
              <NeonButton
                title="Go to Plan"
                onPress={() => nav.navigate('DailyPlan')}
                variant="ghost"
                size="sm"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  zoneHeader: { marginBottom: spacing.md },
  zoneName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoneSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectorCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectorTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.neonGreen,
    borderRadius: 3,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  section: { marginTop: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  gearRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  gearChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  gearIcon: { fontSize: 18 },
  gearName: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionSection: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  doneCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neonAmber + '40',
    padding: spacing.lg,
    alignItems: 'center',
    width: '100%',
  },
  doneTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neonAmber,
    marginBottom: spacing.xs,
  },
  doneText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  devSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neonAmber + '30',
  },
  devTitle: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
});
