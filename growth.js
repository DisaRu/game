// growth.js — рост территории

export class GrowthSystem {
  constructor(world) {
    this.world = world;
  }

  expand(player) {
    if (!player.canGrow(this.world)) {
      return { expanded: false, reason: 'no_empty_around' };
    }

    const candidates = [];
    const seen = new Set();
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

    for (const cellKey of player.cells) {
      const [r, c] = cellKey.split(',').map(Number);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        const k = this.world.key(nr, nc);
        if (seen.has(k)) continue;
        const cell = this.world.get(nr, nc);
        if (cell && cell.owner === 'neutral') {
          seen.add(k);
          candidates.push([nr, nc]);
        }
      }
    }

    if (candidates.length === 0) return { expanded: false };

    const [nr, nc] = candidates[Math.floor(Math.random() * candidates.length)];
    const maxHp = player.maxHp();
    this.world.set(nr, nc, { owner: player.id, hp: maxHp, maxHp });
    player.cells.add(this.world.key(nr, nc));

    return { expanded: true };
  }
}