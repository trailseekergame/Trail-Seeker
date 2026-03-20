import { TrailOutcome, TrailOutcomeTier, ItemRarity, GameState } from '../types';

/**
 * Trail Move Outcome Deck
 *
 * Every move forward is a risk event. The player draws from a weighted outcome
 * deck that determines what happens on the trail between nodes.
 *
 * Base weights: Good 30%, Neutral 45%, Bad 25%
 * Modifier hooks allow traits, gear, and tech to shift the odds later.
 */

// ─── Base Probability Weights ───
interface OutcomeWeights {
  good: number;
  neutral: number;
  bad: number;
}

const BASE_WEIGHTS: OutcomeWeights = {
  good: 0.3,
  neutral: 0.45,
  bad: 0.25,
};

// ─── Modifier Hook (extend later with traits/gear/tech) ───
export type OutcomeModifier = (weights: OutcomeWeights, state: GameState) => OutcomeWeights;

const modifiers: OutcomeModifier[] = [];

export function registerOutcomeModifier(mod: OutcomeModifier) {
  modifiers.push(mod);
}

function getModifiedWeights(state: GameState): OutcomeWeights {
  let weights = { ...BASE_WEIGHTS };
  for (const mod of modifiers) {
    weights = mod(weights, state);
  }
  // Normalize so they sum to 1
  const total = weights.good + weights.neutral + weights.bad;
  return {
    good: weights.good / total,
    neutral: weights.neutral / total,
    bad: weights.bad / total,
  };
}

// ─── Weighted Random Draw ───
function drawTier(state: GameState): TrailOutcomeTier {
  const w = getModifiedWeights(state);
  const roll = Math.random();
  if (roll < w.good) return 'good';
  if (roll < w.good + w.neutral) return 'neutral';
  return 'bad';
}

// ─── Loot Rarity by Tier ───
// Good outcomes can drop up to rare; relic only from special events
function rollLootRarity(tier: TrailOutcomeTier): ItemRarity | null {
  if (tier === 'bad') return null;
  if (tier === 'neutral') {
    // 20% chance of common loot on neutral
    return Math.random() < 0.2 ? 'common' : null;
  }
  // Good tier: weighted rarity
  const roll = Math.random();
  if (roll < 0.55) return 'common';
  if (roll < 0.85) return 'uncommon';
  return 'rare'; // 15% chance
}

// ─── Outcome Pools ───
const GOOD_OUTCOMES: Omit<TrailOutcome, 'tier'>[] = [
  {
    title: 'Lucky Find',
    narration: 'A glint catches your eye — scrap wedged under a highway divider. Pockets heavier, spirits higher.',
    resourceChanges: { scrap: 5 },
  },
  {
    title: 'Sheltered Cache',
    narration: 'Someone left supplies in a sealed drainage pipe, marked with a Lantern glyph. Still good.',
    resourceChanges: { supplies: 4 },
  },
  {
    title: 'Clean Air Pocket',
    narration: 'The haze thins. You breathe deep for the first time in days. Your body thanks you.',
    heal: 8,
  },
  {
    title: 'Friendly Drifter',
    narration: 'A fellow traveler shares road intel and a handful of bolts. Small kindnesses on the Trail.',
    resourceChanges: { scrap: 3 },
    triggerEvent: true,
  },
  {
    title: 'Salvage Score',
    narration: 'An abandoned rover, picked clean on the outside — but the underbelly still has good parts.',
    resourceChanges: { scrap: 8, supplies: -1 },
  },
  {
    title: 'Trail Intel',
    narration: 'Scrawled warnings on a wall reveal safe paths ahead. Knowledge is currency out here.',
    triggerEvent: true,
  },
];

const NEUTRAL_OUTCOMES: Omit<TrailOutcome, 'tier'>[] = [
  {
    title: 'Empty Miles',
    narration: 'Nothing but cracked asphalt and silence. The wind smells like rust. You keep moving.',
  },
  {
    title: 'Distant Thunder',
    narration: 'Storm clouds stack on the horizon. The rain hasn\'t reached you — yet.',
  },
  {
    title: 'Old Graffiti',
    narration: '"KEEP GOING" — someone spray-painted it on a collapsed overpass. You nod and do exactly that.',
  },
  {
    title: 'Rover Hums',
    narration: 'The rover\'s engine settles into a steady rhythm. No trouble, no treasure. Just road.',
  },
  {
    title: 'Faded Checkpoint',
    narration: 'An abandoned Directorate scanner post. The equipment is dead. You pass through without incident.',
  },
  {
    title: 'Dust Devil',
    narration: 'A small dust devil dances across the road and dissolves. Nature\'s only entertainment out here.',
  },
];

const BAD_OUTCOMES: Omit<TrailOutcome, 'tier'>[] = [
  {
    title: 'Pothole Damage',
    narration: 'The rover drops into a hidden crater. Metal screams. You\'re fine, but the suspension isn\'t.',
    damage: 5,
  },
  {
    title: 'Supply Spoilage',
    narration: 'A seal cracked on your water stores. Half a day\'s supply — gone to the rust.',
    resourceChanges: { supplies: -3 },
  },
  {
    title: 'Ambush Scare',
    narration: 'Figures on the ridgeline. You gun it, burning fuel and nerves. They don\'t follow — this time.',
    resourceChanges: { supplies: -2 },
    damage: 3,
  },
  {
    title: 'Toxic Puddle',
    narration: 'Your boots hit something wet and wrong. Chemical burn through the sole. You limp on.',
    damage: 8,
  },
  {
    title: 'Dead End Detour',
    narration: 'Collapsed bridge. You double back, wasting time and fuel on a route that goes nowhere.',
    resourceChanges: { supplies: -2 },
    movePlayer: -1,
  },
  {
    title: 'Scrap Tax',
    narration: 'Someone rigged a toll wire across the road. Pay the scrap or lose the daylight.',
    resourceChanges: { scrap: -4 },
  },
];

// ─── Main Draw Function ───
export function drawTrailOutcome(state: GameState): TrailOutcome {
  const tier = drawTier(state);

  let pool: Omit<TrailOutcome, 'tier'>[];
  switch (tier) {
    case 'good':
      pool = GOOD_OUTCOMES;
      break;
    case 'neutral':
      pool = NEUTRAL_OUTCOMES;
      break;
    case 'bad':
      pool = BAD_OUTCOMES;
      break;
  }

  const base = pool[Math.floor(Math.random() * pool.length)];

  // Roll for loot on good/neutral outcomes
  const lootRarity = rollLootRarity(tier);
  const outcome: TrailOutcome = {
    ...base,
    tier,
  };

  if (lootRarity && !outcome.addItem) {
    outcome.itemRarity = lootRarity;
    switch (lootRarity) {
      case 'common':
        outcome.addItem = 'Scrap Component';
        outcome.resourceChanges = {
          ...outcome.resourceChanges,
          scrap: (outcome.resourceChanges?.scrap ?? 0) + 2,
        };
        break;
      case 'uncommon':
        outcome.addItem = 'Intact Module';
        outcome.resourceChanges = {
          ...outcome.resourceChanges,
          scrap: (outcome.resourceChanges?.scrap ?? 0) + 4,
        };
        break;
      case 'rare':
        outcome.addItem = 'Pre-Collapse Tech';
        outcome.resourceChanges = {
          ...outcome.resourceChanges,
          scrap: (outcome.resourceChanges?.scrap ?? 0) + 8,
        };
        break;
      default:
        break;
    }
  }

  return outcome;
}

// ─── Utility: Tier display colors (for UI) ───
export function getTierColor(tier: TrailOutcomeTier): string {
  switch (tier) {
    case 'good':
      return '#39FF14'; // neonGreen
    case 'neutral':
      return '#E0E0E0'; // textSecondary
    case 'bad':
      return '#FF3131'; // neonRed
  }
}

export function getTierIcon(tier: TrailOutcomeTier): string {
  switch (tier) {
    case 'good':
      return '✦';
    case 'neutral':
      return '—';
    case 'bad':
      return '⚠';
  }
}
