/**
 * Rock-Paper-Scissors Duel — Backend Service
 *
 * STUB: Simulates matchmaking and resolution locally.
 * REAL: Replace with actual API calls to your game server.
 *
 * Endpoints (to implement on backend):
 *   POST /api/rps/queue     — join matchmaking queue
 *   POST /api/rps/choose    — submit choice for active match
 *   GET  /api/rps/match/:id — poll match status / result
 *   GET  /api/rps/leaderboard — top players by wins
 *   GET  /api/rps/record/:playerId — player's W/L/D record
 */

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type RpsResult = 'win' | 'lose' | 'draw';

export interface RpsMatch {
  matchId: string;
  opponentName: string;
  playerChoice?: RpsChoice;
  opponentChoice?: RpsChoice;
  result?: RpsResult;
  status: 'searching' | 'matched' | 'choosing' | 'resolved';
}

export interface RpsLeaderEntry {
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
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
 * STUB: Simulates a 1.5-3s search, then "finds" a bot opponent.
 * REAL: POST /api/rps/queue, then poll for match status.
 */
export async function joinQueue(playerName: string): Promise<RpsMatch> {
  const matchId = 'match_' + Date.now().toString(36);
  currentMatch = {
    matchId,
    opponentName: pickRandom(OPPONENT_NAMES.filter(n => n !== playerName)),
    status: 'searching',
  };

  // Simulate search delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

  currentMatch.status = 'matched';
  return { ...currentMatch };
}

/**
 * Submit player's choice and resolve the match.
 * STUB: Bot picks randomly, resolves immediately.
 * REAL: POST /api/rps/choose with matchId + choice, then poll for resolution.
 */
export async function submitChoice(choice: RpsChoice): Promise<RpsMatch> {
  if (!currentMatch || currentMatch.status !== 'matched') {
    throw new Error('No active match');
  }

  currentMatch.playerChoice = choice;
  currentMatch.status = 'choosing';

  // Simulate opponent "thinking"
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

  const opponentChoice: RpsChoice = pickRandom(['rock', 'paper', 'scissors']);
  currentMatch.opponentChoice = opponentChoice;
  currentMatch.result = resolveRps(choice, opponentChoice);
  currentMatch.status = 'resolved';

  return { ...currentMatch };
}

/**
 * Get current match state.
 */
export function getCurrentMatch(): RpsMatch | null {
  return currentMatch ? { ...currentMatch } : null;
}

/**
 * Clear current match (for rematch or exit).
 */
export function clearMatch(): void {
  currentMatch = null;
}

/**
 * Fetch RPS leaderboard.
 * STUB: Returns mock data + player's own record injected.
 * REAL: GET /api/rps/leaderboard
 */
export async function fetchLeaderboard(
  playerName: string,
  playerWins: number,
  playerLosses: number,
  playerDraws: number,
): Promise<RpsLeaderEntry[]> {
  // Mock leaderboard with some bot entries
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

  // Insert player if they have any games
  if (playerWins + playerLosses + playerDraws > 0) {
    entries.push({ playerName, wins: playerWins, losses: playerLosses, draws: playerDraws });
  }

  // Sort by wins descending
  entries.sort((a, b) => b.wins - a.wins);
  return entries.slice(0, 10);
}
