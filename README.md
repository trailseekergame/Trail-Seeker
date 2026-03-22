# Trail Seeker

A post-collapse daily survival RPG set in 2079 America. Players run dark scans on Directorate-controlled sectors from a beat-up rover, pulling buried caches, pre-collapse tech, and relic fragments from the static — all in 5-minute daily sessions. Built as a mobile-first experience with streak-driven retention, risk/reward scan mechanics, a real-time skill check mini-game, and a $SKR token economy on Solana. The game is designed around the idea that the gap between free and paid is convenience, not power.

## Tech Stack

- **React Native** + **Expo SDK 55** (TypeScript 5.9)
- **Solana Mobile Stack** — $SKR SPL token integration, treasury wallet, Mobile Wallet Adapter (stubs ready)
- **expo-av** for audio, **expo-haptics** for tactile feedback
- Target: Android (Solana Seeker devices + any Android phone)

## Features

- **Seeker Scans** — 3 risk tiers (Scout / Seeker / Gambit) with real-time skill check on Gambits
- **Gear system** — 6 slots, pick 3, 17 items across standard / enhanced / ultra tiers
- **Streak ladder** — 7-day consistency rewards with loss aversion hooks
- **Authored content** — 2 maps (Broken Overpass, Relay Field) with 14 hand-written tiles
- **$SKR economy** — shop, boosts, burn/pool split, season reward pool
- **Arcade** — RPS duel minigame (Scrap-Boy) with win tracking
- **Audio/haptics** — 14 SFX, 2 ambient tracks, haptic feedback on all interactions
- **Retention psychology** — session scarcity, return hooks, daily objectives, streak protection

## Quick Start

```bash
# Clone
git clone https://github.com/trailseekergame/Trail-Seeker.git
cd Trail-Seeker

# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android emulator
npx expo start --android

# Run on device with Expo Go
# Scan the QR code shown after npx expo start
```

## Project Structure

```
src/
  screens/        # DailyPlan, ScanScreen, MissionSelect, RPS, Onboarding, Settings
  components/     # NeonButton, ScreenWrapper, HealthBar, ScrapBoyFrame, etc.
  systems/        # scanEngine, skrEconomy, dailyObjective, sessionLogger
  services/       # audioManager, solana, rpsService, analytics, storage
  data/           # gearItems, authoredTiles, sectorMaps, avatars, cosmetics
  config/         # gameBalance.json (live-tunable balance parameters)
  context/        # GameContext (global state + reducer)
  types/          # TypeScript interfaces
  theme/          # Colors, spacing, typography (terminal aesthetic)
  assets/         # Pixel art backgrounds, character art, audio
docs/
  pitch.html      # Grant pitch deck (GitHub Pages)
```

## Balance Tuning

All game balance values live in `src/config/gameBalance.json` — drop rates, damage tables, gear stats, streak bonuses, and economy pricing. Change values and hot-reload without touching code.

## Links

- **Pitch Deck**: [trailseekergame.github.io/Trail-Seeker/pitch.html](https://trailseekergame.github.io/Trail-Seeker/pitch.html)
- **Contact**: trailseekergame@gmail.com
- **Treasury**: `5LfwdtHDZuQBc5JTQFzC6aGJ9Q8ZZJSmKN6vKBBbEPPi`

## License

MIT — see [LICENSE](LICENSE).
