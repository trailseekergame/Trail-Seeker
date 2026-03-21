import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { computeDailyScans, getStreakRareBoost } from '../../systems/scanEngine';
import { ALL_GEAR_ITEMS, DEFAULT_ACTIVE_GEAR } from '../../data/gearItems';
import { generateTestSector } from '../../data/testSector';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import Card from '../../components/common/Card';
import { GearSlotId, GearItem } from '../../types';
import gameBalance from '../../config/gameBalance.json';

export default function DailyPlanScreen() {
  const { state, dispatch } = useGame();
  const nav = useNavigation<any>();
  const ss = state.seekerScans;

  // Initialize gear & sector if empty
  useEffect(() => {
    if (ss.gearInventory.length === 0) {
      dispatch({
        type: 'INIT_SEEKER_SCANS',
        payload: { gearInventory: ALL_GEAR_ITEMS, sector: generateTestSector() },
      });
    }
  }, []);

  // Advance streak on mount
  useEffect(() => {
    dispatch({ type: 'ADVANCE_STREAK' });
  }, []);

  // Compute daily scans when streak/gear changes
  useEffect(() => {
    if (ss.gearInventory.length === 0) return;
    const total = computeDailyScans(ss.streakDay, ss.activeGearSlots, ss.gearInventory);
    if (total !== ss.scansTotal || ss.scansRemaining !== total) {
      dispatch({ type: 'REFRESH_DAILY_SCANS', payload: total });
    }
  }, [ss.streakDay, ss.activeGearSlots, ss.gearInventory]);

  const rareBoost = getStreakRareBoost(ss.streakDay);
  const streakBonus = gameBalance.streak_ladder.bonus_by_day[Math.min(ss.streakDay, 7)] || 0;
  const baseScans = gameBalance.streak_ladder.base_scans;

  // Gear bonus computation
  const gearBonus = useMemo(() => {
    if (!ss.activeGearSlots.includes('exo_vest')) return 0;
    const vest = ss.gearInventory.find(g => g.slotId === 'exo_vest');
    if (!vest) return 0;
    const stats = (gameBalance.gear_stats.exo_vest as any)[vest.quality];
    return Math.min(stats?.bonus_scans || 0, gameBalance.balance_rails.max_gear_bonus_scans);
  }, [ss.activeGearSlots, ss.gearInventory]);

  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;
  const totalTiles = ss.currentSector.tiles.length || 25;

  const toggleGear = (slotId: GearSlotId) => {
    if (ss.gearLockedToday) return;
    const current = [...ss.activeGearSlots];
    if (current.includes(slotId)) {
      dispatch({ type: 'SET_ACTIVE_GEAR', payload: current.filter(s => s !== slotId) });
    } else if (current.length < 3) {
      dispatch({ type: 'SET_ACTIVE_GEAR', payload: [...current, slotId] });
    }
  };

  const activeGearItems = ss.gearInventory.filter(g => ss.activeGearSlots.includes(g.slotId));

  return (
    <ScreenWrapper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Streak Banner */}
        <View style={styles.streakBanner}>
          <Text style={styles.streakLabel}>STREAK</Text>
          <View style={styles.streakDots}>
            {Array.from({ length: 7 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.streakDot,
                  i < ss.streakDay && styles.streakDotActive,
                ]}
              >
                <Text style={[styles.streakDotText, i < ss.streakDay && styles.streakDotTextActive]}>
                  {i + 1}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.streakDay}>
            Day <Text style={styles.streakDayNum}>{ss.streakDay}</Text>
          </Text>
          {rareBoost > 0 && (
            <Text style={styles.rareBoostText}>+{Math.round(rareBoost * 100)}% Rare Find Chance</Text>
          )}
        </View>

        {/* Scan Budget */}
        <Card title="Daily Scans" icon="📡">
          <View style={styles.scanBudgetRow}>
            <Text style={styles.scanBudgetTotal}>{ss.scansTotal}</Text>
            <View style={styles.scanBudgetBreakdown}>
              <Text style={styles.breakdownText}>Base: {baseScans}</Text>
              {streakBonus > 0 && <Text style={styles.breakdownText}>Streak: +{streakBonus}</Text>}
              {gearBonus > 0 && <Text style={styles.breakdownText}>Vest: +{gearBonus}</Text>}
            </View>
          </View>
        </Card>

        {/* Active Gear */}
        <Text style={styles.sectionTitle}>
          ACTIVE GEAR ({ss.activeGearSlots.length}/3)
          {ss.gearLockedToday && <Text style={styles.lockedBadge}> LOCKED</Text>}
        </Text>
        <View style={styles.gearGrid}>
          {ss.gearInventory.map((gear) => {
            const isActive = ss.activeGearSlots.includes(gear.slotId);
            return (
              <TouchableOpacity
                key={gear.slotId}
                style={[
                  styles.gearCard,
                  isActive && styles.gearCardActive,
                  ss.gearLockedToday && styles.gearCardLocked,
                ]}
                onPress={() => toggleGear(gear.slotId)}
                disabled={ss.gearLockedToday}
                activeOpacity={0.7}
              >
                <Text style={styles.gearIcon}>{gear.icon}</Text>
                <Text style={[styles.gearName, isActive && styles.gearNameActive]}>{gear.name}</Text>
                <Text style={styles.gearDesc}>{gear.shortDesc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sector Preview */}
        <Card title={`Sector ${ss.sectorsCompleted + 1}: ${ss.currentSector.name}`} icon="🗺️">
          <Text style={styles.sectorProgress}>
            {tilesCleared}/{totalTiles} tiles cleared
          </Text>
          <View style={styles.sectorBar}>
            <View style={[styles.sectorBarFill, { width: `${(tilesCleared / totalTiles) * 100}%` }]} />
          </View>
        </Card>

        {/* Begin Button */}
        <View style={styles.beginContainer}>
          <NeonButton
            title="BEGIN SCANS"
            onPress={() => nav.navigate('ScanMain')}
            size="lg"
            disabled={ss.scansRemaining <= 0 || ss.activeGearSlots.length === 0}
          />
          {ss.scansRemaining <= 0 && (
            <Text style={styles.noScansText}>No scans remaining today</Text>
          )}
          {ss.activeGearSlots.length === 0 && (
            <Text style={styles.noScansText}>Select at least 1 gear slot</Text>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxl },

  // Streak
  streakBanner: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.sm,
  },
  streakLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  streakDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  streakDot: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDotActive: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.surfaceHighlight,
  },
  streakDotText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  streakDotTextActive: {
    color: colors.neonGreen,
  },
  streakDay: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  streakDayNum: {
    fontSize: fontSize.xl,
    color: colors.neonGreen,
    fontWeight: '700',
  },
  rareBoostText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    marginTop: spacing.xs,
  },

  // Scan Budget
  scanBudgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanBudgetTotal: {
    fontSize: fontSize.hero,
    color: colors.neonGreen,
    fontWeight: '700',
    marginRight: spacing.md,
  },
  scanBudgetBreakdown: {
    flex: 1,
  },
  breakdownText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Gear
  sectionTitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  lockedBadge: {
    color: colors.neonRed,
  },
  gearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gearCard: {
    width: '30%' as any,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.sm,
    alignItems: 'center',
  },
  gearCardActive: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.surfaceHighlight,
  },
  gearCardLocked: {
    opacity: 0.7,
  },
  gearIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  gearName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  gearNameActive: {
    color: colors.textPrimary,
  },
  gearDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Sector
  sectorProgress: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  sectorBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  sectorBarFill: {
    height: '100%',
    backgroundColor: colors.neonGreen,
    borderRadius: borderRadius.full,
  },

  // Begin
  beginContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  noScansText: {
    fontSize: fontSize.sm,
    color: colors.neonRed,
    marginTop: spacing.sm,
  },
});
