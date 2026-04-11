import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Animated,
  Alert,
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

const IDLE_RESPONSES = [
  '*blinks*',
  '*antenna spins*',
  '*wobbles contentedly*',
  '*hums a frequency*',
  '*tilts curiously*',
];

function getMoodText(happiness: number): { text: string; color: string } {
  if (happiness > 80) return { text: 'OPERATIONAL — CONTENT', color: colors.neonGreen };
  if (happiness > 50) return { text: 'FUNCTIONAL', color: colors.neonCyan };
  if (happiness > 20) return { text: 'LOW POWER', color: colors.neonAmber };
  return { text: 'CRITICAL — NEGLECTED', color: colors.neonRed };
}

function getHappinessColor(happiness: number): string {
  if (happiness > 60) return colors.neonGreen;
  if (happiness > 30) return colors.neonAmber;
  return colors.neonRed;
}

export default function DroneScreen() {
  const { state, dispatch } = useGame();
  const drone = state.droneCompanion;

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // ─── Animations ───
  const bobAnim = useRef(new Animated.Value(0)).current;
  const eyeGlowAnim = useRef(new Animated.Value(0.3)).current;
  const tapScaleAnim = useRef(new Animated.Value(1)).current;
  const idleTiltAnim = useRef(new Animated.Value(0)).current;

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

  // Random idle behaviors
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

  const today = new Date().toISOString().split('T')[0];
  const interactedToday = drone.lastInteraction === today;

  const handleTap = useCallback(() => {
    if (!interactedToday) {
      // Daily interaction — reward
      dispatch({ type: 'DRONE_INTERACT' });
      const scrapReward = Math.floor(Math.random() * 4); // 0-3
      const suppliesReward = Math.random() < 0.3 ? 1 : 0; // 30% chance of 1 supply
      if (scrapReward > 0 || suppliesReward > 0) {
        dispatch({
          type: 'APPLY_RESOURCE_CHANGES',
          payload: { scrap: scrapReward, supplies: suppliesReward },
        });
        const parts = [];
        if (scrapReward > 0) parts.push(`${scrapReward} scrap`);
        if (suppliesReward > 0) parts.push(`${suppliesReward} supply`);
        setStatusMessage(`${drone.name} found ${parts.join(' and ')} in the dust!`);
      } else {
        setStatusMessage(`${drone.name} chirps happily.`);
      }
      AudioManager.playSfx('ui_confirm');
      AudioManager.vibrate('heavy');

      // Tap animation: scale up and back
      Animated.sequence([
        Animated.timing(tapScaleAnim, { toValue: 1.1, duration: 150, useNativeDriver: true }),
        Animated.timing(tapScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    } else {
      // Already interacted — random response
      const response = IDLE_RESPONSES[Math.floor(Math.random() * IDLE_RESPONSES.length)];
      setStatusMessage(response);
      AudioManager.playSfx('ui_tap');
      AudioManager.vibrate('light');

      // Small bounce
      Animated.sequence([
        Animated.timing(tapScaleAnim, { toValue: 1.05, duration: 100, useNativeDriver: true }),
        Animated.timing(tapScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }

    // Clear status after 3 seconds
    setTimeout(() => setStatusMessage(null), 3000);
  }, [interactedToday, drone.name, dispatch, tapScaleAnim]);

  const handleFeed = useCallback(() => {
    if (state.resources.supplies < 3) return;
    dispatch({ type: 'DRONE_FEED' });
    setStatusMessage(`${drone.name} absorbs the supplies. Systems restored.`);
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
    setTimeout(() => setStatusMessage(null), 3000);
  }, [state.resources.supplies, drone.name, dispatch]);

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
  const hpColor = getHappinessColor(drone.happiness);
  const droneLevel = drone.level || 1;
  const droneXp = drone.xp || 0;
  const levelTitle = DRONE_LEVEL_TITLES[Math.min(droneLevel - 1, DRONE_LEVEL_TITLES.length - 1)];
  const levelProgress = getDroneLevelProgress(droneXp, droneLevel);

  const tiltInterpolate = idleTiltAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
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
          <Text style={[styles.moodText, { color: mood.color }]}>{mood.text}</Text>
          <View style={styles.happinessBar}>
            <View style={[styles.happinessFill, { width: `${drone.happiness}%`, backgroundColor: hpColor }]} />
          </View>
        </View>

        {/* ─── Drone Sprite ─── */}
        <TouchableOpacity
          onPress={handleTap}
          activeOpacity={0.9}
          style={styles.spriteContainer}
        >
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

          {!interactedToday && (
            <View style={styles.tapPrompt}>
              <MaterialCommunityIcons name="gesture-tap" size={16} color={colors.neonGreen} />
              <Text style={styles.tapPromptText}>TAP TO INTERACT</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ─── Status Message ─── */}
        {statusMessage && (
          <View style={styles.statusBubble}>
            <Text style={styles.statusText}>{statusMessage}</Text>
          </View>
        )}

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
              <Text style={[styles.diagValue, { color: hpColor }]}>{drone.happiness}/100</Text>
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Header ───
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
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
    marginBottom: 6,
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
  moodText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    fontFamily: fontMono,
    letterSpacing: 2,
    marginTop: 4,
  },
  happinessBar: {
    width: '60%',
    height: 4,
    backgroundColor: colors.surfaceLight,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  happinessFill: {
    height: '100%',
  },

  // ─── Sprite ───
  spriteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  spriteWrapper: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteImage: {
    width: 200,
    height: 200,
  },
  eyeGlow: {
    position: 'absolute',
    width: 16,
    height: 8,
    top: 80,
    left: 100,
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

  // ─── Status ───
  statusBubble: {
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontFamily: fontMono,
    color: colors.neonGreen,
    textAlign: 'center',
    fontStyle: 'italic',
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
});
