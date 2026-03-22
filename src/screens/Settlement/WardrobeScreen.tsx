import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../context/GameContext';
import cosmeticItems from '../../data/cosmetics';
import { colors, spacing, fontSize, borderRadius, fontMono } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { GearSlotId, GearItem, CosmeticItem, CosmeticSlot, EquippedCosmetics } from '../../types';
import gameBalance from '../../config/gameBalance.json';

// ─── Gear stat descriptions ───
const GEAR_STAT_LINE: Record<GearSlotId, (q: string) => string> = {
  optics_rig: (q) => {
    const v = (gameBalance.gear_stats.optics_rig as any)[q]?.rare_boost || 0;
    return `+${Math.round(v * 100)}% rare drop chance`;
  },
  exo_vest: (q) => {
    const s = (gameBalance.gear_stats.exo_vest as any)[q];
    const scans = s?.bonus_scans || 0;
    const loot = s?.loot_quality_boost ? ` · +${Math.round(s.loot_quality_boost * 100)}% signal quality` : '';
    return `+${scans} Scans per day${loot}`;
  },
  grip_gauntlets: (q) => {
    const v = (gameBalance.gear_stats.grip_gauntlets as any)[q]?.whiff_reduction || 0;
    return `-${Math.round(v * 100)}% whiff chance`;
  },
  nav_boots: (q) => {
    const s = (gameBalance.gear_stats.nav_boots as any)[q];
    const bonus = s?.sector_bonus || 0;
    const dbl = s?.double_progress_chance ? ` · ${Math.round(s.double_progress_chance * 100)}% double progress` : '';
    return `+${bonus} sector progress${dbl}`;
  },
  cortex_link: (q) => {
    const s = (gameBalance.gear_stats.cortex_link as any)[q];
    const leg = s?.gambit_legendary_boost || 0;
    const comp = s?.component_boost ? ` · +${Math.round(s.component_boost * 100)}% component` : '';
    return `+${Math.round(leg * 100)}% Gambit Legendary${comp}`;
  },
  salvage_drone: (q) => {
    const v = (gameBalance.gear_stats.salvage_drone as any)[q]?.refund_chance || 0;
    return `${Math.round(v * 100)}% whiff refund chance`;
  },
};

const GEAR_BODY_AREA: Record<GearSlotId, string> = {
  optics_rig: 'HEAD',
  exo_vest: 'CHEST',
  grip_gauntlets: 'HANDS',
  nav_boots: 'FEET',
  cortex_link: 'BACK',
  salvage_drone: 'SHOULDER',
};

const QUALITY_COLORS: Record<string, string> = {
  standard: colors.textSecondary,
  enhanced: colors.neonCyan,
  perfected: colors.neonGreen,
  ultra: colors.neonPurple,
};

const QUALITY_ORDER: Record<string, number> = {
  standard: 0,
  enhanced: 1,
  perfected: 2,
  ultra: 3,
};

// ─── Cosmetic constants ───
const COSMETIC_SLOT_LABELS: Record<CosmeticSlot, string> = {
  headgear: 'Headgear',
  coat: 'Coat',
  backItem: 'Back Item',
  weapon: 'Weapon',
  tech: 'Tech',
  charm: 'Charm',
  patch: 'Patch',
  roverDecal: 'Rover Decal',
  accessory: 'Accessory',
};

const COSMETIC_SLOT_ORDER: CosmeticSlot[] = [
  'headgear', 'coat', 'backItem', 'weapon', 'tech', 'charm', 'patch', 'roverDecal', 'accessory',
];

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return colors.textSecondary;
    case 'uncommon': return colors.neonGreen;
    case 'rare': return colors.neonCyan;
    case 'relic': return colors.neonPurple;
    default: return colors.textSecondary;
  }
};

// ─── Compare hint: what does this item do vs what the player has equipped in the same slot ───
function getCompareHint(gear: GearItem, inventory: GearItem[], activeSlots: GearSlotId[]): string | null {
  // Only show hints for items that are NOT equipped
  if (activeSlots.includes(gear.slotId)) return null;

  const equippedInSlot = inventory.find(
    g => g.slotId === gear.slotId && activeSlots.includes(g.slotId)
  );

  if (!equippedInSlot) {
    // No item equipped in this slot
    return 'Empty slot — equip for a bonus';
  }

  const myQ = QUALITY_ORDER[gear.quality] ?? 0;
  const theirQ = QUALITY_ORDER[equippedInSlot.quality] ?? 0;

  if (myQ > theirQ) return `Upgrade from ${equippedInSlot.name}`;
  if (myQ === theirQ && gear.slotId !== equippedInSlot.slotId) return 'Same tier, different effect';
  if (myQ < theirQ) return `Weaker than ${equippedInSlot.name}`;
  return null;
}

export default function WardrobeScreen() {
  const { state, dispatch } = useGame();
  const ss = state.seekerScans;

  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);
  const [cosmeticSlot, setCosmeticSlot] = useState<CosmeticSlot>('headgear');

  // ─── Sort gear: equipped first, then by quality desc, then unequipped ───
  const sortedGear = useMemo(() => {
    const inventory = ss.gearInventory.length > 0 ? [...ss.gearInventory] : [];
    return inventory.sort((a, b) => {
      const aActive = ss.activeGearSlots.includes(a.slotId) ? 1 : 0;
      const bActive = ss.activeGearSlots.includes(b.slotId) ? 1 : 0;
      if (bActive !== aActive) return bActive - aActive; // equipped first
      const aQ = QUALITY_ORDER[a.quality] ?? 0;
      const bQ = QUALITY_ORDER[b.quality] ?? 0;
      return bQ - aQ; // higher quality first
    });
  }, [ss.gearInventory, ss.activeGearSlots]);

  // ─── Gear logic ───
  const toggleGear = (slotId: GearSlotId) => {
    if (ss.gearLockedToday) return;
    const current = [...ss.activeGearSlots];
    if (current.includes(slotId)) {
      dispatch({ type: 'SET_ACTIVE_GEAR', payload: current.filter(s => s !== slotId) });
    } else if (current.length < 3) {
      dispatch({ type: 'SET_ACTIVE_GEAR', payload: [...current, slotId] });
    }
  };

  // ─── Cosmetic logic ───
  const getItemsForSlot = (slot: CosmeticSlot) =>
    cosmeticItems.filter((item: CosmeticItem) => item.slot === slot);

  const isEquipped = (itemId: string) => Object.values(state.equipped).includes(itemId);
  const isUnlocked = (itemId: string) => state.unlockedCosmeticIds.includes(itemId);

  const handleEquipCosmetic = (item: CosmeticItem) => {
    if (!isUnlocked(item.id)) return;
    dispatch({ type: 'EQUIP_COSMETIC', payload: { [item.slot]: item.id } as Partial<EquippedCosmetics> });
  };

  const handleUnequipCosmetic = (slot: CosmeticSlot) => {
    dispatch({ type: 'EQUIP_COSMETIC', payload: { [slot]: undefined } as Partial<EquippedCosmetics> });
  };

  // ─── Cosmetic sorting: equipped → unlocked → locked with obtainable conditions ───
  const sortedCosmeticsForSlot = useMemo(() => {
    const items = getItemsForSlot(cosmeticSlot);
    const equipped: CosmeticItem[] = [];
    const unlocked: CosmeticItem[] = [];
    const locked: CosmeticItem[] = [];

    for (const item of items) {
      if (isEquipped(item.id)) equipped.push(item);
      else if (isUnlocked(item.id)) unlocked.push(item);
      else locked.push(item);
    }

    return [...equipped, ...unlocked, ...locked];
  }, [cosmeticSlot, state.equipped, state.unlockedCosmeticIds]);

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ═══════════ SECTION 1: FUNCTIONAL GEAR ═══════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>GEAR LOADOUT</Text>
          {ss.gearLockedToday ? (
            <Text style={styles.lockedBadge}>LOCKED TODAY</Text>
          ) : (
            <Text style={styles.sectionHint}>{ss.activeGearSlots.length}/3 equipped</Text>
          )}
        </View>
        <Text style={styles.sectionDesc}>
          Your operational loadout. Each piece changes how the rover reads signal in the field. Choose 3.
        </Text>

        {/* Gear cards — sorted: equipped first, then by quality */}
        {sortedGear.length > 0 ? (
          sortedGear.map((gear) => {
            const isActive = ss.activeGearSlots.includes(gear.slotId);
            const statLine = GEAR_STAT_LINE[gear.slotId](gear.quality);
            const bodyArea = GEAR_BODY_AREA[gear.slotId];
            const qualityColor = QUALITY_COLORS[gear.quality] || colors.textSecondary;
            const canToggle = !ss.gearLockedToday && (isActive || ss.activeGearSlots.length < 3);
            const compareHint = getCompareHint(gear, ss.gearInventory, ss.activeGearSlots);

            return (
              <TouchableOpacity
                key={`${gear.slotId}-${gear.quality}`}
                style={[styles.gearCard, isActive && styles.gearCardActive]}
                onPress={() => canToggle ? toggleGear(gear.slotId) : setSelectedGear(gear)}
                activeOpacity={canToggle ? 0.7 : 0.9}
              >
                <View style={[styles.gearCardLeft, isActive && styles.gearCardLeftActive]}>
                  <MaterialCommunityIcons name={gear.icon as any} size={24} color={isActive ? colors.neonGreen : qualityColor} />
                </View>
                <View style={styles.gearCardCenter}>
                  <View style={styles.gearNameRow}>
                    <Text style={[styles.gearName, isActive && styles.gearNameActive]}>
                      {gear.name}
                    </Text>
                    {isActive && (
                      <View style={styles.equippedTag}>
                        <Text style={styles.equippedTagText}>EQUIPPED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.gearStatLine}>{statLine}</Text>
                  <View style={styles.gearMetaRow}>
                    <Text style={[styles.gearQuality, { color: qualityColor }]}>
                      {gear.quality.charAt(0).toUpperCase() + gear.quality.slice(1)}
                    </Text>
                    <Text style={styles.gearBodyArea}>{bodyArea}</Text>
                  </View>
                  {/* Compare hint for non-equipped items */}
                  {compareHint && !isActive && (
                    <Text style={styles.compareHint}>{compareHint}</Text>
                  )}
                </View>
                <View style={styles.gearCardRight}>
                  {isActive ? (
                    <View style={styles.equippedDot}>
                      <Text style={styles.equippedDotText}>ON</Text>
                    </View>
                  ) : canToggle ? (
                    <View style={styles.unequippedDot}>
                      <MaterialCommunityIcons name="plus" size={14} color={colors.textMuted} />
                    </View>
                  ) : (
                    <View style={styles.unequippedDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyGearCard}>
            <MaterialCommunityIcons name="shield-off-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyGearText}>No gear yet. Run scans on Broken Overpass to find your first drops.</Text>
          </View>
        )}

        {/* Future gear placeholder — only when inventory is small */}
        {sortedGear.length > 0 && sortedGear.length < 4 && (
          <View style={styles.futureGearHint}>
            <MaterialCommunityIcons name="radar" size={14} color={colors.textMuted} />
            <Text style={styles.futureGearText}>New rigs will show up here as you earn them.</Text>
          </View>
        )}

        {/* Pathfinder progress */}
        {!ss.pathfinderUnlocked && ss.pathfinderComponents > 0 && (
          <View style={styles.pathfinderRow}>
            <Text style={styles.pathfinderLabel}>PATHFINDER MODULE</Text>
            <View style={styles.pathfinderDots}>
              {Array.from({ length: gameBalance.pathfinder_module.components_required }, (_, i) => (
                <View
                  key={i}
                  style={[styles.pathfinderDot, i < ss.pathfinderComponents && styles.pathfinderDotFilled]}
                />
              ))}
            </View>
            <Text style={styles.pathfinderCount}>
              {ss.pathfinderComponents}/{gameBalance.pathfinder_module.components_required} — Unlocks 4th gear slot
            </Text>
          </View>
        )}
        {ss.pathfinderUnlocked && (
          <View style={[styles.pathfinderRow, styles.pathfinderActive]}>
            <Text style={styles.pathfinderActiveText}>PATHFINDER MODULE ACTIVE</Text>
            <Text style={styles.pathfinderActiveDesc}>
              +{Math.round(gameBalance.pathfinder_module.quality_boost_all * 100)}% signal clarity · 4th gear slot unlocked
            </Text>
          </View>
        )}

        {/* ═══════════ DIVIDER ═══════════ */}
        <View style={styles.divider} />

        {/* ═══════════ SECTION 2: COSMETICS ═══════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>COSMETICS</Text>
          <Text style={styles.sectionHint}>visual only</Text>
        </View>
        <Text style={styles.sectionDesc}>
          No operational advantage. Just what you wear on the road.
        </Text>

        {/* Cosmetic slot tabs */}
        <View style={styles.cosmeticTabs}>
          {COSMETIC_SLOT_ORDER.map((slot) => (
            <TouchableOpacity
              key={slot}
              onPress={() => setCosmeticSlot(slot)}
              style={[styles.cosmeticTab, cosmeticSlot === slot && styles.cosmeticTabActive]}
            >
              <Text style={[styles.cosmeticTabText, cosmeticSlot === slot && styles.cosmeticTabTextActive]}>
                {COSMETIC_SLOT_LABELS[slot]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Cosmetic items — sorted: equipped → unlocked → locked */}
        {sortedCosmeticsForSlot.map((item: CosmeticItem) => {
          const unlocked = isUnlocked(item.id);
          const equipped = isEquipped(item.id);

          return (
            <View
              key={item.id}
              style={[
                styles.cosmeticCard,
                { borderLeftColor: getRarityColor(item.rarity) },
                equipped && styles.cosmeticCardEquipped,
              ]}
            >
              <View style={styles.cosmeticHeader}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color={getRarityColor(item.rarity)} style={{ marginRight: spacing.sm }} />
                <View style={styles.cosmeticInfo}>
                  <Text style={[styles.cosmeticName, !unlocked && styles.dimmed]}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cosmeticRarity, { color: getRarityColor(item.rarity) }]}>
                    {item.rarity.toUpperCase()}
                  </Text>
                </View>
                {equipped && (
                  <View style={styles.cosmeticBadge}>
                    <Text style={styles.cosmeticBadgeText}>EQUIPPED</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cosmeticDesc, !unlocked && styles.dimmed]}>
                {item.description}
              </Text>
              {!unlocked && item.unlockCondition && (
                <View style={styles.unlockConditionRow}>
                  <MaterialCommunityIcons name="lock" size={12} color={colors.neonAmber} style={{ marginRight: 4 }} />
                  <Text style={styles.unlockCondition}>{item.unlockCondition}</Text>
                </View>
              )}
              <View style={styles.cosmeticActions}>
                {unlocked && !equipped && (
                  <NeonButton title="Equip" onPress={() => handleEquipCosmetic(item)} variant="primary" size="sm" />
                )}
                {equipped && (
                  <NeonButton title="Unequip" onPress={() => handleUnequipCosmetic(item.slot)} variant="ghost" size="sm" />
                )}
                {/* Locked items show no button in production — just the lock condition above */}
                {__DEV__ && !unlocked && (
                  <NeonButton title="Dev Unlock" onPress={() => dispatch({ type: 'UNLOCK_COSMETIC', payload: item.id })} variant="ghost" size="sm" />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ─── GEAR DETAIL POPUP ─── */}
      <Modal visible={selectedGear !== null} transparent animationType="fade" onRequestClose={() => setSelectedGear(null)}>
        <TouchableOpacity
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setSelectedGear(null)}
        >
          {selectedGear && (() => {
            const qualityColor = QUALITY_COLORS[selectedGear.quality] || colors.textSecondary;
            const compareHint = getCompareHint(selectedGear, ss.gearInventory, ss.activeGearSlots);
            return (
              <View style={[styles.popupCard, { borderColor: qualityColor + '40' }]}>
                <View style={[styles.popupIconBg, { borderColor: qualityColor + '60' }]}>
                  <MaterialCommunityIcons name={selectedGear.icon as any} size={32} color={qualityColor} />
                </View>
                <Text style={styles.popupName}>{selectedGear.name}</Text>
                <Text style={[styles.popupQuality, { color: qualityColor }]}>
                  {selectedGear.quality.toUpperCase()}
                </Text>
                <View style={styles.popupDivider} />
                <Text style={styles.popupBodyArea}>
                  {GEAR_BODY_AREA[selectedGear.slotId]}
                </Text>
                <Text style={styles.popupStatLine}>
                  {GEAR_STAT_LINE[selectedGear.slotId](selectedGear.quality)}
                </Text>
                <Text style={styles.popupShortDesc}>{selectedGear.shortDesc}</Text>
                {compareHint && (
                  <Text style={styles.popupCompare}>{compareHint}</Text>
                )}
                {ss.gearLockedToday && (
                  <Text style={styles.popupLocked}>Gear is locked after first scan today</Text>
                )}
                <NeonButton
                  title="Close"
                  onPress={() => setSelectedGear(null)}
                  variant="ghost"
                  size="sm"
                  style={styles.popupClose}
                />
              </View>
            );
          })()}
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },

  // ─── Section headers ───
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    fontFamily: fontMono,
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
  },
  sectionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  lockedBadge: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },

  // ─── Gear cards ───
  gearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  gearCardActive: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '06',
    borderLeftWidth: 3,
    borderLeftColor: colors.neonGreen,
  },
  gearCardLeft: {
    width: 44,
    height: 44,
    borderRadius: 0,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  gearCardLeftActive: {
    backgroundColor: colors.neonGreen + '15',
    borderWidth: 1,
    borderColor: colors.neonGreen + '30',
  },
  gearCardCenter: {
    flex: 1,
  },
  gearNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  gearName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontMono,
  },
  gearNameActive: {
    color: colors.neonGreen,
  },
  equippedTag: {
    backgroundColor: colors.neonGreen + '20',
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  equippedTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.neonGreen,
    letterSpacing: 1.5,
    fontFamily: fontMono,
  },
  gearStatLine: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    marginTop: 2,
    fontFamily: fontMono,
  },
  gearMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  gearQuality: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  gearBodyArea: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
    color: colors.textMuted,
  },
  compareHint: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontFamily: fontMono,
    marginTop: 4,
    fontStyle: 'italic',
  },
  gearCardRight: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  equippedDot: {
    width: 30,
    height: 30,
    borderRadius: 0,
    backgroundColor: colors.neonGreen + '20',
    borderWidth: 2,
    borderColor: colors.neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equippedDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.neonGreen,
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  unequippedDot: {
    width: 30,
    height: 30,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Empty state ───
  emptyGearCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    borderStyle: 'dashed',
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyGearText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontMono,
  },

  // ─── Future gear hint ───
  futureGearHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  futureGearText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    fontStyle: 'italic',
  },

  // ─── Pathfinder ───
  pathfinderRow: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  pathfinderActive: {
    borderColor: colors.neonCyan + '40',
    backgroundColor: colors.surfaceHighlight,
  },
  pathfinderLabel: {
    fontSize: fontSize.xs,
    color: colors.neonCyan,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: spacing.sm,
    fontFamily: fontMono,
  },
  pathfinderDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pathfinderDot: {
    width: 18,
    height: 18,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.panelBorder,
  },
  pathfinderDotFilled: {
    borderColor: colors.neonCyan,
    backgroundColor: colors.neonCyan + '30',
  },
  pathfinderCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
  },
  pathfinderActiveText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  pathfinderActiveDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: fontMono,
  },

  // ─── Divider ───
  divider: {
    height: 1,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },

  // ─── Cosmetic tabs ───
  cosmeticTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  cosmeticTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
  },
  cosmeticTabActive: {
    borderColor: colors.neonPurple,
    backgroundColor: colors.neonPurple + '20',
  },
  cosmeticTabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
  },
  cosmeticTabTextActive: {
    color: colors.neonPurple,
    fontWeight: '600',
  },

  // ─── Cosmetic cards ───
  cosmeticCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    borderLeftWidth: 3,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cosmeticCardEquipped: {
    borderColor: colors.neonGreen + '30',
    backgroundColor: colors.neonGreen + '04',
  },
  cosmeticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cosmeticInfo: {
    flex: 1,
  },
  cosmeticName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontMono,
  },
  cosmeticRarity: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: fontMono,
  },
  cosmeticBadge: {
    backgroundColor: colors.neonGreen + '20',
    borderRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cosmeticBadgeText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  cosmeticDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  dimmed: {
    opacity: 0.5,
  },
  unlockConditionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  unlockCondition: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontFamily: fontMono,
  },
  cosmeticActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // ─── Gear detail popup ───
  popupOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  popupCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  popupIconBg: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  popupName: {
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: fontMono,
    textAlign: 'center',
  },
  popupQuality: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: spacing.xs,
    fontFamily: fontMono,
  },
  popupDivider: {
    height: 1,
    backgroundColor: colors.surfaceLight,
    width: '80%',
    marginVertical: spacing.md,
  },
  popupBodyArea: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: spacing.sm,
    fontFamily: fontMono,
  },
  popupStatLine: {
    fontSize: fontSize.md,
    color: colors.neonCyan,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
    fontFamily: fontMono,
  },
  popupShortDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  popupCompare: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontFamily: fontMono,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  popupLocked: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    marginTop: spacing.md,
    fontWeight: '600',
    fontFamily: fontMono,
  },
  popupClose: {
    marginTop: spacing.lg,
    width: 120,
  },
});
