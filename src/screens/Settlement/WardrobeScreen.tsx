import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '../../context/GameContext';
import { ALL_GEAR_ITEMS } from '../../data/gearItems';
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
  const [activeTab, setActiveTab] = useState<'rig' | 'look'>('rig');
  const [showCatalog, setShowCatalog] = useState(false);

  // ─── NEW gear helper ───
  const newGearIds = ss.newGearIds || [];
  const isNewGear = (gear: GearItem) =>
    newGearIds.includes(`${gear.name}:${gear.quality}`);

  // Mark all new gear as seen after 3 seconds on this screen
  useEffect(() => {
    if (!newGearIds.length) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'MARK_GEAR_SEEN', payload: [...newGearIds] });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ─── Catalog: all items grouped by zone, with owned status ───
  const catalogByZone = useMemo(() => {
    const zones: Record<GearZone, { item: GearItem; owned: boolean; isNew: boolean }[]> = {
      sensor: [], core: [], drive: [],
    };
    for (const item of ALL_GEAR_ITEMS) {
      const owned = ss.gearInventory.some(
        g => g.name === item.name && g.quality === item.quality && g.slotId === item.slotId
      );
      zones[item.zone].push({ item, owned, isNew: isNewGear(item) });
    }
    return zones;
  }, [ss.gearInventory, newGearIds]);

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
    const newItem = isNewGear(gear);

    return (
      <TouchableOpacity
        key={`${gear.slotId}-${gear.quality}-${gear.name}`}
        style={[
          styles.backpackCard,
          { borderLeftColor: qualityColor, borderLeftWidth: 3 },
          selected && { borderColor: qualityColor },
          newItem && { borderColor: colors.neonAmber + '60' },
        ]}
        onPress={() => {
          AudioManager.playSfx('ui_tap');
          AudioManager.vibrate('light');
          setSelectedGear(selected ? null : gear);
        }}
        activeOpacity={0.7}
      >
        {newItem && (
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>NEW</Text>
          </View>
        )}
        <MaterialCommunityIcons name={gear.icon as any} size={20} color={qualityColor} />
        <Text style={styles.backpackName} numberOfLines={2}>{gear.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* ═══════════ TAB BAR ═══════════ */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rig' && styles.tabActiveRig]}
            onPress={() => { setActiveTab('rig'); setSelectedGear(null); }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cog" size={16} color={activeTab === 'rig' ? colors.neonGreen : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'rig' && styles.tabTextActiveRig]}>RIG</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'look' && styles.tabActiveLook]}
            onPress={() => { setActiveTab('look'); setSelectedGear(null); }}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="palette-outline" size={16} color={activeTab === 'look' ? colors.neonPurple : colors.textMuted} />
            <Text style={[styles.tabText, activeTab === 'look' && styles.tabTextActiveLook]}>LOOK</Text>
          </TouchableOpacity>
        </View>

        {/* ═══════════ EXOSUIT SILHOUETTE ═══════════ */}
        {(() => {
          const accent = activeTab === 'rig' ? colors.neonGreen : colors.neonPurple;
          const line = accent + '35';
          const fill = accent + '06';
          return (
            <View style={styles.silhouetteContainer}>
              {/* ── Head ── */}
              <View style={[styles.exoHead, { borderColor: line }]} />
              {/* ── Neck ── */}
              <View style={[styles.exoNeck, { backgroundColor: line }]} />
              {/* ── Shoulders + Torso ── */}
              <View style={styles.exoShoulderRow}>
                <View style={[styles.exoArm, { borderColor: line, backgroundColor: fill }]} />
                <View style={[styles.exoTorso, { borderColor: line, backgroundColor: fill }]}>
                  <Text style={[styles.exoLabel, { color: accent + '50' }]}>EXO</Text>
                  <MaterialCommunityIcons name="shield-half-full" size={18} color={accent + '30'} />
                </View>
                <View style={[styles.exoArm, { borderColor: line, backgroundColor: fill }]} />
              </View>
              {/* ── Waist ── */}
              <View style={[styles.exoWaist, { borderColor: line }]} />
              {/* ── Legs ── */}
              <View style={styles.exoLegRow}>
                <View style={[styles.exoLeg, { borderColor: line, backgroundColor: fill }]} />
                <View style={{ width: 6 }} />
                <View style={[styles.exoLeg, { borderColor: line, backgroundColor: fill }]} />
              </View>
              {/* ── Boots ── */}
              <View style={styles.exoBootRow}>
                <View style={[styles.exoBoot, { borderColor: line }]} />
                <View style={{ width: 14 }} />
                <View style={[styles.exoBoot, { borderColor: line }]} />
              </View>
              {/* ── Callsign ── */}
              <Text style={[styles.silhouetteCallsign, { color: accent }]}>
                {state.playerName}
              </Text>
              {state.backstory && (
                <Text style={styles.silhouetteOrigin}>{state.backstory.archetype}</Text>
              )}
            </View>
          );
        })()}

        {/* ═══════════ RIG TAB ═══════════ */}
        {activeTab === 'rig' && (
          <>
            <View style={styles.rigStatusRow}>
              {ss.gearLockedToday ? (
                <Text style={styles.lockedBadge}>LOADOUT LOCKED</Text>
              ) : (
                <Text style={styles.rigStatus}>{ss.activeGearSlots.length}/3 HARDPOINTS ACTIVE</Text>
              )}
            </View>

            {ss.gearInventory.length > 0 ? (
              <View style={styles.hardpointStack}>
                {HARDPOINT_ORDER.map((zone, i) => (
                  <React.Fragment key={zone}>
                    {renderHardpoint(zone)}
                    {i < HARDPOINT_ORDER.length - 1 && <View style={styles.connector} />}
                  </React.Fragment>
                ))}
              </View>
            ) : (
              <View style={styles.emptyGearCard}>
                <MaterialCommunityIcons name="shield-off-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyGearText}>No gear yet. Run scans to find drops.</Text>
              </View>
            )}

            {/* Info panel */}
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
                          {ZONE_LABELS[selectedGear.zone] || 'UNKNOWN'}
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
                  {GEAR_STAT_LINE[selectedGear.slotId]?.(selectedGear.quality) || 'No stats available'}
                </Text>
                <Text style={styles.infoPanelLore}>{selectedGear.lore || 'Salvaged from the wastes.'}</Text>
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

            {/* Backpack */}
            {backpackItems.length > 0 && (
              <View style={styles.backpackSection}>
                <Text style={styles.backpackLabel}>BACKPACK</Text>
                <View style={styles.backpackGrid}>
                  {backpackItems.map((gear) => renderBackpackItem(gear))}
                </View>
              </View>
            )}

            {/* ─── GEAR CATALOG ─── */}
            <TouchableOpacity
              style={styles.catalogToggle}
              onPress={() => setShowCatalog(!showCatalog)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={showCatalog ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.catalogToggleText}>
                {showCatalog ? 'HIDE CATALOG' : 'ALL RIGS'} ({ss.gearInventory.length}/{ALL_GEAR_ITEMS.length} found)
              </Text>
            </TouchableOpacity>

            {showCatalog && (
              <View style={styles.catalogContainer}>
                {(['sensor', 'core', 'drive'] as GearZone[]).map(zone => (
                  <View key={zone} style={styles.catalogZone}>
                    <Text style={[styles.catalogZoneLabel, { color: ZONE_COLORS[zone] }]}>
                      {ZONE_LABELS[zone]}
                    </Text>
                    {catalogByZone[zone].map(({ item, owned, isNew }) => {
                      const qColor = QUALITY_COLORS[item.quality] || colors.textSecondary;
                      return (
                        <View
                          key={`${item.name}-${item.quality}`}
                          style={[styles.catalogItem, !owned && styles.catalogItemLocked]}
                        >
                          <MaterialCommunityIcons
                            name={item.icon as any}
                            size={16}
                            color={owned ? qColor : colors.textMuted + '40'}
                          />
                          <View style={styles.catalogItemInfo}>
                            <Text style={[
                              styles.catalogItemName,
                              { color: owned ? colors.textPrimary : colors.textMuted },
                            ]} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={[styles.catalogItemEffect, { color: owned ? qColor : colors.textMuted + '60' }]}>
                              {GEAR_STAT_LINE[item.slotId]?.(item.quality) || '—'}
                            </Text>
                          </View>
                          <View style={styles.catalogItemRight}>
                            {isNew && (
                              <View style={styles.newTag}>
                                <Text style={styles.newTagText}>NEW</Text>
                              </View>
                            )}
                            {owned ? (
                              <Text style={[styles.catalogTierBadge, { color: qColor }]}>
                                {item.quality.charAt(0).toUpperCase() + item.quality.slice(1)}
                              </Text>
                            ) : (
                              <MaterialCommunityIcons name="lock-outline" size={12} color={colors.textMuted + '40'} />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* ═══════════ LOOK TAB ═══════════ */}
        {activeTab === 'look' && (
          <>
            <Text style={styles.lookHint}>Visual only. No stat effects.</Text>

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
          </>
        )}

        {/* ═══════════ PATHFINDER (below both tabs) ═══════════ */}
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
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },

  // ─── Tab bar ───
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    backgroundColor: colors.surface,
  },
  tabActiveRig: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '08',
  },
  tabActiveLook: {
    borderColor: colors.neonPurple + '60',
    backgroundColor: colors.neonPurple + '08',
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 3,
  },
  tabTextActiveRig: {
    color: colors.neonGreen,
  },
  tabTextActiveLook: {
    color: colors.neonPurple,
  },

  // ─── Exosuit Silhouette ───
  silhouetteContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  exoHead: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  exoNeck: {
    width: 2,
    height: 8,
    backgroundColor: colors.panelBorder,
  },
  exoShoulderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exoArm: {
    width: 14,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    marginTop: 4,
  },
  exoTorso: {
    width: 64,
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exoLabel: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: fontMono,
    letterSpacing: 3,
    marginBottom: 2,
  },
  exoWaist: {
    width: 48,
    height: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  exoLegRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exoLeg: {
    width: 20,
    height: 48,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  exoBootRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exoBoot: {
    width: 26,
    height: 10,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  silhouetteCallsign: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  silhouetteOrigin: {
    fontSize: 9,
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 1,
    marginTop: 2,
  },

  // ─── Rig status ───
  rigStatusRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  rigStatus: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: fontMono,
  },
  lockedBadge: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },

  // ─── Hardpoints ───
  hardpointStack: {
    paddingHorizontal: spacing.md,
  },
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
  backpackSection: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
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

  // ─── Look hint ───
  lookHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    textAlign: 'center',
    marginBottom: spacing.md,
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

  // ─── NEW tag ───
  newTag: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.neonAmber,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 2,
  },
  newTagText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.background,
    fontFamily: fontMono,
    letterSpacing: 1,
  },

  // ─── Gear Catalog ───
  catalogToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderStyle: 'dashed',
  },
  catalogToggleText: {
    fontSize: 10,
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 2,
  },
  catalogContainer: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  catalogZone: {
    marginBottom: spacing.md,
  },
  catalogZoneLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: fontMono,
    marginBottom: spacing.xs,
  },
  catalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: 3,
  },
  catalogItemLocked: {
    opacity: 0.45,
  },
  catalogItemInfo: {
    flex: 1,
  },
  catalogItemName: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: fontMono,
  },
  catalogItemEffect: {
    fontSize: 9,
    fontFamily: fontMono,
    marginTop: 1,
  },
  catalogItemRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  catalogTierBadge: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
});
