import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing, ImageBackground } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { resolveScan, getEffectiveWhiffRate, computeScanRewards, rollUltraDrop, rollEnhancedDrop } from '../../systems/scanEngine';
import { BROKEN_OVERPASS_TILES, RELAY_FIELD_TILES } from '../../data/authoredTiles';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import SkillCheck from '../../components/trail/SkillCheck';
import { ScanType, ScanResult, ScanOutcome, SectorTile } from '../../types';
import { trackScan, trackGearLoadout, trackSession } from '../../services/analytics';
import { logSessionSummary, logGambitResult } from '../../systems/sessionLogger';
import { getDailyObjective, getSessionSummary, getReturnHook } from '../../systems/dailyObjective';
import CoachMark, { COACH, hasBeenShown } from '../../components/common/CoachMark';
import AudioManager from '../../services/audioManager';
import MicroEvent, { rollMicroEvent, MicroEventData, MicroEventEffect } from '../../components/scans/MicroEvent';
import { MAP_DEFS, MapId } from '../../data/sectorMaps';
import { saveGameState } from '../../services/storage';
import { checkMilestones, applyResourceBoost, applyDamageReduction } from '../../systems/skrEconomy';

// ─── Constants ───

const SCAN_COLORS: Record<ScanType, string> = {
  scout: '#4A9EFF',
  seeker: colors.neonGreen,
  gambit: colors.neonRed,
};

const SCAN_LABELS: Record<ScanType, { name: string; flavor: string; desc: string }> = {
  scout: { name: 'SCOUT', flavor: 'Probe', desc: 'Surface sweep. Low yield, low risk.' },
  seeker: { name: 'SEEKER', flavor: 'Push', desc: 'Dig deeper. Better signal, real exposure.' },
  gambit: { name: 'GAMBIT', flavor: 'All in', desc: 'Burn the scan for the best signal or nothing.' },
};

const TILE_ICONS: Record<string, string> = {
  unknown: 'help',
  resource: 'diamond-stone',
  anomaly: 'alert-rhombus',
  boss: 'skull',
  cleared: 'check',
};

const OUTCOME_DISPLAY: Record<string, { banner: string; color: string; icon: string }> = {
  whiff: { banner: 'Dead Signal', color: colors.neonRed, icon: 'signal-off' },
  common: { banner: 'Salvage', color: colors.textSecondary, icon: 'cube-outline' },
  uncommon: { banner: 'Clean Pull', color: colors.neonCyan, icon: 'diamond-stone' },
  rare: { banner: 'Buried Cache', color: colors.neonGreen, icon: 'star-four-points' },
  legendary: { banner: 'Pre-Collapse Tech', color: '#FFD700', icon: 'trophy' },
  component: { banner: 'Relic Fragment', color: colors.neonPurple, icon: 'hexagon-outline' },
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

export default function ScanScreen({ route }: any) {
  const { state, dispatch } = useGame();
  const nav = useNavigation<any>();
  const ss = state.seekerScans;
  const mapId: MapId = route?.params?.mapId || state.currentMapId || 'broken_overpass';
  const mapDef = MAP_DEFS[mapId];
  const briefing: string | undefined = route?.params?.briefing;
  const [showBriefing, setShowBriefing] = useState(!!briefing);

  const [selectedScan, setSelectedScan] = useState<ScanType>('seeker');
  const [selectedTile, setSelectedTile] = useState<SectorTile | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [displayOutcome, setDisplayOutcome] = useState<ScanOutcome | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [showSessionEnd, setShowSessionEnd] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolvePhrase, setResolvePhrase] = useState('');
  const [showSkillCheck, setShowSkillCheck] = useState(false);
  const [showMicroEvent, setShowMicroEvent] = useState(false);
  const [pendingMicroEvent, setPendingMicroEvent] = useState<MicroEventData | null>(null);
  const [tileWeakenedNote, setTileWeakenedNote] = useState<string | null>(null);
  const [showFailedMission, setShowFailedMission] = useState(false);
  const [failReason, setFailReason] = useState<'hp_zero' | 'rover_zero' | null>(null);
  const [earnedSkr, setEarnedSkr] = useState(0);
  const [milestoneNames, setMilestoneNames] = useState<string[]>([]);
  const lastScannedTileRef = useRef<string | null>(null);
  const sessionStartRef = useRef(ss.sessionStartTime);

  // Resolving animation values
  const resolvePulse = useRef(new Animated.Value(1)).current;
  const resolveOpacity = useRef(new Animated.Value(0)).current;
  const gambitShake = useRef(new Animated.Value(0)).current;
  const resolveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phraseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set scan ambient music + cleanup timers
  useEffect(() => {
    AudioManager.setMusic('ambient_scan');
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
  const getGearHints = (scanType: ScanType): { icon: string; text: string }[] => {
    const hints: { icon: string; text: string }[] = [];
    if (ss.activeGearSlots.includes('grip_gauntlets') && scanType !== 'scout') {
      hints.push({ icon: 'hand-back-fist', text: 'Grips: Steadier signal' });
    }
    if (ss.activeGearSlots.includes('optics_rig')) {
      hints.push({ icon: 'binoculars', text: 'Optics: Sharper reads' });
    }
    if (scanType === 'gambit' && ss.activeGearSlots.includes('cortex_link')) {
      hints.push({ icon: 'brain', text: 'Cortex: Deep-field boost' });
    }
    if (ss.activeGearSlots.includes('salvage_drone')) {
      hints.push({ icon: 'drone', text: 'Drone: Recovery sweep' });
    }
    if (ss.activeGearSlots.includes('nav_boots')) {
      hints.push({ icon: 'shoe-print', text: 'Boots: Ground covered' });
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
    setTileWeakenedNote(null);

    AudioManager.playSfx('scan_press');
    AudioManager.vibrate('light');

    let result = resolveScan(selectedScan, selectedTile.id, ss);

    // Shielded scan: force non-whiff by re-rolling until success
    if (ss.shieldedNextScan && result.outcome === 'whiff') {
      // Re-resolve without whiff — simply override outcome to common (shield guarantees hit)
      result = { ...result, outcome: 'common', lootName: 'Shielded Salvage', fieldNote: 'The corridor held. Clean read.' };
    }
    if (ss.shieldedNextScan) {
      dispatch({ type: 'CLEAR_SHIELDED_SCAN' });
    }

    // Boosted scan: upgrade outcome one tier
    if (ss.boostedNextScan && result.outcome !== 'whiff') {
      const upgraded = TIER_UPGRADE[result.outcome];
      if (upgraded) {
        result = { ...result, outcome: upgraded };
      }
      dispatch({ type: 'CLEAR_BOOSTED_SCAN' });
    } else if (ss.boostedNextScan) {
      dispatch({ type: 'CLEAR_BOOSTED_SCAN' });
    }

    // Compute resource rewards + damage based on tile type + authored flavor
    const tileType = selectedTile.type === 'cleared' ? 'unknown' : selectedTile.type;
    const rewards = computeScanRewards(result.outcome, result.scanType, tileType, selectedTile.flavor);
    result = { ...result, ...rewards };

    // Override field note with authored flavor text if present
    if (selectedTile.flavor) {
      const notes = result.outcome === 'whiff' ? selectedTile.flavor.whiffNotes : selectedTile.flavor.successNotes;
      if (notes.length > 0) {
        result = { ...result, fieldNote: notes[Math.floor(Math.random() * notes.length)] };
      }
    }

    dispatch({ type: 'USE_SCAN', payload: result });

    // Apply active boosts to rewards
    const boostedScrap = applyResourceBoost(rewards.scrapAwarded, state.activeBoosts);
    const boostedSupplies = applyResourceBoost(rewards.suppliesAwarded, state.activeBoosts);
    const reducedPlayerDmg = applyDamageReduction(rewards.playerDamage, state.activeBoosts);
    const reducedRoverDmg = applyDamageReduction(rewards.roverDamage, state.activeBoosts);
    result = { ...result, scrapAwarded: boostedScrap, suppliesAwarded: boostedSupplies, playerDamage: reducedPlayerDmg, roverDamage: reducedRoverDmg };

    // Apply resource awards
    if (boostedScrap > 0 || boostedSupplies > 0) {
      dispatch({
        type: 'APPLY_RESOURCE_CHANGES',
        payload: {
          scrap: boostedScrap,
          supplies: boostedSupplies,
        },
      });
    }

    // Track intel
    if (rewards.intelAwarded > 0) {
      dispatch({ type: 'ADD_INTEL', payload: rewards.intelAwarded });
    }

    // Apply damage
    if (reducedPlayerDmg > 0) {
      dispatch({ type: 'TAKE_DAMAGE', payload: reducedPlayerDmg });
    }
    if (reducedRoverDmg > 0) {
      dispatch({ type: 'DAMAGE_ROVER', payload: reducedRoverDmg });
    }

    // Add gear drop to inventory (real GearItem from authored tiles)
    if (rewards.gearDrop && selectedTile.flavor) {
      const allAuthored = [...BROKEN_OVERPASS_TILES, ...RELAY_FIELD_TILES];
      const tileDef = allAuthored.find(t => t.flavor.name === selectedTile.flavor?.name);
      if (tileDef?.gearDropItem) {
        dispatch({ type: 'ADD_GEAR_ITEM', payload: tileDef.gearDropItem });
        result = { ...result, gearDropItem: tileDef.gearDropItem };
      }
    }

    // Roll for enhanced gear drop (Relay Field, 5% on eligible tiles)
    if (result.outcome !== 'whiff' && !result.gearDropItem) {
      const enhancedDrop = rollEnhancedDrop(mapId, tileType);
      if (enhancedDrop) {
        dispatch({ type: 'ADD_GEAR_ITEM', payload: enhancedDrop });
        result = { ...result, gearDrop: enhancedDrop.name, gearDropItem: enhancedDrop };
      }
    }

    // Roll for ultra-rare gear drop on risky tiles
    if (result.outcome !== 'whiff' && !result.gearDropItem) {
      const ultraDrop = rollUltraDrop(tileType, ss.streakDay);
      if (ultraDrop) {
        dispatch({ type: 'ADD_GEAR_ITEM', payload: ultraDrop });
        result = { ...result, gearDrop: ultraDrop.name, gearDropItem: ultraDrop };
      }
    }

    // Handle durability: damage tile instead of clearing directly
    lastScannedTileRef.current = selectedTile.id;
    if (result.outcome !== 'whiff') {
      const tileDur = selectedTile.durability ?? 1;
      if (tileDur > 1) {
        // Hardened tile — damage but don't clear
        dispatch({ type: 'DAMAGE_TILE', payload: { tileId: selectedTile.id, amount: 1 } });
        const remaining_dur = tileDur - 1;
        setTileWeakenedNote(`Tile weakened. ${remaining_dur} more hit${remaining_dur > 1 ? 's' : ''} to crack it.`);
      } else {
        dispatch({ type: 'DAMAGE_TILE', payload: { tileId: selectedTile.id, amount: 1 } });
      }
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

      // Play outcome SFX
      if (selectedScan === 'gambit') {
        if (result.outcome === 'whiff') {
          AudioManager.playSfx('gambit_whiff');
          AudioManager.vibrate('medium');
        }
        // Non-whiff gambit: sound plays after skill check
      } else {
        switch (result.outcome) {
          case 'whiff':
            AudioManager.playSfx('scan_loss');
            AudioManager.vibrate('medium');
            break;
          case 'common':
          case 'uncommon':
            AudioManager.playSfx('scan_win');
            break;
          case 'rare':
            AudioManager.playSfx('scan_rare');
            AudioManager.vibrate('light');
            break;
          case 'legendary':
            AudioManager.playSfx('scan_legendary');
            AudioManager.vibrate('heavy');
            break;
          case 'component':
            AudioManager.playSfx('scan_component');
            AudioManager.vibrate('medium');
            break;
        }
      }

      // Check for HP zero or Rover zero after damage applied
      const newPlayerHp = state.playerHealth - rewards.playerDamage;
      const newRoverHp = state.roverHealth - rewards.roverDamage;

      if (newPlayerHp <= 0) {
        setFailReason('hp_zero');
        setShowFailedMission(true);
        setSelectedTile(null);
        return;
      }
      if (newRoverHp <= 0) {
        setFailReason('rover_zero');
        setShowFailedMission(true);
        setSelectedTile(null);
        return;
      }

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
    // Gambit always plays gambit_win for non-whiff outcomes
    AudioManager.playSfx('gambit_win');
    AudioManager.vibrate(success ? 'heavy' : 'light');
    if (success && lastResult) {
      const upgraded = TIER_UPGRADE[lastResult.outcome];
      if (upgraded) {
        setDisplayOutcome(upgraded);
      }
    }
    setShowResult(true);
  };

  // ─── Dismiss result — check for micro-event on rare+ ───
  const handleNextScan = () => {
    const effectiveOutcome = displayOutcome || lastResult?.outcome;
    // Roll micro-event for rare+ outcomes
    if (effectiveOutcome && ['rare', 'legendary', 'component'].includes(effectiveOutcome)) {
      const event = rollMicroEvent();
      if (event) {
        setShowResult(false);
        setPendingMicroEvent(event);
        setShowMicroEvent(true);
        return;
      }
    }
    setShowResult(false);
    setLastResult(null);
    setDisplayOutcome(null);
    setTileWeakenedNote(null);
  };

  // ─── Micro-event dismissed ───
  const handleMicroEventDismiss = (effect: MicroEventEffect) => {
    setShowMicroEvent(false);
    setPendingMicroEvent(null);

    switch (effect) {
      case 'reveal_tile':
        if (lastScannedTileRef.current) {
          dispatch({ type: 'REVEAL_ADJACENT_TILE', payload: lastScannedTileRef.current });
        }
        break;
      case 'shield_next':
        dispatch({ type: 'SET_SHIELDED_SCAN' });
        break;
      case 'boost_next':
        dispatch({ type: 'SET_BOOSTED_SCAN' });
        break;
    }

    setLastResult(null);
    setDisplayOutcome(null);
    setTileWeakenedNote(null);
  };

  // ─── Session complete ───
  const handleSessionComplete = () => {
    const scansUsed = ss.sessionResults.length + 1; // +1 for current
    const durationSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    trackGearLoadout(ss.activeGearSlots);
    trackSession(ss.scansTotal, scansUsed, ss.streakDay, durationSec, ss.sectorsCompleted);

    // Log session summary for balancing
    logSessionSummary(ss);

    // Check milestones and award $SKR
    const newMilestones = checkMilestones(state);
    let totalSkr = 0;
    const names: string[] = [];
    for (const m of newMilestones) {
      dispatch({ type: 'EARN_SKR', payload: { amount: m.reward, milestoneId: m.id } });
      totalSkr += m.reward;
      names.push(m.name);
    }
    setEarnedSkr(totalSkr);
    setMilestoneNames(names);

    // Consume single-use boosts after the run
    dispatch({ type: 'CONSUME_RUN_BOOSTS' });

    setShowResult(false);
    setShowSessionEnd(true);
  };

  const handleDismissSessionEnd = () => {
    setShowSessionEnd(false);
    saveGameState(state);
    nav.goBack();
  };

  const remainingAfterLast = lastResult
    ? (lastResult.droneProc ? ss.scansRemaining : Math.max(0, ss.scansRemaining - 1))
    : ss.scansRemaining;

  // ─── Handle sector full clear → map completion ───
  const allTilesCleared = ss.currentSector.tiles.length > 0 && ss.currentSector.tiles.every(t => t.cleared);

  const handleMapComplete = () => {
    dispatch({ type: 'COMPLETE_MAP', payload: mapId });

    if (mapDef.unlocksMap) {
      dispatch({ type: 'UNLOCK_MAP', payload: mapDef.unlocksMap });
    }

    // Check milestones after map completion (state updated via dispatch)
    // Use a brief delay to let reducer process COMPLETE_MAP first
    setTimeout(() => {
      const updatedState = { ...state, completedMapIds: [...state.completedMapIds, mapId] };
      const newMilestones = checkMilestones(updatedState);
      for (const m of newMilestones) {
        dispatch({ type: 'EARN_SKR', payload: { amount: m.reward, milestoneId: m.id } });
      }
      dispatch({ type: 'CONSUME_RUN_BOOSTS' });
      saveGameState(state);
    }, 50);

    dispatch({ type: 'SET_CURRENT_MAP', payload: 'camp' });
    nav.goBack();
  };

  return (
    <ScreenWrapper padded={false}>
      {/* ─── MAP BACKGROUND ─── */}
      <ImageBackground
        source={mapDef.background}
        style={styles.mapBg}
        resizeMode="cover"
      >
        <View style={styles.mapBgOverlay} />
      </ImageBackground>

      {/* ─── BRIEFING MODAL ─── */}
      <Modal visible={showBriefing} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.briefingCard}>
            <MaterialCommunityIcons name={mapDef.icon as any} size={32} color={colors.neonCyan} style={{ marginBottom: spacing.sm }} />
            <Text style={styles.briefingTitle}>{mapDef.name}</Text>
            <Text style={styles.briefingSubtitle}>{mapDef.subtitle}</Text>
            <Text style={styles.briefingText}>{briefing}</Text>
            <NeonButton
              title="Start the sweep"
              onPress={() => setShowBriefing(false)}
              variant="primary"
              size="lg"
              style={{ marginTop: spacing.lg }}
            />
          </View>
        </View>
      </Modal>

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
          {/* HP + Rover mini status */}
          <View style={styles.topBarStatus}>
            <MaterialCommunityIcons name="heart-pulse" size={11} color={state.playerHealth > 30 ? colors.neonGreen : colors.neonRed} />
            <Text style={[styles.topBarStatusVal, { color: state.playerHealth > 30 ? colors.neonGreen : colors.neonRed }]}>{state.playerHealth}</Text>
            <MaterialCommunityIcons name="car-side" size={11} color={state.roverHealth > 30 ? colors.neonCyan : colors.neonAmber} style={{ marginLeft: 6 }} />
            <Text style={[styles.topBarStatusVal, { color: state.roverHealth > 30 ? colors.neonCyan : colors.neonAmber }]}>{state.roverHealth}</Text>
          </View>
        </View>
      </View>

      {/* ─── Active buff badges ─── */}
      {(ss.shieldedNextScan || ss.boostedNextScan) && (
        <View style={styles.buffRow}>
          {ss.shieldedNextScan && (
            <View style={[styles.buffBadge, { borderColor: colors.neonCyan }]}>
              <MaterialCommunityIcons name="shield-check" size={12} color={colors.neonCyan} />
              <Text style={[styles.buffText, { color: colors.neonCyan }]}>Shielded</Text>
            </View>
          )}
          {ss.boostedNextScan && (
            <View style={[styles.buffBadge, { borderColor: colors.neonAmber }]}>
              <MaterialCommunityIcons name="arrow-up-bold-circle" size={12} color={colors.neonAmber} />
              <Text style={[styles.buffText, { color: colors.neonAmber }]}>Boosted</Text>
            </View>
          )}
        </View>
      )}

      {/* ─── Coach: first tile ─── */}
      <CoachMark
        id={COACH.FIRST_TILE}
        text="Tap a lit tile to target it. Green tiles are in range."
        visible={ss.sessionResults.length === 0}
      />

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
                      // Hardened tile border
                      scannable && !isCleared && (tile.maxDurability ?? 1) > 1 && {
                        borderColor: (tile.durability ?? 1) === (tile.maxDurability ?? 1)
                          ? colors.neonAmber + '80'
                          : colors.neonGreen + '60',
                      },
                    ]}
                    onPress={() => handleTileSelect(tile)}
                    disabled={!scannable || ss.scansRemaining <= 0}
                    activeOpacity={0.6}
                  >
                    {(isCleared || scannable) && (
                      <MaterialCommunityIcons
                        name={(isCleared ? TILE_ICONS.cleared : (tile.flavor?.icon || TILE_ICONS[tile.type])) as any}
                        size={18}
                        color={
                          isCleared ? colors.textMuted :
                          tile.type === 'boss' && scannable ? colors.neonRed :
                          tile.type === 'anomaly' && scannable ? colors.neonAmber :
                          tile.type === 'resource' && scannable ? colors.neonCyan :
                          scannable ? colors.neonGreen :
                          colors.textMuted
                        }
                        style={isCleared ? { opacity: 0.5 } : undefined}
                      />
                    )}
                    {/* Durability pips for hardened tiles */}
                    {scannable && !isCleared && (tile.maxDurability ?? 1) > 1 && (
                      <View style={styles.durabilityPips}>
                        {Array.from({ length: tile.maxDurability ?? 1 }, (_, i) => (
                          <View
                            key={i}
                            style={[
                              styles.durabilityPip,
                              i < (tile.durability ?? 0)
                                ? styles.durabilityPipFull
                                : styles.durabilityPipEmpty,
                            ]}
                          />
                        ))}
                      </View>
                    )}
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
            <View key={i} style={styles.gearHintChip}>
              <MaterialCommunityIcons name={hint.icon as any} size={10} color={colors.textMuted} />
              <Text style={styles.gearHintText}>{hint.text}</Text>
            </View>
          ))}
        </View>

        {/* Coach: scan types */}
        <CoachMark
          id={COACH.SCAN_TYPES}
          text="Scout probes safe. Seeker pushes deeper. Gambit risks it all for the best signal."
          visible={ss.sessionResults.length === 1 && !hasBeenShown(COACH.SCAN_TYPES)}
          delay={300}
        />

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
            <View style={styles.confirmTileRow}>
              <MaterialCommunityIcons
                name={(selectedTile?.flavor?.icon ||
                       (selectedTile?.type === 'boss' ? 'skull' :
                        selectedTile?.type === 'anomaly' ? 'alert-rhombus' :
                        selectedTile?.type === 'resource' ? 'diamond-stone' :
                        'help')) as any}
                size={18}
                color={selectedTile?.flavor
                  ? (selectedTile.flavor.riskLabel === 'dangerous' ? colors.neonRed :
                     selectedTile.flavor.riskLabel === 'risky' ? colors.neonAmber :
                     selectedTile.flavor.riskLabel === 'moderate' ? colors.neonCyan :
                     colors.neonGreen)
                  : (selectedTile?.type === 'boss' ? colors.neonRed :
                     selectedTile?.type === 'anomaly' ? colors.neonAmber :
                     selectedTile?.type === 'resource' ? colors.neonCyan :
                     colors.textSecondary)}
              />
              <Text style={styles.confirmTile}>
                {selectedTile?.flavor?.name ||
                 (selectedTile?.type === 'boss' ? 'Boss Tile' :
                  selectedTile?.type === 'anomaly' ? 'Anomaly' :
                  selectedTile?.type === 'resource' ? 'Resource' :
                  'Unknown')}
              </Text>
            </View>
            {selectedTile?.flavor && (
              <Text style={styles.confirmFlavorDesc}>{selectedTile.flavor.desc}</Text>
            )}
            {selectedTile?.flavor && (
              <View style={[
                styles.riskBadge,
                { borderColor:
                    selectedTile.flavor.riskLabel === 'dangerous' ? colors.neonRed :
                    selectedTile.flavor.riskLabel === 'risky' ? colors.neonAmber :
                    selectedTile.flavor.riskLabel === 'moderate' ? colors.neonCyan :
                    colors.neonGreen },
              ]}>
                <Text style={[
                  styles.riskBadgeText,
                  { color:
                      selectedTile.flavor.riskLabel === 'dangerous' ? colors.neonRed :
                      selectedTile.flavor.riskLabel === 'risky' ? colors.neonAmber :
                      selectedTile.flavor.riskLabel === 'moderate' ? colors.neonCyan :
                      colors.neonGreen },
                ]}>
                  {selectedTile.flavor.riskLabel.toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={[styles.confirmWhiff, { color: SCAN_COLORS[selectedScan] }]}>
              {Math.round(whiffRates[selectedScan] * 100)}% miss chance
            </Text>
            {selectedScan === 'gambit' && (
              <CoachMark
                id={COACH.GAMBIT_INTRO}
                text="Gambit burns the scan for one deep read. High miss rate, but it's the only way to pull Legendary signals and relic fragments."
                delay={200}
              />
            )}
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
              <MaterialCommunityIcons name="radar" size={28} color={SCAN_COLORS[selectedScan]} />
            </View>
            <Text style={[styles.resolvingText, { color: SCAN_COLORS[selectedScan] }]}>
              {resolvePhrase}
            </Text>
            <View style={styles.resolvingDots}>
              <MaterialCommunityIcons name="circle-small" size={20} color={SCAN_COLORS[selectedScan] + '80'} />
              <MaterialCommunityIcons name="circle-small" size={20} color={SCAN_COLORS[selectedScan] + '80'} />
              <MaterialCommunityIcons name="circle-small" size={20} color={SCAN_COLORS[selectedScan] + '80'} />
            </View>
          </Animated.View>
        </Animated.View>
      )}

      {/* ─── GAMBIT SKILL CHECK ─── */}
      <Modal visible={showSkillCheck} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.skillCheckCard}>
            <Text style={styles.skillCheckTitle}>SIGNAL LOCK</Text>
            <Text style={styles.skillCheckDesc}>The signal is unstable. Lock it in to pull a better read.</Text>
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
                  <MaterialCommunityIcons name={display.icon as any} size={44} color={display.color} style={styles.resultIcon} />
                  <Text style={[styles.resultBanner, { color: display.color }]}>
                    {display.banner}
                  </Text>

                  {/* Upgraded badge (Gambit skill check success) */}
                  {displayOutcome && displayOutcome !== lastResult.outcome && (
                    <View style={styles.upgradedBadge}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MaterialCommunityIcons name="arrow-up-bold" size={12} color={colors.neonGreen} />
                        <Text style={styles.upgradedBadgeText}>UPGRADED</Text>
                      </View>
                    </View>
                  )}

                  {/* Loot with rarity label */}
                  {lastResult.lootName && (
                    <Text style={[styles.resultLoot, { color: display.color }]}>
                      {effectiveOutcome.charAt(0).toUpperCase() + effectiveOutcome.slice(1)}: {lastResult.lootName}
                    </Text>
                  )}

                  {/* Field note */}
                  {lastResult.fieldNote && (
                    <Text style={styles.fieldNote}>{lastResult.fieldNote}</Text>
                  )}

                  {/* Tile weakened note */}
                  {tileWeakenedNote && effectiveOutcome !== 'whiff' && (
                    <View style={styles.tileWeakenedRow}>
                      <MaterialCommunityIcons name="shield-alert" size={14} color={colors.neonAmber} />
                      <Text style={styles.tileWeakenedText}>{tileWeakenedNote}</Text>
                    </View>
                  )}

                  {/* Whiff guidance */}
                  {effectiveOutcome === 'whiff' && (
                    <>
                      <Text style={styles.whiffHint}>
                        Dead air. The signal was there and then it wasn't. Choose a different approach or move on.
                      </Text>
                      <CoachMark
                        id={COACH.FIRST_WHIFF}
                        text="Dead signals are the cost of pushing hard. Scout scans almost never miss. Gambits miss often — but pay off big."
                        delay={800}
                      />
                    </>
                  )}

                  {/* Rare+ coach */}
                  {['rare', 'legendary', 'component'].includes(effectiveOutcome) && (
                    <CoachMark
                      id={COACH.FIRST_RARE}
                      text="Good pull. Your gear loadout affects how often these show up. Better rig, better reads."
                      delay={600}
                    />
                  )}

                  {/* Sector progress */}
                  {effectiveOutcome !== 'whiff' && lastResult.sectorProgress > 0 && (
                    <View style={styles.resultProgressRow}>
                      <Text style={styles.resultProgress}>
                        +{lastResult.sectorProgress} tile{lastResult.sectorProgress > 1 ? 's' : ''} cleared
                      </Text>
                    </View>
                  )}

                  {/* Resource awards */}
                  {(lastResult.scrapAwarded > 0 || lastResult.suppliesAwarded > 0 || lastResult.intelAwarded > 0) && (
                    <View style={styles.rewardRow}>
                      {lastResult.scrapAwarded > 0 && (
                        <View style={styles.rewardChip}>
                          <MaterialCommunityIcons name="cog" size={12} color={colors.scrap} />
                          <Text style={[styles.rewardChipText, { color: colors.scrap }]}>+{lastResult.scrapAwarded}</Text>
                        </View>
                      )}
                      {lastResult.suppliesAwarded > 0 && (
                        <View style={styles.rewardChip}>
                          <MaterialCommunityIcons name="package-variant" size={12} color={colors.supplies} />
                          <Text style={[styles.rewardChipText, { color: colors.supplies }]}>+{lastResult.suppliesAwarded}</Text>
                        </View>
                      )}
                      {lastResult.intelAwarded > 0 && (
                        <View style={styles.rewardChip}>
                          <MaterialCommunityIcons name="database" size={12} color={colors.neonCyan} />
                          <Text style={[styles.rewardChipText, { color: colors.neonCyan }]}>+{lastResult.intelAwarded} Intel</Text>
                        </View>
                      )}
                      {lastResult.scrapValue > 0 && lastResult.lootName && (
                        <View style={styles.rewardChip}>
                          <MaterialCommunityIcons name="recycle" size={12} color={colors.textMuted} />
                          <Text style={[styles.rewardChipText, { color: colors.textMuted }]}>Scrap: {lastResult.scrapValue}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Onboarding: first reward */}
                  {(lastResult.scrapAwarded > 0 || lastResult.suppliesAwarded > 0) && (
                    <CoachMark
                      id={COACH.FIRST_REWARD}
                      text="Good pull. Scrap and supplies keep you running between jobs. Some tiles drop gear too."
                      delay={300}
                    />
                  )}

                  {/* Gear drop */}
                  {lastResult.gearDrop && (
                    <View style={[
                      styles.gearDropRow,
                      lastResult.gearDropItem?.quality === 'ultra' && { borderColor: colors.neonPurple + '60', backgroundColor: colors.neonPurple + '15' },
                    ]}>
                      <MaterialCommunityIcons
                        name={lastResult.gearDropItem?.quality === 'ultra' ? 'star-four-points' : 'trophy'}
                        size={16}
                        color={lastResult.gearDropItem?.quality === 'ultra' ? colors.neonPurple : colors.neonAmber}
                      />
                      <View>
                        <Text style={[
                          styles.gearDropText,
                          lastResult.gearDropItem?.quality === 'ultra' && { color: colors.neonPurple },
                        ]}>
                          {lastResult.gearDropItem?.quality === 'ultra' ? 'ULTRA DROP: ' : 'Found: '}
                          {lastResult.gearDrop}
                        </Text>
                        {lastResult.gearDropItem && (
                          <Text style={styles.gearDropDesc}>{lastResult.gearDropItem.shortDesc}</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Damage taken */}
                  {(lastResult.playerDamage > 0 || lastResult.roverDamage > 0) && (
                    <>
                    {/* Onboarding: first damage */}
                    <CoachMark
                      id={COACH.FIRST_DAMAGE}
                      text="That one cost you. Risky scans and bad tiles deal damage. Scout reads are safer if you need to play it cool."
                      delay={200}
                    />
                    <View style={styles.damageRow}>
                      {lastResult.playerDamage > 0 && (
                        <View style={styles.damageChip}>
                          <MaterialCommunityIcons name="heart-broken" size={12} color={colors.neonRed} />
                          <Text style={[styles.damageChipText, { color: colors.neonRed }]}>-{lastResult.playerDamage} HP</Text>
                        </View>
                      )}
                      {lastResult.roverDamage > 0 && (
                        <View style={styles.damageChip}>
                          <MaterialCommunityIcons name="car-wrench" size={12} color={colors.neonAmber} />
                          <Text style={[styles.damageChipText, { color: colors.neonAmber }]}>-{lastResult.roverDamage} Rover</Text>
                        </View>
                      )}
                    </View>
                    </>
                  )}

                  {/* Gear procs */}
                  <View style={styles.procsContainer}>
                    {lastResult.droneProc && (
                      <View style={styles.procRow}>
                        <MaterialCommunityIcons name="drone" size={14} color={colors.neonAmber} />
                        <Text style={[styles.procText, { color: colors.neonAmber }]}>
                          Drone caught a second pass. Scan refunded.
                        </Text>
                      </View>
                    )}
                    {lastResult.bootsProc && (
                      <View style={styles.procRow}>
                        <MaterialCommunityIcons name="shoe-print" size={14} color={colors.neonCyan} />
                        <Text style={[styles.procText, { color: colors.neonCyan }]}>
                          Boots mapped a faster route. Extra ground covered.
                        </Text>
                      </View>
                    )}
                    {lastResult.cortexProc && (
                      <View style={styles.procRow}>
                        <MaterialCommunityIcons name="brain" size={14} color={colors.neonPurple} />
                        <Text style={[styles.procText, { color: colors.neonPurple }]}>
                          Cortex pushed the signal deeper. Better read.
                        </Text>
                      </View>
                    )}
                    {lastResult.opticsProc && (
                      <View style={styles.procRow}>
                        <MaterialCommunityIcons name="binoculars" size={14} color={colors.neonGreen} />
                        <Text style={[styles.procText, { color: colors.neonGreen }]}>
                          Optics filtered the noise. Cleaner signal.
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Action button */}
                  <View style={styles.resultActions}>
                    {sessionDone ? (
                      <NeonButton
                        title="End Run"
                        onPress={handleSessionComplete}
                        size="lg"
                      />
                    ) : (
                      <NeonButton
                        title={`Continue • ${remainingAfterLast} scans left`}
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

      {/* ─── MICRO-EVENT ─── */}
      <MicroEvent
        visible={showMicroEvent}
        event={pendingMicroEvent}
        onDismiss={handleMicroEventDismiss}
      />

      {/* ─── SESSION END SUMMARY ─── */}
      <Modal visible={showSessionEnd} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sessionEndCard}>
            <Text style={styles.sessionEndLabel}>
              {allTilesCleared ? 'SECTOR CLEARED' : 'JOB DONE'}
            </Text>
            <View style={styles.sessionEndDivider} />
            <Text style={styles.sessionEndSummary}>
              {allTilesCleared
                ? mapDef.debriefing
                : getSessionSummary(
                    [...ss.sessionResults, ...(lastResult ? [lastResult] : [])],
                    ss.currentSector.name,
                    getDailyObjective(ss),
                  )}
            </Text>
            <View style={styles.sessionEndStats}>
              <View style={styles.sessionEndStat}>
                <Text style={styles.sessionEndStatValue}>
                  {(ss.sessionResults.length + (lastResult ? 1 : 0))}
                </Text>
                <Text style={styles.sessionEndStatLabel}>scans</Text>
              </View>
              <View style={styles.sessionEndStat}>
                <Text style={styles.sessionEndStatValue}>
                  {[...ss.sessionResults, ...(lastResult ? [lastResult] : [])].reduce((s, r) => s + r.sectorProgress, 0)}
                </Text>
                <Text style={styles.sessionEndStatLabel}>tiles</Text>
              </View>
              <View style={styles.sessionEndStat}>
                <Text style={[styles.sessionEndStatValue, { color: colors.neonGreen }]}>
                  {[...ss.sessionResults, ...(lastResult ? [lastResult] : [])].filter(r => ['rare', 'legendary', 'component'].includes(r.outcome)).length}
                </Text>
                <Text style={styles.sessionEndStatLabel}>rare+</Text>
              </View>
            </View>

            {/* Run resource summary */}
            {(() => {
              const allResults = [...ss.sessionResults, ...(lastResult ? [lastResult] : [])];
              const totalScrap = allResults.reduce((s, r) => s + r.scrapAwarded, 0);
              const totalSupplies = allResults.reduce((s, r) => s + r.suppliesAwarded, 0);
              const totalHpDmg = allResults.reduce((s, r) => s + r.playerDamage, 0);
              const totalRovDmg = allResults.reduce((s, r) => s + r.roverDamage, 0);
              return (
                <View style={styles.runSummaryRow}>
                  {totalScrap > 0 && (
                    <View style={styles.runSummaryChip}>
                      <MaterialCommunityIcons name="cog" size={12} color={colors.scrap} />
                      <Text style={[styles.runSummaryText, { color: colors.scrap }]}>+{totalScrap}</Text>
                    </View>
                  )}
                  {totalSupplies > 0 && (
                    <View style={styles.runSummaryChip}>
                      <MaterialCommunityIcons name="package-variant" size={12} color={colors.supplies} />
                      <Text style={[styles.runSummaryText, { color: colors.supplies }]}>+{totalSupplies}</Text>
                    </View>
                  )}
                  {totalHpDmg > 0 && (
                    <View style={styles.runSummaryChip}>
                      <MaterialCommunityIcons name="heart-broken" size={12} color={colors.neonRed} />
                      <Text style={[styles.runSummaryText, { color: colors.neonRed }]}>-{totalHpDmg}</Text>
                    </View>
                  )}
                  {totalRovDmg > 0 && (
                    <View style={styles.runSummaryChip}>
                      <MaterialCommunityIcons name="car-wrench" size={12} color={colors.neonAmber} />
                      <Text style={[styles.runSummaryText, { color: colors.neonAmber }]}>-{totalRovDmg}</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* Map unlock notification */}
            {allTilesCleared && mapDef.unlocksMap && (
              <View style={styles.unlockRow}>
                <MaterialCommunityIcons name="lock-open-variant" size={16} color={colors.neonCyan} />
                <Text style={styles.unlockText}>
                  New sector unlocked: {MAP_DEFS[mapDef.unlocksMap].name}
                </Text>
              </View>
            )}

            {/* $SKR earned from milestones */}
            {earnedSkr > 0 && (
              <View style={styles.skrEarnedRow}>
                <MaterialCommunityIcons name="hexagon-outline" size={16} color={colors.neonPurple} />
                <Text style={styles.skrEarnedText}>+{earnedSkr} $SKR</Text>
                {milestoneNames.length > 0 && (
                  <Text style={styles.skrMilestoneText}>{milestoneNames.join(' · ')}</Text>
                )}
              </View>
            )}

            <Text style={styles.sessionEndHook}>
              {allTilesCleared ? '' : getReturnHook(ss)}
            </Text>
            <NeonButton
              title={allTilesCleared ? 'Return to camp' : 'Return to waystation'}
              onPress={allTilesCleared ? handleMapComplete : handleDismissSessionEnd}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </Modal>

      {/* ─── FAILED MISSION MODAL ─── */}
      <Modal visible={showFailedMission} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.sessionEndCard}>
            <MaterialCommunityIcons
              name={failReason === 'hp_zero' ? 'heart-broken' : 'car-wrench'}
              size={40}
              color={colors.neonRed}
              style={{ marginBottom: spacing.sm }}
            />
            <Text style={[styles.sessionEndLabel, { color: colors.neonRed }]}>
              {failReason === 'hp_zero' ? 'OPERATOR DOWN' : 'ROVER DISABLED'}
            </Text>
            <View style={styles.sessionEndDivider} />
            <Text style={styles.sessionEndSummary}>
              {failReason === 'hp_zero'
                ? 'Pushed too hard. Signal\'s gone and so is your footing. Dragged back to the post — lost a day, kept partial haul.'
                : 'Rover\'s busted. Limping back on fumes. Burn some scrap at the bench before the next run.'}
            </Text>
            <NeonButton
              title="Limp back to the post"
              onPress={() => {
                setShowFailedMission(false);
                // Increment day as penalty for HP zero
                if (failReason === 'hp_zero') {
                  dispatch({ type: 'INCREMENT_DAY' });
                  // Restore to 20 HP so player isn't stuck
                  dispatch({ type: 'HEAL', payload: 20 });
                }
                dispatch({ type: 'SET_CURRENT_MAP', payload: 'camp' });
                // Explicit save on failed mission
                setTimeout(() => saveGameState(state), 100);
                nav.goBack();
              }}
              variant="primary"
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // ─── Map Background ───
  mapBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 11, 16, 0.65)',
  },

  // ─── Briefing ───
  briefingCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.neonCyan + '40',
    padding: spacing.xl,
    alignItems: 'center',
  },
  briefingTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  briefingSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  briefingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

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
  topBarStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  topBarStatusVal: {
    fontSize: 10,
    fontWeight: '700',
  },
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
    borderRadius: 1,
    borderWidth: 1,
    borderColor: colors.surfaceLight + '60',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileCleared: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.neonGreen + '20',
  },
  tileScannable: {
    borderColor: colors.neonGreen + '60',
    backgroundColor: colors.neonGreen + '08',
  },
  tileFog: {
    backgroundColor: colors.background,
    borderColor: colors.background + '40',
    opacity: 0.2,
  },
  tileSelected: {
    borderColor: colors.neonAmber,
    borderWidth: 2,
    backgroundColor: colors.neonAmber + '12',
  },
  tileEmpty: {
    width: 54,
    height: 54,
    margin: 2,
  },
  tileIcon: {
    color: colors.textMuted,
  },
  tileClearedIcon: {
    color: colors.textMuted,
    opacity: 0.5,
  },
  durabilityPips: {
    position: 'absolute',
    bottom: 3,
    flexDirection: 'row',
    gap: 2,
  },
  durabilityPip: {
    width: 6,
    height: 3,
    borderRadius: 1,
  },
  durabilityPipFull: {
    backgroundColor: colors.neonAmber,
  },
  durabilityPipEmpty: {
    backgroundColor: colors.surfaceLight,
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
  gearHintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  gearHintText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  scanButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scanButton: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  scanButtonLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  scanButtonOdds: {
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
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
  confirmTileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  confirmTile: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  confirmFlavorDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  riskBadge: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginBottom: spacing.sm,
  },
  riskBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 2,
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
  fieldNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  tileWeakenedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.neonAmber + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  tileWeakenedText: {
    fontSize: fontSize.sm,
    color: colors.neonAmber,
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
  procRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  procText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
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
  resolvingIconText: {},
  resolvingText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
  },
  resolvingDots: {
    flexDirection: 'row',
    marginTop: spacing.sm,
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

  // ─── Session End ───
  sessionEndCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.xl,
    alignItems: 'center',
  },
  sessionEndLabel: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontWeight: '700',
    letterSpacing: 3,
  },
  sessionEndDivider: {
    height: 1,
    backgroundColor: colors.surfaceLight,
    width: '80%',
    marginVertical: spacing.md,
  },
  sessionEndSummary: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  sessionEndStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surfaceLight,
  },
  sessionEndStat: {
    alignItems: 'center',
  },
  sessionEndStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sessionEndStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  sessionEndHook: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },

  // ─── Buff Badges ───
  buffRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  buffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.surfaceHighlight,
  },
  buffText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // ─── Resource Rewards & Damage ───
  rewardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  rewardChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  rewardChipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  damageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  damageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neonRed + '12',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.neonRed + '25',
  },
  damageChipText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  gearDropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neonAmber + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neonAmber + '30',
    marginBottom: spacing.sm,
  },
  gearDropText: {
    fontSize: fontSize.sm,
    color: colors.neonAmber,
    fontWeight: '700',
  },
  gearDropDesc: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  // ─── Map Unlock ───
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neonCyan + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neonCyan + '30',
    marginBottom: spacing.md,
  },
  unlockText: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '600',
  },

  // ─── Run Summary ───
  runSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceLight,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  runSummaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  runSummaryText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },

  // ─── SKR Earned ───
  skrEarnedRow: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.neonPurple + '12',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neonPurple + '30',
    marginBottom: spacing.md,
  },
  skrEarnedText: {
    fontSize: fontSize.lg,
    color: colors.neonPurple,
    fontWeight: '700',
  },
  skrMilestoneText: {
    fontSize: fontSize.xs,
    color: colors.neonPurple,
    opacity: 0.7,
    textAlign: 'center',
  },
});
