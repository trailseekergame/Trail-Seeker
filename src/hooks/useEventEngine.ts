import { useCallback } from 'react';
import { GameEvent, EventChoice, EventOutcome, TrailOutcome } from '../types';
import { useGame } from '../context/GameContext';
import zone01Events from '../data/events';

/**
 * Event Engine Hook
 * Selects events based on current node and game state, applies outcomes.
 */
export function useEventEngine() {
  const { state, dispatch } = useGame();

  /**
   * Get a random event for the current node.
   * Filters by node-specific events first, then generic events.
   * Avoids repeating one-time events.
   */
  const getEventForNode = useCallback(
    (nodeId: string): GameEvent | null => {
      // Helper: check if event passes conditional requirements
      const passesConditions = (e: GameEvent): boolean => {
        if (e.requiresFlags) {
          for (const flag of e.requiresFlags) {
            if (!state.alignmentFlags.includes(flag)) return false;
          }
        }
        if (e.requiresAlignment) {
          const req = e.requiresAlignment;
          if (req.directorate !== undefined && state.alignment.directorate < req.directorate) return false;
          if (req.freeBands !== undefined && state.alignment.freeBands < req.freeBands) return false;
          if (req.raiders !== undefined && state.alignment.raiders < req.raiders) return false;
        }
        return true;
      };

      // Filter valid events
      const nodeSpecific = zone01Events.filter((e) => {
        if (e.oneTime && state.completedEventIds.includes(e.id)) return false;
        if (!passesConditions(e)) return false;
        return e.nodeIds && e.nodeIds.includes(nodeId);
      });

      const generic = zone01Events.filter((e) => {
        if (e.oneTime && state.completedEventIds.includes(e.id)) return false;
        if (!passesConditions(e)) return false;
        return !e.nodeIds || e.nodeIds.length === 0;
      });

      // 70% chance to pick a node-specific event if available
      const pool = nodeSpecific.length > 0 && Math.random() < 0.7 ? nodeSpecific : generic;

      if (pool.length === 0) return null;

      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx];
    },
    [state.completedEventIds, state.alignmentFlags, state.alignment]
  );

  /**
   * Apply the outcome of a chosen event option.
   */
  const applyOutcome = useCallback(
    (eventId: string, outcome: EventOutcome) => {
      // Resource changes
      if (outcome.resourceChanges) {
        dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: outcome.resourceChanges });
      }

      // Damage
      if (outcome.damage) {
        dispatch({ type: 'TAKE_DAMAGE', payload: outcome.damage });
        // Also damage rover slightly
        dispatch({ type: 'DAMAGE_ROVER', payload: Math.floor(outcome.damage / 2) });
      }

      // Heal
      if (outcome.heal) {
        dispatch({ type: 'HEAL', payload: outcome.heal });
      }

      // Move player
      if (outcome.movePlayer) {
        // This would need zone data to determine next/prev node
        // For now, we handle it in the Trail screen
      }

      // Codex unlocks
      if (outcome.unlockCodex && outcome.unlockCodex.length > 0) {
        dispatch({ type: 'UNLOCK_CODEX', payload: outcome.unlockCodex });
      }

      // Cosmetic unlock
      if (outcome.unlockCosmetic) {
        dispatch({ type: 'UNLOCK_COSMETIC', payload: outcome.unlockCosmetic });
      }

      // Items
      if (outcome.addItem) {
        dispatch({ type: 'ADD_SPECIAL_LOOT', payload: outcome.addItem });
      }
      if (outcome.removeItem) {
        dispatch({ type: 'REMOVE_SPECIAL_LOOT', payload: outcome.removeItem });
      }

      // Alignment changes
      if (outcome.alignmentChanges) {
        dispatch({ type: 'ADJUST_ALIGNMENT', payload: outcome.alignmentChanges });
      }

      // Alignment flags
      if (outcome.setFlags) {
        for (const flag of outcome.setFlags) {
          dispatch({ type: 'SET_ALIGNMENT_FLAG', payload: flag });
        }
      }

      // Mark one-time events as completed
      const event = zone01Events.find((e) => e.id === eventId);
      if (event?.oneTime) {
        dispatch({ type: 'COMPLETE_EVENT', payload: eventId });
      }
    },
    [dispatch]
  );

  /**
   * Apply the effects of a trail move outcome (from the outcome deck).
   */
  const applyTrailOutcome = useCallback(
    (outcome: TrailOutcome) => {
      if (outcome.resourceChanges) {
        dispatch({ type: 'APPLY_RESOURCE_CHANGES', payload: outcome.resourceChanges });
      }
      if (outcome.damage) {
        dispatch({ type: 'TAKE_DAMAGE', payload: outcome.damage });
        dispatch({ type: 'DAMAGE_ROVER', payload: Math.floor(outcome.damage / 2) });
      }
      if (outcome.heal) {
        dispatch({ type: 'HEAL', payload: outcome.heal });
      }
      if (outcome.addItem) {
        dispatch({ type: 'ADD_SPECIAL_LOOT', payload: outcome.addItem });
      }
    },
    [dispatch]
  );

  return { getEventForNode, applyOutcome, applyTrailOutcome };
}
