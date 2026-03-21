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
      brief: `Finish ${ss.currentSector.name}.`,
      context: `${totalTiles - tilesCleared} tiles left. Push through.`,
    };
  }

  // Pathfinder close to unlock
  if (hasComponents && componentsNeeded <= 2) {
    return {
      brief: 'Hunt relic fragments.',
      context: `${componentsNeeded} more component${componentsNeeded > 1 ? 's' : ''} unlocks the Pathfinder Module. Run Gambits.`,
    };
  }

  // Streak at risk (day 1 — just started or just lost it)
  if (ss.streakDay === 1) {
    return {
      brief: 'Build your streak.',
      context: 'Day 1. Every consecutive day sharpens your signal.',
    };
  }

  // High streak — protect it
  if (ss.streakDay >= 5) {
    return {
      brief: 'Protect the streak.',
      context: `Day ${ss.streakDay}. Your reads are sharper than most will ever get.`,
    };
  }

  // Mid-sector push
  if (pct >= 0.4 && pct < 0.8) {
    return {
      brief: `Push deeper into ${ss.currentSector.name}.`,
      context: `${Math.round(pct * 100)}% mapped. The harder signals are ahead.`,
    };
  }

  // Early sector — explore
  if (pct < 0.4) {
    return {
      brief: 'Read the sector.',
      context: `${ss.currentSector.name} is mostly uncharted. Start pulling signal.`,
    };
  }

  // Sector done — generic
  return {
    brief: 'Run your scans.',
    context: 'Every day on the Trail is earned, not given.',
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
