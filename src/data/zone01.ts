import { Zone } from '../types';

/**
 * Zone 01 – Rustbelt Verge
 * A crumbling industrial corridor: rusted factories, collapsed rail yards,
 * and patrol-haunted overpasses under acid-green skies.
 *
 * ~30 nodes with branching paths to support a full 30-day run.
 * The trail splits, reconverges, and loops so the player can revisit
 * settlements, take detours, and explore at their own pace.
 */
const zone01: Zone = {
  id: 'zone-01',
  name: 'Rustbelt Verge',
  subtitle: 'Industrial Corridor — Days 1–30',
  description:
    'The crumbling edge of the old manufacturing belt. Smokestacks pierce the haze like broken teeth, and every overpass hides a toll or a trap. The Directorate patrols are thin here — but the Free Bands and raiders fill the gaps.',
  startNodeId: 'node-start',
  endNodeId: 'node-exit',
  nodes: [
    // ─── ACT 1: THE DINER & FACTORY DISTRICT (Days 1–5) ───
    {
      id: 'node-start',
      name: 'Waystation Diner',
      type: 'hub',
      description:
        'You wake in a half-collapsed waystation diner, its neon sign flickering between EAT, EXIT, and EXIST. Posters and graffiti layer the walls: Directorate slogans, Free Band manifestos, and handwritten missing-person notes. Somewhere behind the counter, a generator coughs and dies, leaving only the dim emergency strips along the floor and the quiet ticking of the rover\'s optics as it comes online beside you.',
      connections: ['node-01'],
      x: 3,
      y: 50,
      isRevealed: true,
    },
    {
      id: 'node-01',
      name: 'Rusted Factory Gate',
      type: 'encounter',
      description:
        'A massive stamping plant, walls caved in on the east side. Scavengers have been through here before, but the deeper levels might still hold useful parts.',
      connections: ['node-start', 'node-02', 'node-02b'],
      x: 9,
      y: 40,
      factionPresence: ['raiders'],
      isRevealed: true,
    },
    {
      id: 'node-02',
      name: 'Rail Yard Junction',
      type: 'encounter',
      description:
        'Derailed freight cars form a makeshift corridor. Iron Caravan traders sometimes camp here between runs. Watch for rail-drones.',
      connections: ['node-01', 'node-03', 'node-03b'],
      x: 16,
      y: 35,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    {
      id: 'node-02b',
      name: 'Buried Loading Dock',
      type: 'encounter',
      description:
        'Half-collapsed warehouse loading bay. The upper floors have been stripped, but the sealed basement level might still hold intact cargo.',
      connections: ['node-01', 'node-03b'],
      x: 16,
      y: 58,
      factionPresence: ['raiders'],
      isRevealed: false,
    },
    // ─── ACT 2: CHECKPOINT GAUNTLET (Days 5–10) ───
    {
      id: 'node-03',
      name: 'Patrol Checkpoint',
      type: 'encounter',
      description:
        'A Directorate Highway Patrol scanner post. The checkpoint light blinks amber — partially staffed. You can bluff through, sneak around, or pay the toll.',
      connections: ['node-02', 'node-04'],
      x: 23,
      y: 25,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-03b',
      name: 'Sewer Bypass',
      type: 'waypoint',
      description:
        'A flooded storm drain that cuts under the checkpoint. Faster, but dark. Your rover\'s sensors pick up movement.',
      connections: ['node-02', 'node-02b', 'node-04'],
      x: 23,
      y: 58,
      isRevealed: false,
    },
    {
      id: 'node-04',
      name: 'Overpass Camp',
      type: 'encounter',
      description:
        'A Lantern outpost on the old I-80 overpass. They keep signal fires burning at night. Relatively safe — for a price.',
      connections: ['node-03', 'node-03b', 'node-05', 'node-05b'],
      x: 30,
      y: 42,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    // ─── ACT 3: THE MARKET HUB & CROSSROADS (Days 8–14) ───
    {
      id: 'node-05',
      name: 'Sunken Overpass',
      type: 'settlement',
      description:
        'A collapsed highway interchange turned into a small market. Traders gather under tarps stretched between pillars. You can resupply, trade, or rest here.',
      connections: ['node-04', 'node-06', 'node-06b'],
      x: 37,
      y: 50,
      factionPresence: ['free-bands', 'directorate'],
      isRevealed: false,
    },
    {
      id: 'node-05b',
      name: 'Pipe Maze',
      type: 'encounter',
      description:
        'A labyrinth of exposed industrial pipes, some still leaking chemical runoff. Disorienting, but a shortcut for those with nerve.',
      connections: ['node-04', 'node-06b'],
      x: 37,
      y: 65,
      isRevealed: false,
    },
    // ─── ACT 4: DEEP RUSTBELT (Days 12–18) ───
    {
      id: 'node-06',
      name: 'Scrapfield',
      type: 'encounter',
      description:
        'An open expanse of crushed vehicles and stripped machinery. Reaver Scouts have been spotted here. Good salvage if you survive.',
      connections: ['node-05', 'node-07', 'node-07b'],
      x: 44,
      y: 38,
      factionPresence: ['raiders'],
      isRevealed: false,
    },
    {
      id: 'node-06b',
      name: 'Acid Wash Gulch',
      type: 'encounter',
      description:
        'A low-lying ravine where acid rain pools in stagnant green lakes. The air burns. Short path, but everything here corrodes.',
      connections: ['node-05', 'node-05b', 'node-08'],
      x: 44,
      y: 60,
      isRevealed: false,
    },
    {
      id: 'node-07',
      name: 'Comm Tower Ruins',
      type: 'encounter',
      description:
        'A half-toppled broadcast tower. Survey drones circle overhead. The corrupted map flickers near this point — something is being broadcast.',
      connections: ['node-06', 'node-08'],
      x: 50,
      y: 30,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-07b',
      name: 'Reaver Den',
      type: 'encounter',
      description:
        'A fortified camp in a gutted shopping center. Reaver banners hang from every window. Dangerous, but they respect strength — and they trade.',
      connections: ['node-06', 'node-08'],
      x: 50,
      y: 48,
      factionPresence: ['raiders'],
      isRevealed: false,
    },
    // ─── ACT 5: THE NARROWS (Days 15–20) ───
    {
      id: 'node-08',
      name: 'Freeway Narrows',
      type: 'waypoint',
      description:
        'A choke point where the old freeway squeezes between two collapsed overpasses. Everyone passes through here. Ambush country.',
      connections: ['node-07', 'node-07b', 'node-06b', 'node-09', 'node-09b'],
      x: 56,
      y: 45,
      factionPresence: ['raiders', 'directorate'],
      isRevealed: false,
    },
    {
      id: 'node-09',
      name: 'Signal Relay Station',
      type: 'encounter',
      description:
        'A Directorate relay station, barely operational. The signal array could be repurposed or sabotaged. The guards look tired.',
      connections: ['node-08', 'node-10'],
      x: 62,
      y: 32,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-09b',
      name: 'Bone Hollow',
      type: 'encounter',
      description:
        'A dried-up canal choked with debris and old bones — animal and otherwise. The Free Bands use it as a hidden route.',
      connections: ['node-08', 'node-10b'],
      x: 62,
      y: 58,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    // ─── ACT 6: SECOND SETTLEMENT (Days 18–22) ───
    {
      id: 'node-10',
      name: 'Rust Chapel',
      type: 'settlement',
      description:
        'An old church converted into a neutral trading post. All factions observe a truce within its walls. Repairs, rest, and rumor — all available for a price.',
      connections: ['node-09', 'node-11', 'node-11b'],
      x: 68,
      y: 40,
      factionPresence: ['free-bands', 'directorate', 'raiders'],
      isRevealed: false,
    },
    {
      id: 'node-10b',
      name: 'Lantern Waystation',
      type: 'settlement',
      description:
        'A quiet Lantern encampment in the basement of a collapsed library. They offer shelter and healing to those who share their ideals — or their supplies.',
      connections: ['node-09b', 'node-11b'],
      x: 68,
      y: 60,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    // ─── ACT 7: DEEP SCAR (Days 20–25) ───
    {
      id: 'node-11',
      name: 'Blast Crater',
      type: 'encounter',
      description:
        'A massive crater from the Collapse — the ground is fused glass in places. Radiation is low but not zero. Valuable salvage in the debris ring.',
      connections: ['node-10', 'node-12'],
      x: 74,
      y: 32,
      isRevealed: false,
    },
    {
      id: 'node-11b',
      name: 'Tanker Graveyard',
      type: 'encounter',
      description:
        'Rows of rusted fuel tankers, some still leaking. The smell is overwhelming. Reavers use them as cover; traders strip them for parts.',
      connections: ['node-10', 'node-10b', 'node-12b'],
      x: 74,
      y: 55,
      factionPresence: ['raiders'],
      isRevealed: false,
    },
    {
      id: 'node-12',
      name: 'Directorate Forward Post',
      type: 'encounter',
      description:
        'A reinforced Directorate outpost at the edge of the zone. Scanner arrays, watchtowers, and a gate that opens for those with clearance — or scrap.',
      connections: ['node-11', 'node-13'],
      x: 80,
      y: 35,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-12b',
      name: 'Glassborn Scar',
      type: 'encounter',
      description:
        'The ground here is wrong — fused, warped, and faintly warm. The air shimmers. Something happened here that nobody can explain. Fragments of impossible material litter the edge.',
      connections: ['node-11b', 'node-13'],
      x: 80,
      y: 58,
      isRevealed: false,
    },
    // ─── ACT 8: THE APPROACH (Days 24–28) ───
    {
      id: 'node-13',
      name: 'Verge Ridge',
      type: 'waypoint',
      description:
        'A high ridge overlooking the zone boundary. You can see the Gate from here. Behind you, the Rustbelt stretches into haze. Ahead — the unknown.',
      connections: ['node-12', 'node-12b', 'node-14', 'node-14b'],
      x: 86,
      y: 45,
      isRevealed: false,
    },
    {
      id: 'node-14',
      name: 'Gate Market',
      type: 'settlement',
      description:
        'A final rest stop for drifters heading beyond the Verge. Every faction has a presence here. Prices are high, but so are the stakes.',
      connections: ['node-13', 'node-exit'],
      x: 92,
      y: 38,
      factionPresence: ['free-bands', 'directorate', 'raiders'],
      isRevealed: false,
    },
    {
      id: 'node-14b',
      name: 'Smuggler\'s Cut',
      type: 'encounter',
      description:
        'A hidden path through a collapsed tunnel, known only to Free Band runners and desperate drifters. Dangerous, but it bypasses the Gate Market entirely.',
      connections: ['node-13', 'node-exit'],
      x: 92,
      y: 56,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    // ─── DESTINATION (Day 28–30) ───
    {
      id: 'node-exit',
      name: 'Verge Gate',
      type: 'waypoint',
      description:
        'The boundary marker between the Rustbelt Verge and whatever lies beyond. A battered sign reads: "YOU ARE LEAVING ZONE 01." The Trail continues.',
      connections: ['node-14', 'node-14b'],
      x: 98,
      y: 48,
      isRevealed: false,
    },
  ],
};

export default zone01;
