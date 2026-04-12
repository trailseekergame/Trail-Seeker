import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, INITIAL_GAME_STATE, CURRENT_SCHEMA_VERSION, LeaderboardEntry, GearItem } from '../types';
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
    sidearm: 'weapon',
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
 * Schema migration system.
 * Each migration runs once, upgrading save data from version N to N+1.
 * Add new migrations at the bottom of the array when CURRENT_SCHEMA_VERSION is bumped.
 *
 * Example — when you bump CURRENT_SCHEMA_VERSION to 2:
 *   { from: 1, migrate: (s) => { s.newField = 'default'; return s; } }
 */
const MIGRATIONS: { from: number; migrate: (state: any) => any }[] = [
  // { from: 1, migrate: (s) => { /* v1 → v2 changes */ return s; } },
];

function runMigrations(saved: Partial<GameState>): Partial<GameState> {
  let version = (saved as any).schemaVersion || 0;
  let state = { ...saved } as any;

  for (const migration of MIGRATIONS) {
    if (version === migration.from) {
      state = migration.migrate(state);
      version = migration.from + 1;
      state.schemaVersion = version;
    }
  }

  return state;
}

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
      let saved = JSON.parse(json) as Partial<GameState>;

      // Run schema migrations
      saved = runMigrations(saved);

      // Deep-merge seekerScans so new fields get defaults
      const mergedScans = {
        ...INITIAL_GAME_STATE.seekerScans,
        ...(saved.seekerScans || {}),
        // Ensure new array fields exist even if saved state predates them
        newGearIds: saved.seekerScans?.newGearIds ?? [],
        // Migrate old gear items that are missing zone/lore
        gearInventory: (saved.seekerScans?.gearInventory || []).map(migrateGearItem),
      };

      // Deep-merge droneCompanion so new fields get defaults
      const mergedDrone = {
        ...INITIAL_GAME_STATE.droneCompanion,
        ...(saved.droneCompanion || {}),
      };

      return {
        ...INITIAL_GAME_STATE,
        ...saved,
        seekerScans: mergedScans,
        droneCompanion: mergedDrone,
        schemaVersion: CURRENT_SCHEMA_VERSION,
      };
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
