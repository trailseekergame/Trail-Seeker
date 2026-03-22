import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../context/GameContext';
import { ALL_GEAR_ITEMS } from '../../data/gearItems';
import cosmeticItems from '../../data/cosmetics';
// Cosmetic purchases use off-chain profile $SKR balance
import { colors, spacing, fontSize, borderRadius } from '../../theme';
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

export default function WardrobeScreen() {
  const { state, dispatch } = useGame();
  const ss = state.seekerScans;

  const [selectedGear, setSelectedGear] = useState<GearItem | null>(null);
  const [cosmeticSlot, setCosmeticSlot] = useState<CosmeticSlot>('headgear');

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
    if (!isUnlocked(item.id)) {
      Alert.alert('Locked', item.unlockCondition || 'This item is not yet available.', [
        { text: 'OK' },
        {
          text: 'Unlock (Dev)',
          onPress: () => {
            // Dev unlock — in production, uses off-chain SKR via SPEND_SKR
            dispatch({ type: 'UNLOCK_COSMETIC', payload: item.id });
          },
        },
      ]);
      return;
    }
    dispatch({ type: 'EQUIP_COSMETIC', payload: { [item.slot]: item.id } as Partial<EquippedCosmetics> });
  };

  const handleUnequipCosmetic = (slot: CosmeticSlot) => {
    dispatch({ type: 'EQUIP_COSMETIC', payload: { [slot]: undefined } as Partial<EquippedCosmetics> });
  };

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

        {/* Gear cards */}
        {(ss.gearInventory.length > 0 ? ss.gearInventory : ALL_GEAR_ITEMS).map((gear) => {
          const isActive = ss.activeGearSlots.includes(gear.slotId);
          const statLine = GEAR_STAT_LINE[gear.slotId](gear.quality);
          const bodyArea = GEAR_BODY_AREA[gear.slotId];
          const qualityColor = QUALITY_COLORS[gear.quality] || colors.textSecondary;
          const canToggle = !ss.gearLockedToday && (isActive || ss.activeGearSlots.length < 3);

          return (
            <TouchableOpacity
              key={gear.slotId}
              style={[styles.gearCard, isActive && styles.gearCardActive]}
              onPress={() => canToggle ? toggleGear(gear.slotId) : setSelectedGear(gear)}
              activeOpacity={canToggle ? 0.7 : 0.9}
            >
              <View style={styles.gearCardLeft}>
                <MaterialCommunityIcons name={gear.icon as any} size={24} color={isActive ? colors.neonGreen : colors.textSecondary} />
              </View>
              <View style={styles.gearCardCenter}>
                <View style={styles.gearNameRow}>
                  <Text style={[styles.gearName, isActive && styles.gearNameActive]}>
                    {gear.name}
                  </Text>
                  <Text style={[styles.gearBodyArea, { color: qualityColor }]}>
                    {bodyArea}
                  </Text>
                </View>
                <Text style={styles.gearStatLine}>{statLine}</Text>
                <Text style={[styles.gearQuality, { color: qualityColor }]}>
                  {gear.quality.charAt(0).toUpperCase() + gear.quality.slice(1)}
                </Text>
              </View>
              <View style={styles.gearCardRight}>
                {isActive ? (
                  <View style={styles.equippedDot}>
                    <Text style={styles.equippedDotText}>ON</Text>
                  </View>
                ) : (
                  <View style={styles.unequippedDot} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}

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

        {/* Cosmetic items for selected slot */}
        {getItemsForSlot(cosmeticSlot).map((item: CosmeticItem) => {
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
                {!unlocked && (
                  <NeonButton title="Unlock (Dev)" onPress={() => handleEquipCosmetic(item)} variant="ghost" size="sm" />
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
          {selectedGear && (
            <View style={styles.popupCard}>
              <MaterialCommunityIcons name={selectedGear.icon as any} size={40} color={QUALITY_COLORS[selectedGear.quality] || colors.textSecondary} style={{ marginBottom: spacing.sm }} />
              <Text style={styles.popupName}>{selectedGear.name}</Text>
              <Text style={[styles.popupQuality, { color: QUALITY_COLORS[selectedGear.quality] }]}>
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
          )}
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
  },
  sectionHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
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
  },

  // ─── Gear cards ───
  gearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  gearCardActive: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.surfaceHighlight,
  },
  gearCardLeft: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  gearCardCenter: {
    flex: 1,
  },
  gearNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  gearName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gearNameActive: {
    color: colors.neonGreen,
  },
  gearBodyArea: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gearStatLine: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    marginTop: 2,
  },
  gearQuality: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
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
    borderRadius: borderRadius.full,
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
  },
  unequippedDot: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },

  // ─── Pathfinder ───
  pathfinderRow: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
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
  },
  pathfinderDots: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pathfinderDot: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.surfaceLight,
  },
  pathfinderDotFilled: {
    borderColor: colors.neonCyan,
    backgroundColor: colors.neonCyan + '30',
  },
  pathfinderCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  pathfinderActiveText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 1,
  },
  pathfinderActiveDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
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
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surface,
  },
  cosmeticTabActive: {
    borderColor: colors.neonPurple,
    backgroundColor: colors.neonPurple + '20',
  },
  cosmeticTabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  cosmeticTabTextActive: {
    color: colors.neonPurple,
    fontWeight: '600',
  },

  // ─── Cosmetic cards ───
  cosmeticCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderLeftWidth: 3,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cosmeticCardEquipped: {
    borderColor: colors.neonGreen + '30',
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
  },
  cosmeticRarity: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  cosmeticBadge: {
    backgroundColor: colors.neonGreen + '20',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  cosmeticBadgeText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 1,
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
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  popupName: {
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  popupQuality: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: spacing.xs,
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
  },
  popupStatLine: {
    fontSize: fontSize.md,
    color: colors.neonCyan,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  popupShortDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  popupLocked: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  popupClose: {
    marginTop: spacing.lg,
    width: 120,
  },
});
