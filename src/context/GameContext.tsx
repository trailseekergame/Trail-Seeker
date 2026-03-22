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
  AvatarId,
  MapId,
} from '../types';
import { saveGameState, loadGameState } from '../services/storage';
import { ALL_GEAR_ITEMS } from '../data/gearItems';
import { generateTestSector } from '../data/testSector';
import { computeDailyScans } from '../systems/scanEngine';
import gameBalanceConfig from '../config/gameBalance.json';

const config = gameBalanceConfig;

// ─── Actions ───
type GameAction =
  | { type: 'LOAD_STATE'; payload: GameState }
  | { type: 'RESET_STATE' }
  | { type: 'SET_PLAYER_NAME'; payload: string }
  | { type: 'SET_AVATAR'; payload: AvatarId }
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
  | { type: 'DAMAGE_TILE'; payload: { tileId: string; amount: number } }
  | { type: 'REVEAL_ADJACENT_TILE'; payload: string }
  | { type: 'SET_SHIELDED_SCAN' }
  | { type: 'CLEAR_SHIELDED_SCAN' }
  | { type: 'SET_BOOSTED_SCAN' }
  | { type: 'CLEAR_BOOSTED_SCAN' }
  | { type: 'COMPLETE_SECTOR' }
  | { type: 'ADD_PATHFINDER_COMPONENT' }
  | { type: 'UNLOCK_PATHFINDER' }
  | { type: 'UPDATE_SCAN_TOTAL'; payload: number }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_CURRENT_MAP'; payload: MapId }
  | { type: 'UNLOCK_MAP'; payload: MapId }
  | { type: 'COMPLETE_MAP'; payload: MapId }
  | { type: 'LOAD_SECTOR_FOR_MAP'; payload: Sector };

// ─── Reducer ───
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload };

    case 'RESET_STATE':
      return { ...INITIAL_GAME_STATE, lastMoveRefresh: Date.now() };

    case 'SET_PLAYER_NAME':
      return { ...state, playerName: action.payload };

    case 'SET_AVATAR':
      return { ...state, avatarId: action.payload };

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
      // Track Pathfinder components from Gambit component drops
      let newComponents = ss.pathfinderComponents;
      let newPathfinderUnlocked = ss.pathfinderUnlocked;
      if (result.outcome === 'component' && !ss.pathfinderUnlocked) {
        newComponents = Math.min(newComponents + 1, config.pathfinder_module.components_required);
        if (newComponents >= config.pathfinder_module.components_required) {
          newPathfinderUnlocked = true;
        }
      }
      return {
        ...state,
        seekerScans: {
          ...ss,
          scansRemaining: Math.max(0, scansRemaining),
          scansUsedToday: usedToday,
          sessionResults: [...ss.sessionResults, result],
          gearLockedToday: true,
          pathfinderComponents: newComponents,
          pathfinderUnlocked: newPathfinderUnlocked,
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
      const today = new Date().toISOString().split('T')[0];
      // Guard: only do a full refresh if it's a new day (prevents mid-session resets)
      if (state.seekerScans.lastRefreshDate === today) {
        return state;
      }
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
          lastRefreshDate: today,
        },
      };
    }

    case 'UPDATE_SCAN_TOTAL': {
      // Light update: only adjusts total + remaining (for pre-lock gear changes)
      if (state.seekerScans.gearLockedToday) return state;
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          scansRemaining: action.payload,
          scansTotal: action.payload,
        },
      };
    }

    case 'CLEAR_TILE': {
      const tiles = state.seekerScans.currentSector.tiles.map(t =>
        t.id === action.payload ? { ...t, cleared: true, type: 'cleared' as const, durability: 0 } : t
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

    case 'DAMAGE_TILE': {
      const { tileId, amount } = action.payload;
      const tiles = state.seekerScans.currentSector.tiles.map(t => {
        if (t.id !== tileId) return t;
        const newDur = Math.max(0, t.durability - amount);
        if (newDur <= 0) {
          return { ...t, durability: 0, cleared: true, type: 'cleared' as const };
        }
        return { ...t, durability: newDur };
      });
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

    case 'REVEAL_ADJACENT_TILE': {
      // Make a random fog tile adjacent to given tile scannable by clearing an adjacent fog tile
      // Actually, reveal means nothing special in adjacency logic — we need to clear it.
      // For micro-event: reveal = mark as cleared so adjacent tiles open up
      const sourceTile = state.seekerScans.currentSector.tiles.find(t => t.id === action.payload);
      if (!sourceTile) return state;
      const fogNeighbors = sourceTile.adjacentTo
        .map(id => state.seekerScans.currentSector.tiles.find(t => t.id === id))
        .filter((t): t is NonNullable<typeof t> => !!t && !t.cleared);
      if (fogNeighbors.length === 0) return state;
      const pick = fogNeighbors[Math.floor(Math.random() * fogNeighbors.length)];
      const tiles = state.seekerScans.currentSector.tiles.map(t =>
        t.id === pick.id ? { ...t, cleared: true, type: 'cleared' as const, durability: 0 } : t
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

    case 'SET_SHIELDED_SCAN':
      return { ...state, seekerScans: { ...state.seekerScans, shieldedNextScan: true } };

    case 'CLEAR_SHIELDED_SCAN':
      return { ...state, seekerScans: { ...state.seekerScans, shieldedNextScan: false } };

    case 'SET_BOOSTED_SCAN':
      return { ...state, seekerScans: { ...state.seekerScans, boostedNextScan: true } };

    case 'CLEAR_BOOSTED_SCAN':
      return { ...state, seekerScans: { ...state.seekerScans, boostedNextScan: false } };

    case 'COMPLETE_SECTOR': {
      // Sector completion rewards: bonus scrap + rare loot chance
      const sectorCount = state.seekerScans.sectorsCompleted + 1;
      const bonusScrap = 10 + (sectorCount * 5); // escalating: 15, 20, 25...
      return {
        ...state,
        resources: {
          ...state.resources,
          scrap: state.resources.scrap + bonusScrap,
        },
        seekerScans: {
          ...state.seekerScans,
          currentSector: { ...state.seekerScans.currentSector, completed: true },
          sectorsCompleted: sectorCount,
        },
      };
    }

    case 'ADD_PATHFINDER_COMPONENT': {
      const comps = Math.min(
        state.seekerScans.pathfinderComponents + 1,
        config.pathfinder_module.components_required
      );
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          pathfinderComponents: comps,
          pathfinderUnlocked: comps >= config.pathfinder_module.components_required,
        },
      };
    }

    case 'UNLOCK_PATHFINDER': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          pathfinderUnlocked: true,
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

    case 'SET_CURRENT_MAP':
      return { ...state, currentMapId: action.payload };

    case 'UNLOCK_MAP': {
      if (state.unlockedMapIds.includes(action.payload)) return state;
      return { ...state, unlockedMapIds: [...state.unlockedMapIds, action.payload] };
    }

    case 'COMPLETE_MAP': {
      if (state.completedMapIds.includes(action.payload)) return state;
      return { ...state, completedMapIds: [...state.completedMapIds, action.payload] };
    }

    case 'LOAD_SECTOR_FOR_MAP': {
      return {
        ...state,
        seekerScans: {
          ...state.seekerScans,
          currentSector: action.payload,
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

      // Advance streak and conditionally refresh scans (only on new day)
      dispatch({ type: 'ADVANCE_STREAK' });
      const scansState = loaded.seekerScans || INITIAL_GAME_STATE.seekerScans;
      const today = new Date().toISOString().split('T')[0];
      if (scansState.lastRefreshDate !== today) {
        const totalScans = computeDailyScans(
          scansState.streakDay,
          scansState.activeGearSlots,
          scansState.gearInventory.length > 0 ? scansState.gearInventory : ALL_GEAR_ITEMS
        );
        dispatch({ type: 'REFRESH_DAILY_SCANS', payload: totalScans });
      }

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
