import { MapId } from '../types';

export interface RadioTransmission {
  id: string;
  source: 'directorate' | 'freeband' | 'distress' | 'unknown' | 'aegis';
  title: string;
  content: string;
  /** If set, this transmission gives a gameplay effect for the day */
  effect?: {
    type: 'rare_boost' | 'scrap_bonus' | 'hp_regen' | 'whiff_reduction';
    mapId?: MapId;
    value: number;
    description: string;
  };
}

const TRANSMISSIONS: RadioTransmission[] = [
  // ─── DIRECTORATE (intercepted automated reports) ───
  {
    id: 'radio-dir-01',
    source: 'directorate',
    title: 'Enforcement Reallocation',
    content: 'Sector 12E: Non-compliant signal activity detected. Enforcement unit reallocation in progress. All personnel maintain current sweep pattern until further notice.',
  },
  {
    id: 'radio-dir-02',
    source: 'directorate',
    title: 'Patrol Route Update',
    content: 'AUTOMATED: Patrol grid 7-North adjusted. Units rerouted to southern perimeter. Overpass sector flagged LOW PRIORITY for 72 hours.',
    effect: {
      type: 'whiff_reduction',
      mapId: 'broken_overpass',
      value: 0.05,
      description: 'Directorate patrol pulled back from Overpass — 5% less whiff chance today',
    },
  },
  {
    id: 'radio-dir-03',
    source: 'directorate',
    title: 'Signal Anomaly Report',
    content: 'INTERNAL LOG: Unregistered scanning frequency detected in corridor 4-West. Pattern inconsistent with known operator rigs. Classify as anomalous. Flag for AEGIS review.',
  },
  {
    id: 'radio-dir-04',
    source: 'directorate',
    title: 'Compliance Bulletin',
    content: 'Directive 441-B: All operators found outside designated reclamation corridors will be processed under standing enforcement protocol. No exceptions. No appeals.',
  },
  {
    id: 'radio-dir-05',
    source: 'directorate',
    title: 'Asset Recovery Notice',
    content: 'Batch 7 pre-collapse hardware flagged for retrieval. Relay Field sector designated priority extraction zone. Non-compliant interference expected.',
    effect: {
      type: 'rare_boost',
      mapId: 'relay_field',
      value: 0.05,
      description: 'Relay Field signal interference down — +5% rare drop chance today',
    },
  },
  {
    id: 'radio-dir-06',
    source: 'directorate',
    title: 'Drone Maintenance Cycle',
    content: 'SYSLOG: Rogue drone units in sectors 3-7 entering scheduled maintenance downtime. Combat readiness reduced for 12-hour window. Do not deviate from patrol protocol.',
  },
  {
    id: 'radio-dir-07',
    source: 'directorate',
    title: 'Population Census Failure',
    content: 'INTERNAL: Census sweep returned 0 registered operators in grid 9-East. Expected count: 14. Either hardware failure or mass non-compliance. Escalating.',
  },

  // ─── FREEBAND (informal survivor chatter) ───
  {
    id: 'radio-fb-01',
    source: 'freeband',
    title: 'Overpass Cache Tip',
    content: "Anyone still running the overpass route? Found a sealed cache under the west ramp. Didn't open it — my rig's too banged up. Coordinates in the usual spot.",
  },
  {
    id: 'radio-fb-02',
    source: 'freeband',
    title: 'Supply Drop Rumor',
    content: "Word is someone left a supply stash near the old relay tower. Could be bait. Could be someone paying it forward. Either way — worth a look if you're desperate.",
    effect: {
      type: 'scrap_bonus',
      value: 2,
      description: 'Free Band supply cache tip — +2 bonus scrap per scan today',
    },
  },
  {
    id: 'radio-fb-03',
    source: 'freeband',
    title: 'Scanner Frequency Swap',
    content: "If you're pulling dead reads on standard freq, try shifting up 40MHz. Something changed in the atmosphere last night. My pulls went from garbage to gold.",
  },
  {
    id: 'radio-fb-04',
    source: 'freeband',
    title: 'Warning: New Drones',
    content: "Heads up — spotted armored drones in grid 5. Not the usual patrol junk. These ones are shielded. Don't waste ammo on the plating; wait for the scan window.",
  },
  {
    id: 'radio-fb-05',
    source: 'freeband',
    title: 'Camp Gossip',
    content: "Heard from Miko's crew that someone pulled pre-collapse tech out of the dead reactor zone. Unconfirmed. But Miko doesn't usually make things up. Usually.",
  },
  {
    id: 'radio-fb-06',
    source: 'freeband',
    title: 'Barter Rates',
    content: "Settlement's jacking up the scrap-to-supply ratio again. Four to one now. Might be worth hoarding for a few days if you're not bleeding out.",
  },
  {
    id: 'radio-fb-07',
    source: 'freeband',
    title: 'Streak Advice',
    content: "Old Kael says his rig reads sharper after day three. Something about consecutive ops aligning the scanner crystal. Sounds like superstition. But my pulls got better too.",
  },

  // ─── DISTRESS (one-off emergency calls) ───
  {
    id: 'radio-dist-01',
    source: 'distress',
    title: 'Relay Tech Voss',
    content: "This is relay tech Voss, sector 7G. My scanner's pulling something under the collapsed span — it's big. If anyone can hear this, I need—",
  },
  {
    id: 'radio-dist-02',
    source: 'distress',
    title: 'Unknown Operator',
    content: "— rover's dead. Took a hit from something in the fog. Not a drone. Not a storm. Something else. If you get this, stay out of grid 4-East after dark. Just stay out.",
  },
  {
    id: 'radio-dist-03',
    source: 'distress',
    title: 'Convoy Juliet',
    content: "Convoy Juliet to anyone on this freq — we're pinned at the bridge crossing. Three sentinels, maybe four. We've got wounded. We've got kids. Someone. Please.",
  },
  {
    id: 'radio-dist-04',
    source: 'distress',
    title: 'Signal Fragment',
    content: "...can't stop the bleeding... rig's still reading clean... if you find my pack, the codes are in the— [static]",
  },
  {
    id: 'radio-dist-05',
    source: 'distress',
    title: 'Buried Operator',
    content: "I'm under the rubble at waypoint Echo. Air's thin. Scanner picked up a massive cache before the ceiling came down. Coordinates are... 7... 14... east...",
    effect: {
      type: 'rare_boost',
      value: 0.03,
      description: 'Distress signal coordinates logged — +3% rare drop chance today',
    },
  },
  {
    id: 'radio-dist-06',
    source: 'distress',
    title: 'Last Transmission',
    content: "This is operator Sable. Day 47. If anyone finds this recording — don't go to the reactor core. What's down there isn't scrap. It's not anything I've seen before.",
  },
  {
    id: 'radio-dist-07',
    source: 'distress',
    title: 'Ambush Warning',
    content: "They're using a fake signal! Looks like a supply cache on your scanner but it's — [burst of static] — drones converge from all — [cut off]",
  },

  // ─── UNKNOWN (garbled, mysterious) ───
  {
    id: 'radio-unk-01',
    source: 'unknown',
    title: '47-Hour Pattern',
    content: '...frequency locked... pattern repeats every 47 hours... not Directorate... not human...',
  },
  {
    id: 'radio-unk-02',
    source: 'unknown',
    title: 'Mirror Signal',
    content: '...your last scan... replayed back to you... but the timestamp is from tomorrow... how is the timestamp from tomorrow...',
  },
  {
    id: 'radio-unk-03',
    source: 'unknown',
    title: 'Counting Down',
    content: '...seven... six... five... [long silence] ...five... five... five... [silence]',
  },
  {
    id: 'radio-unk-04',
    source: 'unknown',
    title: 'The Frequency',
    content: "...it hears when you scan... every read you pull, it records... don't know what it's building, but the pattern is getting more complex...",
  },
  {
    id: 'radio-unk-05',
    source: 'unknown',
    title: 'Clean Air',
    content: 'Atmospheric anomaly: localized oxygen concentration 23% above norm. Breathe deep. The world is not always poison.',
    effect: {
      type: 'hp_regen',
      value: 5,
      description: 'Clean air pocket detected — +5 HP restored',
    },
  },
  {
    id: 'radio-unk-06',
    source: 'unknown',
    title: 'Echo',
    content: '...operator... your designation... is not in our records... but your signal... we have been watching your signal for a very long time...',
  },
  {
    id: 'radio-unk-07',
    source: 'unknown',
    title: 'Dead Channel',
    content: '[40 seconds of silence, then a single tone at 440Hz, then silence again]',
  },

  // ─── AEGIS (rare system outputs) ───
  {
    id: 'radio-aegis-01',
    source: 'aegis',
    title: 'Threat Assessment',
    content: 'THREAT ASSESSMENT UPDATE: Non-compliant scanning activity in designated reclamation zones exceeds predicted models by 340%. Recommendation: escalation protocol WARDEN-7.',
  },
  {
    id: 'radio-aegis-02',
    source: 'aegis',
    title: 'Resource Allocation',
    content: 'RESOURCE REBALANCE: Scrap density in active sectors recalculated. Surplus detected in unmonitored grids. Deploying salvage drones to compensate.',
    effect: {
      type: 'scrap_bonus',
      value: 3,
      description: 'AEGIS rebalance glitch — +3 bonus scrap per scan today',
    },
  },
  {
    id: 'radio-aegis-03',
    source: 'aegis',
    title: 'Pattern Recognition',
    content: 'OPERATOR PATTERN ANALYSIS: Subject exhibits non-random scanning behavior. Cognitive baseline exceeds standard non-compliant profile. Monitoring escalated to ACTIVE.',
  },
  {
    id: 'radio-aegis-04',
    source: 'aegis',
    title: 'System Status',
    content: 'NETWORK STATUS: 7 of 12 relay nodes offline. Remaining nodes operating at 43% capacity. Estimated full restoration: UNDEFINED. Override authority: NONE.',
  },
  {
    id: 'radio-aegis-05',
    source: 'aegis',
    title: 'Reclamation Index',
    content: 'RECLAMATION INDEX: Current recovery rate 0.02% of pre-collapse infrastructure per annum. At present rate, full restoration requires approximately 5,000 years. This is within acceptable parameters.',
    effect: {
      type: 'whiff_reduction',
      value: 0.04,
      description: 'AEGIS relay degradation — 4% less whiff chance today',
    },
  },
];

/**
 * Deterministically pick a daily transmission based on day number.
 * Same day = same transmission for all players.
 * Simple hash to avoid sequential cycling.
 */
export function getDailyTransmission(dayNumber: number): RadioTransmission {
  // Simple deterministic hash: multiply by prime, mod by array length
  const hash = ((dayNumber * 2654435761) >>> 0) % TRANSMISSIONS.length;
  return TRANSMISSIONS[hash];
}
