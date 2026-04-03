import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, INITIAL_GAME_STATE, LeaderboardEntry, GearItem } from '../types';
import { ALL_GEAR_ITEMS } from '../data/gearItems';

/** Migrate old gear items that are missing zone/lore fields */
function migrateGearItem(item: any): GearItem {
  if (item.zone && item.lore) return item as GearItem;
  // Try to find matching item in catalog by name + slotId
  const catalogMatch = ALL_GEAR_ITEMS.find(
    g => g.name === item.name && g.slotId === item.slotId
  );
  if (catalogMatch) return { ...catalogMatch, quality: item.quality };
  // Fallback: infer zone from slotId
  const ZONE_MAP: Record<string, string> = {
    optics_rig: 'sensor', cortex_link: 'sensor',
    exo_vest: 'core', grip_gauntlets: 'core',
    nav_boots: 'drive', salvage_drone: 'drive',
  };
  return {
    ...item,
    zone: ZONE_MAP[item.slotId] || 'core',
    lore: item.lore || 'Salvaged from the wastes. Origin unknown.',
  };
}

const STORAGE_KEYS = {
  GAME_STATE: '@trail_seeker_game_state',
  LEADERBOARD: '@trail_seeker_leaderboard',
} as const;

/**
 * Persistence layer using AsyncStorage
 */
export async function saveGameState(state: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

export async function loadGameState(): Promise<GameState> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (json) {
      const saved = JSON.parse(json) as Partial<GameState>;
      // Deep-merge seekerScans so new fields get defaults
      const mergedScans = {
        ...INITIAL_GAME_STATE.seekerScans,
        ...(saved.seekerScans || {}),
        // Ensure new array fields exist even if saved state predates them
        newGearIds: saved.seekerScans?.newGearIds ?? [],
        // Migrate old gear items that are missing zone/lore
        gearInventory: (saved.seekerScans?.gearInventory || []).map(migrateGearItem),
      };
      return { ...INITIAL_GAME_STATE, ...saved, seekerScans: mergedScans };
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return { ...INITIAL_GAME_STATE };
}

export async function clearGameState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  } catch (e) {
    console.error('Failed to clear game state:', e);
  }
}

export async function saveLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save leaderboard:', e);
  }
}

export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (json) return JSON.parse(json);
  } catch (e) {
    console.error('Failed to load leaderboard:', e);
  }
  return [];
}
