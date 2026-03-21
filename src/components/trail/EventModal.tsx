import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { GameEvent, EventChoice, EventOutcome, OutcomeQuality, ChoiceRisk } from '../../types';
import NeonButton from '../common/NeonButton';
import TypewriterText from '../common/TypewriterText';
import SkillCheck from './SkillCheck';

// ─── Roll Animation Phrases (cycled sequentially during roll) ───
const ROLL_PHRASE_SETS: string[][] = [
  ['Reading the Trail...', 'Signal detected...', 'Dust settles...'],
  ['Scanning ahead...', 'The rover hums...', 'Fate turns...'],
  ['Checking the wind...', 'Signal flickers...', 'Resolving...'],
];

// ─── Roll durations by risk level ───
const ROLL_DURATION: Record<ChoiceRisk, number> = {
  safe: 1200,
  moderate: 1800,
  risky: 2500,
  reckless: 3000,
};

const RISK_BAR_COLOR: Record<ChoiceRisk, string> = {
  safe: '#4A9EFF',
  moderate: colors.neonCyan,
  risky: colors.neonAmber,
  reckless: colors.neonRed,
};

interface Props {
  event: GameEvent | null;
  visible: boolean;
  onChoose: (eventId: string, choice: EventChoice) => { quality: OutcomeQuality; outcome: EventOutcome };
  availableChoices: EventChoice[];
  onDismiss: () => void;
}

type Phase = 'narrative' | 'rolling' | 'skill_check' | 'outcome';

export default function EventModal({ event, visible, onChoose, availableChoices, onDismiss }: Props) {
  const [phase, setPhase] = useState<Phase>('narrative');
  const [chosenText, setChosenText] = useState('');
  const [chosenRisk, setChosenRisk] = useState<ChoiceRisk>('moderate');
  const [outcomeQuality, setOutcomeQuality] = useState<OutcomeQuality>('NEUTRAL');
  const [resolvedOutcome, setResolvedOutcome] = useState<EventOutcome | null>(null);
  const [narrationComplete, setNarrationComplete] = useState(false);

  // Rolling animation
  const rollOpacity = useRef(new Animated.Value(0)).current;
  const rollScale = useRef(new Animated.Value(0.8)).current;
  const rollBarProgress = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;
  const [rollPhraseIndex, setRollPhraseIndex] = useState(0);
  const [rollPhrases, setRollPhrases] = useState<string[]>([]);
  const phraseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when modal opens with a new event
  useEffect(() => {
    if (visible && event) {
      setPhase('narrative');
      setChosenText('');
      setChosenRisk('moderate');
      setOutcomeQuality('NEUTRAL');
      setResolvedOutcome(null);
      setNarrationComplete(false);
      setRollPhraseIndex(0);
    }
  }, [visible, event?.id]);

  // Cleanup phrase timer
  useEffect(() => {
    return () => {
      if (phraseTimerRef.current) clearTimeout(phraseTimerRef.current);
    };
  }, []);

  if (!event) return null;

  const handleChoice = (choice: EventChoice) => {
    setChosenText(choice.text);
    const risk = choice.riskLevel || 'moderate';
    setChosenRisk(risk);

    // Pick a random phrase set and start cycling
    const phrases = ROLL_PHRASE_SETS[Math.floor(Math.random() * ROLL_PHRASE_SETS.length)];
    setRollPhrases(phrases);
    setRollPhraseIndex(0);

    // Start rolling phase
    setPhase('rolling');

    // Animate roll overlay in
    rollOpacity.setValue(0);
    rollScale.setValue(0.8);
    rollBarProgress.setValue(0);
    resultOpacity.setValue(0);
    resultSlide.setValue(30);

    Animated.parallel([
      Animated.timing(rollOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(rollScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    const duration = ROLL_DURATION[risk];

    // Animate progress bar (non-native for width interpolation)
    Animated.timing(rollBarProgress, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start();

    // Cycle through phrases
    const phraseInterval = Math.floor(duration / phrases.length);
    for (let i = 1; i < phrases.length; i++) {
      const timer = setTimeout(() => setRollPhraseIndex(i), phraseInterval * i);
      // Store only last for cleanup (simple approach)
      if (i === phrases.length - 1) phraseTimerRef.current = timer;
    }

    // After roll duration, resolve and decide next phase
    setTimeout(() => {
      const { quality, outcome } = onChoose(event.id, choice);
      setOutcomeQuality(quality);
      setResolvedOutcome(outcome);

      // Skill check only for risky/reckless
      if (risk === 'risky' || risk === 'reckless') {
        setPhase('skill_check');
      } else {
        transitionToOutcome();
      }
    }, duration);
  };

  const transitionToOutcome = useCallback(() => {
    setPhase('outcome');
    Animated.parallel([
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(resultSlide, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [resultOpacity, resultSlide]);

  const handleSkillCheckResult = (success: boolean) => {
    if (success) {
      // Upgrade quality: BAD→NEUTRAL, NEUTRAL→GOOD, GOOD stays GOOD
      setOutcomeQuality(prev => {
        if (prev === 'BAD') return 'NEUTRAL';
        if (prev === 'NEUTRAL') return 'GOOD';
        return prev;
      });
    }
    transitionToOutcome();
  };

  const handleDismiss = () => {
    setPhase('narrative');
    setChosenText('');
    setResolvedOutcome(null);
    onDismiss();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'encounter': return '\u2694\uFE0F';
      case 'discovery': return '\uD83D\uDD0D';
      case 'trade': return '\uD83E\uDD1D';
      case 'hazard': return '\u26A0\uFE0F';
      case 'lore': return '\uD83D\uDCD6';
      case 'faction': return '\uD83C\uDFF4';
      default: return '\u2753';
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
      case 'GOOD': return '\u2726';
      case 'NEUTRAL': return '\u2014';
      case 'BAD': return '\u26A0';
    }
  };

  const renderOutcomeChanges = (outcome: EventOutcome) => {
    const changes: string[] = [];
    if (outcome.resourceChanges?.scrap) {
      const v = outcome.resourceChanges.scrap;
      changes.push(v > 0 ? `+${v} \uD83D\uDD29 Scrap` : `${v} \uD83D\uDD29 Scrap`);
    }
    if (outcome.resourceChanges?.supplies) {
      const v = outcome.resourceChanges.supplies;
      changes.push(v > 0 ? `+${v} \uD83D\uDCE6 Supplies` : `${v} \uD83D\uDCE6 Supplies`);
    }
    if (outcome.damage) changes.push(`-${outcome.damage} \u2764\uFE0F Health`);
    if (outcome.heal) changes.push(`+${outcome.heal} \u2764\uFE0F Health`);
    if (outcome.addItem) changes.push(`+ ${outcome.addItem}`);
    if (outcome.unlockCodex?.length) changes.push('\uD83D\uDCD6 New codex entry');
    if (outcome.movePlayer && outcome.movePlayer > 0) changes.push('\u27A1\uFE0F Pushed forward');
    if (outcome.movePlayer && outcome.movePlayer < 0) changes.push('\u2B05\uFE0F Pushed back');
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

  const barColor = RISK_BAR_COLOR[chosenRisk];

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
            {/* ─── NARRATIVE PHASE: typewriter narration + choices ─── */}
            {phase === 'narrative' && (
              <>
                <TypewriterText
                  text={event.narration}
                  speed={30}
                  onComplete={() => setNarrationComplete(true)}
                  style={styles.narration}
                />

                {narrationComplete && (
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
                              <Text style={styles.lockedReason}>{'\uD83D\uDD12'} {lockedReason}</Text>
                            )}
                          </View>
                          {!locked && <Text style={styles.choiceArrow}>{'\u203A'}</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* ─── ROLLING PHASE: animated tension build ─── */}
            {phase === 'rolling' && (
              <Animated.View style={[styles.rollContainer, { opacity: rollOpacity, transform: [{ scale: rollScale }] }]}>
                <Text style={styles.rollDice}>{'\uD83C\uDFB2'}</Text>
                <Text style={styles.rollPhrase}>
                  {rollPhrases[rollPhraseIndex] || 'Resolving...'}
                </Text>

                {/* Progress bar */}
                <View style={styles.rollBarTrack}>
                  <Animated.View
                    style={[
                      styles.rollBarFill,
                      {
                        backgroundColor: barColor,
                        width: rollBarProgress.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>

                <RollingDots />
              </Animated.View>
            )}

            {/* ─── SKILL CHECK PHASE (risky/reckless only) ─── */}
            {phase === 'skill_check' && (
              <View style={styles.skillCheckContainer}>
                <Text style={styles.skillCheckTitle}>SKILL CHECK</Text>
                <SkillCheck
                  speed={chosenRisk === 'reckless' ? 'fast' : 'moderate'}
                  onResult={handleSkillCheckResult}
                />
              </View>
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
      <Animated.Text style={[styles.dot, { opacity: dot1 }]}>{'\u25CF'}</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot2 }]}>{'\u25CF'}</Animated.Text>
      <Animated.Text style={[styles.dot, { opacity: dot3 }]}>{'\u25CF'}</Animated.Text>
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
  rollBarTrack: {
    width: 200,
    height: 6,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  rollBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
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
  // ─── Skill Check ───
  skillCheckContainer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skillCheckTitle: {
    fontSize: fontSize.xs,
    color: colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.sm,
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
