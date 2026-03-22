import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { computeDailyScans, getStreakRareBoost } from '../../systems/scanEngine';
import { ALL_GEAR_ITEMS, DEFAULT_ACTIVE_GEAR } from '../../data/gearItems';
import { generateTestSector } from '../../data/testSector';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { GearSlotId } from '../../types';
import { AVATARS } from '../../data/avatars';
import { MAP_DEFS } from '../../data/sectorMaps';
import gameBalance from '../../config/gameBalance.json';
import { getDailyObjective } from '../../systems/dailyObjective';
import CoachMark, { COACH } from '../../components/common/CoachMark';
import AudioManager from '../../services/audioManager';

// ─── Short gear effect labels for the summary strip ───
const GEAR_SHORT: Record<GearSlotId, string> = {
  optics_rig: 'Rare+',
  exo_vest: '+Scans',
  grip_gauntlets: '-Whiff',
  nav_boots: '+Sector',
  cortex_link: 'Legend+',
  salvage_drone: 'Refund',
};

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

  // Set hub ambient music + advance streak on mount
  useEffect(() => {
    AudioManager.setMusic('ambient_hub');
    const prevStreak = ss.streakDay;
    dispatch({ type: 'ADVANCE_STREAK' });
    // Play streak_up if streak actually advanced (check on next render via timeout)
    if (prevStreak > 0) {
      AudioManager.playSfx('streak_up');
    }
  }, []);

  // Recompute daily scan count when gear selection changes (only before first scan)
  useEffect(() => {
    if (ss.gearInventory.length === 0) return;
    if (ss.gearLockedToday) return;
    const total = computeDailyScans(ss.streakDay, ss.activeGearSlots, ss.gearInventory);
    if (total !== ss.scansTotal) {
      dispatch({ type: 'UPDATE_SCAN_TOTAL', payload: total });
    }
  }, [ss.activeGearSlots]);

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

  const objective = getDailyObjective(ss);

  const activeGearItems = ss.gearInventory.filter(g => ss.activeGearSlots.includes(g.slotId));

  // Build the scan breakdown note
  const breakdownParts: string[] = [];
  if (gearBonus > 0) breakdownParts.push(`+${gearBonus} Vest rig`);
  if (streakBonus > 0) breakdownParts.push(`+${streakBonus} streak edge`);
  const breakdownNote = breakdownParts.length > 0 ? breakdownParts.join(' · ') : null;

  return (
    <ScreenWrapper padded={false}>
      <ImageBackground
        source={MAP_DEFS.camp.background}
        style={styles.campBg}
        resizeMode="cover"
      >
        <View style={styles.campOverlay} />
      </ImageBackground>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ─── 1. HEADER: Day + Streak ─── */}
        <View style={styles.header}>
          <Image
            source={AVATARS[state.avatarId].image}
            style={styles.headerAvatar}
            resizeMode="cover"
          />
          <Text style={styles.headerTitle}>
            Day <Text style={styles.headerDayNum}>{ss.streakDay}</Text> — Running Dark
          </Text>
          <Text style={styles.headerSubtext}>
            {rareBoost > 0 ? `Signal clarity +${Math.round(rareBoost * 100)}% from consecutive ops` : 'Show up tomorrow. Consecutive runs sharpen the reads.'}
          </Text>
          {/* Streak progress dots */}
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
        </View>

        {/* ─── 1b. DAILY OBJECTIVE ─── */}
        <View style={styles.objectiveCard}>
          <Text style={styles.objectiveBrief}>{objective.brief}</Text>
          <Text style={styles.objectiveContext}>{objective.context}</Text>
        </View>

        {/* ─── 2. SCANS & MODIFIERS ─── */}
        <View style={styles.scanCard}>
          <View style={styles.scanCardTop}>
            <Text style={styles.scanNumber}>{ss.scansRemaining}</Text>
            <View style={styles.scanLabelCol}>
              <Text style={styles.scanLabel}>Scans</Text>
              <Text style={styles.scanLabelSub}>Before the signal resets</Text>
            </View>
          </View>
          {breakdownNote && (
            <Text style={styles.scanNote}>{breakdownNote}</Text>
          )}
        </View>

        {/* ─── 3. ACTIVE GEAR STRIP ─── */}
        <View style={styles.gearSection}>
          <View style={styles.gearSectionHeader}>
            <Text style={styles.sectionTitle}>ACTIVE GEAR</Text>
            {ss.gearLockedToday ? (
              <Text style={styles.lockedBadge}>LOCKED</Text>
            ) : (
              <Text style={styles.tapHint}>{ss.activeGearSlots.length}/3</Text>
            )}
          </View>

          {/* Active gear — compact strip */}
          {activeGearItems.length > 0 && (
            <View style={styles.activeStrip}>
              {activeGearItems.map((gear) => (
                <View key={gear.slotId} style={styles.activeGearCard}>
                  <MaterialCommunityIcons name={gear.icon as any} size={28} color={colors.neonGreen} style={{ marginBottom: spacing.xs }} />
                  <Text style={styles.activeGearName}>{gear.name}</Text>
                  <Text style={styles.activeGearEffect}>
                    {GEAR_SHORT[gear.slotId]}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Coach: gear matters */}
          <CoachMark
            id={COACH.GEAR_MATTERS}
            text="Your gear shapes every scan. Different loadouts change what you find and how often signals hit. Check Equipment to see stats."
            visible={ss.sessionResults.length === 0}
            delay={1000}
          />

          {/* Link to full Equipment screen */}
          {!ss.gearLockedToday && (
            <TouchableOpacity
              style={styles.manageGearLink}
              onPress={() => nav.getParent()?.navigate('SettlementTab', { screen: 'Wardrobe' })}
              activeOpacity={0.7}
            >
              <Text style={styles.manageGearText}>Equipment →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 4. SECTOR PREVIEW ─── */}
        <View style={styles.sectorCard}>
          <Text style={styles.sectorName}>
            Sector {ss.sectorsCompleted + 1}: {ss.currentSector.name}
          </Text>
          <View style={styles.sectorBar}>
            <View style={[styles.sectorBarFill, { width: `${(tilesCleared / totalTiles) * 100}%` }]} />
          </View>
          <Text style={styles.sectorProgress}>
            {tilesCleared}/{totalTiles} tiles cleared
          </Text>
          {ss.currentSector.completed && (
            <Text style={styles.sectorReward}>
              Sector stripped: +{10 + ((ss.sectorsCompleted) * 5)} Scrap recovered
            </Text>
          )}
        </View>

        {/* ─── 4b. PATHFINDER PROGRESS ─── */}
        {!ss.pathfinderUnlocked && ss.pathfinderComponents > 0 && (
          <View style={styles.pathfinderCard}>
            <Text style={styles.pathfinderTitle}>PATHFINDER MODULE</Text>
            <Text style={styles.pathfinderDesc}>
              Collect {gameBalance.pathfinder_module.components_required} components from Gambit scans
            </Text>
            <View style={styles.pathfinderDots}>
              {Array.from({ length: gameBalance.pathfinder_module.components_required }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.pathfinderDot,
                    i < ss.pathfinderComponents && styles.pathfinderDotActive,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.pathfinderCount}>
              {ss.pathfinderComponents}/{gameBalance.pathfinder_module.components_required}
            </Text>
          </View>
        )}
        {ss.pathfinderUnlocked && (
          <View style={[styles.pathfinderCard, styles.pathfinderCardUnlocked]}>
            <Text style={styles.pathfinderUnlockedText}>PATHFINDER MODULE ACTIVE</Text>
            <Text style={styles.pathfinderDesc}>
              +{Math.round(gameBalance.pathfinder_module.quality_boost_all * 100)}% all loot quality · 4th gear slot unlocked
            </Text>
          </View>
        )}

        {/* ─── 5. MISSION BOARD CTA ─── */}
        <View style={styles.ctaContainer}>
          <NeonButton
            title="Mission Board"
            onPress={() => nav.navigate('MissionSelect')}
            size="lg"
            icon="map-marker-path"
            disabled={ss.scansRemaining <= 0 || ss.activeGearSlots.length === 0}
          />
          <Text style={styles.ctaSubtext}>
            {ss.scansRemaining > 0
              ? 'Pick a sector and spend your scans.'
              : 'Window\'s closed. Signal resets at dawn.'}
          </Text>
          {ss.activeGearSlots.length === 0 && (
            <Text style={styles.warningText}>Rig empty. Equip at least 1 piece of gear.</Text>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}


const styles = StyleSheet.create({
  campBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  campOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 11, 16, 0.55)',
  },
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.md },

  // ─── 1. Header ───
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerDayNum: {
    fontSize: fontSize.xxl,
    color: colors.neonGreen,
    fontWeight: '700',
  },
  headerSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  streakDots: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  streakDot: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakDotActive: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.neonGreen + '15',
  },
  streakDotText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '600',
  },
  streakDotTextActive: {
    color: colors.neonGreen,
  },

  // ─── 2. Scans ───
  // ─── 1b. Objective ───
  objectiveCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neonAmber + '30',
    borderLeftWidth: 3,
    borderLeftColor: colors.neonAmber,
    padding: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  objectiveBrief: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  objectiveContext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 20,
  },

  scanCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.lg,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
  },
  scanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanNumber: {
    fontSize: 52,
    color: colors.neonGreen,
    fontWeight: '700',
    marginRight: spacing.md,
    lineHeight: 56,
  },
  scanLabelCol: {
    flex: 1,
  },
  scanLabel: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scanLabelSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  scanNote: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    paddingTop: spacing.sm,
  },

  // ─── 3. Gear ───
  gearSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  gearSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '600',
  },
  lockedBadge: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tapHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  activeStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  activeGearCard: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    padding: spacing.sm,
    alignItems: 'center',
  },
  activeGearName: {
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeGearEffect: {
    fontSize: 10,
    color: colors.neonGreen,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 14,
  },
  manageGearLink: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  manageGearText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '600',
  },

  // ─── 4. Sector ───
  sectorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginHorizontal: spacing.md,
  },
  sectorName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
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
  sectorProgress: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectorReward: {
    fontSize: fontSize.sm,
    color: colors.neonGreen,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // ─── 4b. Pathfinder ───
  pathfinderCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    alignItems: 'center',
  },
  pathfinderCardUnlocked: {
    borderColor: colors.neonCyan + '60',
    backgroundColor: colors.surfaceHighlight,
  },
  pathfinderTitle: {
    fontSize: fontSize.xs,
    color: colors.neonCyan,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  pathfinderDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pathfinderDots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pathfinderDot: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    backgroundColor: 'transparent',
  },
  pathfinderDotActive: {
    borderColor: colors.neonCyan,
    backgroundColor: colors.neonCyan + '30',
  },
  pathfinderCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  pathfinderUnlockedText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },

  // ─── 5. CTA ───
  ctaContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  ctaSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.neonRed,
    marginTop: spacing.xs,
  },


});
