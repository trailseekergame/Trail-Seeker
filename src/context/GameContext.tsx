import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  INITIAL_GAME_STATE,
  MAX_FREE_MOVES,
  MOVE_REFRESH_MS,
  PlayerResources,
  PlayerBackstory,
  EquippedCosmetics,
  LeaderboardEntry,
  FactionAlignment,
  AlignmentFlag,
  TrailOverReason,
  GearItem,
  GearSlotId,
  Sector,
  ScanResult,
} from '../types';
import { saveGameState, loadGameState } from '../services/storage';
import { ALL_GEAR_ITEMS } from '../data/gearItems';
import { generateTestSector } from '../data/testSector';
import { computeDailyScans } from '../systems/scanEngine';

// ─── Actions ───
type GameAction =
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'RESET_STATE' }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_BACKSTORY'; payload: PlayerBackstory }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'MOVE_TO_NODE'; payload: string }
  | { type: 'USE_MOVE' }
  | { type: 'REFRESH_MOVES' }
  | { type: 'ADD_EXTRA_MOVE' }
  | { type: 'APPLY_RESOURCE_CHANGES'; payload: Partial<PlayerResources> }
  | { type: 'ADD_SPECIAL_LOOT'; payload: string }
  | { type: 'REMOVE_SPECIAL_LOOT'; payload: string }
  | { type: 'TAKE_DAMAGE'; payload: number }
  | { type: 'HEAL'; payload: number }
  | { type: 'REPAIR_ROVER'; payload: number }
  | { type: 'DAMAGE_ROVER'; payload: number }
  | { type: 'UNLOCK_CODEX'; payload: string[] }
  | { type: 'UNLOCK_COSMETIC'; payload: string }
  | { type: 'EQUIP_COSMETIC'; payload: Partial<EquippedCosmetics> }
  | { type: 'COMPLETE_EVENT'; payload: string }
  | { type: 'ADD_LEADERBOARD_ENTRY'; payload: LeaderboardEntry }
  | { type: 'INCREMENT_DAY' }
  | { type: 'REVEAL_NODE'; payload: string }
  | { type: 'ADJUST_ALIGNMENT'; payload: Partial<FactionAlignment> }
  | { type: 'SET_ALIGNMENT_FLAG'; payload: AlignmentFlag }
  | { type: 'SET_TRAIL_OVER'; payload: TrailOverReason }
  | { type: 'REVIVE_PLAYER' }
  | { type: 'INIT_SEEKER_SCANS'; payload: { gearInventory: GearItem[]; sector: Sector } }
  | { type: 'USE_SCAN'; payload: ScanResult }
  | { type: 'SET_ACTIVE_GEAR'; payload: GearSlotId[] }
  | { type: 'LOCK_GEAR_TODAY' }
  | { type: 'ADVANCE_STREAK' }
  | { type: 'REFRESH_DAILY_SCANS'; payload: number }
  | { type: 'CLEAR_TILE'; payload: string }
  | { type: 'COMPLETE_SECTOR' }
  | { type: 'RESET_SESSION' };

// ─── Reducer ───
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload };

    case 'RESET_STATE':
      return { ...INITIAL_GAME_STATE, lastMoveRefresh: Date.now() };

    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };

    case 'SET_BACKSTORY':
      return { ...state, backstory: action.payload };

    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingComplete: true };

    case 'MOVE_TO_NODE': {
      const visited = state.visitedNodes.includes(action.payload)
        ? state.visitedNodes
        : [...state.visitedNodes, action.payload];
      return { ...state, currentNodeId: action.payload, visitedNodes: visited };
    }

    case 'USE_MOVE':
      return { ...state, movesRemaining: Math.max(0, state.movesRemaining - 1) };

    case 'REFRESH_MOVES':
      return { ...state, movesRemaining: MAX_FREE_MOVES, lastMoveRefresh: Date.now() };

    case 'ADD_EXTRA_MOVE':
      return { ...state, movesRemaining: state.movesRemaining + 1 };

    case 'APPLY_RESOURCE_CHANGES': {
      const changes = action.payload;
      const newResources = { ...state.resources };
      if (changes.scrap !== undefined) {
        newResources.scrap = Math.max(0, newResources.scrap + changes.scrap);
        if (changes.scrap > 0) {
          return {
            ...state,
            resources: newResources,
            totalScrapEarned: state.totalScrapEarned + changes.scrap,
          };
        }
      }
      if (changes.supplies !== undefined) {
        newResources.supplies = Math.max(0, newResources.supplies + changes.supplies);
        if (changes.supplies < 0) {
          return {
            ...state,
            resources: newResources,
            totalSuppliesUsed: state.totalSuppliesUsed + Math.abs(changes.supplies),
          };
        }
      }
      return { ...state, resources: newResources };
    }

    case 'ADD_SPECIAL_LOOT':
      return {
        ...state,
        resources: {
          ...state.resources,
          specialLoot: [...state.resources.specialLoot, action.payload],
        },
      };

    case 'REMOVE_SPECIAL_LOOT':
      return {
        ...state,
        resources: {
          ...state.resources,
          specialLoot: state.resources.specialLoot.filter((i) => i !== action.payload),
        },
      };

    case 'TAKE_DAMAGE': {
      const newHealth = Math.max(0, state.playerHealth - action.payload);
      if (newHealth <= 0) {
        return { ...state, playerHealth: 0, trailOver: true, trailOverReason: 'hp_zero' };
      }
      return { ...state, playerHealth: newHealth };
    }

    case 'HEAL':
      return { ...state, playerHealth: Math.min(100, state.playerHealth + action.payload) };

    case 'REPAIR_ROVER':
      return { ...state, roverHealth: Math.min(100, state.roverHealth + action.payload) };

    case 'DAMAGE_ROVER':
      return { ...state, roverHealth: Math.max(0, state.roverHealth - action.payload) };

    case 'UNLOCK_CODEX': {
      const newIds = action.payload.filter((id) => !state.unlockedCodexIds.includes(id));
      if (newIds.length === 0) return state;
      return { ...state, unlockedCodexIds: [...state.unlockedCodexIds, ...newIds] };
    }

    case 'UNLOCK_COSMETIC':
      if (state.unlockedCosmeticIds.includes(action.payload)) return state;
      return { ...state, unlockedCosmeticIds: [...state.unlockedCosmeticIds, action.payload] };

    case 'EQUIP_COSMETIC':
      return { ...state, equipped: { ...state.equipped, ...action.payload } };

    case 'COMPLETE_EVENT':
      if (state.completedEventIds.includes(action.payload)) return state;
      return { ...state, completedEventIds: [...state.completedEventIds, action.payload] };

    case 'ADD_LEADERBOARD_ENTRY': {
      const newBoard = [...state.leaderboard, action.payload]
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 50);
      const highScore = Math.max(state.highScore, action.payload.compositeScore);
      return { ...state, leaderboard: newBoard, highScore };
    }

    case 'INCREMENT_DAY':
      return { ...state, dayNumber: state.dayNumber + 1 };

    case 'REVEAL_NODE': {
      // This is handled via zone data, but we track visited for now
      return state;
    }

    case 'ADJUST_ALIGNMENT': {
      const changes = action.payload;
      const newAlignment = { ...state.alignment };
      if (changes.directorate !== undefined) {
        newAlignment.directorate = Math.max(-100, Math.min(100, newAlignment.directorate + changes.directorate));
      }
      if (changes.freeBands !== undefined) {
        newAlignment.freeBands = Math.max(-100, Math.min(100, newAlignment.freeBands + changes.freeBands));
      }
      if (changes.raiders !== undefined) {
        newAlignment.raiders = Math.max(-100, Math.min(100, newAlignment.raiders + changes.raiders));
      }
      return { ...state, alignment: newAlignment };
    }

    case 'SET_ALIGNMENT_FLAG': {
      if (state.alignmentFlags.includes(action.payload)) return state;
      return { ...state, alignmentFlags: [...state.alignmentFlags, action.payload] };
    }

    case 'SET_TRAIL_OVER':
      return { ...state, trailOver: true, trailOverReason: action.payload };

    case 'REVIVE_PLAYER':
      return {
        ...state,
        playerHealth: 30,
        trailOver: false,
        trailOverReason: undefined,
      };

    // ─── Seeker Scan Actions ───

    case 'INIT_SEEKER_SCANS': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          gearInventory: action.payload.gearInventory,
          currentSector: action.payload.sector,
        },
      };
    }

    case 'USE_SCAN': {
      const result = action.payload;
      const ss = state.seekerScans;
      const scansRemaining = result.droneProc ? ss.scansRemaining : ss.scansRemaining - 1;
      const usedToday = { ...ss.scansUsedToday };
      if (!result.droneProc) {
        usedToday[result.scanType] = (usedToday[result.scanType] || 0) + 1;
      }
      return {
        ...state,
        seekerScans: {
          ...ss,
          scansRemaining: Math.max(0, scansRemaining),
          scansUsedToday: usedToday,
          sessionResults: [...ss.sessionResults, result],
          gearLockedToday: true,
        },
      };
    }

    case 'SET_ACTIVE_GEAR': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          activeGearSlots: action.payload.slice(0, state.seekerScans.gearLockedToday ? state.seekerScans.activeGearSlots.length : 3),
        },
      };
    }

    case 'LOCK_GEAR_TODAY': {
      return {
        ...state,
        seekerScans: { ...state.seekerScans, gearLockedToday: true },
      };
    }

    case 'ADVANCE_STREAK': {
      const today = new Date().toISOString().split('T')[0];
      const lastLogin = state.seekerScans.lastLoginDate;
      if (lastLogin === today) return state;

      const lastDate = new Date(lastLogin);
      const todayDate = new Date(today);
      const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

      let newStreak = state.seekerScans.streakDay;
      if (daysDiff === 1) {
        newStreak = Math.min(newStreak + 1, 7);
      } else if (daysDiff > 1) {
        newStreak = Math.max(1, newStreak - (daysDiff - 1));
      }

      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          streakDay: newStreak,
          lastLoginDate: today,
        },
      };
    }

    case 'REFRESH_DAILY_SCANS': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          scansRemaining: action.payload,
          scansTotal: action.payload,
          scansUsedToday: { scout: 0, seeker: 0, gambit: 0 },
          gearLockedToday: false,
          sessionResults: [],
          sessionStartTime: Date.now(),
        },
      };
    }

    case 'CLEAR_TILE': {
      const tiles = state.seekerScans.currentSector.tiles.map(t =>
        t.id === action.payload ? { ...t, cleared: true, type: 'cleared' as const } : t
      );
      const allCleared = tiles.every(t => t.cleared);
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          currentSector: {
            ...state.seekerScans.currentSector,
            tiles,
            completed: allCleared,
          },
          sectorsCompleted: allCleared ? state.seekerScans.sectorsCompleted + 1 : state.seekerScans.sectorsCompleted,
        },
      };
    }

    case 'COMPLETE_SECTOR': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          currentSector: { ...state.seekerScans.currentSector, completed: true },
          sectorsCompleted: state.seekerScans.sectorsCompleted + 1,
        },
      };
    }

    case 'RESET_SESSION': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          sessionResults: [],
          sessionStartTime: Date.now(),
        },
      };
    }

    default:
      return state;
  }
}

// ─── Context ───
interface GameContextValue {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  isLoading: boolean;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [isLoading, setIsLoading] = React.useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load state on mount
  useEffect(() => {
    (async () => {
      const loaded = await loadGameState();
      dispatch({ type: 'LOAD_STATE', payload: loaded });

      // Check move refresh (legacy)
      const elapsed = Date.now() - loaded.lastMoveRefresh;
      if (elapsed >= MOVE_REFRESH_MS) {
        dispatch({ type: 'REFRESH_MOVES' });
      }

      // Initialize Seeker Scan system if not yet set up
      if (!loaded.seekerScans || loaded.seekerScans.gearInventory.length === 0) {
        dispatch({
          type: 'INIT_SEEKER_SCANS',
          payload: { gearInventory: ALL_GEAR_ITEMS, sector: generateTestSector() },
        });
      }

      // Advance streak and refresh scans
      dispatch({ type: 'ADVANCE_STREAK' });
      const scansState = loaded.seekerScans || INITIAL_GAME_STATE.seekerScans;
      const totalScans = computeDailyScans(
        scansState.streakDay,
        scansState.activeGearSlots,
        scansState.gearInventory.length > 0 ? scansState.gearInventory : ALL_GEAR_ITEMS
      );
      dispatch({ type: 'REFRESH_DAILY_SCANS', payload: totalScans });

      setIsLoading(false);
    })();
  }, []);

  // Debounced auto-save on state changes
  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveGameState(state);
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state, isLoading]);

  return (
    <GameContext.Provider value={{ state, dispatch, isLoading }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

export type { GameAction };
