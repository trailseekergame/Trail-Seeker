/**
 * Trail Seeker – Core Type Definitions
 */

// ─── Zone & Node Types ───
export type NodeType = 'hub' | 'waypoint' | 'encounter' | 'settlement' | 'boss';

export interface ZoneNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  connections: string[]; // IDs of connected nodes
  x: number; // For map display (0-100 normalized)
  y: number;
  factionPresence?: string[];
  isRevealed: boolean;
}

export interface Zone {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  nodes: ZoneNode[];
  startNodeId: string;
  endNodeId: string;
}

// ─── Event Types ───
export type EventCategory = 'encounter' | 'discovery' | 'trade' | 'hazard' | 'lore' | 'faction';

export interface EventChoice {
  id: string;
  text: string;
  outcome: EventOutcome;
  requiresItem?: string;
}

export interface EventOutcome {
  narration: string;
  resourceChanges?: Partial<PlayerResources>;
  movePlayer?: number; // +1 forward, -1 backward
  unlockCodex?: string[];
  unlockCosmetic?: string;
  damage?: number;
  heal?: number;
  addItem?: string;
  removeItem?: string;
}

export interface GameEvent {
  id: string;
  title: string;
  category: EventCategory;
  narration: string;
  nodeIds?: string[]; // Specific nodes where this can trigger, empty = any
  choices: EventChoice[];
  minVisits?: number; // Minimum times the node was visited
  oneTime?: boolean;
}

// ─── Player & Resources ───
export interface PlayerResources {
  scrap: number;
  supplies: number;
  specialLoot: string[];
}

export interface CosmeticItem {
  id: string;
  name: string;
  slot: CosmeticSlot;
  description: string;
  icon: string; // emoji or icon name
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  unlocked: boolean;
  unlockCondition?: string;
}

export type CosmeticSlot = 'headgear' | 'coat' | 'backItem' | 'patch' | 'roverDecal' | 'accessory';

export interface EquippedCosmetics {
  headgear?: string; // cosmetic item ID
  coat?: string;
  backItem?: string;
  patch?: string;
  roverDecal?: string;
  accessory?: string;
}

export interface PlayerBackstory {
  archetype: string;
  lastLost: string;
  customNote?: string;
}

// ─── Codex Types ───
export type CodexCategory = 'world' | 'zones' | 'factions' | 'enemies' | 'loot' | 'personal';

export interface CodexEntry {
  id: string;
  category: CodexCategory;
  title: string;
  content: string;
  alwaysVisible?: boolean;
  icon?: string;
}

// ─── Leaderboard ───
export interface LeaderboardEntry {
  playerName: string;
  playerId: string;
  distance: number;
  efficiency: number;
  compositeScore: number;
  timestamp: number;
}

// ─── Game State ───
export interface GameState {
  // Player identity
  playerName: string;
  backstory: PlayerBackstory | null;
  onboardingComplete: boolean;

  // Trail state
  currentZoneId: string;
  currentNodeId: string;
  visitedNodes: string[];
  completedEventIds: string[];
  movesRemaining: number;
  lastMoveRefresh: number; // timestamp
  dayNumber: number;

  // Resources
  resources: PlayerResources;

  // Rover/Health
  roverHealth: number; // 0-100
  playerHealth: number; // 0-100

  // Codex
  unlockedCodexIds: string[];

  // Cosmetics
  unlockedCosmeticIds: string[];
  equipped: EquippedCosmetics;

  // Leaderboard
  leaderboard: LeaderboardEntry[];
  highScore: number;

  // Economy
  totalScrapEarned: number;
  totalSuppliesUsed: number;
}

export const INITIAL_GAME_STATE: GameState = {
  playerName: 'Drifter',
  backstory: null,
  onboardingComplete: false,
  currentZoneId: 'zone-01',
  currentNodeId: 'node-start',
  visitedNodes: ['node-start'],
  completedEventIds: [],
  movesRemaining: 3,
  lastMoveRefresh: Date.now(),
  dayNumber: 1,
  resources: {
    scrap: 15,
    supplies: 10,
    specialLoot: [],
  },
  roverHealth: 100,
  playerHealth: 100,
  unlockedCodexIds: ['codex-world-overview', 'codex-trail-concept'],
  unlockedCosmeticIds: ['cos-basic-goggles', 'cos-drifter-coat', 'cos-standard-pack'],
  equipped: {
    headgear: 'cos-basic-goggles',
    coat: 'cos-drifter-coat',
    backItem: 'cos-standard-pack',
  },
  leaderboard: [],
  highScore: 0,
  totalScrapEarned: 0,
  totalSuppliesUsed: 0,
};

export const MAX_FREE_MOVES = 3;
export const MOVE_REFRESH_MS = 24 * 60 * 60 * 1000; // 24 hours
