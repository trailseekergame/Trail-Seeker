import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { resolveScan } from '../../systems/scanEngine';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { ScanType, ScanResult, SectorTile } from '../../types';
import { trackScan, trackGearLoadout, trackSession } from '../../services/analytics';

const SCAN_COLORS: Record<ScanType, string> = {
  scout: '#4A9EFF',
  seeker: colors.neonGreen,
  gambit: colors.neonRed,
};

const SCAN_LABELS: Record<ScanType, string> = {
  scout: 'SCOUT',
  seeker: 'SEEKER',
  gambit: 'GAMBIT',
};

const TILE_ICONS: Record<string, string> = {
  unknown: '?',
  resource: '\u26CF',
  anomaly: '\u26A0',
  boss: '\uD83D\uDC80',
  cleared: '\u2713',
};

const OUTCOME_CONFIG: Record<string, { banner: string; color: string }> = {
  whiff: { banner: 'Signal Lost', color: colors.neonRed },
  common: { banner: 'Standard Haul', color: colors.textSecondary },
  uncommon: { banner: 'Solid Find', color: colors.neonCyan },
  rare: { banner: 'Rare Signal', color: colors.neonGreen },
  legendary: { banner: 'Jackpot', color: '#FFD700' },
  component: { banner: 'Relic Detected', color: colors.neonPurple },
};

export default function ScanScreen() {
  const { state, dispatch } = useGame();
  const nav = useNavigation<any>();
  const ss = state.seekerScans;

  const [selectedScan, setSelectedScan] = useState<ScanType>('seeker');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const sessionStartRef = useRef(ss.sessionStartTime);

  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;

  // A tile is scannable if it is NOT cleared and is adjacent to at least one cleared tile
  const isTileScannable = useCallback((tile: SectorTile): boolean => {
    if (tile.cleared) return false;
    return tile.adjacentTo.some(adjId => {
      const adj = ss.currentSector.tiles.find(t => t.id === adjId);
      return adj?.cleared === true;
    });
  }, [ss.currentSector.tiles]);

  const handleTileTap = useCallback((tile: SectorTile) => {
    if (ss.scansRemaining <= 0 || tile.cleared || !isTileScannable(tile)) return;

    const result = resolveScan(selectedScan, tile.id, ss);
    dispatch({ type: 'USE_SCAN', payload: result });

    if (result.outcome !== 'whiff') {
      dispatch({ type: 'CLEAR_TILE', payload: tile.id });
    }

    // Track analytics
    trackScan(
      selectedScan,
      result.outcome,
      tile.type === 'cleared' ? 'unknown' : tile.type as any,
      'rustbelt_outskirts',
      result.droneProc,
      result.bootsProc,
      ss.streakDay,
    );

    setLastResult(result);
    setShowResult(true);

    // Check if session done after this scan
    const remaining = result.droneProc ? ss.scansRemaining : ss.scansRemaining - 1;
    if (remaining <= 0) {
      setSessionDone(true);
    }
  }, [ss, selectedScan, dispatch, isTileScannable]);

  const handleNextScan = () => {
    setShowResult(false);
    setLastResult(null);
  };

  const handleSessionComplete = () => {
    const scansUsed = ss.scansTotal - (ss.scansRemaining - (lastResult?.droneProc ? 0 : 1));
    const durationSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    trackGearLoadout(ss.activeGearSlots);
    trackSession(ss.scansTotal, scansUsed, ss.streakDay, durationSec, ss.sectorsCompleted);
    setShowResult(false);
    nav.goBack();
  };

  // Gear influence text for selected scan
  const getGearInfluence = (scanType: ScanType): string[] => {
    const hints: string[] = [];
    if (ss.activeGearSlots.includes('grip_gauntlets')) hints.push('Gauntlets: Safer');
    if (ss.activeGearSlots.includes('optics_rig')) hints.push('Optics: Better Loot');
    if (scanType === 'gambit' && ss.activeGearSlots.includes('cortex_link')) hints.push('Cortex: Boosted');
    if (ss.activeGearSlots.includes('salvage_drone')) hints.push('Drone: Backup');
    if (ss.activeGearSlots.includes('nav_boots')) hints.push('Boots: +Progress');
    return hints;
  };

  const gridSize = ss.currentSector.gridSize || 5;

  return (
    <ScreenWrapper>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{ss.currentSector.name}</Text>
          <Text style={styles.scansLeft}>
            <Text style={styles.scansLeftNum}>{ss.scansRemaining}</Text> scans left
          </Text>
        </View>

        {/* Scan Type Selector */}
        <View style={styles.scanTypeRow}>
          {(['scout', 'seeker', 'gambit'] as ScanType[]).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.scanTypeBtn,
                {
                  borderColor: SCAN_COLORS[type],
                  backgroundColor: selectedScan === type ? SCAN_COLORS[type] + '22' : 'transparent',
                },
              ]}
              onPress={() => setSelectedScan(type)}
              activeOpacity={0.7}
            >
              <Text style={[styles.scanTypeLabel, { color: SCAN_COLORS[type] }]}>
                {SCAN_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Gear Influence */}
        <View style={styles.gearInfluence}>
          {getGearInfluence(selectedScan).map((hint, i) => (
            <Text key={i} style={styles.gearHint}>{hint}</Text>
          ))}
        </View>

        {/* Sector Grid */}
        <View style={styles.gridContainer}>
          {Array.from({ length: gridSize }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: gridSize }, (_, col) => {
                const tile = ss.currentSector.tiles.find(t => t.row === row && t.col === col);
                if (!tile) return <View key={col} style={styles.tileEmpty} />;

                const scannable = isTileScannable(tile);
                const isCleared = tile.cleared;

                return (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.tile,
                      isCleared && styles.tileCleared,
                      scannable && styles.tileScannable,
                      !scannable && !isCleared && styles.tileFog,
                    ]}
                    onPress={() => handleTileTap(tile)}
                    disabled={!scannable || ss.scansRemaining <= 0}
                    activeOpacity={0.6}
                  >
                    <Text style={[
                      styles.tileIcon,
                      isCleared && styles.tileClearedIcon,
                      scannable && { color: SCAN_COLORS[selectedScan] },
                    ]}>
                      {isCleared ? TILE_ICONS.cleared : scannable ? TILE_ICONS[tile.type] : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Sector progress */}
        <Text style={styles.sectorProgressText}>
          {tilesCleared}/{ss.currentSector.tiles.length} cleared
        </Text>

        {/* Session Stats */}
        {ss.sessionResults.length > 0 && (
          <View style={styles.sessionStats}>
            <Text style={styles.sessionStatsTitle}>Session</Text>
            <View style={styles.sessionStatsRow}>
              <Text style={styles.statText}>
                Scans: {ss.sessionResults.length}
              </Text>
              <Text style={styles.statText}>
                Whiffs: {ss.sessionResults.filter(r => r.outcome === 'whiff').length}
              </Text>
              <Text style={styles.statText}>
                Rare+: {ss.sessionResults.filter(r => ['rare', 'legendary', 'component'].includes(r.outcome)).length}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Result Overlay */}
      <Modal visible={showResult} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            {lastResult && (
              <>
                <Text style={[
                  styles.resultBanner,
                  { color: OUTCOME_CONFIG[lastResult.outcome]?.color || colors.textPrimary },
                ]}>
                  {OUTCOME_CONFIG[lastResult.outcome]?.banner || lastResult.outcome}
                </Text>

                {lastResult.lootName && (
                  <Text style={styles.lootName}>{lastResult.lootName}</Text>
                )}

                {lastResult.outcome !== 'whiff' && lastResult.sectorProgress > 0 && (
                  <Text style={styles.progressText}>+{lastResult.sectorProgress} sector progress</Text>
                )}

                {/* Gear procs */}
                {lastResult.droneProc && (
                  <Text style={[styles.procText, { color: colors.neonAmber }]}>
                    Salvage Drone recovered your scan!
                  </Text>
                )}
                {lastResult.bootsProc && (
                  <Text style={[styles.procText, { color: colors.neonCyan }]}>
                    Nav Boots boosted progress!
                  </Text>
                )}
                {lastResult.cortexProc && (
                  <Text style={[styles.procText, { color: colors.neonPurple }]}>
                    Cortex Link enhanced!
                  </Text>
                )}
                {lastResult.opticsProc && (
                  <Text style={[styles.procText, { color: colors.neonGreen }]}>
                    Optics Rig sharpened!
                  </Text>
                )}

                <View style={styles.resultActions}>
                  {sessionDone ? (
                    <NeonButton
                      title="SESSION COMPLETE"
                      onPress={handleSessionComplete}
                      size="lg"
                    />
                  ) : (
                    <NeonButton
                      title={`NEXT SCAN (${Math.max(0, ss.scansRemaining - (lastResult.droneProc ? 0 : 1))} left)`}
                      onPress={handleNextScan}
                      variant="secondary"
                      size="lg"
                    />
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xxl },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  scansLeft: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  scansLeftNum: {
    fontSize: fontSize.xl,
    color: colors.neonGreen,
    fontWeight: '700',
  },

  // Scan Type
  scanTypeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  scanTypeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  scanTypeLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Gear Influence
  gearInfluence: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
    minHeight: 20,
  },
  gearHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },

  // Grid
  gridContainer: {
    alignSelf: 'center',
    marginVertical: spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
  },
  tile: {
    width: 56,
    height: 56,
    margin: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCleared: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.textMuted,
  },
  tileScannable: {
    borderColor: colors.neonGreen,
    backgroundColor: colors.surface,
  },
  tileFog: {
    backgroundColor: colors.background,
    borderColor: colors.background,
    opacity: 0.4,
  },
  tileEmpty: {
    width: 56,
    height: 56,
    margin: 2,
  },
  tileIcon: {
    fontSize: 20,
    color: colors.textMuted,
  },
  tileClearedIcon: {
    color: colors.textMuted,
  },

  sectorProgressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Session Stats
  sessionStats: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  sessionStatsTitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sessionStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Result Overlay
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  resultCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultBanner: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  lootName: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  progressText: {
    fontSize: fontSize.md,
    color: colors.neonCyan,
    marginBottom: spacing.sm,
  },
  procText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resultActions: {
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
});
