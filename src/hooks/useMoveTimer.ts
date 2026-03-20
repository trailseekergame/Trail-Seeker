import { useEffect, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { MOVE_REFRESH_MS, MAX_FREE_MOVES } from '../types';

/**
 * Hook to manage the 24-hour move refresh timer.
 * Returns time remaining until next refresh.
 */
export function useMoveTimer() {
  const { state, dispatch } = useGame();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [canRefresh, setCanRefresh] = useState(false);

  const checkRefresh = useCallback(() => {
    const elapsed = Date.now() - state.lastMoveRefresh;
    if (elapsed >= MOVE_REFRESH_MS && state.movesRemaining < MAX_FREE_MOVES) {
      dispatch({ type: 'REFRESH_MOVES' });
      dispatch({ type: 'INCREMENT_DAY' });
      setCanRefresh(false);
      return;
    }

    const remaining = MOVE_REFRESH_MS - elapsed;
    if (remaining <= 0) {
      setCanRefresh(true);
      setTimeRemaining('Ready!');
    } else {
      setCanRefresh(false);
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setTimeRemaining(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }
  }, [state.lastMoveRefresh, state.movesRemaining, dispatch]);

  useEffect(() => {
    checkRefresh();
    const interval = setInterval(checkRefresh, 1000);
    return () => clearInterval(interval);
  }, [checkRefresh]);

  return { timeRemaining, canRefresh, movesRemaining: state.movesRemaining };
}
