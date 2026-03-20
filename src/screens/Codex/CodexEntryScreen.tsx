import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import codexEntries from '../../data/codex';
import { colors, spacing, fontSize } from '../../theme';

export default function CodexEntryScreen({ route }: any) {
  const { entryId } = route.params;
  const entry = codexEntries.find((e) => e.id === entryId);

  if (!entry) {
    return (
      <ScreenWrapper>
        <Text style={styles.errorText}>Entry not found.</Text>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.icon}>{entry.icon}</Text>
        <Text style={styles.category}>{entry.category.toUpperCase()}</Text>
        <Text style={styles.title}>{entry.title}</Text>
        <Text style={styles.content}>{entry.content}</Text>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  category: {
    fontSize: fontSize.xs,
    color: colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 26,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.neonRed,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
