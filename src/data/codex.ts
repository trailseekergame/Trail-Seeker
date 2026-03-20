import { CodexEntry } from '../types';

/**
 * Codex Entries – structured data for the Codex tab
 * alwaysVisible entries are shown from the start
 * Others unlock through gameplay events
 */
const codexEntries: CodexEntry[] = [
  // ─── WORLD ───
  {
    id: 'codex-world-overview',
    category: 'world',
    title: 'The World in 2079',
    icon: '🌍',
    alwaysVisible: true,
    content:
      'Fifty years after the Collapse — a cascade of climate disasters, economic implosion, and the Glassstorm phenomenon — America is a patchwork of controlled zones, lawless corridors, and dead cities. The Directorate governs what remains of federal infrastructure. Everyone else survives on the Trail.',
  },
  {
    id: 'codex-trail-concept',
    category: 'world',
    title: 'The Trail',
    icon: '🛤️',
    alwaysVisible: true,
    content:
      'The Trail is what drifters call the network of ruined highways and backroads connecting what\'s left of civilization. It\'s not one road — it\'s all of them. Walk, drive, or ride, but keep moving. Stopping too long means you belong to whoever claims that ground.',
  },
  {
    id: 'codex-world-collapse',
    category: 'world',
    title: 'The Collapse',
    icon: '💥',
    content:
      'It didn\'t happen all at once. First the markets. Then the crops. Then the storms — not weather, but something else. Glass-like formations began appearing in Zone 04 around 2042. By 2049, the federal government had fractured into the Directorate and a dozen splinter authorities. By 2055, most people had stopped counting years.',
  },

  // ─── ZONES ───
  {
    id: 'codex-zone-rustbelt',
    category: 'zones',
    title: 'Rustbelt Verge',
    icon: '🏭',
    content:
      'The crumbling industrial corridor that marks the start of the Trail for most drifters heading west. Rusted factories, collapsed rail yards, and Directorate checkpoints define the landscape. The Free Bands maintain a fragile presence through trading posts and signal fires. Raiders are opportunistic but rarely organized. The real danger is the infrastructure itself — roads collapse, acid rain eats metal, and the old machines sometimes wake up.',
  },

  // ─── FACTIONS ───
  {
    id: 'codex-faction-directorate',
    category: 'factions',
    title: 'The Directorate',
    icon: '🏛️',
    content:
      'What remains of federal authority. The Directorate controls checkpoints, scanner networks, and supply depots along the major highways. Their Highway Patrols enforce tolls and "reclamation taxes." They offer order at the cost of freedom. Their propaganda speaks of rebuilding, but most drifters see them as another gang — just one with better uniforms and worse bureaucracy.',
  },
  {
    id: 'codex-faction-lanterns',
    category: 'factions',
    title: 'The Lanterns',
    icon: '🔥',
    content:
      'A loose network of aid workers, former medics, and idealists who maintain signal fires and safe camps along the Trail. They operate on a gift economy — share what you can, take what you need. Not everyone trusts them. Some say they\'re a front for something bigger. But when you\'re bleeding out on the roadside, the Lanterns are the ones who stop.',
  },
  {
    id: 'codex-faction-iron-caravan',
    category: 'factions',
    title: 'Iron Caravan',
    icon: '🚛',
    content:
      'The largest trading convoy on the Trail. Armored trucks, armed escorts, and a reputation for fair deals — if you can afford them. The Iron Caravan moves on a schedule known only to its drivers. Catching one at a rail yard or overpass is good luck. They trade in scrap, supplies, data, and occasionally, passage.',
  },

  // ─── ENEMIES ───
  {
    id: 'codex-enemy-reavers',
    category: 'enemies',
    title: 'Reaver Scouts',
    icon: '⚔️',
    content:
      'Lightly armored raiders who operate in pairs or small packs. They favor ambush tactics — hiding behind wrecked vehicles or in collapsed buildings. Individually weak, but their numbers and aggression make them a persistent threat. Most carry improvised weapons: sharpened rebar, pipe guns, and scrap grenades.',
  },
  {
    id: 'codex-enemy-drones',
    category: 'enemies',
    title: 'Survey Drones',
    icon: '🤖',
    content:
      'Directorate surveillance units that patrol in swarms. They scan for unregistered travelers, contraband, and "reclamation targets." Non-lethal individually, but being tagged by one means patrols know where you are. Some drifters have learned to jam their signals. Others just shoot them down and sell the sensor cores.',
  },
  {
    id: 'codex-enemy-glassborn',
    category: 'enemies',
    title: 'Glassborn',
    icon: '💎',
    content:
      'Nobody knows what they are. Humanoid shapes that move like liquid mercury, leaving fused glass in their wake. They appeared after the Glassstorms of 2042. The Directorate classifies them as "environmental anomalies." Drifters call them Glassborn and give them a wide berth. They seem to watch more than attack — but the ones who got too close aren\'t around to report back.',
  },
  {
    id: 'codex-enemy-trail-taxmen',
    category: 'enemies',
    title: 'Trail Taxmen',
    icon: '🛡️',
    content:
      'Directorate Highway Patrol officers who man the checkpoints. Armed with scanner wands, stun batons, and a bottomless appetite for tolls. They\'re not evil — most are just doing a job. But the toll rates are extortionate, and "resisting taxation" is a crime punishable by impoundment of your vehicle and a one-way trip to a reclamation camp.',
  },

  // ─── LOOT ───
  {
    id: 'codex-loot-data-fragment',
    category: 'loot',
    title: 'Data Fragment',
    icon: '💾',
    content:
      'A corrupted data module salvaged from pre-collapse terminals. Most of the information is garbled, but fragments of news archives, personal messages, and corporate records can be recovered. Valuable to collectors and historians — and to anyone trying to understand what happened.',
  },
  {
    id: 'codex-loot-sensor-core',
    category: 'loot',
    title: 'Drone Sensor Core',
    icon: '📡',
    content:
      'The optical and electromagnetic sensor array from a downed Directorate survey drone. Intact cores can be repurposed as rover upgrades, sold for good scrap, or used to build signal jammers. Handle with care — the Directorate marks their equipment, and possession of military hardware is technically a felony.',
  },
  {
    id: 'codex-loot-filter',
    category: 'loot',
    title: 'Purification Filter',
    icon: '🔬',
    content:
      'A multi-stage water and air purification filter. Essential for survival in contaminated zones. Old-world manufacturing — they don\'t make these anymore. A good filter can last months with proper maintenance. Without one, you\'re drinking whatever the wasteland gives you.',
  },
  {
    id: 'codex-loot-transit-chip',
    category: 'loot',
    title: 'Transit Chip',
    icon: '🪪',
    content:
      'A Directorate-issued electronic identification chip. Genuine ones grant passage through checkpoints without tolls. Forged ones work about half the time. Getting caught with a fake is worse than not having one at all.',
  },
  {
    id: 'codex-loot-lantern-token',
    category: 'loot',
    title: 'Lantern Token',
    icon: '🕯️',
    content:
      'A small wooden disc carved with the Lantern symbol — a candle flame inside a circle. Carrying one marks you as a friend of the network. It won\'t save you from raiders, but it opens doors that scrap can\'t.',
  },
];

export default codexEntries;
