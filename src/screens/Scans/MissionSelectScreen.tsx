import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useGame } from '../../context/GameContext';
import { MAP_DEFS, MISSION_MAPS, generateSectorForMap, MapId } from '../../data/sectorMaps';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import NeonButton from '../../components/common/NeonButton';
import { colors, spacing, fontSize, borderRadius, fontMono } from '../../theme';
import AudioManager from '../../services/audioManager';

export default function MissionSelectScreen() {
  const { state, dispatch } = useGame();
  const nav = useNavigation<any>();

  const roverDisabled = state.roverHealth <= 0;

  const handleSelectMission = (mapId: MapId) => {
    AudioManager.playSfx('ui_confirm');
    AudioManager.vibrate('medium');
    const mapDef = MAP_DEFS[mapId];
    const isCompleted = state.completedMapIds.includes(mapId);

    // Only generate a fresh sector if:
    // 1. We're switching to a different map than the one currently loaded, OR
    // 2. The current sector for this map was fully completed (re-run)
    const currentSector = state.seekerScans.currentSector;
    const isResumingSameMap = state.currentMapId === mapId
      && currentSector.tiles.length > 0
      && !currentSector.completed;

    dispatch({ type: 'SET_CURRENT_MAP', payload: mapId });

    if (!isResumingSameMap) {
      const sector = generateSectorForMap(mapId);
      dispatch({ type: 'LOAD_SECTOR_FOR_MAP', payload: sector });
    }

    // Navigate to the scan screen
    nav.navigate('ScanMain', { mapId, briefing: isCompleted ? undefined : mapDef.briefing });
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.header}>Mission Board</Text>
        <Text style={styles.subtitle}>
          Pick a sector. Each job runs on your daily scan window.
        </Text>

        {/* ─── Season Complete Card ─── */}
        {MISSION_MAPS.every(id => state.completedMapIds.includes(id)) && (
          <View style={styles.seasonCard}>
            <MaterialCommunityIcons name="trophy" size={48} color={colors.neonGreen} />
            <Text style={styles.seasonTitle}>SEASON COMPLETE</Text>
            <Text style={styles.seasonLore}>
              You've cleared every sector. The Directorate knows your callsign now.
              The signal is still out there. Whatever AEGIS is broadcasting,
              you're closer than anyone to finding it.
            </Text>
            <View style={styles.seasonStatsGrid}>
              <View style={styles.seasonStatCell}>
                <Text style={styles.seasonStatValue}>4/4</Text>
                <Text style={styles.seasonStatLabel}>Maps Cleared</Text>
              </View>
              <View style={styles.seasonStatCell}>
                <Text style={styles.seasonStatValue}>{state.totalScrapEarned}</Text>
                <Text style={styles.seasonStatLabel}>Scrap Earned</Text>
              </View>
              <View style={styles.seasonStatCell}>
                <Text style={styles.seasonStatValue}>{state.dayNumber}</Text>
                <Text style={styles.seasonStatLabel}>Days Survived</Text>
              </View>
              <View style={styles.seasonStatCell}>
                <Text style={styles.seasonStatValue}>{state.seekerScans.streakDay}</Text>
                <Text style={styles.seasonStatLabel}>Streak Peak</Text>
              </View>
            </View>
            <View style={styles.seasonDivider} />
            <Text style={styles.seasonRerunTitle}>RE-RUN AVAILABLE</Text>
            <Text style={styles.seasonRerunText}>
              All sectors are open for farming. Better gear drops on repeat runs.
              Keep your streak alive — new sectors are coming.
            </Text>
          </View>
        )}

        {MISSION_MAPS.map((mapId) => {
          const mapDef = MAP_DEFS[mapId];
          const isUnlocked = state.unlockedMapIds.includes(mapId);
          const isCompleted = state.completedMapIds.includes(mapId);
          const requiresMet = mapDef.requiresCompleted.every((req) =>
            state.completedMapIds.includes(req)
          );
          const available = isUnlocked && requiresMet && !roverDisabled;

          return (
            <TouchableOpacity
              key={mapId}
              style={[styles.missionCard, !available && styles.missionCardLocked]}
              onPress={() => available && handleSelectMission(mapId)}
              activeOpacity={available ? 0.8 : 1}
              disabled={!available}
            >
              <ImageBackground
                source={mapDef.background}
                style={styles.missionBg}
                imageStyle={styles.missionBgImage}
                resizeMode="cover"
              >
                <View style={styles.missionOverlay}>
                  <View style={styles.missionTop}>
                    <MaterialCommunityIcons
                      name={mapDef.icon as any}
                      size={24}
                      color={
                        isCompleted
                          ? colors.neonGreen
                          : available
                          ? colors.neonCyan
                          : colors.textMuted
                      }
                    />
                    {isCompleted && (
                      <View style={styles.completedBadge}>
                        <MaterialCommunityIcons name="check" size={12} color={colors.neonGreen} />
                        <Text style={styles.completedText}>CLEARED</Text>
                      </View>
                    )}
                    {!available && (
                      <View style={styles.lockedBadge}>
                        <MaterialCommunityIcons name="lock" size={12} color={colors.textMuted} />
                        <Text style={styles.lockedText}>LOCKED</Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.missionName, !available && { color: colors.textMuted }]}>
                    {mapDef.name}
                  </Text>
                  <Text style={styles.missionSubtitle}>{mapDef.subtitle}</Text>
                  <Text style={styles.missionDesc} numberOfLines={2}>
                    {mapDef.description}
                  </Text>

                  {available && !isCompleted && (
                    <View style={styles.missionCta}>
                      <NeonButton
                        title="Deploy"
                        onPress={() => handleSelectMission(mapId)}
                        variant="primary"
                        size="sm"
                      />
                    </View>
                  )}
                  {available && isCompleted && (
                    <View style={styles.missionCta}>
                      <NeonButton
                        title="Run Again"
                        onPress={() => handleSelectMission(mapId)}
                        variant="secondary"
                        size="sm"
                      />
                    </View>
                  )}

                  {!available && roverDisabled && isUnlocked && requiresMet && (
                    <Text style={styles.lockReason}>
                      Rover disabled. Repair it with Scrap at camp first.
                    </Text>
                  )}
                  {!available && !roverDisabled && (
                    <Text style={styles.lockReason}>
                      Clear {mapDef.requiresCompleted.map((r) => MAP_DEFS[r].name).join(', ')} first
                    </Text>
                  )}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  header: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: fontMono,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
    fontFamily: fontMono,
  },

  // ─── Mission Card ───
  missionCard: {
    borderRadius: 0,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.panelBorder,
  },
  missionCardLocked: {
    opacity: 0.5,
  },
  missionBg: {
    width: '100%',
    minHeight: 180,
  },
  missionBgImage: {
    borderRadius: 0,
  },
  missionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 11, 16, 0.72)',
    padding: spacing.md,
    justifyContent: 'flex-end',
    minHeight: 180,
  },
  missionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  missionName: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: fontMono,
    letterSpacing: 1,
  },
  missionSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: fontMono,
  },
  missionDesc: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  missionCta: {
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neonGreen + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.neonGreen + '40',
  },
  completedText: {
    fontSize: fontSize.xs,
    color: colors.neonGreen,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.surfaceLight,
  },
  lockedText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: fontMono,
  },
  lockReason: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    fontFamily: fontMono,
  },

  // ─── Season Complete ───
  seasonCard: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.neonGreen + '60',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  seasonTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    fontFamily: fontMono,
    color: colors.neonGreen,
    letterSpacing: 3,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  seasonLore: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontFamily: fontMono,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  seasonStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    marginBottom: spacing.md,
  },
  seasonStatCell: {
    width: '46%',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.panelBorder,
    padding: spacing.sm,
    alignItems: 'center',
  },
  seasonStatValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    fontFamily: fontMono,
    color: colors.neonGreen,
  },
  seasonStatLabel: {
    fontSize: fontSize.xs,
    fontFamily: fontMono,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  seasonDivider: {
    width: '80%',
    height: 1,
    backgroundColor: colors.panelBorder,
    marginVertical: spacing.md,
  },
  seasonRerunTitle: {
    fontSize: fontSize.sm,
    fontWeight: '800',
    fontFamily: fontMono,
    color: colors.neonAmber,
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  seasonRerunText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontFamily: fontMono,
    textAlign: 'center',
    lineHeight: 18,
  },
});
