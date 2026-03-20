import { useCallback } from 'react';
import { GameEvent, EventChoice, EventOutcome, TrailOutcome, ChoiceRisk, OutcomeQuality, GameState } from '../types';
import { useGame } from '../context/GameContext';
import zone01Events from '../data/events';

/**
 * Risk-Weighted Outcome Roll
 *
 * Each choice has a risk level that determines the variance of outcomes:
 *   safe     → 60% GOOD, 35% NEUTRAL,  5% BAD
 *   moderate → 35% GOOD, 40% NEUTRAL, 25% BAD
 *   risky    → 25% GOOD, 25% NEUTRAL, 50% BAD  (but GOOD outcomes are amplified)
 *   reckless → 15% GOOD, 15% NEUTRAL, 70% BAD  (but GOOD outcomes are greatly amplified)
 *
 * The roll is hidden — the player never sees percentages.
 */
function getOutcomeQuality(risk: ChoiceRisk): OutcomeQuality {
  const roll = Math.random();
  switch (risk) {
    case 'safe':
      if (roll < 0.60) return 'GOOD';
      if (roll < 0.95) return 'NEUTRAL';
      return 'BAD';
    case 'moderate':
      if (roll < 0.35) return 'GOOD';
      if (roll < 0.75) return 'NEUTRAL';
      return 'BAD';
    case 'risky':
      if (roll < 0.25) return 'GOOD';
      if (roll < 0.50) return 'NEUTRAL';
      return 'BAD';
    case 'reckless':
      if (roll < 0.15) return 'GOOD';
      if (roll < 0.30) return 'NEUTRAL';
      return 'BAD';
  }
}

/**
 * Apply outcome quality modifications to the base outcome.
 * GOOD: bonus resources, override narration if available.
 * NEUTRAL: base outcome as-is.
 * BAD: extra damage/resource loss, override narration if available.
 */
function applyQualityToOutcome(
  baseOutcome: EventOutcome,
  quality: OutcomeQuality,
  risk: ChoiceRisk,
): EventOutcome {
  const modified = { ...baseOutcome };

  if (quality === 'GOOD') {
    if (baseOutcome.goodNarration) modified.narration = baseOutcome.goodNarration;
    if (baseOutcome.goodBonus) {
      const bonus = baseOutcome.goodBonus;
      modified.resourceChanges = { ...modified.resourceChanges };
      if (bonus.scrap) modified.resourceChanges.scrap = (modified.resourceChanges.scrap ?? 0) + bonus.scrap;
      if (bonus.supplies) modified.resourceChanges.supplies = (modified.resourceChanges.supplies ?? 0) + bonus.supplies;
    }
    // Risky/reckless GOOD outcomes give amplified base rewards
    if (risk === 'risky' || risk === 'reckless') {
      if (modified.heal) modified.heal = Math.ceil(modified.heal * 1.5);
      if (modified.resourceChanges?.scrap && modified.resourceChanges.scrap > 0) {
        modified.resourceChanges.scrap = Math.ceil(modified.resourceChanges.scrap * 1.5);
      }
    }
  } else if (quality === 'BAD') {
    if (baseOutcome.badNarration) modified.narration = baseOutcome.badNarration;
    if (baseOutcome.badPenalty) {
      if (baseOutcome.badPenalty.damage) {
        modified.damage = (modified.damage ?? 0) + baseOutcome.badPenalty.damage;
      }
      if (baseOutcome.badPenalty.resourceChanges) {
        modified.resourceChanges = { ...modified.resourceChanges };
        const pen = baseOutcome.badPenalty.resourceChanges;
        if (pen.scrap) modified.resourceChanges.scrap = (modified.resourceChanges.scrap ?? 0) + pen.scrap;
        if (pen.supplies) modified.resourceChanges.supplies = (modified.resourceChanges.supplies ?? 0) + pen.supplies;
      }
    }
    // Even without explicit badPenalty, risky/reckless BAD outcomes amplify existing damage
    if ((risk === 'risky' || risk === 'reckless') && modified.damage) {
      modified.damage = Math.ceil(modified.damage * 1.5);
    }
  }

  return modified;
}

/**
 * Check if the player meets the requirements for a choice.
 */
function choiceAvailable(choice: EventChoice, state: GameState): boolean {
  if (choice.requiresItem && !state.resources.specialLoot.includes(choice.requiresItem)) return false;
  if (choice.requiresFlag && !state.alignmentFlags.includes(choice.requiresFlag)) return false;
  if (choice.requiresEquipped) {
    const eq = choice.requiresEquipped;
    for (const [slot, itemId] of Object.entries(eq)) {
      if ((state.equipped as any)[slot] !== itemId) return false;
    }
  }
  if (choice.requiresMinAlignment) {
    const req = choice.requiresMinAlignment;
    if (req.directorate !== undefined && state.alignment.directorate < req.directorate) return false;
    if (req.freeBands !== undefined && state.alignment.freeBands < req.freeBands) return false;
    if (req.raiders !== undefined && state.alignment.raiders < req.raiders) return false;
  }
  return true;
}

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
   * Check which choices are available for the current state.
   */
  const getAvailableChoices = useCallback(
    (event: GameEvent): EventChoice[] => {
      return event.choices.filter((c) => choiceAvailable(c, state));
    },
    [state]
  );

  /**
   * Roll for outcome quality based on choice risk, then apply modified outcome.
   * Returns { quality, modifiedOutcome } so the UI can display the tier badge.
   */
  const rollAndApply = useCallback(
    (eventId: string, choice: EventChoice): { quality: OutcomeQuality; outcome: EventOutcome } => {
      const risk = choice.riskLevel ?? 'moderate';
      const quality = getOutcomeQuality(risk);
      const modifiedOutcome = applyQualityToOutcome(choice.outcome, quality, risk);

      return { quality, outcome: modifiedOutcome };
    },
    []
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

  return { getEventForNode, getAvailableChoices, rollAndApply, applyOutcome, applyTrailOutcome };
}
