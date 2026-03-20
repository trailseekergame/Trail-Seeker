import { GameEvent } from '../types';

/**
 * Zone 01 Events – Rustbelt Verge
 * Data-driven event pool. Each event can be scoped to specific nodes or left generic.
 */
const zone01Events: GameEvent[] = [
  // ─── ENCOUNTERS ───
  {
    id: 'evt-reaver-scouts',
    title: 'Reaver Scouts',
    category: 'encounter',
    narration:
      'Two figures peel out from behind a wrecked tanker, scrap-armor stitched together from license plates and riot shields. Reaver Scouts — young, desperate, and riding the edge between thrill and hunger. Your rover emits a warning chirp as they fan out, one high on the overpass, one low along the cracked shoulder.',
    choices: [
      {
        id: 'fight',
        text: 'Stand your ground and fight.',
        outcome: {
          narration:
            'You fire a burst from your sidearm. One scout drops; the other retreats into the wreckage. You salvage a handful of parts from the fallen one.',
          resourceChanges: { scrap: 8 },
          damage: 10,
          unlockCodex: ['codex-enemy-reavers'],
        },
      },
      {
        id: 'evade',
        text: 'Cut through the debris field and lose them.',
        outcome: {
          narration:
            'Your rover\'s thrusters kick dust into their visors. You slip through a gap in the wreckage and leave them cursing behind you.',
          resourceChanges: { supplies: -2 },
          unlockCodex: ['codex-enemy-reavers'],
        },
      },
      {
        id: 'bribe',
        text: 'Toss them some scrap and back away.',
        outcome: {
          narration:
            'You throw a pouch of parts at their feet. They rummage through it, grunting approval, and wave you on. Costly, but clean.',
          resourceChanges: { scrap: -5 },
        },
      },
    ],
  },
  {
    id: 'evt-trail-taxmen',
    title: 'Trail Taxmen',
    category: 'encounter',
    nodeIds: ['node-03'],
    narration:
      'A Directorate checkpoint. Two Trail Taxmen in cracked riot visors step into the road, scanner wands humming. "Identification and toll, drifter."',
    choices: [
      {
        id: 'pay',
        text: 'Pay the toll quietly.',
        outcome: {
          narration: 'You hand over the scrap. They scan you, note your rover class, and wave you through. Business as usual on the Directorate\'s highway.',
          resourceChanges: { scrap: -8 },
          unlockCodex: ['codex-faction-directorate'],
        },
      },
      {
        id: 'bluff',
        text: 'Flash a fake transit chip and bluff through.',
        outcome: {
          narration:
            'Your chip reads green — barely. The Taxman squints at you but steps aside. "Move along." Your heart rate doesn\'t normalize for another mile.',
          unlockCodex: ['codex-faction-directorate'],
        },
      },
      {
        id: 'run',
        text: 'Gun the rover and blow past them.',
        outcome: {
          narration:
            'Tires screech. A scanner blast tags your rover\'s hull — you\'ll have a bounty flag in this zone now. But you\'re through.',
          damage: 5,
          movePlayer: 1,
          unlockCodex: ['codex-faction-directorate'],
        },
      },
    ],
  },
  {
    id: 'evt-survey-drone',
    title: 'Survey Drone Swarm',
    category: 'hazard',
    nodeIds: ['node-07'],
    narration:
      'A cluster of Directorate survey drones descends from the cloud cover, scanning everything. Their red sensor beams sweep toward you.',
    choices: [
      {
        id: 'hide',
        text: 'Kill the rover\'s power and hide.',
        outcome: {
          narration:
            'You flatten against a concrete slab, rover powered down. The drones sweep overhead, sensors probing. After an agonizing minute, they drift east. You\'re clear.',
          resourceChanges: { supplies: -1 },
          unlockCodex: ['codex-enemy-drones'],
        },
      },
      {
        id: 'jam',
        text: 'Use your rover\'s signal jammer.',
        outcome: {
          narration:
            'The jammer hums. Drones stutter, their formation breaking. Two spiral into the ground. You grab a salvageable sensor core before the rest regroup.',
          resourceChanges: { scrap: 5 },
          damage: 3,
          unlockCodex: ['codex-enemy-drones'],
          addItem: 'Drone Sensor Core',
        },
      },
    ],
  },
  {
    id: 'evt-glassborn-teaser',
    title: 'Something in the Haze',
    category: 'encounter',
    nodeIds: ['node-06', 'node-07'],
    oneTime: true,
    narration:
      'The air shimmers. Through the chemical haze, you see a shape — not human, not machine. It moves like liquid mercury, with limbs that refract light. It watches you. Then it\'s gone.',
    choices: [
      {
        id: 'investigate',
        text: 'Follow the shimmer.',
        outcome: {
          narration:
            'You creep forward. Where the shape stood, the ground is fused — glass-smooth and warm. Your rover\'s Geiger clicks nervously. Whatever that was, it\'s beyond anything you\'ve seen.',
          unlockCodex: ['codex-enemy-glassborn'],
          damage: 5,
        },
      },
      {
        id: 'retreat',
        text: 'Back away slowly.',
        outcome: {
          narration:
            'Smart. You reverse course, keeping your eyes on the haze. The shape doesn\'t follow — this time. You make a note in your codex: "Glassborn?"',
          unlockCodex: ['codex-enemy-glassborn'],
        },
      },
    ],
  },

  // ─── DISCOVERY ───
  {
    id: 'evt-supply-cache',
    title: 'Hidden Supply Cache',
    category: 'discovery',
    narration:
      'Behind a false wall in an abandoned utility room, you find a pre-collapse supply cache. Dusty but intact. MREs, water filters, a first-aid module.',
    choices: [
      {
        id: 'take-all',
        text: 'Take everything.',
        outcome: {
          narration: 'You load up the rover. The supplies are old but usable. A good find.',
          resourceChanges: { supplies: 8 },
        },
      },
      {
        id: 'take-some',
        text: 'Take half and leave the rest for others.',
        outcome: {
          narration:
            'You take what you need and mark the cache with a Lantern symbol. Maybe someone else will need it more.',
          resourceChanges: { supplies: 4 },
          unlockCodex: ['codex-faction-lanterns'],
        },
      },
    ],
  },
  {
    id: 'evt-scrap-deposit',
    title: 'Scrap Deposit',
    category: 'discovery',
    nodeIds: ['node-01', 'node-06'],
    narration:
      'A collapsed section of factory floor has exposed a vein of usable scrap — circuit boards, copper wiring, intact servos. Your rover\'s drill attachment could extract it.',
    choices: [
      {
        id: 'extract',
        text: 'Spend time extracting.',
        outcome: {
          narration:
            'An hour of careful drilling yields a solid haul. Your rover\'s cargo bay is heavier, but so is your wallet.',
          resourceChanges: { scrap: 12, supplies: -2 },
        },
      },
      {
        id: 'skip',
        text: 'Not worth the risk. Move on.',
        outcome: {
          narration: 'You mark the location on your map and move on. Maybe on the way back.',
        },
      },
    ],
  },

  // ─── TRADE ───
  {
    id: 'evt-iron-caravan',
    title: 'Iron Caravan Traders',
    category: 'trade',
    nodeIds: ['node-02', 'node-05'],
    narration:
      'A rumbling convoy of armored trucks — the Iron Caravan. Their lead driver leans out and waves. "Got goods, drifter. Fair prices. Mostly."',
    choices: [
      {
        id: 'trade-scrap',
        text: 'Trade 10 scrap for 6 supplies.',
        outcome: {
          narration: 'A fair deal. The Caravan mechanic even throws in a filter cartridge.',
          resourceChanges: { scrap: -10, supplies: 6 },
          unlockCodex: ['codex-faction-iron-caravan'],
        },
      },
      {
        id: 'trade-info',
        text: 'Trade information about the road ahead.',
        outcome: {
          narration:
            'You share what you\'ve seen. In return, the driver marks two safe camps on your map and gives you a small pouch of parts.',
          resourceChanges: { scrap: 3 },
          unlockCodex: ['codex-faction-iron-caravan'],
        },
      },
      {
        id: 'decline',
        text: 'No thanks. Keep moving.',
        outcome: {
          narration: 'The driver shrugs. "Your loss, drifter. Trail\'s long." The convoy rolls on.',
        },
      },
    ],
  },
  {
    id: 'evt-lantern-camp',
    title: 'Lantern Signal Fire',
    category: 'trade',
    nodeIds: ['node-04'],
    narration:
      'A signal fire burns atop the overpass — the Lanterns. A hooded figure beckons. "Rest here, friend. We ask only that you share what you can spare."',
    choices: [
      {
        id: 'share',
        text: 'Share some supplies and rest.',
        outcome: {
          narration:
            'You share a meal and sleep under guard. The Lanterns mend a crack in your rover\'s hull while you rest. Kindness still exists on the Trail.',
          resourceChanges: { supplies: -3 },
          heal: 15,
          unlockCodex: ['codex-faction-lanterns'],
        },
      },
      {
        id: 'rest-only',
        text: 'Rest but keep your supplies.',
        outcome: {
          narration:
            'They let you rest, but the warmth is noticeably less. Still — a safe night on the Trail is worth something.',
          heal: 5,
          unlockCodex: ['codex-faction-lanterns'],
        },
      },
    ],
  },

  // ─── HAZARD ───
  {
    id: 'evt-acid-rain',
    title: 'Acid Rain Squall',
    category: 'hazard',
    narration:
      'The sky turns yellow-green. Droplets begin to sizzle on exposed metal. Acid rain — you\'ve got maybe thirty seconds before it gets bad.',
    choices: [
      {
        id: 'shelter',
        text: 'Find shelter immediately.',
        outcome: {
          narration:
            'You dive under a concrete overhang. The rain hammers down, dissolving paint and rust in equal measure. Your rover takes minor damage but you\'re fine.',
          damage: 3,
        },
      },
      {
        id: 'push-through',
        text: 'Seal the rover and push through.',
        outcome: {
          narration:
            'The rover\'s seals hold — barely. You lose a filter and some exterior plating, but you gain ground.',
          resourceChanges: { supplies: -2 },
          damage: 8,
          movePlayer: 1,
        },
      },
    ],
  },
  {
    id: 'evt-collapsed-road',
    title: 'Collapsed Road',
    category: 'hazard',
    narration:
      'The asphalt ahead has given way entirely, revealing a twenty-foot drop into flooded ruins. Your map didn\'t show this.',
    choices: [
      {
        id: 'detour',
        text: 'Find a detour through the buildings.',
        outcome: {
          narration:
            'A slow, grinding detour through collapsed storefronts. You lose time and supplies, but you find a shortcut marked by old graffiti.',
          resourceChanges: { supplies: -1 },
        },
      },
      {
        id: 'jump',
        text: 'Build a ramp from debris and jump it.',
        outcome: {
          narration:
            'Insane. Brilliant. The rover catches air, clears the gap by inches, and slams down hard on the other side. Something is definitely rattling now.',
          damage: 12,
          movePlayer: 1,
        },
      },
    ],
  },

  // ─── LORE ───
  {
    id: 'evt-old-terminal',
    title: 'Functioning Terminal',
    category: 'lore',
    nodeIds: ['node-01', 'node-05', 'node-07'],
    narration:
      'A dusty terminal flickers to life at your touch. Pre-collapse data streams across the screen — news feeds, corporate memos, personal messages from people long gone.',
    choices: [
      {
        id: 'read-news',
        text: 'Read the news archives.',
        outcome: {
          narration:
            'Headlines scroll: "DIRECTORATE DECLARES EMERGENCY POWERS." "LAST TRAIN FROM DETROIT: A CITY ABANDONED." "GLASSSTORM WARNING: ZONE 4 EVACUATION." The world ended in stages.',
          unlockCodex: ['codex-world-collapse'],
        },
      },
      {
        id: 'read-personal',
        text: 'Read the personal messages.',
        outcome: {
          narration:
            '"Mom, we\'re leaving tonight. Don\'t wait for us. I love you." The message is dated seven years ago. No reply was ever sent.',
          unlockCodex: ['codex-world-collapse'],
        },
      },
      {
        id: 'download',
        text: 'Download everything to your rover\'s memory.',
        outcome: {
          narration:
            'Data floods into your rover\'s corrupted storage banks. Most of it is garbled, but fragments survive. Your codex updates.',
          unlockCodex: ['codex-world-collapse', 'codex-zone-rustbelt'],
          addItem: 'Data Fragment',
        },
      },
    ],
  },
  {
    id: 'evt-memorial-wall',
    title: 'Memorial Wall',
    category: 'lore',
    oneTime: true,
    narration:
      'Hundreds of photos and handwritten notes cover a wall. Names, dates, messages. "HAVE YOU SEEN MY DAUGHTER?" "WE WENT WEST." "GOD FORGIVE US." A makeshift memorial to the old world.',
    choices: [
      {
        id: 'read',
        text: 'Take a moment to read the names.',
        outcome: {
          narration:
            'You read. You remember. On the Trail, memory is the last currency that doesn\'t depreciate.',
          heal: 3,
          unlockCodex: ['codex-world-collapse'],
        },
      },
      {
        id: 'add',
        text: 'Add your own note to the wall.',
        outcome: {
          narration:
            'You write your name and a single line. Maybe someone will read it. Maybe not. It matters anyway.',
          heal: 5,
        },
      },
    ],
  },

  // ─── FACTION ───
  {
    id: 'evt-directorate-broadcast',
    title: 'Directorate Broadcast',
    category: 'faction',
    narration:
      'Your rover picks up a Directorate broadcast: "Citizens. The Reclamation Zones are open. Register at your nearest checkpoint for work assignments and ration cards. Compliance is prosperity."',
    choices: [
      {
        id: 'listen',
        text: 'Listen to the full broadcast.',
        outcome: {
          narration:
            'Propaganda, mostly. But between the lines, you catch useful intel: patrol schedules, supply route mentions, and a hint about a new scanning protocol.',
          unlockCodex: ['codex-faction-directorate'],
        },
      },
      {
        id: 'jam-it',
        text: 'Jam the signal and move on.',
        outcome: {
          narration: 'Static fills the airwaves. Small rebellion, but it feels good.',
        },
      },
    ],
  },
  {
    id: 'evt-sunken-market',
    title: 'Sunken Overpass Market',
    category: 'trade',
    nodeIds: ['node-05'],
    narration:
      'The Sunken Overpass hums with activity. Traders from three factions haggle under tarps. A mechanic offers rover repairs. A Lantern elder tends a cook fire. For a moment, it almost feels normal.',
    choices: [
      {
        id: 'repair',
        text: 'Pay for rover repairs. (–8 scrap)',
        outcome: {
          narration: 'The mechanic is good. Real good. Your rover purrs like it hasn\'t in weeks.',
          resourceChanges: { scrap: -8 },
          heal: 20,
        },
      },
      {
        id: 'trade-bulk',
        text: 'Trade bulk: 15 scrap for 10 supplies.',
        outcome: {
          narration: 'A solid exchange. The trader throws in a worn map overlay for the next zone.',
          resourceChanges: { scrap: -15, supplies: 10 },
          unlockCodex: ['codex-zone-rustbelt'],
        },
      },
      {
        id: 'browse',
        text: 'Just browse and gather info.',
        outcome: {
          narration:
            'You listen to trader gossip. Someone mentions a "glass storm" moving through Zone 04. Another talks about a new Free Band route through the mountains.',
          unlockCodex: ['codex-faction-lanterns', 'codex-faction-iron-caravan'],
        },
      },
    ],
  },

  // ─── GENERIC FILLERS ───
  {
    id: 'evt-quiet-road',
    title: 'Quiet Road',
    category: 'discovery',
    narration:
      'Nothing but cracked asphalt and silence. The wind carries the smell of rust and rain. Your rover hums steadily. Sometimes the Trail gives you a moment to breathe.',
    choices: [
      {
        id: 'rest',
        text: 'Take a moment to rest.',
        outcome: {
          narration: 'You pull over, stretch, and breathe. The sky is ugly, but the silence is golden.',
          heal: 3,
        },
      },
      {
        id: 'scavenge',
        text: 'Search the roadside for anything useful.',
        outcome: {
          narration: 'You find a handful of screws, a dented canteen, and a faded photo. Small things add up.',
          resourceChanges: { scrap: 3 },
        },
      },
    ],
  },
  {
    id: 'evt-rover-malfunction',
    title: 'Rover Malfunction',
    category: 'hazard',
    narration:
      'Your rover stutters and stops. Warning lights flash — a power cell is overheating. You need to vent it manually before it blows.',
    choices: [
      {
        id: 'careful',
        text: 'Carefully vent the cell. (Slow, safe)',
        outcome: {
          narration: 'Twenty minutes of careful work. The cell stabilizes. You\'re back on the road, just a little behind schedule.',
          resourceChanges: { scrap: -2 },
        },
      },
      {
        id: 'quick',
        text: 'Quick-release the cell. (Fast, risky)',
        outcome: {
          narration: 'The cell vents in a burst of sparks. Your gloves are singed but you\'re rolling again in under a minute. The cell will need replacing soon.',
          damage: 7,
        },
      },
    ],
  },
];

export default zone01Events;
