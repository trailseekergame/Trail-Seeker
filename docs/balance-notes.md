# Trail Seeker — Balance Notes

> Config version: 1.2.0 | Simulation date: 2026-03-21

## Methodology

Two simulation scripts stress-tested the balance config:

1. **simulateRuns.js** — 15 daily sessions × 100 iterations per build (Gambit, Grinder, Survivor). Compares averages and auto-detects issues.
2. **deepAnalysis.js** — Edge case tests: Day 1 experience, individual gear impact, streak progression, sector pacing.

## v1.1.0 → v1.2.0 Changes

### Grip Gauntlets (Standard Tier)
- **Before:** 0.02 whiff reduction (2%) — simulation showed only 1.96 percentage point real impact
- **After:** 0.04 whiff reduction (4%) — now 3.82 percentage point impact
- **Reason:** At 2%, the gear felt invisible. Players need to feel the difference when they equip it.
- **Full tier:** Standard 0.04, Enhanced 0.06, Perfected 0.09

### Optics Rig (Standard Tier)
- **Before:** 0.02 rare boost (2%) — only +1.4% actual rare rate improvement
- **After:** 0.04 rare boost (4%) — now +3.3% actual rare rate improvement
- **Reason:** Same as Gauntlets — 2% boost was lost in noise. 4% is noticeable without being overpowered.
- **Full tier:** Standard 0.04, Enhanced 0.06, Perfected 0.09

## Simulation Results (v1.2.0)

### Build Comparison

| Metric | Gambit | Grinder | Survivor | Design Intent |
|--------|--------|---------|----------|---------------|
| Scans/Day | 6 | 7 | 7 | Grinder/Survivor get +1 from Vest |
| Tiles/Day | 9.4 | 9.95 | 8.59 | Grinder leads (Boots) |
| Whiffs/Day | 1.56 | 1.17 | 1.12 | Gambit highest (risk trade-off) |
| Rare+/Day | 2.53 | 1.19 | 1.61 | Gambit highest (reward for risk) |
| Legendary/Day | 0.51 | 0 | 0.16 | Gambit-exclusive via Cortex |
| Component/Day | 0.35 | 0 | 0.11 | Gambit → Pathfinder Module path |
| Drone Procs/Day | 0.12 | 0 | 0.09 | Safety net for whiff-heavy builds |
| Boots Procs/Day | 0 | 2.91 | 0 | Grinder sector accelerator |
| Whiff Rate | 25.9% | 16.8% | 16.1% | Clear risk gradient |

### Streak Progression (Gambit Build)

| Streak Day | Scans | Tiles/Day | Rare+/Day | Whiff Rate |
|------------|-------|-----------|-----------|------------|
| Day 1 | 4 | 5.5 | 1.2 | 30.9% |
| Day 3 | 5 | 7.4 | 1.9 | 28.0% |
| Day 5 | 6 | 9.6 | 2.6 | 24.0% |
| Day 7 | 7 | 11.5 | 3.2 | 23.5% |

Day 7 is ~2.1× better than Day 1 in tiles and ~2.7× better in rare+ drops. Streak progression feels meaningful.

### Day 1 Fresh Player (No Gear, 2 Scout + 2 Seeker)

| Metric | Value | Verdict |
|--------|-------|---------|
| Avg Tiles | 4.0 | ✅ On target |
| Avg Whiffs | 0.5 | ✅ Fair (~12.5%) |
| Avg Loot | 3.5 items | ✅ Feels complete |
| Rare Chance | ~4% | ✅ Possible but not expected |

### Sector Completion Pacing (25-tile grid)

| Player Type | Days to Clear |
|------------|---------------|
| Fresh (no gear) | ~5.2 days |
| Grinder Build | ~3.5 days |
| Gambit Build | ~4.3 days |

Targets: Fresh 5–6 days, Grinder ~3, Gambit ~3–4. All within range.

## Balance Rails (Hard Caps)

| Rail | Value | Purpose |
|------|-------|---------|
| Max Daily Scans | 10 | 5-minute ceiling |
| Max Gear Bonus Scans | +2 | Vest can't exceed this |
| Max SKR Bonus Scans | +1 | Paid convenience cap |
| Gambit Whiff Floor | 25% | Risk always present |
| Max Rare Chance Boost | +30% | Streak + Optics cap |
| Max Whiff Reduction | 15% | Gauntlets cap |

## Tuning Guidelines

When adjusting values in `gameBalance.json`:

1. **Run simulations after changes** — `node scripts/simulateRuns.js` then `node scripts/deepAnalysis.js`
2. **Gambit should always have highest rare+ and highest whiff** — if not, risk/reward is broken
3. **Grinder should always lead tiles/day** — if not, Boots or Vest is too weak
4. **Survivor should sit between Gambit and Grinder on most metrics** — the balanced option
5. **Day 1 must feel complete with 4 scans** — no more than 0.5 whiffs avg, 3+ loot items
6. **Streak Day 7 should be at least 1.5× better than Day 1** — otherwise no motivation to return
7. **Standard tier gear should be noticeable (3–5% real impact minimum)** — if simulation shows <2% real effect, bump it

## Future Tuning Considerations

- Enhanced/Perfected gear will shift power curves — re-run simulations when those become available
- SKR-purchased boosts (rare boost, whiff protection) stack with gear — watch for cap saturation
- Pathfinder Module's +5% all quality boost could compress the gap between builds — monitor
- Season reward pool math needs simulation once token distribution is designed
