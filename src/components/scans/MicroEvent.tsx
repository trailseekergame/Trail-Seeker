import React from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import NeonButton from '../common/NeonButton';

export type MicroEventEffect = 'reveal_tile' | 'shield_next' | 'boost_next';

export interface MicroEventData {
  title: string;
  description: string;
  buttonText: string;
  effect: MicroEventEffect;
  icon: string;
}

const EVENT_POOL: MicroEventData[] = [
  {
    title: 'Signal Bounce',
    description: 'The signal bounced. An adjacent tile just lit up.',
    buttonText: 'Lock it in',
    effect: 'reveal_tile',
    icon: 'map-marker-radius',
  },
  {
    title: 'Clean Corridor',
    description: "Your next scan can't whiff. The signal corridor is open.",
    buttonText: 'Copy that',
    effect: 'shield_next',
    icon: 'shield-check',
  },
  {
    title: 'Residual Trace',
    description: 'Faint trace in the noise. Next scan reads one tier higher.',
    buttonText: 'Riding it',
    effect: 'boost_next',
    icon: 'arrow-up-bold-circle',
  },
];

export function rollMicroEvent(): MicroEventData | null {
  if (Math.random() >= 0.4) return null;
  return EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
}

interface Props {
  visible: boolean;
  event: MicroEventData | null;
  onDismiss: (effect: MicroEventEffect) => void;
}

export default function MicroEvent({ visible, event, onDismiss }: Props) {
  if (!event) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconRow}>
            <MaterialCommunityIcons name={event.icon as any} size={36} color={colors.neonAmber} />
          </View>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.description}>{event.description}</Text>
          <NeonButton
            title={event.buttonText}
            onPress={() => onDismiss(event.effect)}
            variant="primary"
            size="lg"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neonAmber + '40',
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconRow: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.neonAmber + '60',
    backgroundColor: colors.neonAmber + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neonAmber,
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
});
