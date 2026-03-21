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

      tiles.push({ id, row, col, type, cleared: type === 'cleared', adjacentTo });
    }
  }

  return {
    id: 'sector-01',
    name: 'Rustbelt Outskirts',
    tiles,
    gridSize,
    completed: false,
  };
}
