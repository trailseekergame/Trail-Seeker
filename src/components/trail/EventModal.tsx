import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { GameEvent, EventChoice, EventOutcome, OutcomeQuality } from '../../types';
import NeonButton from '../common/NeonButton';

// ─── Roll Animation Phrases ───
const ROLL_PHRASES = [
  'Reading the Trail...',
  'Dust settles...',
  'Scanning ahead...',
  'The rover hums...',
  'Fate turns...',
  'Checking the wind...',
  'Signal flickers...',
];

interface Props {
  event: GameEvent | null;
  visible: boolean;
  onChoose: (eventId: string, choice: EventChoice) => { quality: OutcomeQuality; outcome: EventOutcome };
  availableChoices: EventChoice[];
  onDismiss: () => void;
}

type Phase = 'narrative' | 'rolling' | 'outcome';

export default function EventModal({ event, visible, onChoose, availableChoices, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('narrative');
  const [chosenText, setChosenText] = useState('');
  const [outcomeQuality, setOutcomeQuality] = useState<OutcomeQuality>('NEUTRAL');
  const [resolvedOutcome, setResolvedOutcome] = useState<EventOutcome | null>(null);

  // Rolling animation
  const rollOpacity = useRef(new Animated.Value(0)).current;
  const rollScale = useRef(new Animated.Value(0.8)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const [rollPhrase, setRollPhrase] = useState('');

  // Reset when modal opens with a new event
  useEffect(() => {
    if (visible && event) {
      setPhase('narrative');
      setChosenText('');
      setOutcomeQuality('NEUTRAL');
      setResolvedOutcome(null);
    }
  }, [visible, event?.id]);

  if (!event) return null;

  const handleChoice = (choice: EventChoice) => {
    setChosenText(choice.text);

    // Start rolling phase
    setPhase('rolling');
    setRollPhrase(ROLL_PHRASES[Math.floor(Math.random() * ROLL_PHRASES.length)]);

    // Animate roll overlay in
    rollOpacity.setValue(0);
    rollScale.setValue(0.8);
    resultOpacity.setValue(0);
    resultSlide.setValue(30);

    Animated.parallel([
      Animated.timing(rollOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(rollScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    // After brief pause, perform the hidden roll and show outcome
    setTimeout(() => {
      const { quality, outcome } = onChoose(event.id, choice);
      setOutcomeQuality(quality);
      setResolvedOutcome(outcome);
      setPhase('outcome');

      // Animate outcome appearance
      Animated.parallel([
        Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(resultSlide, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);
  };

  const handleDismiss = () => {
    setPhase('narrative');
    setChosenText('');
    setResolvedOutcome(null);
    onDismiss();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'encounter': return '⚔️';
      case 'discovery': return '🔍';
      case 'trade': return '🤝';
      case 'hazard': return '⚠️';
      case 'lore': return '📖';
      case 'faction': return '🏴';
      default: return '❓';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'encounter': return colors.neonRed;
      case 'discovery': return colors.neonCyan;
      case 'trade': return colors.neonAmber;
      case 'hazard': return colors.neonRed;
      case 'lore': return colors.neonPurple;
      case 'faction': return colors.neonGreen;
      default: return colors.textSecondary;
    }
  };

  const getQualityColor = (quality: OutcomeQuality) => {
    switch (quality) {
      case 'GOOD': return '#39FF14';
      case 'NEUTRAL': return '#E0E0E0';
      case 'BAD': return '#FF3131';
    }
  };

  const getQualityIcon = (quality: OutcomeQuality) => {
    switch (quality) {
      case 'GOOD': return '✦';
      case 'NEUTRAL': return '—';
      case 'BAD': return '⚠';
    }
  };

  const renderOutcomeChanges = (outcome: EventOutcome) => {
    const changes: string[] = [];
    if (outcome.resourceChanges?.scrap) {
      const v = outcome.resourceChanges.scrap;
      changes.push(v > 0 ? `+${v} 🔩 Scrap` : `${v} 🔩 Scrap`);
    }
    if (outcome.resourceChanges?.supplies) {
      const v = outcome.resourceChanges.supplies;
      changes.push(v > 0 ? `+${v} 📦 Supplies` : `${v} 📦 Supplies`);
    }
    if (outcome.damage) changes.push(`-${outcome.damage} ❤️ Health`);
    if (outcome.heal) changes.push(`+${outcome.heal} ❤️ Health`);
    if (outcome.addItem) changes.push(`+ ${outcome.addItem}`);
    if (outcome.unlockCodex?.length) changes.push('📖 New codex entry');
    if (outcome.movePlayer && outcome.movePlayer > 0) changes.push('➡️ Pushed forward');
    if (outcome.movePlayer && outcome.movePlayer < 0) changes.push('⬅️ Pushed back');
    return changes;
  };

  const isChoiceLocked = (choice: EventChoice) => {
    return !availableChoices.find((c) => c.id === choice.id);
  };

  const getLockedReason = (choice: EventChoice): string | null => {
    if (choice.requiresItem) return `Requires: ${choice.requiresItem}`;
    if (choice.requiresFlag) return 'Faction locked';
    if (choice.requiresMinAlignment) return 'Alignment too low';
    if (choice.requiresEquipped) return 'Requires gear';
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header — always visible */}
          <View style={styles.header}>
            <Text style={styles.categoryIcon}>{getCategoryIcon(event.category)}</Text>
            <View style={styles.headerText}>
              <Text style={[styles.category, { color: getCategoryColor(event.category) }]}>
                {event.category.toUpperCase()}
              </Text>
              <Text style={styles.title}>{event.title}</Text>
            </View>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* ─── NARRATIVE PHASE: show narration + choices ─── */}
            {phase === 'narrative' && (
              <>
                <Text style={styles.narration}>{event.narration}</Text>

                <View style={styles.choices}>
                  {event.choices.map((choice) => {
                    const locked = isChoiceLocked(choice);
                    const lockedReason = locked ? getLockedReason(choice) : null;
                    return (
                      <TouchableOpacity
                        key={choice.id}
                        style={[styles.choiceButton, locked && styles.choiceButtonLocked]}
                        onPress={() => !locked && handleChoice(choice)}
                        activeOpacity={locked ? 1 : 0.7}
                        disabled={locked}
                      >
                        <View style={styles.choiceContent}>
                          <View style={styles.choiceTopRow}>
                            <Text style={[styles.choiceText, locked && styles.choiceTextLocked]}>
                              {choice.text}
                            </Text>
                            {!locked && choice.riskLevel && choice.riskLevel !== 'moderate' && (
                              <View style={[styles.riskBadge, {
                                backgroundColor: choice.riskLevel === 'safe' ? '#4A9EFF20' : choice.riskLevel === 'risky' ? '#FFB80020' : '#FF3B5C20',
                                borderColor: choice.riskLevel === 'safe' ? '#4A9EFF' : choice.riskLevel === 'risky' ? '#FFB800' : '#FF3B5C',
                              }]}>
                                <Text style={[styles.riskBadgeText, {
                                  color: choice.riskLevel === 'safe' ? '#4A9EFF' : choice.riskLevel === 'risky' ? '#FFB800' : '#FF3B5C',
                                }]}>
                                  {choice.riskLevel === 'safe' ? 'SAFE' : choice.riskLevel === 'risky' ? 'RISKY' : 'RECKLESS'}
                                </Text>
                              </View>
                            )}
                          </View>
                          {locked && lockedReason && (
                            <Text style={styles.lockedReason}>🔒 {lockedReason}</Text>
                          )}
                        </View>
                        {!locked && <Text style={styles.choiceArrow}>›</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* ─── ROLLING PHASE: animated dice roll ─── */}
            {phase === 'rolling' && (
              <Animated.View style={[styles.rollContainer, { opacity: rollOpacity, transform: [{ scale: rollScale }] }]}>
                <Text style={styles.rollDice}>🎲</Text>
                <Text style={styles.rollPhrase}>{rollPhrase}</Text>
                <RollingDots />
              </Animated.View>
            )}

            {/* ─── OUTCOME PHASE: show result ─── */}
            {phase === 'outcome' && resolvedOutcome && (
              <Animated.View style={{ opacity: resultOpacity, transform: [{ translateY: resultSlide }] }}>
                {/* What the player chose */}
                <View style={styles.chosenBadge}>
                  <Text style={styles.chosenLabel}>You chose:</Text>
                  <Text style={styles.chosenText}>{chosenText}</Text>
                </View>

                {/* Quality badge */}
                <View style={[styles.qualityBadge, { borderColor: getQualityColor(outcomeQuality) + '40' }]}>
                  <Text style={[styles.qualityIcon, { color: getQualityColor(outcomeQuality) }]}>
                    {getQualityIcon(outcomeQuality)}
                  </Text>
                  <Text style={[styles.qualityLabel, { color: getQualityColor(outcomeQuality) }]}>
                    {outcomeQuality}
                  </Text>
                </View>

                {/* Outcome narration */}
                <Text style={styles.outcomeNarration}>{resolvedOutcome.narration}</Text>

                {/* Effect changes */}
                {renderOutcomeChanges(resolvedOutcome).length > 0 && (
                  <View style={styles.outcomeChanges}>
                    {renderOutcomeChanges(resolvedOutcome).map((change, i) => (
                      <Text
                        key={i}
                        style={[
                          styles.changeText,
                          {
                            color: change.startsWith('+')
                              ? colors.neonGreen
                              : change.startsWith('-')
                              ? colors.neonRed
                              : colors.neonCyan,
                          },
                        ]}
                      >
                        {change}
                      </Text>
                    ))}
                  </View>
                )}

                <NeonButton
                  title="Continue"
                  onPress={handleDismiss}
                  variant="primary"
                  style={styles.continueButton}
                />
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );

    const a1 = createPulse(dot1, 0);
    const a2 = createPulse(dot2, 200);
    const a3 = createPulse(dot3, 400);
    a1.start(); a2.start(); a3.start();

    return () => { a1.stop(); a2.stop(); a3.stop(); };
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
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.surfaceLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  categoryIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  category: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  body: {
    padding: spacing.lg,
  },
  narration: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  choices: {
    marginTop: spacing.lg,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  choiceButtonLocked: {
    opacity: 0.45,
    borderStyle: 'dashed',
  },
  choiceContent: {
    flex: 1,
  },
  choiceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  riskBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  choiceText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  choiceTextLocked: {
    color: colors.textMuted,
  },
  lockedReason: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    marginTop: 4,
  },
  choiceArrow: {
    fontSize: fontSize.xl,
    color: colors.neonGreen,
    marginLeft: spacing.sm,
  },
  // ─── Rolling ───
  rollContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
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
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  dot: {
    fontSize: 18,
    color: colors.neonCyan,
  },
  // ─── Outcome ───
  chosenBadge: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  chosenLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: 2,
  },
  chosenText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  qualityIcon: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  qualityLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 3,
  },
  outcomeNarration: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  outcomeChanges: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  changeText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginVertical: 3,
  },
  continueButton: {
    marginBottom: spacing.lg,
  },
});
