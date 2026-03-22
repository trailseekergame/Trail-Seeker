import { TileFlavor, TileType, GearItem } from '../types';
import {
  GEAR_PADDED_JACKET,
  GEAR_SCAVENGER_SATCHEL,
  GEAR_SIGNAL_SCANNER,
  GEAR_DUSTWALKER_LENS_PLUS,
  GEAR_DRIFTER_VEST_PLUS,
  GEAR_STEADY_GRIPS_PLUS,
} from './gearItems';

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
  /** Real GearItem to add to inventory on gear drop */
  gearDropItem?: GearItem;
}

// ─── Tile 1: Jackknifed Semi ───
const JACKKNIFED_SEMI: AuthoredTileDef = {
  gearDropItem: GEAR_PADDED_JACKET,
  flavor: {
    name: 'Jackknifed Semi',
    desc: 'A rusted semi-truck lies across two lanes, its trailer split open and spilling crates into the grass below the overpass.',
    icon: 'truck',
    scrapRange: [3, 4],
    suppliesRange: [2, 3],
    gearDropName: 'Padded Jacket',
    gearDropDesc: '+small reduction to Health damage from scans',
    gearDropChance: 0.08,
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
  gearDropItem: GEAR_SCAVENGER_SATCHEL,
  flavor: {
    name: 'Roadside Cache',
    desc: 'Someone once stashed supplies beneath a roadside barrier, marked only by a faded symbol.',
    icon: 'treasure-chest',
    scrapRange: [1, 2],
    suppliesRange: [3, 4],
    gearDropName: 'Scavenger Satchel',
    gearDropDesc: '+small increase to Supplies found',
    gearDropChance: 0.08,
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
  gearDropItem: GEAR_SIGNAL_SCANNER,
  flavor: {
    name: 'Abandoned Checkpoint',
    desc: 'Concrete barriers, rusted signs, and an overturned security booth choke the road, hinting at an old evacuation checkpoint.',
    icon: 'shield-alert',
    scrapRange: [2, 3],
    suppliesRange: [0, 1],
    intelRange: [2, 2],
    gearDropName: 'Signal Scanner',
    gearDropDesc: '+small increase to scan success',
    gearDropChance: 0.06,
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

// ═══════════════════════════════════════════════════════
// RELAY FIELD — harder risk, better rewards, enhanced drops
// ═══════════════════════════════════════════════════════

const CRACKED_DISH_ARRAY: AuthoredTileDef = {
  flavor: {
    name: 'Cracked Dish Array',
    desc: 'A massive satellite dish lies split in two, its receiver housing still intact and humming faintly.',
    icon: 'satellite-variant',
    scrapRange: [4, 7],
    suppliesRange: [1, 2],
    intelRange: [2, 3],
    whiffPlayerDamage: [3, 5],
    whiffRoverDamage: [2, 4],
    successDamageChance: 0.2,
    successPlayerDamage: [2, 3],
    successRoverDamage: [0, 0],
    scrapValueRange: [3, 5],
    successNotes: [
      'The receiver housing cracked open. Data cores, signal amplifiers, and a sealed module inside.',
      'You pulled three intact relay boards from the dish mount. Pre-collapse military grade.',
      'The hum was residual power. You drained the capacitors into salvageable cells.',
    ],
    whiffNotes: [
      'The dish groaned and shifted. A support cable snapped — you took the hit.',
      'Interference from the residual power scrambled your scanner. Walked away hurting.',
    ],
    riskLabel: 'risky',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 2,
};

const SEALED_BUNKER_HATCH: AuthoredTileDef = {
  gearDropItem: GEAR_DRIFTER_VEST_PLUS,
  flavor: {
    name: 'Sealed Bunker Hatch',
    desc: 'A reinforced hatch set into the ground beneath overgrown concrete. The lock is corroded but the seal held.',
    icon: 'door-closed-lock',
    scrapRange: [5, 9],
    suppliesRange: [3, 5],
    intelRange: [1, 2],
    gearDropName: 'Drifter Vest+',
    gearDropDesc: 'Plated reinforcement. Extra scan charge and better loot quality.',
    gearDropChance: 0.10,
    whiffPlayerDamage: [4, 6],
    whiffRoverDamage: [0, 2],
    successDamageChance: 0.15,
    successPlayerDamage: [2, 4],
    successRoverDamage: [0, 0],
    scrapValueRange: [4, 6],
    successNotes: [
      'The hatch gave way. Below: sealed supply crates, a med station, and military-grade gear.',
      'Someone stocked this bunker for the long haul. You\'re taking everything that fits.',
      'An emergency cache. Rations, tools, ammo crates converted to scrap, and a plated vest rig.',
    ],
    whiffNotes: [
      'The hatch mechanism fired a corroded bolt. You caught shrapnel prying it open.',
      'Sealed too tight. You bruised yourself and burned a scan for a locked door.',
    ],
    riskLabel: 'risky',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 2,
};

const DEAD_SIGNAL_TOWER: AuthoredTileDef = {
  gearDropItem: GEAR_DUSTWALKER_LENS_PLUS,
  flavor: {
    name: 'Dead Signal Tower',
    desc: 'A relay tower with its power lines cut. The control booth at the base looks untouched.',
    icon: 'antenna',
    scrapRange: [3, 6],
    suppliesRange: [0, 2],
    intelRange: [3, 4],
    gearDropName: 'Dustwalker Lens+',
    gearDropDesc: 'Tuned filters and a wider band. Rare signals come through cleaner.',
    gearDropChance: 0.10,
    whiffPlayerDamage: [2, 4],
    whiffRoverDamage: [2, 3],
    successDamageChance: 0.25,
    successPlayerDamage: [1, 3],
    successRoverDamage: [1, 2],
    scrapValueRange: [3, 5],
    successNotes: [
      'The booth had broadcast logs, encryption keys, and a tuned optics module still in its case.',
      'You downloaded weeks of Directorate signal traffic. Intel goldmine — and a lens upgrade.',
      'Tower control systems, intact. The data alone is worth the climb.',
    ],
    whiffNotes: [
      'The tower base was booby-trapped. Old Directorate countermeasure — it clipped both of you.',
      'Static discharge from the dead lines. Your scanner fried mid-read.',
    ],
    riskLabel: 'risky',
  },
  validTypes: ['anomaly', 'resource', 'unknown'],
  durability: 2,
};

const BURIED_DATA_VAULT: AuthoredTileDef = {
  flavor: {
    name: 'Buried Data Vault',
    desc: 'Exposed by erosion — a pre-collapse data center entrance, half-buried in loose soil and roots.',
    icon: 'database',
    scrapRange: [2, 4],
    suppliesRange: [1, 3],
    intelRange: [4, 5],
    whiffPlayerDamage: [3, 5],
    whiffRoverDamage: [1, 3],
    successDamageChance: 0.3,
    successPlayerDamage: [2, 4],
    successRoverDamage: [0, 2],
    scrapValueRange: [2, 4],
    successNotes: [
      'Server racks, still cold. You pulled drives, memory modules, and a full backup archive.',
      'The vault\'s climate control kept everything pristine. This data is worth more than scrap.',
      'Encryption keys, deployment logs, asset manifests. The Directorate\'s own records.',
    ],
    whiffNotes: [
      'The entrance collapsed as you entered. Dug out, bruised, with nothing to show.',
      'Vault flooded at some point. The drives are corroded paste. And you twisted your ankle.',
    ],
    riskLabel: 'dangerous',
  },
  validTypes: ['anomaly', 'unknown'],
  durability: 3,
};

const PATROL_WRECK: AuthoredTileDef = {
  flavor: {
    name: 'Directorate Patrol Wreck',
    desc: 'An armored Directorate patrol vehicle, burned out but structurally intact. The cargo bay door is jammed open.',
    icon: 'car-estate',
    scrapRange: [6, 10],
    suppliesRange: [2, 4],
    whiffPlayerDamage: [3, 6],
    whiffRoverDamage: [3, 5],
    successDamageChance: 0.3,
    successPlayerDamage: [2, 4],
    successRoverDamage: [2, 3],
    scrapValueRange: [4, 7],
    successNotes: [
      'Military scrap — armor plating, optics, a cracked but usable power cell. Heavy haul.',
      'The cargo bay had sealed weapon crates. No weapons, but the components are premium.',
      'You stripped the patrol vehicle to the frame. Best scrap run in weeks.',
    ],
    whiffNotes: [
      'The wreck was still hot. Chemical burns on your hands, shrapnel hit the rover.',
      'Munitions cooked off when you opened the wrong panel. Both of you took it.',
    ],
    riskLabel: 'dangerous',
  },
  validTypes: ['resource', 'anomaly', 'unknown'],
  durability: 2,
};

const OVERGROWN_CONTROL_ROOM: AuthoredTileDef = {
  gearDropItem: GEAR_STEADY_GRIPS_PLUS,
  flavor: {
    name: 'Overgrown Control Room',
    desc: 'Vines thread through shattered windows into a relay control room. Monitors flicker with phantom signals.',
    icon: 'monitor-dashboard',
    scrapRange: [3, 5],
    suppliesRange: [2, 3],
    intelRange: [2, 3],
    gearDropName: 'Steady Grips+',
    gearDropDesc: 'Stabilized dampeners. Whiff rate drops noticeably.',
    gearDropChance: 0.10,
    whiffPlayerDamage: [2, 3],
    whiffRoverDamage: [0, 1],
    successDamageChance: 0.1,
    successPlayerDamage: [1, 2],
    successRoverDamage: [0, 0],
    scrapValueRange: [2, 4],
    successNotes: [
      'The monitors were running diagnostics on loop. You pulled the boards and a pair of stabilized grips.',
      'Control systems, signal routing hardware, and a log of every frequency this array ever tracked.',
      'Workstation drawers: repair tools, a grip stabilizer, and sealed data chips.',
    ],
    whiffNotes: [
      'Glass underfoot. You stepped wrong and the vines pulled loose cables onto you.',
      'The phantom signals turned out to be interference. Cost you a scan and a scraped arm.',
    ],
    riskLabel: 'moderate',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

const RELAY_FIELD_SHED: AuthoredTileDef = {
  flavor: {
    name: 'Maintenance Shed',
    desc: 'A corrugated metal shed near the array perimeter. Tools hang on pegboard, mostly intact.',
    icon: 'home-variant',
    scrapRange: [2, 4],
    suppliesRange: [3, 5],
    whiffPlayerDamage: [0, 1],
    whiffRoverDamage: [0, 0],
    successDamageChance: 0,
    successPlayerDamage: [0, 0],
    successRoverDamage: [0, 0],
    scrapValueRange: [1, 3],
    successNotes: [
      'The shed was someone\'s workshop. Tools, a med kit, canned water. Quiet and clean.',
      'Pegboard tools, a workbench with spare parts, and supplies tucked in a locker.',
      'A maintenance worker\'s stash. Organized, practical, untouched.',
    ],
    whiffNotes: [
      'Already cleaned out. At least the roof didn\'t leak on you.',
      'Nothing but empty hooks and a dead radio. Safe, but useless.',
    ],
    riskLabel: 'safe',
  },
  validTypes: ['resource', 'unknown'],
  durability: 1,
};

export const RELAY_FIELD_TILES: AuthoredTileDef[] = [
  CRACKED_DISH_ARRAY,
  SEALED_BUNKER_HATCH,
  DEAD_SIGNAL_TOWER,
  BURIED_DATA_VAULT,
  PATROL_WRECK,
  OVERGROWN_CONTROL_ROOM,
  RELAY_FIELD_SHED,
];
