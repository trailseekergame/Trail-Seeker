import { TileFlavor, TileType } from '../types';

/**
 * Authored tile flavors for Broken Overpass.
 * Each one replaces a generic tile with specific content, rewards, and risk.
 * Assigned during sector generation — the tile type (resource/anomaly/unknown)
 * still drives the grid visuals; the flavor overrides rewards and text.
 */

export interface AuthoredTileDef {
  flavor: TileFlavor;
  /** Which base tile type this can be assigned to */
  validTypes: TileType[];
  /** Durability override (if different from default) */
  durability?: number;
}

// ─── SAFE STASH TILES (2) ───
// Low risk, modest Supplies, teach new players that scanning pays off.

const COLLAPSED_SUPPLY_CACHE: AuthoredTileDef = {
  flavor: {
    name: 'Collapsed Supply Cache',
    desc: 'A Directorate supply crate pinned under rebar. Looks intact.',
    icon: 'package-variant-closed',
    scrapRange: [1, 3],
    suppliesRange: [3, 6],
    whiffPlayerDamage: [0, 0],
    whiffRoverDamage: [0, 1],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 2],
    successNotes: [
      'Crate popped clean. Rations, filters, a med kit. Nothing flashy — everything useful.',
      'Standard Directorate field supplies. They won\'t miss these.',
      'Sealed tight. The war didn\'t touch what\'s inside.',
    ],
    whiffNotes: [
      'The crate\'s empty. Someone got here first.',
      'Crushed flat. Nothing salvageable.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
};

const ABANDONED_CAMPSITE: AuthoredTileDef = {
  flavor: {
    name: 'Abandoned Campsite',
    desc: 'A drifter\'s camp under the overpass. Bedroll, fire pit, scattered cans.',
    icon: 'campfire',
    scrapRange: [1, 2],
    suppliesRange: [2, 5],
    whiffPlayerDamage: [0, 0],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 1],
    successNotes: [
      'Whoever camped here left in a hurry. Food, water, a half-charged battery.',
      'The fire\'s cold but the supplies are warm. Someone\'s loss, your gain.',
      'A stash hidden under the bedroll. Smart drifter.',
    ],
    whiffNotes: [
      'Picked clean. Not even crumbs.',
      'Just ash and empty cans. The trail moves on.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
};

// ─── MODERATE TILES (3) ───
// Balanced risk/reward, core of the experience.

const OVERTURNED_CARGO_TRUCK: AuthoredTileDef = {
  flavor: {
    name: 'Overturned Cargo Truck',
    desc: 'A convoy hauler flipped on its side. The rear doors are bent open.',
    icon: 'truck',
    scrapRange: [4, 8],
    suppliesRange: [1, 3],
    whiffPlayerDamage: [2, 4],
    whiffRoverDamage: [1, 3],
    successDamageChance: 0.2,
    successPlayerDamage: [1, 3],
    successRoverDamage: [0, 0],
    scrapValueRange: [2, 4],
    successNotes: [
      'The cargo bay still had bolted crates. Plated bearings, wire spools, a signal booster.',
      'Industrial salvage. Heavy, but it spends.',
      'Most of it\'s crushed but the rear compartment held. Good haul.',
    ],
    whiffNotes: [
      'The frame shifted when you climbed in. Nothing inside but rust.',
      'Structurally gone. The scanner pinged echoes, not cargo.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

const CRACKED_ASPHALT_VENT: AuthoredTileDef = {
  flavor: {
    name: 'Cracked Asphalt Vent',
    desc: 'Heat shimmer rising from a fissure in the road. Something\'s down there.',
    icon: 'waves',
    scrapRange: [3, 6],
    suppliesRange: [0, 2],
    whiffPlayerDamage: [3, 5],
    whiffRoverDamage: [0, 2],
    successDamageChance: 0.3,
    successPlayerDamage: [2, 4],
    successRoverDamage: [0, 0],
    scrapValueRange: [2, 5],
    successNotes: [
      'The vent opens into a buried maintenance tunnel. Pre-collapse tech, still sealed.',
      'Hot air, loose soil, and a data chip wedged in the rubble.',
      'The heat almost got you but the signal was real. Good pull from the underside.',
    ],
    whiffNotes: [
      'The vent goes nowhere. Just hot air and methane.',
      'You burned a scan on geology. The heat scrambled the read.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['anomaly', 'unknown'],
  durability: 2,
};

const DIRECTORATE_CHECKPOINT: AuthoredTileDef = {
  flavor: {
    name: 'Directorate Checkpoint',
    desc: 'An abandoned security post. Blast shields up, scanner turret offline.',
    icon: 'shield-alert',
    scrapRange: [3, 7],
    suppliesRange: [1, 3],
    whiffPlayerDamage: [2, 5],
    whiffRoverDamage: [2, 4],
    successDamageChance: 0.25,
    successPlayerDamage: [1, 3],
    successRoverDamage: [1, 2],
    scrapValueRange: [3, 5],
    successNotes: [
      'The turret\'s dead but the armory locker wasn\'t. Military-grade components.',
      'Security footage corrupted. But the supply room? Untouched.',
      'Directorate-issue gear. They build to last — which means it\'s worth something.',
    ],
    whiffNotes: [
      'The checkpoint had an automated purge. Everything wiped before you got in.',
      'Blast doors sealed when you tripped something. Walk away.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['anomaly', 'resource', 'unknown'],
  durability: 2,
};

// ─── JACKPOT / HIGH-RISK TILES (2) ───
// Big Scrap payoff or rare loot, but real damage potential.

const BURIED_ROVER_WRECK: AuthoredTileDef = {
  flavor: {
    name: 'Buried Rover Wreck',
    desc: 'Half a rover sticking out of the rubble. The engine housing looks intact.',
    icon: 'car-wrench',
    scrapRange: [8, 14],
    suppliesRange: [0, 2],
    whiffPlayerDamage: [4, 7],
    whiffRoverDamage: [3, 6],
    successDamageChance: 0.4,
    successPlayerDamage: [2, 5],
    successRoverDamage: [2, 4],
    scrapValueRange: [5, 8],
    successNotes: [
      'The engine core is worth a week\'s scrap alone. Heavy extraction but it\'s yours.',
      'You pulled the drive train, the nav unit, and a spare fuel cell. Jackpot.',
      'This rover was running black-market upgrades. Premium components.',
    ],
    whiffNotes: [
      'The rubble shifted. The whole wreck sank deeper. You barely got out.',
      'The engine was cracked — coolant leak ate the internals. Nothing to pull.',
      'Something moved in the wreck. You backed off before finding out what.',
    ],
    riskLabel: 'risky',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 2,
};

const COLLAPSED_OVERPASS_SPAN: AuthoredTileDef = {
  flavor: {
    name: 'Collapsed Span',
    desc: 'The entire overpass section pancaked. Deep scans show signal pockets underneath.',
    icon: 'bridge',
    scrapRange: [10, 18],
    suppliesRange: [1, 4],
    whiffPlayerDamage: [5, 8],
    whiffRoverDamage: [4, 7],
    successDamageChance: 0.5,
    successPlayerDamage: [3, 6],
    successRoverDamage: [2, 5],
    scrapValueRange: [6, 10],
    successNotes: [
      'Under the rubble: a sealed pre-collapse vault. The scanner couldn\'t believe it either.',
      'Three layers of concrete and you found a military cache. This changes the week.',
      'The structural collapse preserved what was underneath. Sealed compartments, untouched.',
    ],
    whiffNotes: [
      'The whole section groaned and shifted. You ran before it came down again.',
      'Concrete dust everywhere. The scanner fried from the interference.',
      'Deep scan was right about the pockets — they were just air.',
    ],
    riskLabel: 'dangerous',
  },
  validTypes: ['anomaly', 'unknown'],
  durability: 3,
};

// ─── Export ───

export const BROKEN_OVERPASS_TILES: AuthoredTileDef[] = [
  COLLAPSED_SUPPLY_CACHE,
  ABANDONED_CAMPSITE,
  OVERTURNED_CARGO_TRUCK,
  CRACKED_ASPHALT_VENT,
  DIRECTORATE_CHECKPOINT,
  BURIED_ROVER_WRECK,
  COLLAPSED_OVERPASS_SPAN,
];
