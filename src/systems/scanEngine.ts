import gameBalance from '../config/gameBalance.json';
import { ScanType, ScanOutcome, ScanResult, GearSlotId, GearItem, SeekerScanState, TileFlavor } from '../types';
import { ULTRA_DROPS } from '../data/gearItems';

// ─── Read config ───
const config = gameBalance;
const rails = config.balance_rails;

// ─── Compute daily scans ───
export function computeDailyScans(streakDay: number, activeGear: GearSlotId[], gearInventory: GearItem[]): number {
  const base = config.streak_ladder.base_scans;
  const streakBonus = config.streak_ladder.bonus_by_day[Math.min(streakDay, 7)] || 0;

  // Gear bonus (from Exo-Vest)
  let gearBonus = 0;
  if (activeGear.includes('exo_vest')) {
    const vest = gearInventory.find(g => g.slotId === 'exo_vest');
    if (vest) {
      const stats = (config.gear_stats.exo_vest as any)[vest.quality];
      gearBonus = Math.min(stats?.bonus_scans || 0, rails.max_gear_bonus_scans);
    }
  }

  return Math.min(base + streakBonus + gearBonus, rails.max_daily_scans);
}

// ─── Compute streak rare boost ───
export function getStreakRareBoost(streakDay: number): number {
  return config.streak_ladder.rare_boost_by_day[Math.min(streakDay, 7)] || 0;
}

// ─── Compute effective whiff rate ───
export function getEffectiveWhiffRate(scanType: ScanType, streakDay: number, activeGear: GearSlotId[], gearInventory: GearItem[]): number {
  const tierConfig = (config.risk_tiers as any)[scanType];
  let whiffRate = tierConfig.whiff_rate;

  // Streak reduces Gambit whiff slightly
  if (scanType === 'gambit') {
    const streakReduction = streakDay >= 7 ? 0.15 : streakDay >= 5 ? 0.10 : streakDay >= 3 ? 0.05 : 0;
    whiffRate -= streakReduction;
  }

  // Grip Gauntlets reduce whiff
  if (activeGear.includes('grip_gauntlets')) {
    const gauntlets = gearInventory.find(g => g.slotId === 'grip_gauntlets');
    if (gauntlets) {
      const stats = (config.gear_stats.grip_gauntlets as any)[gauntlets.quality];
      whiffRate -= Math.min(stats?.whiff_reduction || 0, rails.max_whiff_reduction);
    }
  }

  // Apply floor
  if (scanType === 'gambit') {
    whiffRate = Math.max(whiffRate, rails.gambit_whiff_floor);
  }

  return Math.max(0, whiffRate);
}

// ─── Resolve a single scan ───
export function resolveScan(
  scanType: ScanType,
  tileId: string,
  state: SeekerScanState,
): ScanResult {
  const activeGear = state.activeGearSlots;
  const inventory = state.gearInventory;
  const streakDay = state.streakDay;

  // 1. Roll for whiff
  const whiffRate = getEffectiveWhiffRate(scanType, streakDay, activeGear, inventory);
  const whiffRoll = Math.random();

  let droneProc = false;

  if (whiffRoll < whiffRate) {
    // WHIFF — check Salvage Drone
    if (activeGear.includes('salvage_drone')) {
      const drone = inventory.find(g => g.slotId === 'salvage_drone');
      if (drone) {
        const stats = (config.gear_stats.salvage_drone as any)[drone.quality];
        const refundChance = Math.min(stats?.refund_chance || 0, rails.max_refund_chance);
        if (Math.random() < refundChance) {
          droneProc = true;
        }
      }
    }

    const { fieldNote } = generateLootData('whiff');
    return {
      scanType,
      outcome: 'whiff',
      tileId,
      sectorProgress: 0,
      fieldNote,
      droneProc,
      bootsProc: false,
      cortexProc: false,
      opticsProc: false,
      scrapAwarded: 0,
      suppliesAwarded: 0,
      intelAwarded: 0,
      playerDamage: 0,
      roverDamage: 0,
      scrapValue: 0,
    };
  }

  // 2. Roll for loot quality
  const tierConfig = (config.risk_tiers as any)[scanType];
  const lootTable = { ...tierConfig.loot_table };

  // Apply streak rare boost
  const streakRareBoost = getStreakRareBoost(streakDay);

  // Apply Optics Rig rare boost
  let opticsProc = false;
  let opticsBoost = 0;
  if (activeGear.includes('optics_rig')) {
    const optics = inventory.find(g => g.slotId === 'optics_rig');
    if (optics) {
      const stats = (config.gear_stats.optics_rig as any)[optics.quality];
      opticsBoost = stats?.rare_boost || 0;
    }
  }

  // Apply Cortex Link (Gambit only)
  let cortexProc = false;
  let cortexBoost = 0;
  if (scanType === 'gambit' && activeGear.includes('cortex_link')) {
    const cortex = inventory.find(g => g.slotId === 'cortex_link');
    if (cortex) {
      const stats = (config.gear_stats.cortex_link as any)[cortex.quality];
      cortexBoost = stats?.gambit_legendary_boost || 0;
      cortexProc = cortexBoost > 0;
    }
  }

  // Shift probabilities (boost rare/legendary, reduce common)
  const totalBoost = Math.min(streakRareBoost + opticsBoost, rails.max_rare_chance_boost);
  if (totalBoost > 0 && lootTable.rare !== undefined) {
    lootTable.rare = (lootTable.rare || 0) + totalBoost;
    if (opticsBoost > 0) opticsProc = true;
    // Reduce common to compensate
    lootTable.common = Math.max(0, (lootTable.common || 0) - totalBoost);
  }
  if (cortexBoost > 0 && lootTable.legendary !== undefined) {
    lootTable.legendary = (lootTable.legendary || 0) + cortexBoost;
    lootTable.uncommon = Math.max(0, (lootTable.uncommon || 0) - cortexBoost);
  }

  // Roll loot
  const lootRoll = Math.random();
  let cumulative = 0;
  let outcome: ScanOutcome = 'common';
  for (const [tier, chance] of Object.entries(lootTable)) {
    cumulative += chance as number;
    if (lootRoll < cumulative) {
      outcome = tier as ScanOutcome;
      break;
    }
  }

  // Check for component (Gambit only)
  if (scanType === 'gambit' && tierConfig.component_chance) {
    const componentChance = tierConfig.component_chance + (cortexProc ? ((config.gear_stats.cortex_link as any)[(inventory.find(g => g.slotId === 'cortex_link')?.quality || 'standard')]?.component_boost || 0) : 0);
    if (Math.random() < componentChance) {
      outcome = 'component';
    }
  }

  // 3. Calculate sector progress
  const progressConfig = tierConfig.sector_progress;
  let sectorProgress = progressConfig.base;
  if (progressConfig.bonus_chance && Math.random() < progressConfig.bonus_chance) {
    sectorProgress += 1;
  }

  // Nav Boots bonus
  let bootsProc = false;
  if (activeGear.includes('nav_boots')) {
    const boots = inventory.find(g => g.slotId === 'nav_boots');
    if (boots) {
      const stats = (config.gear_stats.nav_boots as any)[boots.quality];
      const bonus = stats?.sector_bonus || 0;
      if (bonus >= 1) {
        sectorProgress += Math.floor(bonus);
        bootsProc = true;
      } else if (bonus > 0 && Math.random() < bonus) {
        sectorProgress += 1;
        bootsProc = true;
      }
      // Double progress chance
      if (stats?.double_progress_chance && Math.random() < stats.double_progress_chance) {
        sectorProgress += 1;
        bootsProc = true;
      }
    }
  }

  sectorProgress = Math.min(sectorProgress, progressConfig.base + rails.max_sector_progress_bonus);

  // Generate loot name + field note
  const { lootName, fieldNote } = generateLootData(outcome);

  return {
    scanType,
    outcome,
    tileId,
    sectorProgress,
    lootName,
    lootRarity: outcome,
    fieldNote,
    droneProc: false,
    bootsProc,
    cortexProc,
    opticsProc,
    // Rewards/damage filled in by caller after tile type is known
    scrapAwarded: 0,
    suppliesAwarded: 0,
    intelAwarded: 0,
    playerDamage: 0,
    roverDamage: 0,
    scrapValue: 0,
  };
}

// ─── Phase 1: Risk & Resource tables ───

/**
 * Balance tuned via 2000-player simulation (sim_playtest_v3.py).
 * Target: ~7 HP + ~5 rover damage/session, 10-11 scrap/session,
 * 3-4 supplies/session, ~2 supply surplus/day after healing.
 * Wipeouts < 5% over chapter 1. "A little heat, not frustrating."
 */

/** Scrap awarded per loot tier */
const SCRAP_BY_OUTCOME: Record<string, [number, number]> = {
  whiff: [0, 0],
  common: [1, 2],
  uncommon: [2, 3],
  rare: [3, 6],
  legendary: [6, 12],
  component: [0, 0],
};

/** Supplies awarded per loot tier */
const SUPPLIES_BY_OUTCOME: Record<string, [number, number]> = {
  whiff: [0, 0],
  common: [0, 1],
  uncommon: [0, 1],
  rare: [1, 3],
  legendary: [2, 5],
  component: [0, 1],
};

/** Whiff damage — teaches risk */
const WHIFF_PLAYER_DAMAGE: [number, number] = [3, 7];
const WHIFF_ROVER_DAMAGE: [number, number] = [2, 5];
const GAMBIT_WHIFF_PLAYER_DAMAGE: [number, number] = [6, 10];
const GAMBIT_WHIFF_ROVER_DAMAGE: [number, number] = [4, 8];
/** Anomaly tiles: 50% chance of hazard damage on success */
const ANOMALY_DAMAGE: [number, number] = [2, 5];
/** Boss tiles hit harder */
const BOSS_DAMAGE: [number, number] = [8, 14];

/** Scrap value when scrapping loot items */
const SCRAP_VALUE_BY_OUTCOME: Record<string, [number, number]> = {
  whiff: [0, 0],
  common: [1, 2],
  uncommon: [2, 4],
  rare: [4, 7],
  legendary: [8, 14],
  component: [0, 0],
};

function rollRange(range: [number, number]): number {
  return range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
}

export interface ScanRewards {
  scrapAwarded: number;
  suppliesAwarded: number;
  intelAwarded: number;
  playerDamage: number;
  roverDamage: number;
  scrapValue: number;
  gearDrop?: string;
  gearDropItem?: GearItem;
}

/** Compute resource rewards and damage for a scan result */
export function computeScanRewards(
  outcome: ScanOutcome,
  scanType: ScanType,
  tileType: string,
  tileFlavor?: TileFlavor,
): ScanRewards {
  // ─── Authored tile: use flavor-specific ranges ───
  if (tileFlavor) {
    return computeFlavoredRewards(outcome, scanType, tileFlavor);
  }

  // ─── Generic tile: use standard tables ───
  const scrapAwarded = rollRange(SCRAP_BY_OUTCOME[outcome] || [0, 0]);
  const suppliesAwarded = rollRange(SUPPLIES_BY_OUTCOME[outcome] || [0, 0]);
  const scrapValue = rollRange(SCRAP_VALUE_BY_OUTCOME[outcome] || [0, 0]);

  let playerDamage = 0;
  let roverDamage = 0;

  // Whiff damage — teaches risk
  if (outcome === 'whiff') {
    if (scanType === 'gambit') {
      playerDamage = rollRange(GAMBIT_WHIFF_PLAYER_DAMAGE);
      roverDamage = rollRange(GAMBIT_WHIFF_ROVER_DAMAGE);
    } else if (scanType === 'seeker') {
      if (Math.random() < 0.5) {
        playerDamage = rollRange(WHIFF_PLAYER_DAMAGE);
      } else {
        roverDamage = rollRange(WHIFF_ROVER_DAMAGE);
      }
    }
  }

  // Anomaly / boss tile hazard damage (even on success)
  if (tileType === 'anomaly' && outcome !== 'whiff') {
    if (Math.random() < 0.5) {
      const dmg = rollRange(ANOMALY_DAMAGE);
      if (Math.random() < 0.5) {
        playerDamage += dmg;
      } else {
        roverDamage += dmg;
      }
    }
  }
  if (tileType === 'boss') {
    const dmg = rollRange(BOSS_DAMAGE);
    playerDamage += Math.ceil(dmg * 0.6);
    roverDamage += Math.ceil(dmg * 0.4);
  }

  return { scrapAwarded, suppliesAwarded, intelAwarded: 0, playerDamage, roverDamage, scrapValue };
}

/**
 * Roll for ultra-rare gear drop.
 * Only triggers on anomaly/boss tiles when streak >= 3.
 * 1.8% chance per eligible scan (~60% chance of seeing one in 30 days).
 */
export function rollUltraDrop(
  tileType: string,
  streakDay: number,
): GearItem | undefined {
  if (streakDay < 3) return undefined;
  if (tileType !== 'anomaly' && tileType !== 'boss') return undefined;
  if (Math.random() > 0.018) return undefined; // 1.8%
  return ULTRA_DROPS[Math.floor(Math.random() * ULTRA_DROPS.length)];
}

/** Compute rewards using authored tile flavor ranges */
function computeFlavoredRewards(
  outcome: ScanOutcome,
  scanType: ScanType,
  f: TileFlavor,
): ScanRewards {
  if (outcome === 'whiff') {
    let playerDamage = rollRange(f.whiffPlayerDamage);
    let roverDamage = rollRange(f.whiffRoverDamage);
    if (scanType === 'gambit') {
      playerDamage = Math.ceil(playerDamage * 1.5);
      roverDamage = Math.ceil(roverDamage * 1.5);
    }
    return {
      scrapAwarded: 0,
      suppliesAwarded: 0,
      intelAwarded: 0,
      playerDamage,
      roverDamage,
      scrapValue: 0,
    };
  }

  // Success: use flavor reward ranges
  const scrapAwarded = rollRange(f.scrapRange);
  const suppliesAwarded = rollRange(f.suppliesRange);
  const intelAwarded = f.intelRange ? rollRange(f.intelRange) : 0;
  const scrapValue = rollRange(f.scrapValueRange);

  let playerDamage = 0;
  let roverDamage = 0;

  if (f.successDamageChance > 0 && Math.random() < f.successDamageChance) {
    playerDamage = rollRange(f.successPlayerDamage);
    roverDamage = rollRange(f.successRoverDamage);
  }

  // Roll for starter gear drop
  let gearDrop: string | undefined;
  if (f.gearDropName && f.gearDropChance && Math.random() < f.gearDropChance) {
    gearDrop = f.gearDropName;
  }

  return { scrapAwarded, suppliesAwarded, intelAwarded, playerDamage, roverDamage, scrapValue, gearDrop };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLootData(outcome: ScanOutcome): { lootName?: string; fieldNote?: string } {
  const names: Record<string, string[]> = {
    common: ['Scrap Bundle', 'Worn Filter', 'Rusted Bolt Set', 'Cracked Lens', 'Salvage Wire'],
    uncommon: ['Intact Module', 'Signal Booster', 'Plated Bearing', 'Charged Cell', 'Data Chip'],
    rare: ['Pre-Collapse Tech', 'Sealed Component', 'Amplifier Core', 'Encrypted Drive'],
    legendary: ['Void-Touched Relic', 'Archon Module', 'Quantum Shard', 'Zero-Point Cell'],
    component: ['Signal Fragment', 'Void Shard', 'Circuit Relic', 'Trail Cipher'],
  };

  const fieldNotes: Record<string, string[]> = {
    whiff: [
      'Nothing but dead air and dust.',
      'Signal collapsed before you could lock it.',
      'The static ate everything.',
      'Burned a scan for empty ground.',
      'Whatever was here, it\'s gone.',
      'Ground reads cold. Move on.',
      'The frequency died mid-sweep.',
      'Noise floor swallowed the ping.',
    ],
    common: [
      'Bottom of the barrel, but it spends.',
      'Junk salvage. Better than nothing.',
      'Standard pull. Keeps the lights on.',
      'The kind of haul nobody brags about.',
      'Scraps. The Trail\'s daily bread.',
      'Worn, dented, functional. It\'ll do.',
      'Barely worth the scan charge.',
    ],
    uncommon: [
      'Something worth packing. Decent signal.',
      'Not junk. Someone maintained this.',
      'Clean tech. The rover flagged it immediately.',
      'A real find buried under the noise.',
      'Solid pull. The kind that keeps you coming back.',
      'Better than expected. The read was right.',
    ],
    rare: [
      'The kind of signal that makes the risk worth it.',
      'Buried deep. The Directorate missed this one.',
      'Pre-collapse hardware. Still sealed.',
      'Your hands are shaking. That\'s how you know it\'s good.',
      'Rare grade. The scanners barely believed it.',
    ],
    legendary: [
      'This changes the run. This changes the week.',
      'You\'ve never pulled anything like this.',
      'The signal was so clean it scared you.',
    ],
    component: [
      'Relic-grade. The Pathfinder array is responding.',
      'Fragment locked. The module is one step closer.',
      'Ancient tech. It hums when you hold it.',
    ],
  };

  if (outcome === 'whiff') {
    return { fieldNote: pickRandom(fieldNotes.whiff) };
  }

  const namePool = names[outcome] || names.common;
  const notePool = fieldNotes[outcome] || fieldNotes.common;
  return {
    lootName: pickRandom(namePool),
    fieldNote: pickRandom(notePool),
  };
}

// ─── Streak management ───
export function computeNewStreakDay(currentStreakDay: number, lastLoginDate: string): number {
  const today = new Date().toISOString().split('T')[0];
  if (lastLoginDate === today) return currentStreakDay;

  const lastDate = new Date(lastLoginDate);
  const todayDate = new Date(today);
  const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));

  if (daysDiff === 1) {
    return Math.min(currentStreakDay + 1, 7);
  } else if (daysDiff > 1) {
    const penalty = (daysDiff - 1) * config.streak_ladder.miss_penalty_steps;
    return Math.max(1, currentStreakDay - penalty);
  }

  return currentStreakDay;
}
