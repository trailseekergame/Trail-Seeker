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
 * PACING RECOMMENDATIONS (tune later):
 * - Active player earns ~25-40 $SKR in their first week from early milestones
 * - Chapter 1 completion (both maps) nets 150 $SKR total (big one-time payout)
 * - After first-week milestones dry up, weekly goal is the recurring source
 * - Extra scan pack: 15 $SKR → player can afford ~2 packs per week initially
 * - Early cosmetics: 20-50 $SKR → takes 1-3 weeks to afford depending on rarity
 * - This pacing means $SKR is always a deliberate choice, never spent casually
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
    reward: 25,
    oneTime: true,
    check: (s) => s.completedMapIds.includes('broken_overpass'),
  },
  {
    id: 'clear_relay_field',
    name: 'Signal Acquired',
    description: 'Complete Relay Field for the first time.',
    reward: 50,
    oneTime: true,
    check: (s) => s.completedMapIds.includes('relay_field'),
  },
  {
    id: 'chapter_1_complete',
    name: 'Chapter 1: Running Dark',
    description: 'Clear both Broken Overpass and Relay Field.',
    reward: 75,
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
    reward: 20,
    oneTime: true,
    check: (s) => s.seekerScans.streakDay >= 7,
  },
  {
    id: 'scrap_100',
    name: 'Hundred-Scrap Club',
    description: 'Accumulate 100 total Scrap earned.',
    reward: 15,
    oneTime: true,
    check: (s) => s.totalScrapEarned >= 100,
  },
];

/**
 * Pacing math for a typical active player (first 2 weeks):
 *
 * Week 1 (building toward Broken Overpass clear):
 *   - streak_7:             20 $SKR  (end of week 1)
 *   - scrap_100:            15 $SKR  (around day 4-5)
 *   - clear_broken_overpass: 25 $SKR  (around day 7)
 *   Total week 1:           ~60 $SKR
 *
 * Week 2 (working Relay Field):
 *   - clear_relay_field:    50 $SKR  (around day 12-14)
 *   - chapter_1_complete:   75 $SKR  (same moment)
 *   Total week 2:           ~125 $SKR
 *
 * After chapter 1:  ~185 $SKR lifetime, milestones mostly exhausted.
 * Future: add weekly recurring goals (e.g., "Complete 5 runs this week: 10 $SKR")
 * to provide a slow drip post-chapter without inflating early.
 */

export function checkMilestones(state: GameState): SkrMilestone[] {
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
 * PRICING RECOMMENDATIONS:
 *
 * Extra scans:
 *   15 $SKR for +2 scans (one run). A week-1 player can afford
 *   ~2-4 of these total from early milestones. Helpful but not
 *   mandatory — base 4-7 scans/day is enough to make progress.
 *
 * Cosmetics:
 *   20-50 $SKR range. Takes 1-3 weeks to afford at current earn rate.
 *   Purely visual. Example pricing tiers:
 *     Common skin: 20 $SKR (~1 week)
 *     Uncommon skin: 35 $SKR (~1.5 weeks)
 *     Rare decoration: 50 $SKR (~2 weeks)
 */

export const SKR_SHOP: SkrShopItem[] = [
  // ─── Extra Scans (the one gameplay-adjacent spend) ───
  {
    id: 'extra_scans_2',
    name: 'Extended Window',
    description: '+2 bonus scans on your next run.',
    cost: 15,
    icon: 'radar',
    category: 'scans',
    boost: {
      name: 'Extended Window',
      effect: 'extra_scans',
      value: 2,
      expiresAfterRun: true,
    },
  },

  // ─── Cosmetics (purely visual, no gameplay effect) ───
  {
    id: 'skin_ghost_coat',
    name: 'Ghost Coat',
    description: 'A pale duster that catches the dust light. Purely cosmetic.',
    cost: 20,
    icon: 'hanger',
    category: 'cosmetic',
    cosmeticId: 'cos-ghost-coat',
  },
  {
    id: 'skin_signal_visor',
    name: 'Signal Visor',
    description: 'Tinted optics with a faint scanner glow. Cosmetic only.',
    cost: 25,
    icon: 'sunglasses',
    category: 'cosmetic',
    cosmeticId: 'cos-signal-visor',
  },
  {
    id: 'decor_salvage_flag',
    name: 'Salvage Flag',
    description: 'A tattered banner for your camp. Shows you\'ve been out there.',
    cost: 30,
    icon: 'flag-variant',
    category: 'cosmetic',
    cosmeticId: 'cos-salvage-flag',
  },
  {
    id: 'skin_rust_rover',
    name: 'Rust Stripe Rover',
    description: 'Burnt orange racing stripe on your rover. Style points only.',
    cost: 35,
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
