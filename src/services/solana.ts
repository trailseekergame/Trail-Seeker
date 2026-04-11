/**
 * Solana Integration — $SKR Token Economy
 *
 * Architecture:
 * ┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
 * │ Player       │     │ Off-Chain Profile │     │ Game Treasury   │
 * │ Wallet       │◄───►│ (skrBalance in   │◄───►│ Wallet          │
 * │ (Phantom,    │     │  GameState)       │     │ (server-signed) │
 * │  Solflare)   │     └──────────────────┘     └─────────────────┘
 * └──────────────┘
 *
 * Flow:
 * - Milestone rewards: profile balance increases (off-chain only by default).
 *   When player requests withdrawal, backend signs a transfer from Treasury → Player.
 * - In-game purchases: profile balance decreases (off-chain).
 *   When player deposits from wallet, they sign a transfer from Player → Treasury.
 * - The Treasury wallet's private key NEVER touches the client.
 *   All Treasury-signed transactions go through a backend API.
 *
 * $SKR Spending Split (50/50):
 *   • 50% BURNED — permanently removed (deflationary)
 *   • 50% SEASON REWARD POOL — PDA vault for end-of-season payouts
 */

// ─── Addresses ───

/** Game Treasury wallet — source for rewards, destination for spends */
export const TREASURY_PUBKEY = '5LfwdtHDZuQBc5JTQFzC6aGJ9Q8ZZJSmKN6vKBBbEPPi';

/** SPL burn address for the burn half of spends */
const BURN_ADDRESS = '1nc1nerator11111111111111111111111111111111';

/** PDA vault for season reward pool */
const SEASON_POOL_PUBKEY = 'SEASON_POOL_STUB_ADDRESS'; // TODO: Replace with real PDA

// ─── Types ───

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  balance: number; // SOL balance
  skrOnChain: number; // $SKR in the player's wallet (on-chain)
}

export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
}

const DEFAULT_WALLET: WalletState = {
  connected: false,
  publicKey: null,
  balance: 0,
  skrOnChain: 0,
};

let walletState: WalletState = { ...DEFAULT_WALLET };

// ─── Season Pool (local tracking for stub) ───
let seasonPoolBalance = 0;

// ═══════════════════════════════════════════════════════
// WALLET CONNECTION
// ═══════════════════════════════════════════════════════

/**
 * Connect to a Solana wallet via Mobile Wallet Adapter.
 *
 * STUB: Returns mock state. Replace with MWA transact() → authorize().
 * REAL: Use @solana-mobile/mobile-wallet-adapter-protocol or
 *       @solana/wallet-adapter for web/Phantom deep link.
 */
export async function connectWallet(): Promise<WalletState> {
  // console.log('[Solana] connectWallet');
  // TODO: Replace with MWA:
  // const authResult = await transact(async (wallet) => {
  //   return wallet.authorize({ identity: { name: 'Trail Seeker' } });
  // });
  // walletState = {
  //   connected: true,
  //   publicKey: authResult.accounts[0].address,
  //   balance: await fetchSolBalance(authResult.accounts[0].address),
  //   skrOnChain: await fetchSkrBalance(authResult.accounts[0].address),
  // };
  walletState = {
    connected: true,
    publicKey: 'DEV_STUB_' + Math.random().toString(36).slice(2, 10),
    balance: 1.5,
    skrOnChain: 0,
  };
  return walletState;
}

/**
 * Disconnect wallet. Clears local state.
 */
export async function disconnectWallet(): Promise<void> {
  // console.log('[Solana] disconnectWallet');
  walletState = { ...DEFAULT_WALLET };
}

/**
 * Get current wallet state.
 */
export function getWalletState(): WalletState {
  return { ...walletState };
}

/**
 * Refresh on-chain balances for a connected wallet.
 */
export async function refreshBalances(): Promise<WalletState> {
  if (!walletState.connected || !walletState.publicKey) return walletState;
  // console.log('[Solana] refreshBalances for', walletState.publicKey);
  // TODO: const connection = new Connection(clusterApiUrl('mainnet-beta'));
  // walletState.balance = await connection.getBalance(new PublicKey(walletState.publicKey)) / LAMPORTS_PER_SOL;
  // walletState.skrOnChain = await getTokenAccountBalance(walletState.publicKey, SKR_MINT);
  return { ...walletState };
}

// ═══════════════════════════════════════════════════════
// DEPOSIT: Player Wallet → Treasury (fund profile balance)
// ═══════════════════════════════════════════════════════

/**
 * Deposit $SKR from player's on-chain wallet into their off-chain profile.
 *
 * Flow:
 * 1. Player signs an SPL Token transfer: Player Wallet → Treasury
 * 2. On confirmation, the game increases the player's profile skrBalance
 *
 * STUB: Simulates the transfer. Returns amount deposited.
 * REAL: Build SPL Token transfer instruction, sign via MWA, confirm.
 *
 * SECURITY: The player signs this transaction — no Treasury private key needed.
 */
export async function depositSkrToProfile(
  amount: number,
): Promise<TransactionResult & { deposited: number }> {
  // console.log(`[Solana] depositSkrToProfile(${amount} $SKR)`);
  // console.log(`  Player ${walletState.publicKey} → Treasury ${TREASURY_PUBKEY}`);

  if (!walletState.connected) {
    return { success: false, deposited: 0, error: 'Wallet not connected' };
  }
  if (walletState.skrOnChain < amount) {
    return { success: false, deposited: 0, error: 'Insufficient on-chain $SKR' };
  }

  // TODO: Build and sign SPL Token transfer:
  // const transferIx = createTransferInstruction(
  //   playerSkrTokenAccount,    // source (player's ATA)
  //   treasurySkrTokenAccount,  // destination (Treasury's ATA)
  //   new PublicKey(walletState.publicKey), // owner/signer
  //   amount * SKR_DECIMALS_MULTIPLIER,
  // );
  // const tx = new Transaction().add(transferIx);
  // const sig = await transact(async (wallet) =>
  //   wallet.signAndSendTransactions({ transactions: [tx] })
  // );
  // await connection.confirmTransaction(sig);

  walletState.skrOnChain -= amount;

  return {
    success: true,
    deposited: amount,
    signature: 'STUB_DEPOSIT_' + Date.now().toString(36),
  };
}

// ═══════════════════════════════════════════════════════
// WITHDRAW: Treasury → Player Wallet (claim earned $SKR)
// ═══════════════════════════════════════════════════════

/**
 * Withdraw $SKR from profile balance to player's on-chain wallet.
 *
 * Flow:
 * 1. Client requests withdrawal via backend API
 * 2. Backend verifies profile balance, signs Treasury → Player transfer
 * 3. On confirmation, profile balance is decremented
 *
 * STUB: Simulates the transfer. Returns amount withdrawn.
 * REAL: POST to backend /api/withdraw-skr, which signs with Treasury key.
 *
 * SECURITY: Treasury private key lives on the backend server ONLY.
 * The client never sees or signs with the Treasury key.
 */
export async function withdrawSkrFromProfile(
  amount: number,
  playerProfileBalance: number,
): Promise<TransactionResult & { withdrawn: number }> {
  // console.log(`[Solana] withdrawSkrFromProfile(${amount} $SKR)`);
  // console.log(`  Treasury ${TREASURY_PUBKEY} → Player ${walletState.publicKey}`);

  if (!walletState.connected) {
    return { success: false, withdrawn: 0, error: 'Wallet not connected' };
  }
  if (playerProfileBalance < amount) {
    return { success: false, withdrawn: 0, error: 'Insufficient profile balance' };
  }

  // TODO: Call backend API:
  // const response = await fetch(`${BACKEND_URL}/api/withdraw-skr`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     playerWallet: walletState.publicKey,
  //     amount,
  //     profileId: playerProfileId,
  //     signature: requestSignature, // player signs a nonce to prove ownership
  //   }),
  // });
  // const { txSignature } = await response.json();
  // await connection.confirmTransaction(txSignature);

  walletState.skrOnChain += amount;

  return {
    success: true,
    withdrawn: amount,
    signature: 'STUB_WITHDRAW_' + Date.now().toString(36),
  };
}

// ═══════════════════════════════════════════════════════
// ON-CHAIN SPEND: $SKR 50/50 split (burn + season pool)
// ═══════════════════════════════════════════════════════

/**
 * Execute an on-chain $SKR spend with 50/50 burn/pool split.
 *
 * This is for future on-chain spending (premium cosmetics, etc.).
 * Most in-game spending uses the off-chain profile balance via
 * the SPEND_SKR reducer action — no on-chain transaction needed.
 *
 * STUB: Logs the split. Replace with atomic Solana transaction.
 * REAL: Bundle burn + pool transfer in one signed tx.
 */
export async function spendSkrOnChain(
  amount: number,
  reason: string,
): Promise<TransactionResult & { burned: number; pooled: number }> {
  // console.log(`[Solana] spendSkrOnChain(${amount} $SKR) — ${reason}`);

  if (!walletState.connected) {
    return { success: false, burned: 0, pooled: 0, error: 'Wallet not connected' };
  }
  if (walletState.skrOnChain < amount) {
    return { success: false, burned: 0, pooled: 0, error: 'Insufficient on-chain $SKR' };
  }

  const burnHalf = Math.ceil(amount / 2);
  const poolHalf = amount - burnHalf;

  // console.log(`  → Burn: ${burnHalf} to ${BURN_ADDRESS}`);
  // console.log(`  → Pool: ${poolHalf} to ${SEASON_POOL_PUBKEY}`);

  // TODO: Build atomic transaction:
  // const burnIx = createBurnInstruction(playerATA, skrMint, playerPubkey, burnHalf * DECIMALS);
  // const poolIx = createTransferInstruction(playerATA, poolATA, playerPubkey, poolHalf * DECIMALS);
  // const tx = new Transaction().add(burnIx, poolIx);
  // const sig = await transact(async (wallet) =>
  //   wallet.signAndSendTransactions({ transactions: [tx] })
  // );

  walletState.skrOnChain -= amount;
  seasonPoolBalance += poolHalf;

  return {
    success: true,
    burned: burnHalf,
    pooled: poolHalf,
    signature: 'STUB_SPEND_' + Date.now().toString(36),
  };
}

// ═══════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════

/** Get SOL balance */
export async function getSolBalance(): Promise<number> {
  // TODO: const connection = new Connection(clusterApiUrl('mainnet-beta'));
  // return connection.getBalance(new PublicKey(walletState.publicKey)) / LAMPORTS_PER_SOL;
  return walletState.balance;
}

/** Get season pool balance */
export function getSeasonPoolBalance(): number {
  // TODO: Query PDA token account balance on-chain
  return seasonPoolBalance;
}

/** Request devnet airdrop (development only) */
export async function requestAirdrop(amount: number = 1): Promise<boolean> {
  if (!__DEV__) return false;
  // console.log(`[Solana Dev] requestAirdrop(${amount} SOL)`);
  walletState.balance += amount;
  return true;
}
