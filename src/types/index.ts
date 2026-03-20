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

// ─── Rarity & Loot ───
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'relic';

export const RARITY_ORDER: ItemRarity[] = ['common', 'uncommon', 'rare', 'relic'];

// ─── Faction Alignment ───
export interface FactionAlignment {
  directorate: number; // -100 (hostile) to +100 (allied)
  freeBands: number;
  raiders: number;
}

export type AlignmentFlag =
  | 'listened_to_broadcast'
  | 'jammed_broadcast'
  | 'paid_directorate_toll'
  | 'bluffed_checkpoint'
  | 'ran_checkpoint'
  | 'helped_lanterns'
  | 'shared_with_lanterns'
  | 'fought_reavers'
  | 'bribed_reavers';

// ─── Trail Move Outcome System ───
export type TrailOutcomeTier = 'good' | 'neutral' | 'bad';

export interface TrailOutcome {
  tier: TrailOutcomeTier;
  title: string;
  narration: string;
  resourceChanges?: Partial<PlayerResources>;
  damage?: number;
  heal?: number;
  addItem?: string;
  itemRarity?: ItemRarity;
  movePlayer?: number; // -1 setback (lose the move's progress)
  triggerEvent?: boolean; // also trigger a node event after this outcome
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
  // Alignment effects
  alignmentChanges?: Partial<FactionAlignment>;
  setFlags?: AlignmentFlag[];
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
  // Conditional: only show if player has these alignment flags
  requiresFlags?: AlignmentFlag[];
  // Conditional: only show if alignment meets threshold (e.g. { directorate: 10 } = need 10+)
  requiresAlignment?: Partial<FactionAlignment>;
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
  rarity: ItemRarity;
  unlocked: boolean;
  unlockCondition?: string;
}

export type CosmeticSlot = 'headgear' | 'coat' | 'backItem' | 'patch' | 'roverDecal' | 'accessory' | 'weapon' | 'tech' | 'charm';

export interface EquippedCosmetics {
  headgear?: string; // cosmetic item ID
  coat?: string;
  backItem?: string;
  patch?: string;
  roverDecal?: string;
  accessory?: string;
  weapon?: string;
  tech?: string;
  charm?: string;
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

  // Faction alignment & flags
  alignment: FactionAlignment;
  alignmentFlags: AlignmentFlag[];

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
  alignment: {
    directorate: 0,
    freeBands: 0,
    raiders: 0,
  },
  alignmentFlags: [],
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
