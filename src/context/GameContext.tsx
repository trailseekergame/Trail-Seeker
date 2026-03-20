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
} from '../types';
import { saveGameState, loadGameState } from '../services/storage';

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
  | { type: 'REVEAL_NODE'; payload: string };

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

    case 'TAKE_DAMAGE':
      return { ...state, playerHealth: Math.max(0, state.playerHealth - action.payload) };

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

      // Check move refresh
      const elapsed = Date.now() - loaded.lastMoveRefresh;
      if (elapsed >= MOVE_REFRESH_MS) {
        dispatch({ type: 'REFRESH_MOVES' });
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
