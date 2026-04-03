import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontMono } from '../../theme';
import NeonButton from '../common/NeonButton';
import AudioManager from '../../services/audioManager';
import {
  Enemy, CombatAction, EnemyIntent,
  resolveTurn, getWeaponDamage, getWeaponScrapBonus, rollEnemyIntent,
} from '../../systems/combatEngine';
import { GearItem, GearSlotId } from '../../types';

interface Props {
  visible: boolean;
  enemy: Enemy;
  playerHp: number;
  playerMaxHp: number;
  gearInventory: GearItem[];
  activeGearSlots: GearSlotId[];
  mapBackground: any;
  onVictory: (bonusScrap: number, bonusSupplies: number, lootBonus: number) => void;
  onDefeat: (hpLost: number) => void;
}

type Phase = 'intro' | 'player_turn' | 'resolving' | 'victory' | 'defeat';

export default function CombatOverlay({
  visible, enemy: initialEnemy, playerHp, playerMaxHp,
  gearInventory, activeGearSlots, mapBackground, onVictory, onDefeat,
}: Props) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [enemy, setEnemy] = useState<Enemy>({ ...initialEnemy });
  const [currentPlayerHp, setCurrentPlayerHp] = useState(playerHp);
  const [lootBonus, setLootBonus] = useState(0);
  const [turnLog, setTurnLog] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [shownIntent, setShownIntent] = useState<EnemyIntent | null>(null);
  const [realIntent, setRealIntent] = useState<EnemyIntent>('targeting');

  const weaponDamage = getWeaponDamage(gearInventory, activeGearSlots);
  const weaponScrapBonus = getWeaponScrapBonus(gearInventory, activeGearSlots);

  // Reset when overlay becomes visible with new enemy
  React.useEffect(() => {
    if (visible) {
      setPhase('intro');
      setEnemy({ ...initialEnemy });
      setCurrentPlayerHp(playerHp);
      setLootBonus(0);
      setTurnLog([]);
      setTurnCount(0);
      setShownIntent(null);
    }
  }, [visible]);

  const rollNextIntent = () => {
    const intent = rollEnemyIntent();
    setShownIntent(intent.shown);
    setRealIntent(intent.real);
  };

  const startCombat = () => {
    AudioManager.playSfx('scan_press');
    AudioManager.vibrate('medium');
    rollNextIntent();
    setPhase('player_turn');
  };

  const handleAction = useCallback((action: CombatAction) => {
    setPhase('resolving');
    AudioManager.vibrate('light');

    const result = resolveTurn(action, enemy, weaponDamage, realIntent);

    const newEnemyHp = result.enemyHpAfter;
    setEnemy(prev => ({ ...prev, hp: newEnemyHp }));

    const newPlayerHp = Math.max(0, currentPlayerHp - result.enemyDamageDealt);
    setCurrentPlayerHp(newPlayerHp);

    if (action === 'scan') setLootBonus(prev => prev + 1);

    // Build turn log with telegraph context
    const logs: string[] = [];
    if (action === 'attack' && realIntent === 'exposed') {
      logs.push(`CRITICAL! You hit the opening for ${result.playerDamageDealt} damage.`);
    } else if (action === 'attack') {
      logs.push(`You strike for ${result.playerDamageDealt} damage.`);
    }
    if (action === 'defend') logs.push('You brace for impact.');
    if (action === 'scan' && realIntent === 'scanning') {
      logs.push('You disrupt the scan — enemy signal jammed. (+1 loot)');
    } else if (action === 'scan') {
      logs.push('You scan for weaknesses. (+1 loot bonus)');
    }

    // Enemy result
    if (result.enemyDamageDealt === 0) {
      logs.push(`${enemy.name} missed!`);
    } else if (realIntent === 'targeting') {
      logs.push(`${enemy.name} fires a focused shot! ${result.playerDefending ? `Blocked: ${result.enemyDamageDealt}` : result.enemyDamageDealt} damage.`);
    } else {
      logs.push(`${enemy.name} attacks. ${result.playerDefending ? `Blocked: ${result.enemyDamageDealt}` : result.enemyDamageDealt} damage.`);
    }

    setTurnLog(logs);
    setTurnCount(prev => prev + 1);
    setShownIntent(null); // clear telegraph for resolving phase

    setTimeout(() => {
      if (newEnemyHp <= 0) {
        AudioManager.playSfx('gambit_win');
        AudioManager.vibrate('heavy');
        setPhase('victory');
      } else if (newPlayerHp <= 0) {
        AudioManager.playSfx('gambit_whiff');
        AudioManager.vibrate('heavy');
        setPhase('defeat');
      } else {
        rollNextIntent(); // roll next telegraph
        setPhase('player_turn');
      }
    }, 800);
  }, [enemy, currentPlayerHp, weaponDamage, realIntent]);

  const handleVictory = () => {
    const totalScrap = enemy.scrapReward + (lootBonus * 2) + weaponScrapBonus;
    onVictory(totalScrap, enemy.supplyReward, lootBonus);
  };

  const handleDefeat = () => {
    const hpLost = enemy.type === 'boss' ? 25 : 15;
    onDefeat(hpLost);
  };

  if (!visible) return null;

  const enemyHpPct = (enemy.hp / enemy.maxHp) * 100;
  const playerHpPct = (currentPlayerHp / playerMaxHp) * 100;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <ImageBackground source={mapBackground} style={s.battleBg} resizeMode="cover">
        <View style={s.overlay}>
          {/* PHASE: INTRO */}
          {phase === 'intro' && (
            <View style={s.introOverlay}>
              <Text style={s.introLabel}>HOSTILE CONTACT</Text>
              <Image source={enemy.image} style={s.introEnemyImage} resizeMode="contain" />
              <Text style={s.introEnemyName}>{enemy.name}</Text>
              <Text style={s.introSubtext}>{enemy.type === 'boss' ? 'BOSS ENCOUNTER' : 'THREAT DETECTED'}</Text>
              <NeonButton title="ENGAGE" onPress={startCombat} variant="primary" size="lg" style={{ marginTop: 24 }} />
            </View>
          )}

          {/* PHASE: COMBAT (player_turn + resolving) */}
          {(phase === 'player_turn' || phase === 'resolving') && (
            <>
              {/* Enemy area — top */}
              <View style={s.enemyArea}>
                <View style={s.enemyInfoBox}>
                  <Text style={s.enemyNameSmall}>{enemy.name}</Text>
                  <View style={s.hpTrack}>
                    <View style={[s.hpFill, { width: `${enemyHpPct}%`, backgroundColor: enemy.type === 'boss' ? colors.neonRed : colors.neonAmber }]} />
                  </View>
                  <Text style={s.hpLabel}>{enemy.hp}/{enemy.maxHp}</Text>
                  {/* Intent badge */}
                  {shownIntent && phase === 'player_turn' && (
                    <View style={[s.intentBadge, {
                      borderColor: shownIntent === 'targeting' ? colors.neonRed + '80'
                        : shownIntent === 'exposed' ? colors.neonGreen + '80'
                        : colors.neonAmber + '80',
                    }]}>
                      <Text style={[s.intentText, {
                        color: shownIntent === 'targeting' ? colors.neonRed
                          : shownIntent === 'exposed' ? colors.neonGreen
                          : colors.neonAmber,
                      }]}>
                        {shownIntent === 'targeting' ? '\u25B6 TARGETING'
                          : shownIntent === 'exposed' ? '\u25B6 EXPOSED'
                          : '\u25B6 SCANNING'}
                      </Text>
                    </View>
                  )}
                </View>
                <Image source={enemy.image} style={s.enemySprite} resizeMode="contain" />
              </View>

              {/* Player area — middle */}
              <View style={s.playerArea}>
                <View style={s.playerInfoBox}>
                  <Text style={s.playerLabel}>YOU</Text>
                  <View style={s.hpTrack}>
                    <View style={[s.hpFill, { width: `${playerHpPct}%`, backgroundColor: playerHpPct > 30 ? colors.neonGreen : colors.neonRed }]} />
                  </View>
                  <Text style={s.hpLabel}>{currentPlayerHp}/{playerMaxHp}</Text>
                </View>
              </View>

              {/* Turn log */}
              <View style={s.logBox}>
                {turnLog.map((line, i) => (
                  <Text key={i} style={s.logLine}>{line}</Text>
                ))}
                {turnLog.length === 0 && <Text style={s.logLine}>Choose your action.</Text>}
              </View>

              {/* Action panel — bottom */}
              <View style={s.actionPanel}>
                {phase === 'player_turn' ? (
                  <View style={s.actionRow}>
                    <TouchableOpacity style={[s.actionBtn, { borderColor: colors.neonRed + '60' }]} onPress={() => handleAction('attack')}>
                      <MaterialCommunityIcons name="sword-cross" size={24} color={colors.neonRed} />
                      <Text style={[s.actionLabel, { color: colors.neonRed }]}>ATTACK</Text>
                      <Text style={s.actionHint}>{weaponDamage} dmg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { borderColor: colors.neonCyan + '60' }]} onPress={() => handleAction('defend')}>
                      <MaterialCommunityIcons name="shield-half-full" size={24} color={colors.neonCyan} />
                      <Text style={[s.actionLabel, { color: colors.neonCyan }]}>DEFEND</Text>
                      <Text style={s.actionHint}>-50% dmg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { borderColor: colors.neonAmber + '60' }]} onPress={() => handleAction('scan')}>
                      <MaterialCommunityIcons name="radar" size={24} color={colors.neonAmber} />
                      <Text style={[s.actionLabel, { color: colors.neonAmber }]}>SCAN</Text>
                      <Text style={s.actionHint}>+loot</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={s.resolvingDots}>...</Text>
                )}
                {turnCount > 0 && <Text style={s.turnNum}>TURN {turnCount}</Text>}
                {lootBonus > 0 && <Text style={s.lootBonus}>SCAN BONUS: +{lootBonus * 2} scrap</Text>}
              </View>
            </>
          )}

          {/* PHASE: VICTORY */}
          {phase === 'victory' && (
            <View style={s.resultOverlay}>
              <Text style={s.victoryTitle}>HOSTILE ELIMINATED</Text>
              <View style={s.rewardBox}>
                <Text style={s.rewardLine}>+{enemy.scrapReward + (lootBonus * 2) + weaponScrapBonus} SCRAP</Text>
                {enemy.supplyReward > 0 && <Text style={s.rewardLine}>+{enemy.supplyReward} SUPPLIES</Text>}
                {lootBonus > 0 && <Text style={[s.rewardLine, { color: colors.neonAmber }]}>Scan bonus: +{lootBonus * 2}</Text>}
              </View>
              <NeonButton title="COLLECT" onPress={handleVictory} variant="primary" size="lg" style={{ marginTop: 20 }} />
            </View>
          )}

          {/* PHASE: DEFEAT */}
          {phase === 'defeat' && (
            <View style={s.resultOverlay}>
              <Text style={s.defeatTitle}>OPERATOR OVERWHELMED</Text>
              <Text style={s.defeatSub}>Forced retreat. -{enemy.type === 'boss' ? 25 : 15} HP</Text>
              <Text style={s.defeatSub}>Session over. Tile remains.</Text>
              <NeonButton title="RETREAT" onPress={handleDefeat} variant="primary" size="lg" style={{ marginTop: 20 }} />
            </View>
          )}
        </View>
      </ImageBackground>
    </Modal>
  );
}

const s = StyleSheet.create({
  battleBg: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(6, 10, 14, 0.75)' },

  // Intro
  introOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  introLabel: { fontSize: 14, color: colors.neonRed, fontWeight: '800', fontFamily: fontMono, letterSpacing: 4 },
  introEnemyImage: { width: 200, height: 200, marginVertical: spacing.lg },
  introEnemyName: { fontSize: fontSize.xl, color: colors.textPrimary, fontWeight: '700', fontFamily: fontMono, letterSpacing: 2 },
  introSubtext: { fontSize: 11, color: colors.textMuted, fontFamily: fontMono, letterSpacing: 2, marginTop: 4 },

  // Enemy area
  enemyArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingTop: spacing.xl, flex: 0.4 },
  enemyInfoBox: { flex: 1, paddingRight: spacing.sm },
  enemyNameSmall: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '700', fontFamily: fontMono, letterSpacing: 1 },
  enemySprite: { width: 140, height: 140 },

  // HP bars
  hpTrack: { height: 5, backgroundColor: colors.panelBorder, marginTop: 6, width: '100%' },
  hpFill: { height: '100%' },
  hpLabel: { fontSize: 9, color: colors.textMuted, fontFamily: fontMono, marginTop: 3 },

  // Intent
  intentBadge: { borderWidth: 1.5, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.sm },
  intentText: { fontSize: 11, fontWeight: '800', fontFamily: fontMono, letterSpacing: 2 },

  // Player area
  playerArea: { paddingHorizontal: spacing.md, flex: 0.15, justifyContent: 'center' },
  playerInfoBox: { alignSelf: 'flex-end', width: '60%' },
  playerLabel: { fontSize: fontSize.sm, color: colors.neonGreen, fontWeight: '700', fontFamily: fontMono, letterSpacing: 2 },

  // Log
  logBox: { marginHorizontal: spacing.md, borderWidth: 1, borderColor: colors.panelBorder, padding: spacing.sm, backgroundColor: colors.background + 'CC', flex: 0.15, justifyContent: 'center' },
  logLine: { fontSize: fontSize.sm, color: colors.textPrimary, fontFamily: fontMono, lineHeight: 20 },

  // Action panel
  actionPanel: { backgroundColor: colors.surface + 'F0', borderTopWidth: 1.5, borderTopColor: colors.panelBorder, padding: spacing.md, flex: 0.3, justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, borderWidth: 1.5, padding: spacing.sm, alignItems: 'center', backgroundColor: colors.background },
  actionLabel: { fontSize: 10, fontWeight: '800', fontFamily: fontMono, letterSpacing: 1, marginTop: 4 },
  actionHint: { fontSize: 8, color: colors.textMuted, fontFamily: fontMono, marginTop: 2 },
  resolvingDots: { fontSize: fontSize.xl, color: colors.textMuted, fontFamily: fontMono, textAlign: 'center' },
  turnNum: { fontSize: 9, color: colors.textMuted, fontFamily: fontMono, textAlign: 'center', marginTop: spacing.sm, letterSpacing: 2 },
  lootBonus: { fontSize: 9, color: colors.neonAmber, fontFamily: fontMono, textAlign: 'center', marginTop: 2 },

  // Results
  resultOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(6, 10, 14, 0.9)' },
  victoryTitle: { fontSize: 16, color: colors.neonGreen, fontWeight: '800', fontFamily: fontMono, letterSpacing: 4 },
  rewardBox: { marginTop: spacing.md, alignItems: 'center' },
  rewardLine: { fontSize: fontSize.md, color: colors.neonCyan, fontFamily: fontMono, marginTop: 4 },
  defeatTitle: { fontSize: 16, color: colors.neonRed, fontWeight: '800', fontFamily: fontMono, letterSpacing: 3 },
  defeatSub: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});
