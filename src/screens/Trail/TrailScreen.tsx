import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import ResourceBar from '../../components/common/ResourceBar';
import ZoneMap from '../../components/trail/ZoneMap';
import EventModal from '../../components/trail/EventModal';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
import { useGame } from '../../context/GameContext';
import { useEventEngine } from '../../hooks/useEventEngine';
import { ZoneNode, EventChoice, EventOutcome, GameEvent, MAX_RUN_DAYS, OutcomeQuality } from '../../types';
import zone01 from '../../data/zone01';
import { drawTrailOutcome, getTierColor, getTierIcon } from '../../systems/trailOutcomes';
import { purchaseExtraMove, purchaseRevive, REVIVE_COST_SKR } from '../../services/solana';
import { colors, spacing, fontSize } from '../../theme';

export default function TrailScreen() {
  const { state, dispatch } = useGame();
  const { getEventForNode, getAvailableChoices, rollAndApply, applyOutcome, applyTrailOutcome } = useEventEngine();
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventVisible, setEventVisible] = useState(false);
  const [availableChoices, setAvailableChoices] = useState<EventChoice[]>([]);

  const currentZone = zone01; // For now, only Zone 01

  // Check for run end
  const isRunOver = state.dayNumber > MAX_RUN_DAYS || state.trailOver;

  /**
   * New flow: Tap node → USE_MOVE → move to node → apply trail outcome silently →
   * check for event → if event, open EventModal; if no event, briefly show trail outcome.
   */
  const handleNodePress = useCallback(
    (node: ZoneNode) => {
      // If tapping current node, show its description
      if (node.id === state.currentNodeId) {
        Alert.alert(node.name, node.description);
        return;
      }

      // Check if node is reachable
      const currentNode = currentZone.nodes.find((n) => n.id === state.currentNodeId);
      if (!currentNode || !currentNode.connections.includes(node.id)) {
        return;
      }

      // Check if trail is over
      if (isRunOver) {
        const reason = state.trailOverReason === 'hp_zero'
          ? 'Your body gave out. The Trail claimed another drifter.'
          : `Day ${MAX_RUN_DAYS} has passed. Your run through the Rustbelt Verge is over.`;
        Alert.alert('Trail Over', reason, [{ text: 'OK' }]);
        return;
      }

      // Check moves
      if (state.movesRemaining <= 0) {
        Alert.alert(
          'No Moves Remaining',
          'Your moves refresh every 24 hours. Rest up and return tomorrow — the Trail will wait.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Use move
      dispatch({ type: 'USE_MOVE' });

      // Draw trail outcome (resource changes from the move itself)
      const trailOutcome = drawTrailOutcome(state);

      // Check if trail outcome blocks movement (setback)
      if (trailOutcome.movePlayer && trailOutcome.movePlayer < 0) {
        applyTrailOutcome(trailOutcome);
        Alert.alert(
          `${getTierIcon(trailOutcome.tier)} ${trailOutcome.title}`,
          `${trailOutcome.narration}\n\nYou couldn't make it to ${node.name}. The move is lost.`,
          [{ text: 'Press On' }]
        );
        return;
      }

      // Apply trail outcome silently (resources etc)
      applyTrailOutcome(trailOutcome);

      // Move to the target node
      dispatch({ type: 'MOVE_TO_NODE', payload: node.id });

      // Check for a node event
      const event = getEventForNode(node.id);

      if (event) {
        // Open event modal — the roll animation + outcome all happen inside the modal now
        const choices = getAvailableChoices(event);
        setAvailableChoices(choices);
        setActiveEvent(event);
        setEventVisible(true);
      }
      // If no event, the trail outcome effects were already applied silently.
      // The player sees their HP/resources update in the bars.
    },
    [state, isRunOver, currentZone, dispatch, getEventForNode, getAvailableChoices, applyTrailOutcome]
  );

  /**
   * Event choice handler — performs hidden roll, applies effects, returns quality + outcome for UI.
   */
  const handleEventChoice = useCallback(
    (eventId: string, choice: EventChoice): { quality: OutcomeQuality; outcome: EventOutcome } => {
      const { quality, outcome } = rollAndApply(eventId, choice);

      // Apply the modified outcome effects
      applyOutcome(eventId, outcome);

      // Handle movePlayer
      if (outcome.movePlayer) {
        const currentNode = currentZone.nodes.find((n) => n.id === state.currentNodeId);
        if (currentNode) {
          if (outcome.movePlayer > 0 && currentNode.connections.length > 0) {
            const forwardNodes = currentNode.connections.filter(
              (id) => !state.visitedNodes.includes(id) || id !== state.currentNodeId
            );
            const nextId = forwardNodes[0] || currentNode.connections[0];
            if (nextId) dispatch({ type: 'MOVE_TO_NODE', payload: nextId });
          } else if (outcome.movePlayer < 0) {
            const backNodes = currentNode.connections.filter((id) =>
              state.visitedNodes.includes(id)
            );
            const prevId = backNodes[0];
            if (prevId) dispatch({ type: 'MOVE_TO_NODE', payload: prevId });
          }
        }
      }

      return { quality, outcome };
    },
    [rollAndApply, applyOutcome, currentZone, state.currentNodeId, state.visitedNodes, dispatch]
  );

  const handleRevive = async () => {
    Alert.alert(
      '💉 Revive Drifter',
      `Burn ${REVIVE_COST_SKR} $SKR (~$5) to revive your character with 30 HP. Your run continues from where you fell. This cannot be undone.`,
      [
        { text: 'Accept Death', style: 'cancel' },
        {
          text: `Spend ${REVIVE_COST_SKR} $SKR`,
          style: 'destructive',
          onPress: async () => {
            const success = await purchaseRevive();
            if (success) {
              dispatch({ type: 'REVIVE_PLAYER' });
              Alert.alert(
                '❤️ Revived',
                'The med-kit hisses. Adrenaline floods your veins. You gasp, cough, and sit up. 30 HP. Make it count.',
                [{ text: 'Press On' }]
              );
            } else {
              Alert.alert(
                'Insufficient $SKR',
                `You need ${REVIVE_COST_SKR} $SKR to revive. Connect your wallet and ensure you have enough tokens.`,
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleExtraMove = async () => {
    Alert.alert(
      'Extra Move',
      'In the future, this will cost SOL/SKR. For now, enjoy a free extra move!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Move',
          onPress: async () => {
            const success = await purchaseExtraMove();
            if (success) {
              dispatch({ type: 'ADD_EXTRA_MOVE' });
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper padded={false}>
      <ResourceBar />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Zone Header */}
        <View style={styles.zoneHeader}>
          <Text style={styles.zoneName}>{currentZone.name}</Text>
          <Text style={styles.zoneSubtitle}>{currentZone.subtitle}</Text>
          {/* Day progress bar */}
          <View style={styles.dayProgress}>
            <View style={styles.dayProgressBar}>
              <View
                style={[
                  styles.dayProgressFill,
                  { width: `${Math.min(100, (state.dayNumber / MAX_RUN_DAYS) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.dayProgressText}>
              Day {state.dayNumber} / {MAX_RUN_DAYS}
            </Text>
          </View>
        </View>

        {/* Zone Map */}
        <View style={styles.mapContainer}>
          <ZoneMap nodes={currentZone.nodes} onNodePress={handleNodePress} />
        </View>

        {/* Health Bars */}
        <View style={styles.healthSection}>
          <HealthBar
            value={state.playerHealth}
            max={100}
            label="Player Health"
            color={state.playerHealth <= 25 ? colors.neonRed : colors.neonGreen}
          />
          <HealthBar
            value={state.roverHealth}
            max={100}
            label="Rover Condition"
            color={state.roverHealth <= 25 ? colors.neonRed : colors.neonCyan}
          />
        </View>

        {/* Status */}
        <View style={styles.statusSection}>
          <Text style={styles.statusText}>
            Visited {state.visitedNodes.length} of {currentZone.nodes.length} nodes
          </Text>
          {state.resources.specialLoot.length > 0 && (
            <View style={styles.lootList}>
              <Text style={styles.lootHeader}>Special Loot:</Text>
              {state.resources.specialLoot.map((item, i) => (
                <Text key={i} style={styles.lootItem}>
                  ✦ {item}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Trail Over Banner */}
        {isRunOver && (
          <View style={styles.runOverBanner}>
            <Text style={styles.runOverTitle}>
              {state.trailOverReason === 'hp_zero' ? '💀 TRAIL OVER' : '🏁 RUN COMPLETE'}
            </Text>
            <Text style={styles.runOverText}>
              {state.trailOverReason === 'hp_zero'
                ? 'Your body gave out on the Rustbelt Verge. The Trail continues for those who survive.'
                : `Day ${MAX_RUN_DAYS} reached. Your run through the Rustbelt Verge is over.`}
            </Text>
            {state.trailOverReason === 'hp_zero' && (
              <View style={styles.reviveSection}>
                <View style={styles.reviveDivider} />
                <Text style={styles.reviveFlavorText}>
                  A faint pulse. The rover's emergency med-kit crackles to life.
                  For a price, you can cheat death — this time.
                </Text>
                <NeonButton
                  title={`Revive — ${REVIVE_COST_SKR} $SKR (~$5)`}
                  onPress={handleRevive}
                  variant="primary"
                  icon="💉"
                  style={styles.reviveBtn}
                />
                <Text style={styles.reviveNote}>
                  Restores 30 HP. Your run continues where you fell.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Extra Move Button */}
        {state.movesRemaining === 0 && !isRunOver && (
          <NeonButton
            title="Get Extra Move"
            onPress={handleExtraMove}
            variant="secondary"
            icon="⚡"
            style={styles.extraMoveBtn}
          />
        )}

        {/* Dev Tools */}
        {__DEV__ && (
          <View style={styles.devSection}>
            <Text style={styles.devTitle}>— Dev Tools —</Text>
            <View style={styles.devRow}>
              <NeonButton
                title="Reset Moves"
                onPress={() => dispatch({ type: 'REFRESH_MOVES' })}
                variant="ghost"
                size="sm"
              />
              <NeonButton
                title="+20 Scrap"
                onPress={() =>
                  dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: { scrap: 20 } })
                }
                variant="ghost"
                size="sm"
              />
              <NeonButton
                title="Heal"
                onPress={() => dispatch({ type: 'HEAL', payload: 50 })}
                variant="ghost"
                size="sm"
              />
            </View>
            <View style={[styles.devRow, { marginTop: spacing.xs }]}>
              <NeonButton
                title="+1 Day"
                onPress={() => dispatch({ type: 'INCREMENT_DAY' })}
                variant="ghost"
                size="sm"
              />
              <NeonButton
                title="–20 HP"
                onPress={() => dispatch({ type: 'TAKE_DAMAGE', payload: 20 })}
                variant="ghost"
                size="sm"
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Event Modal — handles narrative → roll → outcome all in one place */}
      <EventModal
        event={activeEvent}
        visible={eventVisible}
        onChoose={handleEventChoice}
        availableChoices={availableChoices}
        onDismiss={() => {
          setEventVisible(false);
          setActiveEvent(null);
          setAvailableChoices([]);
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  zoneHeader: {
    marginBottom: spacing.sm,
  },
  zoneName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  zoneSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  dayProgress: {
    marginTop: spacing.sm,
  },
  dayProgressBar: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dayProgressFill: {
    height: '100%',
    backgroundColor: colors.neonAmber,
    borderRadius: 3,
  },
  dayProgressText: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontWeight: '600',
    marginTop: 4,
  },
  mapContainer: {
    marginVertical: spacing.sm,
  },
  healthSection: {
    marginVertical: spacing.sm,
  },
  statusSection: {
    marginTop: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  lootList: {
    marginTop: spacing.sm,
  },
  lootHeader: {
    fontSize: fontSize.sm,
    color: colors.neonPurple,
    fontWeight: '600',
  },
  lootItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: 4,
  },
  runOverBanner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.neonRed + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neonRed + '30',
    alignItems: 'center',
  },
  runOverTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neonRed,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  runOverText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviveSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  reviveDivider: {
    height: 1,
    width: '60%',
    backgroundColor: colors.neonAmber + '30',
    marginVertical: spacing.md,
  },
  reviveFlavorText: {
    fontSize: fontSize.sm,
    color: colors.neonAmber,
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  reviveBtn: {
    width: '100%',
  },
  reviveNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  extraMoveBtn: {
    marginTop: spacing.lg,
  },
  devSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neonAmber + '30',
  },
  devTitle: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  devRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
});
