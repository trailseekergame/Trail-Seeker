import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../types';

// Lazy-load expo-notifications to avoid crash in Expo Go (SDK 53+ removed push support)
let Notifications: any = null;
let Device: any = null;
try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch (e) {
  console.warn('[Notifications] expo-notifications not available');
}

// ─── Constants ───

const STORAGE_KEYS = {
  NOTIFICATION_PREFS: '@trail_seeker_notif_prefs',
  LAST_SESSION_TIME: '@trail_seeker_last_session',
} as const;

/** Notification identifiers for cancellation */
const NOTIF_ID_DAILY = 'trail-seeker-daily';
const NOTIF_ID_STREAK = 'trail-seeker-streak';

/** Quiet hours: no notifications between these local hours */
const DEFAULT_QUIET_START = 22; // 10 PM
const DEFAULT_QUIET_END = 8;   // 8 AM

/** Hours after last session to send daily reminder */
const DEFAULT_REMINDER_HOURS = 22;

/** Extra hours to wait before sending streak warning (after daily reminder) */
const STREAK_WARNING_DELAY_HOURS = 2;

// ─── Preferences ───

export interface NotificationPrefs {
  enabled: boolean;
  reminderHoursAfterSession: number; // default 22
  quietHourStart: number; // 0-23
  quietHourEnd: number;   // 0-23
  streakWarningsEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  reminderHoursAfterSession: DEFAULT_REMINDER_HOURS,
  quietHourStart: DEFAULT_QUIET_START,
  quietHourEnd: DEFAULT_QUIET_END,
  streakWarningsEnabled: true,
};

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS);
    if (json) {
      return { ...DEFAULT_PREFS, ...JSON.parse(json) };
    }
  } catch (e) {
    console.error('[Notifications] Failed to load prefs:', e);
  }
  return { ...DEFAULT_PREFS };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(prefs));
  } catch (e) {
    console.error('[Notifications] Failed to save prefs:', e);
  }
}

// ─── Permission & Setup ───

/**
 * Configure notification behavior (foreground handling).
 * Call once at app startup.
 */
export function configureNotifications(): void {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn('[Notifications] setNotificationHandler not available:', e);
  }
}

/**
 * Request notification permissions. Returns true if granted.
 */
export async function requestPermissions(): Promise<boolean> {
  if (!Notifications || !Device) return false;
  try {
    if (!Device.isDevice) {
      // console.log('[Notifications] Must use physical device for push notifications');
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      // console.log('[Notifications] Permission not granted');
      return false;
    }

    // Android: create notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('trail-seeker-daily', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100, 50, 100],
        lightColor: '#39FF14',
      });
    }

    return true;
  } catch (e) {
    console.warn('[Notifications] Permission request failed (Expo Go limitation):', e);
    return false;
  }
}

// ─── Message Templates ───

interface MessageTemplate {
  title: string;
  body: string;
}

/**
 * Generate a personalized daily reminder message.
 * Pulls from the player's current state for context.
 */
function getDailyMessage(state: GameState): MessageTemplate {
  const name = state.playerName || 'Drifter';
  const dayNumber = state.dayNumber;
  const streak = Math.min(dayNumber, 7);
  const scansTotal = state.seekerScans.scansTotal;
  const roverHealth = state.roverHealth;
  const playerHealth = state.playerHealth;
  const visited = state.visitedNodes.length;
  const totalNodes = 28;

  const messages: MessageTemplate[] = [
    {
      title: 'Signal Window Open',
      body: `${name}, your scanner is charged. ${scansTotal} scans before the window closes.`,
    },
    {
      title: 'Rig Powered Up',
      body: `The static cleared, ${name}. Fresh scans are live — deploy when ready.`,
    },
    {
      title: 'New Day, New Signal',
      body: `${name}, the frequency shifted overnight. New reads available across the sector.`,
    },
    {
      title: 'Camp Report',
      body: `Scanner diagnostics complete. ${scansTotal} scans available. Rover condition: ${roverHealth}%. Move out when ready, ${name}.`,
    },
    {
      title: 'The Trail Doesn\'t Wait',
      body: `${name}, every day you don't scan is a day the Directorate gets closer to what you're looking for.`,
    },
    {
      title: 'Operator Brief',
      body: `Day ${dayNumber}. ${scansTotal} scans. ${name}, the wreckage won't search itself.`,
    },
    {
      title: 'Free Band Relay',
      body: `Intercepted chatter: "Good signal today." Your scans are live, ${name}.`,
    },
    {
      title: 'Field Ready',
      body: `${name}, rig is warm. ${totalNodes - visited} tiles still dark. Time to light them up.`,
    },
  ];

  // Context-specific additions
  if (streak >= 5) {
    messages.push({
      title: `Day ${streak} — Peak Signal`,
      body: `${name}, your reads are the sharpest they've been. Don't waste this window.`,
    });
  }
  if (roverHealth < 30) {
    messages.push({
      title: 'Rover Damaged',
      body: `${name}, your rover is at ${roverHealth}%. Repair with scrap before your next run.`,
    });
  }
  if (playerHealth < 30) {
    messages.push({
      title: 'Low HP Warning',
      body: `${name}, you're running at ${playerHealth} HP. Heal at base before deploying.`,
    });
  }

  const dateIndex = new Date().getDate() % messages.length;
  return messages[dateIndex];
}

/**
 * Generate a streak-at-risk warning message.
 * Only sent to players with 3+ day streaks who haven't logged in.
 */
function getStreakWarningMessage(state: GameState): MessageTemplate {
  const name = state.playerName || 'Drifter';
  const streak = Math.min(state.dayNumber, 7);

  const messages: MessageTemplate[] = [
    {
      title: 'Streak Cooling',
      body: `${name}, Day ${streak} streak is still live. One scan keeps the signal sharp.`,
    },
    {
      title: 'Don\'t Go Dark',
      body: `Your ${streak}-day streak means better reads, ${name}. Miss today and the frequency drifts.`,
    },
    {
      title: 'Signal Degrading',
      body: `${name}, your scanner calibration degrades without daily use. One scan holds the line.`,
    },
    {
      title: 'Operator Warning',
      body: `Day ${streak} bonus expires at midnight, ${name}. A single scan locks it in.`,
    },
    {
      title: 'The Rig Remembers',
      body: `${streak} days straight. Your rig is tuned to the frequency now, ${name}. Don't let it drift.`,
    },
    {
      title: 'Last Call',
      body: `${name}, your streak bonus is live until midnight. One quick scan — that's all it takes.`,
    },
  ];

  const dateIndex = new Date().getDate() % messages.length;
  return messages[dateIndex];
}

// ─── Scheduling Logic ───

/**
 * Adjust a trigger time to respect quiet hours.
 * If the calculated time falls in quiet hours, push it to the end of quiet hours.
 */
function adjustForQuietHours(triggerDate: Date, quietStart: number, quietEnd: number): Date {
  const hour = triggerDate.getHours();

  // Check if hour falls in quiet window
  // Handle wrap-around (e.g., 22-8 means 22,23,0,1,2,3,4,5,6,7 are quiet)
  const isQuiet = quietStart > quietEnd
    ? (hour >= quietStart || hour < quietEnd)  // wraps midnight
    : (hour >= quietStart && hour < quietEnd); // same-day range

  if (isQuiet) {
    // Push to quietEnd on the same or next day
    const adjusted = new Date(triggerDate);
    if (hour >= quietStart) {
      // After quiet start — push to next day's quiet end
      adjusted.setDate(adjusted.getDate() + 1);
    }
    adjusted.setHours(quietEnd, 0, 0, 0);
    return adjusted;
  }

  return triggerDate;
}

/**
 * Schedule the daily reminder and (optionally) streak warning.
 * Call this when the player ends a session or the app goes to background.
 */
export async function scheduleReminders(state: GameState): Promise<void> {
  if (!Notifications) return;
  try {
  const prefs = await loadNotificationPrefs();

  if (!prefs.enabled) {
    await cancelAllReminders();
    return;
  }

  // Cancel existing before scheduling new ones
  await cancelAllReminders();

  const now = new Date();
  const lastSessionTime = now.getTime();

  // Save session time for reference
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_SESSION_TIME, lastSessionTime.toString());

  // ── Daily reminder ──
  const dailyTrigger = new Date(lastSessionTime + prefs.reminderHoursAfterSession * 60 * 60 * 1000);
  const adjustedDaily = adjustForQuietHours(dailyTrigger, prefs.quietHourStart, prefs.quietHourEnd);
  const dailyMsg = getDailyMessage(state);

  const dailySeconds = Math.max(60, Math.floor((adjustedDaily.getTime() - now.getTime()) / 1000));

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID_DAILY,
    content: {
      title: dailyMsg.title,
      body: dailyMsg.body,
      sound: undefined,
      badge: 1,
      data: { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: dailySeconds,
      repeats: false,
    },
  });

  // console.log(`[Notifications] Daily reminder scheduled in ${Math.round(dailySeconds / 3600)}h`);

  // ── Streak warning (only for 3+ day streaks) ──
  const streak = Math.min(state.dayNumber, 7);
  if (prefs.streakWarningsEnabled && streak >= 3) {
    const streakTrigger = new Date(adjustedDaily.getTime() + STREAK_WARNING_DELAY_HOURS * 60 * 60 * 1000);
    const adjustedStreak = adjustForQuietHours(streakTrigger, prefs.quietHourStart, prefs.quietHourEnd);
    const streakMsg = getStreakWarningMessage(state);

    const streakSeconds = Math.max(60, Math.floor((adjustedStreak.getTime() - now.getTime()) / 1000));

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_ID_STREAK,
      content: {
        title: streakMsg.title,
        body: streakMsg.body,
        sound: undefined,
        badge: 1,
        data: { type: 'streak_warning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: streakSeconds,
        repeats: false,
      },
    });

    console.log(`[Notifications] Streak warning scheduled in ${Math.round(streakSeconds / 3600)}h`);
  }
  } catch (e) {
    console.warn('[Notifications] Schedule failed (Expo Go limitation):', e);
  }
}

/**
 * Cancel all scheduled reminders.
 * Call this when the player opens the app (they don't need reminding anymore).
 */
export async function cancelAllReminders(): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_DAILY);
  } catch (_) {
    // May not exist or not available in Expo Go
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(NOTIF_ID_STREAK);
  } catch (_) {
    // May not exist or not available in Expo Go
  }

  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (_) {
    // Not available in Expo Go
  }
}

/**
 * Get count of currently scheduled notifications (for debug/settings UI).
 */
export async function getScheduledCount(): Promise<number> {
  if (!Notifications) return 0;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch (e) {
    console.warn('[Notifications] getScheduledCount failed:', e);
    return 0;
  }
}
