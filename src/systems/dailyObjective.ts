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
    parts.push(`${rares} rare+ pulls. The sector gave up something real today.`);
  } else if (rares === 1) {
    const rareResult = results.find(r => ['rare', 'legendary', 'component'].includes(r.outcome));
    if (rareResult?.outcome === 'legendary') {
      parts.push('Pre-collapse tech recovered. Worth every scan you burned.');
    } else if (rareResult?.outcome === 'component') {
      parts.push('Relic fragment secured. The Pathfinder module is closer.');
    } else {
      parts.push('Pulled something real from the wreckage.');
    }
  } else if (whiffs > total / 2) {
    parts.push('Rough run. More dead air than signal. It happens.');
  } else {
    parts.push(`${tilesGained} tiles of ground covered. Slow and steady.`);
  }

  // Kicker
  if (whiffs === 0 && total >= 3) {
    parts.push('Clean sweep. Not a single dead signal.');
  } else if (whiffs >= 3) {
    parts.push('The static hit hard today. Better luck tomorrow.');
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

  // Near sector complete — completion pull
  if (pct >= 0.7 && !ss.currentSector.completed) {
    return `${totalTiles - tilesCleared} tiles left. One more session strips ${ss.currentSector.name} clean.`;
  }

  // Pathfinder progress — collectible pull
  if (hasComponents && componentsNeeded <= 2) {
    return `${componentsNeeded} fragment${componentsNeeded > 1 ? 's' : ''} from unlocking the Pathfinder. Gambits drop them.`;
  }

  // Streak building — loss aversion
  if (ss.streakDay < 3) {
    return 'Streak is fragile. Show up tomorrow and the reads get sharper.';
  }

  // High streak — loss aversion, strong
  if (ss.streakDay >= 5) {
    return `Day ${ss.streakDay} streak. Miss tomorrow and it resets to zero.`;
  }

  // Mid-sector — curiosity pull
  if (pct >= 0.3 && pct < 0.7) {
    return `${Math.round(pct * 100)}% mapped. The deeper tiles hit different.`;
  }

  // Default — simple pull
  return 'Signal resets at dawn. What you don\'t scan, someone else will.';
}
