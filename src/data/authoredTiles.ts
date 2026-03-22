import { TileFlavor, TileType } from '../types';

/**
 * Authored tile flavors for Broken Overpass.
 * 7 hand-crafted tiles layered on top of existing generation.
 * Each has specific rewards, damage, flavor text, and optional gear drops.
 */

export interface AuthoredTileDef {
  flavor: TileFlavor;
  /** Which base tile type this can be assigned to */
  validTypes: TileType[];
  /** Durability override (if different from default) */
  durability?: number;
}

// ─── Tile 1: Jackknifed Semi ───
const JACKKNIFED_SEMI: AuthoredTileDef = {
  flavor: {
    name: 'Jackknifed Semi',
    desc: 'A rusted semi-truck lies across two lanes, its trailer split open and spilling crates into the grass below the overpass.',
    icon: 'truck',
    scrapRange: [3, 4],
    suppliesRange: [2, 3],
    gearDropName: 'Padded Jacket',
    gearDropDesc: '+small reduction to Health damage from scans',
    gearDropChance: 0.12,
    whiffPlayerDamage: [1, 1],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 3],
    successNotes: [
      'The cargo bay was packed tight. Scrap, rations, sealed crates — good haul.',
      'You climbed in through the split trailer. Most of it\'s crushed, but the back rows held.',
      'Crates of industrial supplies, still banded. The wreck preserved everything.',
    ],
    whiffNotes: [
      'You slip on loose metal climbing in. Banged your knee, found nothing.',
      'The cargo shifted when you pulled a crate. Empty boxes all the way down.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

// ─── Tile 2: Collapsed On-Ramp ───
const COLLAPSED_ON_RAMP: AuthoredTileDef = {
  flavor: {
    name: 'Collapsed On-Ramp',
    desc: 'A crumbled on-ramp drops into a tangle of rebar and broken concrete, with a few abandoned cars barely hanging on.',
    icon: 'road-variant',
    scrapRange: [4, 5],
    suppliesRange: [0, 1],
    whiffPlayerDamage: [0, 0],
    whiffRoverDamage: [2, 2],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [2, 3],
    successNotes: [
      'You strip usable metal and wiring before the edge gives way. Clean extraction.',
      'Rebar, plating, and a half-intact axle. The ramp\'s loss is your gain.',
      'Three cars on the edge. You pulled parts from two before the concrete groaned.',
    ],
    whiffNotes: [
      'A section collapses while you\'re working. Falling debris clips the rover.',
      'The edge crumbles before you get deep enough. Chassis took a hit from loose concrete.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 1,
};

// ─── Tile 3: Roadside Cache ───
const ROADSIDE_CACHE: AuthoredTileDef = {
  flavor: {
    name: 'Roadside Cache',
    desc: 'Someone once stashed supplies beneath a roadside barrier, marked only by a faded symbol.',
    icon: 'treasure-chest',
    scrapRange: [1, 2],
    suppliesRange: [3, 4],
    gearDropName: 'Scavenger Satchel',
    gearDropDesc: '+small increase to Supplies found',
    gearDropChance: 0.12,
    whiffPlayerDamage: [1, 1],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 2],
    successNotes: [
      'The cache pops open. Rations, a water purifier, and a wound kit. Someone was prepared.',
      'Hidden under the barrier: vacuum-sealed supplies. Still good.',
      'A drifter\'s stash. They packed smart — everything you need, nothing you don\'t.',
    ],
    whiffNotes: [
      'The cache was rigged with a noise trap. You stumble back, startled, minor cuts.',
      'Pried it open to find... dirt. The real stash was already taken.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

// ─── Tile 4: Overpass Campfire Remains ───
const OVERPASS_CAMPFIRE: AuthoredTileDef = {
  flavor: {
    name: 'Overpass Campfire Remains',
    desc: 'Blackened fire rings and scattered bedrolls mark where another group once camped on the overpass.',
    icon: 'campfire',
    scrapRange: [0, 1],
    suppliesRange: [2, 3],
    intelRange: [1, 1],
    whiffPlayerDamage: [1, 1],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [0, 1],
    successNotes: [
      'You sift through the ashes and packs. Supplies, scratched directions, radio frequencies.',
      'The bedrolls are gone but someone left notes. Coordinates, signal bands, patrol timings.',
      'A half-burned journal under the fire ring. Intel on Directorate routes.',
    ],
    whiffNotes: [
      'You inhale ash and step on a half-buried nail. Nothing worth the trouble.',
      'Just cold embers and empty cans. Whoever was here took everything useful.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

// ─── Tile 5: Abandoned Checkpoint ───
const ABANDONED_CHECKPOINT: AuthoredTileDef = {
  flavor: {
    name: 'Abandoned Checkpoint',
    desc: 'Concrete barriers, rusted signs, and an overturned security booth choke the road, hinting at an old evacuation checkpoint.',
    icon: 'shield-alert',
    scrapRange: [2, 3],
    suppliesRange: [0, 1],
    intelRange: [2, 2],
    gearDropName: 'Signal Scanner',
    gearDropDesc: '+small increase to scan success',
    gearDropChance: 0.10,
    whiffPlayerDamage: [1, 1],
    whiffRoverDamage: [1, 1],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [2, 3],
    successNotes: [
      'The security booth had powered components and old ID logs. Directorate broadcast codes.',
      'You squeeze past the barricades and find maps, radio logs, and a working scanner module.',
      'Evacuation records, patrol schedules, and a sealed component case. Intel goldmine.',
    ],
    whiffNotes: [
      'A loose barricade collapses while you squeeze through. Takes you and the rover both.',
      'The booth was already stripped. The barricade shift caught you on the way out.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['anomaly', 'resource', 'unknown'],
  durability: 2,
};

// ─── Tile 6: Overgrown Off-Ramp ───
const OVERGROWN_OFF_RAMP: AuthoredTileDef = {
  flavor: {
    name: 'Overgrown Off-Ramp',
    desc: 'Vines and saplings claw at a half-collapsed off-ramp, hiding something metallic below.',
    icon: 'tree',
    scrapRange: [2, 3],
    suppliesRange: [1, 2],
    intelRange: [1, 1],
    whiffPlayerDamage: [2, 2],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 2],
    successNotes: [
      'You push through the foliage and find scrap, a med pouch, and — relay towers on the horizon. Logged their bearings.',
      'Under the vines: a buried vehicle and a clear sightline east. The relay field is visible from here.',
      'Salvageable parts and a vantage point. You spot distant antennas and mark the heading.',
    ],
    whiffNotes: [
      'You tangle in vines and slide down loose gravel. Scrapes and a twisted ankle.',
      'The foliage hides a drop. You catch yourself, but not cleanly.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 1,
};

// ─── Tile 7: Stripped Service Van (Safest tile) ───
const STRIPPED_SERVICE_VAN: AuthoredTileDef = {
  flavor: {
    name: 'Stripped Service Van',
    desc: 'A small service van sits on the shoulder, doors open, mostly stripped but still organized inside.',
    icon: 'van-utility',
    scrapRange: [1, 2],
    suppliesRange: [2, 3],
    whiffPlayerDamage: [0, 0],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 1],
    successNotes: [
      'Another scavenger left in a hurry — not from a fight. Their loss, your supplies.',
      'Organized compartments, half-emptied. Enough left to make it worth stopping.',
      'Tools, a first-aid kit, and canned rations. The van was someone\'s mobile base.',
    ],
    whiffNotes: [
      'Already picked clean. At least nothing went wrong.',
      'Empty shelves, empty toolbox. Someone was thorough. No harm done.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

// ─── Export ───

export const BROKEN_OVERPASS_TILES: AuthoredTileDef[] = [
  JACKKNIFED_SEMI,
  COLLAPSED_ON_RAMP,
  ROADSIDE_CACHE,
  OVERPASS_CAMPFIRE,
  ABANDONED_CHECKPOINT,
  OVERGROWN_OFF_RAMP,
  STRIPPED_SERVICE_VAN,
];
