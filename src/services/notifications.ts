import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameState } from '../types';

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
  try {
    if (!Device.isDevice) {
      console.log('[Notifications] Must use physical device for push notifications');
      return false;
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('[Notifications] Permission not granted');
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
  const day = state.dayNumber;
  const streak = Math.min(day, 7); // approximate streak from dayNumber
  const visited = state.visitedNodes.length;
  const totalNodes = 28; // zone01 node count

  // Pool of messages — pick one based on state
  const messages: MessageTemplate[] = [
    {
      title: 'Seeker Scans Ready',
      body: `${name}, your daily Scans are waiting. Pick your path and push your luck.`,
    },
    {
      title: 'The Trail Awaits',
      body: `New sectors to uncover, ${name}. Your Scans reset — time to move.`,
    },
    {
      title: 'Fresh Scans Available',
      body: `${name}, gear up and scan. ${totalNodes - visited} sectors still unexplored.`,
    },
    {
      title: 'Daily Run Ready',
      body: `The Rustbelt Verge doesn't wait, ${name}. Your Scans are live.`,
    },
  ];

  // Add context-specific messages
  if (streak >= 5) {
    messages.push({
      title: `Day ${streak} Streak`,
      body: `${name}, your Day ${streak} bonus is live — boosted Scans and better odds today.`,
    });
  }

  if (visited > totalNodes * 0.7) {
    messages.push({
      title: 'Almost There',
      body: `${name}, you've mapped ${visited} of ${totalNodes} sectors. The Verge Gate is close.`,
    });
  }

  // Pick a message deterministically based on the date (so it varies daily)
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
      title: 'Streak Bonus Cooling',
      body: `${name}, your Day ${streak} streak bonus is still live. One Scan keeps it going.`,
    },
    {
      title: 'Don\'t Lose Your Edge',
      body: `${name}, your ${streak}-day streak means better odds today. Worth a quick check-in.`,
    },
    {
      title: 'Trail\'s Getting Cold',
      body: `Your streak bonus drops tomorrow if you skip today, ${name}. A quick run keeps it.`,
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

  console.log(`[Notifications] Daily reminder scheduled in ${Math.round(dailySeconds / 3600)}h`);

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
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.length;
  } catch (e) {
    console.warn('[Notifications] getScheduledCount failed:', e);
    return 0;
  }
}
