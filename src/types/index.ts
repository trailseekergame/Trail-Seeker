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

export type ChoiceRisk = 'safe' | 'moderate' | 'risky' | 'reckless';

export interface EventChoice {
  id: string;
  text: string;
  outcome: EventOutcome;
  riskLevel?: ChoiceRisk; // defaults to 'moderate' if omitted
  requiresItem?: string;
  requiresEquipped?: Partial<EquippedCosmetics>; // gear-gated option
  requiresFlag?: AlignmentFlag; // faction-gated option
  requiresMinAlignment?: Partial<FactionAlignment>; // faction-gated option
}

export type OutcomeQuality = 'GOOD' | 'NEUTRAL' | 'BAD';

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
  // Risk outcome variants (if provided, roll determines which applies)
  goodNarration?: string; // override narration on GOOD roll
  badNarration?: string;  // override narration on BAD roll
  goodBonus?: Partial<PlayerResources>; // extra resources on GOOD
  badPenalty?: { damage?: number; resourceChanges?: Partial<PlayerResources> }; // extra punishment on BAD
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
export type TrailOverReason = 'hp_zero' | 'run_complete';

export type AvatarId = 'operator_a' | 'operator_b';

export type MapId = 'camp' | 'broken_overpass' | 'relay_field';

export interface GameState {
  // Player identity
  playerName: string;
  avatarId: AvatarId;
  backstory: PlayerBackstory | null;
  onboardingComplete: boolean;
  trailOver: boolean;
  trailOverReason?: TrailOverReason;

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

  // Seeker Scan System
  seekerScans: SeekerScanState;

  // Map progression
  currentMapId: MapId;
  unlockedMapIds: MapId[];
  completedMapIds: MapId[];
}

export const INITIAL_GAME_STATE: GameState = {
  playerName: 'Drifter',
  avatarId: 'operator_a',
  backstory: null,
  onboardingComplete: false,
  trailOver: false,
  trailOverReason: undefined,
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
  seekerScans: {
    streakDay: 1,
    lastLoginDate: new Date().toISOString().split('T')[0],
    scansRemaining: 4,
    scansTotal: 4,
    scansUsedToday: { scout: 0, seeker: 0, gambit: 0 },
    gearInventory: [],
    activeGearSlots: ['optics_rig', 'exo_vest', 'grip_gauntlets'],
    gearLockedToday: false,
    currentSector: { id: 'sector-01', name: 'Rustbelt Outskirts', tiles: [], gridSize: 5, completed: false },
    sectorsCompleted: 0,
    sessionResults: [],
    sessionStartTime: Date.now(),
    pathfinderComponents: 0,
    pathfinderUnlocked: false,
    lastRefreshDate: new Date().toISOString().split('T')[0],
    shieldedNextScan: false,
    boostedNextScan: false,
  },
  currentMapId: 'camp',
  unlockedMapIds: ['camp', 'broken_overpass'],
  completedMapIds: [],
};

// ─── Seeker Scan System ───
export type ScanType = 'scout' | 'seeker' | 'gambit';
export type ScanOutcome = 'whiff' | 'common' | 'uncommon' | 'rare' | 'legendary' | 'component';
export type GearSlotId = 'optics_rig' | 'exo_vest' | 'grip_gauntlets' | 'nav_boots' | 'cortex_link' | 'salvage_drone';
export type GearQuality = 'standard' | 'enhanced' | 'perfected';
export type TileType = 'unknown' | 'resource' | 'anomaly' | 'boss' | 'cleared';

export interface GearItem {
  slotId: GearSlotId;
  quality: GearQuality;
  name: string;
  shortDesc: string;
  icon: string;
}

export interface SectorTile {
  id: string;
  row: number;
  col: number;
  type: TileType;
  cleared: boolean;
  adjacentTo: string[];
  durability: number;    // hits remaining (1 = normal, 2-3 = hardened)
  maxDurability: number; // original durability for display
}

export interface Sector {
  id: string;
  name: string;
  tiles: SectorTile[];
  gridSize: number;
  completed: boolean;
}

export interface ScanResult {
  scanType: ScanType;
  outcome: ScanOutcome;
  tileId: string;
  sectorProgress: number;
  lootName?: string;
  lootRarity?: string;
  fieldNote?: string;  // Short flavor line about the find
  droneProc: boolean;
  bootsProc: boolean;
  cortexProc: boolean;
  opticsProc: boolean;
  // Phase 1: risk & resources
  scrapAwarded: number;
  suppliesAwarded: number;
  playerDamage: number;   // HP damage taken this scan
  roverDamage: number;    // Rover condition damage this scan
  scrapValue: number;     // How much scrap the loot item is worth if scrapped
}

export interface SeekerScanState {
  streakDay: number;
  lastLoginDate: string;
  scansRemaining: number;
  scansTotal: number;
  scansUsedToday: { scout: number; seeker: number; gambit: number };
  gearInventory: GearItem[];
  activeGearSlots: GearSlotId[];
  gearLockedToday: boolean;
  currentSector: Sector;
  sectorsCompleted: number;
  sessionResults: ScanResult[];
  sessionStartTime: number;
  pathfinderComponents: number; // 0-4, unlocks Pathfinder Module at 4
  pathfinderUnlocked: boolean;
  lastRefreshDate: string; // tracks when scans were last refreshed to prevent mid-session resets
  shieldedNextScan: boolean;  // next scan skips whiff roll
  boostedNextScan: boolean;   // next scan outcome upgraded one tier
}

export const MAX_FREE_MOVES = 3;
export const MOVE_REFRESH_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_RUN_DAYS = 30;
