# UI Overhaul: Cyber-Dystopian Terminal Aesthetic + Haptic Wiring

## Part 1: Theme & Visual Changes

### src/theme/index.ts
- Darker core palette: background `#060A0E`, surface `#0C1018`, surfaceLight `#151C28`, surfaceHighlight `#1A2436`
- Dimmer terminal text: textPrimary `#C8D0DC`, textSecondary `#5E6E82`, textMuted `#3A4858`
- New color: `terminalGlow: 'rgba(0, 232, 156, 0.07)'`
- Sharper borderRadius: sm: 0, md: 2, lg: 4, xl: 6 (was 2/4/6/8)
- neonGlow shadow boosted: opacity 0.4, radius 10, elevation 8

### src/components/common/ScreenWrapper.tsx
- Added subtle CRT scanline overlay (absolute View, green tint, 0.03 opacity)

### src/components/common/NeonButton.tsx
- Primary variant: outline-style terminal button (green text on subtle green bg `#15` instead of solid green)
- borderRadius: 2 (hard corners)
- letterSpacing: 2 on button text
- Disabled borderColor uses `textMuted + '40'`
- **Haptic wired**: every button tap plays `ui_tap` + light vibrate

### src/components/common/Card.tsx
- borderRadius: borderRadius.md (was lg)

### src/components/common/HealthBar.tsx
- Track: darker bg (colors.surface), 1px border, borderRadius: 2

### src/components/common/FeedbackToast.tsx
- borderRadius: borderRadius.md (was full) — angular terminal notifications

### src/components/common/CoachMark.tsx
- Slightly more translucent background (`#12` from `#18`)

### src/navigation/index.tsx
- Header backgroundColor: colors.background (was surface)
- headerTitleStyle: letterSpacing: 1
- Tab bar: height 56 (was 65), borderTopWidth: 2 (thicker hardware border)

### Screen StyleSheet changes (borderRadius sharpening only)
- **DailyPlanScreen**: statusStrip, objectiveCard, scanCard, sectorCard, pathfinderCard → borderRadius.md; streakDot → 4; sectorBar → 2
- **ScanScreen**: briefingCard, confirmCard, resultCard, skillCheckCard, sessionEndCard → borderRadius.md; resultTypeBadge → borderRadius.sm; resolvingIcon → 4
- **MissionSelectScreen**: missionCard, missionBgImage → borderRadius.md
- **OnboardingScreen**: optionCard, avatarCard → borderRadius.md
- **SettingsScreen**: section → borderRadius.md

## Part 2: Haptic & Sound Wiring

### NeonButton (global)
- All button taps: `ui_tap` SFX + light haptic

### OnboardingScreen
- "Get up." button: `ui_confirm` SFX
- "Start the run" (handleComplete): `sector_complete` SFX + heavy haptic

### MissionSelectScreen
- Mission selection: `ui_confirm` SFX + medium haptic

### DailyPlanScreen
- Gear slot toggle: `ui_tap` SFX + light haptic
- SKR shop purchase: `ui_confirm` SFX + medium haptic

### RPSScreen
- Find match: `scan_press` SFX + light haptic
- Make choice: `ui_confirm` SFX + medium haptic
- Win result: `gambit_win` SFX + heavy haptic
- Lose result: `gambit_whiff` SFX + medium haptic
- Draw result: `ui_tap` SFX + light haptic

## Verification
- `npx tsc --noEmit` — **0 errors**
- No game logic, types, IDs, or navigation structure changed
- No new dependencies added
