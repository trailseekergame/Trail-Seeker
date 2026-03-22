import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { useGame } from '../../context/GameContext';
import {
  joinQueue,
  submitChoice,
  clearMatch,
  fetchLeaderboard,
  RpsChoice,
  RpsMatch,
  RpsLeaderEntry,
} from '../../services/rpsService';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

type ScreenView = 'menu' | 'searching' | 'choose' | 'result' | 'leaderboard';

const CHOICE_ICONS: Record<RpsChoice, string> = {
  rock: 'hand-back-fist',
  paper: 'hand-back-right',
  scissors: 'content-cut',
};

const CHOICE_LABELS: Record<RpsChoice, string> = {
  rock: 'ROCK',
  paper: 'PAPER',
  scissors: 'SCISSORS',
};

const RESULT_CONFIG = {
  win: { label: 'YOU WIN', color: colors.neonGreen, icon: 'trophy' },
  lose: { label: 'YOU LOSE', color: colors.neonRed, icon: 'skull' },
  draw: { label: 'DRAW', color: colors.neonAmber, icon: 'equal' },
};

export default function RPSScreen() {
  const { state, dispatch } = useGame();
  const [view, setView] = useState<ScreenView>('menu');
  const [match, setMatch] = useState<RpsMatch | null>(null);
  const [leaderboard, setLeaderboard] = useState<RpsLeaderEntry[]>([]);

  const handleFindMatch = async () => {
    setView('searching');
    clearMatch();
    try {
      const m = await joinQueue(state.playerName);
      setMatch(m);
      setView('choose');
    } catch {
      setView('menu');
    }
  };

  const handleChoice = async (choice: RpsChoice) => {
    if (!match) return;
    setView('searching'); // brief loading while opponent "picks"
    try {
      const resolved = await submitChoice(choice);
      setMatch(resolved);

      // Record result
      if (resolved.result === 'win') dispatch({ type: 'RPS_WIN' });
      else if (resolved.result === 'lose') dispatch({ type: 'RPS_LOSS' });
      else dispatch({ type: 'RPS_DRAW' });

      // Small scrap reward for winning
      if (resolved.result === 'win') {
        dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: { scrap: 2 } });
      }

      setView('result');
    } catch {
      setView('menu');
    }
  };

  const handleLeaderboard = async () => {
    setView('searching');
    const data = await fetchLeaderboard(state.playerName, state.rpsWins, state.rpsLosses, state.rpsDraws);
    setLeaderboard(data);
    setView('leaderboard');
  };

  const totalGames = state.rpsWins + state.rpsLosses + state.rpsDraws;

  // ─── MENU ───
  if (view === 'menu') {
    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={styles.center}>
          <MaterialCommunityIcons name="sword-cross" size={48} color={colors.neonAmber} style={styles.heroIcon} />
          <Text style={styles.title}>Trail Standoff</Text>
          <Text style={styles.subtitle}>Rock-Paper-Scissors. Wasteland rules.</Text>

          {/* Record */}
          <View style={styles.recordRow}>
            <View style={styles.recordItem}>
              <Text style={[styles.recordValue, { color: colors.neonGreen }]}>{state.rpsWins}</Text>
              <Text style={styles.recordLabel}>Wins</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={[styles.recordValue, { color: colors.neonRed }]}>{state.rpsLosses}</Text>
              <Text style={styles.recordLabel}>Losses</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={[styles.recordValue, { color: colors.neonAmber }]}>{state.rpsDraws}</Text>
              <Text style={styles.recordLabel}>Draws</Text>
            </View>
          </View>

          <NeonButton
            title="Find Opponent"
            onPress={handleFindMatch}
            variant="primary"
            size="lg"
            icon="sword-cross"
            style={styles.mainBtn}
          />
          <NeonButton
            title="Leaderboard"
            onPress={handleLeaderboard}
            variant="secondary"
            size="sm"
            icon="trophy"
            style={styles.secondaryBtn}
          />

          {totalGames > 0 && (
            <Text style={styles.winRate}>
              Win rate: {Math.round((state.rpsWins / totalGames) * 100)}% ({totalGames} games)
            </Text>
          )}
        </ScrollView>
      </ScreenWrapper>
    );
  }

  // ─── SEARCHING ───
  if (view === 'searching') {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.neonAmber} />
          <Text style={styles.searchText}>Searching for opponent...</Text>
          <Text style={styles.searchSub}>Scanning nearby frequencies</Text>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── CHOOSE ───
  if (view === 'choose' && match) {
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <Text style={styles.matchedText}>MATCHED</Text>
          <Text style={styles.opponentName}>vs. {match.opponentName}</Text>

          <Text style={styles.choosePrompt}>Make your call.</Text>

          <View style={styles.choiceRow}>
            {(['rock', 'paper', 'scissors'] as RpsChoice[]).map(choice => (
              <TouchableOpacity
                key={choice}
                style={styles.choiceBtn}
                onPress={() => handleChoice(choice)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={CHOICE_ICONS[choice] as any}
                  size={40}
                  color={colors.neonAmber}
                />
                <Text style={styles.choiceLabel}>{CHOICE_LABELS[choice]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  // ─── RESULT ───
  if (view === 'result' && match?.result) {
    const rc = RESULT_CONFIG[match.result];
    return (
      <ScreenWrapper>
        <View style={styles.center}>
          <MaterialCommunityIcons name={rc.icon as any} size={56} color={rc.color} style={styles.heroIcon} />
          <Text style={[styles.resultLabel, { color: rc.color }]}>{rc.label}</Text>

          <View style={styles.resultMatchup}>
            <View style={styles.resultSide}>
              <Text style={styles.resultPlayer}>You</Text>
              <MaterialCommunityIcons
                name={CHOICE_ICONS[match.playerChoice!] as any}
                size={36}
                color={colors.textPrimary}
              />
              <Text style={styles.resultChoice}>{CHOICE_LABELS[match.playerChoice!]}</Text>
            </View>
            <Text style={styles.resultVs}>vs</Text>
            <View style={styles.resultSide}>
              <Text style={styles.resultPlayer}>{match.opponentName}</Text>
              <MaterialCommunityIcons
                name={CHOICE_ICONS[match.opponentChoice!] as any}
                size={36}
                color={colors.textSecondary}
              />
              <Text style={styles.resultChoice}>{CHOICE_LABELS[match.opponentChoice!]}</Text>
            </View>
          </View>

          {match.result === 'win' && (
            <View style={styles.rewardBadge}>
              <MaterialCommunityIcons name="cog" size={14} color={colors.scrap} />
              <Text style={styles.rewardText}>+2 Scrap</Text>
            </View>
          )}

          <NeonButton
            title="Rematch"
            onPress={handleFindMatch}
            variant="primary"
            size="lg"
            style={styles.mainBtn}
          />
          <NeonButton
            title="Back to Menu"
            onPress={() => { clearMatch(); setView('menu'); }}
            variant="ghost"
            size="sm"
          />
        </View>
      </ScreenWrapper>
    );
  }

  // ─── LEADERBOARD ───
  if (view === 'leaderboard') {
    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={styles.lbContent}>
          <Text style={styles.lbTitle}>RPS Leaderboard</Text>

          {leaderboard.map((entry, i) => {
            const isPlayer = entry.playerName === state.playerName;
            return (
              <View key={i} style={[styles.lbRow, isPlayer && styles.lbRowPlayer]}>
                <Text style={styles.lbRank}>#{i + 1}</Text>
                <Text style={[styles.lbName, isPlayer && { color: colors.neonGreen }]}>
                  {entry.playerName}{isPlayer ? ' (you)' : ''}
                </Text>
                <View style={styles.lbStats}>
                  <Text style={[styles.lbWins, { color: colors.neonGreen }]}>{entry.wins}W</Text>
                  <Text style={styles.lbRecord}>{entry.losses}L</Text>
                  <Text style={styles.lbRecord}>{entry.draws}D</Text>
                </View>
              </View>
            );
          })}

          <NeonButton
            title="Back"
            onPress={() => setView('menu')}
            variant="ghost"
            size="sm"
            style={styles.mainBtn}
          />
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  heroIcon: { marginBottom: spacing.md },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  recordRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  recordItem: { alignItems: 'center' },
  recordValue: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  recordLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  mainBtn: { marginTop: spacing.md, width: 240 },
  secondaryBtn: { marginTop: spacing.sm },
  winRate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },

  // Search
  searchText: {
    fontSize: fontSize.lg,
    color: colors.neonAmber,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  searchSub: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Choose
  matchedText: {
    fontSize: fontSize.xs,
    color: colors.neonAmber,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: spacing.xs,
  },
  opponentName: {
    fontSize: fontSize.xl,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xl,
  },
  choosePrompt: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  choiceBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.neonAmber + '40',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    width: 100,
  },
  choiceLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.neonAmber,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },

  // Result
  resultLabel: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: spacing.xl,
  },
  resultMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  resultSide: { alignItems: 'center', width: 100 },
  resultPlayer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  resultChoice: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: spacing.xs,
    letterSpacing: 1,
  },
  resultVs: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  rewardText: {
    fontSize: fontSize.sm,
    color: colors.scrap,
    fontWeight: '700',
  },

  // Leaderboard
  lbContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  lbTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  lbRowPlayer: {
    backgroundColor: colors.neonGreen + '08',
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
  },
  lbRank: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neonAmber,
    width: 40,
  },
  lbName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  lbStats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lbWins: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  lbRecord: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
