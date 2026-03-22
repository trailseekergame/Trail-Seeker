import { ActiveBoost, BoostEffect, GameState } from '../types';

/**
 * $SKR Economy — Separate integration layer.
 *
 * DESIGN PRINCIPLES:
 * - $SKR feels rare and meaningful, not a constant drip
 * - Earned only from milestones (chapter clears, weekly goals), never per-tile/scan
 * - Only two spend categories at launch: extra scans + cosmetics
 * - Base progression is 100% free; $SKR = convenience + style
 * - All values in this file can be rebalanced without touching core game code
 *
 * FEATURE FLAG: SKR_MILESTONES_ENABLED
 * Set to false for v0/v1 soft launch. No $SKR is earned or shown.
 * The shop, balance display, and session summary all gate on
 * skrBalance > 0, so disabling earning hides everything downstream.
 * To re-enable: set SKR_MILESTONES_ENABLED = true.
 *
 * PACING (conservative — tighten supply for small early player base):
 * - Milestone rewards halved from original design
 * - Cosmetic prices doubled — they should feel rare and exclusive
 * - Active player earns ~30 $SKR in first week, ~65 more in week 2
 * - Total chapter 1 lifetime: ~95 $SKR (tight, forces choices)
 * - A single cosmetic costs 40-70 $SKR — that's nearly a full chapter's earnings
 * - Extra scans cost 20 $SKR — player gets maybe 1-2 total before chapter 1 is done
 * - This makes every $SKR decision feel heavy. Loosen later if retention supports it.
 */

// ═══════════════════════════════════════════════════════
// MILESTONES — the ONLY way to earn $SKR
// ═══════════════════════════════════════════════════════

export interface SkrMilestone {
  id: string;
  name: string;
  description: string;
  reward: number;
  oneTime: boolean;
  check: (state: GameState) => boolean;
}

export const SKR_MILESTONES: SkrMilestone[] = [
  // ─── Chapter milestones (one-time, big payouts) ───
  {
    id: 'clear_broken_overpass',
    name: 'Overpass Stripped',
    description: 'Complete Broken Overpass for the first time.',
    reward: 12,
    oneTime: true,
    check: (s) => s.completedMapIds.includes('broken_overpass'),
  },
  {
    id: 'clear_relay_field',
    name: 'Signal Acquired',
    description: 'Complete Relay Field for the first time.',
    reward: 25,
    oneTime: true,
    check: (s) => s.completedMapIds.includes('relay_field'),
  },
  {
    id: 'chapter_1_complete',
    name: 'Chapter 1: Running Dark',
    description: 'Clear both Broken Overpass and Relay Field.',
    reward: 35,
    oneTime: true,
    check: (s) =>
      s.completedMapIds.includes('broken_overpass') &&
      s.completedMapIds.includes('relay_field'),
  },

  // ─── Weekly-style goals (one-time for now, recurring later) ───
  {
    id: 'streak_7',
    name: 'Full Week',
    description: 'Maintain a 7-day login streak.',
    reward: 10,
    oneTime: true,
    check: (s) => s.seekerScans.streakDay >= 7,
  },
  {
    id: 'scrap_100',
    name: 'Hundred-Scrap Club',
    description: 'Accumulate 100 total Scrap earned.',
    reward: 8,
    oneTime: true,
    check: (s) => s.totalScrapEarned >= 100,
  },
];

/**
 * Pacing math (tight supply for small player base):
 *
 * Week 1 (building toward Broken Overpass clear):
 *   - scrap_100:             8 $SKR  (around day 4-5)
 *   - streak_7:             10 $SKR  (end of week 1)
 *   - clear_broken_overpass: 12 $SKR  (around day 7)
 *   Total week 1:           ~30 $SKR
 *   Can afford: 1 scan boost (20) + 10 left over, OR save for cosmetic
 *
 * Week 2 (working Relay Field):
 *   - clear_relay_field:    25 $SKR  (around day 12-14)
 *   - chapter_1_complete:   35 $SKR  (same moment)
 *   Total week 2:           ~60 $SKR
 *
 * After chapter 1:  ~90 $SKR lifetime. Choices:
 *   - Ghost Coat (40) + 1 scan boost (20) = 60, leaving 30
 *   - Signal Visor (50) + save the rest
 *   - Salvage Flag (60) uses nearly everything
 *   - Rust Stripe Rover (70) requires saving through chapter 1 with minimal spending
 *
 * This is intentionally tight. Cosmetics should feel rare.
 * Loosen milestone rewards (not cosmetic prices) if retention data supports it.
 */

/**
 * Master switch for $SKR milestone rewards.
 * false = no milestones fire, no $SKR earned, shop stays hidden.
 * Flip to true when ready to activate the token economy.
 */
export const SKR_MILESTONES_ENABLED = false;

export function checkMilestones(state: GameState): SkrMilestone[] {
  if (!SKR_MILESTONES_ENABLED) return [];
  return SKR_MILESTONES.filter(
    m => m.check(state) && !state.skrMilestonesCompleted.includes(m.id)
  );
}

// ═══════════════════════════════════════════════════════
// SHOP — only 2 categories: Extra Scans + Cosmetics
// ═══════════════════════════════════════════════════════

export type ShopCategory = 'scans' | 'cosmetic';

export interface SkrShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: ShopCategory;
  /** For scan boosts — the boost to apply */
  boost?: Omit<ActiveBoost, 'id'>;
  /** For cosmetics — the cosmetic ID to unlock */
  cosmeticId?: string;
}

/**
 * PRICING (tight — cosmetics should feel rare and exclusive):
 *
 * Extra scans:
 *   20 $SKR for +2 scans. A chapter-1 player can afford ~1-2
 *   total from milestones. Meaningful choice, never casual.
 *
 * Cosmetics (prices doubled from original — make them aspirational):
 *   40-70 $SKR. Takes multiple weeks to afford. Each one is a flex.
 *     Common skin: 40 $SKR (~3-4 weeks of play)
 *     Uncommon skin: 50 $SKR (~4-5 weeks)
 *     Rare item: 60 $SKR (~5-6 weeks)
 *     Ultra-rare: 70 $SKR (~6+ weeks, real commitment)
 */

export const SKR_SHOP: SkrShopItem[] = [
  // ─── Extra Scans (the one gameplay-adjacent spend) ───
  {
    id: 'extra_scans_2',
    name: 'Extended Window',
    description: '+2 bonus scans on your next run.',
    cost: 20,
    icon: 'radar',
    category: 'scans',
    boost: {
      name: 'Extended Window',
      effect: 'extra_scans',
      value: 2,
      expiresAfterRun: true,
    },
  },

  // ─── Cosmetics (rare, aspirational — no gameplay effect) ───
  {
    id: 'skin_ghost_coat',
    name: 'Ghost Coat',
    description: 'A pale duster that catches the dust light. Purely cosmetic.',
    cost: 40,
    icon: 'hanger',
    category: 'cosmetic',
    cosmeticId: 'cos-ghost-coat',
  },
  {
    id: 'skin_signal_visor',
    name: 'Signal Visor',
    description: 'Tinted optics with a faint scanner glow. Cosmetic only.',
    cost: 50,
    icon: 'sunglasses',
    category: 'cosmetic',
    cosmeticId: 'cos-signal-visor',
  },
  {
    id: 'decor_salvage_flag',
    name: 'Salvage Flag',
    description: 'A tattered banner for your camp. Shows you\'ve been out there.',
    cost: 60,
    icon: 'flag-variant',
    category: 'cosmetic',
    cosmeticId: 'cos-salvage-flag',
  },
  {
    id: 'skin_rust_rover',
    name: 'Rust Stripe Rover',
    description: 'Burnt orange racing stripe on your rover. Style points only.',
    cost: 70,
    icon: 'car-sports',
    category: 'cosmetic',
    cosmeticId: 'cos-rust-rover',
  },
];

// ═══════════════════════════════════════════════════════
// BOOST HELPERS
// ═══════════════════════════════════════════════════════

/** Get the total value of a specific boost effect from active boosts */
export function getBoostValue(boosts: ActiveBoost[], effect: BoostEffect): number {
  return boosts
    .filter(b => b.effect === effect)
    .reduce((sum, b) => sum + b.value, 0);
}

/** Apply resource_find_rate boost: scale up scrap/supplies */
export function applyResourceBoost(base: number, boosts: ActiveBoost[]): number {
  const pct = getBoostValue(boosts, 'resource_find_rate');
  if (pct <= 0) return base;
  return Math.round(base * (1 + pct / 100));
}

/** Apply reduced_damage boost: scale down damage */
export function applyDamageReduction(base: number, boosts: ActiveBoost[]): number {
  const pct = getBoostValue(boosts, 'reduced_damage');
  if (pct <= 0) return base;
  return Math.max(0, Math.round(base * (1 - pct / 100)));
}

/** Get extra scans from boost */
export function getExtraScansFromBoost(boosts: ActiveBoost[]): number {
  return getBoostValue(boosts, 'extra_scans');
}

/** Get repair/heal cost multiplier */
export function getRepairCostMultiplier(boosts: ActiveBoost[]): number {
  const pct = getBoostValue(boosts, 'reduced_repair_cost');
  if (pct <= 0) return 1;
  return Math.max(0.1, 1 - pct / 100);
}
