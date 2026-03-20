import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Animated, Easing, Modal } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import ResourceBar from '../../components/common/ResourceBar';
import ZoneMap from '../../components/trail/ZoneMap';
import EventModal from '../../components/trail/EventModal';
import NeonButton from '../../components/common/NeonButton';
import HealthBar from '../../components/common/HealthBar';
import { useGame } from '../../context/GameContext';
import { useEventEngine } from '../../hooks/useEventEngine';
import { ZoneNode, EventChoice, GameEvent, TrailOutcome, MAX_RUN_DAYS } from '../../types';
import zone01 from '../../data/zone01';
import { drawTrailOutcome, getTierColor, getTierIcon } from '../../systems/trailOutcomes';
import { purchaseExtraMove } from '../../services/solana';
import { colors, spacing, fontSize } from '../../theme';

// ─── Roll Animation Phrases ───
const ROLL_PHRASES = [
  'Reading the Trail...',
  'Dust settles...',
  'Scanning ahead...',
  'The rover hums...',
  'Rolling the dice...',
  'Fate turns...',
  'Checking the wind...',
  'Signal flickers...',
];

export default function TrailScreen() {
  const { state, dispatch } = useGame();
  const { getEventForNode, applyOutcome, applyTrailOutcome } = useEventEngine();
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  const [eventVisible, setEventVisible] = useState(false);

  // Roll animation state
  const [isRolling, setIsRolling] = useState(false);
  const [rollPhrase, setRollPhrase] = useState('');
  const [rollResult, setRollResult] = useState<TrailOutcome | null>(null);
  const [showResult, setShowResult] = useState(false);
  const rollOpacity = useRef(new Animated.Value(0)).current;
  const rollScale = useRef(new Animated.Value(0.8)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const pendingNodeRef = useRef<ZoneNode | null>(null);

  const currentZone = zone01; // For now, only Zone 01

  // Check for run end
  const isRunOver = state.dayNumber > MAX_RUN_DAYS;

  /**
   * Animate the "Rolling the Trail..." sequence, then resolve the outcome.
   */
  const startRollSequence = useCallback(
    (node: ZoneNode) => {
      pendingNodeRef.current = node;

      // Pick a random phrase
      setRollPhrase(ROLL_PHRASES[Math.floor(Math.random() * ROLL_PHRASES.length)]);
      setShowResult(false);
      setRollResult(null);
      setIsRolling(true);

      // Fade-in the roll overlay
      rollOpacity.setValue(0);
      rollScale.setValue(0.8);
      resultOpacity.setValue(0);
      resultSlide.setValue(30);

      Animated.parallel([
        Animated.timing(rollOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(rollScale, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // After a brief pause, draw the outcome and reveal it
      setTimeout(() => {
        const outcome = drawTrailOutcome(state);
        setRollResult(outcome);
        setShowResult(true);

        // Animate result appearance
        Animated.parallel([
          Animated.timing(resultOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(resultSlide, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, 900);
    },
    [state, rollOpacity, rollScale, resultOpacity, resultSlide]
  );

  /**
   * Player dismisses the roll result — apply effects, move, and check for events.
   */
  const resolveRoll = useCallback(() => {
    const outcome = rollResult;
    const node = pendingNodeRef.current;
    if (!outcome || !node) return;

    // Close the roll overlay
    setIsRolling(false);
    setRollResult(null);
    setShowResult(false);

    // Apply the trail outcome effects
    applyTrailOutcome(outcome);

    // Check if the outcome is a setback that blocks forward progress
    if (outcome.movePlayer && outcome.movePlayer < 0) {
      Alert.alert(
        `${getTierIcon(outcome.tier)} ${outcome.title}`,
        `${outcome.narration}\n\nYou couldn't make it to ${node.name}. The move is lost.`,
        [{ text: 'Press On' }]
      );
      return;
    }

    // Move to the target node
    dispatch({ type: 'MOVE_TO_NODE', payload: node.id });

    // Check for a node event after the outcome
    const event = getEventForNode(node.id);

    if (outcome.triggerEvent && event) {
      Alert.alert(
        `${getTierIcon(outcome.tier)} ${outcome.title}`,
        outcome.narration + (outcome.addItem ? `\n\n+ Found: ${outcome.addItem}` : ''),
        [{
          text: 'Something Ahead...',
          onPress: () => {
            setActiveEvent(event);
            setEventVisible(true);
          },
        }]
      );
    } else if (event) {
      // Show outcome briefly, then open event
      Alert.alert(
        `${getTierIcon(outcome.tier)} ${outcome.title}`,
        outcome.narration + (outcome.addItem ? `\n\n+ Found: ${outcome.addItem}` : ''),
        [{
          text: 'Continue',
          onPress: () => {
            setActiveEvent(event);
            setEventVisible(true);
          },
        }]
      );
    } else {
      // No node event — just show the outcome
      const lootText = outcome.addItem ? `\n\n+ Found: ${outcome.addItem}` : '';
      Alert.alert(
        `${getTierIcon(outcome.tier)} ${outcome.title}`,
        outcome.narration + lootText,
        [{ text: 'OK' }]
      );
    }
  }, [rollResult, dispatch, getEventForNode, applyTrailOutcome]);

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

      // Check if run is over
      if (isRunOver) {
        Alert.alert(
          'Run Complete',
          `Day ${MAX_RUN_DAYS} has passed. Your run through the Rustbelt Verge is over. Check your score in the Arcade tab.`,
          [{ text: 'OK' }]
        );
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

      // Use move and start the roll animation
      dispatch({ type: 'USE_MOVE' });
      startRollSequence(node);
    },
    [state.currentNodeId, state.movesRemaining, isRunOver, currentZone, dispatch, startRollSequence]
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

        {/* Run Complete Banner */}
        {isRunOver && (
          <View style={styles.runOverBanner}>
            <Text style={styles.runOverText}>
              RUN COMPLETE — Day {MAX_RUN_DAYS} reached.
            </Text>
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
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── Roll Overlay ─── */}
      <Modal visible={isRolling} transparent animationType="none">
        <Animated.View style={[styles.rollOverlay, { opacity: rollOpacity }]}>
          <Animated.View style={[styles.rollBox, { transform: [{ scale: rollScale }] }]}>
            {!showResult ? (
              <>
                {/* Rolling phase */}
                <Text style={styles.rollDice}>🎲</Text>
                <Text style={styles.rollPhrase}>{rollPhrase}</Text>
                <View style={styles.rollDots}>
                  <RollingDots />
                </View>
              </>
            ) : rollResult ? (
              <>
                {/* Result phase */}
                <Animated.View
                  style={{
                    opacity: resultOpacity,
                    transform: [{ translateY: resultSlide }],
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={[
                      styles.rollTierIcon,
                      { color: getTierColor(rollResult.tier) },
                    ]}
                  >
                    {getTierIcon(rollResult.tier)}
                  </Text>
                  <Text
                    style={[
                      styles.rollTierLabel,
                      { color: getTierColor(rollResult.tier) },
                    ]}
                  >
                    {rollResult.tier.toUpperCase()}
                  </Text>
                  <Text style={styles.rollTitle}>{rollResult.title}</Text>
                  <Text style={styles.rollNarration}>{rollResult.narration}</Text>
                  {rollResult.addItem && (
                    <Text style={styles.rollLoot}>+ Found: {rollResult.addItem}</Text>
                  )}
                  <NeonButton
                    title="Continue"
                    onPress={resolveRoll}
                    variant="primary"
                    style={styles.rollContinue}
                  />
                </Animated.View>
              </>
            ) : null}
          </Animated.View>
        </Animated.View>
      </Modal>

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

/**
 * Simple animated dots component for the rolling state.
 */
function RollingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createPulse(dot1, 0);
    const a2 = createPulse(dot2, 200);
    const a3 = createPulse(dot3, 400);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dot, { opacity: dot1 }]}>●</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2 }]}>●</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3 }]}>●</Animated.Text>
    </View>
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
    backgroundColor: colors.neonAmber + '15',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neonAmber + '40',
    alignItems: 'center',
  },
  runOverText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neonAmber,
    letterSpacing: 1,
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
  // ─── Roll Overlay Styles ───
  rollOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  rollBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  rollDice: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  rollPhrase: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  rollDots: {
    marginTop: spacing.md,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    fontSize: 18,
    color: colors.neonCyan,
  },
  rollTierIcon: {
    fontSize: 40,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  rollTierLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  rollTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  rollNarration: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  rollLoot: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.neonGreen,
    marginBottom: spacing.md,
  },
  rollContinue: {
    width: 180,
  },
});
