/**
 * Rock-Paper-Scissors Duel — Backend Service
 *
 * STUB: Simulates matchmaking and resolution locally.
 * REAL: Replace with actual API calls to your game server.
 *
 * Endpoints (to implement on backend):
 *   POST /api/rps/queue       — join matchmaking queue
 *   POST /api/rps/choose      — submit choice for active match
 *   GET  /api/rps/match/:id   — poll match status / result
 *   GET  /api/rps/leaderboard — top players by wins
 *   GET  /api/rps/record/:id  — player's W/L/D record
 *   GET  /api/rps/config      — feature flags (wagering enabled, etc.)
 *
 * WAGERING MODEL (dormant — all stakes are 0 while flag is false):
 *   - rps_wagering_enabled: feature flag, defaults to false
 *   - stake_amount_skr: per-match stake, defaults to 0
 *   - When enabled, both players lock stake_amount_skr before choosing;
 *     winner receives both stakes minus platform fee (defined on backend)
 *   - Pending legal and product review before activation
 */

// ─── Feature Flags ───

export interface RpsConfig {
  rps_wagering_enabled: boolean;
  /** Available stake tiers when wagering is on (SKR amounts) */
  available_stakes: number[];
  /** Platform fee percentage on wagered wins (e.g., 0.05 = 5%) */
  platform_fee_pct: number;
}

/** Default config — wagering OFF, all stakes 0 */
const DEFAULT_CONFIG: RpsConfig = {
  rps_wagering_enabled: false,
  available_stakes: [],
  platform_fee_pct: 0,
};

let rpsConfig: RpsConfig = { ...DEFAULT_CONFIG };

/**
 * Fetch RPS config (feature flags).
 * STUB: Returns default (wagering disabled).
 * REAL: GET /api/rps/config
 */
export async function fetchRpsConfig(): Promise<RpsConfig> {
  // TODO: const res = await fetch(`${BACKEND_URL}/api/rps/config`);
  // rpsConfig = await res.json();
  return { ...rpsConfig };
}

export function getRpsConfig(): RpsConfig {
  return { ...rpsConfig };
}

// ─── Types ───

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type RpsResult = 'win' | 'lose' | 'draw';

export interface RpsMatch {
  matchId: string;
  opponentName: string;
  playerChoice?: RpsChoice;
  opponentChoice?: RpsChoice;
  result?: RpsResult;
  status: 'searching' | 'matched' | 'choosing' | 'resolved';
  /** $SKR staked by each player (0 when wagering disabled) */
  stake_amount_skr: number;
  /** $SKR won/lost (positive = winnings, negative = loss, 0 = draw/free) */
  skr_delta?: number;
}

export interface RpsLeaderEntry {
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  /** Optional: player's $SKR balance (shown when wagering is enabled) */
  skr_balance?: number;
  /** Total $SKR won from RPS (shown when wagering is enabled) */
  skr_won?: number;
}

// ─── Stub opponent names ───
const OPPONENT_NAMES = [
  'Dustwalker', 'Circuit', 'Neon', 'Scrapjaw', 'Vex',
  'Cinder', 'Ghost', 'Ratchet', 'Null', 'Sable',
  'Drift', 'Ash', 'Bolt', 'Wraith', 'Pike',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolveRps(player: RpsChoice, opponent: RpsChoice): RpsResult {
  if (player === opponent) return 'draw';
  if (
    (player === 'rock' && opponent === 'scissors') ||
    (player === 'paper' && opponent === 'rock') ||
    (player === 'scissors' && opponent === 'paper')
  ) return 'win';
  return 'lose';
}

// ─── Active match state (local stub) ───
let currentMatch: RpsMatch | null = null;

/**
 * Join matchmaking queue.
 * @param stakeSkr — $SKR stake amount (must be 0 when wagering disabled)
 */
export async function joinQueue(
  playerName: string,
  stakeSkr: number = 0,
): Promise<RpsMatch> {
  // Enforce: no stakes when wagering is off
  const effectiveStake = rpsConfig.rps_wagering_enabled ? stakeSkr : 0;

  const matchId = 'match_' + Date.now().toString(36);
  currentMatch = {
    matchId,
    opponentName: pickRandom(OPPONENT_NAMES.filter(n => n !== playerName)),
    status: 'searching',
    stake_amount_skr: effectiveStake,
  };

  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));
  currentMatch.status = 'matched';
  return { ...currentMatch };
}

/**
 * Submit player's choice and resolve the match.
 */
export async function submitChoice(choice: RpsChoice): Promise<RpsMatch> {
  if (!currentMatch || currentMatch.status !== 'matched') {
    throw new Error('No active match');
  }

  currentMatch.playerChoice = choice;
  currentMatch.status = 'choosing';

  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  const opponentChoice: RpsChoice = pickRandom(['rock', 'paper', 'scissors']);
  currentMatch.opponentChoice = opponentChoice;
  currentMatch.result = resolveRps(choice, opponentChoice);
  currentMatch.status = 'resolved';

  // Calculate SKR delta (dormant when stake is 0)
  const stake = currentMatch.stake_amount_skr;
  if (stake > 0 && currentMatch.result === 'win') {
    const fee = Math.ceil(stake * rpsConfig.platform_fee_pct);
    currentMatch.skr_delta = stake - fee; // net winnings
  } else if (stake > 0 && currentMatch.result === 'lose') {
    currentMatch.skr_delta = -stake;
  } else {
    currentMatch.skr_delta = 0;
  }

  return { ...currentMatch };
}

export function getCurrentMatch(): RpsMatch | null {
  return currentMatch ? { ...currentMatch } : null;
}

export function clearMatch(): void {
  currentMatch = null;
}

/**
 * Fetch RPS leaderboard.
 */
export async function fetchLeaderboard(
  playerName: string,
  playerWins: number,
  playerLosses: number,
  playerDraws: number,
): Promise<RpsLeaderEntry[]> {
  const entries: RpsLeaderEntry[] = [
    { playerName: 'Dustwalker', wins: 42, losses: 18, draws: 7 },
    { playerName: 'Circuit', wins: 38, losses: 22, draws: 5 },
    { playerName: 'Neon', wins: 31, losses: 15, draws: 9 },
    { playerName: 'Scrapjaw', wins: 27, losses: 20, draws: 8 },
    { playerName: 'Vex', wins: 24, losses: 19, draws: 6 },
    { playerName: 'Cinder', wins: 21, losses: 16, draws: 10 },
    { playerName: 'Ghost', wins: 18, losses: 14, draws: 4 },
    { playerName: 'Ratchet', wins: 15, losses: 12, draws: 3 },
  ];

  if (playerWins + playerLosses + playerDraws > 0) {
    entries.push({ playerName, wins: playerWins, losses: playerLosses, draws: playerDraws });
  }

  entries.sort((a, b) => b.wins - a.wins);
  return entries.slice(0, 10);
}
