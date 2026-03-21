import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
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

export default function SettlementScreen({ navigation }: any) {
  const { state, dispatch } = useGame();
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs | null>(null);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [analyticsCount, setAnalyticsCount] = useState(0);

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

        {/* Notifications */}
        <Card title="Notifications" icon="🔔">
          <Text style={styles.tradeDesc}>
            Daily reminders to claim your Seeker Scans and protect your streak.
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
          <Card title="Dev Analytics" icon="📊">
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
          icon="⚙️"
          onPress={() => navigation.navigate('Wardrobe')}
          accentColor={colors.neonCyan}
        >
          <Text style={styles.tradeDesc}>
            Manage your gear loadout and cosmetics. Gear affects scan performance — cosmetics are visual only.
          </Text>
          <View style={styles.equippedPreview}>
            {state.seekerScans.activeGearSlots.map((slotId) => {
              const gear = state.seekerScans.gearInventory.find(g => g.slotId === slotId);
              return gear ? (
                <View key={slotId} style={styles.equippedItem}>
                  <Text style={styles.equippedSlot}>{gear.icon} {gear.name}</Text>
                </View>
              ) : null;
            })}
          </View>
          <NeonButton
            title="Open Equipment →"
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
