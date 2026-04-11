import { SectorTile, Sector, TileFlavor } from '../types';
import { BROKEN_OVERPASS_TILES, RELAY_FIELD_TILES, AuthoredTileDef } from './authoredTiles';

/**
 * Map definitions for the early-game loop.
 * Each map has a background, grid config, unlock rule, and story context.
 */

import { MapId } from '../types';
export { MapId };

export interface MapDef {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  /** Background image require() */
  background: any;
  /** Icon for the mission select list */
  icon: string;
  /** Grid size (NxN) for generated sector */
  gridSize: number;
  /** What percentage of tiles are hardened (durability > 1) */
  hardenedRate: number;
  /** What percentage of tiles are anomaly type */
  anomalyRate: number;
  /** What percentage of tiles are resource type */
  resourceRate: number;
  /** Which maps must be completed to unlock this one */
  requiresCompleted: MapId[];
  /** Story intro shown before first scan on this map */
  briefing: string;
  /** Flavor text for session end on this map */
  debriefing: string;
  /** What unlocks when this map is completed */
  unlocksMap?: MapId;
}

export const MAP_DEFS: Record<MapId, MapDef> = {
  camp: {
    id: 'camp',
    name: 'Camp',
    subtitle: 'Waystation',
    description: 'Your base of operations. Refit, plan, and pick your next job.',
    background: require('../assets/backgrounds/bg_camp.jpg'),
    icon: 'home-group',
    gridSize: 0, // Camp has no grid
    hardenedRate: 0,
    anomalyRate: 0,
    resourceRate: 0,
    requiresCompleted: [],
    briefing: '',
    debriefing: '',
  },

  broken_overpass: {
    id: 'broken_overpass',
    name: 'Broken Overpass',
    subtitle: 'Sector 7G — Rustbelt Perimeter',
    description:
      'A collapsed highway interchange. Directorate patrols avoid the wreckage, which means there\'s salvage underneath.',
    background: require('../assets/backgrounds/bg_broken_overpass.jpg'),
    icon: 'road-variant',
    gridSize: 6,
    hardenedRate: 0.22,
    anomalyRate: 0.12,
    resourceRate: 0.20,
    requiresCompleted: [],
    briefing:
      'The Directorate rerouted Highway 7 through a compliance corridor in 2061. The original overpass was left to collapse — nobody was supposed to need it anymore. Eighteen years of weather and neglect buried supply caches, abandoned vehicles, and the electronics inside them under concrete and rebar. Directorate patrols avoid the unstable structure. Your scanner reads salvage signatures all through the wreckage. Whatever you pull out of here, nobody\'s coming to claim it.',
    debriefing:
      'The overpass is stripped clean. Your scanner picked up signal traces during the last pass — a relay array east of here, still broadcasting on a dead frequency. Worth investigating.',
    unlocksMap: 'relay_field',
  },

  relay_field: {
    id: 'relay_field',
    name: 'Relay Field',
    subtitle: 'Sector 12E — Dead Signal Array',
    description:
      'An abandoned communications array. The dishes still hum with residual power — and buried data.',
    background: require('../assets/backgrounds/bg_relay_field.jpg'),
    icon: 'satellite-uplink',
    gridSize: 6,
    hardenedRate: 0.25,
    anomalyRate: 0.16,
    resourceRate: 0.16,
    requiresCompleted: ['broken_overpass'],
    briefing:
      'This was a pre-collapse military communications array — thirty dishes pointed at satellites that stopped answering decades ago. The Directorate gutted the surface hardware for parts, but the underground data vault was sealed by a security protocol that predates AEGIS. The machine can\'t override its own predecessor. The dishes still hum with residual power, and whatever\'s stored in that vault hasn\'t been touched in thirty years. Free Band chatter says the data inside is worth more than a year of scrap runs.',
    debriefing:
      'Vault cracked. The data cores are yours — pre-collapse intel that the Directorate would kill to keep buried. Back to camp for recalibration. Your rig earned this one.',
  },
  broken_overpass_hard: {
    id: 'broken_overpass_hard',
    name: 'Broken Overpass [HARDENED]',
    subtitle: 'Sector 7G — Hardened Zone',
    description:
      'The wreckage has been picked over. What\'s left is guarded by heavier patrols and tougher drones. Better drops for those who survive.',
    background: require('../assets/backgrounds/bg_broken_overpass.jpg'),
    icon: 'road-variant',
    gridSize: 6,
    hardenedRate: 0.35,
    anomalyRate: 0.22,
    resourceRate: 0.15,
    requiresCompleted: ['broken_overpass'],
    briefing:
      'The Directorate noticed the scanning activity. Reinforcement drones have been deployed to the overpass wreckage and the surrounding perimeter is flagged for reclamation. The salvage that\'s left is deeper — buried under layers that your first pass couldn\'t reach. Armored drones run patrol loops through the rubble. The risk is real, but so is what\'s down there. Operators who ran this zone before you either got rich or didn\'t come back.',
    debriefing:
      'You made it back. Again. The overpass has nothing left to give — but what you pulled from the deep layers will keep you running for a while. The Directorate will notice the gap in their inventory.',
  },
  relay_field_hard: {
    id: 'relay_field_hard',
    name: 'Relay Field [HARDENED]',
    subtitle: 'Sector 12E — Hardened Zone',
    description:
      'The underground vault has been breached. Directorate countermeasures are active. Armored sentinels patrol the corridors.',
    background: require('../assets/backgrounds/bg_relay_field.jpg'),
    icon: 'satellite-uplink',
    gridSize: 6,
    hardenedRate: 0.40,
    anomalyRate: 0.25,
    resourceRate: 0.12,
    requiresCompleted: ['relay_field'],
    briefing:
      'The vault is breached. The Directorate knows, and Warden-class enforcement platforms now patrol every corridor inside the array. Active jamming blankets the entire sector — your scanner will fight for every read. But the deepest data cores are still intact, and they contain pre-collapse research that the Directorate actively catalogued for destruction. This is the most dangerous ground you\'ve walked. It\'s also the most valuable.',
    debriefing:
      'The vault is empty now. Whatever the Directorate wanted destroyed, you pulled it out first. This is the kind of data that changes things — if it reaches the right hands. Season complete.',
  },
};

/** Ordered list of mission maps (excludes camp) */
export const MISSION_MAPS: MapId[] = ['broken_overpass', 'relay_field', 'broken_overpass_hard', 'relay_field_hard'];

/** Pick N random items from an array without replacement */
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Generate a sector for a given map */
export function generateSectorForMap(mapId: MapId): Sector {
  const mapDef = MAP_DEFS[mapId];
  if (mapDef.gridSize === 0) {
    // Camp — no grid
    return {
      id: `sector-${mapId}`,
      name: mapDef.name,
      tiles: [],
      gridSize: 0,
      completed: false,
    };
  }

  const gridSize = mapDef.gridSize;
  const tiles: SectorTile[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = `tile-${row}-${col}`;

      // Determine tile type
      let type: SectorTile['type'] = 'unknown';
      if (row === 0 && col === 0) type = 'cleared';
      else if (row === gridSize - 1 && col === gridSize - 1) type = 'boss';
      else if (Math.random() < mapDef.anomalyRate) type = 'anomaly';
      else if (Math.random() < mapDef.resourceRate) type = 'resource';

      // Calculate adjacencies
      const adjacentTo: string[] = [];
      if (row > 0) adjacentTo.push(`tile-${row - 1}-${col}`);
      if (row < gridSize - 1) adjacentTo.push(`tile-${row + 1}-${col}`);
      if (col > 0) adjacentTo.push(`tile-${row}-${col - 1}`);
      if (col < gridSize - 1) adjacentTo.push(`tile-${row}-${col + 1}`);

      // Durability based on tile type + map hardened rate
      // Base durability 2 for longer maps (~21 days per map)
      let dur = 2;
      if (type === 'cleared') dur = 0;
      else if (type === 'boss') dur = 4;
      else if (type === 'anomaly') dur = 3;
      else if (Math.random() < mapDef.hardenedRate) dur = 3;

      const maxDur = type === 'cleared' ? 1 : dur;

      tiles.push({
        id,
        row,
        col,
        type,
        cleared: type === 'cleared',
        adjacentTo,
        durability: dur,
        maxDurability: maxDur,
      });
    }
  }

  // ─── Stamp authored tile flavors ───
  if (mapId === 'broken_overpass') {
    assignAuthoredFlavors(tiles, BROKEN_OVERPASS_TILES, 5);
  } else if (mapId === 'relay_field') {
    assignAuthoredFlavors(tiles, RELAY_FIELD_TILES, 5);
  }

  return {
    id: `sector-${mapId}`,
    name: `${mapDef.name} — ${mapDef.subtitle}`,
    tiles,
    gridSize,
    completed: false,
  };
}

/**
 * Assign authored flavors to eligible tiles.
 * Picks `count` random authored defs and assigns each to a random
 * eligible tile that doesn't already have a flavor.
 */
function assignAuthoredFlavors(
  tiles: SectorTile[],
  defs: AuthoredTileDef[],
  count: number,
) {
  const selected = pickN(defs, Math.min(count, defs.length));

  for (const def of selected) {
    // Find eligible tiles: not cleared, not boss, matching type, no existing flavor
    const eligible = tiles.filter(
      t => !t.cleared && t.type !== 'boss' && !t.flavor && def.validTypes.includes(t.type)
    );
    if (eligible.length === 0) continue;

    const target = eligible[Math.floor(Math.random() * eligible.length)];
    target.flavor = def.flavor;

    // Override durability if the authored def specifies it
    if (def.durability !== undefined) {
      target.durability = def.durability;
      target.maxDurability = def.durability;
    }
  }
}
