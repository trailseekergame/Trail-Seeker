# Theme V2 — Military Terminal Overhaul

## Summary
Transformed the UI from "dark fintech" to "post-apocalyptic field terminal" aesthetic. Every surface now reads as industrial hardware rather than a mobile app.

## Changes by File

### Core Theme
- **src/theme/index.ts** — Added `fontMono` export ('monospace'), `panelBorder` / `panelBorderLight` / `panelGlow` color tokens

### Common Components
- **ScreenWrapper.tsx** — Removed scanline overlay (visual impact comes from card/text styling instead)
- **NeonButton.tsx** — borderRadius: 0, borderWidth: 1.5, fontFamily: monospace, letterSpacing: 3
- **Card.tsx** — borderRadius: 0, borderWidth: 1.5, borderColor: panelBorder
- **HealthBar.tsx** — borderRadius: 0 on track and fill, borderColor: panelBorder
- **FeedbackToast.tsx** — borderRadius: 0, fontFamily: monospace on text
- **CoachMark.tsx** — borderRadius: 0, fontFamily: monospace on dismiss text
- **ResourceBar.tsx** — fontFamily: fontMono on value, label, infoText, gearText
- **SkillCheck.tsx** — borderRadius: 0 on bar/targetZone/marker, fontFamily: monospace on instruction/flashText/hint, borderColor: panelBorder

### Navigation
- **navigation/index.tsx** — Header tint: neonGreen, headerTitleStyle: monospace font + letterSpacing: 2 + fontSize: 14. Tab bar: bg matches background, borderColor: panelBorder, labels: monospace + letterSpacing: 1. Settings modal header: background color + neonGreen tint.

### DailyPlanScreen (main hub)
- fontFamily: fontMono on: headerTitle, headerDayNum, scanNumber, scanLabel, scanLabelSub, scanNote, sectionTitle, lockedBadge, tapHint, gearSlotName, gearSlotEffect, sectorName, sectorProgress, objectiveBrief, objectiveContext, pathfinderTitle, skrTitle, skrShopName, skrShopCost
- borderRadius: 0 on: statusStrip, scanCard, objectiveCard, gearSlotCard, sectorCard, sectorBar, sectorBarFill, pathfinderCard, skrShopCard
- borderColor: panelBorder on all card containers
- borderWidth: 1.5 on major cards
- streakDot: borderRadius: 2, borderColor: panelBorder

### ScanScreen
- fontFamily: fontMono on: resultBanner, resultLoot, resultProgress, confirmWhiff, fieldNote, tileWeakenedText, sessionEndLabel, sessionEndSummary, buffText, rewardChipText, damageChipText, gearDropText, unlockText, runSummaryText, skrEarnedText
- borderRadius: 0 on: resultCard, confirmCard, sessionEndCard, skillCheckCard, briefingCard, resultTypeBadge, upgradedBadge, resolvingIcon
- borderColor: panelBorder on major cards
- borderWidth: 1.5 on cards

### MissionSelectScreen
- fontFamily: fontMono on: header, subtitle, missionName, missionSubtitle, completedText, lockedText, lockReason
- borderRadius: 0 on: missionCard, missionBgImage, completedBadge, lockedBadge
- borderColor: panelBorder on missionCard
- letterSpacing: 2 on header

### OnboardingScreen (selective — narrative body kept in default font)
- fontFamily: fontMono on: sectionLabel, optionLabel, avatarPrompt, scanTitle, goName, goArchetype, tierName, textInput
- borderRadius: 0 on: optionCard, tierRow, avatarCard, goAvatar, textInput
- borderColor: panelBorder on optionCard, tierRow, textInput
- progressDot borderRadius: 2

### SettingsScreen
- fontFamily: fontMono on: title, sectionLabel, settingLabel, version
- borderRadius: 0 on: section, avatarCard
- borderColor: panelBorder on section
- letterSpacing: 2 on title

## Design Principles
- **borderRadius: 0** everywhere except tiny indicator dots (streakDot: 2, progressDot: 2)
- **fontFamily: 'monospace'** on all labels, numbers, headers, badges, readouts
- **Body/narrative text** (onboarding story, descriptions) kept in default font for readability
- **borderColor: colors.panelBorder** (dark green tint) on all card containers
- **borderWidth: 1.5** on major containers for hardware frame feel
- Overall feel: **military field terminal**, not mobile app

## Verification
- `npx tsc --noEmit` — 0 errors
