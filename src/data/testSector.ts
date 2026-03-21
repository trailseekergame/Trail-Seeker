import { Sector, SectorTile } from '../types';

export function generateTestSector(): Sector {
  const gridSize = 5;
  const tiles: SectorTile[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const id = `tile-${row}-${col}`;

      // Determine tile type
      let type: SectorTile['type'] = 'unknown';
      if (row === 0 && col === 0) type = 'cleared';
      else if (row === gridSize - 1 && col === gridSize - 1) type = 'boss';
      else if (Math.random() < 0.2) type = 'resource';
      else if (Math.random() < 0.1) type = 'anomaly';

      // Calculate adjacencies
      const adjacentTo: string[] = [];
      if (row > 0) adjacentTo.push(`tile-${row - 1}-${col}`);
      if (row < gridSize - 1) adjacentTo.push(`tile-${row + 1}-${col}`);
      if (col > 0) adjacentTo.push(`tile-${row}-${col - 1}`);
      if (col < gridSize - 1) adjacentTo.push(`tile-${row}-${col + 1}`);

      // Durability based on tile type
      const durabilityMap: Record<string, number> = {
        cleared: 0, unknown: 1, resource: 1, anomaly: 2, boss: 3,
      };
      const dur = durabilityMap[type] ?? 1;
      const maxDur = type === 'cleared' ? 1 : dur;

      tiles.push({ id, row, col, type, cleared: type === 'cleared', adjacentTo, durability: dur, maxDurability: maxDur });
    }
  }

  return {
    id: 'sector-01',
    name: 'Rustbelt Verge — Sector 7G',
    tiles,
    gridSize,
    completed: false,
  };
}
