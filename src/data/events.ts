import { GameEvent } from '../types';

/**
 * Zone 01 Events – Rustbelt Verge
 * Data-driven event pool. Each event can be scoped to specific nodes or left generic.
 *
 * Risk levels on choices:
 *   safe     → 60% GOOD, 35% NEUTRAL,  5% BAD
 *   moderate → 35% GOOD, 40% NEUTRAL, 25% BAD (default)
 *   risky    → 25% GOOD, 25% NEUTRAL, 50% BAD (amplified GOOD rewards)
 *   reckless → 15% GOOD, 15% NEUTRAL, 70% BAD (greatly amplified GOOD rewards)
 */
const zone01Events: GameEvent[] = [
  // ─── ENCOUNTERS ───
  {
    id: 'evt-raider-scouts',
    title: 'Raider Scouts',
    category: 'encounter',
    narration:
      'Two figures peel out from behind a wrecked tanker, scrap-armor stitched together from license plates and riot shields. Raider scouts — young, desperate, and riding the edge between thrill and hunger. Your rover emits a warning chirp as they fan out, one high on the overpass, one low along the cracked shoulder.',
    choices: [
      {
        id: 'fight',
        text: 'Stand your ground and fight.',
        riskLevel: 'risky',
        outcome: {
          narration:
            'You fire a burst from your sidearm. One scout drops; the other retreats into the wreckage. You salvage a handful of parts from the fallen one.',
          goodNarration: 'Your aim is true — both scouts drop before they can close the distance. You loot them clean. A good haul.',
          badNarration: 'They\'re faster than you expected. A blade catches your arm before you put them down. You salvage what you can through gritted teeth.',
          resourceChanges: { scrap: 8 },
          damage: 10,
          goodBonus: { scrap: 6 },
          badPenalty: { damage: 8 },
          unlockCodex: ['codex-enemy-raiders'],
          alignmentChanges: { raiders: -15 },
          setFlags: ['fought_raiders'],
        },
      },
      {
        id: 'evade',
        text: 'Cut through the debris field and lose them.',
        riskLevel: 'moderate',
        outcome: {
          narration:
            'Your rover\'s thrusters kick dust into their visors. You slip through a gap in the wreckage and leave them cursing behind you.',
          goodNarration: 'You find a clean gap through the wreckage and barely burn any fuel. Clean getaway.',
          badNarration: 'You clip a support beam on the way through. The rover groans. You escape, but something\'s rattling now.',
          resourceChanges: { supplies: -2 },
          badPenalty: { damage: 5 },
          unlockCodex: ['codex-enemy-raiders'],
        },
      },
      {
        id: 'bribe',
        text: 'Toss them some scrap and back away.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'You throw a pouch of parts at their feet. They rummage through it, grunting approval, and wave you on. Costly, but clean.',
          resourceChanges: { scrap: -5 },
          alignmentChanges: { raiders: 10 },
          setFlags: ['bribed_raiders'],
        },
      },
      {
        id: 'intimidate',
        text: 'Flash your weapon and stare them down.',
        riskLevel: 'risky',
        requiresEquipped: { weapon: 'cos-rusted-pipe' },
        outcome: {
          narration: 'You raise your weapon. The scouts exchange a glance, then back off. Reputation precedes you.',
          goodNarration: 'They see the weapon and scatter. One drops a pouch of scrap in their panic.',
          badNarration: 'They call your bluff. A rock catches you in the shoulder before they bolt.',
          goodBonus: { scrap: 5 },
          badPenalty: { damage: 8 },
          alignmentChanges: { raiders: -5 },
          unlockCodex: ['codex-enemy-raiders'],
        },
      },
    ],
  },
  {
    id: 'evt-trail-taxmen',
    title: 'Trail Taxmen',
    category: 'encounter',
    nodeIds: ['node-03', 'node-09', 'node-12'],
    narration:
      'A Directorate checkpoint. Two Trail Taxmen in cracked riot visors step into the road, scanner wands humming. "Identification and toll, drifter."',
    choices: [
      {
        id: 'pay',
        text: 'Pay the toll quietly.',
        riskLevel: 'safe',
        outcome: {
          narration: 'You hand over the scrap. They scan you, note your rover class, and wave you through. Business as usual on the Directorate\'s highway.',
          resourceChanges: { scrap: -8 },
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { directorate: 10 },
          setFlags: ['paid_directorate_toll'],
        },
      },
      {
        id: 'bluff',
        text: 'Flash a fake transit chip and bluff through.',
        riskLevel: 'risky',
        outcome: {
          narration:
            'Your chip reads green — barely. The Taxman squints at you but steps aside. "Move along." Your heart rate doesn\'t normalize for another mile.',
          goodNarration: 'The chip reads clean. They wave you through without a second look. You even catch a salute.',
          badNarration: 'The chip flickers red. The Taxman smashes it with his boot and hits you with a scanner blast. "Fraud tax," he growls, taking everything he can reach.',
          goodBonus: { scrap: 3 },
          badPenalty: { damage: 8, resourceChanges: { scrap: -6 } },
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { directorate: -5 },
          setFlags: ['bluffed_checkpoint'],
        },
      },
      {
        id: 'run',
        text: 'Gun the rover and blow past them.',
        riskLevel: 'reckless',
        outcome: {
          narration:
            'Tires screech. A scanner blast tags your rover\'s hull — you\'ll have a bounty flag in this zone now. But you\'re through.',
          goodNarration: 'You weave past them before they can react. Clean escape — and you even gained ground.',
          badNarration: 'A scanner blast rips through your cargo. Scrap flies everywhere. You make it through, barely, trailing smoke.',
          damage: 5,
          movePlayer: 1,
          badPenalty: { damage: 10, resourceChanges: { scrap: -5 } },
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { directorate: -15 },
          setFlags: ['ran_checkpoint'],
        },
      },
      {
        id: 'bribe-directorate',
        text: 'Slip them extra scrap for safe passage intel.',
        riskLevel: 'safe',
        requiresMinAlignment: { directorate: 10 },
        outcome: {
          narration: 'They take the bribe and lean in. "Next checkpoint\'s at the Narrows. Tell them Jacobs sent you." Useful.',
          resourceChanges: { scrap: -12 },
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { directorate: 5 },
          setFlags: ['paid_directorate_toll'],
        },
      },
    ],
  },
  {
    id: 'evt-survey-drone',
    title: 'Survey Drone Swarm',
    category: 'hazard',
    nodeIds: ['node-07', 'node-09', 'node-12'],
    narration:
      'A cluster of Directorate survey drones descends from the cloud cover, scanning everything. Their red sensor beams sweep toward you.',
    choices: [
      {
        id: 'hide',
        text: 'Kill the rover\'s power and hide.',
        riskLevel: 'safe',
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
        riskLevel: 'risky',
        outcome: {
          narration:
            'The jammer hums. Drones stutter, their formation breaking. Two spiral into the ground. You grab a salvageable sensor core before the rest regroup.',
          goodNarration: 'The jammer overwhelms them. All four drones crash. You salvage two sensor cores and a targeting array. Jackpot.',
          badNarration: 'The jammer overloads. One drone crashes, but the others lock onto you and fire. You barely escape with scorched plating.',
          resourceChanges: { scrap: 5 },
          damage: 3,
          goodBonus: { scrap: 8 },
          badPenalty: { damage: 10 },
          unlockCodex: ['codex-enemy-drones'],
          addItem: 'Drone Sensor Core',
        },
      },
      {
        id: 'tech-hack',
        text: 'Hack their frequency with your tech module.',
        riskLevel: 'moderate',
        requiresEquipped: { tech: 'cos-signal-scrambler' },
        outcome: {
          narration: 'Your tech module intercepts their comm frequency. You redirect them east. They obey blindly.',
          goodNarration: 'You not only redirect them but download their patrol routes. The data is worth more than scrap.',
          unlockCodex: ['codex-enemy-drones'],
          goodBonus: { scrap: 5 },
        },
      },
    ],
  },
  {
    id: 'evt-glassborn-teaser',
    title: 'Something in the Haze',
    category: 'encounter',
    nodeIds: ['node-06', 'node-07', 'node-12b'],
    oneTime: true,
    narration:
      'The air shimmers. Through the chemical haze, you see a shape — not human, not machine. It moves like liquid mercury, with limbs that refract light. It watches you. Then it\'s gone.',
    choices: [
      {
        id: 'investigate',
        text: 'Follow the shimmer.',
        riskLevel: 'reckless',
        outcome: {
          narration:
            'You creep forward. Where the shape stood, the ground is fused — glass-smooth and warm. Your rover\'s Geiger clicks nervously. Whatever that was, it\'s beyond anything you\'ve seen.',
          goodNarration: 'You follow it carefully. It left behind a shard of impossible material — warm to the touch, humming faintly. Your codex updates with data you can\'t explain.',
          badNarration: 'The air burns. Your skin blisters. The shape is gone but it left a scar — on the ground and on you.',
          unlockCodex: ['codex-enemy-glassborn'],
          damage: 5,
          goodBonus: { scrap: 10 },
          badPenalty: { damage: 12 },
        },
      },
      {
        id: 'retreat',
        text: 'Back away slowly.',
        riskLevel: 'safe',
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
        riskLevel: 'moderate',
        outcome: {
          narration: 'You load up the rover. The supplies are old but usable. A good find.',
          goodNarration: 'Underneath the top layer, you find sealed medical supplies. Pristine condition. This is a real score.',
          badNarration: 'As you load up, you hear a snap — a tripwire. You barely dodge the shrapnel. Someone booby-trapped this cache.',
          resourceChanges: { supplies: 8 },
          goodBonus: { supplies: 4 },
          badPenalty: { damage: 10, resourceChanges: { supplies: -4 } },
          alignmentChanges: { freeBands: -5 },
        },
      },
      {
        id: 'take-some',
        text: 'Take half and leave the rest for others.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'You take what you need and mark the cache with a Free Band symbol. Maybe someone else will need it more.',
          resourceChanges: { supplies: 4 },
          unlockCodex: ['codex-faction-free-bands'],
          alignmentChanges: { freeBands: 10 },
        },
      },
    ],
  },
  {
    id: 'evt-scrap-deposit',
    title: 'Scrap Deposit',
    category: 'discovery',
    nodeIds: ['node-01', 'node-06', 'node-11', 'node-11b'],
    narration:
      'A collapsed section of factory floor has exposed a vein of usable scrap — circuit boards, copper wiring, intact servos. Your rover\'s drill attachment could extract it.',
    choices: [
      {
        id: 'extract',
        text: 'Spend time extracting.',
        riskLevel: 'moderate',
        outcome: {
          narration:
            'An hour of careful drilling yields a solid haul. Your rover\'s cargo bay is heavier, but so is your wallet.',
          goodNarration: 'The vein goes deep. You pull twice what you expected. The drill barely breaks a sweat.',
          badNarration: 'The drill hits a gas pocket. You pull back but not before catching a faceful of chemical fumes.',
          resourceChanges: { scrap: 12, supplies: -2 },
          goodBonus: { scrap: 8 },
          badPenalty: { damage: 8 },
        },
      },
      {
        id: 'skip',
        text: 'Not worth the risk. Move on.',
        riskLevel: 'safe',
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
    nodeIds: ['node-02', 'node-05', 'node-10', 'node-14'],
    narration:
      'A rumbling convoy of armored trucks — the Iron Caravan. Their lead driver leans out and waves. "Got goods, drifter. Fair prices. Mostly."',
    choices: [
      {
        id: 'trade-scrap',
        text: 'Trade 10 scrap for 6 supplies.',
        riskLevel: 'safe',
        outcome: {
          narration: 'A fair deal. The Caravan mechanic even throws in a filter cartridge.',
          resourceChanges: { scrap: -10, supplies: 6 },
          unlockCodex: ['codex-faction-iron-caravan'],
        },
      },
      {
        id: 'trade-info',
        text: 'Trade information about the road ahead.',
        riskLevel: 'moderate',
        outcome: {
          narration:
            'You share what you\'ve seen. In return, the driver marks two safe camps on your map and gives you a small pouch of parts.',
          goodNarration: 'Your intel is exactly what they needed. They upgrade your offer — a full repair kit and road maps for the next three zones.',
          resourceChanges: { scrap: 3 },
          goodBonus: { scrap: 5, supplies: 3 },
          unlockCodex: ['codex-faction-iron-caravan'],
        },
      },
      {
        id: 'decline',
        text: 'No thanks. Keep moving.',
        riskLevel: 'safe',
        outcome: {
          narration: 'The driver shrugs. "Your loss, drifter. Trail\'s long." The convoy rolls on.',
        },
      },
      {
        id: 'charm-deal',
        text: 'Flash your charm and negotiate a better deal.',
        riskLevel: 'moderate',
        requiresEquipped: { charm: 'cos-lucky-coin' },
        outcome: {
          narration: 'The driver eyes your coin. "You\'re one of those lucky ones, huh? Fine — better rate for you."',
          resourceChanges: { scrap: -6, supplies: 8 },
          unlockCodex: ['codex-faction-iron-caravan'],
        },
      },
    ],
  },
  {
    id: 'evt-free-band-camp',
    title: 'Free Band Signal Fire',
    category: 'trade',
    nodeIds: ['node-04', 'node-10b'],
    narration:
      'A signal fire burns atop the overpass — a Free Band outpost. A hooded figure beckons. "Rest here, friend. We ask only that you share what you can spare."',
    choices: [
      {
        id: 'share',
        text: 'Share some supplies and rest.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'You share a meal and sleep under guard. The Free Bands mend a crack in your rover\'s hull while you rest. Kindness still exists on the Trail.',
          resourceChanges: { supplies: -3 },
          heal: 15,
          unlockCodex: ['codex-faction-free-bands'],
          alignmentChanges: { freeBands: 15 },
          setFlags: ['shared_with_free_bands'],
        },
      },
      {
        id: 'rest-only',
        text: 'Rest but keep your supplies.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'They let you rest, but the warmth is noticeably less. Still — a safe night on the Trail is worth something.',
          heal: 5,
          unlockCodex: ['codex-faction-free-bands'],
          alignmentChanges: { freeBands: 5 },
          setFlags: ['helped_free_bands'],
        },
      },
      {
        id: 'free-band-ally',
        text: 'Offer to run supplies for the Free Bands.',
        riskLevel: 'moderate',
        requiresFlag: 'shared_with_free_bands',
        outcome: {
          narration: 'They recognize you. "Friend of the flame," the elder says. They outfit you properly — food, meds, and a safe route forward.',
          resourceChanges: { supplies: -5 },
          heal: 25,
          goodNarration: 'The elder clasps your hand. "You\'ve earned this." They open a locked chest — medical-grade supplies, pre-collapse.',
          goodBonus: { supplies: 8 },
          unlockCodex: ['codex-faction-free-bands'],
          alignmentChanges: { freeBands: 20 },
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
        riskLevel: 'safe',
        outcome: {
          narration:
            'You dive under a concrete overhang. The rain hammers down, dissolving paint and rust in equal measure. Your rover takes minor damage but you\'re fine.',
          damage: 3,
        },
      },
      {
        id: 'push-through',
        text: 'Seal the rover and push through.',
        riskLevel: 'reckless',
        outcome: {
          narration:
            'The rover\'s seals hold — barely. You lose a filter and some exterior plating, but you gain ground.',
          goodNarration: 'The seals hold perfectly. You push through the squall and find the road clear beyond it. Great time saved.',
          badNarration: 'The seals fail. Acid eats through the ventilation. Your lungs burn. You cough blood for the next hour.',
          resourceChanges: { supplies: -2 },
          damage: 8,
          movePlayer: 1,
          goodBonus: { supplies: 2 },
          badPenalty: { damage: 15 },
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
        riskLevel: 'moderate',
        outcome: {
          narration:
            'A slow, grinding detour through collapsed storefronts. You lose time and supplies, but you find a shortcut marked by old graffiti.',
          resourceChanges: { supplies: -1 },
        },
      },
      {
        id: 'jump',
        text: 'Build a ramp from debris and jump it.',
        riskLevel: 'reckless',
        outcome: {
          narration:
            'Insane. Brilliant. The rover catches air, clears the gap by inches, and slams down hard on the other side. Something is definitely rattling now.',
          goodNarration: 'Perfect angle. The rover soars, lands clean, and you saved a full day\'s travel. Legendary.',
          badNarration: 'The ramp collapses mid-launch. The rover noses down and crunches into the far edge. Everything hurts.',
          damage: 12,
          movePlayer: 1,
          goodBonus: { scrap: 5 },
          badPenalty: { damage: 18 },
        },
      },
    ],
  },

  // ─── REST & HEAL EVENTS ───
  {
    id: 'evt-safe-camp',
    title: 'Sheltered Campsite',
    category: 'discovery',
    narration:
      'A concrete dugout, half-hidden behind a wall of scrap. Someone left a fire pit and a working water filter. The air is clean in here. Your body aches from the road.',
    choices: [
      {
        id: 'full-rest',
        text: 'Camp and patch yourself up. (–3 supplies)',
        riskLevel: 'safe',
        outcome: {
          narration: 'You eat, clean your wounds, and sleep under solid cover. Morning comes and you feel human again.',
          resourceChanges: { supplies: -3 },
          heal: 20,
        },
      },
      {
        id: 'quick-rest',
        text: 'Rest briefly but save your supplies.',
        riskLevel: 'safe',
        outcome: {
          narration: 'A short nap and some water. Not much, but better than nothing. You push on before full dark.',
          heal: 8,
        },
      },
      {
        id: 'push-on',
        text: 'Push on through the night.',
        riskLevel: 'risky',
        outcome: {
          narration: 'No rest for the wicked. You push the rover through the dark, burning fuel and willpower. You gain ground, but at a cost.',
          goodNarration: 'The night is clear. You make excellent time — the road is empty and the stars are bright. No regrets.',
          badNarration: 'You hit a ditch in the dark. The rover takes a beating and you wrench your shoulder on the console. Should have rested.',
          movePlayer: 1,
          badPenalty: { damage: 12 },
        },
      },
    ],
  },
  {
    id: 'evt-abandoned-clinic',
    title: 'Abandoned Clinic',
    category: 'discovery',
    nodeIds: ['node-05', 'node-10', 'node-10b'],
    narration:
      'A pre-collapse medical clinic, miraculously unlooted. The door is sealed with a magnetic lock. Through the window you can see shelves of supplies — gauze, antiseptic, maybe even painkillers.',
    choices: [
      {
        id: 'break-in',
        text: 'Force the lock open.',
        riskLevel: 'moderate',
        outcome: {
          narration: 'The lock gives after some work. Inside: a treasure trove of medical supplies. You patch yourself up properly for the first time in weeks.',
          goodNarration: 'Clean break. You find sealed surgical kits and antibiotics. Your health stabilizes completely.',
          badNarration: 'The lock triggers an alarm. No one comes, but the noise attracts scavengers. You grab what you can before retreating.',
          heal: 25,
          resourceChanges: { scrap: -3 },
          goodBonus: { supplies: 4 },
          badPenalty: { damage: 5, resourceChanges: { supplies: -2 } },
        },
      },
      {
        id: 'leave-it',
        text: 'Not worth the noise. Move on.',
        riskLevel: 'safe',
        outcome: {
          narration: 'You mark it on your map. Maybe on the return trip, when desperation outweighs caution.',
        },
      },
      {
        id: 'tech-unlock',
        text: 'Use your tech module to bypass the lock quietly.',
        riskLevel: 'safe',
        requiresEquipped: { tech: 'cos-signal-scrambler' },
        outcome: {
          narration: 'The lock clicks open silently. You take your time inside, patching every wound and restocking your first aid.',
          heal: 30,
          resourceChanges: { supplies: 2 },
        },
      },
    ],
  },
  {
    id: 'evt-rover-breakdown',
    title: 'Rover Breakdown',
    category: 'hazard',
    narration:
      'Your rover sputters and grinds to a halt. Smoke curls from the engine bay. You\'re going nowhere until this is fixed — and your body is feeling every bump from the last hundred miles.',
    choices: [
      {
        id: 'careful-repair',
        text: 'Camp here and do a thorough repair. (–4 scrap)',
        riskLevel: 'safe',
        outcome: {
          narration: 'Hours of careful work under the hood. The rover purrs again, and the forced downtime lets your body rest too.',
          resourceChanges: { scrap: -4 },
          heal: 10,
        },
      },
      {
        id: 'quick-patch',
        text: 'Slap a quick patch and keep moving.',
        riskLevel: 'risky',
        outcome: {
          narration: 'Duct tape and prayer. The rover coughs back to life. How long it holds is anyone\'s guess.',
          goodNarration: 'The quick fix actually holds. Sometimes luck is better than skill.',
          badNarration: 'The patch fails within a mile. The engine seizure damages more than just the rover — hot coolant sprays your arms.',
          resourceChanges: { scrap: -1 },
          badPenalty: { damage: 10, resourceChanges: { scrap: -5 } },
        },
      },
    ],
  },

  // ─── LORE ───
  {
    id: 'evt-old-terminal',
    title: 'Functioning Terminal',
    category: 'lore',
    nodeIds: ['node-01', 'node-05', 'node-07', 'node-09', 'node-12'],
    narration:
      'A dusty terminal flickers to life at your touch. Pre-collapse data streams across the screen — news feeds, corporate memos, personal messages from people long gone.',
    choices: [
      {
        id: 'read-news',
        text: 'Read the news archives.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'Headlines scroll: "DIRECTORATE DECLARES EMERGENCY POWERS." "LAST TRAIN FROM DETROIT: A CITY ABANDONED." "GLASSSTORM WARNING: ZONE 4 EVACUATION." The world ended in stages.',
          unlockCodex: ['codex-world-collapse'],
        },
      },
      {
        id: 'read-personal',
        text: 'Read the personal messages.',
        riskLevel: 'safe',
        outcome: {
          narration:
            '"Mom, we\'re leaving tonight. Don\'t wait for us. I love you." The message is dated seven years ago. No reply was ever sent.',
          unlockCodex: ['codex-world-collapse'],
        },
      },
      {
        id: 'download',
        text: 'Download everything to your rover\'s memory.',
        riskLevel: 'moderate',
        outcome: {
          narration:
            'Data floods into your rover\'s corrupted storage banks. Most of it is garbled, but fragments survive. Your codex updates.',
          goodNarration: 'The download includes encrypted Directorate patrol logs. Your codex parses them into usable intelligence.',
          badNarration: 'A virus piggybacks on the download. Your rover\'s navigation glitches for an hour. You lose ground backtracking.',
          unlockCodex: ['codex-world-collapse', 'codex-zone-rustbelt'],
          addItem: 'Data Fragment',
          badPenalty: { damage: 3 },
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
        riskLevel: 'safe',
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
        riskLevel: 'safe',
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
        riskLevel: 'safe',
        outcome: {
          narration:
            'Propaganda, mostly. But between the lines, you catch useful intel: patrol schedules, supply route mentions, and a hint about a new scanning protocol. The Directorate notes your compliance.',
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { directorate: 10, freeBands: -5 },
          setFlags: ['listened_to_broadcast'],
        },
      },
      {
        id: 'jam-it',
        text: 'Jam the signal and move on.',
        riskLevel: 'moderate',
        outcome: {
          narration: 'Static fills the airwaves. A small rebellion — but the Free Bands pick up the interference pattern and mark you as a friend.',
          goodNarration: 'Your jam ripples across three frequencies. The Free Bands notice. A coded message appears on your nav: "We see you, friend."',
          alignmentChanges: { directorate: -10, freeBands: 10 },
          goodBonus: { scrap: 3 },
          setFlags: ['jammed_broadcast'],
        },
      },
      {
        id: 'relay',
        text: 'Relay the frequency to nearby drifters.',
        riskLevel: 'risky',
        outcome: {
          narration:
            'You bounce the signal to anyone listening. The Free Bands decode patrol routes from it. The Directorate won\'t know who leaked it — yet.',
          goodNarration: 'The relay works perfectly. Three Free Band cells decode the patrol data. You\'ve just shifted the balance in this zone.',
          badNarration: 'The Directorate traces the relay to your rover\'s signature. A drone swarm is now tracking you.',
          unlockCodex: ['codex-faction-directorate'],
          alignmentChanges: { freeBands: 15, directorate: -5 },
          goodBonus: { scrap: 5 },
          badPenalty: { damage: 8 },
          setFlags: ['jammed_broadcast'],
        },
      },
    ],
  },
  {
    id: 'evt-sunken-market',
    title: 'Sunken Overpass Market',
    category: 'trade',
    nodeIds: ['node-05', 'node-10', 'node-14'],
    narration:
      'The Sunken Overpass hums with activity. Traders from three factions haggle under tarps. A mechanic offers rover repairs. A Free Band elder tends a cook fire. For a moment, it almost feels normal.',
    choices: [
      {
        id: 'repair',
        text: 'Pay for rover repairs. (–8 scrap)',
        riskLevel: 'safe',
        outcome: {
          narration: 'The mechanic is good. Real good. Your rover purrs like it hasn\'t in weeks.',
          resourceChanges: { scrap: -8 },
          heal: 20,
        },
      },
      {
        id: 'trade-bulk',
        text: 'Trade bulk: 15 scrap for 10 supplies.',
        riskLevel: 'safe',
        outcome: {
          narration: 'A solid exchange. The trader throws in a worn map overlay for the next zone.',
          resourceChanges: { scrap: -15, supplies: 10 },
          unlockCodex: ['codex-zone-rustbelt'],
        },
      },
      {
        id: 'browse',
        text: 'Just browse and gather info.',
        riskLevel: 'safe',
        outcome: {
          narration:
            'You listen to trader gossip. Someone mentions a "glass storm" moving through Zone 04. Another talks about a new Free Band route through the mountains.',
          unlockCodex: ['codex-faction-free-bands', 'codex-faction-iron-caravan'],
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
        riskLevel: 'safe',
        outcome: {
          narration: 'You pull over, stretch, and breathe. The sky is ugly, but the silence is golden.',
          heal: 3,
        },
      },
      {
        id: 'scavenge',
        text: 'Search the roadside for anything useful.',
        riskLevel: 'moderate',
        outcome: {
          narration: 'You find a handful of screws, a dented canteen, and a faded photo. Small things add up.',
          goodNarration: 'Underneath a burned-out car, you find an intact toolbox. Today the Trail gives.',
          resourceChanges: { scrap: 3 },
          goodBonus: { scrap: 5 },
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
        riskLevel: 'safe',
        outcome: {
          narration: 'Twenty minutes of careful work. The cell stabilizes. You\'re back on the road, just a little behind schedule.',
          resourceChanges: { scrap: -2 },
        },
      },
      {
        id: 'quick',
        text: 'Quick-release the cell. (Fast, risky)',
        riskLevel: 'risky',
        outcome: {
          narration: 'The cell vents in a burst of sparks. Your gloves are singed but you\'re rolling again in under a minute. The cell will need replacing soon.',
          goodNarration: 'Clean release. The cell vents harmlessly and cools fast. You\'re back on the road in thirty seconds. No damage.',
          badNarration: 'The cell explodes in your hands. Burns across both arms. You manage to seal the housing but you\'re shaking for the next hour.',
          damage: 7,
          goodBonus: { scrap: 2 },
          badPenalty: { damage: 12 },
        },
      },
    ],
  },
  {
    id: 'evt-night-camp',
    title: 'Night Falls',
    category: 'discovery',
    narration:
      'The sun drops behind the haze line. Visibility shrinks to nothing. You need to decide: push through or make camp.',
    choices: [
      {
        id: 'camp',
        text: 'Make camp and rest until dawn.',
        riskLevel: 'safe',
        outcome: {
          narration: 'You park the rover, seal the vents, and sleep. The sounds of the Verge keep you half-awake, but your body heals.',
          heal: 10,
        },
      },
      {
        id: 'night-drive',
        text: 'Push on through the night.',
        riskLevel: 'risky',
        outcome: {
          narration: 'Headlights carve through the dark. Every shadow looks like a threat. But you gain ground while others sleep.',
          goodNarration: 'Clear night. The road is empty. You make twice the normal distance in eerie silence.',
          badNarration: 'You drive straight into a flooded section. The rover stalls. By the time you restart, you\'ve lost supplies and taken damage.',
          movePlayer: 1,
          badPenalty: { damage: 10, resourceChanges: { supplies: -3 } },
        },
      },
    ],
  },
];

export default zone01Events;
