import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../context/GameContext';
import cosmeticItems from '../../data/cosmetics';
import { colors, spacing, fontSize, fontMono } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { GearSlotId, GearItem, GearZone, CosmeticItem, CosmeticSlot, EquippedCosmetics } from '../../types';
import gameBalance from '../../config/gameBalance.json';
import AudioManager from '../../services/audioManager';

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

const ZONE_COLORS: Record<GearZone, string> = {
  sensor: colors.neonCyan,
  core: colors.neonGreen,
  drive: colors.neonAmber,
};

const ZONE_LABELS: Record<GearZone, string> = {
  sensor: 'SENSOR',
  core: 'CORE',
  drive: 'DRIVE',
};

const HARDPOINT_ORDER: GearZone[] = ['sensor', 'core', 'drive'];

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

  // ─── Installed items by zone ───
  const installedByZone = useMemo(() => {
    const map: Record<GearZone, GearItem | null> = { sensor: null, core: null, drive: null };
    for (const gear of ss.gearInventory) {
      if (ss.activeGearSlots.includes(gear.slotId)) {
        map[gear.zone] = gear;
      }
    }
    return map;
  }, [ss.gearInventory, ss.activeGearSlots]);

  // ─── Backpack items (not installed) ───
  const backpackItems = useMemo(() => {
    return ss.gearInventory
      .filter(g => !ss.activeGearSlots.includes(g.slotId))
      .sort((a, b) => {
        const aQ = QUALITY_ORDER[a.quality] ?? 0;
        const bQ = QUALITY_ORDER[b.quality] ?? 0;
        return bQ - aQ;
      });
  }, [ss.gearInventory, ss.activeGearSlots]);

  // ─── Install / Detach logic ───
  const installItem = (gear: GearItem) => {
    if (ss.gearLockedToday) return;
    const sameZoneSlots = ss.gearInventory
      .filter(g => g.zone === gear.zone && ss.activeGearSlots.includes(g.slotId))
      .map(g => g.slotId);
    const newSlots = ss.activeGearSlots.filter(s => !sameZoneSlots.includes(s));
    dispatch({ type: 'SET_ACTIVE_GEAR', payload: [...newSlots, gear.slotId] });
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
    setSelectedGear(null);
  };

  const detachItem = (gear: GearItem) => {
    if (ss.gearLockedToday) return;
    dispatch({ type: 'SET_ACTIVE_GEAR', payload: ss.activeGearSlots.filter(s => s !== gear.slotId) });
    AudioManager.playSfx('ui_tap');
    AudioManager.vibrate('light');
    setSelectedGear(null);
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

  // ─── Info panel helpers ───
  const isInstalled = (gear: GearItem) => ss.activeGearSlots.includes(gear.slotId);
  const hardpointOccupied = (gear: GearItem) => installedByZone[gear.zone] !== null;

  const getActionLabel = (gear: GearItem): { label: string; variant: 'primary' | 'ghost' | 'danger'; action: () => void } | null => {
    if (ss.gearLockedToday) return null;
    if (isInstalled(gear)) {
      return { label: 'DETACH', variant: 'danger', action: () => detachItem(gear) };
    }
    if (hardpointOccupied(gear)) {
      return { label: 'SWAP', variant: 'ghost', action: () => installItem(gear) };
    }
    return { label: 'INSTALL', variant: 'primary', action: () => installItem(gear) };
  };

  // ─── Render hardpoint slot ───
  const renderHardpoint = (zone: GearZone) => {
    const gear = installedByZone[zone];
    const zoneColor = ZONE_COLORS[zone];
    const zoneLabel = ZONE_LABELS[zone];

    if (!gear) {
      return (
        <View style={[styles.hardpoint, styles.hardpointEmpty, { borderColor: zoneColor + '30' }]}>
          <Text style={[styles.hardpointZoneLabel, { color: zoneColor }]}>{zoneLabel} HARDPOINT</Text>
          <Text style={styles.hardpointEmptyText}>[ EMPTY ]</Text>
        </View>
      );
    }

    const qualityColor = QUALITY_COLORS[gear.quality] || colors.textSecondary;
    const selected = selectedGear?.slotId === gear.slotId && selectedGear?.quality === gear.quality;

    return (
      <TouchableOpacity
        style={[
          styles.hardpoint,
          styles.hardpointInstalled,
          selected && { borderColor: qualityColor },
        ]}
        onPress={() => {
          AudioManager.playSfx('ui_tap');
          AudioManager.vibrate('light');
          setSelectedGear(selected ? null : gear);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.hardpointTop}>
          <Text style={[styles.hardpointZoneLabel, { color: zoneColor }]}>{zoneLabel}</Text>
          <View style={styles.installedTag}>
            <Text style={styles.installedTagText}>INSTALLED</Text>
          </View>
        </View>
        <View style={styles.hardpointContent}>
          <MaterialCommunityIcons name={gear.icon as any} size={22} color={colors.neonGreen} />
          <Text style={styles.hardpointName} numberOfLines={1}>{gear.name}</Text>
          <View style={[styles.qualityBadge, { borderColor: qualityColor + '60' }]}>
            <Text style={[styles.qualityBadgeText, { color: qualityColor }]}>
              {gear.quality.charAt(0).toUpperCase() + gear.quality.slice(1)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Render backpack item ───
  const renderBackpackItem = (gear: GearItem) => {
    const qualityColor = QUALITY_COLORS[gear.quality] || colors.textSecondary;
    const selected = selectedGear?.slotId === gear.slotId && selectedGear?.quality === gear.quality;

    return (
      <TouchableOpacity
        key={`${gear.slotId}-${gear.quality}-${gear.name}`}
        style={[
          styles.backpackCard,
          { borderLeftColor: qualityColor, borderLeftWidth: 3 },
          selected && { borderColor: qualityColor },
        ]}
        onPress={() => {
          AudioManager.playSfx('ui_tap');
          AudioManager.vibrate('light');
          setSelectedGear(selected ? null : gear);
        }}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name={gear.icon as any} size={20} color={qualityColor} />
        <Text style={styles.backpackName} numberOfLines={2}>{gear.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ═══════════ SECTION 1: EXO-RIG SCHEMATIC ═══════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>EXO-RIG SCHEMATIC</Text>
          {ss.gearLockedToday ? (
            <Text style={styles.lockedBadge}>LOCKED TODAY</Text>
          ) : (
            <Text style={styles.sectionHint}>{ss.activeGearSlots.length}/3 installed</Text>
          )}
        </View>
        <Text style={styles.sectionDesc}>
          Hardpoint loadout. Each rig changes how the rover reads signal. One per zone.
        </Text>

        {ss.gearInventory.length > 0 ? (
          <View style={styles.schematicRow}>
            {/* LEFT — Schematic hardpoints */}
            <View style={styles.schematicLeft}>
              {HARDPOINT_ORDER.map((zone, i) => (
                <React.Fragment key={zone}>
                  {renderHardpoint(zone)}
                  {i < HARDPOINT_ORDER.length - 1 && <View style={styles.connector} />}
                </React.Fragment>
              ))}
            </View>

            {/* RIGHT — Backpack grid */}
            <View style={styles.schematicRight}>
              <Text style={styles.backpackLabel}>BACKPACK</Text>
              {backpackItems.length > 0 ? (
                <View style={styles.backpackGrid}>
                  {backpackItems.map((gear) => renderBackpackItem(gear))}
                </View>
              ) : (
                <View style={styles.backpackEmpty}>
                  <Text style={styles.backpackEmptyText}>All items installed</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyGearCard}>
            <MaterialCommunityIcons name="shield-off-outline" size={28} color={colors.textMuted} />
            <Text style={styles.emptyGearText}>No gear yet. Run scans on Broken Overpass to find your first drops.</Text>
          </View>
        )}

        {/* ─── Info Panel ─── */}
        {selectedGear && (
          <View style={styles.infoPanel}>
            <View style={styles.infoPanelHeader}>
              <MaterialCommunityIcons
                name={selectedGear.icon as any}
                size={28}
                color={QUALITY_COLORS[selectedGear.quality] || colors.textSecondary}
              />
              <View style={styles.infoPanelTitle}>
                <Text style={[styles.infoPanelName, { color: QUALITY_COLORS[selectedGear.quality] || colors.textPrimary }]}>
                  {selectedGear.name}
                </Text>
                <View style={styles.infoPanelBadges}>
                  <View style={[styles.zoneBadge, { borderColor: ZONE_COLORS[selectedGear.zone] + '60' }]}>
                    <Text style={[styles.zoneBadgeText, { color: ZONE_COLORS[selectedGear.zone] }]}>
                      {ZONE_LABELS[selectedGear.zone]}
                    </Text>
                  </View>
                  <View style={[styles.qualityBadgeInline, { borderColor: (QUALITY_COLORS[selectedGear.quality] || colors.textSecondary) + '60' }]}>
                    <Text style={[styles.qualityBadgeInlineText, { color: QUALITY_COLORS[selectedGear.quality] || colors.textSecondary }]}>
                      {selectedGear.quality.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedGear(null)} style={styles.infoPanelClose}>
                <MaterialCommunityIcons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.infoPanelStat}>
              {GEAR_STAT_LINE[selectedGear.slotId](selectedGear.quality)}
            </Text>
            <Text style={styles.infoPanelLore}>{selectedGear.lore}</Text>
            {ss.gearLockedToday ? (
              <Text style={styles.infoPanelLocked}>GEAR LOCKED — first scan locks loadout for the day</Text>
            ) : (
              (() => {
                const action = getActionLabel(selectedGear);
                if (!action) return null;
                return (
                  <NeonButton
                    title={action.label}
                    onPress={action.action}
                    variant={action.variant === 'danger' ? 'ghost' : action.variant}
                    size="sm"
                    style={styles.infoPanelBtn}
                  />
                );
              })()
            )}
          </View>
        )}

        {/* ─── Future gear hint ─── */}
        {ss.gearInventory.length > 0 && ss.gearInventory.length < 4 && (
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
                {__DEV__ && !unlocked && (
                  <NeonButton title="Dev Unlock" onPress={() => dispatch({ type: 'UNLOCK_COSMETIC', payload: item.id })} variant="ghost" size="sm" />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
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

  // ─── Schematic layout ───
  schematicRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  schematicLeft: {
    width: '55%',
    alignItems: 'stretch',
  },
  schematicRight: {
    width: '45%',
    paddingLeft: spacing.xs,
  },

  // ─── Hardpoints ───
  hardpoint: {
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  hardpointEmpty: {
    borderStyle: 'dashed',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  hardpointInstalled: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '06',
  },
  hardpointTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  hardpointZoneLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: fontMono,
  },
  hardpointEmptyText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    marginTop: spacing.xs,
  },
  hardpointContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hardpointName: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neonGreen,
    fontFamily: fontMono,
    flex: 1,
  },
  installedTag: {
    backgroundColor: colors.neonGreen + '20',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  installedTagText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.neonGreen,
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  qualityBadge: {
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  qualityBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  connector: {
    height: 12,
    width: 2,
    backgroundColor: colors.panelBorder,
    alignSelf: 'center',
  },

  // ─── Backpack ───
  backpackLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    fontFamily: fontMono,
    marginBottom: spacing.sm,
  },
  backpackGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  backpackCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  backpackName: {
    fontSize: 10,
    color: colors.textPrimary,
    fontFamily: fontMono,
    textAlign: 'center',
    lineHeight: 14,
  },
  backpackEmpty: {
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderStyle: 'dashed',
    padding: spacing.md,
    alignItems: 'center',
  },
  backpackEmptyText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
  },

  // ─── Info panel ───
  infoPanel: {
    backgroundColor: colors.surface,
    borderTopWidth: 1.5,
    borderTopColor: colors.panelBorder,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  infoPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoPanelTitle: {
    flex: 1,
  },
  infoPanelName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    fontFamily: fontMono,
  },
  infoPanelBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  zoneBadge: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  zoneBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: fontMono,
  },
  qualityBadgeInline: {
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  qualityBadgeInlineText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    fontFamily: fontMono,
  },
  infoPanelClose: {
    padding: 4,
  },
  infoPanelStat: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontFamily: fontMono,
    marginBottom: spacing.sm,
  },
  infoPanelLore: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  infoPanelLocked: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 1,
  },
  infoPanelBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
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
});
