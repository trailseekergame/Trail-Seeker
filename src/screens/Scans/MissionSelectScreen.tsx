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
});
