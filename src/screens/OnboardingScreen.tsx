import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import ScreenWrapper from '../components/common/ScreenWrapper';
import NeonButton from '../components/common/NeonButton';
import { useGame } from '../context/GameContext';
import { archetypes, lastLostOptions } from '../data/backstory';
import { colors, spacing, fontSize, borderRadius } from '../theme';

type Step = 'name' | 'archetype' | 'lost' | 'confirm';

export default function OnboardingScreen() {
  const { state, dispatch } = useGame();
  const [step, setStep] = useState<Step>('name');
  const [playerName, setPlayerName] = useState(state.playerName);
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedLost, setSelectedLost] = useState<string | null>(null);
  const [customNote, setCustomNote] = useState('');

  const handleComplete = () => {
    dispatch({ type: 'SET_PLAYER_NAME', payload: playerName || 'Drifter' });

    const archetype = archetypes.find((a) => a.id === selectedArchetype);
    const lost = lastLostOptions.find((l) => l.id === selectedLost);

    if (archetype && lost) {
      dispatch({
        type: 'SET_BACKSTORY',
        payload: {
          archetype: archetype.label,
          lastLost: lost.label,
          customNote: customNote || undefined,
        },
      });
    }

    dispatch({ type: 'COMPLETE_ONBOARDING' });
  };

  const renderNameStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.prompt}>What do they call you on the Trail?</Text>
      <TextInput
        style={styles.textInput}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Enter your name..."
        placeholderTextColor={colors.textMuted}
        maxLength={24}
        autoFocus
      />
      <NeonButton
        title="Continue"
        onPress={() => setStep('archetype')}
        disabled={!playerName.trim()}
        style={styles.continueBtn}
      />
    </View>
  );

  const renderArchetypeStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.prompt}>Before the Trail, I was...</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {archetypes.map((arch) => (
          <TouchableOpacity
            key={arch.id}
            onPress={() => setSelectedArchetype(arch.id)}
            style={[
              styles.optionCard,
              selectedArchetype === arch.id && styles.optionCardSelected,
            ]}
          >
            <Text style={styles.optionLabel}>{arch.label}</Text>
            <Text style={styles.optionDesc}>{arch.description}</Text>
            {selectedArchetype === arch.id && (
              <Text style={styles.flavorText}>{arch.flavorText}</Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <NeonButton
        title="Continue"
        onPress={() => setStep('lost')}
        disabled={!selectedArchetype}
        style={styles.continueBtn}
      />
    </View>
  );

  const renderLostStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.prompt}>The last thing I lost was...</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {lastLostOptions.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            onPress={() => setSelectedLost(opt.id)}
            style={[
              styles.optionCard,
              selectedLost === opt.id && styles.optionCardSelected,
            ]}
          >
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.optionDesc}>{opt.description}</Text>
            {selectedLost === opt.id && (
              <Text style={styles.flavorText}>{opt.flavorText}</Text>
            )}
          </TouchableOpacity>
        ))}

        <Text style={styles.notePrompt}>Anything else? (optional)</Text>
        <TextInput
          style={styles.noteInput}
          value={customNote}
          onChangeText={setCustomNote}
          placeholder="A memory, a name, a reason..."
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={200}
        />
      </ScrollView>
      <NeonButton
        title="Continue"
        onPress={() => setStep('confirm')}
        disabled={!selectedLost}
        style={styles.continueBtn}
      />
    </View>
  );

  const renderConfirmStep = () => {
    const archetype = archetypes.find((a) => a.id === selectedArchetype);
    const lost = lastLostOptions.find((l) => l.id === selectedLost);

    return (
      <View style={styles.stepContent}>
        <Text style={styles.prompt}>Your story begins.</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryName}>{playerName}</Text>
          <Text style={styles.summaryLine}>
            Before the Trail, you were {archetype?.label.toLowerCase()}.
          </Text>
          <Text style={styles.summaryLine}>
            The last thing you lost was {lost?.label.toLowerCase()}.
          </Text>
          {archetype && (
            <Text style={styles.summaryFlavor}>{archetype.flavorText}</Text>
          )}
          {lost && <Text style={styles.summaryFlavor}>{lost.flavorText}</Text>}
          {customNote ? (
            <Text style={styles.summaryNote}>"{customNote}"</Text>
          ) : null}
        </View>

        <Text style={styles.introText}>
          You wake in a gutted waystation diner. Outside, the haze glows acid-green.
          Your rover hums to life. The map flickers — corrupted, but enough to show
          the road ahead.{'\n\n'}
          The Trail calls. Three moves per day. Make them count.
        </Text>

        <NeonButton
          title="Begin the Trail"
          onPress={handleComplete}
          variant="primary"
          size="lg"
          icon="▸"
          style={styles.beginBtn}
        />
      </View>
    );
  };

  return (
    <ScreenWrapper>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {['name', 'archetype', 'lost', 'confirm'].map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              ['name', 'archetype', 'lost', 'confirm'].indexOf(step) > i &&
                styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {step === 'name' && renderNameStep()}
      {step === 'archetype' && renderArchetypeStep()}
      {step === 'lost' && renderLostStep()}
      {step === 'confirm' && renderConfirmStep()}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: colors.neonGreen,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: colors.neonCyan,
  },
  stepContent: {
    flex: 1,
  },
  prompt: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionCardSelected: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.neonGreen + '10',
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  flavorText: {
    fontSize: fontSize.sm,
    color: colors.neonGreen,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neonGreen + '20',
    paddingTop: spacing.sm,
  },
  notePrompt: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  continueBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neonGreen + '30',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryName: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.neonGreen,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  summaryLine: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryFlavor: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  summaryNote: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
  },
  introText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.lg,
  },
  beginBtn: {
    marginBottom: spacing.xl,
  },
});
