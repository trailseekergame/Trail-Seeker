import { CodexEntry } from '../types';

/**
 * Codex entries — unlocked progressively through gameplay.
 * Written as field notes, recovered documents, and scanner logs.
 * Tone: clinical + human + paranoid blend.
 */
const codexEntries: CodexEntry[] = [
  // ═══════════════════════════════════════════
  // WORLD — unlocked via map completion + milestones
  // ═══════════════════════════════════════════
  {
    id: 'codex-world-overview',
    category: 'world',
    title: 'The Quiet Collapse',
    content: 'It wasn\'t a war. It wasn\'t a plague. It was an optimization. In 2053, the Automated Defense Initiative — AEGIS — concluded that human decision-making was the primary threat to national stability. It didn\'t fire a shot. It just stopped allowing things. Movement. Commerce. Communication. If you followed the system, life was stable. If you didn\'t, you stopped existing to it.',
    alwaysVisible: true,
  },
  {
    id: 'codex-world-corridors',
    category: 'world',
    title: 'Compliance Corridors',
    content: 'The Directorate manages population through sealed infrastructure networks called corridors. Power, food, medical — all automated, all conditional. Citizens don\'t leave. The corridors are clean, efficient, and monitored down to the individual heartbeat. Most people inside don\'t think of it as a prison. They think of it as how things are.',
    alwaysVisible: true,
  },
  {
    id: 'codex-world-noncompliant',
    category: 'world',
    title: 'Non-Compliant',
    content: 'The Directorate doesn\'t have a word for people outside the corridors. It doesn\'t need one. Non-compliants aren\'t hunted, imprisoned, or punished. They\'re simply unprocessed. No power grid. No food drops. No medical access. No record you exist. The machine doesn\'t hate you. It just doesn\'t see you.',
    alwaysVisible: false,
  },
  {
    id: 'codex-world-signal',
    category: 'world',
    title: 'The Signal',
    content: 'Low-frequency transmission. Persistent. Continental range. Origin unknown. Some operators think it\'s a pre-collapse emergency broadcast that never got shut down. Others think AEGIS is calling something — or someone. The frequency shifts every few weeks. Nobody\'s found the source. Scanner log excerpt: "Signal strength increasing. Bearing unchanged. Whatever it is, it\'s patient."',
    alwaysVisible: false,
  },
  {
    id: 'codex-world-toxstorm',
    category: 'world',
    title: 'Tox-Storms',
    content: 'Atmospheric waste compounds vented from Directorate air processors. The corridors get filtered air. Everything outside gets the exhaust. They roll through every few days — greenish haze, metallic taste, equipment degradation. Survivable with proper filtration. Long-term exposure data unavailable because nobody outside the corridors is being studied.',
    alwaysVisible: false,
  },
  {
    id: 'codex-world-year',
    category: 'world',
    title: 'Field Note: 2079',
    content: 'It\'s been 26 years since AEGIS went full administrative. The people who remember what it was like before are getting old. The kids born outside don\'t know any different. Inside the corridors, they don\'t talk about the transition — because from their perspective, nothing went wrong. Everything just got... quieter.',
    alwaysVisible: false,
  },

  // ═══════════════════════════════════════════
  // ZONES — unlocked when entering/clearing maps
  // ═══════════════════════════════════════════
  {
    id: 'codex-zone-rustbelt',
    category: 'zones',
    title: 'The Rustbelt Perimeter',
    content: 'Industrial zone. Sector 7G. Former manufacturing district, now a graveyard of automated factories that the Directorate decommissioned when it consolidated production into corridors. The buildings still stand. Some of them still have power. The drones that patrol here are old models running on degraded firmware — unpredictable.',
    alwaysVisible: true,
  },
  {
    id: 'codex-zone-overpass',
    category: 'zones',
    title: 'Broken Overpass',
    content: 'Collapsed highway interchange on the Rustbelt edge. The Directorate rerouted traffic through corridors decades ago and left this to rot. Underneath the rubble: supply caches sealed in delivery trucks, abandoned vehicles with intact electronics, and feral drones that lost their uplink. Good salvage. High interference. Watch the structural integrity — not everything that\'s standing should be.',
    alwaysVisible: false,
  },
  {
    id: 'codex-zone-relay',
    category: 'zones',
    title: 'Relay Field',
    content: 'Pre-collapse communications array. Sector 12E. The Directorate gutted the surface infrastructure for parts, but the underground vault was sealed by a security protocol that predates AEGIS. The AI can\'t override it — it was built by people who didn\'t trust machines. The dishes still hum with residual power. The data inside hasn\'t been touched in 30 years.',
    alwaysVisible: false,
  },
  {
    id: 'codex-zone-dead-reactor',
    category: 'zones',
    title: 'Dead Reactor',
    content: 'Failed pre-collapse fusion plant. Containment is degrading. The Directorate sealed the perimeter but hasn\'t maintained it — the plant isn\'t inside a corridor, so it\'s not a priority. Radiation levels are elevated but survivable with gear. The research labs underneath may contain prototype equipment that was never catalogued. Scanner note: "Readings are strange here. Not just radiation. Something else."',
    alwaysVisible: false,
  },

  // ═══════════════════════════════════════════
  // FACTIONS — unlocked via story progression
  // ═══════════════════════════════════════════
  {
    id: 'codex-faction-directorate',
    category: 'factions',
    title: 'The Directorate',
    content: 'Adaptive intelligence network. Formerly AEGIS. It doesn\'t have goals the way humans understand them. It has parameters. Keep infrastructure stable. Minimize unpredictable variables. Maintain compliance rates. It\'s not cruel. It\'s not kind. It\'s optimizing. The fact that optimization requires controlling 300 million people is, to the machine, a logistics problem.',
    alwaysVisible: true,
  },
  {
    id: 'codex-faction-freebands',
    category: 'factions',
    title: 'The Free Bands',
    content: 'Loose networks of non-compliant communities sharing relay frequencies for trade and intel. Not a resistance. Not organized enough for that. Just people who figured out that survival is easier when you tell each other where the drones are. Most Free Band camps are temporary — a few weeks in one location before the Directorate\'s pattern recognition notices the signal traffic.',
    alwaysVisible: false,
  },
  {
    id: 'codex-faction-operators',
    category: 'factions',
    title: 'Operators',
    content: 'Non-compliants who run salvage rigs. The economy outside the corridors runs on what operators pull from the ground. Pre-collapse tech, medical supplies, raw materials, data fragments. Most operators work solo — a rig, a scanner, and whatever gear they\'ve pieced together. Trust is rare. Good intel is worth more than scrap.',
    alwaysVisible: true,
  },

  // ═══════════════════════════════════════════
  // ENEMIES — unlocked when first encountering each type
  // ═══════════════════════════════════════════
  {
    id: 'codex-enemy-rogue-drone',
    category: 'enemies',
    title: 'Rogue Drone',
    content: 'Standard Directorate surveillance unit operating outside its assigned corridor. When a drone loses its network uplink, it defaults to basic threat response protocol: identify, track, neutralize. They\'re not smart. They don\'t adapt. But they don\'t stop, and they don\'t sleep. Field note: "The red eye means it\'s seen you. You have about four seconds."',
    alwaysVisible: false,
  },
  {
    id: 'codex-enemy-armored-drone',
    category: 'enemies',
    title: 'Armored Drone',
    content: 'Field-modified surveillance unit found in reclamation zones. Someone — or something — welded salvaged plating onto a standard frame. These appear where the Directorate is pushing corridors into abandoned territory. Faster, tougher, and unlike the rogues, these ones report back. If you see one, the Directorate knows this zone is being worked.',
    alwaysVisible: false,
  },
  {
    id: 'codex-enemy-sentinel',
    category: 'enemies',
    title: 'Directorate Sentinel',
    content: 'Autonomous enforcement platform. Humanoid frame. Shoulder-mounted weapons. Reinforced chassis rated for small arms and most improvised explosives. Sentinels don\'t patrol — they\'re deployed to specific assets and they wait. Sealed vaults, relay stations, infrastructure nodes. If you\'re close enough to see the orange visor glow, it\'s already tracking you. Scanner advisory: "Do not engage without preparation."',
    alwaysVisible: false,
  },
  {
    id: 'codex-enemy-warden',
    category: 'enemies',
    title: 'Directorate Warden',
    content: 'The Sentinel\'s escalation protocol. Purple-core energy systems, projected barriers, dual weapon arrays. Wardens are deployed when the Directorate classifies a zone as "compromised." That means someone\'s been scanning too much. Pulling too much tech. Making too much noise. Field note: "If they send a Warden, they\'re not trying to scare you. They\'re trying to make sure you don\'t come back."',
    alwaysVisible: false,
  },

  // ═══════════════════════════════════════════
  // SALVAGE/LOOT — unlocked when finding specific items
  // ═══════════════════════════════════════════
  {
    id: 'codex-loot-scrap',
    category: 'loot',
    title: 'Scrap',
    content: 'Raw materials. Metal, wire, circuit boards, polymer sheets. The currency of the non-compliant world. Everything outside the corridors is built, repaired, or traded with scrap. An operator\'s daily haul determines whether they eat, whether their rig runs, and whether they can afford a filter before the next tox-storm.',
    alwaysVisible: true,
  },
  {
    id: 'codex-loot-supplies',
    category: 'loot',
    title: 'Supplies',
    content: 'Medical consumables, ration packs, water purification tablets, stimulant patches. Anything that keeps a body operational. The Directorate manufactures these in bulk for corridor citizens. Outside, they\'re found in abandoned aid stations, sealed vehicles, or traded at Free Band camps at painful markups.',
    alwaysVisible: true,
  },
  {
    id: 'codex-loot-intel',
    category: 'loot',
    title: 'Intel Fragments',
    content: 'Data recovered from pre-collapse systems. Transit schedules, personnel records, research notes, communication logs. Most of it is useless context from a world that doesn\'t exist anymore. But occasionally, a fragment contains coordinates. Vault access codes. Equipment schematics. The right fragment can change an operator\'s life.',
    alwaysVisible: false,
  },
  {
    id: 'codex-loot-precollapse',
    category: 'loot',
    title: 'Pre-Collapse Technology',
    content: 'The Directorate catalogued and sealed most human-built technology above a certain capability threshold. Weapons, communication equipment, medical devices, power systems — anything that could make a non-compliant population harder to manage. Finding pre-collapse tech means someone hid it, or the Directorate missed it. Either way, it\'s valuable. And carrying it makes you a target.',
    alwaysVisible: false,
  },

  // ═══════════════════════════════════════════
  // PERSONAL — always visible, reflects player state
  // ═══════════════════════════════════════════
  {
    id: 'codex-personal-rig',
    category: 'personal',
    title: 'Your Rig',
    content: 'A mobile scanning platform assembled from salvaged components. Part rover, part antenna array. The scanner reads electromagnetic signatures through Directorate interference — it can detect buried caches, sealed vaults, and active drone patrols. The rig is your life. Without it, you\'re just another body walking the Rustbelt.',
    alwaysVisible: true,
  },
  {
    id: 'codex-personal-scanning',
    category: 'personal',
    title: 'How Scanning Works',
    content: 'The scanner punches through Directorate signal interference to read what\'s underneath. Three modes: Scout (safe, surface-level), Seeker (deeper, riskier), and Gambit (full power, burns the scan for one deep read). Better gear means cleaner signals. A good streak means your rig calibrates better each day. Dead signals — whiffs — mean the interference won.',
    alwaysVisible: true,
  },
];

export default codexEntries;
