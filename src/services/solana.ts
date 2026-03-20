/**
 * Solana Mobile Wallet Adapter – Stub Module
 * 
 * These functions define the API surface for Solana integration.
 * Replace stubs with real MWA calls when ready.
 * 
 * Integration points:
 * 1. Install @solana-mobile/mobile-wallet-adapter-protocol
 * 2. Install @solana/web3.js
 * 3. Replace each stub with the actual MWA flow
 *
 * ─── $SKR Token Economy ───
 * All $SKR spending in-game is split 50/50:
 *   • 50% BURNED — permanently removed from circulating supply (deflationary)
 *   • 50% SEASON REWARD POOL — deposited into a PDA-controlled vault
 *     that pays out to top performers at the end of each season.
 *
 * This applies to: revives, extra moves, cosmetics, rerolls, and any
 * future $SKR sinks. The burn creates long-term scarcity; the pool
 * creates competitive incentive.
 *
 * On-chain implementation:
 *   1. SPL Token burn instruction for the burn half
 *   2. SPL Token transfer to SEASON_POOL_PUBKEY for the pool half
 *   3. Both instructions bundled in a single atomic transaction
 */

// ─── Addresses (replace with real keys at launch) ───
const BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111'; // SPL burn
const SEASON_POOL_PUBKEY = 'SEASON_POOL_STUB_ADDRESS'; // PDA vault for end-of-season rewards

// ─── Types ───
export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number; // SOL
  skrBalance: number; // SKR token
}

const DEFAULT_WALLET: WalletState = {
  connected: false,
  publicKey: null,
  balance: 0,
  skrBalance: 0,
};

let walletState: WalletState = { ...DEFAULT_WALLET };

// ─── Wallet Connection ───

/**
 * Connect to a Solana wallet via MWA.
 * STUB: Returns a mock connected state.
 * REAL: Use transact() from @solana-mobile/mobile-wallet-adapter-protocol
 */
export async function connectWallet(): Promise<WalletState> {
  console.log('[Solana Stub] connectWallet called');
  // TODO: Replace with MWA transact() → authorize()
  walletState = {
    connected: true,
    publicKey: 'DEV_STUB_PUBKEY_' + Math.random().toString(36).slice(2, 10),
    balance: 1.5,
    skrBalance: 100,
  };
  return walletState;
}

/**
 * Disconnect wallet.
 * STUB: Resets to default state.
 * REAL: Use transact() → deauthorize()
 */
export async function disconnectWallet(): Promise<void> {
  console.log('[Solana Stub] disconnectWallet called');
  walletState = { ...DEFAULT_WALLET };
}

/**
 * Get current wallet state.
 */
export function getWalletState(): WalletState {
  return { ...walletState };
}

// ─── Balance & Transactions ───

/**
 * Fetch SOL balance.
 * STUB: Returns mock balance.
 * REAL: Use Connection.getBalance(publicKey)
 */
export async function getBalance(): Promise<number> {
  console.log('[Solana Stub] getBalance called');
  // TODO: const connection = new Connection(clusterApiUrl('devnet'));
  // TODO: return connection.getBalance(new PublicKey(walletState.publicKey));
  return walletState.balance;
}

/**
 * Request airdrop (devnet only).
 * STUB: Increases mock balance.
 * REAL: Use Connection.requestAirdrop()
 */
export async function requestAirdrop(amount: number = 1): Promise<boolean> {
  console.log(`[Solana Stub] requestAirdrop(${amount}) called`);
  // TODO: const sig = await connection.requestAirdrop(publicKey, amount * LAMPORTS_PER_SOL);
  // TODO: await connection.confirmTransaction(sig);
  walletState.balance += amount;
  return true;
}

/**
 * Send SOL to a recipient.
 * STUB: Decrements mock balance.
 * REAL: Use transact() → signAndSendTransactions()
 */
export async function sendSol(
  recipientPubKey: string,
  amount: number
): Promise<{ success: boolean; signature?: string }> {
  console.log(`[Solana Stub] sendSol(${recipientPubKey}, ${amount}) called`);
  if (walletState.balance < amount) {
    return { success: false };
  }
  // TODO: Build SystemProgram.transfer instruction
  // TODO: Sign and send via MWA transact()
  walletState.balance -= amount;
  return {
    success: true,
    signature: 'STUB_SIG_' + Date.now().toString(36),
  };
}

// ─── $SKR Split Logic ───

/**
 * Core spending function: splits $SKR 50/50 between burn and season pool.
 * Every $SKR transaction in the game routes through this.
 *
 * STUB: Deducts from mock balance, logs the split.
 * REAL: Builds an atomic Solana transaction with two instructions:
 *   1. SPL Token burn (burnHalf)
 *   2. SPL Token transfer to SEASON_POOL_PUBKEY (poolHalf)
 */
async function spendSkr(
  amount: number,
  reason: string
): Promise<{ success: boolean; burned: number; pooled: number; signature?: string }> {
  console.log(`[Solana Stub] spendSkr(${amount} $SKR) — reason: ${reason}`);

  if (walletState.skrBalance < amount) {
    return { success: false, burned: 0, pooled: 0 };
  }

  const burnHalf = Math.ceil(amount / 2);
  const poolHalf = amount - burnHalf; // floor to ensure total = amount

  console.log(`  → Burn: ${burnHalf} $SKR to ${BURN_ADDRESS}`);
  console.log(`  → Pool: ${poolHalf} $SKR to ${SEASON_POOL_PUBKEY}`);

  // TODO: Build atomic transaction:
  // const burnIx = createBurnInstruction(playerTokenAccount, skrMint, playerPubkey, burnHalf);
  // const poolIx = createTransferInstruction(playerTokenAccount, poolTokenAccount, playerPubkey, poolHalf);
  // const tx = new Transaction().add(burnIx, poolIx);
  // const sig = await transact(async (wallet) => wallet.signAndSendTransactions({ transactions: [tx] }));

  walletState.skrBalance -= amount;
  seasonPoolBalance += poolHalf;

  return {
    success: true,
    burned: burnHalf,
    pooled: poolHalf,
    signature: 'STUB_SIG_' + Date.now().toString(36),
  };
}

// ─── Season Reward Pool (local tracking for stub) ───
let seasonPoolBalance = 0;

/**
 * Get current season pool balance.
 * STUB: Returns local tracked value.
 * REAL: Query the PDA vault token account balance on-chain.
 */
export function getSeasonPoolBalance(): number {
  return seasonPoolBalance;
}

// ─── Game Economy Integration ───
// All $SKR costs below route through spendSkr() for the 50/50 split.

/**
 * Purchase extra Trail move.
 * Cost: 5 $SKR → 3 burned, 2 pooled
 */
export const EXTRA_MOVE_COST_SKR = 5;

export async function purchaseExtraMove(): Promise<boolean> {
  console.log('[Solana Stub] purchaseExtraMove called');
  const result = await spendSkr(EXTRA_MOVE_COST_SKR, 'extra_move');
  return result.success;
}

/**
 * Purchase a cosmetic item.
 * Cost varies by rarity — passed as argument.
 */
export async function purchaseCosmetic(cosmeticId: string, costSkr: number = 20): Promise<boolean> {
  console.log(`[Solana Stub] purchaseCosmetic(${cosmeticId}) called`);
  const result = await spendSkr(costSkr, `cosmetic:${cosmeticId}`);
  return result.success;
}

/**
 * Purchase a special reroll for risk/reward events.
 * Cost: 10 $SKR → 5 burned, 5 pooled
 */
export const REROLL_COST_SKR = 10;

export async function purchaseReroll(): Promise<boolean> {
  console.log('[Solana Stub] purchaseReroll called');
  const result = await spendSkr(REROLL_COST_SKR, 'reroll');
  return result.success;
}

/**
 * Revive a dead character (~$5 worth of $SKR).
 * Cost: 50 $SKR → 25 burned, 25 pooled
 *
 * Pricing: ~$5 USD equivalent in $SKR at current market rate.
 * Intentionally expensive — death should sting, but players
 * deep into a run can pay to keep going.
 */
export const REVIVE_COST_SKR = 50;

export async function purchaseRevive(): Promise<boolean> {
  console.log(`[Solana Stub] purchaseRevive called — ${REVIVE_COST_SKR} $SKR`);
  const result = await spendSkr(REVIVE_COST_SKR, 'revive');
  return result.success;
}
