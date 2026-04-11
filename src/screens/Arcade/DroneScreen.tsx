import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { useGame, DRONE_LEVEL_TITLES, getDroneLevelProgress } from '../../context/GameContext';
import { colors, spacing, fontSize, fontMono } from '../../theme';
import AudioManager from '../../services/audioManager';

// ─── Cosmetic shop data ───

interface CosmeticItem {
  id: string;
  label: string;
  type: 'eyeColor' | 'antenna' | 'shell';
  value: string;
  price: number;
}

const COSMETIC_SHOP: CosmeticItem[] = [
  // Eye Colors
  { id: 'eye_amber', label: 'Amber Optic', type: 'eyeColor', value: '#E8A800', price: 10 },
  { id: 'eye_red', label: 'Red Alert', type: 'eyeColor', value: '#E83553', price: 10 },
  { id: 'eye_purple', label: 'Void Lens', type: 'eyeColor', value: '#A855F7', price: 10 },
  { id: 'eye_white', label: 'Ghost Eye', type: 'eyeColor', value: '#FFFFFF', price: 10 },
  // Antennas
  { id: 'antenna_signal', label: 'Signal Boost', type: 'antenna', value: 'signal_boost', price: 10 },
  { id: 'antenna_relay', label: 'Relay Dish', type: 'antenna', value: 'relay_dish', price: 10 },
  { id: 'antenna_spark', label: 'Spark Rod', type: 'antenna', value: 'spark_rod', price: 10 },
  // Shells
  { id: 'shell_plated', label: 'Plated Armor', type: 'shell', value: 'plated', price: 10 },
  { id: 'shell_camo', label: 'Wasteland Camo', type: 'shell', value: 'camo', price: 10 },
  { id: 'shell_chrome', label: 'Chrome Finish', type: 'shell', value: 'chrome', price: 10 },
];

// ─── Speech bubble content ───

const IDLE_CHATTER = [
  '...scanning perimeter...',
  '*antenna rotates slowly*',
  'All quiet out here.',
  '*low frequency hum*',
  'Dust levels: nominal.',
  'Miss the old relay frequencies.',
  '*servos click*',
  'Wind is picking up.',
  'Signal trace... no, gone.',
  'Running self-check... all green.',
  '*optic lens refocuses*',
  'Detecting micro-vibrations below.',
  'Battery at acceptable levels.',
  '*quiet whirr*',
];

const TAP_RESPONSES = [
  '*chirps*',
  '*antenna spins excitedly*',
  'Hey!',
  '*wobbles*',
  'Beep!',
  '*tilts curiously*',
  '*hums a frequency*',
  'Oh? What is it?',
  '*blinks rapidly*',
  'Still here.',
];

const DAILY_TAP_RESPONSES = [
  'Glad you came back.',
  'Missed you out there.',
  '*happy beeping sequence*',
  'Drone-human bond: reinforced.',
  'Finally! Someone to talk to.',
  'Systems spike — it\'s you!',
  '*antenna perks up immediately*',
];

// ─── Discovery overlay lines ───

const DISCOVERY_LINES = [
  'SIGNAL ACQUIRED — UNKNOWN UNIT',
  'Designation: [UNNAMED]',
  'Origin: Pre-collapse autonomous recon platform',
  'Status: Operational. Lonely.',
  '',
  'It followed you home from the overpass.',
  'Tap to say hello.',
];

// ─── Helpers ───

function getMoodText(happiness: number): { text: string; color: string } {
  if (happiness > 80) return { text: 'OPERATIONAL — CONTENT', color: colors.neonGreen };
  if (happiness > 50) return { text: 'FUNCTIONAL', color: colors.neonCyan };
  if (happiness > 20) return { text: 'LOW POWER', color: colors.neonAmber };
  return { text: 'CRITICAL — NEGLECTED', color: colors.neonRed };
}

function getMoodGlowColor(happiness: number): string {
  if (happiness > 80) return colors.neonGreen;
  if (happiness > 50) return colors.neonCyan;
  if (happiness > 20) return colors.neonAmber;
  return colors.neonRed;
}

// ─── Floating XP Particle ───

function FloatingXPText({ value, onDone }: { value: string; onDone: () => void }) {
  const floatY = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(floatY, { toValue: -80, duration: 1200, useNativeDriver: true }),
      Animated.timing(fadeOut, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]).start(() => onDone());
  }, [floatY, fadeOut, onDone]);

  return (
    <Animated.Text
      style={[
        styles.floatingXP,
        { transform: [{ translateY: floatY }], opacity: fadeOut },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

// ─── Main Component ───

export default function DroneScreen() {
  const { state, dispatch } = useGame();
  const drone = state.droneCompanion;

  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<{ id: number; text: string }[]>([]);
  const [showDiscovery, setShowDiscovery] = useState(drone.totalInteractions === 0);
  const floatingIdRef = useRef(0);

  // ─── Animations ───
  const bobAnim = useRef(new Animated.Value(0)).current;
  const eyeGlowAnim = useRef(new Animated.Value(0.3)).current;
  const tapScaleAnim = useRef(new Animated.Value(1)).current;
  const idleTiltAnim = useRef(new Animated.Value(0)).current;
  const moodGlowAnim = useRef(new Animated.Value(0)).current;
  const discoveryFade = useRef(new Animated.Value(1)).current;
  const speechFade = useRef(new Animated.Value(0)).current;

  // Idle bob — continuous breathing motion
  useEffect(() => {
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: -6, duration: 1500, useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 6, duration: 1500, useNativeDriver: true }),
      ]),
    );
    bobLoop.start();
    return () => bobLoop.stop();
  }, [bobAnim]);

  // Eye glow pulse
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(eyeGlowAnim, { toValue: 0.8, duration: 1000, useNativeDriver: true }),
        Animated.timing(eyeGlowAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [eyeGlowAnim]);

  // Mood-reactive glow pulse (speed changes with mood)
  useEffect(() => {
    const pulseDuration = drone.happiness > 80 ? 2500 : drone.happiness > 50 ? 2000 : drone.happiness > 20 ? 1500 : 800;
    const moodLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(moodGlowAnim, { toValue: 1, duration: pulseDuration / 2, useNativeDriver: true }),
        Animated.timing(moodGlowAnim, { toValue: 0, duration: pulseDuration / 2, useNativeDriver: true }),
      ]),
    );
    moodLoop.start();
    return () => moodLoop.stop();
  }, [moodGlowAnim, drone.happiness]);

  // Random idle behaviors — tilt
  useEffect(() => {
    const triggerIdle = () => {
      const delay = 8000 + Math.random() * 4000;
      return setTimeout(() => {
        Animated.sequence([
          Animated.timing(idleTiltAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(idleTiltAnim, { toValue: -1, duration: 400, useNativeDriver: true }),
          Animated.timing(idleTiltAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        timerRef.current = triggerIdle();
      }, delay);
    };
    const timerRef = { current: triggerIdle() };
    return () => clearTimeout(timerRef.current);
  }, [idleTiltAnim]);

  // Idle chatter — speech bubble every 6-10s
  useEffect(() => {
    if (showDiscovery) return;
    const triggerChatter = () => {
      const delay = 6000 + Math.random() * 4000;
      return setTimeout(() => {
        const line = IDLE_CHATTER[Math.floor(Math.random() * IDLE_CHATTER.length)];
        showSpeechBubble(line);
        chatterRef.current = triggerChatter();
      }, delay);
    };
    const chatterRef = { current: triggerChatter() };
    return () => clearTimeout(chatterRef.current);
  }, [showDiscovery]); // eslint-disable-line react-hooks/exhaustive-deps

  const showSpeechBubble = useCallback((text: string) => {
    setSpeechBubble(text);
    speechFade.setValue(1);
    Animated.timing(speechFade, { toValue: 0, duration: 500, delay: 3000, useNativeDriver: true }).start(() => {
      setSpeechBubble(null);
    });
  }, [speechFade]);

  const spawnFloatingText = useCallback((text: string) => {
    const id = ++floatingIdRef.current;
    setFloatingTexts(prev => [...prev, { id, text }]);
  }, []);

  const removeFloatingText = useCallback((id: number) => {
    setFloatingTexts(prev => prev.filter(f => f.id !== id));
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const interactedToday = drone.lastInteraction === today;

  const handleTap = useCallback(() => {
    if (showDiscovery) {
      // Dismiss discovery overlay
      Animated.timing(discoveryFade, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        setShowDiscovery(false);
      });
      dispatch({ type: 'DRONE_INTERACT' });
      AudioManager.playSfx('ui_confirm');
      AudioManager.vibrate('heavy');
      showSpeechBubble(DAILY_TAP_RESPONSES[Math.floor(Math.random() * DAILY_TAP_RESPONSES.length)]);
      spawnFloatingText('+10 XP');
      return;
    }

    if (!interactedToday) {
      // Daily interaction — reward
      dispatch({ type: 'DRONE_INTERACT' });
      const scrapReward = Math.floor(Math.random() * 4); // 0-3
      const suppliesReward = Math.random() < 0.3 ? 1 : 0;
      if (scrapReward > 0 || suppliesReward > 0) {
        dispatch({
          type: 'APPLY_RESOURCE_CHANGES',
          payload: { scrap: scrapReward, supplies: suppliesReward },
        });
        const parts = [];
        if (scrapReward > 0) parts.push(`${scrapReward} scrap`);
        if (suppliesReward > 0) parts.push(`${suppliesReward} supply`);
        showSpeechBubble(`Found ${parts.join(' and ')} in the dust!`);
      } else {
        const line = DAILY_TAP_RESPONSES[Math.floor(Math.random() * DAILY_TAP_RESPONSES.length)];
        showSpeechBubble(line);
      }
      AudioManager.playSfx('ui_confirm');
      AudioManager.vibrate('heavy');
      spawnFloatingText('+10 XP');

      Animated.sequence([
        Animated.timing(tapScaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(tapScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      // Already interacted — random response
      const response = TAP_RESPONSES[Math.floor(Math.random() * TAP_RESPONSES.length)];
      showSpeechBubble(response);
      AudioManager.playSfx('ui_tap');
      AudioManager.vibrate('light');

      Animated.sequence([
        Animated.timing(tapScaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(tapScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [showDiscovery, interactedToday, dispatch, tapScaleAnim, discoveryFade, showSpeechBubble, spawnFloatingText]);

  const handleFeed = useCallback(() => {
    if (state.resources.supplies < 3) return;
    dispatch({ type: 'DRONE_FEED' });
    showSpeechBubble('*absorbs supplies* Systems restored.');
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
  }, [state.resources.supplies, dispatch, showSpeechBubble]);

  const handleRename = useCallback(() => {
    Alert.prompt(
      'Rename Drone',
      'Enter a new designation for your companion:',
      (text) => {
        if (text && text.trim().length > 0) {
          dispatch({ type: 'DRONE_SET_NAME', payload: text.trim().slice(0, 16) });
          AudioManager.playSfx('ui_confirm');
        }
      },
      'plain-text',
      drone.name,
    );
  }, [drone.name, dispatch]);

  const handleBuyCosmetic = useCallback((item: CosmeticItem) => {
    if (state.resources.scrap < item.price) return;
    if (drone.unlockedCosmetics.includes(item.id)) return;
    dispatch({
      type: 'DRONE_UPGRADE_COSMETIC',
      payload: { cosmeticId: item.id, cosmeticType: item.type, value: item.value },
    });
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
  }, [state.resources.scrap, drone.unlockedCosmetics, dispatch]);

  const handleEquipCosmetic = useCallback((item: CosmeticItem) => {
    dispatch({ type: 'DRONE_SET_COSMETIC', payload: { [item.type]: item.value } });
    AudioManager.playSfx('ui_tap');
  }, [dispatch]);

  const mood = getMoodText(drone.happiness);
  const moodGlowColor = getMoodGlowColor(drone.happiness);
  const droneLevel = drone.level || 1;
  const droneXp = drone.xp || 0;
  const levelTitle = DRONE_LEVEL_TITLES[Math.min(droneLevel - 1, DRONE_LEVEL_TITLES.length - 1)];
  const levelProgress = getDroneLevelProgress(droneXp, droneLevel);

  const tiltInterpolate = idleTiltAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  const moodGlowOpacity = moodGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.05, drone.happiness > 80 ? 0.2 : drone.happiness > 20 ? 0.15 : 0.3],
  });

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ─── Header ─── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleRename} activeOpacity={0.7}>
            <Text style={styles.droneName}>{drone.name}</Text>
          </TouchableOpacity>
          <Text style={styles.levelTitle}>LVL {droneLevel} — {levelTitle}</Text>
          <View style={styles.xpBarContainer}>
            <View style={[styles.xpBarFill, { width: `${Math.min(levelProgress.progress * 100, 100)}%` }]} />
            <Text style={styles.xpBarText}>{droneXp} / {levelProgress.next} XP</Text>
          </View>
        </View>

        {/* ─── Compact Stats Row ─── */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="heart-pulse" size={12} color={mood.color} />
            <Text style={[styles.statChipValue, { color: mood.color }]}>{drone.happiness}</Text>
            <Text style={styles.statChipLabel}>MOOD</Text>
          </View>
          <View style={styles.statChip}>
            <MaterialCommunityIcons name="gesture-tap" size={12} color={colors.neonCyan} />
            <Text style={[styles.statChipValue, { color: colors.neonCyan }]}>{drone.totalInteractions}</Text>
            <Text style={styles.statChipLabel}>VISITS</Text>
          </View>
          <View style={styles.statChip}>
            <Text style={[styles.statChipStatus, { color: mood.color }]}>{mood.text}</Text>
          </View>
        </View>

        {/* ─── Speech Bubble ─── */}
        {speechBubble && (
          <Animated.View style={[styles.speechBubble, { opacity: speechFade }]}>
            <Text style={styles.speechText}>{speechBubble}</Text>
            <View style={styles.speechTail} />
          </Animated.View>
        )}

        {/* ─── Drone Sprite ─── */}
        <TouchableOpacity
          onPress={handleTap}
          activeOpacity={0.9}
          style={styles.spriteContainer}
        >
          {/* Mood-reactive glow behind sprite */}
          <Animated.View
            style={[
              styles.moodGlow,
              {
                backgroundColor: moodGlowColor,
                opacity: moodGlowOpacity,
              },
            ]}
          />

          <Animated.View
            style={[
              styles.spriteWrapper,
              {
                transform: [
                  { translateY: bobAnim },
                  { scale: tapScaleAnim },
                  { rotate: tiltInterpolate },
                ],
              },
            ]}
          >
            <Image
              source={require('../../assets/drone/drone_companion.png')}
              style={styles.spriteImage}
              resizeMode="contain"
            />
            {/* Eye glow overlay */}
            <Animated.View
              style={[
                styles.eyeGlow,
                {
                  backgroundColor: drone.cosmetic.eyeColor,
                  opacity: eyeGlowAnim,
                },
              ]}
            />
          </Animated.View>

          {/* Floating XP text particles */}
          {floatingTexts.map(f => (
            <FloatingXPText
              key={f.id}
              value={f.text}
              onDone={() => removeFloatingText(f.id)}
            />
          ))}

          {!interactedToday && !showDiscovery && (
            <View style={styles.tapPrompt}>
              <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.neonGreen} />
              <Text style={styles.tapPromptText}>TAP TO INTERACT</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Action Buttons ─── */}
        <View style={styles.actionRow}>
          <NeonButton
            title={`FEED (3 Sup)`}
            onPress={handleFeed}
            icon="food-apple"
            disabled={state.resources.supplies < 3}
            size="sm"
          />
          <NeonButton
            title="DIAGNOSTICS"
            onPress={() => setShowDiagnostics(!showDiagnostics)}
            icon="chart-line"
            variant="secondary"
            size="sm"
          />
        </View>

        {/* ─── Diagnostics Panel ─── */}
        {showDiagnostics && (
          <View style={styles.diagCard}>
            <Text style={styles.diagTitle}>DRONE DIAGNOSTICS</Text>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Designation</Text>
              <Text style={styles.diagValue}>{drone.name}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Total Interactions</Text>
              <Text style={styles.diagValue}>{drone.totalInteractions}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Happiness</Text>
              <Text style={[styles.diagValue, { color: mood.color }]}>{drone.happiness}/100</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Eye Module</Text>
              <View style={[styles.diagColorSwatch, { backgroundColor: drone.cosmetic.eyeColor }]} />
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Antenna</Text>
              <Text style={styles.diagValue}>{drone.cosmetic.antenna.toUpperCase()}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Shell</Text>
              <Text style={styles.diagValue}>{drone.cosmetic.shell.toUpperCase()}</Text>
            </View>
            <View style={styles.diagRow}>
              <Text style={styles.diagLabel}>Cosmetics Unlocked</Text>
              <Text style={styles.diagValue}>{drone.unlockedCosmetics.length}</Text>
            </View>
          </View>
        )}

        {/* ─── Cosmetic Shop ─── */}
        <View style={styles.shopSection}>
          <Text style={styles.shopTitle}>MODIFICATIONS</Text>
          <Text style={styles.shopSubtext}>10 scrap each. Tap to buy or equip.</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.shopScroll}
          >
            {COSMETIC_SHOP.map((item) => {
              const owned = drone.unlockedCosmetics.includes(item.id);
              const equipped =
                (item.type === 'eyeColor' && drone.cosmetic.eyeColor === item.value) ||
                (item.type === 'antenna' && drone.cosmetic.antenna === item.value) ||
                (item.type === 'shell' && drone.cosmetic.shell === item.value);
              const canAfford = state.resources.scrap >= item.price;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.shopCard,
                    equipped && styles.shopCardEquipped,
                  ]}
                  onPress={() => {
                    if (equipped) return;
                    if (owned) {
                      handleEquipCosmetic(item);
                    } else {
                      handleBuyCosmetic(item);
                    }
                  }}
                  disabled={equipped}
                  activeOpacity={0.7}
                >
                  {item.type === 'eyeColor' ? (
                    <View style={[styles.shopColorPreview, { backgroundColor: item.value }]} />
                  ) : (
                    <MaterialCommunityIcons
                      name={item.type === 'antenna' ? 'antenna' : 'shield-half-full'}
                      size={20}
                      color={owned ? colors.neonGreen : colors.textMuted}
                    />
                  )}
                  <Text style={styles.shopCardLabel} numberOfLines={1}>{item.label}</Text>
                  <Text style={[styles.shopCardType, { color: colors.textMuted }]}>
                    {item.type.toUpperCase()}
                  </Text>
                  {equipped ? (
                    <View style={styles.equippedBadge}>
                      <MaterialCommunityIcons name="check" size={10} color={colors.neonGreen} />
                    </View>
                  ) : owned ? (
                    <Text style={styles.shopCardAction}>EQUIP</Text>
                  ) : (
                    <Text style={[styles.shopCardPrice, !canAfford && { color: colors.textMuted }]}>
                      {item.price} Scrap
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ─── First-time Discovery Overlay ─── */}
      {showDiscovery && (
        <Animated.View style={[styles.discoveryOverlay, { opacity: discoveryFade }]}>
          <View style={styles.discoveryCard}>
            <MaterialCommunityIcons name="access-point-network" size={32} color={colors.neonGreen} />
            {DISCOVERY_LINES.map((line, i) => (
              <Text
                key={i}
                style={[
                  styles.discoveryLine,
                  i === 0 && styles.discoveryHeader,
                  line === '' && { height: 12 },
                  i >= 5 && styles.discoveryFlavor,
                ]}
              >
                {line}
              </Text>
            ))}
            <View style={styles.discoveryTapHint}>
              <MaterialCommunityIcons name="gesture-tap" size={20} color={colors.neonGreen} />
              <Text style={styles.discoveryTapText}>TAP THE DRONE</Text>
            </View>
          </View>
        </Animated.View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Header ───
  header: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  droneName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontMono,
    color: colors.textPrimary,
    letterSpacing: 3,
  },
  levelTitle: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontFamily: fontMono,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  xpBarContainer: {
    width: '80%',
    height: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.neonCyan + '30',
    marginBottom: 4,
    position: 'relative' as const,
    justifyContent: 'center' as const,
  },
  xpBarFill: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.neonCyan + '60',
  },
  xpBarText: {
    fontSize: 7,
    color: colors.textMuted,
    fontFamily: fontMono,
    textAlign: 'center' as const,
    letterSpacing: 1,
  },

  // ─── Compact Stats Row ───
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChipValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    fontFamily: fontMono,
  },
  statChipLabel: {
    fontSize: 7,
    fontFamily: fontMono,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  statChipStatus: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: fontMono,
    letterSpacing: 2,
  },

  // ─── Speech Bubble ───
  speechBubble: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    maxWidth: '80%',
  },
  speechText: {
    fontSize: fontSize.sm,
    fontFamily: fontMono,
    color: colors.neonGreen,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  speechTail: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.neonGreen + '40',
  },

  // ─── Sprite ───
  spriteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  moodGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  spriteWrapper: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteImage: {
    width: 240,
    height: 240,
  },
  eyeGlow: {
    position: 'absolute',
    width: 16,
    height: 8,
    top: 96,
    left: 120,
    borderRadius: 4,
  },
  tapPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tapPromptText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonGreen,
    letterSpacing: 2,
  },

  // ─── Floating XP ───
  floatingXP: {
    position: 'absolute',
    top: 60,
    fontSize: fontSize.md,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonGreen,
    letterSpacing: 2,
    textShadowColor: colors.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  // ─── Actions ───
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },

  // ─── Diagnostics ───
  diagCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  diagTitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonCyan,
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  diagLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    color: colors.textMuted,
  },
  diagValue: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  diagColorSwatch: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },

  // ─── Shop ───
  shopSection: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xxl,
  },
  shopTitle: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonAmber,
    letterSpacing: 3,
    marginBottom: 2,
  },
  shopSubtext: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  shopScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  shopCard: {
    width: 100,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  shopCardEquipped: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '08',
  },
  shopColorPreview: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: colors.panelBorder,
  },
  shopCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: fontMono,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  shopCardType: {
    fontSize: 7,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 1,
  },
  shopCardAction: {
    fontSize: 8,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonCyan,
    letterSpacing: 1,
  },
  shopCardPrice: {
    fontSize: 8,
    fontWeight: '700',
    fontFamily: fontMono,
    color: colors.neonAmber,
  },
  equippedBadge: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: colors.neonGreen + '60',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Discovery Overlay ───
  discoveryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  discoveryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
    padding: spacing.lg,
    alignItems: 'center',
    maxWidth: 320,
  },
  discoveryLine: {
    fontSize: fontSize.sm,
    fontFamily: fontMono,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  discoveryHeader: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    color: colors.neonGreen,
    letterSpacing: 2,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  discoveryFlavor: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  discoveryTapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  discoveryTapText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonGreen,
    letterSpacing: 2,
  },
});
