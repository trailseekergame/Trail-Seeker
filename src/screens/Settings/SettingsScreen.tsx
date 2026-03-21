import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import AudioManager from '../../services/audioManager';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

export default function SettingsScreen() {
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  useEffect(() => {
    const s = AudioManager.getSettings();
    setSfxEnabled(s.sfxEnabled);
    setMusicEnabled(s.musicEnabled);
    setVibrationEnabled(s.vibrationEnabled);
  }, []);

  const toggleSfx = async (value: boolean) => {
    setSfxEnabled(value);
    await AudioManager.setSfxEnabled(value);
  };

  const toggleMusic = async (value: boolean) => {
    setMusicEnabled(value);
    await AudioManager.setMusicEnabled(value);
  };

  const toggleVibration = async (value: boolean) => {
    setVibrationEnabled(value);
    await AudioManager.setVibrationEnabled(value);
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="cog" size={28} color={colors.neonCyan} />
          <Text style={styles.title}>Settings</Text>
        </View>
        <Text style={styles.subtitle}>Trail Seeker</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AUDIO & HAPTICS</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="volume-high" size={20} color={sfxEnabled ? colors.neonGreen : colors.textMuted} />
              <Text style={styles.settingLabel}>Sound Effects</Text>
            </View>
            <Switch
              value={sfxEnabled}
              onValueChange={toggleSfx}
              trackColor={{ false: colors.surfaceLight, true: colors.neonGreen + '60' }}
              thumbColor={sfxEnabled ? colors.neonGreen : colors.textMuted}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="music" size={20} color={musicEnabled ? colors.neonCyan : colors.textMuted} />
              <Text style={styles.settingLabel}>Music</Text>
            </View>
            <Switch
              value={musicEnabled}
              onValueChange={toggleMusic}
              trackColor={{ false: colors.surfaceLight, true: colors.neonCyan + '60' }}
              thumbColor={musicEnabled ? colors.neonCyan : colors.textMuted}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons name="vibrate" size={20} color={vibrationEnabled ? colors.neonAmber : colors.textMuted} />
              <Text style={styles.settingLabel}>Vibration</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={toggleVibration}
              trackColor={{ false: colors.surfaceLight, true: colors.neonAmber + '60' }}
              thumbColor={vibrationEnabled ? colors.neonAmber : colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>v0.1.0</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceLight,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
