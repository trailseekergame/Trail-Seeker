import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { useGame } from '../../context/GameContext';
import NeonButton from '../../components/common/NeonButton';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GAME_HEIGHT = SCREEN_HEIGHT - 200;
const PLAYER_SIZE = 30;
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const OBSTACLE_WIDTH = 50;
const GAP_SIZE = 150;
const OBSTACLE_SPEED = 3;
const SPAWN_INTERVAL = 90; // frames

interface Obstacle {
  x: number;
  gapY: number;
  passed: boolean;
}

type GamePhase = 'idle' | 'playing' | 'gameover';

export default function MiniGameScreen({ navigation }: any) {
  const { state, dispatch } = useGame();
  const [phase, setPhase] = useState<GamePhase>('idle');
  const [distance, setDistance] = useState(0);
  const [collisions, setCollisions] = useState(0);

  // Game state refs (not React state, for performance)
  const playerY = useRef(GAME_HEIGHT / 2);
  const velocity = useRef(0);
  const obstacles = useRef<Obstacle[]>([]);
  const frameCount = useRef(0);
  const distanceRef = useRef(0);
  const collisionsRef = useRef(0);
  const gameLoop = useRef<number | null>(null);

  // Animated values for display
  const playerAnim = useRef(new Animated.Value(GAME_HEIGHT / 2)).current;
  const [obstacleState, setObstacleState] = useState<Obstacle[]>([]);

  const resetGame = useCallback(() => {
    playerY.current = GAME_HEIGHT / 2;
    velocity.current = 0;
    obstacles.current = [];
    frameCount.current = 0;
    distanceRef.current = 0;
    collisionsRef.current = 0;
    playerAnim.setValue(GAME_HEIGHT / 2);
    setDistance(0);
    setCollisions(0);
    setObstacleState([]);
  }, [playerAnim]);

  const spawnObstacle = useCallback(() => {
    const minGapY = GAP_SIZE / 2 + 40;
    const maxGapY = GAME_HEIGHT - GAP_SIZE / 2 - 40;
    const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
    obstacles.current.push({ x: SCREEN_WIDTH, gapY, passed: false });
  }, []);

  const checkCollision = useCallback(
    (pY: number, obs: Obstacle): boolean => {
      const playerLeft = SCREEN_WIDTH / 4 - PLAYER_SIZE / 2;
      const playerRight = playerLeft + PLAYER_SIZE;
      const playerTop = pY;
      const playerBottom = pY + PLAYER_SIZE;

      const obsLeft = obs.x;
      const obsRight = obs.x + OBSTACLE_WIDTH;

      // Check if horizontally overlapping
      if (playerRight < obsLeft || playerLeft > obsRight) return false;

      // Check if in the gap
      const gapTop = obs.gapY - GAP_SIZE / 2;
      const gapBottom = obs.gapY + GAP_SIZE / 2;

      return playerTop < gapTop || playerBottom > gapBottom;
    },
    []
  );

  const gameOver = useCallback(() => {
    if (gameLoop.current) {
      cancelAnimationFrame(gameLoop.current);
      gameLoop.current = null;
    }
    setPhase('gameover');

    const finalDistance = distanceRef.current;
    const finalCollisions = collisionsRef.current;
    const efficiency = finalCollisions === 0 ? finalDistance : Math.floor(finalDistance / (finalCollisions + 1));
    const compositeScore = finalDistance + efficiency;

    // Add leaderboard entry
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

    // Rewards
    let scrapReward = 1;
    let supplyReward = 0;
    if (finalDistance >= 1000) {
      scrapReward = 5;
      supplyReward = 2;
    } else if (finalDistance >= 500) {
      scrapReward = 3;
    }
    if (compositeScore > state.highScore) {
      supplyReward += 3;
    }

    dispatch({
      type: 'APPLY_RESOURCE_CHANGES',
      payload: { scrap: scrapReward, supplies: supplyReward },
    });
  }, [dispatch, state.playerName, state.highScore]);

  const update = useCallback(() => {
    if (phase !== 'playing') return;

    frameCount.current += 1;

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

    // Spawn obstacles
    if (frameCount.current % SPAWN_INTERVAL === 0) {
      spawnObstacle();
    }

    // Move obstacles
    for (const obs of obstacles.current) {
      obs.x -= OBSTACLE_SPEED;

      // Check passing
      if (!obs.passed && obs.x + OBSTACLE_WIDTH < SCREEN_WIDTH / 4) {
        obs.passed = true;
        distanceRef.current += 100;
      }

      // Check collision
      if (checkCollision(playerY.current, obs)) {
        collisionsRef.current += 1;
        gameOver();
        return;
      }
    }

    // Remove off-screen obstacles
    obstacles.current = obstacles.current.filter((obs) => obs.x > -OBSTACLE_WIDTH);

    // Update distance based on frame
    distanceRef.current = Math.floor(frameCount.current * 1.5);

    // Update animated values
    playerAnim.setValue(playerY.current);
    setObstacleState([...obstacles.current]);
    setDistance(distanceRef.current);

    gameLoop.current = requestAnimationFrame(update);
  }, [phase, gameOver, spawnObstacle, checkCollision, playerAnim]);

  const startGame = useCallback(() => {
    resetGame();
    setPhase('playing');
  }, [resetGame]);

  // Start game loop when phase changes to playing
  useEffect(() => {
    if (phase === 'playing') {
      gameLoop.current = requestAnimationFrame(update);
    }
    return () => {
      if (gameLoop.current) {
        cancelAnimationFrame(gameLoop.current);
      }
    };
  }, [phase, update]);

  const handleTap = () => {
    if (phase === 'idle') {
      startGame();
      return;
    }
    if (phase === 'playing') {
      velocity.current = JUMP_FORCE;
    }
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.gameArea}>
          {/* Background grid lines */}
          {Array.from({ length: 8 }).map((_, i) => (
            <View
              key={`grid-${i}`}
              style={[
                styles.gridLine,
                { top: (GAME_HEIGHT / 8) * (i + 1) },
              ]}
            />
          ))}

          {/* Player */}
          <Animated.View
            style={[
              styles.player,
              {
                top: playerAnim,
                left: SCREEN_WIDTH / 4 - PLAYER_SIZE / 2,
              },
            ]}
          >
            <Text style={styles.playerIcon}>🛸</Text>
          </Animated.View>

          {/* Obstacles */}
          {obstacleState.map((obs, i) => (
            <React.Fragment key={i}>
              {/* Top obstacle */}
              <View
                style={[
                  styles.obstacle,
                  {
                    left: obs.x,
                    top: 0,
                    height: obs.gapY - GAP_SIZE / 2,
                    width: OBSTACLE_WIDTH,
                  },
                ]}
              />
              {/* Bottom obstacle */}
              <View
                style={[
                  styles.obstacle,
                  {
                    left: obs.x,
                    top: obs.gapY + GAP_SIZE / 2,
                    height: GAME_HEIGHT - (obs.gapY + GAP_SIZE / 2),
                    width: OBSTACLE_WIDTH,
                  },
                ]}
              />
            </React.Fragment>
          ))}

          {/* HUD */}
          <View style={styles.hud}>
            <Text style={styles.hudDistance}>{distance}m</Text>
          </View>

          {/* Idle Overlay */}
          {phase === 'idle' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>TRAIL FLIER</Text>
              <Text style={styles.overlaySubtitle}>
                Tap to fly. Dodge the debris.
              </Text>
              <Text style={styles.overlayAction}>TAP TO START</Text>
            </View>
          )}

          {/* Game Over Overlay */}
          {phase === 'gameover' && (
            <View style={styles.overlay}>
              <Text style={styles.overlayTitle}>TRAIL OVER</Text>
              <Text style={styles.overlayDistance}>{distance}m</Text>
              <Text style={styles.overlaySubtitle}>
                Collisions: {collisions}
              </Text>
              <View style={styles.overButtons}>
                <NeonButton
                  title="Play Again"
                  onPress={startGame}
                  variant="primary"
                />
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gameArea: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.surfaceLight + '30',
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  playerIcon: {
    fontSize: PLAYER_SIZE - 4,
  },
  obstacle: {
    position: 'absolute',
    backgroundColor: colors.neonRed + '60',
    borderWidth: 1,
    borderColor: colors.neonRed + '80',
    borderRadius: 4,
  },
  hud: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
  },
  hudDistance: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.neonCyan,
    textShadowColor: colors.neonCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  overlayTitle: {
    fontSize: fontSize.hero,
    fontWeight: '700',
    color: colors.neonGreen,
    letterSpacing: 4,
    textShadowColor: colors.neonGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  overlaySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  overlayAction: {
    fontSize: fontSize.lg,
    color: colors.neonAmber,
    fontWeight: '600',
    marginTop: spacing.xl,
    letterSpacing: 2,
  },
  overlayDistance: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.neonCyan,
    marginTop: spacing.md,
  },
  overButtons: {
    marginTop: spacing.xl,
    width: 200,
  },
});
