// world.js — карта, чанки, поиск замкнутых областей (Го)

import { CONFIG } from './config.js';

export class World {
  constructor() {
    this.cells = new Map();       // "r,c" -> { owner, hp, maxHp }
    this.generatedChunks = new Set();
    this.players = new Map();     // id -> Player
  }

  key(r, c) { return `${r},${c}`; }
  get(r, c) { return this.cells.get(this.key(r, c)); }
  set(r, c, cell) { this.cells.set(this.key(r, c), cell); }
  has(r, c) { return this.cells.has(this.key(r, c)); }
  delete(r, c) { this.cells.delete(this.key(r, c)); }

  // Клетка в пределах карты?
  inBounds(r, c) {
    return Math.abs(r) <= CONFIG.MAP_RADIUS && Math.abs(c) <= CONFIG.MAP_RADIUS;
  }

  // Генерация одного чанка — только нейтральные клетки
  generateChunk(cx, cy) {
    const id = `${cx},${cy}`;
    if (this.generatedChunks.has(id)) return;
    this.generatedChunks.add(id);

    for (let r = 0; r < CONFIG.CHUNK; r++) {
      for (let c = 0; c < CONFIG.CHUNK; c++) {
        const wr = cy * CONFIG.CHUNK + r;
        const wc = cx * CONFIG.CHUNK + c;
        if (!this.inBounds(wr, wc)) continue;
        if (this.has(wr, wc)) continue;
        this.set(wr, wc, { owner: 'neutral', hp: CONFIG.NEUTRAL_HP, maxHp: CONFIG.NEUTRAL_HP });
      }
    }
  }

  // Обеспечить чанки вокруг камеры
  ensureChunksAround(worldX, worldY) {
    const cx = Math.floor(worldX / (CONFIG.CHUNK * CONFIG.CELL));
    const cy = Math.floor(worldY / (CONFIG.CHUNK * CONFIG.CELL));
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        this.generateChunk(cx + dx, cy + dy);
      }
    }
  }

  // Сгенерировать всю карту целиком (мир маленький)
  generateAll() {
    const maxC = Math.ceil(CONFIG.MAP_RADIUS / CONFIG.CHUNK);
    for (let cx = -maxC; cx <= maxC; cx++) {
      for (let cy = -maxC; cy <= maxC; cy++) {
        this.generateChunk(cx, cy);
      }
    }
  }

  // BFS по клеткам того же владельца. Возвращает Set ключей "r,c".
  findIsland(startR, startC, ownerId) {
    const startKey = this.key(startR, startC);
    const startCell = this.get(startR, startC);
    if (!startCell || startCell.owner !== ownerId) return new Set();

    const island = new Set();
    const queue = [[startR, startC]];
    island.add(startKey);
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

    while (queue.length > 0) {
      const [r, c] = queue.shift();
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        const nk = this.key(nr, nc);
        if (island.has(nk)) continue;
        const ncell = this.get(nr, nc);
        if (!ncell) continue;
        if (ncell.owner !== ownerId) continue;
        island.add(nk);
        queue.push([nr, nc]);
      }
    }
    return island;
  }

  // ============ ПОИСК ЗАМКНУТЫХ ОБЛАСТЕЙ (ГО) ============
  // Возвращает массив регионов, которые НЕ касаются пустых клеток.
  findEnclosedRegions(playerId) {
    const player = this.players.get(playerId);
    if (!player || player.cells.size === 0) return [];
    if (player.cells.size > 3000) return [];   // против лагов на больших империях

    const visited = new Set();
    const enclosed = [];
    const playerCells = [...player.cells];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

    for (const cellKey of playerCells) {
      if (visited.has(cellKey)) continue;

      const region = new Set();
      const queue = [cellKey];
      visited.add(cellKey);
      let touchesEmpty = false;

      while (queue.length > 0) {
        const k = queue.shift();
        region.add(k);
        const [r, c] = k.split(',').map(Number);

        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          const nk = this.key(nr, nc);
          if (visited.has(nk)) continue;

          const ncell = this.get(nr, nc);
          if (!ncell || ncell.owner === 'neutral') {
            touchesEmpty = true;
          } else if (ncell.owner === playerId) {
            visited.add(nk);
            queue.push(nk);
          }
        }
      }

      if (!touchesEmpty) {
        enclosed.push({ cells: [...region] });
      }
    }

    return enclosed;
  }
}