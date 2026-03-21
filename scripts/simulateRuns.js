#!/usr/bin/env node
/**
 * Trail Seeker — Build Simulation Script
 *
 * Simulates 15 full daily sessions for each of the 3 canonical builds,
 * across streak days 1-7, and outputs detailed balance analysis.
 *
 * Usage:  node scripts/simulateRuns.js
 * Or:     npm run simulate:runs
 */

const config = require('../src/config/gameBalance.json');
const rails = config.balance_rails;

// ─── Constants ───
const DAYS_TO_SIMULATE = 15; // 15 daily sessions per build
const SCANS_PER_RUN = 500;   // scans per scenario for statistical stability

// ─── Gear Definitions ───
const GEAR_STATS = config.gear_stats;

// ─── Build Definitions ───
const BUILDS = {
  gambit: {
    name: 'Gambit Build',
    gear: ['grip_gauntlets', 'cortex_link', 'salvage_drone'],
    // Allocation: 0 Scout, 1 Seeker, rest Gambit
    allocate: (total) => ({ scout: 0, seeker: Math.min(1, total), gambit: Math.max(0, total - 1) }),
  },
  grinder: {
    name: 'Grinder Build',
    gear: ['optics_rig', 'exo_vest', 'nav_boots'],
    // Allocation: 2 Scout, rest Seeker, 0 Gambit
    allocate: (total) => ({ scout: Math.min(2, total), seeker: Math.max(0, total - 2), gambit: 0 }),
  },
  survivor: {
    name: 'Survivor Build',
    gear: ['exo_vest', 'grip_gauntlets', 'salvage_drone'],
    // Allocation: 1 Scout, half Seeker, half Gambit (rounded)
    allocate: (total) => {
      const scout = 1;
      const remaining = total - scout;
      const gambit = Math.floor(remaining / 3);
      const seeker = remaining - gambit;
      return { scout, seeker, gambit };
    },
  },
};

// ─── Scan Engine (mirrors src/systems/scanEngine.ts) ───

function getWhiffRate(scanType, streakDay, activeGear) {
  const tier = config.risk_tiers[scanType];
  let rate = tier.whiff_rate;

  // Streak reduces Gambit whiff
  if (scanType === 'gambit') {
    const streakReduction = streakDay >= 7 ? 0.15 : streakDay >= 5 ? 0.10 : streakDay >= 3 ? 0.05 : 0;
    rate -= streakReduction;
  }

  // Grip Gauntlets
  if (activeGear.includes('grip_gauntlets')) {
    rate -= GEAR_STATS.grip_gauntlets.standard.whiff_reduction;
  }

  // Apply floor
  if (scanType === 'gambit') {
    rate = Math.max(rate, rails.gambit_whiff_floor);
  }

  return Math.max(0, rate);
}

function computeDailyScans(streakDay, activeGear) {
  const base = config.streak_ladder.base_scans;
  const bonus = config.streak_ladder.bonus_by_day[Math.min(streakDay, 7)] || 0;
  let gearBonus = 0;
  if (activeGear.includes('exo_vest')) {
    gearBonus = Math.min(GEAR_STATS.exo_vest.standard.bonus_scans || 0, rails.max_gear_bonus_scans);
  }
  return Math.min(base + bonus + gearBonus, rails.max_daily_scans);
}

function resolveScan(scanType, streakDay, activeGear) {
  const whiffRate = getWhiffRate(scanType, streakDay, activeGear);
  const tier = config.risk_tiers[scanType];
  const streakRareBoost = config.streak_ladder.rare_boost_by_day[Math.min(streakDay, 7)] || 0;

  // Gear bonuses
  const hasOptics = activeGear.includes('optics_rig');
  const hasCortex = activeGear.includes('cortex_link');
  const hasDrone = activeGear.includes('salvage_drone');
  const hasBoots = activeGear.includes('nav_boots');

  const opticsBoost = hasOptics ? (GEAR_STATS.optics_rig.standard.rare_boost || 0) : 0;
  const cortexBoost = (hasCortex && scanType === 'gambit') ? (GEAR_STATS.cortex_link.standard.gambit_legendary_boost || 0) : 0;
  const droneChance = hasDrone ? (GEAR_STATS.salvage_drone.standard.refund_chance || 0) : 0;
  const bootsBonus = hasBoots ? (GEAR_STATS.nav_boots.standard.sector_bonus || 0) : 0;

  // Roll whiff
  if (Math.random() < whiffRate) {
    const droneProc = Math.random() < droneChance;
    return { outcome: 'whiff', progress: 0, droneProc, bootsProc: false };
  }

  // Sector progress
  let progress = tier.sector_progress.base;
  if (tier.sector_progress.bonus_chance && Math.random() < tier.sector_progress.bonus_chance) progress++;
  let bootsProc = false;
  if (bootsBonus >= 1) { progress += Math.floor(bootsBonus); bootsProc = true; }
  else if (bootsBonus > 0 && Math.random() < bootsBonus) { progress++; bootsProc = true; }

  // Component check (Gambit only)
  const componentChance = (tier.component_chance || 0) + (hasCortex ? (GEAR_STATS.cortex_link.standard.component_boost || 0) : 0);
  if (scanType === 'gambit' && Math.random() < componentChance) {
    return { outcome: 'component', progress, droneProc: false, bootsProc };
  }

  // Loot roll
  const lootTable = { ...tier.loot_table };
  const totalBoost = Math.min(streakRareBoost + opticsBoost, rails.max_rare_chance_boost);
  if (totalBoost > 0 && lootTable.rare !== undefined) {
    lootTable.rare = (lootTable.rare || 0) + totalBoost;
    lootTable.common = Math.max(0, (lootTable.common || 0) - totalBoost);
  }
  if (cortexBoost > 0 && lootTable.legendary !== undefined) {
    lootTable.legendary = (lootTable.legendary || 0) + cortexBoost;
    lootTable.uncommon = Math.max(0, (lootTable.uncommon || 0) - cortexBoost);
  }

  const roll = Math.random();
  let cum = 0;
  let outcome = 'common';
  for (const [t, chance] of Object.entries(lootTable)) {
    cum += chance;
    if (roll < cum) { outcome = t; break; }
  }

  return { outcome, progress, droneProc: false, bootsProc };
}

// ─── Simulation Runner ───

function simulateDay(buildKey, streakDay) {
  const build = BUILDS[buildKey];
  const totalScans = computeDailyScans(streakDay, build.gear);
  const alloc = build.allocate(totalScans);

  const results = {
    totalScans,
    scansUsed: { scout: alloc.scout, seeker: alloc.seeker, gambit: alloc.gambit },
    outcomes: { whiff: 0, common: 0, uncommon: 0, rare: 0, legendary: 0, component: 0 },
    tilesCleared: 0,
    droneProcs: 0,
    bootsProcs: 0,
    gambitSuccesses: 0,
    gambitAttempts: alloc.gambit,
  };

  const scanTypes = [];
  for (let i = 0; i < alloc.scout; i++) scanTypes.push('scout');
  for (let i = 0; i < alloc.seeker; i++) scanTypes.push('seeker');
  for (let i = 0; i < alloc.gambit; i++) scanTypes.push('gambit');

  for (const scanType of scanTypes) {
    const r = resolveScan(scanType, streakDay, build.gear);
    results.outcomes[r.outcome]++;
    results.tilesCleared += r.progress;
    if (r.droneProc) results.droneProcs++;
    if (r.bootsProc) results.bootsProcs++;
    if (scanType === 'gambit' && r.outcome !== 'whiff') results.gambitSuccesses++;
  }

  return results;
}

function runBuildSimulation(buildKey) {
  const totals = {
    days: 0,
    scans: 0,
    tiles: 0,
    outcomes: { whiff: 0, common: 0, uncommon: 0, rare: 0, legendary: 0, component: 0 },
    droneProcs: 0,
    bootsProcs: 0,
    gambitSuccesses: 0,
    gambitAttempts: 0,
    scansByDay: {},
  };

  // Simulate 15 days with streak ramping up: Day 1,1,2,3,3,4,5,5,6,7,7,7,7,7,7
  const streakProgression = [1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 7, 7, 7, 7];

  for (let d = 0; d < DAYS_TO_SIMULATE; d++) {
    const streakDay = streakProgression[d];
    // Run multiple iterations of each day for statistical stability
    const ITERS = 100;
    for (let iter = 0; iter < ITERS; iter++) {
      const day = simulateDay(buildKey, streakDay);
      totals.days++;
      totals.scans += day.totalScans;
      totals.tiles += day.tilesCleared;
      for (const [k, v] of Object.entries(day.outcomes)) totals.outcomes[k] += v;
      totals.droneProcs += day.droneProcs;
      totals.bootsProcs += day.bootsProcs;
      totals.gambitSuccesses += day.gambitSuccesses;
      totals.gambitAttempts += day.gambitAttempts;
    }

    if (!totals.scansByDay[streakDay]) totals.scansByDay[streakDay] = { count: 0, tiles: 0 };
    // Single representative day for per-streak stats
    const repDay = simulateDay(buildKey, streakDay);
    totals.scansByDay[streakDay].count++;
    totals.scansByDay[streakDay].tiles += repDay.tilesCleared;
  }

  // Compute averages (per simulated day)
  const n = totals.days;
  return {
    build: BUILDS[buildKey].name,
    gear: BUILDS[buildKey].gear,
    totalDays: n,
    avgScansPerDay: round(totals.scans / n),
    avgTilesPerDay: round(totals.tiles / n),
    avgWhiffsPerDay: round(totals.outcomes.whiff / n),
    avgCommon: round(totals.outcomes.common / n),
    avgUncommon: round(totals.outcomes.uncommon / n),
    avgRare: round(totals.outcomes.rare / n),
    avgLegendary: round(totals.outcomes.legendary / n),
    avgComponent: round(totals.outcomes.component / n),
    avgRarePlus: round((totals.outcomes.rare + totals.outcomes.legendary + totals.outcomes.component) / n),
    avgDroneProcs: round(totals.droneProcs / n),
    avgBootsProcs: round(totals.bootsProcs / n),
    gambitSuccessRate: totals.gambitAttempts > 0 ? round(totals.gambitSuccesses / totals.gambitAttempts * 100) : 0,
    whiffRate: round(totals.outcomes.whiff / totals.scans * 100),
  };
}

function round(n) { return Math.round(n * 100) / 100; }

// ─── Main ───

function main() {
  const hr = '='.repeat(70);
  console.log(hr);
  console.log('  TRAIL SEEKER — BUILD SIMULATION (15 days x 100 iterations each)');
  console.log('  Config version: ' + config.version);
  console.log(hr);

  const results = {};

  for (const buildKey of Object.keys(BUILDS)) {
    const r = runBuildSimulation(buildKey);
    results[buildKey] = r;

    console.log('\n' + '-'.repeat(70));
    console.log('  ' + r.build + ' [' + r.gear.join(', ') + ']');
    console.log('-'.repeat(70));
    console.log('  Avg Scans/Day:      ' + r.avgScansPerDay);
    console.log('  Avg Tiles/Day:      ' + r.avgTilesPerDay);
    console.log('  Avg Whiffs/Day:     ' + r.avgWhiffsPerDay + ' (' + r.whiffRate + '% overall whiff rate)');
    console.log('  Avg Common/Day:     ' + r.avgCommon);
    console.log('  Avg Uncommon/Day:   ' + r.avgUncommon);
    console.log('  Avg Rare/Day:       ' + r.avgRare);
    console.log('  Avg Legendary/Day:  ' + r.avgLegendary);
    console.log('  Avg Component/Day:  ' + r.avgComponent);
    console.log('  Avg Rare+/Day:      ' + r.avgRarePlus);
    console.log('  Drone Procs/Day:    ' + r.avgDroneProcs);
    console.log('  Boots Procs/Day:    ' + r.avgBootsProcs);
    console.log('  Gambit Success Rate: ' + r.gambitSuccessRate + '%');
  }

  // ─── Comparative Analysis ───
  console.log('\n' + hr);
  console.log('  COMPARATIVE ANALYSIS');
  console.log(hr);

  const g = results.gambit;
  const gr = results.grinder;
  const s = results.survivor;

  console.log('\n  Metric              | Gambit  | Grinder | Survivor | Target');
  console.log('  ' + '-'.repeat(62));
  console.log('  Scans/Day           | ' + pad(g.avgScansPerDay) + ' | ' + pad(gr.avgScansPerDay) + ' | ' + pad(s.avgScansPerDay) + ' | Grinder highest');
  console.log('  Tiles/Day           | ' + pad(g.avgTilesPerDay) + ' | ' + pad(gr.avgTilesPerDay) + ' | ' + pad(s.avgTilesPerDay) + ' | Grinder highest');
  console.log('  Whiffs/Day          | ' + pad(g.avgWhiffsPerDay) + ' | ' + pad(gr.avgWhiffsPerDay) + ' | ' + pad(s.avgWhiffsPerDay) + ' | Gambit highest');
  console.log('  Rare+/Day           | ' + pad(g.avgRarePlus) + ' | ' + pad(gr.avgRarePlus) + ' | ' + pad(s.avgRarePlus) + ' | Gambit highest');
  console.log('  Legendary/Day       | ' + pad(g.avgLegendary) + ' | ' + pad(gr.avgLegendary) + ' | ' + pad(s.avgLegendary) + ' | Gambit highest');
  console.log('  Component/Day       | ' + pad(g.avgComponent) + ' | ' + pad(gr.avgComponent) + ' | ' + pad(s.avgComponent) + ' | Gambit only');
  console.log('  Drone Procs/Day     | ' + pad(g.avgDroneProcs) + ' | ' + pad(gr.avgDroneProcs) + ' | ' + pad(s.avgDroneProcs) + ' | Gambit/Surv only');
  console.log('  Boots Procs/Day     | ' + pad(g.avgBootsProcs) + ' | ' + pad(gr.avgBootsProcs) + ' | ' + pad(s.avgBootsProcs) + ' | Grinder only');
  console.log('  Whiff Rate          | ' + pad(g.whiffRate + '%') + ' | ' + pad(gr.whiffRate + '%') + ' | ' + pad(s.whiffRate + '%') + ' |');

  // ─── Identify Balance Issues ───
  console.log('\n' + hr);
  console.log('  BALANCE ISSUES DETECTED');
  console.log(hr);

  const issues = [];

  // 1. Gambit should have more rare+ than Grinder
  if (g.avgRarePlus <= gr.avgRarePlus) {
    issues.push('ISSUE: Gambit build has fewer rare+ (' + g.avgRarePlus + ') than Grinder (' + gr.avgRarePlus + '). Gambit risk not rewarded enough.');
  }

  // 2. Gambit should have significantly more Legendary than others
  if (g.avgLegendary < gr.avgLegendary * 2) {
    issues.push('ISSUE: Gambit Legendary rate (' + g.avgLegendary + ') not clearly higher than Grinder (' + gr.avgLegendary + '). Cortex Link too weak?');
  }

  // 3. Grinder should have more tiles than Gambit
  if (gr.avgTilesPerDay <= g.avgTilesPerDay) {
    issues.push('ISSUE: Grinder tiles/day (' + gr.avgTilesPerDay + ') not higher than Gambit (' + g.avgTilesPerDay + '). Nav Boots too weak?');
  }

  // 4. Survivor should be between Gambit and Grinder on whiff rate
  if (s.whiffRate >= g.whiffRate) {
    issues.push('ISSUE: Survivor whiff rate (' + s.whiffRate + '%) not lower than Gambit (' + g.whiffRate + '%). Gauntlets not felt in Survivor.');
  }

  // 5. Survivor too similar to Grinder
  if (Math.abs(s.avgRarePlus - gr.avgRarePlus) < 0.1 && Math.abs(s.avgTilesPerDay - gr.avgTilesPerDay) < 0.5) {
    issues.push('ISSUE: Survivor nearly identical to Grinder. Needs more distinct identity.');
  }

  // 6. Streak impact too small
  const day1Sim = simulateDay('gambit', 1);
  const day7Sim = simulateDay('gambit', 7);
  // Run multiple for stability
  let d1Tiles = 0, d7Tiles = 0;
  for (let i = 0; i < 500; i++) {
    d1Tiles += simulateDay('gambit', 1).tilesCleared;
    d7Tiles += simulateDay('gambit', 7).tilesCleared;
  }
  const streakImpact = (d7Tiles / 500) / (d1Tiles / 500);
  if (streakImpact < 1.3) {
    issues.push('ISSUE: Day 7 only ' + round(streakImpact) + 'x better than Day 1 for tiles. Streak impact may be too subtle.');
  }

  if (issues.length === 0) {
    console.log('  No major balance issues detected. Builds feel distinct.');
  } else {
    issues.forEach((issue, i) => console.log('  ' + (i + 1) + '. ' + issue));
  }

  console.log('\n' + hr);
  console.log('  END OF SIMULATION');
  console.log(hr);

  // Return results for programmatic use
  return { results, issues };
}

function pad(val) {
  return String(val).padStart(7);
}

main();
