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
import { ZoneNode, EventChoice, GameEvent } from '../../types';
import zone01 from '../../data/zone01';
import { purchaseExtraMove } from '../../services/solana';
import { colors, spacing, fontSize } from '../../theme';

export default function TrailScreen() {
  const { state, dispatch } = useGame();
  const { getEventForNode, applyOutcome } = useEventEngine();
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventVisible, setEventVisible] = useState(false);

  const currentZone = zone01; // For now, only Zone 01

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

      // Check moves
      if (state.movesRemaining <= 0) {
        Alert.alert(
          'No Moves Remaining',
          'Your moves refresh every 24 hours. Rest up and return tomorrow — the Trail will wait.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Move player
      dispatch({ type: 'USE_MOVE' });
      dispatch({ type: 'MOVE_TO_NODE', payload: node.id });

      // Trigger event
      const event = getEventForNode(node.id);
      if (event) {
        setActiveEvent(event);
        setEventVisible(true);
      }
    },
    [state.currentNodeId, state.movesRemaining, currentZone, dispatch, getEventForNode]
  );

  const handleEventChoice = useCallback(
    (eventId: string, choice: EventChoice) => {
      applyOutcome(eventId, choice.outcome);

      // Handle movePlayer
      if (choice.outcome.movePlayer) {
        const currentNode = currentZone.nodes.find((n) => n.id === state.currentNodeId);
        if (currentNode) {
          if (choice.outcome.movePlayer > 0 && currentNode.connections.length > 0) {
            // Move forward to next connected node
            const forwardNodes = currentNode.connections.filter(
              (id) => !state.visitedNodes.includes(id) || id !== state.currentNodeId
            );
            const nextId = forwardNodes[0] || currentNode.connections[0];
            if (nextId) dispatch({ type: 'MOVE_TO_NODE', payload: nextId });
          } else if (choice.outcome.movePlayer < 0) {
            // Move back to a visited connected node
            const backNodes = currentNode.connections.filter((id) =>
              state.visitedNodes.includes(id)
            );
            const prevId = backNodes[0];
            if (prevId) dispatch({ type: 'MOVE_TO_NODE', payload: prevId });
          }
        }
      }
    },
    [applyOutcome, currentZone, state.currentNodeId, state.visitedNodes, dispatch]
  );

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
            color={colors.neonGreen}
          />
          <HealthBar
            value={state.roverHealth}
            max={100}
            label="Rover Condition"
            color={colors.neonCyan}
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

        {/* Extra Move Button */}
        {state.movesRemaining === 0 && (
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
          </View>
        )}
      </ScrollView>

      {/* Event Modal */}
      <EventModal
        event={activeEvent}
        visible={eventVisible}
        onChoose={handleEventChoice}
        onDismiss={() => {
          setEventVisible(false);
          setActiveEvent(null);
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
