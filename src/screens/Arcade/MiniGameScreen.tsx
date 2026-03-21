import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { useGame } from '../../context/GameContext';
import NeonButton from '../../components/common/NeonButton';
import { colors, spacing, fontSize } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_HEIGHT = SCREEN_HEIGHT - 200;
const PLAYER_SIZE = 30;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const OBSTACLE_WIDTH = 50;
const INITIAL_GAP_SIZE = 160;
const MIN_GAP_SIZE = 100;
const INITIAL_OBSTACLE_SPEED = 3;
const MAX_OBSTACLE_SPEED = 6;
const INITIAL_SPAWN_INTERVAL = 90; // frames
const MIN_SPAWN_INTERVAL = 50;

// ─── Reward Config ───
// Per-obstacle rewards scale with difficulty tiers
const REWARDS = {
  // Scrap earned per obstacle cleared, by tier
  scrapPerObstacle: [1, 1, 2, 2, 3],  // tiers 0-4
  // Bonus scrap for milestone obstacles
  milestoneEvery: 5,     // every 5th obstacle
  milestoneBonus: 3,     // +3 bonus scrap
  // Streak bonuses
  streakThreshold: 3,    // after 3 in a row without dying
  streakMultiplier: 1.5, // 1.5x scrap while on streak
  // High score bonus
  newHighScoreBonus: 10,
  // Supply bonuses at milestones
  supplyMilestones: [10, 20, 30], // at these obstacle counts
  supplyReward: 2,
};

interface Obstacle {
  x: number;
  gapY: number;
  passed: boolean;
  tier: number; // difficulty tier when this obstacle was spawned
}

type GamePhase = 'idle' | 'playing' | 'gameover';

export default function MiniGameScreen({ navigation }: any) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [distance, setDistance] = useState(0);
  const [obstaclesCleared, setObstaclesCleared] = useState(0);
  const [scrapEarned, setScrapEarned] = useState(0);
  const [currentTier, setCurrentTier] = useState(0);

  // Game state refs
  const playerY = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const frameCount = useRef(0);
  const distanceRef = useRef(0);
  const obstaclesClearedRef = useRef(0);
  const scrapEarnedRef = useRef(0);
  const currentTierRef = useRef(0);
  const gameLoop = useRef<number | null>(null);

  // Animated values
  const playerAnim = useRef(new Animated.Value(GAME_HEIGHT / 2)).current;
  const [obstacleState, setObstacleState] = useState<Obstacle[]>([]);
  const [showScrapPopup, setShowScrapPopup] = useState<{ amount: number; key: number } | null>(null);
  const popupKey = useRef(0);

  // ─── Difficulty scaling ───
  const getDifficultyTier = (cleared: number): number => {
    if (cleared >= 25) return 4;
    if (cleared >= 15) return 3;
    if (cleared >= 8) return 2;
    if (cleared >= 3) return 1;
    return 0;
  };

  const getGapSize = (tier: number): number => {
    return Math.max(MIN_GAP_SIZE, INITIAL_GAP_SIZE - tier * 12);
  };

  const getObstacleSpeed = (tier: number): number => {
    return Math.min(MAX_OBSTACLE_SPEED, INITIAL_OBSTACLE_SPEED + tier * 0.6);
  };

  const getSpawnInterval = (tier: number): number => {
    return Math.max(MIN_SPAWN_INTERVAL, INITIAL_SPAWN_INTERVAL - tier * 8);
  };

  const resetGame = useCallback(() => {
    playerY.current = GAME_HEIGHT / 2;
    velocity.current = 0;
    obstacles.current = [];
    frameCount.current = 0;
    distanceRef.current = 0;
    obstaclesClearedRef.current = 0;
    scrapEarnedRef.current = 0;
    currentTierRef.current = 0;
    playerAnim.setValue(GAME_HEIGHT / 2);
    setDistance(0);
    setObstaclesCleared(0);
    setScrapEarned(0);
    setCurrentTier(0);
    setObstacleState([]);
    setShowScrapPopup(null);
  }, [playerAnim]);

  const spawnObstacle = useCallback(() => {
    const tier = currentTierRef.current;
    const gapSize = getGapSize(tier);
    const minGapY = gapSize / 2 + 40;
    const maxGapY = GAME_HEIGHT - gapSize / 2 - 40;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
    obstacles.current.push({ x: SCREEN_WIDTH, gapY, passed: false, tier });
  }, []);

  const awardScrap = useCallback((cleared: number) => {
    const tier = getDifficultyTier(cleared);
    let scrap = REWARDS.scrapPerObstacle[Math.min(tier, REWARDS.scrapPerObstacle.length - 1)];

    // Milestone bonus
    if (cleared > 0 && cleared % REWARDS.milestoneEvery === 0) {
      scrap += REWARDS.milestoneBonus;
    }

    scrapEarnedRef.current += scrap;
    setScrapEarned(scrapEarnedRef.current);

    // Show popup
    popupKey.current++;
    setShowScrapPopup({ amount: scrap, key: popupKey.current });
    setTimeout(() => setShowScrapPopup(null), 600);

    return scrap;
  }, []);

  const gameOver = useCallback(() => {
    if (gameLoop.current) {
      cancelAnimationFrame(gameLoop.current);
      gameLoop.current = null;
    }
    setPhase('gameover');

    const finalDistance = distanceRef.current;
    const finalCleared = obstaclesClearedRef.current;
    const finalScrap = scrapEarnedRef.current;

    setDistance(finalDistance);
    setObstaclesCleared(finalCleared);
    setScrapEarned(finalScrap);

    const efficiency = finalCleared;
    const compositeScore = finalDistance + efficiency * 10;

    // Leaderboard
    dispatch({
      type: 'ADD_LEADERBOARD_ENTRY',
      payload: {
        playerName: state.playerName,
        playerId: 'local',
        distance: finalDistance,
        efficiency,
        compositeScore,
        timestamp: Date.now(),
      },
    });

    // Calculate total rewards
    let totalScrap = finalScrap;
    let supplyReward = 0;

    // Supply milestones
    for (const milestone of REWARDS.supplyMilestones) {
      if (finalCleared >= milestone) {
        supplyReward += REWARDS.supplyReward;
      }
    }

    // High score bonus
    if (compositeScore > state.highScore) {
      totalScrap += REWARDS.newHighScoreBonus;
    }

    dispatch({
      type: 'APPLY_RESOURCE_CHANGES',
      payload: { scrap: totalScrap, supplies: supplyReward },
    });
  }, [dispatch, state.playerName, state.highScore]);

  const update = useCallback(() => {
    if (phase !== 'playing') return;

    frameCount.current += 1;
    const tier = currentTierRef.current;
    const speed = getObstacleSpeed(tier);

    // Gravity
    velocity.current += GRAVITY;
    playerY.current += velocity.current;

    // Bounds
    if (playerY.current < 0) {
      playerY.current = 0;
      velocity.current = 0;
    }
    if (playerY.current > GAME_HEIGHT - PLAYER_SIZE) {
      playerY.current = GAME_HEIGHT - PLAYER_SIZE;
      gameOver();
      return;
    }

    // Spawn obstacles (with scaling interval)
    const interval = getSpawnInterval(tier);
    if (frameCount.current % interval === 0) {
      spawnObstacle();
    }

    // Move obstacles
    for (const obs of obstacles.current) {
      obs.x -= speed;

      // Check passing (obstacle cleared)
      if (!obs.passed && obs.x + OBSTACLE_WIDTH < SCREEN_WIDTH / 4) {
        obs.passed = true;
        obstaclesClearedRef.current += 1;
        setObstaclesCleared(obstaclesClearedRef.current);

        // Award scrap for this obstacle
        awardScrap(obstaclesClearedRef.current);

        // Update difficulty tier
        const newTier = getDifficultyTier(obstaclesClearedRef.current);
        if (newTier !== currentTierRef.current) {
          currentTierRef.current = newTier;
          setCurrentTier(newTier);
        }
      }

      // Check collision
      const gapSize = getGapSize(obs.tier);
      const playerLeft = SCREEN_WIDTH / 4 - PLAYER_SIZE / 2;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerTop = playerY.current;
      const playerBottom = playerTop + PLAYER_SIZE;
      const obsLeft = obs.x;
      const obsRight = obs.x + OBSTACLE_WIDTH;

      if (playerRight >= obsLeft && playerLeft <= obsRight) {
        const gapTop = obs.gapY - gapSize / 2;
        const gapBottom = obs.gapY + gapSize / 2;
        if (playerTop < gapTop || playerBottom > gapBottom) {
          gameOver();
          return;
        }
      }
    }

    // Remove off-screen obstacles
    obstacles.current = obstacles.current.filter((obs) => obs.x > -OBSTACLE_WIDTH);

    // Update distance
    distanceRef.current = Math.floor(frameCount.current * 1.5);

    // Update display
    playerAnim.setValue(playerY.current);
    setObstacleState([...obstacles.current]);
    setDistance(distanceRef.current);

    gameLoop.current = requestAnimationFrame(update);
  }, [phase, gameOver, spawnObstacle, awardScrap, playerAnim]);

  const startGame = useCallback(() => {
    resetGame();
    setPhase('playing');
  }, [resetGame]);

  useEffect(() => {
    if (phase === 'playing') {
      gameLoop.current = requestAnimationFrame(update);
    }
    return () => {
      if (gameLoop.current) cancelAnimationFrame(gameLoop.current);
    };
  }, [phase, update]);

  const handleTap = () => {
    if (phase === 'idle') { startGame(); return; }
    if (phase === 'playing') velocity.current = JUMP_FORCE;
  };

  // Tier display names
  const TIER_NAMES = ['Easy', 'Normal', 'Hard', 'Intense', 'Brutal'];
  const TIER_COLORS = [colors.neonGreen, colors.neonCyan, colors.neonAmber, '#FF6B00', colors.neonRed];

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.gameArea}>
          {/* Background grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={`grid-${i}`} style={[styles.gridLine, { top: (GAME_HEIGHT / 8) * (i + 1) }]} />
          ))}

          {/* Player */}
          <Animated.View style={[styles.player, { top: playerAnim, left: SCREEN_WIDTH / 4 - PLAYER_SIZE / 2 }]}>
            <Text style={styles.playerIcon}>{'\uD83D\uDE9B'}</Text>
          </Animated.View>

          {/* Obstacles */}
          {obstacleState.map((obs, i) => {
            const gapSize = getGapSize(obs.tier);
            return (
              <React.Fragment key={i}>
                <View style={[styles.obstacle, { left: obs.x, top: 0, height: obs.gapY - gapSize / 2, width: OBSTACLE_WIDTH }]} />
                <View style={[styles.obstacle, { left: obs.x, top: obs.gapY + gapSize / 2, height: GAME_HEIGHT - (obs.gapY + gapSize / 2), width: OBSTACLE_WIDTH }]} />
              </React.Fragment>
            );
          })}

          {/* HUD */}
          <View style={styles.hud}>
            <Text style={styles.hudDistance}>{distance}m</Text>
            <View style={styles.hudRow}>
              <Text style={styles.hudScrap}>{'\uD83D\uDD29'} {scrapEarned}</Text>
              <Text style={styles.hudObstacles}>{obstaclesCleared} cleared</Text>
            </View>
            {currentTier > 0 && (
              <Text style={[styles.hudTier, { color: TIER_COLORS[currentTier] }]}>
                {TIER_NAMES[currentTier]}
              </Text>
            )}
          </View>

          {/* Scrap Popup */}
          {showScrapPopup && (
            <View style={styles.scrapPopup}>
              <Text style={styles.scrapPopupText}>+{showScrapPopup.amount} {'\uD83D\uDD29'}</Text>
            </View>
          )}

          {/* Idle Overlay */}
          {phase === 'idle' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>TRAIL FLIER</Text>
              <Text style={styles.overlaySubtitle}>Tap to fly. Dodge the debris.</Text>
              <Text style={styles.overlayHint}>Each obstacle cleared = scrap earned</Text>
              <Text style={styles.overlayAction}>TAP TO START</Text>
            </View>
          )}

          {/* Game Over Overlay */}
          {phase === 'gameover' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>TRAIL OVER</Text>
              <Text style={styles.overlayDistance}>{distance}m</Text>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{obstaclesCleared}</Text>
                  <Text style={styles.statLabel}>Cleared</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: colors.neonAmber }]}>{scrapEarned}</Text>
                  <Text style={styles.statLabel}>Scrap</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: TIER_COLORS[currentTier] }]}>
                    {TIER_NAMES[currentTier]}
                  </Text>
                  <Text style={styles.statLabel}>Peak Tier</Text>
                </View>
              </View>

              {/* Milestone rewards */}
              <View style={styles.rewardsSection}>
                {REWARDS.supplyMilestones.map(m => (
                  <View key={m} style={styles.rewardRow}>
                    <Text style={[styles.rewardCheck, { color: obstaclesCleared >= m ? colors.neonGreen : colors.textMuted }]}>
                      {obstaclesCleared >= m ? '\u2713' : '\u2015'}
                    </Text>
                    <Text style={[styles.rewardText, { color: obstaclesCleared >= m ? colors.textPrimary : colors.textMuted }]}>
                      Clear {m} obstacles: +{REWARDS.supplyReward} supplies
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.overButtons}>
                <NeonButton title="Play Again" onPress={startGame} variant="primary" />
                <NeonButton
                  title="Back to Arcade"
                  onPress={() => navigation.goBack()}
                  variant="ghost"
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gameArea: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.surfaceLight + '30' },
  player: { position: 'absolute', width: PLAYER_SIZE, height: PLAYER_SIZE, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  playerIcon: { fontSize: PLAYER_SIZE - 4, transform: [{ scaleX: -1 }] },
  obstacle: { position: 'absolute', backgroundColor: colors.neonRed + '60', borderWidth: 1, borderColor: colors.neonRed + '80', borderRadius: 4 },

  // HUD
  hud: { position: 'absolute', top: spacing.lg, right: spacing.lg, zIndex: 20, alignItems: 'flex-end' },
  hudDistance: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.neonCyan, textShadowColor: colors.neonCyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  hudRow: { flexDirection: 'row', gap: spacing.md, marginTop: 4 },
  hudScrap: { fontSize: fontSize.md, fontWeight: '700', color: colors.neonAmber },
  hudObstacles: { fontSize: fontSize.sm, color: colors.textSecondary },
  hudTier: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1, marginTop: 4 },

  // Scrap popup
  scrapPopup: { position: 'absolute', top: GAME_HEIGHT / 2 - 40, left: SCREEN_WIDTH / 4 + 30, zIndex: 25 },
  scrapPopupText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.neonAmber, textShadowColor: colors.neonAmber, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  overlayTitle: { fontSize: fontSize.hero, fontWeight: '700', color: colors.neonGreen, letterSpacing: 4, textShadowColor: colors.neonGreen, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  overlaySubtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm },
  overlayHint: { fontSize: fontSize.sm, color: colors.neonAmber, marginTop: spacing.xs },
  overlayAction: { fontSize: fontSize.lg, color: colors.neonAmber, fontWeight: '600', marginTop: spacing.xl, letterSpacing: 2 },
  overlayDistance: { fontSize: 56, fontWeight: '700', color: colors.neonCyan, marginTop: spacing.md },

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.lg },
  statBox: { alignItems: 'center', minWidth: 70 },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Rewards
  rewardsSection: { marginTop: spacing.md, width: 260 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: 3 },
  rewardCheck: { fontSize: fontSize.md, fontWeight: '700', width: 20, textAlign: 'center' },
  rewardText: { fontSize: fontSize.sm },

  // Buttons
  overButtons: { marginTop: spacing.lg, width: 200, alignItems: 'center' },
});
