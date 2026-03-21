import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Card from '../../components/common/Card';
import { useGame } from '../../context/GameContext';
import { CodexCategory, CodexEntry } from '../../types';
import codexEntries from '../../data/codex';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const CATEGORIES: { key: CodexCategory; label: string; icon: string }[] = [
  { key: 'world', label: 'World', icon: 'earth' },
  { key: 'zones', label: 'Zones', icon: 'map-marker' },
  { key: 'factions', label: 'Factions', icon: 'account-group' },
  { key: 'enemies', label: 'Enemies', icon: 'sword-cross' },
  { key: 'loot', label: 'Salvage', icon: 'star-four-points' },
  { key: 'personal', label: 'Personal', icon: 'account' },
];

export default function CodexScreen({ navigation }: any) {
  const { state } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<CodexCategory>('world');

  const visibleEntries = useMemo(() => {
    return codexEntries.filter((entry) => {
      if (entry.category !== selectedCategory) return false;
      if (entry.alwaysVisible) return true;
      return state.unlockedCodexIds.includes(entry.id);
    });
  }, [selectedCategory, state.unlockedCodexIds]);

  const lockedCount = useMemo(() => {
    return codexEntries.filter((entry) => {
      if (entry.category !== selectedCategory) return false;
      if (entry.alwaysVisible) return false;
      return !state.unlockedCodexIds.includes(entry.id);
    }).length;
  }, [selectedCategory, state.unlockedCodexIds]);

  const renderPersonalSection = () => {
    if (!state.backstory) {
      return (
        <Card>
          <Text style={styles.emptyText}>
            Complete the backstory questionnaire to fill this section.
          </Text>
        </Card>
      );
    }

    return (
      <>
        <Card title="Identity" icon="card-account-details">
          <Text style={styles.personalLabel}>Name</Text>
          <Text style={styles.personalValue}>{state.playerName}</Text>

          <Text style={styles.personalLabel}>Before the Trail, I was...</Text>
          <Text style={styles.personalValue}>{state.backstory.archetype}</Text>

          <Text style={styles.personalLabel}>The last thing I lost was...</Text>
          <Text style={styles.personalValue}>{state.backstory.lastLost}</Text>

          {state.backstory.customNote && (
            <>
              <Text style={styles.personalLabel}>Notes</Text>
              <Text style={styles.personalValue}>{state.backstory.customNote}</Text>
            </>
          )}
        </Card>

        <Card title="Trail Stats" icon="chart-bar">
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Days on the Trail</Text>
            <Text style={styles.statValue}>{state.dayNumber}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Nodes Visited</Text>
            <Text style={styles.statValue}>{state.visitedNodes.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Codex Entries Unlocked</Text>
            <Text style={styles.statValue}>{state.unlockedCodexIds.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Scrap Earned</Text>
            <Text style={[styles.statValue, { color: colors.scrap }]}>
              {state.totalScrapEarned}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Mini-game High Score</Text>
            <Text style={[styles.statValue, { color: colors.neonCyan }]}>
              {state.highScore}
            </Text>
          </View>
        </Card>
      </>
    );
  };

  return (
    <ScreenWrapper>
      <Text style={styles.header}>Codex</Text>
      <Text style={styles.subtitle}>
        Everything you've learned about the world, the factions, and yourself.
      </Text>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setSelectedCategory(cat.key)}
            style={[
              styles.categoryTab,
              selectedCategory === cat.key && styles.categoryTabActive,
            ]}
          >
            <MaterialCommunityIcons
              name={cat.icon as any}
              size={16}
              color={selectedCategory === cat.key ? colors.neonCyan : colors.textMuted}
              style={{ marginRight: spacing.xs }}
            />
            <Text
              style={[
                styles.categoryLabel,
                selectedCategory === cat.key && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Entries */}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.entriesScroll}>
        {selectedCategory === 'personal' ? (
          renderPersonalSection()
        ) : (
          <>
            {visibleEntries.map((entry) => (
              <Card
                key={entry.id}
                title={entry.title}
                icon={entry.icon}
                onPress={() =>
                  navigation.navigate('CodexEntry', {
                    entryId: entry.id,
                    title: entry.title,
                  })
                }
              >
                <Text style={styles.entryPreview} numberOfLines={2}>
                  {entry.content}
                </Text>
              </Card>
            ))}

            {visibleEntries.length === 0 && (
              <Card>
                <Text style={styles.emptyText}>
                  No entries discovered yet. Explore the Trail to unlock knowledge.
                </Text>
              </Card>
            )}

            {lockedCount > 0 && (
              <View style={styles.lockedInfo}>
                <View style={styles.lockedRow}>
                  <MaterialCommunityIcons name="lock" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                  <Text style={styles.lockedText}>
                    {lockedCount} more {lockedCount === 1 ? 'entry' : 'entries'} to discover
                  </Text>
                </View>
              </View>
            )}
          </>
        )}
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
    marginBottom: spacing.sm,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  categoryContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  categoryTabActive: {
    borderColor: colors.neonCyan,
    backgroundColor: colors.neonCyan + '15',
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: colors.neonCyan,
    fontWeight: '600',
  },
  entriesScroll: {
    flex: 1,
  },
  entryPreview: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: spacing.md,
  },
  lockedInfo: {
    padding: spacing.md,
    alignItems: 'center',
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  personalLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: 4,
  },
  personalValue: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
