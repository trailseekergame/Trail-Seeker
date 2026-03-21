import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../types';

/**
 * Trail Seeker — Dev Analytics & Telemetry
 *
 * Tracks every player action during daily sessions and aggregates
 * weekly reports for the dev team. All data is stored locally and
 * batched into a weekly email digest.
 *
 * What we track:
 * - Scan type distribution (Scout/Seeker/Gambit per session)
 * - Outcome distribution (Whiff/Common/Uncommon/Rare/Legendary/Component)
 * - Gear loadout popularity (which 3-slot builds players actually use)
 * - Sector theme engagement (which sectors get entered/completed)
 * - Objective completion rates
 * - Minigame trigger and completion rates
 * - Streak distribution (what day are players typically at)
 * - $SKR spend patterns (which boosts are purchased)
 * - Session length (scan count per session)
 * - Whiff recovery (Salvage Drone proc rate)
 *
 * Privacy: All data is anonymous aggregate counts. No PII beyond
 * the device's player name (which defaults to "Drifter").
 */

// ─── Storage Keys ───
const STORAGE_KEYS = {
  DAILY_EVENTS: '@trail_seeker_analytics_daily',
  WEEKLY_AGGREGATE: '@trail_seeker_analytics_weekly',
  LAST_REPORT_DATE: '@trail_seeker_analytics_last_report',
} as const;

// ─── Dev Email Config ───
const DEV_EMAIL = 'trailseekergame@gmail.com';
const REPORT_DAY = 0; // Sunday (0=Sun, 1=Mon, etc.)

// ─── Event Types ───

export type ScanType = 'scout' | 'seeker' | 'gambit';
export type ScanOutcome = 'whiff' | 'common' | 'uncommon' | 'rare' | 'legendary' | 'component';
export type GearSlotId = 'optics_rig' | 'exo_vest' | 'grip_gauntlets' | 'nav_boots' | 'cortex_link' | 'salvage_drone';
export type SkrPurchaseType = 'streak_shield' | 'whiff_protection' | 'rare_boost' | 'gear_reroll' | 'scan_recharge';
export type MinigameType = 'signal_decode' | 'scrap_rush' | 'trail_flier' | 'gambit_roulette';

export interface ScanEvent {
  type: 'scan';
  scanType: ScanType;
  outcome: ScanOutcome;
  tileType: 'unknown' | 'resource' | 'anomaly' | 'boss';
  sectorTheme: string;
  droneProc: boolean;
  bootsProc: boolean;
  streakDay: number;
  timestamp: number;
}

export interface GearLoadoutEvent {
  type: 'gear_loadout';
  activeSlots: GearSlotId[];
  timestamp: number;
}

export interface ObjectiveEvent {
  type: 'objective';
  objectiveId: string;
  completed: boolean;
  timestamp: number;
}

export interface MinigameEvent {
  type: 'minigame';
  minigameType: MinigameType;
  triggered: boolean;
  completed: boolean;
  skipped: boolean;
  timestamp: number;
}

export interface SkrSpendEvent {
  type: 'skr_spend';
  purchaseType: SkrPurchaseType;
  amount: number;
  timestamp: number;
}

export interface SessionEvent {
  type: 'session';
  totalScans: number;
  scansUsed: number;
  streakDay: number;
  sessionDurationSec: number;
  sectorsCompleted: number;
  timestamp: number;
}

export type AnalyticsEvent =
  | ScanEvent
  | GearLoadoutEvent
  | ObjectiveEvent
  | MinigameEvent
  | SkrSpendEvent
  | SessionEvent;

// ─── Weekly Aggregate Shape ───

export interface WeeklyAggregate {
  periodStart: string; // ISO date
  periodEnd: string;
  totalSessions: number;
  totalScans: number;

  // Scan type distribution
  scansByType: { scout: number; seeker: number; gambit: number };

  // Outcome distribution
  outcomesByType: {
    whiff: number;
    common: number;
    uncommon: number;
    rare: number;
    legendary: number;
    component: number;
  };

  // Whiff rates by scan type
  whiffRates: { scout: number; seeker: number; gambit: number };

  // Gear loadout popularity (top 5 combos)
  topGearLoadouts: { slots: string; count: number }[];

  // Sector theme engagement
  scansBySector: Record<string, number>;
  sectorsCompleted: Record<string, number>;

  // Objective completion rate
  objectivesOffered: number;
  objectivesCompleted: number;
  dailyDoublesAchieved: number;

  // Minigame stats
  minigameTriggered: number;
  minigameCompleted: number;
  minigameSkipped: number;
  minigameByType: Record<string, { triggered: number; completed: number }>;

  // $SKR spending
  skrSpendByType: Record<string, { count: number; totalSkr: number }>;

  // Streak distribution
  streakDayDistribution: Record<number, number>; // day -> session count

  // Session stats
  avgScansPerSession: number;
  avgSessionDurationSec: number;

  // Drone proc rate (whiffs where drone fired / total whiffs)
  droneProcs: number;
  totalWhiffs: number;

  // Boots proc rate
  bootsProcs: number;
  totalSuccessfulScans: number;
}

// ─── Event Recording ───

/**
 * Record a single analytics event. Stored locally until weekly aggregation.
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_EVENTS);
    const events: AnalyticsEvent[] = existing ? JSON.parse(existing) : [];
    events.push(event);
    await AsyncStorage.setItem(STORAGE_KEYS.DAILY_EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('[Analytics] Failed to track event:', e);
  }
}

// ─── Convenience Trackers ───

export function trackScan(
  scanType: ScanType,
  outcome: ScanOutcome,
  tileType: ScanEvent['tileType'],
  sectorTheme: string,
  droneProc: boolean,
  bootsProc: boolean,
  streakDay: number,
): void {
  trackEvent({
    type: 'scan',
    scanType,
    outcome,
    tileType,
    sectorTheme,
    droneProc,
    bootsProc,
    streakDay,
    timestamp: Date.now(),
  });
}

export function trackGearLoadout(activeSlots: GearSlotId[]): void {
  trackEvent({
    type: 'gear_loadout',
    activeSlots,
    timestamp: Date.now(),
  });
}

export function trackObjective(objectiveId: string, completed: boolean): void {
  trackEvent({
    type: 'objective',
    objectiveId,
    completed,
    timestamp: Date.now(),
  });
}

export function trackMinigame(
  minigameType: MinigameType,
  completed: boolean,
  skipped: boolean,
): void {
  trackEvent({
    type: 'minigame',
    minigameType,
    triggered: true,
    completed,
    skipped,
    timestamp: Date.now(),
  });
}

export function trackSkrSpend(purchaseType: SkrPurchaseType, amount: number): void {
  trackEvent({
    type: 'skr_spend',
    purchaseType,
    amount,
    timestamp: Date.now(),
  });
}

export function trackSession(
  totalScans: number,
  scansUsed: number,
  streakDay: number,
  sessionDurationSec: number,
  sectorsCompleted: number,
): void {
  trackEvent({
    type: 'session',
    totalScans,
    scansUsed,
    streakDay,
    sessionDurationSec,
    sectorsCompleted,
    timestamp: Date.now(),
  });
}

// ─── Weekly Aggregation ───

/**
 * Aggregate all stored events into a weekly summary.
 * Called before generating the report.
 */
export async function aggregateWeekly(): Promise<WeeklyAggregate> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_EVENTS);
  const events: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const agg: WeeklyAggregate = {
    periodStart: weekAgo.toISOString().split('T')[0],
    periodEnd: now.toISOString().split('T')[0],
    totalSessions: 0,
    totalScans: 0,
    scansByType: { scout: 0, seeker: 0, gambit: 0 },
    outcomesByType: { whiff: 0, common: 0, uncommon: 0, rare: 0, legendary: 0, component: 0 },
    whiffRates: { scout: 0, seeker: 0, gambit: 0 },
    topGearLoadouts: [],
    scansBySector: {},
    sectorsCompleted: {},
    objectivesOffered: 0,
    objectivesCompleted: 0,
    dailyDoublesAchieved: 0,
    minigameTriggered: 0,
    minigameCompleted: 0,
    minigameSkipped: 0,
    minigameByType: {},
    skrSpendByType: {},
    streakDayDistribution: {},
    avgScansPerSession: 0,
    avgSessionDurationSec: 0,
    droneProcs: 0,
    totalWhiffs: 0,
    bootsProcs: 0,
    totalSuccessfulScans: 0,
  };

  // Temp tracking
  const whiffsByType: Record<string, number> = { scout: 0, seeker: 0, gambit: 0 };
  const scanCountByType: Record<string, number> = { scout: 0, seeker: 0, gambit: 0 };
  const gearCombos: Record<string, number> = {};
  let totalSessionDuration = 0;
  let totalSessionScans = 0;
  const objectiveSessions = new Set<string>();

  for (const event of events) {
    switch (event.type) {
      case 'scan': {
        agg.totalScans++;
        agg.scansByType[event.scanType]++;
        agg.outcomesByType[event.outcome]++;
        scanCountByType[event.scanType]++;

        if (event.outcome === 'whiff') {
          agg.totalWhiffs++;
          whiffsByType[event.scanType]++;
          if (event.droneProc) agg.droneProcs++;
        } else {
          agg.totalSuccessfulScans++;
          if (event.bootsProc) agg.bootsProcs++;
        }

        // Sector tracking
        agg.scansBySector[event.sectorTheme] = (agg.scansBySector[event.sectorTheme] || 0) + 1;

        // Streak distribution
        agg.streakDayDistribution[event.streakDay] =
          (agg.streakDayDistribution[event.streakDay] || 0) + 1;
        break;
      }

      case 'gear_loadout': {
        const key = event.activeSlots.sort().join(' + ');
        gearCombos[key] = (gearCombos[key] || 0) + 1;
        break;
      }

      case 'objective': {
        const dayKey = new Date(event.timestamp).toDateString();
        agg.objectivesOffered++;
        if (event.completed) {
          agg.objectivesCompleted++;
          objectiveSessions.add(dayKey);
        }
        break;
      }

      case 'minigame': {
        if (event.triggered) agg.minigameTriggered++;
        if (event.completed) agg.minigameCompleted++;
        if (event.skipped) agg.minigameSkipped++;

        if (!agg.minigameByType[event.minigameType]) {
          agg.minigameByType[event.minigameType] = { triggered: 0, completed: 0 };
        }
        if (event.triggered) agg.minigameByType[event.minigameType].triggered++;
        if (event.completed) agg.minigameByType[event.minigameType].completed++;
        break;
      }

      case 'skr_spend': {
        if (!agg.skrSpendByType[event.purchaseType]) {
          agg.skrSpendByType[event.purchaseType] = { count: 0, totalSkr: 0 };
        }
        agg.skrSpendByType[event.purchaseType].count++;
        agg.skrSpendByType[event.purchaseType].totalSkr += event.amount;
        break;
      }

      case 'session': {
        agg.totalSessions++;
        totalSessionDuration += event.sessionDurationSec;
        totalSessionScans += event.scansUsed;
        if (event.sectorsCompleted > 0) {
          // We don't have sector theme here, track generically
          agg.sectorsCompleted['total'] =
            (agg.sectorsCompleted['total'] || 0) + event.sectorsCompleted;
        }
        break;
      }
    }
  }

  // Calculate whiff rates
  for (const t of ['scout', 'seeker', 'gambit'] as const) {
    agg.whiffRates[t] = scanCountByType[t] > 0
      ? Math.round((whiffsByType[t] / scanCountByType[t]) * 100)
      : 0;
  }

  // Top gear loadouts
  agg.topGearLoadouts = Object.entries(gearCombos)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([slots, count]) => ({ slots, count }));

  // Averages
  agg.avgScansPerSession = agg.totalSessions > 0
    ? Math.round(totalSessionScans / agg.totalSessions * 10) / 10
    : 0;
  agg.avgSessionDurationSec = agg.totalSessions > 0
    ? Math.round(totalSessionDuration / agg.totalSessions)
    : 0;

  return agg;
}

// ─── Report Formatting ───

/**
 * Format the weekly aggregate into a plain-text email body.
 */
export function formatWeeklyReport(agg: WeeklyAggregate): { subject: string; body: string } {
  const subject = `Trail Seeker Weekly Report — ${agg.periodStart} to ${agg.periodEnd}`;

  const pct = (n: number, total: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : '0%';

  const lines: string[] = [
    '═══════════════════════════════════════════',
    '  TRAIL SEEKER — WEEKLY ANALYTICS REPORT',
    `  ${agg.periodStart} to ${agg.periodEnd}`,
    '═══════════════════════════════════════════',
    '',
    '── OVERVIEW ──',
    `Sessions:           ${agg.totalSessions}`,
    `Total Scans:        ${agg.totalScans}`,
    `Avg Scans/Session:  ${agg.avgScansPerSession}`,
    `Avg Session Length:  ${Math.round(agg.avgSessionDurationSec / 60 * 10) / 10} min`,
    '',
    '── SCAN TYPE DISTRIBUTION ──',
    `Scout:   ${agg.scansByType.scout}  (${pct(agg.scansByType.scout, agg.totalScans)})`,
    `Seeker:  ${agg.scansByType.seeker}  (${pct(agg.scansByType.seeker, agg.totalScans)})`,
    `Gambit:  ${agg.scansByType.gambit}  (${pct(agg.scansByType.gambit, agg.totalScans)})`,
    '',
    '── OUTCOME DISTRIBUTION ──',
    `Whiff:      ${agg.outcomesByType.whiff}  (${pct(agg.outcomesByType.whiff, agg.totalScans)})`,
    `Common:     ${agg.outcomesByType.common}  (${pct(agg.outcomesByType.common, agg.totalScans)})`,
    `Uncommon:   ${agg.outcomesByType.uncommon}  (${pct(agg.outcomesByType.uncommon, agg.totalScans)})`,
    `Rare:       ${agg.outcomesByType.rare}  (${pct(agg.outcomesByType.rare, agg.totalScans)})`,
    `Legendary:  ${agg.outcomesByType.legendary}  (${pct(agg.outcomesByType.legendary, agg.totalScans)})`,
    `Component:  ${agg.outcomesByType.component}  (${pct(agg.outcomesByType.component, agg.totalScans)})`,
    '',
    '── WHIFF RATES BY TYPE ──',
    `Scout:   ${agg.whiffRates.scout}%  (target: ~5%)`,
    `Seeker:  ${agg.whiffRates.seeker}%  (target: ~20%)`,
    `Gambit:  ${agg.whiffRates.gambit}%  (target: ~25-40%)`,
    '',
    '── GEAR PROCS ──',
    `Salvage Drone:  ${agg.droneProcs} recoveries / ${agg.totalWhiffs} whiffs (${pct(agg.droneProcs, agg.totalWhiffs)})`,
    `Nav Boots:      ${agg.bootsProcs} extra sectors / ${agg.totalSuccessfulScans} successes (${pct(agg.bootsProcs, agg.totalSuccessfulScans)})`,
    '',
    '── TOP GEAR LOADOUTS ──',
    ...agg.topGearLoadouts.map((g, i) => `${i + 1}. ${g.slots}  (${g.count} sessions)`),
    '',
    '── STREAK DISTRIBUTION ──',
    ...Object.entries(agg.streakDayDistribution)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([day, count]) => `Day ${day}: ${'█'.repeat(Math.min(20, Math.round(count / Math.max(1, agg.totalScans) * 200)))} ${count} scans`),
    '',
    '── OBJECTIVES ──',
    `Offered:    ${agg.objectivesOffered}`,
    `Completed:  ${agg.objectivesCompleted}  (${pct(agg.objectivesCompleted, agg.objectivesOffered)})`,
    '',
    '── MINIGAMES ──',
    `Triggered:  ${agg.minigameTriggered}`,
    `Completed:  ${agg.minigameCompleted}  (${pct(agg.minigameCompleted, agg.minigameTriggered)})`,
    `Skipped:    ${agg.minigameSkipped}  (${pct(agg.minigameSkipped, agg.minigameTriggered)})`,
    ...Object.entries(agg.minigameByType).map(
      ([type, stats]) => `  ${type}: ${stats.completed}/${stats.triggered} completed`
    ),
    '',
    '── $SKR SPENDING ──',
    ...Object.entries(agg.skrSpendByType).map(
      ([type, stats]) => `${type}: ${stats.count} purchases, ${stats.totalSkr} $SKR total`
    ),
    '',
    '── SECTOR ENGAGEMENT ──',
    ...Object.entries(agg.scansBySector)
      .sort((a, b) => b[1] - a[1])
      .map(([theme, count]) => `${theme}: ${count} scans`),
    '',
    '═══════════════════════════════════════════',
    '  Generated by Trail Seeker Dev Analytics',
    '  Config version: gameBalance.json v1.1.0',
    '═══════════════════════════════════════════',
  ];

  return { subject, body: lines.join('\n') };
}

// ─── Report Sending ───

/**
 * Check if it's time to send the weekly report (every Sunday).
 * If so, aggregate data, format the report, and open the email client.
 * Then clear the event log for the next week.
 *
 * This uses the device's email client (mailto: link) since we don't
 * have a backend email service. In production, replace with an API call.
 */
export async function checkAndSendWeeklyReport(): Promise<boolean> {
  const today = new Date();
  if (today.getDay() !== REPORT_DAY) return false;

  // Check if we already sent this week
  const lastReport = await AsyncStorage.getItem(STORAGE_KEYS.LAST_REPORT_DATE);
  const todayStr = today.toISOString().split('T')[0];
  if (lastReport === todayStr) return false;

  console.log('[Analytics] Generating weekly report...');

  const aggregate = await aggregateWeekly();

  // Skip if no data
  if (aggregate.totalSessions === 0) {
    console.log('[Analytics] No sessions this week, skipping report.');
    return false;
  }

  const { subject, body } = formatWeeklyReport(aggregate);

  // Store the aggregate for reference
  await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_AGGREGATE, JSON.stringify(aggregate));

  // Log the report (always available in dev console)
  console.log('[Analytics] Weekly Report:');
  console.log(body);

  // Open device email client with pre-filled report
  // In production, replace this with a server-side API call
  const { Linking } = require('react-native');
  const mailtoUrl = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  try {
    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      console.log('[Analytics] Email client opened with report.');
    } else {
      console.log('[Analytics] Cannot open email client. Report logged to console.');
    }
  } catch (e) {
    console.error('[Analytics] Failed to open email:', e);
  }

  // Mark as sent and clear event log
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_REPORT_DATE, todayStr);
  await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_EVENTS);

  return true;
}

/**
 * Get the current aggregate for display in a dev panel.
 */
export async function getCurrentAggregate(): Promise<WeeklyAggregate> {
  return aggregateWeekly();
}

/**
 * Get raw event count (for dev panel display).
 */
export async function getEventCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_EVENTS);
  return raw ? JSON.parse(raw).length : 0;
}

/**
 * Force send a report now (for dev testing).
 */
export async function forceSendReport(): Promise<void> {
  const aggregate = await aggregateWeekly();
  const { subject, body } = formatWeeklyReport(aggregate);
  console.log('[Analytics] FORCED Weekly Report:');
  console.log(body);

  const { Linking } = require('react-native');
  const mailtoUrl = `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  try {
    await Linking.openURL(mailtoUrl);
  } catch (e) {
    console.error('[Analytics] Failed to open email:', e);
  }
}

/**
 * Clear all analytics data (for dev reset).
 */
export async function clearAnalytics(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_EVENTS);
  await AsyncStorage.removeItem(STORAGE_KEYS.WEEKLY_AGGREGATE);
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_REPORT_DATE);
  console.log('[Analytics] All analytics data cleared.');
}
