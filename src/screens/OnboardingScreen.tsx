import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../components/common/ScreenWrapper';
import NeonButton from '../components/common/NeonButton';
import TypewriterText from '../components/common/TypewriterText';
import { useGame } from '../context/GameContext';
import { archetypes, lastLostOptions } from '../data/backstory';
import { AVATARS } from '../data/avatars';
import { AvatarId } from '../types';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import AudioManager from '../services/audioManager';

type Step = 'wake' | 'avatar' | 'identity' | 'scans' | 'go';

const STEPS: Step[] = ['wake', 'avatar', 'identity', 'scans', 'go'];

export default function OnboardingScreen() {
  const { dispatch } = useGame();
  const [step, setStep] = useState<Step>('wake');
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>('operator_a');
  const [selectedArchetype, setSelectedArchetype] = useState<string | null>(null);
  const [selectedLost, setSelectedLost] = useState<string | null>(null);
  const [wakeTextDone, setWakeTextDone] = useState(false);
  const [scanTextDone, setScanTextDone] = useState(false);

  const handleComplete = () => {
    AudioManager.playSfx('sector_complete');
    AudioManager.vibrate('heavy');
    dispatch({ type: 'SET_PLAYER_NAME', payload: playerName || 'Drifter' });
    dispatch({ type: 'SET_AVATAR', payload: selectedAvatar });

    const archetype = archetypes.find((a) => a.id === selectedArchetype);
    const lost = lastLostOptions.find((l) => l.id === selectedLost);

    if (archetype && lost) {
      dispatch({
        type: 'SET_BACKSTORY',
        payload: {
          archetype: archetype.label,
          lastLost: lost.label,
        },
      });
    }

    dispatch({ type: 'COMPLETE_ONBOARDING' });
  };

  const currentIndex = STEPS.indexOf(step);

  // ─── STEP 1: WAKE UP ───
  const renderWake = () => (
    <View style={styles.centerContent}>
      <MaterialCommunityIcons name="access-point" size={48} color={colors.neonGreen + '60'} style={styles.wakeIcon} />

      <TypewriterText
        text="2079. The war is over. The Directorate won. You didn't."
        speed={45}
        onComplete={() => {}}
        style={styles.wakeLine1}
      />

      <View style={{ height: spacing.lg }} />

      <TypewriterText
        text={'You wake in a gutted waystation with no ID and no clearance.\nA rover idles outside. Unlicensed. Unregistered.\nThe map on the dash is half-corrupted — but it shows sectors\nthe Directorate says don\'t exist anymore.'}
        speed={30}
        onComplete={() => setWakeTextDone(true)}
        style={styles.wakeBody}
      />

      {wakeTextDone && (
        <NeonButton
          title="Get up."
          onPress={() => { AudioManager.playSfx('ui_confirm'); setStep('avatar'); }}
          variant="primary"
          size="lg"
          style={styles.wakeBtn}
        />
      )}
    </View>
  );

  // ─── STEP 2: AVATAR SELECTION ───
  const renderAvatar = () => (
    <View style={styles.centerContent}>
      <Text style={styles.avatarPrompt}>Choose your operator.</Text>
      <Text style={styles.avatarHint}>Cosmetic only. Change anytime in Settings.</Text>

      <View style={styles.avatarRow}>
        {(Object.keys(AVATARS) as AvatarId[]).map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => setSelectedAvatar(id)}
            style={[
              styles.avatarCard,
              selectedAvatar === id && styles.avatarCardSelected,
            ]}
            activeOpacity={0.8}
          >
            <Image
              source={AVATARS[id].image}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </View>

      <NeonButton
        title="This one."
        onPress={() => setStep('identity')}
        variant="primary"
        size="lg"
        style={styles.avatarBtn}
      />
    </View>
  );

  // ─── STEP 3: IDENTITY (name + archetype + lost — one screen) ───
  const renderIdentity = () => (
    <ScrollView style={styles.scrollFlex} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionLabel}>TRAIL NAME</Text>
      <TextInput
        style={styles.textInput}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="What do they call you?"
        placeholderTextColor={colors.textMuted}
        maxLength={24}
        autoFocus
      />

      <Text style={[styles.sectionLabel, { marginTop: spacing.xl }]}>BEFORE THE TRAIL</Text>
      <Text style={styles.sectionHint}>Who were you?</Text>
      {archetypes.map((arch) => (
        <TouchableOpacity
          key={arch.id}
          onPress={() => setSelectedArchetype(arch.id)}
          style={[styles.optionCard, selectedArchetype === arch.id && styles.optionCardSelected]}
        >
          <Text style={styles.optionLabel}>{arch.label}</Text>
          <Text style={styles.optionDesc}>{arch.description}</Text>
          {selectedArchetype === arch.id && (
            <Text style={styles.flavorText}>{arch.flavorText}</Text>
          )}
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>WHAT YOU LOST</Text>
      {lastLostOptions.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          onPress={() => setSelectedLost(opt.id)}
          style={[styles.optionCard, selectedLost === opt.id && styles.optionCardSelected]}
        >
          <Text style={styles.optionLabel}>{opt.label}</Text>
          <Text style={styles.optionDesc}>{opt.description}</Text>
          {selectedLost === opt.id && (
            <Text style={styles.flavorText}>{opt.flavorText}</Text>
          )}
        </TouchableOpacity>
      ))}

      <NeonButton
        title="This is me."
        onPress={() => setStep('scans')}
        disabled={!playerName.trim() || !selectedArchetype || !selectedLost}
        variant="primary"
        size="lg"
        style={styles.identityBtn}
      />
    </ScrollView>
  );

  // ─── STEP 3: WHAT SCANS ARE ───
  const renderScans = () => (
    <View style={styles.centerContent}>
      <MaterialCommunityIcons name="radar" size={56} color={colors.neonCyan} style={styles.scanIcon} />

      <Text style={styles.scanTitle}>Seeker Scans</Text>

      <TypewriterText
        text={'Your rover runs dark scans on Directorate-controlled sectors — pulling signal from wreckage they\'ve marked as theirs.\n\nBuried caches. Pre-collapse tech. Things nobody was supposed to find.\nEach day you get a handful of Scans. That\'s your window.'}
        speed={25}
        onComplete={() => setScanTextDone(true)}
        style={styles.scanBody}
      />

      {scanTextDone && (
        <View style={styles.scanTiers}>
          <View style={styles.tierRow}>
            <View style={[styles.tierDot, { backgroundColor: '#4A9EFF' }]} />
            <View style={styles.tierInfo}>
              <Text style={[styles.tierName, { color: '#4A9EFF' }]}>Scout</Text>
              <Text style={styles.tierDesc}>Surface sweep. Low yield, low risk.</Text>
            </View>
          </View>
          <View style={styles.tierRow}>
            <View style={[styles.tierDot, { backgroundColor: colors.neonGreen }]} />
            <View style={styles.tierInfo}>
              <Text style={[styles.tierName, { color: colors.neonGreen }]}>Seeker</Text>
              <Text style={styles.tierDesc}>Dig deeper. Better signal, real exposure.</Text>
            </View>
          </View>
          <View style={styles.tierRow}>
            <View style={[styles.tierDot, { backgroundColor: colors.neonRed }]} />
            <View style={styles.tierInfo}>
              <Text style={[styles.tierName, { color: colors.neonRed }]}>Gambit</Text>
              <Text style={styles.tierDesc}>Burn the scan for the best signal or nothing.</Text>
            </View>
          </View>
        </View>
      )}

      {scanTextDone && (
        <NeonButton
          title="Got it."
          onPress={() => setStep('go')}
          variant="primary"
          size="lg"
          style={styles.scanBtn}
        />
      )}
    </View>
  );

  // ─── STEP 4: GO ───
  const renderGo = () => {
    const archetype = archetypes.find((a) => a.id === selectedArchetype);

    return (
      <View style={styles.centerContent}>
        <Image
          source={AVATARS[selectedAvatar].image}
          style={styles.goAvatar}
          resizeMode="cover"
        />
        <Text style={styles.goName}>{playerName || 'Drifter'}</Text>
        {archetype && (
          <Text style={styles.goArchetype}>{archetype.label}</Text>
        )}

        <View style={styles.goDivider} />

        <Text style={styles.goText}>
          The Directorate locked down the good sectors.{'\n'}
          The Free Bands fight over what's left.{'\n'}
          You work the gaps between both.
        </Text>

        <Text style={styles.goKicker}>
          Time to run your first job.
        </Text>

        <NeonButton
          title="Start the run"
          onPress={handleComplete}
          variant="primary"
          size="lg"
          icon="radar"
          style={styles.goBtn}
        />
      </View>
    );
  };

  return (
    <ScreenWrapper>
      {/* Progress bar */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              step === s && styles.progressDotActive,
              currentIndex > i && styles.progressDotComplete,
            ]}
          />
        ))}
      </View>

      {step === 'wake' && renderWake()}
      {step === 'avatar' && renderAvatar()}
      {step === 'identity' && renderIdentity()}
      {step === 'scans' && renderScans()}
      {step === 'go' && renderGo()}
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

  // ─── Wake ───
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  wakeIcon: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  wakeLine1: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 30,
  },
  wakeBody: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  wakeBtn: {
    marginTop: spacing.xxl,
    alignSelf: 'center',
    width: 200,
  },

  // ─── Identity ───
  scrollFlex: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  sectionHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
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
  identityBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },

  // ─── Scans ───
  scanIcon: {
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  scanTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.neonCyan,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scanBody: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  scanTiers: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  tierDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  tierDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  scanBtn: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    width: 200,
  },

  // ─── Avatar ───
  avatarPrompt: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  avatarHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  avatarCard: {
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    width: 140,
    height: 200,
  },
  avatarCardSelected: {
    borderColor: colors.neonGreen,
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarBtn: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    width: 200,
  },

  // ─── Go ───
  goAvatar: {
    width: 100,
    height: 140,
    borderRadius: borderRadius.md,
    alignSelf: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
  },
  goName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.neonGreen,
    textAlign: 'center',
  },
  goArchetype: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  goDivider: {
    height: 1,
    backgroundColor: colors.surfaceLight,
    width: '60%',
    alignSelf: 'center',
    marginVertical: spacing.xl,
  },
  goText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  goKicker: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  goBtn: {
    alignSelf: 'center',
    width: 240,
    marginBottom: spacing.xl,
  },
});
