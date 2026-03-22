import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import ScrapBoyFrame from '../../components/arcade/ScrapBoyFrame';
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

// ─── Pixel art text icons for RPS ───
const PIXEL_ICONS: Record<RpsChoice, string> = {
  rock: '✊',
  paper: '✋',
  scissors: '✌',
};

const CHOICE_LABELS: Record<RpsChoice, string> = {
  rock: 'ROCK',
  paper: 'PAPER',
  scissors: 'SCISSORS',
};

const RESULT_CONFIG = {
  win: { label: '>> WIN <<', color: '#00FF88', pixel: '★' },
  lose: { label: '>> LOSE <<', color: '#FF4466', pixel: '✗' },
  draw: { label: '>> DRAW <<', color: '#FFAA00', pixel: '=' },
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
      const m = await joinQueue(state.playerName, 0); // stake = 0 (wagering disabled)
      setMatch(m);
      setView('choose');
    } catch {
      setView('menu');
    }
  };

  const handleChoice = async (choice: RpsChoice) => {
    if (!match) return;
    setView('searching');
    try {
      const resolved = await submitChoice(choice);
      setMatch(resolved);

      if (resolved.result === 'win') dispatch({ type: 'RPS_WIN' });
      else if (resolved.result === 'lose') dispatch({ type: 'RPS_LOSS' });
      else dispatch({ type: 'RPS_DRAW' });

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
      <ScreenWrapper padded={false}>
        <ScrapBoyFrame title="SCRAP-BOY">
          <View style={s.screenContent}>
            <Text style={s.pixelTitle}>TRAIL{'\n'}STANDOFF</Text>
            <Text style={s.pixelSub}>- RPS DUEL -</Text>

            <View style={s.pixelDivider} />

            {/* Record */}
            <View style={s.recordRow}>
              <Text style={[s.recordStat, { color: '#00FF88' }]}>W:{state.rpsWins}</Text>
              <Text style={[s.recordStat, { color: '#FF4466' }]}>L:{state.rpsLosses}</Text>
              <Text style={[s.recordStat, { color: '#FFAA00' }]}>D:{state.rpsDraws}</Text>
            </View>

            {totalGames > 0 && (
              <Text style={s.winRate}>
                {Math.round((state.rpsWins / totalGames) * 100)}% WIN RATE
              </Text>
            )}

            <View style={s.pixelDivider} />

            <TouchableOpacity style={s.pixelBtn} onPress={handleFindMatch} activeOpacity={0.7}>
              <Text style={s.pixelBtnText}>&gt; FIND MATCH</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.pixelBtnGhost} onPress={handleLeaderboard} activeOpacity={0.7}>
              <Text style={s.pixelBtnGhostText}>&gt; LEADERBOARD</Text>
            </TouchableOpacity>
          </View>
        </ScrapBoyFrame>
      </ScreenWrapper>
    );
  }

  // ─── SEARCHING ───
  if (view === 'searching') {
    return (
      <ScreenWrapper padded={false}>
        <ScrapBoyFrame title="SCRAP-BOY">
          <View style={s.screenContent}>
            <Text style={s.pixelTitle}>SCANNING{'\n'}FREQUENCIES</Text>
            <View style={s.pixelDivider} />
            <ActivityIndicator size="small" color="#FFAA00" />
            <Text style={s.scanDots}>. . . . .</Text>
          </View>
        </ScrapBoyFrame>
      </ScreenWrapper>
    );
  }

  // ─── CHOOSE ───
  if (view === 'choose' && match) {
    return (
      <ScreenWrapper padded={false}>
        <ScrapBoyFrame title="SCRAP-BOY">
          <View style={s.screenContent}>
            <Text style={s.pixelLabel}>OPPONENT FOUND</Text>
            <Text style={s.opponentName}>vs {match.opponentName}</Text>

            <View style={s.pixelDivider} />
            <Text style={s.pixelLabel}>MAKE YOUR CALL</Text>

            <View style={s.choiceRow}>
              {(['rock', 'paper', 'scissors'] as RpsChoice[]).map(choice => (
                <TouchableOpacity
                  key={choice}
                  style={s.choiceBtn}
                  onPress={() => handleChoice(choice)}
                  activeOpacity={0.6}
                >
                  <Text style={s.choiceIcon}>{PIXEL_ICONS[choice]}</Text>
                  <Text style={s.choiceLabel}>{CHOICE_LABELS[choice]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrapBoyFrame>
      </ScreenWrapper>
    );
  }

  // ─── RESULT ───
  if (view === 'result' && match?.result) {
    const rc = RESULT_CONFIG[match.result];
    return (
      <ScreenWrapper padded={false}>
        <ScrapBoyFrame title="SCRAP-BOY">
          <View style={s.screenContent}>
            <Text style={[s.resultBanner, { color: rc.color }]}>
              {rc.pixel} {rc.label} {rc.pixel}
            </Text>

            <View style={s.matchupRow}>
              <View style={s.matchupSide}>
                <Text style={s.matchupLabel}>YOU</Text>
                <Text style={s.matchupIcon}>{PIXEL_ICONS[match.playerChoice!]}</Text>
                <Text style={s.matchupChoice}>{CHOICE_LABELS[match.playerChoice!]}</Text>
              </View>
              <Text style={s.matchupVs}>VS</Text>
              <View style={s.matchupSide}>
                <Text style={s.matchupLabel}>{match.opponentName.toUpperCase()}</Text>
                <Text style={s.matchupIcon}>{PIXEL_ICONS[match.opponentChoice!]}</Text>
                <Text style={s.matchupChoice}>{CHOICE_LABELS[match.opponentChoice!]}</Text>
              </View>
            </View>

            {match.result === 'win' && (
              <Text style={s.rewardLine}>+2 SCRAP</Text>
            )}

            <View style={s.pixelDivider} />

            <TouchableOpacity style={s.pixelBtn} onPress={handleFindMatch} activeOpacity={0.7}>
              <Text style={s.pixelBtnText}>&gt; REMATCH</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pixelBtnGhost} onPress={() => { clearMatch(); setView('menu'); }} activeOpacity={0.7}>
              <Text style={s.pixelBtnGhostText}>&gt; BACK</Text>
            </TouchableOpacity>
          </View>
        </ScrapBoyFrame>
      </ScreenWrapper>
    );
  }

  // ─── LEADERBOARD ───
  if (view === 'leaderboard') {
    return (
      <ScreenWrapper padded={false}>
        <ScrapBoyFrame title="SCRAP-BOY">
          <ScrollView style={s.lbScroll} contentContainerStyle={s.screenContent}>
            <Text style={s.pixelTitle}>LEADERBOARD</Text>
            <View style={s.pixelDivider} />

            <View style={s.lbHeader}>
              <Text style={[s.lbHeaderText, { width: 24 }]}>#</Text>
              <Text style={[s.lbHeaderText, { flex: 1 }]}>NAME</Text>
              <Text style={[s.lbHeaderText, { width: 36 }]}>W</Text>
              <Text style={[s.lbHeaderText, { width: 36 }]}>L</Text>
            </View>

            {leaderboard.map((entry, i) => {
              const isPlayer = entry.playerName === state.playerName;
              return (
                <View key={i} style={[s.lbRow, isPlayer && s.lbRowPlayer]}>
                  <Text style={[s.lbRank, i < 3 && { color: '#FFAA00' }]}>{i + 1}.</Text>
                  <Text style={[s.lbName, isPlayer && { color: '#00FF88' }]} numberOfLines={1}>
                    {entry.playerName}{isPlayer ? '*' : ''}
                  </Text>
                  <Text style={[s.lbWins]}>{entry.wins}</Text>
                  <Text style={s.lbLosses}>{entry.losses}</Text>
                </View>
              );
            })}

            <View style={s.pixelDivider} />
            <TouchableOpacity style={s.pixelBtnGhost} onPress={() => setView('menu')} activeOpacity={0.7}>
              <Text style={s.pixelBtnGhostText}>&gt; BACK</Text>
            </TouchableOpacity>
          </ScrollView>
        </ScrapBoyFrame>
      </ScreenWrapper>
    );
  }

  return null;
}

// ─── Pixel-style green-on-black styles ───
const PIXEL_GREEN = '#00FF88';
const PIXEL_DIM = '#336644';
const PIXEL_BG = '#0A0E14';

const s = StyleSheet.create({
  screenContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  pixelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PIXEL_GREEN,
    textAlign: 'center',
    letterSpacing: 3,
    fontFamily: 'monospace',
    lineHeight: 26,
  },
  pixelSub: {
    fontSize: 11,
    color: PIXEL_DIM,
    letterSpacing: 4,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  pixelLabel: {
    fontSize: 11,
    color: PIXEL_DIM,
    letterSpacing: 2,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  pixelDivider: {
    width: '80%',
    height: 1,
    backgroundColor: PIXEL_DIM + '40',
    marginVertical: spacing.md,
  },

  // Record
  recordRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginVertical: spacing.sm,
  },
  recordStat: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  winRate: {
    fontSize: 10,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },

  // Buttons
  pixelBtn: {
    backgroundColor: PIXEL_GREEN + '15',
    borderWidth: 1,
    borderColor: PIXEL_GREEN + '60',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: 2,
    marginBottom: spacing.sm,
  },
  pixelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PIXEL_GREEN,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },
  pixelBtnGhost: {
    paddingVertical: spacing.sm,
  },
  pixelBtnGhostText: {
    fontSize: 11,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    letterSpacing: 2,
  },

  // Searching
  scanDots: {
    fontSize: 18,
    color: '#FFAA00',
    fontFamily: 'monospace',
    letterSpacing: 6,
    marginTop: spacing.md,
  },

  // Choose
  opponentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF4466',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  choiceBtn: {
    backgroundColor: PIXEL_GREEN + '0A',
    borderWidth: 2,
    borderColor: PIXEL_GREEN + '40',
    borderRadius: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    width: 90,
  },
  choiceIcon: {
    fontSize: 32,
  },
  choiceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: PIXEL_GREEN,
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: spacing.sm,
  },

  // Result
  resultBanner: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  matchupSide: {
    alignItems: 'center',
    width: 90,
  },
  matchupLabel: {
    fontSize: 8,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginBottom: 4,
  },
  matchupIcon: {
    fontSize: 28,
  },
  matchupChoice: {
    fontSize: 9,
    color: PIXEL_GREEN,
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: 4,
  },
  matchupVs: {
    fontSize: 11,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  rewardLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFAA00',
    fontFamily: 'monospace',
    letterSpacing: 2,
    marginTop: spacing.md,
  },

  // Leaderboard
  lbScroll: { flex: 1 },
  lbHeader: {
    flexDirection: 'row',
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: PIXEL_DIM + '30',
    marginBottom: spacing.xs,
    width: '100%',
  },
  lbHeaderText: {
    fontSize: 9,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    width: '100%',
  },
  lbRowPlayer: {
    backgroundColor: PIXEL_GREEN + '10',
    borderRadius: 2,
    paddingHorizontal: 4,
  },
  lbRank: {
    width: 24,
    fontSize: 11,
    color: PIXEL_DIM,
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  lbName: {
    flex: 1,
    fontSize: 11,
    color: PIXEL_GREEN,
    fontFamily: 'monospace',
  },
  lbWins: {
    width: 36,
    fontSize: 11,
    color: '#00FF88',
    fontFamily: 'monospace',
    fontWeight: '700',
    textAlign: 'center',
  },
  lbLosses: {
    width: 36,
    fontSize: 11,
    color: '#FF4466',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
