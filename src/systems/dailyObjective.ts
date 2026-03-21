import { SeekerScanState, ScanResult } from '../types';

/**
 * Generates a contextual daily objective based on current game state.
 * Pure flavor — no mechanical rewards. Just gives the session a narrative frame.
 */

interface DailyObjective {
  brief: string;       // Short imperative shown at session start
  context: string;     // 1-line supporting detail
}

export function getDailyObjective(ss: SeekerScanState): DailyObjective {
  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;
  const totalTiles = ss.currentSector.tiles.length || 25;
  const pct = tilesCleared / totalTiles;
  const hasComponents = ss.pathfinderComponents > 0 && !ss.pathfinderUnlocked;
  const componentsNeeded = 4 - ss.pathfinderComponents;

  // Priority-ordered objectives based on state
  // Sector nearly complete
  if (pct >= 0.8 && !ss.currentSector.completed) {
    return {
      brief: `Clean out ${ss.currentSector.name}.`,
      context: `${totalTiles - tilesCleared} tiles left. Strip it before the Directorate re-flags the zone.`,
    };
  }

  // Pathfinder close to unlock
  if (hasComponents && componentsNeeded <= 2) {
    return {
      brief: 'Pull relic fragments.',
      context: `${componentsNeeded} more and the Pathfinder Module goes live. Push Gambits.`,
    };
  }

  // Streak at risk (day 1 — just started or just lost it)
  if (ss.streakDay === 1) {
    return {
      brief: 'Start a run streak.',
      context: 'Day 1. Show up consecutive and the reads get sharper.',
    };
  }

  // High streak — protect it
  if (ss.streakDay >= 5) {
    return {
      brief: 'Keep the streak alive.',
      context: `Day ${ss.streakDay}. Your rig is dialed in. Don't let it cool off.`,
    };
  }

  // Mid-sector push
  if (pct >= 0.4 && pct < 0.8) {
    return {
      brief: `Work deeper into ${ss.currentSector.name}.`,
      context: `${Math.round(pct * 100)}% stripped. The deeper signals are the ones worth running.`,
    };
  }

  // Early sector — explore
  if (pct < 0.4) {
    return {
      brief: 'Crack the sector open.',
      context: `${ss.currentSector.name} — mostly dark. Start pulling what you can.`,
    };
  }

  // Sector done — generic
  return {
    brief: 'Run your scans.',
    context: 'The window\'s open. Use it.',
  };
}

/**
 * Generates a 1-2 line session summary based on what actually happened.
 */
export function getSessionSummary(
  results: ScanResult[],
  sectorName: string,
  objective: DailyObjective,
): string {
  if (results.length === 0) return 'Nothing scanned. The Trail waits.';

  const whiffs = results.filter(r => r.outcome === 'whiff').length;
  const rares = results.filter(r => ['rare', 'legendary', 'component'].includes(r.outcome)).length;
  const tilesGained = results.reduce((sum, r) => sum + r.sectorProgress, 0);
  const total = results.length;

  // Build summary based on what stood out
  const parts: string[] = [];

  // Headline stat
  if (rares >= 2) {
    parts.push(`${rares} buried caches pulled from the static.`);
  } else if (rares === 1) {
    const rareResult = results.find(r => ['rare', 'legendary', 'component'].includes(r.outcome));
    if (rareResult?.outcome === 'legendary') {
      parts.push('Pre-collapse tech. The real thing.');
    } else if (rareResult?.outcome === 'component') {
      parts.push('Relic fragment recovered. The Pathfinder gets closer.');
    } else {
      parts.push('Found something worth keeping in the wreckage.');
    }
  } else if (whiffs > total / 2) {
    parts.push('Rough day. More dead air than signal.');
  } else {
    parts.push(`${total} scans. ${tilesGained} tiles of ground covered.`);
  }

  // Kicker
  if (whiffs === 0) {
    parts.push('Clean run. No dead signals.');
  } else if (whiffs >= 3) {
    parts.push('The static was thick today.');
  }

  return parts.join(' ');
}

/**
 * Generates a short "unfinished business" line that gives a reason to return.
 * Based on current state after the session ends.
 */
export function getReturnHook(ss: SeekerScanState): string {
  const tilesCleared = ss.currentSector.tiles.filter(t => t.cleared).length;
  const totalTiles = ss.currentSector.tiles.length || 25;
  const pct = tilesCleared / totalTiles;
  const hasComponents = ss.pathfinderComponents > 0 && !ss.pathfinderUnlocked;
  const componentsNeeded = 4 - ss.pathfinderComponents;

  // Near sector complete
  if (pct >= 0.7 && !ss.currentSector.completed) {
    return `${totalTiles - tilesCleared} tiles left in ${ss.currentSector.name}. Almost stripped clean.`;
  }

  // Pathfinder progress
  if (hasComponents && componentsNeeded <= 2) {
    return `${componentsNeeded} relic fragment${componentsNeeded > 1 ? 's' : ''} from unlocking the Pathfinder. Run Gambits tomorrow.`;
  }

  // Streak building
  if (ss.streakDay < 3) {
    return 'Come back tomorrow. The streak is just starting to sharpen.';
  }

  // High streak
  if (ss.streakDay >= 5) {
    return `Day ${ss.streakDay} streak. Miss tomorrow and the rig cools off.`;
  }

  // Mid-sector
  if (pct >= 0.3 && pct < 0.7) {
    return `${ss.currentSector.name} is ${Math.round(pct * 100)}% mapped. Deeper signals are waiting.`;
  }

  // Default
  return 'Signal resets at dawn. The sector isn\'t going anywhere.';
}
