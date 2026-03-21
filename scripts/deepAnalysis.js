#!/usr/bin/env node
/**
 * Trail Seeker — Deep Balance Analysis
 * Runs focused edge-case checks the main simulation doesn't cover.
 */

const config = require('../src/config/gameBalance.json');
const rails = config.balance_rails;
const GEAR_STATS = config.gear_stats;

function round(n) { return Math.round(n * 1000) / 1000; }

// Quick scan resolver (same as main sim)
function resolveScan(scanType, streakDay, activeGear) {
  const tier = config.risk_tiers[scanType];
  let whiffRate = tier.whiff_rate;
  if (scanType === 'gambit') {
    const streakReduction = streakDay >= 7 ? 0.15 : streakDay >= 5 ? 0.10 : streakDay >= 3 ? 0.05 : 0;
    whiffRate -= streakReduction;
  }
  if (activeGear.includes('grip_gauntlets')) {
    whiffRate -= GEAR_STATS.grip_gauntlets.standard.whiff_reduction;
  }
  if (scanType === 'gambit') whiffRate = Math.max(whiffRate, rails.gambit_whiff_floor);
  whiffRate = Math.max(0, whiffRate);

  if (Math.random() < whiffRate) {
    const droneChance = activeGear.includes('salvage_drone') ? GEAR_STATS.salvage_drone.standard.refund_chance : 0;
    return { outcome: 'whiff', progress: 0, droneProc: Math.random() < droneChance };
  }

  let progress = tier.sector_progress.base;
  if (tier.sector_progress.bonus_chance && Math.random() < tier.sector_progress.bonus_chance) progress++;
  const bootsBonus = activeGear.includes('nav_boots') ? (GEAR_STATS.nav_boots.standard.sector_bonus || 0) : 0;
  if (bootsBonus >= 1) progress += Math.floor(bootsBonus);
  else if (bootsBonus > 0 && Math.random() < bootsBonus) progress++;

  const streakRareBoost = config.streak_ladder.rare_boost_by_day[Math.min(streakDay, 7)] || 0;
  const opticsBoost = activeGear.includes('optics_rig') ? (GEAR_STATS.optics_rig.standard.rare_boost || 0) : 0;
  const cortexBoost = (activeGear.includes('cortex_link') && scanType === 'gambit') ? (GEAR_STATS.cortex_link.standard.gambit_legendary_boost || 0) : 0;

  const componentChance = (tier.component_chance || 0) + (activeGear.includes('cortex_link') ? (GEAR_STATS.cortex_link.standard.component_boost || 0) : 0);
  if (scanType === 'gambit' && Math.random() < componentChance) {
    return { outcome: 'component', progress };
  }

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
  return { outcome, progress };
}

const hr = '='.repeat(70);
const N = 10000;

// ─── Test 1: Day 1 Experience (No Gear, No Streak) ───
console.log(hr);
console.log('  TEST 1: DAY 1 EXPERIENCE — Fresh Player, No Gear');
console.log(hr);
{
  const baseScans = config.streak_ladder.base_scans; // 4
  const outcomes = { whiff: 0, common: 0, uncommon: 0, rare: 0, legendary: 0, component: 0 };
  let totalTiles = 0;
  // 4 scans, assume new player does 2 Scout + 2 Seeker
  for (let i = 0; i < N; i++) {
    for (let s = 0; s < 2; s++) {
      const r = resolveScan('scout', 1, []);
      outcomes[r.outcome]++;
      totalTiles += r.progress;
    }
    for (let s = 0; s < 2; s++) {
      const r = resolveScan('seeker', 1, []);
      outcomes[r.outcome]++;
      totalTiles += r.progress;
    }
  }
  const totalScans = N * 4;
  console.log('  Scans: 4 (2 Scout, 2 Seeker)');
  console.log('  Avg Tiles: ' + round(totalTiles / N));
  console.log('  Whiff Rate: ' + round(outcomes.whiff / totalScans * 100) + '%');
  console.log('  % Sessions with 0+ Rare: ~' + round((1 - Math.pow(0.9, 2)) * 100) + '% (theoretical, 2 Seeker scans @ 10%)');
  console.log('  Outcomes over ' + N + ' days:');
  for (const [k, v] of Object.entries(outcomes)) {
    console.log('    ' + k + ': ' + round(v / N) + '/day (' + round(v / totalScans * 100) + '%)');
  }
  
  // Check: Is Day 1 satisfying?
  const avgLoot = round((outcomes.common + outcomes.uncommon + outcomes.rare + outcomes.legendary) / N);
  const avgWhiffs = round(outcomes.whiff / N);
  console.log('\n  VERDICT:');
  console.log('  Avg loot/day: ' + avgLoot + ', Avg whiffs: ' + avgWhiffs + ', Avg tiles: ' + round(totalTiles / N));
  if (avgWhiffs > 1) {
    console.log('  ⚠️  Day 1 feels punishing — over 1 whiff avg on only 4 scans');
  } else {
    console.log('  ✅ Day 1 feels fair — ' + avgWhiffs + ' whiffs on 4 scans');
  }
  if (round(totalTiles / N) < 3) {
    console.log('  ⚠️  Low tile progress — player may not feel sector advancement');
  } else {
    console.log('  ✅ Tile progress ok for Day 1');
  }
}

// ─── Test 2: Grip Gauntlets Impact ───
console.log('\n' + hr);
console.log('  TEST 2: GRIP GAUNTLETS IMPACT (Standard Tier)');
console.log(hr);
{
  // Test gambit whiff rate with and without gauntlets
  let whiffsNoGear = 0, whiffsWithGear = 0;
  for (let i = 0; i < N * 10; i++) {
    if (resolveScan('gambit', 3, []).outcome === 'whiff') whiffsNoGear++;
    if (resolveScan('gambit', 3, ['grip_gauntlets']).outcome === 'whiff') whiffsWithGear++;
  }
  const rateNo = round(whiffsNoGear / (N * 10) * 100);
  const rateWith = round(whiffsWithGear / (N * 10) * 100);
  console.log('  Gambit Whiff at Streak 3:');
  console.log('    Without Gauntlets: ' + rateNo + '%');
  console.log('    With Gauntlets:    ' + rateWith + '%');
  console.log('    Reduction:         ' + round(rateNo - rateWith) + ' percentage points');
  console.log('    Config value:      ' + (GEAR_STATS.grip_gauntlets.standard.whiff_reduction * 100) + '% reduction');
  
  if (rateNo - rateWith < 2) {
    console.log('  ⚠️  Gauntlets barely noticeable at Standard tier — 2% reduction is too subtle');
    console.log('     RECOMMENDATION: Bump to 0.04 (4%) for Standard tier');
  } else {
    console.log('  ✅ Gauntlets feel impactful');
  }
}

// ─── Test 3: Streak Day 1 vs Day 7 Detailed ───
console.log('\n' + hr);
console.log('  TEST 3: STREAK IMPACT DAY 1 vs DAY 7');
console.log(hr);
{
  // Same build (gambit), day 1 vs day 7
  const gear = ['grip_gauntlets', 'cortex_link', 'salvage_drone'];
  
  for (const day of [1, 3, 5, 7]) {
    const scans = config.streak_ladder.base_scans + (config.streak_ladder.bonus_by_day[day] || 0);
    let tiles = 0, rares = 0, whiffs = 0, legendaries = 0;
    for (let i = 0; i < N; i++) {
      for (let s = 0; s < scans; s++) {
        const scanType = s === 0 ? 'seeker' : 'gambit';
        const r = resolveScan(scanType, day, gear);
        tiles += r.progress;
        if (r.outcome === 'rare' || r.outcome === 'legendary' || r.outcome === 'component') rares++;
        if (r.outcome === 'legendary') legendaries++;
        if (r.outcome === 'whiff') whiffs++;
      }
    }
    console.log('  Streak Day ' + day + ' (' + scans + ' scans):');
    console.log('    Tiles/day: ' + round(tiles / N));
    console.log('    Rare+/day: ' + round(rares / N));
    console.log('    Legend/day: ' + round(legendaries / N));
    console.log('    Whiffs/day: ' + round(whiffs / N) + ' (' + round(whiffs / (N * scans) * 100) + '%)');
    console.log('');
  }
}

// ─── Test 4: Drone Refund Actual Impact ───
console.log(hr);
console.log('  TEST 4: SALVAGE DRONE STANDARD — Is 8% Refund Noticeable?');
console.log(hr);
{
  let totalWhiffs = 0, droneProcs = 0;
  for (let i = 0; i < N * 10; i++) {
    const r = resolveScan('gambit', 3, ['salvage_drone']);
    if (r.outcome === 'whiff') {
      totalWhiffs++;
      if (r.droneProc) droneProcs++;
    }
  }
  console.log('  Total Whiffs: ' + totalWhiffs + ' / ' + (N * 10) + ' scans');
  console.log('  Drone Procs:  ' + droneProcs + ' (' + round(droneProcs / totalWhiffs * 100) + '% of whiffs)');
  console.log('  Net impact:   ~' + round(droneProcs / (N * 10) * 100) + '% of all scans refunded');
  if (droneProcs / totalWhiffs * 100 < 6) {
    console.log('  ⚠️  8% on whiffs only means ~2-3% of total scans — barely felt');
  } else {
    console.log('  ✅ Drone feels reasonable at Standard');
  }
}

// ─── Test 5: Optics Rig Rare Boost ───
console.log('\n' + hr);
console.log('  TEST 5: OPTICS RIG — 2% Rare Boost Impact');
console.log(hr);
{
  let raresWithout = 0, raresWith = 0;
  for (let i = 0; i < N * 10; i++) {
    const r1 = resolveScan('seeker', 5, []);
    const r2 = resolveScan('seeker', 5, ['optics_rig']);
    if (r1.outcome === 'rare') raresWithout++;
    if (r2.outcome === 'rare') raresWith++;
  }
  console.log('  Seeker Rare Rate (Streak 5):');
  console.log('    Without Optics: ' + round(raresWithout / (N * 10) * 100) + '%');
  console.log('    With Optics:    ' + round(raresWith / (N * 10) * 100) + '%');
  console.log('    Config boost:   +' + (GEAR_STATS.optics_rig.standard.rare_boost * 100) + '%');
  if (raresWith / (N * 10) * 100 - raresWithout / (N * 10) * 100 < 1.5) {
    console.log('  ⚠️  2% rare boost barely registers — hard for player to feel');
  }
}

// ─── Test 6: Sector Completion Pacing ───
console.log('\n' + hr);
console.log('  TEST 6: SECTOR COMPLETION PACING — 5x5 Grid = 25 Tiles');
console.log(hr);
{
  const sectorSize = 25;
  for (const [name, gear, scanAlloc] of [
    ['Fresh Player (no gear)', [], { scout: 2, seeker: 2, gambit: 0 }],
    ['Grinder Build', ['optics_rig', 'exo_vest', 'nav_boots'], { scout: 2, seeker: 5, gambit: 0 }],
    ['Gambit Build', ['grip_gauntlets', 'cortex_link', 'salvage_drone'], { scout: 0, seeker: 1, gambit: 6 }],
  ]) {
    let totalDays = 0;
    for (let i = 0; i < N; i++) {
      let tilesCleared = 0;
      let day = 0;
      while (tilesCleared < sectorSize) {
        day++;
        const streakDay = Math.min(day, 7);
        const scans = config.streak_ladder.base_scans + (config.streak_ladder.bonus_by_day[streakDay] || 0) +
          (gear.includes('exo_vest') ? Math.min(GEAR_STATS.exo_vest.standard.bonus_scans, rails.max_gear_bonus_scans) : 0);
        const types = [];
        let remaining = Math.min(scans, rails.max_daily_scans);
        for (let s = 0; s < Math.min(scanAlloc.scout, remaining); s++) { types.push('scout'); remaining--; }
        for (let s = 0; s < Math.min(scanAlloc.gambit, remaining); s++) { types.push('gambit'); remaining--; }
        for (let s = 0; s < remaining; s++) types.push('seeker');
        
        for (const t of types) {
          const r = resolveScan(t, streakDay, gear);
          tilesCleared += r.progress;
        }
      }
      totalDays += day;
    }
    console.log('  ' + name + ': ~' + round(totalDays / N) + ' days to clear 25-tile sector');
  }
  console.log('\n  TARGET: Fresh player ~5-6 days, Grinder ~3 days, Gambit ~3-4 days');
}

console.log('\n' + hr);
console.log('  END OF DEEP ANALYSIS');
console.log(hr);
