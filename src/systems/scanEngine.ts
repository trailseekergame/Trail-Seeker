import gameBalance from '../config/gameBalance.json';
import { ScanType, ScanOutcome, ScanResult, GearSlotId, GearItem, SeekerScanState } from '../types';

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

    return {
      scanType,
      outcome: 'whiff',
      tileId,
      sectorProgress: 0,
      droneProc,
      bootsProc: false,
      cortexProc: false,
      opticsProc: false,
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

  // Generate loot name
  const lootName = generateLootName(outcome);

  return {
    scanType,
    outcome,
    tileId,
    sectorProgress,
    lootName,
    lootRarity: outcome,
    droneProc: false,
    bootsProc,
    cortexProc,
    opticsProc,
  };
}

function generateLootName(outcome: ScanOutcome): string | undefined {
  const names: Record<string, string[]> = {
    common: ['Scrap Bundle', 'Worn Filter', 'Rusted Bolt Set', 'Cracked Lens', 'Salvage Wire'],
    uncommon: ['Intact Module', 'Signal Booster', 'Plated Bearing', 'Charged Cell', 'Data Chip'],
    rare: ['Pre-Collapse Tech', 'Sealed Component', 'Amplifier Core', 'Encrypted Drive'],
    legendary: ['Void-Touched Relic', 'Archon Module', 'Quantum Shard', 'Zero-Point Cell'],
    component: ['Signal Fragment', 'Void Shard', 'Circuit Relic', 'Trail Cipher'],
  };

  if (outcome === 'whiff') return undefined;
  const pool = names[outcome] || names.common;
  return pool[Math.floor(Math.random() * pool.length)];
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
