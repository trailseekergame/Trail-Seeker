# Trail Seeker

A text-driven survival RPG on a ruined cross-country highway in 2079 America. Built with React Native + Expo, targeting Android (Solana Mobile / Seeker devices + any Android phone).

## Quick Start

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android (emulator or connected device)
npx expo start --android

# Run on Android device with Expo Go
# Scan the QR code shown after `npx expo start`
```

### Requirements
- Node.js 18+
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)
- Android Studio / Android emulator OR a physical Android device with Expo Go

---

## Project Structure

```
trail-seeker/
├── App.tsx                    # Root component
├── index.ts                   # Entry point
├── src/
│   ├── theme/
│   │   └── index.ts           # Colors, spacing, typography tokens
│   ├── types/
│   │   └── index.ts           # TypeScript types + initial game state
│   ├── data/                  # 🎯 GAME DATA — edit these to modify content
│   │   ├── zone01.ts          # Zone 01 nodes (map layout)
│   │   ├── events.ts          # Event pool (encounters, hazards, trade, lore)
│   │   ├── codex.ts           # Codex entries (world, factions, enemies, loot)
│   │   ├── cosmetics.ts       # Cosmetic items (headgear, coats, decals, etc.)
│   │   └── backstory.ts       # Onboarding archetypes and "last lost" options
│   ├── context/
│   │   └── GameContext.tsx     # Central game state (reducer + provider)
│   ├── hooks/
│   │   ├── useEventEngine.ts  # Event selection + outcome application
│   │   └── useMoveTimer.ts    # 24-hour move refresh timer
│   ├── services/
│   │   ├── storage.ts         # AsyncStorage persistence layer
│   │   └── solana.ts          # ⛓️ Solana MWA stubs (wallet, transactions)
│   ├── components/
│   │   ├── common/            # Reusable UI: ScreenWrapper, NeonButton, Card, etc.
│   │   ├── trail/             # Trail-specific: ZoneMap, EventModal
│   │   ├── settlement/        # Settlement components
│   │   ├── codex/             # Codex components
│   │   └── arcade/            # Arcade components
│   ├── screens/
│   │   ├── Trail/             # TrailScreen (map + events)
│   │   ├── Settlement/        # SettlementScreen, WardrobeScreen
│   │   ├── Codex/             # CodexScreen, CodexEntryScreen
│   │   ├── Arcade/            # ArcadeScreen, MiniGameScreen (Trail Flier)
│   │   └── OnboardingScreen.tsx
│   └── navigation/
│       └── index.tsx          # Tab + stack navigation setup
```

---

## Editing Game Data

All game content lives in `src/data/`. You never need to touch component code to:

### Add/edit Zone 01 nodes → `src/data/zone01.ts`
Each node has: `id`, `name`, `type`, `description`, `connections` (linked node IDs), `x/y` (map position 0–100).

### Add/edit events → `src/data/events.ts`
Events have a `narration` + array of `choices`, each with an `outcome`. Outcomes can modify resources, health, codex unlocks, and player position.

### Add codex entries → `src/data/codex.ts`
Set `alwaysVisible: true` for entries shown from the start. Others unlock when their `id` is added to `unlockedCodexIds` via events.

### Add cosmetic items → `src/data/cosmetics.ts`
Define `slot`, `rarity`, `description`, and `unlockCondition`. No stat effects.

### Modify onboarding → `src/data/backstory.ts`
Archetypes and "last lost" options that shape player identity.

---

## Architecture

### State Management
- **GameContext** (React Context + useReducer): Centralized state for player position, resources, codex unlocks, cosmetics, and leaderboard.
- **Auto-persist**: State saves to AsyncStorage with debounced writes (500ms).
- **Move refresh**: 3 free moves per 24-hour cycle, computed on app start.

### Navigation
```
Root
├── Onboarding (shown until backstory is completed)
└── Main Tabs
    ├── Trail    → TrailScreen
    ├── Settlement → SettlementScreen → WardrobeScreen
    ├── Codex    → CodexScreen → CodexEntryScreen
    └── Arcade   → ArcadeScreen → MiniGameScreen (Trail Flier)
```

### Event Engine
1. Player taps a reachable node → move is consumed
2. `useEventEngine` selects an event (node-specific 70%, generic 30%)
3. Player picks a choice → outcome is applied via dispatch
4. One-time events are tracked in `completedEventIds`

---

## Solana / MWA Integration

All Solana functions are stubbed in `src/services/solana.ts`:

| Function | Purpose | Status |
|----------|---------|--------|
| `connectWallet()` | MWA authorize flow | Stub — returns mock state |
| `disconnectWallet()` | MWA deauthorize | Stub |
| `getBalance()` | SOL balance query | Stub |
| `requestAirdrop()` | Devnet airdrop | Stub |
| `sendSol()` | SOL transfer | Stub |
| `purchaseExtraMove()` | Buy Trail move with SOL/SKR | Stub — always succeeds |
| `purchaseCosmetic()` | Buy cosmetic item | Stub — always succeeds |
| `purchaseReroll()` | Buy event reroll | Stub — always succeeds |

### To integrate real Solana:
1. Install `@solana-mobile/mobile-wallet-adapter-protocol` and `@solana/web3.js`
2. Replace each stub with the real MWA `transact()` flow
3. Set up a game treasury wallet address
4. Define SOL/SKR costs per action
5. The API surface matches what MWA expects — no architectural changes needed

---

## Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| 3-move daily loop | ✅ | 24-hour refresh, persisted |
| Zone 01 map (10 nodes) | ✅ | Linear + slight branching |
| Event system (16 events) | ✅ | Data-driven, categorized |
| Settlement (trade, repair) | ✅ | Fixed-rate exchanges |
| Codex (18 entries) | ✅ | Unlock-gated + always-visible |
| Cosmetics (18 items) | ✅ | 6 slots, rarity system |
| Player backstory | ✅ | 6 archetypes, 5 "last lost" |
| Trail Flier mini-game | ✅ | Flappy-style, scoring + rewards |
| Leaderboard | ✅ | Local, composite scoring |
| Wardrobe UI | ✅ | Equip/unequip per slot |
| AsyncStorage persistence | ✅ | Auto-save with debounce |
| Solana MWA stubs | ✅ | Full API surface defined |
| Dev tools | ✅ | Reset moves, add resources, heal |

---

## Dev Tools

In development mode (`__DEV__`), the Trail screen shows a "Dev Tools" section with buttons to:
- Reset moves (bypass 24-hour timer)
- Add +20 scrap
- Heal player

The Wardrobe also has "Unlock (Dev)" buttons for locked cosmetics.

---

## Tech Stack

- **React Native** 0.83 + **Expo** SDK 55
- **TypeScript** 5.9
- **React Navigation** 7 (bottom tabs + native stacks)
- **AsyncStorage** for persistence
- **React Native Reanimated** 4 for animations
- **React Native Gesture Handler** for touch
