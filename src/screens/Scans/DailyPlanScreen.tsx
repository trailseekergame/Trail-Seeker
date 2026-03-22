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
import { SKR_SHOP, SkrShopItem, getExtraScansFromBoost, ShopCategory } from '../../systems/skrEconomy';
import CoachMark, { COACH } from '../../components/common/CoachMark';
import AudioManager from '../../services/audioManager';
import { ActiveBoost } from '../../types';

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
        {/* ─── 1. HEADER: Avatar + Status + Streak ─── */}
        <View style={styles.header}>
          <Image
            source={AVATARS[state.avatarId].image}
            style={styles.headerAvatar}
            resizeMode="cover"
          />
          <Text style={styles.headerTitle}>
            Day <Text style={styles.headerDayNum}>{ss.streakDay}</Text> — Running Dark
          </Text>

          {/* Status strip: HP + Rover + Resources */}
          <View style={styles.statusStrip}>
            <View style={styles.statusItem}>
              <MaterialCommunityIcons name="heart-pulse" size={14} color={state.playerHealth > 30 ? colors.neonGreen : colors.neonRed} />
              <Text style={[styles.statusValue, { color: state.playerHealth > 30 ? colors.neonGreen : colors.neonRed }]}>{state.playerHealth}</Text>
            </View>
            <View style={styles.statusItem}>
              <MaterialCommunityIcons name="car-side" size={14} color={state.roverHealth > 30 ? colors.neonCyan : colors.neonAmber} />
              <Text style={[styles.statusValue, { color: state.roverHealth > 30 ? colors.neonCyan : colors.neonAmber }]}>{state.roverHealth}</Text>
            </View>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <MaterialCommunityIcons name="cog" size={14} color={colors.scrap} />
              <Text style={[styles.statusValue, { color: colors.scrap }]}>{state.resources.scrap}</Text>
            </View>
            <View style={styles.statusItem}>
              <MaterialCommunityIcons name="package-variant" size={14} color={colors.supplies} />
              <Text style={[styles.statusValue, { color: colors.supplies }]}>{state.resources.supplies}</Text>
            </View>
            {state.skrBalance > 0 && (
              <>
                <View style={styles.statusDivider} />
                <View style={styles.statusItem}>
                  <MaterialCommunityIcons name="hexagon-outline" size={14} color={colors.neonPurple} />
                  <Text style={[styles.statusValue, { color: colors.neonPurple }]}>{state.skrBalance}</Text>
                </View>
              </>
            )}
          </View>

          <Text style={styles.headerSubtext}>
            {rareBoost > 0 ? `Signal clarity +${Math.round(rareBoost * 100)}% from consecutive ops.` : 'Show up tomorrow. Streak sharpens the reads.'}
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

        {/* ─── Onboarding: camp intro ─── */}
        <CoachMark
          id={COACH.CAMP_INTRO}
          text="This is your camp. Use Scans to search sectors for Scrap and Supplies. Scrap repairs your rover; Supplies heal you. Pick a mission when you're ready."
          delay={800}
        />

        {/* ─── Onboarding: return to camp damaged ─── */}
        <CoachMark
          id={COACH.CAMP_HEAL}
          text="You took some hits out there. Scroll down to Status — spend Supplies to heal and Scrap to repair before your next run."
          visible={state.playerHealth < 100 || state.roverHealth < 100}
          delay={600}
        />

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

        {/* ─── 2b. $SKR SHOP ─── */}
        {state.skrBalance > 0 && (
          <View style={styles.skrSection}>
            <View style={styles.skrHeader}>
              <View style={styles.skrTitleRow}>
                <MaterialCommunityIcons name="hexagon-outline" size={16} color={colors.neonPurple} />
                <Text style={styles.skrTitle}>{state.skrBalance} $SKR</Text>
              </View>
            </View>

            <View style={styles.skrShopGrid}>
              {SKR_SHOP.map((item) => {
                // Determine owned state based on item category
                const isBoost = item.category === 'scans' && item.boost;
                const isCosmetic = item.category === 'cosmetic' && item.cosmeticId;
                const owned = isBoost
                  ? state.activeBoosts.some(b => b.name === item.boost!.name)
                  : isCosmetic
                  ? state.unlockedCosmeticIds.includes(item.cosmeticId!)
                  : false;
                const canAfford = state.skrBalance >= item.cost;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.skrShopCard, owned && styles.skrShopCardOwned]}
                    disabled={owned || !canAfford}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (owned || !canAfford) return;
                      dispatch({ type: 'SPEND_SKR', payload: item.cost });
                      if (isBoost && item.boost) {
                        dispatch({ type: 'ADD_BOOST', payload: { id: item.id, ...item.boost } });
                      } else if (isCosmetic && item.cosmeticId) {
                        dispatch({ type: 'UNLOCK_COSMETIC', payload: item.cosmeticId });
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name={item.icon as any}
                      size={18}
                      color={owned ? colors.neonGreen : canAfford ? colors.neonPurple : colors.textMuted}
                    />
                    <Text style={[styles.skrShopName, !canAfford && !owned && { color: colors.textMuted }]}>
                      {item.name}
                    </Text>
                    <Text style={styles.skrShopDesc} numberOfLines={2}>{item.description}</Text>
                    {owned ? (
                      <Text style={styles.skrShopOwned}>{isCosmetic ? 'OWNED' : 'ACTIVE'}</Text>
                    ) : (
                      <Text style={[styles.skrShopCost, !canAfford && { color: colors.textMuted }]}>
                        {item.cost} $SKR
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ─── 3. GEAR LOADOUT ─── */}
        <View style={styles.gearSection}>
          <View style={styles.gearSectionHeader}>
            <Text style={styles.sectionTitle}>GEAR LOADOUT</Text>
            {ss.gearLockedToday ? (
              <Text style={styles.lockedBadge}>LOCKED</Text>
            ) : (
              <Text style={styles.tapHint}>Tap to toggle · {ss.activeGearSlots.length}/3</Text>
            )}
          </View>

          {/* All gear — tappable to equip/unequip */}
          <View style={styles.gearGrid}>
            {ss.gearInventory.map((gear) => {
              const isActive = ss.activeGearSlots.includes(gear.slotId);
              const canToggle = !ss.gearLockedToday;
              const atMax = ss.activeGearSlots.length >= 3 && !isActive;

              return (
                <TouchableOpacity
                  key={gear.slotId}
                  style={[
                    styles.gearSlotCard,
                    isActive && styles.gearSlotActive,
                    !canToggle && styles.gearSlotLocked,
                  ]}
                  onPress={() => {
                    if (!canToggle) return;
                    if (isActive) {
                      dispatch({
                        type: 'SET_ACTIVE_GEAR',
                        payload: ss.activeGearSlots.filter(s => s !== gear.slotId),
                      });
                    } else if (!atMax) {
                      dispatch({
                        type: 'SET_ACTIVE_GEAR',
                        payload: [...ss.activeGearSlots, gear.slotId],
                      });
                    }
                  }}
                  activeOpacity={canToggle ? 0.7 : 1}
                  disabled={!canToggle || (atMax && !isActive)}
                >
                  <MaterialCommunityIcons
                    name={gear.icon as any}
                    size={22}
                    color={isActive ? colors.neonGreen : colors.textMuted}
                  />
                  <Text style={[styles.gearSlotName, isActive && { color: colors.textPrimary }]}>
                    {gear.name}
                  </Text>
                  <Text style={[styles.gearSlotEffect, isActive && { color: colors.neonGreen }]}>
                    {GEAR_SHORT[gear.slotId]}
                  </Text>
                  {isActive && (
                    <View style={styles.gearEquippedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Coach: gear matters */}
          <CoachMark
            id={COACH.GEAR_MATTERS}
            text="Tap gear to equip (up to 3). Your loadout shapes every scan. Once you deploy, gear locks for the session."
            visible={ss.sessionResults.length === 0}
            delay={1000}
          />
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
            disabled={ss.scansRemaining <= 0}
          />
          <Text style={styles.ctaSubtext}>
            {ss.scansRemaining > 0
              ? 'Pick a sector and spend your scans.'
              : 'Window\'s closed. Signal resets at dawn.'}
          </Text>
          {ss.activeGearSlots.length === 0 && ss.gearInventory.length > 0 && (
            <Text style={styles.warningText}>Tip: Tap your gear above to equip it for bonus effects.</Text>
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
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface + 'CC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  statusDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.surfaceLight,
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
  // ─── SKR Shop ───
  skrSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  skrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skrTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  skrTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neonPurple,
  },
  skrActiveCount: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '600',
  },
  skrShopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  skrShopCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neonPurple + '30',
    padding: spacing.sm,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  skrShopCardOwned: {
    borderColor: colors.neonGreen + '40',
    backgroundColor: colors.neonGreen + '08',
  },
  skrShopName: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  skrShopDesc: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 13,
  },
  skrShopCost: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.neonPurple,
    marginTop: 4,
  },
  skrShopOwned: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.neonGreen,
    marginTop: 4,
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
  gearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gearSlotCard: {
    width: '31%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.sm,
    alignItems: 'center',
    position: 'relative',
    minHeight: 80,
    justifyContent: 'center',
  },
  gearSlotActive: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '08',
  },
  gearSlotLocked: {
    opacity: 0.6,
  },
  gearSlotName: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  gearSlotEffect: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  gearEquippedDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neonGreen,
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
