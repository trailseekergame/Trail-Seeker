import { SeekerScanState, ScanResult, GearSlotId } from '../types';

/**
 * Session Logger — Outputs scan breakdown to console for balancing.
 * Call at the end of each daily session.
 */
export function logSessionSummary(ss: SeekerScanState): void {
  const results = ss.sessionResults;
  if (results.length === 0) {
    console.log('[Session] No scans this session.');
    return;
  }

  // Count by scan type
  const byType = { scout: 0, seeker: 0, gambit: 0 };
  results.forEach(r => byType[r.scanType]++);

  // Count by outcome
  const byOutcome: Record<string, number> = {};
  results.forEach(r => {
    byOutcome[r.outcome] = (byOutcome[r.outcome] || 0) + 1;
  });

  // Gear procs
  const droneProcs = results.filter(r => r.droneProc).length;
  const bootsProcs = results.filter(r => r.bootsProc).length;
  const cortexProcs = results.filter(r => r.cortexProc).length;
  const opticsProcs = results.filter(r => r.opticsProc).length;

  // Sector progress
  const totalProgress = results.reduce((sum, r) => sum + r.sectorProgress, 0);

  // Whiff rate by type
  const gambitResults = results.filter(r => r.scanType === 'gambit');
  const gambitWhiffs = gambitResults.filter(r => r.outcome === 'whiff').length;
  const seekerResults = results.filter(r => r.scanType === 'seeker');
  const seekerWhiffs = seekerResults.filter(r => r.outcome === 'whiff').length;

  const lines = [
    '═══════════════════════════════════════',
    '  TRAIL SEEKER — SESSION LOG',
    '═══════════════════════════════════════',
    '',
    `Streak Day:    ${ss.streakDay}`,
    `Active Gear:   ${ss.activeGearSlots.join(', ')}`,
    `Total Scans:   ${results.length} / ${ss.scansTotal} available`,
    '',
    '── SCAN TYPE BREAKDOWN ──',
    `Scout:    ${byType.scout}`,
    `Seeker:   ${byType.seeker}`,
    `Gambit:   ${byType.gambit}`,
    '',
    '── OUTCOME BREAKDOWN ──',
    `Whiff:      ${byOutcome['whiff'] || 0}`,
    `Common:     ${byOutcome['common'] || 0}`,
    `Uncommon:   ${byOutcome['uncommon'] || 0}`,
    `Rare:       ${byOutcome['rare'] || 0}`,
    `Legendary:  ${byOutcome['legendary'] || 0}`,
    `Component:  ${byOutcome['component'] || 0}`,
    '',
    '── WHIFF RATES ──',
    `Seeker:  ${seekerResults.length > 0 ? Math.round(seekerWhiffs / seekerResults.length * 100) : 0}% (${seekerWhiffs}/${seekerResults.length})`,
    `Gambit:  ${gambitResults.length > 0 ? Math.round(gambitWhiffs / gambitResults.length * 100) : 0}% (${gambitWhiffs}/${gambitResults.length})`,
    '',
    '── GEAR PROCS ──',
    `Drone refunds:  ${droneProcs}`,
    `Boots bonus:    ${bootsProcs}`,
    `Cortex boost:   ${cortexProcs}`,
    `Optics boost:   ${opticsProcs}`,
    '',
    `Sector Progress: +${totalProgress} tiles`,
    '═══════════════════════════════════════',
  ];

  console.log(lines.join('\n'));
}

/**
 * Log a single Gambit scan for granular balancing.
 */
export function logGambitResult(result: ScanResult, streakDay: number, gear: GearSlotId[]): void {
  if (result.scanType !== 'gambit') return;
  console.log(
    `[Gambit] Day${streakDay} | Gear: ${gear.join(',')} | ` +
    `${result.outcome === 'whiff' ? 'WHIFF' : result.outcome.toUpperCase()}` +
    `${result.lootName ? ` (${result.lootName})` : ''}` +
    `${result.droneProc ? ' [DRONE SAVED]' : ''}` +
    ` | +${result.sectorProgress} tiles`
  );
}
