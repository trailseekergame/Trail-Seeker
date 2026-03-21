# Trail Seeker — Core Loop Status

> Last updated: 2026-03-21 | Config version: 1.2.0 | Balance review: 2026-03-21

## System Status

| System | Status | Notes |
|--------|--------|-------|
| Seeker Scans (Scout/Seeker/Gambit) | ✅ Live | Engine + UI wired |
| Streak Ladder (Day 1–7 progression) | ✅ Live | Bonus scans + rare boost |
| Gear System (6 slots, 3 tiers) | ✅ Live | Equip, lock, effects applied |
| Sector Grid (5×5 tile clearing) | ✅ Live | Progress tracked per scan |
| Sector Completion Rewards | ✅ Live | Escalating scrap bonus on clear |
| Pathfinder Component Drops | ✅ Live | Gambit → component → 4/4 unlocks module |
| Pathfinder Module UI | ✅ Live | Progress dots on Daily Plan screen |
| Daily Plan State Refresh | ✅ Live | Date-guarded, no mid-session resets |
| Risk Tier Labels (SAFE/RISKY/RECKLESS) | ✅ Live | Badges on event choices |
| Scan Result Logging | ✅ Live | sessionLogger.ts console output |
| $SKR Economy (50/50 burn+pool) | ✅ Live | solana.ts spendSkr() |
| Push Notifications | ✅ Live | Streak reminders, scan refresh |
| Dev Analytics + Weekly Email | ✅ Live | analytics.ts → trailseekergame@gmail.com |
| Trail Flier Arcade | ✅ Live | 5 tiers, per-obstacle rewards, milestones |
| Simulation Scripts | ✅ Live | scripts/simulateRuns.js + deepAnalysis.js |
| Unified Equipment Screen | ✅ Live | Gear stats + cosmetics merged |
| TypewriterText + SkillCheck | ✅ Live | Interaction depth for encounters + scans |
| Scan Resolution Animation | ✅ Live | Risk-paced, Gambit shake effect |
| Grid Path Connectors | ✅ Live | Visual lines between cleared/scannable tiles |

## Files Map

### Config
- `src/config/gameBalance.json` — All tunable balance numbers

### Systems
- `src/systems/scanEngine.ts` — Scan resolution (whiff, loot, progress)
- `src/systems/sessionLogger.ts` — Console balance logging
- `src/systems/simulation.ts` — In-app simulation runner

### Screens
- `src/screens/Scans/DailyPlanScreen.tsx` — Daily Panel (streak, scans, gear, sector, pathfinder)
- `src/screens/Scans/ScanScreen.tsx` — Scan execution (type picker, grid, resolution)
- `src/screens/Trail/TrailScreen.tsx` — Main trail hub (uses new scan system)
- `src/screens/Arcade/MiniGameScreen.tsx` — Trail Flier arcade game

### State
- `src/context/GameContext.tsx` — All reducer actions for scan system
- `src/types/index.ts` — SeekerScanState, ScanResult, GearItem, etc.

### Data
- `src/data/gearItems.ts` — 6 Standard tier gear definitions
- `src/data/testSector.ts` — 5×5 sector generator

### Services
- `src/services/analytics.ts` — Telemetry + weekly email
- `src/services/notifications.ts` — Push notifications
- `src/services/solana.ts` — $SKR token economy

### Scripts
- `scripts/simulateRuns.js` — Build comparison simulation (15 days × 100 iterations)
- `scripts/deepAnalysis.js` — Edge case balance testing

## Build Definitions

| Build | Gear | Strategy |
|-------|------|----------|
| Gambit | Gauntlets + Cortex + Drone | High risk, max legendary/component drops |
| Grinder | Optics + Vest + Boots | Safe, max scans + sector progress |
| Survivor | Vest + Gauntlets + Drone | Balanced, whiff protection + extra scans |

## Balance Review — 2026-03-21 (v1.2.0)

Simulation: 15 days × 100 iterations per build. No config changes needed — all targets hold.

| Metric | Gambit | Grinder | Survivor | Target | Status |
|--------|--------|---------|----------|--------|--------|
| Scans/Day | 6 | 7 | 7 | Grinder highest | ✅ |
| Tiles/Day | 9.56 | 10.15 | 8.53 | Grinder highest | ✅ |
| Whiff Rate | 24.8% | 15.0% | 16.2% | Gambit highest | ✅ |
| Rare+/Day | 2.48 | 1.19 | 1.59 | Gambit highest | ✅ |
| Legendary/Day | 0.51 | 0 | 0.13 | Gambit highest | ✅ |
| Component/Day | 0.34 | 0 | 0.13 | Gambit only | ✅ |
| Sector Pacing | 4.3 days | 3.5 days | N/A | Grinder fastest | ✅ |
| Day 1 (no gear) | — | — | — | 0.5 whiffs, 4 tiles | ✅ |
| Streak Impact (D1→D7) | 2.1× tiles | — | — | >1.5× | ✅ |

All three builds are distinct. Gambit takes more risk for better loot. Grinder pushes sectors fastest. Survivor sits in between. No adjustments made.

## Known Gaps (Future Work)

- Sector completion → auto-generate next sector (currently stays on completed sector)
- Pathfinder Module → 4th gear slot equip UI (unlocks tracked, slot UI not yet built)
- Enhanced/Perfected gear acquisition flow (crafting or reward system)
- SKR spending UI (streak shield, whiff protection, rare boost purchasable in-game)
- Season reward pool distribution logic
- Leaderboard integration with on-chain data
- Onboarding lore expansion (placeholder text present, Daniel to expand later)
