import { Vec2, IEnemy } from '../types/interfaces';

export class SpatialHash {
  private cellSize: number;
  private grid: Map<string, IEnemy[]> = new Map();

  constructor(cellSize: number = 100) {
    this.cellSize = cellSize;
  }

  private getKey(x: number, y: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    return `${cx},${cy}`;
  }

  public clear(): void {
    this.grid.clear();
  }

  public insert(enemy: IEnemy): void {
    const key = this.getKey(enemy.pos.x, enemy.pos.y);
    let cell = this.grid.get(key);
    if (!cell) {
      cell = [];
      this.grid.set(key, cell);
    }
    cell.push(enemy);
  }

  public query(pos: Vec2, radius: number): IEnemy[] {
    const results: IEnemy[] = [];
    const minCx = Math.floor((pos.x - radius) / this.cellSize);
    const maxCx = Math.floor((pos.x + radius) / this.cellSize);
    const minCy = Math.floor((pos.y - radius) / this.cellSize);
    const maxCy = Math.floor((pos.y + radius) / this.cellSize);
    const r2 = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.grid.get(`${cx},${cy}`);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const e = cell[i];
            const dx = e.pos.x - pos.x;
            const dy = e.pos.y - pos.y;
            if (dx * dx + dy * dy <= r2) {
              results.push(e);
            }
          }
        }
      }
    }
    return results;
  }
}
