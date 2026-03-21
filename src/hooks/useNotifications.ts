import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useGame } from '../context/GameContext';
import {
  configureNotifications,
  requestPermissions,
  scheduleReminders,
  cancelAllReminders,
} from '../services/notifications';

/**
 * Hook that manages the notification lifecycle:
 * - Configures notification handling on mount
 * - Requests permissions once
 * - Cancels pending reminders when app becomes active (player is here)
 * - Schedules new reminders when app goes to background (player left)
 */
export function useNotifications(): void {
  const { state } = useGame();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const initialized = useRef(false);
  const stateRef = useRef(state);

  // Keep stateRef current so the background handler has latest game state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    // One-time setup
    if (!initialized.current) {
      initialized.current = true;

      try {
        configureNotifications();
      } catch (e) {
        console.warn('[Notifications] Configure failed (Expo Go limitation):', e);
      }

      // Request permissions (non-blocking, respects OS settings)
      requestPermissions().then((granted) => {
        if (granted) {
          console.log('[Notifications] Permissions granted');
        }
      }).catch((e) => {
        console.warn('[Notifications] Permission request failed (Expo Go limitation):', e);
      });

      // Player just opened the app — cancel any pending reminders
      cancelAllReminders().catch(() => {});
    }

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appState.current.match(/active/) &&
        nextState.match(/inactive|background/)
      ) {
        // App going to background → schedule reminders
        scheduleReminders(stateRef.current).catch((e) =>
          console.error('[Notifications] Failed to schedule:', e)
        );
      }

      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // App coming to foreground → cancel reminders (player is back)
        cancelAllReminders().catch((e) =>
          console.error('[Notifications] Failed to cancel:', e)
        );
      }

      appState.current = nextState;
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
