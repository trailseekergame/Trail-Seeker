import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import NeonButton from '../../components/common/NeonButton';
import { useGame } from '../../context/GameContext';
import { CosmeticItem, CosmeticSlot, EquippedCosmetics } from '../../types';
import cosmeticItems from '../../data/cosmetics';
import { purchaseCosmetic } from '../../services/solana';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const SLOT_LABELS: Record<CosmeticSlot, string> = {
  headgear: 'Headgear / Goggles',
  coat: 'Coat / Outerwear',
  backItem: 'Back Item',
  patch: 'Patch / Emblem',
  roverDecal: 'Rover Decal',
  accessory: 'Accessory',
};

const SLOT_ORDER: CosmeticSlot[] = [
  'headgear',
  'coat',
  'backItem',
  'patch',
  'roverDecal',
  'accessory',
];

export default function WardrobeScreen() {
  const { state, dispatch } = useGame();
  const [selectedSlot, setSelectedSlot] = useState<CosmeticSlot>('headgear');

  const getItemsForSlot = (slot: CosmeticSlot) =>
    cosmeticItems.filter((item) => item.slot === slot);

  const isEquipped = (itemId: string) => {
    return Object.values(state.equipped).includes(itemId);
  };

  const isUnlocked = (itemId: string) => {
    return state.unlockedCosmeticIds.includes(itemId);
  };

  const handleEquip = (item: CosmeticItem) => {
    if (!isUnlocked(item.id)) {
      Alert.alert(
        'Locked',
        item.unlockCondition || 'This item is not yet available.',
        [
          { text: 'OK' },
          {
            text: 'Unlock (Dev)',
            onPress: async () => {
              const success = await purchaseCosmetic(item.id);
              if (success) {
                dispatch({ type: 'UNLOCK_COSMETIC', payload: item.id });
              }
            },
          },
        ]
      );
      return;
    }

    const update: Partial<EquippedCosmetics> = { [item.slot]: item.id };
    dispatch({ type: 'EQUIP_COSMETIC', payload: update });
  };

  const handleUnequip = (slot: CosmeticSlot) => {
    const update: Partial<EquippedCosmetics> = { [slot]: undefined };
    dispatch({ type: 'EQUIP_COSMETIC', payload: update });
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return colors.textSecondary;
      case 'uncommon':
        return colors.neonGreen;
      case 'rare':
        return colors.neonCyan;
      case 'legendary':
        return colors.neonPurple;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Wardrobe</Text>
        <Text style={styles.subtitle}>
          Customize your look. Purely cosmetic — the Trail doesn't care what you're wearing.
        </Text>

        {/* Currently Equipped */}
        <Card title="Equipped" icon="🪞">
          {SLOT_ORDER.map((slot) => {
            const equippedId = state.equipped[slot];
            const item = cosmeticItems.find((c) => c.id === equippedId);
            return (
              <View key={slot} style={styles.equippedRow}>
                <Text style={styles.slotLabel}>{SLOT_LABELS[slot]}</Text>
                {item ? (
                  <View style={styles.equippedInfo}>
                    <Text style={styles.equippedIcon}>{item.icon}</Text>
                    <Text style={styles.equippedName}>{item.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.emptySlot}>— empty —</Text>
                )}
              </View>
            );
          })}
        </Card>

        {/* Slot Selector */}
        <View style={styles.slotTabs}>
          {SLOT_ORDER.map((slot) => (
            <TouchableOpacity
              key={slot}
              onPress={() => setSelectedSlot(slot)}
              style={[
                styles.slotTab,
                selectedSlot === slot && styles.slotTabActive,
              ]}
            >
              <Text
                style={[
                  styles.slotTabText,
                  selectedSlot === slot && styles.slotTabTextActive,
                ]}
                numberOfLines={1}
              >
                {SLOT_LABELS[slot].split('/')[0].trim()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Items for Selected Slot */}
        {getItemsForSlot(selectedSlot).map((item) => {
          const unlocked = isUnlocked(item.id);
          const equipped = isEquipped(item.id);

          return (
            <Card
              key={item.id}
              accentColor={getRarityColor(item.rarity)}
              style={equipped ? styles.equippedCard : undefined}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={styles.itemInfo}>
                  <Text
                    style={[
                      styles.itemName,
                      !unlocked && styles.lockedText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.itemRarity,
                      { color: getRarityColor(item.rarity) },
                    ]}
                  >
                    {item.rarity.toUpperCase()}
                  </Text>
                </View>
                {equipped && (
                  <View style={styles.equippedBadge}>
                    <Text style={styles.equippedBadgeText}>EQUIPPED</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.itemDesc, !unlocked && styles.lockedText]}>
                {item.description}
              </Text>
              {!unlocked && item.unlockCondition && (
                <Text style={styles.unlockCondition}>
                  🔒 {item.unlockCondition}
                </Text>
              )}
              <View style={styles.itemActions}>
                {unlocked && !equipped && (
                  <NeonButton
                    title="Equip"
                    onPress={() => handleEquip(item)}
                    variant="primary"
                    size="sm"
                  />
                )}
                {equipped && (
                  <NeonButton
                    title="Unequip"
                    onPress={() => handleUnequip(item.slot)}
                    variant="ghost"
                    size="sm"
                  />
                )}
                {!unlocked && (
                  <NeonButton
                    title="Unlock (Dev)"
                    onPress={() => handleEquip(item)}
                    variant="ghost"
                    size="sm"
                  />
                )}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  equippedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  slotLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  equippedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equippedIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  equippedName: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  emptySlot: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  slotTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginVertical: spacing.md,
  },
  slotTab: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surface,
  },
  slotTabActive: {
    borderColor: colors.neonPurple,
    backgroundColor: colors.neonPurple + '20',
  },
  slotTabText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  slotTabTextActive: {
    color: colors.neonPurple,
    fontWeight: '600',
  },
  equippedCard: {
    borderColor: colors.neonGreen + '30',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemRarity: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  equippedBadge: {
    backgroundColor: colors.neonGreen + '20',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  equippedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 1,
  },
  itemDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  lockedText: {
    opacity: 0.5,
  },
  unlockCondition: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    marginBottom: spacing.sm,
  },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
