/**
 * Trail Seeker — Simulation Runner
 *
 * Runs thousands of scan simulations to validate balance numbers.
 * Call runFullSimulation() from a dev button or console to get a
 * comprehensive report on whiff rates, loot distributions, gear
 * impact, and build comparisons.
 */

import gameBalance from '../config/gameBalance.json';
import { ScanType, GearSlotId, GearItem, SeekerScanState, ScanResult } from '../types';
import { resolveScan, computeDailyScans, getEffectiveWhiffRate, getStreakRareBoost } from './scanEngine';
import { ALL_GEAR_ITEMS } from '../data/gearItems';
import { generateTestSector } from '../data/testSector';

// ─── Simulation Config ───
const SIMS_PER_SCENARIO = 1000;

interface SimResult {
  scenario: string;
  totalScans: number;
  outcomes: Record<string, number>;
  whiffRate: number;
  rareOrBetter: number;
  avgSectorProgress: number;
  droneProcs: number;
  bootsProcs: number;
}

function createTestState(
  streakDay: number,
  activeGear: GearSlotId[],
): SeekerScanState {
  return {
    streakDay,
    lastLoginDate: new Date().toISOString().split('T')[0],
    scansRemaining: 10,
    scansTotal: 10,
    scansUsedToday: { scout: 0, seeker: 0, gambit: 0 },
    gearInventory: ALL_GEAR_ITEMS,
    activeGearSlots: activeGear,
    gearLockedToday: false,
    currentSector: generateTestSector(),
    sectorsCompleted: 0,
    sessionResults: [],
    sessionStartTime: Date.now(),
    pathfinderComponents: 0,
    pathfinderUnlocked: false,
    lastRefreshDate: new Date().toISOString().split('T')[0],
    shieldedNextScan: false,
    boostedNextScan: false,
    newGearIds: [],
  };
}

function simulateScans(
  scanType: ScanType,
  streakDay: number,
  activeGear: GearSlotId[],
  count: number,
): SimResult {
  const outcomes: Record<string, number> = {
    whiff: 0, common: 0, uncommon: 0, rare: 0, legendary: 0, component: 0,
  };
  let totalProgress = 0;
  let droneProcs = 0;
  let bootsProcs = 0;

  for (let i = 0; i < count; i++) {
    const state = createTestState(streakDay, activeGear);
    const tileId = 'tile-1-1'; // dummy
    const result = resolveScan(scanType, tileId, state);
    outcomes[result.outcome]++;
    totalProgress += result.sectorProgress;
    if (result.droneProc) droneProcs++;
    if (result.bootsProc) bootsProcs++;
  }

  const whiffs = outcomes.whiff || 0;
  const rareOrBetter = (outcomes.rare || 0) + (outcomes.legendary || 0) + (outcomes.component || 0);

  return {
    scenario: `${scanType.toUpperCase()} | Day ${streakDay} | Gear: ${activeGear.join(',')}`,
    totalScans: count,
    outcomes,
    whiffRate: Math.round((whiffs / count) * 1000) / 10,
    rareOrBetter: Math.round((rareOrBetter / count) * 1000) / 10,
    avgSectorProgress: Math.round((totalProgress / count) * 100) / 100,
    droneProcs,
    bootsProcs,
  };
}

// ─── Build Definitions ───
const GAMBIT_BUILD: GearSlotId[] = ['grip_gauntlets', 'cortex_link', 'salvage_drone'];
const GRINDER_BUILD: GearSlotId[] = ['optics_rig', 'exo_vest', 'nav_boots'];
const SURVIVOR_BUILD: GearSlotId[] = ['exo_vest', 'grip_gauntlets', 'salvage_drone'];
const NO_GEAR: GearSlotId[] = [];

// ─── Main Simulation ───
export function runFullSimulation(): string {
  const lines: string[] = [];
  const hr = '═'.repeat(60);

  lines.push(hr);
  lines.push('  TRAIL SEEKER — FULL SIMULATION REPORT');
  lines.push(`  ${SIMS_PER_SCENARIO} scans per scenario`);
  lines.push(hr);

  // ── 1. Whiff Rates by Scan Type & Streak ──
  lines.push('');
  lines.push('── WHIFF RATES (no gear) ──');
  lines.push('Scan Type  | Day 1  | Day 3  | Day 5  | Day 7');
  lines.push('-'.repeat(50));

  for (const scanType of ['scout', 'seeker', 'gambit'] as ScanType[]) {
    const rates = [1, 3, 5, 7].map(day => {
      const r = simulateScans(scanType, day, NO_GEAR, SIMS_PER_SCENARIO);
      return `${r.whiffRate}%`.padStart(6);
    });
    lines.push(`${scanType.padEnd(10)} | ${rates.join(' | ')}`);
  }

  // ── 2. Whiff Rates with Gambit Build ──
  lines.push('');
  lines.push('── GAMBIT WHIFF RATES (with Gambit Build: Gauntlets+Cortex+Drone) ──');
  for (const day of [1, 3, 5, 7]) {
    const r = simulateScans('gambit', day, GAMBIT_BUILD, SIMS_PER_SCENARIO);
    lines.push(`Day ${day}: ${r.whiffRate}% whiff | ${r.rareOrBetter}% rare+ | Drone saves: ${r.droneProcs}`);
  }

  // ── 3. Loot Distribution by Scan Type ──
  lines.push('');
  lines.push('── LOOT DISTRIBUTION (Day 5, no gear, per 1000 scans) ──');
  for (const scanType of ['scout', 'seeker', 'gambit'] as ScanType[]) {
    const r = simulateScans(scanType, 5, NO_GEAR, SIMS_PER_SCENARIO);
    const o = r.outcomes;
    lines.push(
      `${scanType.toUpperCase().padEnd(8)}: ` +
      `Whiff ${o.whiff} | Common ${o.common} | Uncommon ${o.uncommon} | ` +
      `Rare ${o.rare} | Legendary ${o.legendary} | Component ${o.component}`
    );
  }

  // ── 4. Build Comparisons at Day 7 ──
  lines.push('');
  lines.push('── BUILD COMPARISON (Day 7, 1000 Gambit scans each) ──');

  const builds = [
    { name: 'No Gear', gear: NO_GEAR },
    { name: 'Gambit Build', gear: GAMBIT_BUILD },
    { name: 'Grinder Build', gear: GRINDER_BUILD },
    { name: 'Survivor Build', gear: SURVIVOR_BUILD },
  ];

  for (const build of builds) {
    const r = simulateScans('gambit', 7, build.gear, SIMS_PER_SCENARIO);
    lines.push(
      `${build.name.padEnd(16)}: ${r.whiffRate}% whiff | ${r.rareOrBetter}% rare+ | ` +
      `Avg progress: ${r.avgSectorProgress} | Drone: ${r.droneProcs} | Boots: ${r.bootsProcs}`
    );
  }

  // ── 5. Daily Session Simulations ──
  lines.push('');
  lines.push('── DAILY SESSION SIMULATION (Day 7) ──');

  for (const build of builds) {
    const scansTotal = computeDailyScans(7, build.gear, ALL_GEAR_ITEMS);
    const rareBoost = getStreakRareBoost(7);

    // Simulate a mixed day: 1 Scout, half Seeker, rest Gambit
    const scoutCount = 1;
    const gambitCount = Math.floor((scansTotal - 1) / 2);
    const seekerCount = scansTotal - 1 - gambitCount;

    const scoutR = simulateScans('scout', 7, build.gear, scoutCount * 100);
    const seekerR = simulateScans('seeker', 7, build.gear, seekerCount * 100);
    const gambitR = simulateScans('gambit', 7, build.gear, gambitCount * 100);

    const totalWhiffs = Math.round(
      (scoutR.whiffRate / 100 * scoutCount) +
      (seekerR.whiffRate / 100 * seekerCount) +
      (gambitR.whiffRate / 100 * gambitCount)
    );

    lines.push(
      `${build.name.padEnd(16)}: ${scansTotal} scans (${scoutCount}S/${seekerCount}K/${gambitCount}G) | ` +
      `~${totalWhiffs} whiffs | Rare boost: +${Math.round(rareBoost * 100)}%`
    );
  }

  // ── 6. Sector Progress Comparison ──
  lines.push('');
  lines.push('── SECTOR PROGRESS (Day 7, 1000 Seeker scans) ──');
  for (const build of builds) {
    const r = simulateScans('seeker', 7, build.gear, SIMS_PER_SCENARIO);
    lines.push(`${build.name.padEnd(16)}: Avg ${r.avgSectorProgress} tiles/scan | Boots procs: ${r.bootsProcs}`);
  }

  // ── 7. Effective Whiff Rates (calculated, not simulated) ──
  lines.push('');
  lines.push('── CALCULATED EFFECTIVE WHIFF RATES ──');
  for (const build of builds) {
    lines.push(`${build.name}:`);
    for (const scanType of ['scout', 'seeker', 'gambit'] as ScanType[]) {
      for (const day of [1, 3, 5, 7]) {
        const rate = getEffectiveWhiffRate(scanType, day, build.gear, ALL_GEAR_ITEMS);
        lines.push(`  ${scanType.padEnd(8)} Day ${day}: ${Math.round(rate * 100)}%`);
      }
    }
  }

  lines.push('');
  lines.push(hr);
  lines.push('  Simulation complete.');
  lines.push(hr);

  const report = lines.join('\n');
  // console.log(report);
  return report;
}
