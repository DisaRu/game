// player.js — модель игрока

import { CONFIG } from './config.js';

export class Player {
  constructor(id, color) {
    this.id = id;
    this.name = id;               // отображаемое имя
    this.color = color;
    this.cells = new Set();       // "r,c"
    this.energy = 0;              // единый ресурс: рост + атака + лечение
    this.towerPos = null;         // { r, c }
    this.shieldUntil = 0;
    this.conquerorUntil = 0;
    this.startCellKey = null;
    this.towerHp = 0;             // общий запас HP главной башни
  }

  get cellCount() { return this.cells.size; }
  get isShielded() { return Date.now() < this.shieldUntil; }
  get hasConquerorBonus() { return Date.now() < this.conquerorUntil; }

  // Максимум HP башни зависит от количества захваченных клеток
  towerMaxHp() {
    return CONFIG.TOWER_HP_BASE + this.cellCount * CONFIG.TOWER_HP_PER_CELL;
  }

  // Стоимость появления клетки из единой энергии: 1 энергия = 1 клетка
  growCost() {
    return CONFIG.GROW_ENERGY_PER_CELL;
  }

  growRate() {
    let rate = CONFIG.BASE_GROW_RATE + this.cellCount * CONFIG.GROW_RATE_PER_CELL;
    if (this.hasConquerorBonus) rate *= (1 + CONFIG.CONQUEROR_GROW_BONUS);
    return rate;
  }

  maxHp() {
    return CONFIG.BASE_HP;
  }

  attackCost(mode = 'focus') {
    const base = CONFIG.BASE_ATTACK_COST;
    if (mode === 'deep') return Math.round(base * CONFIG.DEEP_COST_MULT);
    return base;
  }

  attackDamage(mode = 'focus') {
    const base = CONFIG.BASE_ATTACK_DAMAGE;
    if (mode === 'border') return Math.round(base * CONFIG.BORDER_DAMAGE_MULT);
    if (mode === 'deep') return Math.round(base * CONFIG.DEEP_DAMAGE_MULT);
    return base;
  }

  // Может ли игрок расти (есть ли рядом пустая клетка)
  canGrow(world) {
    for (const cellKey of this.cells) {
      const [r, c] = cellKey.split(',').map(Number);
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      for (const [dr, dc] of dirs) {
        const cell = world.get(r + dr, c + dc);
        if (cell && cell.owner === 'neutral') return true;
      }
    }
    return false;
  }
}