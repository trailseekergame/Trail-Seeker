import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
import { useGame } from '../../context/GameContext';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface TradeOption {
  id: string;
  label: string;
  give: { type: 'scrap' | 'supplies'; amount: number };
  receive: { type: 'scrap' | 'supplies'; amount: number };
}

const TRADE_OPTIONS: TradeOption[] = [
  {
    id: 'scrap-to-supplies',
    label: '10 Scrap → 6 Supplies',
    give: { type: 'scrap', amount: 10 },
    receive: { type: 'supplies', amount: 6 },
  },
  {
    id: 'supplies-to-scrap',
    label: '6 Supplies → 8 Scrap',
    give: { type: 'supplies', amount: 6 },
    receive: { type: 'scrap', amount: 8 },
  },
  {
    id: 'big-scrap-to-supplies',
    label: '20 Scrap → 14 Supplies',
    give: { type: 'scrap', amount: 20 },
    receive: { type: 'supplies', amount: 14 },
  },
];

const REPAIR_COST = 5; // scrap per 15 repair points

export default function SettlementScreen({ navigation }: any) {
  const { state, dispatch } = useGame();

  const handleTrade = (trade: TradeOption) => {
    const currentGive =
      trade.give.type === 'scrap' ? state.resources.scrap : state.resources.supplies;
    if (currentGive < trade.give.amount) {
      Alert.alert('Not Enough Resources', `You need ${trade.give.amount} ${trade.give.type}.`);
      return;
    }

    dispatch({
      type: 'APPLY_RESOURCE_CHANGES',
      payload: {
        [trade.give.type]: -trade.give.amount,
        [trade.receive.type]: trade.receive.amount,
      },
    });
  };

  const handleRepair = () => {
    if (state.roverHealth >= 100) {
      Alert.alert('Fully Repaired', 'Your rover is already in top condition.');
      return;
    }
    if (state.resources.scrap < REPAIR_COST) {
      Alert.alert('Not Enough Scrap', `You need ${REPAIR_COST} scrap for repairs.`);
      return;
    }

    dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: { scrap: -REPAIR_COST } });
    dispatch({ type: 'REPAIR_ROVER', payload: 15 });
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Settlement</Text>
        <Text style={styles.subtitle}>
          A makeshift hub. Trade, repair, and gear up before hitting the Trail.
        </Text>

        {/* Resources Overview */}
        <Card title="Resources" icon="🎒">
          <View style={styles.resourceGrid}>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>🔩</Text>
              <Text style={[styles.resourceValue, { color: colors.scrap }]}>
                {state.resources.scrap}
              </Text>
              <Text style={styles.resourceLabel}>Scrap</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>📦</Text>
              <Text style={[styles.resourceValue, { color: colors.supplies }]}>
                {state.resources.supplies}
              </Text>
              <Text style={styles.resourceLabel}>Supplies</Text>
            </View>
            <View style={styles.resourceItem}>
              <Text style={styles.resourceIcon}>✦</Text>
              <Text style={[styles.resourceValue, { color: colors.specialLoot }]}>
                {state.resources.specialLoot.length}
              </Text>
              <Text style={styles.resourceLabel}>Special Loot</Text>
            </View>
          </View>

          {state.resources.specialLoot.length > 0 && (
            <View style={styles.lootSection}>
              {state.resources.specialLoot.map((item, i) => (
                <Text key={i} style={styles.lootItem}>
                  ✦ {item}
                </Text>
              ))}
            </View>
          )}
        </Card>

        {/* Health Status */}
        <Card title="Status" icon="❤️">
          <HealthBar value={state.playerHealth} max={100} label="Player Health" />
          <HealthBar
            value={state.roverHealth}
            max={100}
            label="Rover Condition"
            color={colors.neonCyan}
          />
        </Card>

        {/* Trade */}
        <Card title="Trade Post" icon="🤝">
          <Text style={styles.tradeDesc}>
            Exchange resources at fixed rates. Not the best deal, but it beats starving.
          </Text>
          {TRADE_OPTIONS.map((trade) => (
            <NeonButton
              key={trade.id}
              title={trade.label}
              onPress={() => handleTrade(trade)}
              variant="secondary"
              size="sm"
              style={styles.tradeButton}
            />
          ))}
        </Card>

        {/* Repair */}
        <Card title="Repair Bay" icon="🔧">
          <Text style={styles.tradeDesc}>
            Spend {REPAIR_COST} scrap to repair your rover (+15 condition).
          </Text>
          <NeonButton
            title={`Repair Rover (${REPAIR_COST} Scrap)`}
            onPress={handleRepair}
            variant="primary"
            disabled={state.resources.scrap < REPAIR_COST || state.roverHealth >= 100}
            style={styles.repairButton}
          />
        </Card>

        {/* Wardrobe */}
        <Card
          title="Wardrobe"
          icon="👔"
          onPress={() => navigation.navigate('Wardrobe')}
          accentColor={colors.neonPurple}
        >
          <Text style={styles.tradeDesc}>
            Customize your look. Purely cosmetic — no stat effects.
          </Text>
          <View style={styles.equippedPreview}>
            {Object.entries(state.equipped).map(([slot, itemId]) =>
              itemId ? (
                <View key={slot} style={styles.equippedItem}>
                  <Text style={styles.equippedSlot}>{slot}</Text>
                </View>
              ) : null
            )}
          </View>
          <NeonButton
            title="Open Wardrobe →"
            onPress={() => navigation.navigate('Wardrobe')}
            variant="ghost"
            size="sm"
          />
        </Card>
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
  resourceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resourceItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  resourceIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  resourceValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  resourceLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  lootSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  lootItem: {
    fontSize: fontSize.sm,
    color: colors.specialLoot,
    marginVertical: 2,
  },
  tradeDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  tradeButton: {
    marginBottom: spacing.sm,
  },
  repairButton: {
    marginTop: spacing.xs,
  },
  equippedPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  equippedItem: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  equippedSlot: {
    fontSize: fontSize.xs,
    color: colors.neonPurple,
    textTransform: 'capitalize',
  },
});
