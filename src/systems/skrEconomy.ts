import { ActiveBoost, BoostEffect, GameState, MapId } from '../types';

/**
 * $SKR Economy — Separate integration layer.
 *
 * Earning: milestones only (map clears, chapter completion, weekly goals).
 * Spending: convenience boosts + cosmetics at camp.
 * Fairness: all base progression is free; $SKR = speed/style, not power.
 *
 * This file is intentionally self-contained so $SKR values can be
 * rebalanced without touching core mission, tile, or scan code.
 */

// ─── Milestone Definitions ───

export interface SkrMilestone {
  id: string;
  name: string;
  description: string;
  reward: number; // $SKR amount
  oneTime: boolean; // true = can only be claimed once per account
  /** Check function: given state, is this milestone met? */
  check: (state: GameState) => boolean;
}

export const SKR_MILESTONES: SkrMilestone[] = [
  // ─── Map completion milestones (one-time) ───
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

  // ─── Streak milestones (one-time) ───
  {
    id: 'streak_3',
    name: '3-Day Streak',
    description: 'Maintain a 3-day login streak.',
    reward: 10,
    oneTime: true,
    check: (s) => s.seekerScans.streakDay >= 3,
  },
  {
    id: 'streak_7',
    name: 'Full Week',
    description: 'Maintain a 7-day login streak.',
    reward: 30,
    oneTime: true,
    check: (s) => s.seekerScans.streakDay >= 7,
  },

  // ─── Progression milestones (one-time) ───
  {
    id: 'first_rare',
    name: 'First Good Pull',
    description: 'Find your first Rare or better item.',
    reward: 10,
    oneTime: true,
    check: (s) =>
      s.seekerScans.sessionResults.some(r =>
        ['rare', 'legendary', 'component'].includes(r.outcome)
      ) || s.resources.specialLoot.length > 0,
  },
  {
    id: 'scrap_100',
    name: 'Hundred-Scrap Club',
    description: 'Accumulate 100 total Scrap earned.',
    reward: 15,
    oneTime: true,
    check: (s) => s.totalScrapEarned >= 100,
  },
  {
    id: 'intel_10',
    name: 'Data Hoarder',
    description: 'Collect 10 Intel/Data.',
    reward: 15,
    oneTime: true,
    check: (s) => s.intelCollected >= 10,
  },
];

/**
 * Check all milestones and return newly completed ones (not yet claimed).
 * Call this after mission return, map completion, and daily login.
 */
export function checkMilestones(state: GameState): SkrMilestone[] {
  return SKR_MILESTONES.filter(
    m => m.check(state) && !state.skrMilestonesCompleted.includes(m.id)
  );
}

// ─── Shop Items ───

export interface SkrShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  boost: Omit<ActiveBoost, 'id'>;
}

export const SKR_SHOP: SkrShopItem[] = [
  {
    id: 'boost_extra_scans',
    name: 'Extended Window',
    description: '+2 bonus scans on your next run.',
    cost: 15,
    icon: 'radar',
    boost: {
      name: 'Extended Window',
      effect: 'extra_scans',
      value: 2,
      expiresAfterRun: true,
    },
  },
  {
    id: 'boost_resource_rate',
    name: 'Scavenger\'s Eye',
    description: '+25% Scrap and Supplies from scans for one run.',
    cost: 20,
    icon: 'magnify-plus',
    boost: {
      name: 'Scavenger\'s Eye',
      effect: 'resource_find_rate',
      value: 25,
      expiresAfterRun: true,
    },
  },
  {
    id: 'boost_reduced_damage',
    name: 'Field Plating',
    description: '-30% Health and Rover damage for one run.',
    cost: 20,
    icon: 'shield-check',
    boost: {
      name: 'Field Plating',
      effect: 'reduced_damage',
      value: 30,
      expiresAfterRun: true,
    },
  },
  {
    id: 'boost_cheap_repair',
    name: 'Salvage Discount',
    description: '-50% repair and heal costs at camp (one use).',
    cost: 10,
    icon: 'wrench',
    boost: {
      name: 'Salvage Discount',
      effect: 'reduced_repair_cost',
      value: 50,
      expiresAfterRun: false, // stays until used
    },
  },
];

// ─── Boost Helpers ───

/** Get the total value of a specific boost effect from active boosts */
export function getBoostValue(boosts: ActiveBoost[], effect: BoostEffect): number {
  return boosts
    .filter(b => b.effect === effect)
    .reduce((sum, b) => sum + b.value, 0);
}

/** Apply resource_find_rate boost: scale up scrap/supplies */
export function applyResourceBoost(
  base: number,
  boosts: ActiveBoost[],
): number {
  const pct = getBoostValue(boosts, 'resource_find_rate');
  if (pct <= 0) return base;
  return Math.round(base * (1 + pct / 100));
}

/** Apply reduced_damage boost: scale down damage */
export function applyDamageReduction(
  base: number,
  boosts: ActiveBoost[],
): number {
  const pct = getBoostValue(boosts, 'reduced_damage');
  if (pct <= 0) return base;
  return Math.max(0, Math.round(base * (1 - pct / 100)));
}

/** Get extra scans from boost */
export function getExtraScansFromBoost(boosts: ActiveBoost[]): number {
  return getBoostValue(boosts, 'extra_scans');
}

/** Get repair/heal cost multiplier (e.g., 0.5 for 50% discount) */
export function getRepairCostMultiplier(boosts: ActiveBoost[]): number {
  const pct = getBoostValue(boosts, 'reduced_repair_cost');
  if (pct <= 0) return 1;
  return Math.max(0.1, 1 - pct / 100);
}
