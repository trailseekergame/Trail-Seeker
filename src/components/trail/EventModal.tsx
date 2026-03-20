import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { GameEvent, EventChoice, EventOutcome } from '../../types';
import NeonButton from '../common/NeonButton';

interface Props {
  event: GameEvent | null;
  visible: boolean;
  onChoose: (eventId: string, choice: EventChoice) => void;
  onDismiss: () => void;
}

export default function EventModal({ event, visible, onChoose, onDismiss }: Props) {
  const [selectedOutcome, setSelectedOutcome] = useState<EventOutcome | null>(null);
  const [phase, setPhase] = useState<'choices' | 'outcome'>('choices');

  if (!event) return null;

  const handleChoice = (choice: EventChoice) => {
    setSelectedOutcome(choice.outcome);
    setPhase('outcome');
    onChoose(event.id, choice);
  };

  const handleDismiss = () => {
    setPhase('choices');
    setSelectedOutcome(null);
    onDismiss();
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'encounter':
        return '⚔️';
      case 'discovery':
        return '🔍';
      case 'trade':
        return '🤝';
      case 'hazard':
        return '⚠️';
      case 'lore':
        return '📖';
      case 'faction':
        return '🏴';
      default:
        return '❓';
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'encounter':
        return colors.neonRed;
      case 'discovery':
        return colors.neonCyan;
      case 'trade':
        return colors.neonAmber;
      case 'hazard':
        return colors.neonRed;
      case 'lore':
        return colors.neonPurple;
      case 'faction':
        return colors.neonGreen;
      default:
        return colors.textSecondary;
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
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
            {/* Narration */}
            <Text style={styles.narration}>{event.narration}</Text>

            {phase === 'choices' ? (
              <View style={styles.choices}>
                {event.choices.map((choice) => (
                  <TouchableOpacity
                    key={choice.id}
                    style={styles.choiceButton}
                    onPress={() => handleChoice(choice)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.choiceText}>{choice.text}</Text>
                    <Text style={styles.choiceArrow}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : selectedOutcome ? (
              <View style={styles.outcomeSection}>
                <View style={styles.outcomeDivider} />
                <Text style={styles.outcomeNarration}>{selectedOutcome.narration}</Text>

                {renderOutcomeChanges(selectedOutcome).length > 0 && (
                  <View style={styles.outcomeChanges}>
                    {renderOutcomeChanges(selectedOutcome).map((change, i) => (
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
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    maxHeight: '80%',
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
  choiceText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  choiceArrow: {
    fontSize: fontSize.xl,
    color: colors.neonGreen,
    marginLeft: spacing.sm,
  },
  outcomeSection: {
    marginTop: spacing.md,
  },
  outcomeDivider: {
    height: 1,
    backgroundColor: colors.neonGreen + '30',
    marginVertical: spacing.md,
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
