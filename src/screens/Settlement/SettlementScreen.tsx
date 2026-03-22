import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Linking } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
import FeedbackToast, { ToastData } from '../../components/common/FeedbackToast';
import { useGame } from '../../context/GameContext';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  loadNotificationPrefs,
  saveNotificationPrefs,
  NotificationPrefs,
  getScheduledCount,
} from '../../services/notifications';
import {
  getEventCount,
  forceSendReport,
  clearAnalytics,
  checkAndSendWeeklyReport,
} from '../../services/analytics';

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
const HEAL_COST = 4; // supplies per 15 heal points
const SCRAP_PER_ITEM = 3; // scrap returned when scrapping a special loot item

export default function SettlementScreen({ navigation }: any) {
  const { state, dispatch } = useGame();
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [analyticsCount, setAnalyticsCount] = useState(0);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((icon: string, text: string, color: string) => {
    setToast({ id: Date.now(), icon, text, color });
  }, []);

  useEffect(() => {
    loadNotificationPrefs().then(setNotifPrefs);
    getScheduledCount().then(setScheduledCount);
    getEventCount().then(setAnalyticsCount);
    // Check if weekly report is due
    checkAndSendWeeklyReport();
  }, []);

  const updateNotifPref = async (key: keyof NotificationPrefs, value: boolean) => {
    if (!notifPrefs) return;
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await saveNotificationPrefs(updated);
  };

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
    showToast('swap-horizontal', trade.label, colors.neonCyan);
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
    showToast('car-wrench', `+15 Rover · -${REPAIR_COST} Scrap`, colors.neonCyan);
  };

  const handleHeal = () => {
    if (state.playerHealth >= 100) {
      Alert.alert('Full Health', 'You\'re already at full health.');
      return;
    }
    if (state.resources.supplies < HEAL_COST) {
      Alert.alert('Not Enough Supplies', `You need ${HEAL_COST} supplies to heal.`);
      return;
    }
    dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: { supplies: -HEAL_COST } });
    dispatch({ type: 'HEAL', payload: 15 });
    showToast('heart-pulse', `+15 HP · -${HEAL_COST} Supplies`, colors.neonGreen);
  };

  const handleScrapItem = (item: string, index: number) => {
    dispatch({ type: 'REMOVE_SPECIAL_LOOT', payload: item });
    dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: { scrap: SCRAP_PER_ITEM } });
    showToast('recycle', `Scrapped ${item} · +${SCRAP_PER_ITEM} Scrap`, colors.scrap);
  };

  return (
    <ScreenWrapper>
      <FeedbackToast toast={toast} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>The Post</Text>
        <Text style={styles.subtitle}>
          Off-grid waystation. Refit, barter, and get back out before the window shuts.
        </Text>

        {/* Resources Overview */}
        <Card title="Haul" icon="backpack">
          <View style={styles.resourceGrid}>
            <View style={styles.resourceItem}>
              <MaterialCommunityIcons name="cog" size={28} color={colors.scrap} style={{ marginBottom: 4 }} />
              <Text style={[styles.resourceValue, { color: colors.scrap }]}>
                {state.resources.scrap}
              </Text>
              <Text style={styles.resourceLabel}>Scrap</Text>
            </View>
            <View style={styles.resourceItem}>
              <MaterialCommunityIcons name="package-variant" size={28} color={colors.supplies} style={{ marginBottom: 4 }} />
              <Text style={[styles.resourceValue, { color: colors.supplies }]}>
                {state.resources.supplies}
              </Text>
              <Text style={styles.resourceLabel}>Supplies</Text>
            </View>
            <View style={styles.resourceItem}>
              <MaterialCommunityIcons name="star-four-points" size={28} color={colors.specialLoot} style={{ marginBottom: 4 }} />
              <Text style={[styles.resourceValue, { color: colors.specialLoot }]}>
                {state.resources.specialLoot.length}
              </Text>
              <Text style={styles.resourceLabel}>Salvage</Text>
            </View>
          </View>

          {state.resources.specialLoot.length > 0 && (
            <View style={styles.lootSection}>
              {state.resources.specialLoot.map((item, i) => (
                <View key={i} style={styles.lootItemRow}>
                  <MaterialCommunityIcons name="star-four-points" size={14} color={colors.specialLoot} style={{ marginRight: 6 }} />
                  <Text style={[styles.lootItem, { flex: 1 }]}>{item}</Text>
                  <NeonButton
                    title={`Scrap (+${SCRAP_PER_ITEM})`}
                    onPress={() => handleScrapItem(item, i)}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Health Status + Quick Actions */}
        <Card title="Condition" icon="heart-pulse">
          <HealthBar value={state.playerHealth} max={100} label="Player Health" />
          {state.playerHealth < 100 && (
            <NeonButton
              title={`Heal (+15 HP for ${HEAL_COST} Supplies)`}
              onPress={handleHeal}
              variant="secondary"
              size="sm"
              disabled={state.resources.supplies < HEAL_COST || state.playerHealth >= 100}
              style={styles.healButton}
            />
          )}
          <HealthBar
            value={state.roverHealth}
            max={100}
            label="Rover Condition"
            color={colors.neonCyan}
          />
          {state.roverHealth < 100 && (
            <NeonButton
              title={`Repair (+15 Rover for ${REPAIR_COST} Scrap)`}
              onPress={handleRepair}
              variant="secondary"
              size="sm"
              disabled={state.resources.scrap < REPAIR_COST || state.roverHealth >= 100}
              style={styles.healButton}
            />
          )}
        </Card>

        {/* Trade */}
        <Card title="Barter" icon="swap-horizontal">
          <Text style={styles.tradeDesc}>
            Fixed rates. Not generous, but it\'s what the post offers.
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
        <Card title="Repair Bench" icon="wrench">
          <Text style={styles.tradeDesc}>
            Burn {REPAIR_COST} scrap to patch the rover (+15 condition).
          </Text>
          <NeonButton
            title={`Repair Rover (${REPAIR_COST} Scrap)`}
            onPress={handleRepair}
            variant="primary"
            disabled={state.resources.scrap < REPAIR_COST || state.roverHealth >= 100}
            style={styles.repairButton}
          />
        </Card>

        {/* Notifications */}
        <Card title="Comms" icon="bell-outline">
          <Text style={styles.tradeDesc}>
            Daily pings to claim your scans and keep the streak alive.
          </Text>
          {notifPrefs && (
            <>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Daily Reminders</Text>
                <Switch
                  value={notifPrefs.enabled}
                  onValueChange={(v) => updateNotifPref('enabled', v)}
                  trackColor={{ false: colors.surfaceLight, true: colors.neonGreen + '60' }}
                  thumbColor={notifPrefs.enabled ? colors.neonGreen : colors.textMuted}
                />
              </View>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Streak Warnings</Text>
                <Switch
                  value={notifPrefs.streakWarningsEnabled}
                  onValueChange={(v) => updateNotifPref('streakWarningsEnabled', v)}
                  trackColor={{ false: colors.surfaceLight, true: colors.neonAmber + '60' }}
                  thumbColor={notifPrefs.streakWarningsEnabled ? colors.neonAmber : colors.textMuted}
                />
              </View>
              <Text style={styles.settingHint}>
                Quiet hours: {notifPrefs.quietHourStart}:00 – {notifPrefs.quietHourEnd}:00
                {' '}· {scheduledCount} pending
              </Text>
            </>
          )}
        </Card>

        {/* Dev Analytics (only in development) */}
        {__DEV__ && (
          <Card title="Dev Analytics" icon="chart-bar">
            <Text style={styles.tradeDesc}>
              Player behavior telemetry. Weekly report sent to trailseekergame@gmail.com.
            </Text>
            <Text style={styles.settingHint}>
              {analyticsCount} events tracked this period
            </Text>
            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <NeonButton
                title="Send Report Now"
                onPress={async () => {
                  await forceSendReport();
                  Alert.alert('Report Sent', 'Weekly analytics report opened in email client.');
                }}
                variant="secondary"
                size="sm"
              />
              <NeonButton
                title="Clear Data"
                onPress={async () => {
                  await clearAnalytics();
                  setAnalyticsCount(0);
                  Alert.alert('Cleared', 'All analytics data has been reset.');
                }}
                variant="ghost"
                size="sm"
              />
            </View>
          </Card>
        )}

        {/* Equipment */}
        <Card
          title="Equipment"
          icon="cog"
          onPress={() => navigation.navigate('Wardrobe')}
          accentColor={colors.neonCyan}
        >
          <Text style={styles.tradeDesc}>
            Your rig. What you're running determines what you can pull from the field.
          </Text>
          <View style={styles.equippedPreview}>
            {state.seekerScans.activeGearSlots.map((slotId) => {
              const gear = state.seekerScans.gearInventory.find(g => g.slotId === slotId);
              return gear ? (
                <View key={slotId} style={styles.equippedItem}>
                  <View style={styles.equippedSlotRow}>
                    <MaterialCommunityIcons name={gear.icon as any} size={14} color={colors.neonPurple} style={{ marginRight: 4 }} />
                    <Text style={styles.equippedSlot}>{gear.name}</Text>
                  </View>
                </View>
              ) : null;
            })}
          </View>
          <NeonButton
            title="Open Loadout"
            onPress={() => navigation.navigate('Wardrobe')}
            variant="ghost"
            size="sm"
          />
        </Card>
        {/* Feedback */}
        <Card title="Dead Drop" icon="email-outline">
          <Text style={styles.tradeDesc}>
            Found a bug or got a thought? Drop it here.
          </Text>
          <NeonButton
            title="Send Feedback"
            onPress={() => Linking.openURL('mailto:trailseekergame@gmail.com?subject=Trail%20Seeker%20Feedback')}
            variant="secondary"
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
  lootItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  equippedSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  healButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
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
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  settingHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
