import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../components/common/ScreenWrapper';
import NeonButton from '../components/common/NeonButton';
import TypewriterText from '../components/common/TypewriterText';
import { useGame } from '../context/GameContext';
import { colors, spacing, fontSize, fontMono } from '../theme';
import AudioManager from '../services/audioManager';

// ─── Types ───

type Step = 'boot' | 'howtoplay' | 'callsign' | 'origin' | 'rig' | 'avatar' | 'confirm';

const STEPS: Step[] = ['boot', 'howtoplay', 'callsign', 'origin', 'rig', 'avatar', 'confirm'];

const AVATAR_OPTIONS = [
  { id: 'operator_a' as const, label: 'OPERATOR A', desc: 'Relay Tech build. Lean, fast, cyan optics.', image: require('../assets/characters/operator_a.png') },
  { id: 'operator_b' as const, label: 'OPERATOR B', desc: 'Wastes Drifter build. Heavy, armored, amber visor.', image: require('../assets/characters/operator_b.png') },
];

// ─── Random Callsign Generator ───

const CALLSIGN_PREFIXES = [
  'Ghost', 'Rust', 'Drift', 'Burn', 'Hollow', 'Wraith', 'Slag',
  'Flint', 'Shade', 'Ember', 'Dust', 'Grit', 'Void', 'Thorn',
  'Null', 'Glitch', 'Shard', 'Scrap', 'Ash', 'Bolt',
];

const CALLSIGN_SUFFIXES = [
  'Runner', 'Walker', 'Seeker', 'Drifter', 'Hound', 'Hawk',
  'Fox', 'Rat', 'Wolf', 'Jack', 'Eye', 'Hand', 'Blade', 'Wire',
  'Fang', 'Bone', 'Steel', 'Glass', 'Root', 'Stone',
];

function generateCallsign(): string {
  const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
  const suffix = CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
  return `${prefix}${suffix}`;
}

// ─── Origins (simplified from 6 archetypes + 5 losses → 3 combined) ───

interface Origin {
  id: string;
  label: string;
  tagline: string;
  icon: string;
  backstoryArchetype: string;
  backstoryLost: string;
}

const ORIGINS: Origin[] = [
  {
    id: 'ex-dir',
    label: 'Ex-Directorate',
    tagline: 'You maintained the machine. Then you saw what it was maintaining.',
    icon: 'shield-account',
    backstoryArchetype: 'Ex-Directorate Tech',
    backstoryLost: 'Walked out of a corridor and never went back',
  },
  {
    id: 'drifter',
    label: 'Wastes Drifter',
    tagline: 'Born outside. Never processed. Never will be.',
    icon: 'road-variant',
    backstoryArchetype: 'Wastes Drifter',
    backstoryLost: 'Never had a corridor to leave',
  },
  {
    id: 'relay',
    label: 'Relay Tech',
    tagline: 'Kept the old signal towers humming. Now you read what comes through them.',
    icon: 'satellite-uplink',
    backstoryArchetype: 'Relay Tech',
    backstoryLost: 'The last tower went dark and took everything with it',
  },
];

// ─── Accent Color Picker ───

const ACCENT_COLORS = [
  { id: 'green', hex: '#00E89C', label: 'Phosphor' },
  { id: 'cyan', hex: '#00C4EE', label: 'Ice' },
  { id: 'amber', hex: '#E8A800', label: 'Amber' },
  { id: 'red', hex: '#E8354F', label: 'Burn' },
  { id: 'purple', hex: '#A040E8', label: 'Void' },
];

// ─── Boot Lines ───

const BOOT_LINES = [
  '> SEEKER RIG v2.4.1 — BOOTLOADER',
  '> SCANNING OPERATOR PROFILE...',
  '> WARNING: Memory banks corrupted. Identity data unrecoverable.',
  '> Last known position: UNKNOWN',
  '> Directorate network status: HOSTILE',
  '> Free Band relay: 1 signal detected',
  '> RIG STATUS: Functional. Minimal supplies.',
  '',
  '> You are alone. You are outside the system.',
  '> Begin operator registration to restore rig access.',
];

// ─── Component ───

export default function OnboardingScreen() {
  const { dispatch } = useGame();

  // Step state
  const [step, setStep] = useState<Step>('boot');
  const [selectedAvatar, setSelectedAvatar] = useState<'operator_a' | 'operator_b'>('operator_a');
  const [transitioning, setTransitioning] = useState(false);

  // Boot state
  const [bootLine, setBootLine] = useState(0);
  const [bootDone, setBootDone] = useState(false);

  // Callsign state
  const [callsign, setCallsign] = useState(generateCallsign);
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  // Origin state
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  // Rig state (accent color)
  const [selectedColor, setSelectedColor] = useState('green');

  // Transition animation
  const transitionAnim = useRef(new Animated.Value(0)).current;

  // ─── Boot Sequence ───

  useEffect(() => {
    if (step !== 'boot') return;
    if (bootLine >= BOOT_LINES.length) {
      setBootDone(true);
      AudioManager.playSfx('ui_confirm');
      AudioManager.vibrate('medium');
      return;
    }

    const delay = BOOT_LINES[bootLine] === '' ? 200 : 80 + Math.random() * 120;
    const timer = setTimeout(() => {
      AudioManager.playSfx('ui_tap');
      setBootLine((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [step, bootLine]);

  // ─── Step Transition ───

  const goToStep = useCallback(
    (next: Step) => {
      if (transitioning) return;
      setTransitioning(true);
      AudioManager.playSfx('ui_confirm');
      AudioManager.vibrate('light');

      transitionAnim.setValue(0);
      Animated.timing(transitionAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }).start(() => {
        setStep(next);
        setTransitioning(false);
      });
    },
    [transitioning, transitionAnim],
  );

  // ─── Reroll Callsign ───

  const reroll = useCallback(() => {
    AudioManager.playSfx('ui_tap');
    AudioManager.vibrate('light');
    setCallsign(generateCallsign());
  }, []);

  // ─── Complete Onboarding ───

  const handleComplete = useCallback(() => {
    const name = useCustom ? (customName.trim() || 'Drifter') : callsign;
    const origin = ORIGINS.find((o) => o.id === selectedOrigin);
    const accent = ACCENT_COLORS.find((c) => c.id === selectedColor);

    AudioManager.playSfx('sector_complete');
    AudioManager.vibrate('heavy');

    dispatch({ type: 'SET_PLAYER_NAME', payload: name });
    dispatch({ type: 'SET_AVATAR', payload: selectedAvatar });

    if (origin) {
      dispatch({
        type: 'SET_BACKSTORY',
        payload: {
          archetype: origin.backstoryArchetype,
          lastLost: origin.backstoryLost,
        },
      });
    }

    if (accent) {
      dispatch({ type: 'SET_ACCENT_COLOR', payload: accent.hex });
    }

    dispatch({ type: 'COMPLETE_ONBOARDING' });
  }, [useCustom, customName, callsign, selectedOrigin, selectedColor, dispatch]);

  // ─── Current step index for progress bar ───
  const currentIndex = STEPS.indexOf(step);

  // ─── Transition Bar Overlay ───

  const renderTransition = () => {
    if (!transitioning) return null;

    const barWidth = transitionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.transitionOverlay}>
        <View style={styles.transitionBarTrack}>
          <Animated.View
            style={[
              styles.transitionBarFill,
              { width: barWidth, backgroundColor: ACCENT_COLORS.find(c => c.id === selectedColor)?.hex || colors.neonGreen },
            ]}
          />
        </View>
        <Text style={styles.transitionLabel}>LOADING...</Text>
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // STEP 1: BOOT
  // ═══════════════════════════════════════════

  const renderBoot = () => (
    <View style={styles.bootContainer}>
      <Text style={styles.bootHeader}>{'/// TRAIL SEEKER TERMINAL v2.079 ///'}</Text>
      <View style={styles.bootDivider} />

      <View style={styles.bootLines}>
        {BOOT_LINES.slice(0, bootLine).map((line, i) => (
          <Text
            key={i}
            style={[
              styles.bootLine,
              line.includes('NOT FOUND') && { color: colors.neonRed },
              line.includes('JAMMED') && { color: colors.neonAmber },
              line.includes('OFFLINE') && { color: colors.neonAmber },
              line.includes('FOUND') && !line.includes('NOT') && { color: colors.neonGreen },
              line.includes('OK') && { color: colors.neonGreen },
              line.includes('WARNING') && { color: colors.neonRed },
              line.includes('READY') && { color: colors.neonGreen },
            ]}
          >
            {line}
          </Text>
        ))}
        {!bootDone && <Text style={styles.bootCursor}>{'\u2588'}</Text>}
      </View>

      {bootDone && (
        <NeonButton
          title="> CONTINUE"
          onPress={() => goToStep('howtoplay')}
          variant="primary"
          size="lg"
          style={styles.bootBtn}
        />
      )}
    </View>
  );

  // ═══════════════════════════════════════════
  // STEP 1b: HOW TO PLAY
  // ═══════════════════════════════════════════

  const GUIDE_ITEMS = [
    { icon: 'radar' as const, title: 'SCAN', desc: 'Use daily scans to search tiles for scrap, supplies, and gear. 3 modes: Scout (safe), Seeker (risky), Gambit (high reward).' },
    { icon: 'cog' as const, title: 'EQUIP', desc: 'Gear drops from scans. Equip up to 3 items before deploying. Your loadout shapes every run.' },
    { icon: 'sword-cross' as const, title: 'FIGHT', desc: 'Bosses and anomalies trigger combat. Read enemy telegraphs to attack, defend, or run.' },
    { icon: 'heart-pulse' as const, title: 'SURVIVE', desc: 'HP and scrap decay daily. If HP hits 0, sector progress resets. Repair and heal at camp.' },
    { icon: 'fire' as const, title: 'STREAK', desc: 'Play daily. Streaks sharpen scans and unlock better drops. Miss a day and it resets.' },
  ];

  const renderHowToPlay = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.howtoContainer}>
      <Text style={styles.stepTitle}>{'> OPERATOR BRIEFING'}</Text>
      <Text style={styles.stepSubtext}>Read this before you deploy. It\'s not getting repeated.</Text>

      {GUIDE_ITEMS.map((item, i) => (
        <View key={i} style={styles.guideCard}>
          <View style={styles.guideIconWrap}>
            <MaterialCommunityIcons name={item.icon} size={20} color={colors.neonGreen} />
          </View>
          <View style={styles.guideContent}>
            <Text style={styles.guideTitle}>{item.title}</Text>
            <Text style={styles.guideDesc}>{item.desc}</Text>
          </View>
        </View>
      ))}

      <Text style={styles.guideFooter}>Full guide available in the Codex anytime.</Text>

      <NeonButton
        title="> UNDERSTOOD"
        onPress={() => goToStep('callsign')}
        variant="primary"
        size="lg"
        style={styles.bootBtn}
      />
    </ScrollView>
  );

  // ═══════════════════════════════════════════
  // STEP 2: CALLSIGN
  // ═══════════════════════════════════════════

  const renderCallsign = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>OPERATOR CALLSIGN</Text>
      <Text style={styles.stepDesc}>
        No ID on file. Assign a designation for comms and logging.
      </Text>

      {/* Generated callsign */}
      <View style={styles.callsignBox}>
        <Text style={styles.callsignValue}>{callsign}</Text>
      </View>

      <NeonButton
        title="Reroll"
        onPress={reroll}
        variant="ghost"
        size="sm"
        icon="dice-multiple"
        style={styles.rerollBtn}
      />

      {/* Custom name toggle */}
      <TouchableOpacity
        onPress={() => {
          AudioManager.playSfx('ui_tap');
          setUseCustom(!useCustom);
        }}
        style={styles.customToggle}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons
          name={useCustom ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}
          size={18}
          color={colors.textMuted}
        />
        <Text style={styles.customToggleText}>Use custom callsign</Text>
      </TouchableOpacity>

      {useCustom && (
        <TextInput
          style={styles.textInput}
          value={customName}
          onChangeText={setCustomName}
          placeholder="Enter callsign..."
          placeholderTextColor={colors.textMuted}
          maxLength={24}
          autoFocus
        />
      )}

      <NeonButton
        title="> CONFIRM CALLSIGN"
        onPress={() => goToStep('origin')}
        variant="primary"
        size="lg"
        style={styles.stepBtn}
      />
    </View>
  );

  // ═══════════════════════════════════════════
  // STEP 3: ORIGIN
  // ═══════════════════════════════════════════

  const renderOrigin = () => (
    <ScrollView style={styles.scrollFlex} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepHeader}>OPERATOR ORIGIN</Text>
      <Text style={styles.stepDesc}>
        Pre-collapse record fragment recovered. Select the closest match.
      </Text>

      {ORIGINS.map((origin) => {
        const selected = selectedOrigin === origin.id;
        return (
          <TouchableOpacity
            key={origin.id}
            onPress={() => {
              AudioManager.playSfx('ui_tap');
              AudioManager.vibrate('light');
              setSelectedOrigin(origin.id);
            }}
            style={[styles.originCard, selected && styles.originCardSelected]}
            activeOpacity={0.7}
          >
            <View style={styles.originHeader}>
              <MaterialCommunityIcons
                name={origin.icon as any}
                size={22}
                color={selected ? colors.neonGreen : colors.textMuted}
              />
              <Text style={[styles.originLabel, selected && { color: colors.neonGreen }]}>
                {origin.label}
              </Text>
            </View>
            <Text style={styles.originTagline}>{origin.tagline}</Text>
          </TouchableOpacity>
        );
      })}

      <NeonButton
        title="> CONFIRM ORIGIN"
        onPress={() => goToStep('rig')}
        disabled={!selectedOrigin}
        variant="primary"
        size="lg"
        style={styles.stepBtn}
      />
    </ScrollView>
  );

  // ═══════════════════════════════════════════
  // STEP 4: RIG (accent color)
  // ═══════════════════════════════════════════

  const renderRig = () => {
    const accent = ACCENT_COLORS.find((c) => c.id === selectedColor);
    const accentHex = accent?.hex || colors.neonGreen;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>TERMINAL DISPLAY</Text>
        <Text style={styles.stepDesc}>
          Calibrate your terminal's primary accent. Cosmetic only.
        </Text>

        <View style={styles.colorRow}>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c.id}
              onPress={() => {
                AudioManager.playSfx('ui_tap');
                AudioManager.vibrate('light');
                setSelectedColor(c.id);
              }}
              style={[
                styles.colorSwatch,
                { borderColor: selectedColor === c.id ? c.hex : colors.surfaceLight },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.colorFill, { backgroundColor: c.hex }]} />
              <Text
                style={[
                  styles.colorLabel,
                  { color: selectedColor === c.id ? c.hex : colors.textMuted },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={[styles.previewBox, { borderColor: accentHex }]}>
          <Text style={[styles.previewHeader, { color: accentHex }]}>
            {'/// SIGNAL ACQUIRED ///'}
          </Text>
          <View style={styles.previewBarTrack}>
            <View style={[styles.previewBarFill, { backgroundColor: accentHex, width: '72%' }]} />
          </View>
          <Text style={styles.previewText}>
            SCRAP: 15{'  '}|{'  '}SUPPLIES: 10{'  '}|{'  '}HP: 100
          </Text>
        </View>

        <NeonButton
          title="> CALIBRATE"
          onPress={() => goToStep('avatar')}
          variant="primary"
          size="lg"
          style={styles.stepBtn}
        />
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // STEP 5: AVATAR
  // ═══════════════════════════════════════════

  const renderAvatar = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.transitionLabel}>OPERATOR_SELECT</Text>
      <Text style={{ color: colors.textMuted, fontFamily: fontMono, fontSize: 12, textAlign: 'center', marginBottom: spacing.sm }}>Choose your operator.</Text>
      <View style={styles.avatarRow}>
        {AVATAR_OPTIONS.map((av) => (
          <TouchableOpacity
            key={av.id}
            style={[
              styles.avatarCard,
              selectedAvatar === av.id && styles.avatarCardSelected,
            ]}
            onPress={() => {
              setSelectedAvatar(av.id);
              AudioManager.vibrate('light');
            }}
            activeOpacity={0.7}
          >
            <Image source={av.image} style={styles.avatarImage} resizeMode="contain" />
            <Text style={[
              styles.avatarLabel,
              selectedAvatar === av.id && { color: colors.neonGreen },
            ]}>{av.label}</Text>
            <Text style={styles.avatarDesc}>{av.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <NeonButton
        title="Confirm operator"
        onPress={() => goToStep('confirm')}
        variant="primary"
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );

  // ═══════════════════════════════════════════
  // STEP 6: CONFIRM
  // ═══════════════════════════════════════════

  const renderConfirm = () => {
    const name = useCustom ? (customName.trim() || 'Drifter') : callsign;
    const origin = ORIGINS.find((o) => o.id === selectedOrigin);
    const accent = ACCENT_COLORS.find((c) => c.id === selectedColor);
    const accentHex = accent?.hex || colors.neonGreen;

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepHeader}>CONFIRM REGISTRATION</Text>
        <Text style={styles.stepDesc}>
          Review and lock in. No second chances out here.
        </Text>

        <View style={[styles.confirmCard, { borderLeftColor: accentHex, borderLeftWidth: 3 }]}>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey}>CALLSIGN</Text>
            <Text style={[styles.confirmVal, { color: accentHex }]}>{name}</Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey}>ORIGIN</Text>
            <Text style={styles.confirmVal}>{origin?.label || '—'}</Text>
          </View>
          <View style={styles.confirmRow}>
            <Text style={styles.confirmKey}>DISPLAY</Text>
            <View style={styles.confirmColorRow}>
              <View style={[styles.confirmColorDot, { backgroundColor: accentHex }]} />
              <Text style={[styles.confirmVal, { color: accentHex }]}>{accent?.label || 'Phosphor'}</Text>
            </View>
          </View>
        </View>

        <TypewriterText
          text="The Directorate locked down the good sectors. The Free Bands fight over what's left. You work the gaps between both. Time to run your first job."
          speed={25}
          style={styles.confirmNarration}
        />

        <NeonButton
          title="> DEPLOY OPERATOR"
          onPress={handleComplete}
          variant="primary"
          size="lg"
          icon="radar"
          style={styles.stepBtn}
        />
      </View>
    );
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

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

      {!transitioning && step === 'boot' && renderBoot()}
      {!transitioning && step === 'howtoplay' && renderHowToPlay()}
      {!transitioning && step === 'callsign' && renderCallsign()}
      {!transitioning && step === 'origin' && renderOrigin()}
      {!transitioning && step === 'rig' && renderRig()}
      {!transitioning && step === 'avatar' && renderAvatar()}
      {!transitioning && step === 'confirm' && renderConfirm()}

      {renderTransition()}
    </ScreenWrapper>
  );
}

// ─── Styles ───

const styles = StyleSheet.create({
  // Progress
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: colors.neonGreen,
    width: 24,
  },
  progressDotComplete: {
    backgroundColor: colors.neonCyan,
  },

  // Transition
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  transitionBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceLight,
  },
  transitionBarFill: {
    height: '100%',
  },
  transitionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 3,
    marginTop: spacing.md,
  },

  // Boot
  bootContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  bootHeader: {
    fontSize: fontSize.sm,
    color: colors.neonGreen,
    fontFamily: fontMono,
    letterSpacing: 2,
    textAlign: 'center',
  },
  bootDivider: {
    height: 1,
    backgroundColor: colors.panelBorder,
    marginVertical: spacing.md,
  },
  bootLines: {
    flex: 1,
  },
  bootLine: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontMono,
    lineHeight: 22,
  },
  bootCursor: {
    fontSize: fontSize.sm,
    color: colors.neonGreen,
    fontFamily: fontMono,
  },
  bootBtn: {
    marginBottom: spacing.xl,
    alignSelf: 'center',
    width: 220,
  },

  // Shared step
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  scrollFlex: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  stepHeader: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontMono,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  stepDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  stepBtn: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    alignSelf: 'center',
    width: 260,
  },

  // Callsign
  callsignBox: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.lg,
    alignItems: 'center',
  },
  callsignValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.neonGreen,
    fontFamily: fontMono,
    letterSpacing: 3,
  },
  rerollBtn: {
    alignSelf: 'center',
    marginTop: spacing.md,
  },
  customToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  customToggleText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontMono,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    borderRadius: 0,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontFamily: fontMono,
    marginTop: spacing.sm,
  },

  // Origin
  originCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  originCardSelected: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.neonGreen + '08',
  },
  originHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  originLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontMono,
    letterSpacing: 1,
  },
  originTagline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginLeft: 30,
  },

  // Color picker
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  colorSwatch: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 2,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  colorFill: {
    width: 20,
    height: 20,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  colorLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    letterSpacing: 1,
  },

  // Preview
  previewBox: {
    borderWidth: 1.5,
    padding: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  previewHeader: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  previewBarTrack: {
    height: 6,
    backgroundColor: colors.surfaceLight,
    marginBottom: spacing.sm,
  },
  previewBarFill: {
    height: '100%',
  },
  previewText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 1,
  },

  // Confirm
  confirmCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  confirmKey: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    letterSpacing: 2,
  },
  confirmVal: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: fontMono,
  },
  confirmColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmColorDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  confirmNarration: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },

  // ─── Avatar selection ───
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  avatarCard: {
    width: 140,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.sm,
    alignItems: 'center',
  },
  avatarCardSelected: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.neonGreen + '08',
  },
  avatarImage: {
    width: 100,
    height: 130,
    marginBottom: spacing.sm,
  },
  avatarLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontMono,
    letterSpacing: 2,
    color: colors.textMuted,
  },
  avatarDesc: {
    fontSize: 8,
    color: colors.textMuted,
    fontFamily: fontMono,
    textAlign: 'center',
    marginTop: 4,
  },

  // ─── How to Play ───
  howtoContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stepTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.neonGreen,
    fontFamily: fontMono,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  stepSubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontFamily: fontMono,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  guideCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  guideIconWrap: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderColor: colors.neonGreen + '30',
    backgroundColor: colors.neonGreen + '08',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontMono,
    letterSpacing: 2,
    marginBottom: 4,
  },
  guideDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  guideFooter: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
});
