import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import NeonButton from '../../components/common/NeonButton';
import { useGame } from '../../context/GameContext';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function ArcadeScreen({ navigation }: any) {
  const { state } = useGame();

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Arcade</Text>
        <Text style={styles.subtitle}>
          Downtime between runs. Keep sharp, pull some scrap on the side.
        </Text>

        {/* Trail Flier */}
        <Card title="Trail Flier" icon="play" accentColor={colors.neonCyan}>
          <Text style={styles.gameDesc}>
            Pilot your rover-drone through the debris field. One-tap to dodge. How far can you
            fly?
          </Text>
          <View style={styles.gameStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{state.highScore}</Text>
              <Text style={styles.statLabel}>High Score</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{state.leaderboard.length}</Text>
              <Text style={styles.statLabel}>Runs</Text>
            </View>
          </View>
          <NeonButton
            title="Play Trail Flier"
            onPress={() => navigation.navigate('MiniGame')}
            variant="primary"
            icon="play"
          />
        </Card>

        {/* Coming Soon – Rock Paper Scissors */}
        <Card title="Trail Standoff" icon="close" style={styles.lockedCard}>
          <Text style={styles.gameDesc}>
            Rock-Paper-Scissors with a wasteland twist. Challenge other drifters.
          </Text>
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>COMING SOON</Text>
          </View>
        </Card>

        {/* Leaderboard */}
        <Card title="Leaderboard" icon="trophy">
          {state.leaderboard.length === 0 ? (
            <Text style={styles.emptyText}>
              No scores yet. Play Trail Flier to get on the board.
            </Text>
          ) : (
            <View>
              {state.leaderboard.slice(0, 10).map((entry, i) => (
                <View key={i} style={styles.leaderRow}>
                  <Text style={styles.leaderRank}>#{i + 1}</Text>
                  <Text style={styles.leaderName}>{entry.playerName}</Text>
                  <View style={styles.leaderScores}>
                    <Text style={styles.leaderDistance}>{entry.distance}m</Text>
                    <Text style={styles.leaderComposite}>{entry.compositeScore}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Rewards Info */}
        <Card title="Payouts" icon="cog">
          <Text style={styles.gameDesc}>
            Time in the sim pays out:
          </Text>
          <View style={styles.rewardsList}>
            <Text style={styles.rewardItem}>• Play a round: +1 Scrap</Text>
            <Text style={styles.rewardItem}>• Reach 500m: +3 Scrap</Text>
            <Text style={styles.rewardItem}>• Reach 1000m: +5 Scrap, +2 Supplies</Text>
            <Text style={styles.rewardItem}>• New high score: +3 Supplies</Text>
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  gameDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.neonCyan,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  lockedCard: {
    opacity: 0.6,
  },
  comingSoon: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: fontSize.sm,
    color: colors.neonAmber,
    fontWeight: '700',
    letterSpacing: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: spacing.md,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  leaderRank: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.neonAmber,
    width: 40,
  },
  leaderName: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
  },
  leaderScores: {
    alignItems: 'flex-end',
  },
  leaderDistance: {
    fontSize: fontSize.sm,
    color: colors.neonCyan,
    fontWeight: '600',
  },
  leaderComposite: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  rewardsList: {
    gap: spacing.xs,
  },
  rewardItem: {
    fontSize: fontSize.sm,
    color: colors.neonGreen,
  },
});
