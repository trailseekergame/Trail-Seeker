import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import AudioManager from '../../services/audioManager';
import { useGame } from '../../context/GameContext';
import { AVATARS } from '../../data/avatars';
import { AvatarId } from '../../types';
import { colors, spacing, fontSize, borderRadius, fontMono } from '../../theme';

export default function SettingsScreen() {
  const { state, dispatch } = useGame();
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

        {/* ─── OPERATOR ─── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OPERATOR</Text>

          <View style={styles.avatarRow}>
            {(Object.keys(AVATARS) as AvatarId[]).map((id) => (
              <TouchableOpacity
                key={id}
                onPress={() => dispatch({ type: 'SET_AVATAR', payload: id })}
                style={[
                  styles.avatarCard,
                  state.avatarId === id && styles.avatarCardSelected,
                ]}
                activeOpacity={0.8}
              >
                <Image
                  source={AVATARS[id].image}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.avatarHint}>Cosmetic only. No gameplay effect.</Text>
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
    fontFamily: fontMono,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: spacing.md,
    fontFamily: fontMono,
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
    fontFamily: fontMono,
  },
  // ─── Avatar ───
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  avatarCard: {
    borderWidth: 2,
    borderColor: colors.surfaceLight,
    borderRadius: 0,
    overflow: 'hidden',
    width: 72,
    height: 100,
  },
  avatarCardSelected: {
    borderColor: colors.neonGreen,
    borderWidth: 3,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarHint: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
  },
});
