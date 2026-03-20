import { Zone } from '../types';

/**
 * Zone 01 – Rustbelt Verge
 * A crumbling industrial corridor: rusted factories, collapsed rail yards,
 * and patrol-haunted overpasses under acid-green skies.
 */
const zone01: Zone = {
  id: 'zone-01',
  name: 'Rustbelt Verge',
  subtitle: 'Industrial Corridor — Days 1–10',
  description:
    'The crumbling edge of the old manufacturing belt. Smokestacks pierce the haze like broken teeth, and every overpass hides a toll or a trap. The Directorate patrols are thin here — but the Free Bands and raiders fill the gaps.',
  startNodeId: 'node-start',
  endNodeId: 'node-exit',
  nodes: [
    {
      id: 'node-start',
      name: 'Waystation Diner',
      type: 'hub',
      description:
        'You wake in a half-collapsed waystation diner, its neon sign flickering between EAT, EXIT, and EXIST. Posters and graffiti layer the walls: Directorate slogans, Free Band manifestos, and handwritten missing-person notes. Somewhere behind the counter, a generator coughs and dies, leaving only the dim emergency strips along the floor and the quiet ticking of the rover\'s optics as it comes online beside you.',
      connections: ['node-01'],
      x: 10,
      y: 50,
      isRevealed: true,
    },
    {
      id: 'node-01',
      name: 'Rusted Factory Gate',
      type: 'encounter',
      description:
        'A massive stamping plant, walls caved in on the east side. Scavengers have been through here before, but the deeper levels might still hold useful parts.',
      connections: ['node-start', 'node-02'],
      x: 22,
      y: 35,
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
      x: 35,
      y: 45,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    {
      id: 'node-03',
      name: 'Patrol Checkpoint',
      type: 'encounter',
      description:
        'A Directorate Highway Patrol scanner post. The checkpoint light blinks amber — partially staffed. You can bluff through, sneak around, or pay the toll.',
      connections: ['node-02', 'node-04'],
      x: 48,
      y: 30,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-03b',
      name: 'Sewer Bypass',
      type: 'waypoint',
      description:
        'A flooded storm drain that cuts under the checkpoint. Faster, but dark. Your rover\'s sensors pick up movement.',
      connections: ['node-02', 'node-04'],
      x: 48,
      y: 62,
      isRevealed: false,
    },
    {
      id: 'node-04',
      name: 'Overpass Camp',
      type: 'encounter',
      description:
        'A Lantern outpost on the old I-80 overpass. They keep signal fires burning at night. Relatively safe — for a price.',
      connections: ['node-03', 'node-03b', 'node-05'],
      x: 60,
      y: 45,
      factionPresence: ['free-bands'],
      isRevealed: false,
    },
    {
      id: 'node-05',
      name: 'Sunken Overpass',
      type: 'settlement',
      description:
        'A collapsed highway interchange turned into a small market. Traders gather under tarps stretched between pillars. You can resupply, trade, or rest here.',
      connections: ['node-04', 'node-06'],
      x: 72,
      y: 50,
      factionPresence: ['free-bands', 'directorate'],
      isRevealed: false,
    },
    {
      id: 'node-06',
      name: 'Scrapfield',
      type: 'encounter',
      description:
        'An open expanse of crushed vehicles and stripped machinery. Reaver Scouts have been spotted here. Good salvage if you survive.',
      connections: ['node-05', 'node-07'],
      x: 82,
      y: 38,
      factionPresence: ['raiders'],
      isRevealed: false,
    },
    {
      id: 'node-07',
      name: 'Comm Tower Ruins',
      type: 'encounter',
      description:
        'A half-toppled broadcast tower. Survey drones circle overhead. The corrupted map flickers near this point — something is being broadcast.',
      connections: ['node-06', 'node-exit'],
      x: 90,
      y: 50,
      factionPresence: ['directorate'],
      isRevealed: false,
    },
    {
      id: 'node-exit',
      name: 'Verge Gate',
      type: 'waypoint',
      description:
        'The boundary marker between the Rustbelt Verge and whatever lies beyond. A battered sign reads: "YOU ARE LEAVING ZONE 01." The Trail continues.',
      connections: ['node-07'],
      x: 98,
      y: 50,
      isRevealed: false,
    },
  ],
};

export default zone01;
