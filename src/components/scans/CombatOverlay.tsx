import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
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
  onVictory: (bonusScrap: number, bonusSupplies: number, lootBonus: number) => void;
  onDefeat: (hpLost: number) => void;
}

type Phase = 'intro' | 'player_turn' | 'resolving' | 'victory' | 'defeat';

export default function CombatOverlay({
  visible, enemy: initialEnemy, playerHp, playerMaxHp,
  gearInventory, activeGearSlots, onVictory, onDefeat,
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
      <View style={s.overlay}>
        <View style={s.container}>
          {/* Enemy section */}
          <View style={s.enemySection}>
            <MaterialCommunityIcons name={enemy.icon as any} size={48} color={enemy.type === 'boss' ? colors.neonRed : colors.neonAmber} />
            <Text style={[s.enemyName, { color: enemy.type === 'boss' ? colors.neonRed : colors.neonAmber }]}>
              {enemy.name}
            </Text>
            <View style={s.hpBarTrack}>
              <View style={[s.hpBarFill, { width: `${enemyHpPct}%`, backgroundColor: enemy.type === 'boss' ? colors.neonRed : colors.neonAmber }]} />
            </View>
            <Text style={s.hpText}>{enemy.hp}/{enemy.maxHp} HP</Text>
            {shownIntent && phase === 'player_turn' && (
              <View style={[s.intentBadge, {
                borderColor: shownIntent === 'targeting' ? colors.neonRed + '60'
                  : shownIntent === 'exposed' ? colors.neonGreen + '60'
                  : colors.neonAmber + '60',
                backgroundColor: shownIntent === 'targeting' ? colors.neonRed + '10'
                  : shownIntent === 'exposed' ? colors.neonGreen + '10'
                  : colors.neonAmber + '10',
              }]}>
                <Text style={[s.intentText, {
                  color: shownIntent === 'targeting' ? colors.neonRed
                    : shownIntent === 'exposed' ? colors.neonGreen
                    : colors.neonAmber,
                }]}>
                  {shownIntent === 'targeting' ? 'TARGETING...'
                    : shownIntent === 'exposed' ? 'EXPOSED...'
                    : 'SCANNING YOU...'}
                </Text>
                <Text style={s.intentHint}>
                  {shownIntent === 'targeting' ? 'Counter: DEFEND'
                    : shownIntent === 'exposed' ? 'Counter: ATTACK'
                    : 'Counter: SCAN'}
                </Text>
              </View>
            )}
          </View>

          {/* Turn log */}
          <View style={s.logSection}>
            {phase === 'intro' && (
              <>
                <Text style={s.introText}>HOSTILE CONTACT</Text>
                <Text style={s.introSubtext}>{enemy.name} blocks the signal path.</Text>
              </>
            )}
            {turnLog.map((line, i) => (
              <Text key={i} style={s.logLine}>{line}</Text>
            ))}
            {lootBonus > 0 && phase === 'player_turn' && (
              <Text style={s.lootBonusText}>Scan bonus: +{lootBonus * 2} scrap on kill</Text>
            )}
          </View>

          {/* Player HP */}
          <View style={s.playerSection}>
            <View style={s.hpBarTrack}>
              <View style={[s.hpBarFill, { width: `${playerHpPct}%`, backgroundColor: playerHpPct > 30 ? colors.neonGreen : colors.neonRed }]} />
            </View>
            <Text style={s.hpText}>YOU: {currentPlayerHp}/{playerMaxHp} HP</Text>
          </View>

          {/* Actions */}
          {phase === 'intro' && (
            <NeonButton title="ENGAGE" onPress={startCombat} variant="primary" size="lg" />
          )}

          {phase === 'player_turn' && (
            <View style={s.actionRow}>
              <TouchableOpacity style={[s.actionBtn, s.actionAttack]} onPress={() => handleAction('attack')}>
                <MaterialCommunityIcons name="sword-cross" size={20} color={colors.neonRed} />
                <Text style={[s.actionLabel, { color: colors.neonRed }]}>ATTACK</Text>
                <Text style={s.actionHint}>{weaponDamage} dmg</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionDefend]} onPress={() => handleAction('defend')}>
                <MaterialCommunityIcons name="shield-half-full" size={20} color={colors.neonCyan} />
                <Text style={[s.actionLabel, { color: colors.neonCyan }]}>DEFEND</Text>
                <Text style={s.actionHint}>-50% dmg</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.actionScan]} onPress={() => handleAction('scan')}>
                <MaterialCommunityIcons name="radar" size={20} color={colors.neonAmber} />
                <Text style={[s.actionLabel, { color: colors.neonAmber }]}>SCAN</Text>
                <Text style={s.actionHint}>+loot</Text>
              </TouchableOpacity>
            </View>
          )}

          {phase === 'resolving' && (
            <Text style={s.resolvingText}>...</Text>
          )}

          {phase === 'victory' && (
            <View style={s.resultSection}>
              <Text style={s.victoryText}>HOSTILE ELIMINATED</Text>
              <Text style={s.rewardText}>+{enemy.scrapReward + (lootBonus * 2) + weaponScrapBonus} Scrap</Text>
              {enemy.supplyReward > 0 && <Text style={s.rewardText}>+{enemy.supplyReward} Supplies</Text>}
              {lootBonus > 0 && <Text style={[s.rewardText, { color: colors.neonAmber }]}>Scan bonus applied (+{lootBonus * 2})</Text>}
              <NeonButton title="COLLECT" onPress={handleVictory} variant="primary" size="lg" style={{ marginTop: spacing.md }} />
            </View>
          )}

          {phase === 'defeat' && (
            <View style={s.resultSection}>
              <Text style={s.defeatText}>OPERATOR OVERWHELMED</Text>
              <Text style={s.defeatSubtext}>Forced retreat. -{enemy.type === 'boss' ? 25 : 15} HP. Session over.</Text>
              <NeonButton title="RETREAT" onPress={handleDefeat} variant="primary" size="lg" style={{ marginTop: spacing.md }} />
            </View>
          )}

          {/* Turn counter */}
          {turnCount > 0 && phase !== 'victory' && phase !== 'defeat' && (
            <Text style={s.turnCounter}>Turn {turnCount}</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.lg,
    alignItems: 'center',
  },

  // Enemy
  enemySection: { alignItems: 'center', marginBottom: spacing.md, width: '100%' },
  enemyName: { fontSize: fontSize.lg, fontWeight: '700', fontFamily: fontMono, letterSpacing: 2, marginTop: spacing.xs },
  hpBarTrack: { width: '100%', height: 6, backgroundColor: colors.panelBorder, marginTop: spacing.sm },
  hpBarFill: { height: '100%' },
  hpText: { fontSize: 10, color: colors.textMuted, fontFamily: fontMono, marginTop: 4 },
  intentBadge: { borderWidth: 1.5, padding: spacing.sm, marginTop: spacing.sm, alignItems: 'center', width: '100%' },
  intentText: { fontSize: fontSize.md, fontWeight: '800', fontFamily: fontMono, letterSpacing: 3 },
  intentHint: { fontSize: 9, color: colors.textMuted, fontFamily: fontMono, letterSpacing: 1, marginTop: 2 },

  // Log
  logSection: { width: '100%', minHeight: 60, borderWidth: 1, borderColor: colors.panelBorder, padding: spacing.sm, marginBottom: spacing.md, backgroundColor: colors.background },
  introText: { fontSize: fontSize.md, color: colors.neonRed, fontWeight: '700', fontFamily: fontMono, letterSpacing: 3, textAlign: 'center' },
  introSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  logLine: { fontSize: fontSize.sm, color: colors.textPrimary, fontFamily: fontMono, lineHeight: 20 },
  lootBonusText: { fontSize: fontSize.xs, color: colors.neonAmber, fontFamily: fontMono, marginTop: spacing.xs },

  // Player
  playerSection: { width: '100%', marginBottom: spacing.md },

  // Actions
  actionRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  actionBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.panelBorder, padding: spacing.sm, alignItems: 'center', backgroundColor: colors.background },
  actionAttack: { borderColor: colors.neonRed + '40' },
  actionDefend: { borderColor: colors.neonCyan + '40' },
  actionScan: { borderColor: colors.neonAmber + '40' },
  actionLabel: { fontSize: 10, fontWeight: '800', fontFamily: fontMono, letterSpacing: 1, marginTop: 4 },
  actionHint: { fontSize: 8, color: colors.textMuted, fontFamily: fontMono, marginTop: 2 },

  // Results
  resultSection: { alignItems: 'center', width: '100%' },
  victoryText: { fontSize: fontSize.lg, color: colors.neonGreen, fontWeight: '700', fontFamily: fontMono, letterSpacing: 3 },
  rewardText: { fontSize: fontSize.md, color: colors.neonCyan, fontFamily: fontMono, marginTop: spacing.xs },
  defeatText: { fontSize: fontSize.lg, color: colors.neonRed, fontWeight: '700', fontFamily: fontMono, letterSpacing: 2 },
  defeatSubtext: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },

  // Turn counter
  resolvingText: { fontSize: fontSize.lg, color: colors.textMuted, fontFamily: fontMono },
  turnCounter: { fontSize: 9, color: colors.textMuted, fontFamily: fontMono, marginTop: spacing.md },
});
