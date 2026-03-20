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
 */

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

// ─── Game Economy Integration ───

/**
 * Purchase extra Trail move with SOL/SKR.
 * STUB: Always succeeds, no real payment.
 */
export async function purchaseExtraMove(): Promise<boolean> {
  console.log('[Solana Stub] purchaseExtraMove called');
  // TODO: Send 0.01 SOL or 5 SKR to game treasury
  // const result = await sendSol(GAME_TREASURY_PUBKEY, 0.01);
  // return result.success;
  return true;
}

/**
 * Purchase a cosmetic item with SOL/SKR.
 * STUB: Always succeeds.
 */
export async function purchaseCosmetic(cosmeticId: string): Promise<boolean> {
  console.log(`[Solana Stub] purchaseCosmetic(${cosmeticId}) called`);
  // TODO: Send appropriate SOL/SKR amount based on cosmetic rarity
  return true;
}

/**
 * Purchase a special reroll for risk/reward events.
 * STUB: Always succeeds.
 */
export async function purchaseReroll(): Promise<boolean> {
  console.log('[Solana Stub] purchaseReroll called');
  // TODO: Send 0.005 SOL or 2 SKR
  return true;
}
