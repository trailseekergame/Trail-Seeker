import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState, INITIAL_GAME_STATE, LeaderboardEntry } from '../types';

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
      // Merge with defaults to handle schema upgrades
      return { ...INITIAL_GAME_STATE, ...saved };
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
