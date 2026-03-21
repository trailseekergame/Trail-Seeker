import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { resolveScan, getEffectiveWhiffRate } from '../../systems/scanEngine';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import SkillCheck from '../../components/trail/SkillCheck';
import { ScanType, ScanResult, ScanOutcome, SectorTile } from '../../types';
import { trackScan, trackGearLoadout, trackSession } from '../../services/analytics';
import { logSessionSummary, logGambitResult } from '../../systems/sessionLogger';

// ─── Constants ───

const SCAN_COLORS: Record<ScanType, string> = {
  scout: '#4A9EFF',
  seeker: colors.neonGreen,
  gambit: colors.neonRed,
};

const SCAN_LABELS: Record<ScanType, { name: string; flavor: string; desc: string }> = {
  scout: { name: 'SCOUT', flavor: 'Safe', desc: 'Steady loot, almost no risk' },
  seeker: { name: 'SEEKER', flavor: 'Balanced', desc: 'Better loot, some risk' },
  gambit: { name: 'GAMBIT', flavor: 'High risk', desc: 'Best loot or nothing' },
};

const TILE_ICONS: Record<string, string> = {
  unknown: '?',
  resource: '◆',
  anomaly: '△',
  boss: '☠',
  cleared: '✓',
};

const OUTCOME_DISPLAY: Record<string, { banner: string; color: string; icon: string }> = {
  whiff: { banner: 'Nothing Found', color: colors.neonRed, icon: '✕' },
  common: { banner: 'Standard Haul', color: colors.textSecondary, icon: '▪' },
  uncommon: { banner: 'Solid Find', color: colors.neonCyan, icon: '◈' },
  rare: { banner: 'Rare Signal', color: colors.neonGreen, icon: '◇' },
  legendary: { banner: 'Jackpot', color: '#FFD700', icon: '★' },
  component: { banner: 'Relic Detected', color: colors.neonPurple, icon: '⬡' },
};

// ─── Resolving animation durations ───
const RESOLVE_DURATION: Record<ScanType, number> = {
  scout: 1500,
  seeker: 1800,
  gambit: 2500,
};

const RESOLVE_PHRASES: Record<ScanType, string[]> = {
  scout: ['Pinging sector...', 'Signal acquired'],
  seeker: ['Scanning deeper...', 'Locking frequency...', 'Processing'],
  gambit: ['Rolling the dice...', 'Surge detected...', 'Signal volatile!'],
};

// ─── Loot tier upgrade map for Gambit skill check success ───
const TIER_UPGRADE: Partial<Record<ScanOutcome, ScanOutcome>> = {
  common: 'uncommon',
  uncommon: 'rare',
  rare: 'legendary',
};

export default function ScanScreen() {
  const { state, dispatch } = useGame();
  const nav = useNavigation<any>();
  const ss = state.seekerScans;

  const [selectedScan, setSelectedScan] = useState<ScanType>('seeker');
  const [selectedTile, setSelectedTile] = useState<SectorTile | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<ScanOutcome | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvePhrase, setResolvePhrase] = useState('');
  const [showSkillCheck, setShowSkillCheck] = useState(false);
  const sessionStartRef = useRef(ss.sessionStartTime);

  // Resolving animation values
  const resolvePulse = useRef(new Animated.Value(1)).current;
  const resolveOpacity = useRef(new Animated.Value(0)).current;
  const gambitShake = useRef(new Animated.Value(0)).current;
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
      if (phraseTimerRef.current) clearInterval(phraseTimerRef.current);
    };
  }, []);

  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;
  const totalTiles = ss.currentSector.tiles.length;
  const gridSize = ss.currentSector.gridSize || 5;

  // ─── Effective whiff rates (live with gear + streak) ───
  const whiffRates: Record<ScanType, number> = {
    scout: getEffectiveWhiffRate('scout', ss.streakDay, ss.activeGearSlots, ss.gearInventory),
    seeker: getEffectiveWhiffRate('seeker', ss.streakDay, ss.activeGearSlots, ss.gearInventory),
    gambit: getEffectiveWhiffRate('gambit', ss.streakDay, ss.activeGearSlots, ss.gearInventory),
  };

  // ─── Tile fog-of-war ───
  const isTileScannable = useCallback((tile: SectorTile): boolean => {
    if (tile.cleared) return false;
    // Boss tile requires all other tiles cleared
    if (tile.type === 'boss') {
      const nonBossTiles = ss.currentSector.tiles.filter(t => t.type !== 'boss');
      return nonBossTiles.every(t => t.cleared);
    }
    return tile.adjacentTo.some(adjId => {
      const adj = ss.currentSector.tiles.find(t => t.id === adjId);
      return adj?.cleared === true;
    });
  }, [ss.currentSector.tiles]);

  // ─── Gear influence hints ───
  const getGearHints = (scanType: ScanType): string[] => {
    const hints: string[] = [];
    if (ss.activeGearSlots.includes('grip_gauntlets') && scanType !== 'scout') {
      hints.push('▽ Gauntlets: Safer');
    }
    if (ss.activeGearSlots.includes('optics_rig')) {
      hints.push('◎ Optics: Better Loot');
    }
    if (scanType === 'gambit' && ss.activeGearSlots.includes('cortex_link')) {
      hints.push('⟁ Cortex: Boosted');
    }
    if (ss.activeGearSlots.includes('salvage_drone')) {
      hints.push('↻ Drone: Backup');
    }
    if (ss.activeGearSlots.includes('nav_boots')) {
      hints.push('⇥ Boots: +Progress');
    }
    return hints;
  };

  // ─── Tile tap → select tile ───
  const handleTileSelect = (tile: SectorTile) => {
    if (ss.scansRemaining <= 0 || tile.cleared || !isTileScannable(tile)) return;
    setSelectedTile(tile);
    setShowConfirm(true);
  };

  // ─── Start resolving animation ───
  const startResolvingAnimation = (scanType: ScanType) => {
    setIsResolving(true);
    resolveOpacity.setValue(0);
    resolvePulse.setValue(1);
    gambitShake.setValue(0);

    // Fade in overlay
    Animated.timing(resolveOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Pulsing glow effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(resolvePulse, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(resolvePulse, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Gambit shake effect
    if (scanType === 'gambit') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(gambitShake, { toValue: 4, duration: 50, useNativeDriver: true }),
          Animated.timing(gambitShake, { toValue: -4, duration: 50, useNativeDriver: true }),
          Animated.timing(gambitShake, { toValue: 3, duration: 50, useNativeDriver: true }),
          Animated.timing(gambitShake, { toValue: -3, duration: 50, useNativeDriver: true }),
          Animated.timing(gambitShake, { toValue: 0, duration: 50, useNativeDriver: true }),
          Animated.delay(200),
        ])
      ).start();
    }

    // Cycle phrases
    const phrases = RESOLVE_PHRASES[scanType];
    setResolvePhrase(phrases[0]);
    let idx = 0;
    const phraseInterval = Math.floor(RESOLVE_DURATION[scanType] / phrases.length);
    phraseTimerRef.current = setInterval(() => {
      idx++;
      if (idx < phrases.length) {
        setResolvePhrase(phrases[idx]);
      }
    }, phraseInterval);
  };

  const stopResolvingAnimation = () => {
    setIsResolving(false);
    resolvePulse.stopAnimation();
    gambitShake.stopAnimation();
    resolveOpacity.setValue(0);
    if (phraseTimerRef.current) {
      clearInterval(phraseTimerRef.current);
      phraseTimerRef.current = null;
    }
  };

  // ─── Confirm scan → resolve with animation ───
  const handleConfirmScan = () => {
    if (!selectedTile) return;
    setShowConfirm(false);

    const result = resolveScan(selectedScan, selectedTile.id, ss);
    dispatch({ type: 'USE_SCAN', payload: result });

    if (result.outcome !== 'whiff') {
      dispatch({ type: 'CLEAR_TILE', payload: selectedTile.id });
    }

    // Analytics
    trackScan(
      selectedScan,
      result.outcome,
      selectedTile.type === 'cleared' ? 'unknown' : selectedTile.type as any,
      'rustbelt_outskirts',
      result.droneProc,
      result.bootsProc,
      ss.streakDay,
    );

    // Log Gambit results for balancing
    logGambitResult(result, ss.streakDay, ss.activeGearSlots);

    setLastResult(result);
    setDisplayOutcome(result.outcome);

    // Check session end
    const remaining = result.droneProc ? ss.scansRemaining : ss.scansRemaining - 1;
    if (remaining <= 0) {
      setSessionDone(true);
    }

    // Start resolving animation
    startResolvingAnimation(selectedScan);

    resolveTimerRef.current = setTimeout(() => {
      stopResolvingAnimation();

      // Gambit non-whiff → skill check before showing result
      if (selectedScan === 'gambit' && result.outcome !== 'whiff') {
        setShowSkillCheck(true);
      } else {
        setShowResult(true);
      }

      setSelectedTile(null);
    }, RESOLVE_DURATION[selectedScan]);
  };

  // ─── Gambit skill check result handler ───
  const handleGambitSkillCheck = (success: boolean) => {
    setShowSkillCheck(false);
    if (success && lastResult) {
      const upgraded = TIER_UPGRADE[lastResult.outcome];
      if (upgraded) {
        setDisplayOutcome(upgraded);
      }
    }
    setShowResult(true);
  };

  // ─── Dismiss result ───
  const handleNextScan = () => {
    setShowResult(false);
    setLastResult(null);
    setDisplayOutcome(null);
  };

  // ─── Session complete ───
  const handleSessionComplete = () => {
    const scansUsed = ss.sessionResults.length + 1; // +1 for current
    const durationSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    trackGearLoadout(ss.activeGearSlots);
    trackSession(ss.scansTotal, scansUsed, ss.streakDay, durationSec, ss.sectorsCompleted);

    // Log session summary for balancing
    logSessionSummary(ss);

    setShowResult(false);
    nav.goBack();
  };

  const remainingAfterLast = lastResult
    ? (lastResult.droneProc ? ss.scansRemaining : Math.max(0, ss.scansRemaining - 1))
    : ss.scansRemaining;

  return (
    <ScreenWrapper padded={false}>
      {/* ─── TOP BAR ─── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.sectorName}>{ss.currentSector.name}</Text>
          <Text style={styles.tilesCount}>{tilesCleared}/{totalTiles} tiles cleared</Text>
        </View>
        <View style={styles.topBarRight}>
          <Text style={styles.scansRemaining}>
            <Text style={styles.scansNumber}>{ss.scansRemaining}</Text> scans
          </Text>
          <View style={styles.scanTypeIcons}>
            <View style={[styles.scanTypeDot, { backgroundColor: SCAN_COLORS.scout }]} />
            <View style={[styles.scanTypeDot, { backgroundColor: SCAN_COLORS.seeker }]} />
            <View style={[styles.scanTypeDot, { backgroundColor: SCAN_COLORS.gambit }]} />
          </View>
        </View>
      </View>

      {/* ─── 5x5 SECTOR GRID with path connectors ─── */}
      <View style={styles.gridContainer}>
        <View style={styles.gridInner}>
          {/* Path connectors (rendered behind tiles) */}
          {ss.currentSector.tiles.map(tile => {
            if (!tile.cleared) return null;
            return tile.adjacentTo.map(adjId => {
              const adj = ss.currentSector.tiles.find(t => t.id === adjId);
              if (!adj) return null;
              // Only draw right and down connectors to avoid duplicates
              if (adj.row < tile.row || adj.col < tile.col) return null;
              const isAdjActive = adj.cleared || isTileScannable(adj);
              if (!isAdjActive) return null;

              const TILE_SIZE = 54;
              const GAP = 4; // margin * 2
              const isHorizontal = adj.row === tile.row;

              if (isHorizontal) {
                return (
                  <View
                    key={`conn-${tile.id}-${adjId}`}
                    style={{
                      position: 'absolute',
                      left: tile.col * (TILE_SIZE + GAP) + TILE_SIZE,
                      top: tile.row * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 1,
                      width: GAP,
                      height: 2,
                      backgroundColor: adj.cleared ? colors.neonGreen + '40' : colors.neonGreen + '25',
                    }}
                  />
                );
              } else {
                return (
                  <View
                    key={`conn-${tile.id}-${adjId}`}
                    style={{
                      position: 'absolute',
                      left: tile.col * (TILE_SIZE + GAP) + TILE_SIZE / 2 - 1,
                      top: tile.row * (TILE_SIZE + GAP) + TILE_SIZE,
                      width: 2,
                      height: GAP,
                      backgroundColor: adj.cleared ? colors.neonGreen + '40' : colors.neonGreen + '25',
                    }}
                  />
                );
              }
            });
          })}

          {/* Tiles */}
          {Array.from({ length: gridSize }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: gridSize }, (_, col) => {
                const tile = ss.currentSector.tiles.find(t => t.row === row && t.col === col);
                if (!tile) return <View key={col} style={styles.tileEmpty} />;

                const scannable = isTileScannable(tile);
                const isCleared = tile.cleared;
                const isSelected = selectedTile?.id === tile.id;

                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.tile,
                      isCleared && styles.tileCleared,
                      scannable && styles.tileScannable,
                      !scannable && !isCleared && styles.tileFog,
                      isSelected && styles.tileSelected,
                    ]}
                    onPress={() => handleTileSelect(tile)}
                    disabled={!scannable || ss.scansRemaining <= 0}
                    activeOpacity={0.6}
                  >
                    <Text style={[
                      styles.tileIcon,
                      isCleared && styles.tileClearedIcon,
                      scannable && { color: colors.neonGreen },
                      tile.type === 'boss' && scannable && { color: colors.neonRed },
                      tile.type === 'anomaly' && scannable && { color: colors.neonAmber },
                      tile.type === 'resource' && scannable && { color: colors.neonCyan },
                    ]}>
                      {isCleared ? TILE_ICONS.cleared : scannable ? TILE_ICONS[tile.type] : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* ─── SCAN TYPE BUTTONS (bottom) ─── */}
      <View style={styles.bottomSection}>
        {/* Gear influence chips */}
        <View style={styles.gearHints}>
          {getGearHints(selectedScan).map((hint, i) => (
            <Text key={i} style={styles.gearHintText}>{hint}</Text>
          ))}
        </View>

        <View style={styles.scanButtonRow}>
          {(['scout', 'seeker', 'gambit'] as ScanType[]).map(type => {
            const isSelected = selectedScan === type;
            const whiffPct = Math.round(whiffRates[type] * 100);
            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.scanButton,
                  {
                    borderColor: SCAN_COLORS[type],
                    backgroundColor: isSelected ? SCAN_COLORS[type] + '20' : colors.surface,
                  },
                ]}
                onPress={() => setSelectedScan(type)}
                activeOpacity={0.7}
              >
                <Text style={[styles.scanButtonLabel, { color: SCAN_COLORS[type] }]}>
                  {SCAN_LABELS[type].name}
                </Text>
                <Text style={styles.scanButtonOdds}>
                  {whiffPct}% miss
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Session stats bar */}
        {ss.sessionResults.length > 0 && (
          <View style={styles.sessionBar}>
            <Text style={styles.sessionBarText}>
              {ss.sessionResults.length} scans · {ss.sessionResults.filter(r => r.outcome === 'whiff').length} whiffs · 
              {ss.sessionResults.filter(r => ['rare', 'legendary', 'component'].includes(r.outcome)).length} rare+
            </Text>
          </View>
        )}
      </View>

      {/* ─── CONFIRMATION POPUP ─── */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>
              {SCAN_LABELS[selectedScan].name} Scan
            </Text>
            <Text style={styles.confirmDesc}>
              {SCAN_LABELS[selectedScan].desc}
            </Text>
            <Text style={styles.confirmTile}>
              {selectedTile?.type === 'boss' ? '☠ Boss Tile' :
               selectedTile?.type === 'anomaly' ? '△ Anomaly' :
               selectedTile?.type === 'resource' ? '◆ Resource' :
               '? Unknown'}
            </Text>
            <Text style={[styles.confirmWhiff, { color: SCAN_COLORS[selectedScan] }]}>
              {Math.round(whiffRates[selectedScan] * 100)}% miss chance
            </Text>
            <View style={styles.confirmButtons}>
              <NeonButton
                title="Scan"
                onPress={handleConfirmScan}
                variant="primary"
                style={styles.confirmBtn}
              />
              <NeonButton
                title="Cancel"
                onPress={() => { setShowConfirm(false); setSelectedTile(null); }}
                variant="ghost"
                style={styles.confirmBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── RESOLVING OVERLAY ─── */}
      {isResolving && (
        <Animated.View style={[styles.resolvingOverlay, { opacity: resolveOpacity }]}>
          <Animated.View
            style={[
              styles.resolvingContent,
              {
                transform: [
                  { scale: resolvePulse },
                  { translateX: selectedScan === 'gambit' ? gambitShake : 0 },
                ],
              },
            ]}
          >
            <View style={[styles.resolvingIcon, { borderColor: SCAN_COLORS[selectedScan] }]}>
              <Text style={[styles.resolvingIconText, { color: SCAN_COLORS[selectedScan] }]}>
                ⟐
              </Text>
            </View>
            <Text style={[styles.resolvingText, { color: SCAN_COLORS[selectedScan] }]}>
              {resolvePhrase}
            </Text>
            <View style={styles.resolvingDots}>
              <Text style={[styles.resolvingDotsText, { color: SCAN_COLORS[selectedScan] + '80' }]}>
                ●  ●  ●
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ─── GAMBIT SKILL CHECK ─── */}
      <Modal visible={showSkillCheck} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.skillCheckCard}>
            <Text style={styles.skillCheckTitle}>GAMBIT BONUS</Text>
            <Text style={styles.skillCheckDesc}>Lock the signal to upgrade your loot!</Text>
            <SkillCheck speed="fast" onResult={handleGambitSkillCheck} />
          </View>
        </View>
      </Modal>

      {/* ─── RESULT POPUP ─── */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            {lastResult && (() => {
              const effectiveOutcome = displayOutcome || lastResult.outcome;
              const display = OUTCOME_DISPLAY[effectiveOutcome];
              return (
                <>
                  {/* Scan type badge */}
                  <View style={[styles.resultTypeBadge, { backgroundColor: SCAN_COLORS[lastResult.scanType] + '30', borderColor: SCAN_COLORS[lastResult.scanType] }]}>
                    <Text style={[styles.resultTypeBadgeText, { color: SCAN_COLORS[lastResult.scanType] }]}>
                      {SCAN_LABELS[lastResult.scanType].name}
                    </Text>
                  </View>

                  {/* Outcome icon + banner */}
                  <Text style={styles.resultIcon}>{display.icon}</Text>
                  <Text style={[styles.resultBanner, { color: display.color }]}>
                    {display.banner}
                  </Text>

                  {/* Upgraded badge (Gambit skill check success) */}
                  {displayOutcome && displayOutcome !== lastResult.outcome && (
                    <View style={styles.upgradedBadge}>
                      <Text style={styles.upgradedBadgeText}>⬆ UPGRADED</Text>
                    </View>
                  )}

                  {/* Loot with rarity label */}
                  {lastResult.lootName && (
                    <Text style={[styles.resultLoot, { color: display.color }]}>
                      {effectiveOutcome.charAt(0).toUpperCase() + effectiveOutcome.slice(1)}: {lastResult.lootName}
                    </Text>
                  )}

                  {/* Whiff guidance */}
                  {effectiveOutcome === 'whiff' && (
                    <Text style={styles.whiffHint}>
                      The signal faded. Try a safer scan type or a different tile.
                    </Text>
                  )}

                  {/* Sector progress */}
                  {effectiveOutcome !== 'whiff' && lastResult.sectorProgress > 0 && (
                    <View style={styles.resultProgressRow}>
                      <Text style={styles.resultProgress}>
                        +{lastResult.sectorProgress} tile{lastResult.sectorProgress > 1 ? 's' : ''} cleared
                      </Text>
                    </View>
                  )}

                  {/* Gear procs */}
                  <View style={styles.procsContainer}>
                    {lastResult.droneProc && (
                      <Text style={[styles.procText, { color: colors.neonAmber }]}>
                        ↻ Drone recovered your Scan!
                      </Text>
                    )}
                    {lastResult.bootsProc && (
                      <Text style={[styles.procText, { color: colors.neonCyan }]}>
                        ⇥ Boots found a shortcut!
                      </Text>
                    )}
                    {lastResult.cortexProc && (
                      <Text style={[styles.procText, { color: colors.neonPurple }]}>
                        ⟁ Cortex amplified the Gambit!
                      </Text>
                    )}
                    {lastResult.opticsProc && (
                      <Text style={[styles.procText, { color: colors.neonGreen }]}>
                        ◎ Optics locked a rare signal!
                      </Text>
                    )}
                  </View>

                  {/* Action button */}
                  <View style={styles.resultActions}>
                    {sessionDone ? (
                      <NeonButton
                        title="Finish Today's Run"
                        onPress={handleSessionComplete}
                        size="lg"
                      />
                    ) : (
                      <NeonButton
                        title={`Next Scan • ${remainingAfterLast} left`}
                        onPress={handleNextScan}
                        variant="secondary"
                        size="lg"
                      />
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Top Bar ───
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
    backgroundColor: colors.surface,
  },
  topBarLeft: {},
  topBarRight: { alignItems: 'flex-end' },
  sectorName: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  tilesCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  scansRemaining: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scansNumber: {
    fontSize: fontSize.xl,
    color: colors.neonGreen,
    fontWeight: '700',
  },
  scanTypeIcons: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  scanTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ─── Grid ───
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  gridInner: {
    position: 'relative',
  },
  gridRow: {
    flexDirection: 'row',
  },
  tile: {
    width: 54,
    height: 54,
    margin: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCleared: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.surfaceLight,
  },
  tileScannable: {
    borderColor: colors.neonGreen + '80',
    backgroundColor: colors.surface,
  },
  tileFog: {
    backgroundColor: colors.background,
    borderColor: colors.background,
    opacity: 0.3,
  },
  tileSelected: {
    borderColor: colors.neonAmber,
    borderWidth: 2,
    backgroundColor: colors.neonAmber + '15',
  },
  tileEmpty: {
    width: 54,
    height: 54,
    margin: 2,
  },
  tileIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  tileClearedIcon: {
    color: colors.textMuted,
    opacity: 0.5,
  },

  // ─── Bottom Section ───
  bottomSection: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    backgroundColor: colors.surface,
  },
  gearHints: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    minHeight: 24,
  },
  gearHintText: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  scanButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  scanButtonLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },
  scanButtonOdds: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionBar: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  sessionBarText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // ─── Confirmation Popup ───
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  confirmDesc: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  confirmTile: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  confirmWhiff: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
  },

  // ─── Result Popup ───
  resultCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultTypeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  resultTypeBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  resultIcon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  resultBanner: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  resultLoot: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  resultProgressRow: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  resultProgress: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '600',
  },
  whiffHint: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  procsContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  procText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginVertical: 2,
  },
  resultActions: {
    marginTop: spacing.md,
    width: '100%',
    alignItems: 'center',
  },
  upgradedBadge: {
    backgroundColor: colors.neonGreen + '20',
    borderWidth: 1,
    borderColor: colors.neonGreen,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
    alignSelf: 'center',
  },
  upgradedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ─── Resolving Overlay ───
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  resolvingContent: {
    alignItems: 'center',
  },
  resolvingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  resolvingIconText: {
    fontSize: 28,
  },
  resolvingText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  resolvingDots: {
    marginTop: spacing.sm,
  },
  resolvingDotsText: {
    fontSize: fontSize.md,
    letterSpacing: 4,
  },

  // ─── Gambit Skill Check ───
  skillCheckCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neonRed + '60',
    padding: spacing.xl,
    alignItems: 'center',
  },
  skillCheckTitle: {
    fontSize: fontSize.xs,
    color: colors.neonRed,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  skillCheckDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
