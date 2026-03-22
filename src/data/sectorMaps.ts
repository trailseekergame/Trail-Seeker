import { SectorTile, Sector } from '../types';

/**
 * Map definitions for the early-game loop.
 * Each map has a background, grid config, unlock rule, and story context.
 */

export type MapId = 'camp' | 'broken_overpass' | 'relay_field';

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
    gridSize: 5,
    hardenedRate: 0.12,
    anomalyRate: 0.08,
    resourceRate: 0.20,
    requiresCompleted: [],
    briefing:
      'The overpass buckled during the orbital strikes. Directorate marked it condemned — meaning nobody\'s picked it clean yet. Your scanner should cut through the rebar.',
    debriefing:
      'The overpass is stripped. Signal traces point deeper — a relay array east of here, still broadcasting on a dead frequency.',
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
    gridSize: 5,
    hardenedRate: 0.18,
    anomalyRate: 0.14,
    resourceRate: 0.16,
    requiresCompleted: ['broken_overpass'],
    briefing:
      'Pre-collapse relay station. The Directorate gutted it for parts but the underground vault is still sealed. Your scanner can reach what they couldn\'t.',
    debriefing:
      'Vault cracked. The data cores are yours. Back to camp — your gear needs recalibrating after running that deep.',
  },
};

/** Ordered list of mission maps (excludes camp) */
export const MISSION_MAPS: MapId[] = ['broken_overpass', 'relay_field'];

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
      let dur = 1;
      if (type === 'cleared') dur = 0;
      else if (type === 'boss') dur = 3;
      else if (type === 'anomaly') dur = 2;
      else if (Math.random() < mapDef.hardenedRate) dur = 2;

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

  return {
    id: `sector-${mapId}`,
    name: `${mapDef.name} — ${mapDef.subtitle}`,
    tiles,
    gridSize,
    completed: false,
  };
}
