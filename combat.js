// combat.js — боевая система: 3 режима + Го

import { CONFIG } from './config.js';

export class CombatSystem {
  constructor(world) {
    this.world = world;
  }

  // Враги вокруг конкретной клетки
  getBorderEnemiesAround(player, r, c) {
    const result = [];
    const seen = new Set();
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      const k = this.world.key(nr, nc);
      if (seen.has(k)) continue;
      const cell = this.world.get(nr, nc);
      if (!cell) continue;
      if (cell.owner === player.id) continue;
      if (cell.owner === 'neutral') continue;
      if (!cell.owner) continue;
      seen.add(k);
      result.push({ r: nr, c: nc, key: k, cell, owner: cell.owner });
    }
    return result;
  }

  isAdjacentTo(player, r, c) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
      const cell = this.world.get(r + dr, c + dc);
      if (cell && cell.owner === player.id) return true;
    }
    return false;
  }

  // Основной метод атаки
  // mode: 'border' | 'focus' | 'deep'
  attack(player, mode, sourceR, sourceC, targetR, targetC) {
    // «Граница»: стоимость зависит от числа задетых клеток — считаем после сбора целей
    let cost = mode === 'border' ? 0 : player.attackCost(mode);
    if (mode !== 'border' && player.energy < cost) {
      return { ok: false, reason: 'no_energy', cost, have: player.energy };
    }

    let targets = [];
    const damage = player.attackDamage(mode);

    if (mode === 'border') {
      const src = this.world.get(sourceR, sourceC);
      if (!src || src.owner !== player.id) return { ok: false, reason: 'invalid_source' };

      // Находим ВЕСЬ остров, к которому принадлежит кликнутая клетка
      const island = this.world.findIsland(sourceR, sourceC, player.id);

      // Собираем всех врагов, прилегающих к ЛЮБОЙ клетке острова
      const seen = new Set();
      targets = [];
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

      for (const cellKey of island) {
        const [r, c] = cellKey.split(',').map(Number);
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          const k = this.world.key(nr, nc);
          if (seen.has(k)) continue;
          const cell = this.world.get(nr, nc);
          if (!cell) continue;
          if (cell.owner === player.id) continue;
          if (cell.owner === 'neutral') continue;
          if (!cell.owner) continue;
          // Граница бьёт только обычные клетки, вплотную прилегающие к острову.
          // Башни врага (в т.ч. внутренних островов) — не цепляет: для них «Вглубь».
          if (cell.isTower) continue;
          seen.add(k);
          targets.push({ r: nr, c: nc, key: k, cell, owner: cell.owner });
        }
      }

      if (targets.length === 0) return { ok: false, reason: 'no_border' };

      // Стоимость = за каждую задетую клетку
      cost = Math.max(1, Math.round(targets.length * CONFIG.BORDER_COST_PER_TARGET));
      if (player.energy < cost) {
        return { ok: false, reason: 'no_energy', cost, have: player.energy };
      }
    } else if (mode === 'focus') {
      const cell = this.world.get(targetR, targetC);
      if (!cell || cell.owner === player.id || cell.owner === 'neutral' || !cell.owner) {
        return { ok: false, reason: 'invalid_target' };
      }
      if (!this.isAdjacentTo(player, targetR, targetC)) return { ok: false, reason: 'not_adjacent' };
      const tp = this.world.players.get(cell.owner);
      if (tp && tp.isShielded) return { ok: false, reason: 'shielded' };
      targets = [{ r: targetR, c: targetC, key: this.world.key(targetR, targetC), cell, owner: cell.owner }];
    } else if (mode === 'deep') {
      const cell = this.world.get(targetR, targetC);
      if (!cell || cell.owner === player.id || cell.owner === 'neutral' || !cell.owner) {
        return { ok: false, reason: 'invalid_target' };
      }
      const tp = this.world.players.get(cell.owner);
      if (tp && tp.isShielded) return { ok: false, reason: 'shielded' };
      targets = [{ r: targetR, c: targetC, key: this.world.key(targetR, targetC), cell, owner: cell.owner }];
    } else {
      return { ok: false, reason: 'bad_mode' };
    }

    player.energy -= cost;

    const captured = [];
    const damaged = [];
    const killedPlayers = [];

    for (const t of targets) {
      const owner = this.world.players.get(t.owner);
      if (!owner || owner.towerHp <= 0) continue;

      // Клетка главной башни — урон идёт в общий запас HP башни
      if (t.cell.isTower) {
        owner.towerHp -= damage;
        damaged.push({ r: t.r, c: t.c, hp: Math.max(0, owner.towerHp), owner: t.owner });
        if (owner.towerHp <= 0) this.eliminatePlayer(player, owner, captured, killedPlayers);
        continue;
      }

      // Обычная клетка
      t.cell.hp -= damage;
      damaged.push({ r: t.r, c: t.c, hp: t.cell.hp, owner: t.owner });

      if (t.cell.hp <= 0) {
        const oldOwnerId = t.cell.owner;
        t.cell.owner = player.id;
        t.cell.hp = player.maxHp();
        t.cell.maxHp = player.maxHp();
        player.cells.add(t.key);
        captured.push({ r: t.r, c: t.c, oldOwner: oldOwnerId });

        const oldOwner = this.world.players.get(oldOwnerId);
        if (oldOwner) oldOwner.cells.delete(t.key);

        // Проверяем замкнутые области (Го) — только для focus
        if (mode === 'focus') {
          const enclosed = this.world.findEnclosedRegions(oldOwnerId);
          for (const region of enclosed) {
            for (const cellKey of region.cells) {
              const [rr, cc] = cellKey.split(',').map(Number);
              const c2 = this.world.get(rr, cc);
              if (!c2) continue;
              c2.owner = player.id;
              c2.hp = player.maxHp();
              c2.maxHp = player.maxHp();
              player.cells.add(cellKey);
              if (oldOwner) oldOwner.cells.delete(cellKey);
              captured.push({ r: rr, c: cc, oldOwner: oldOwnerId, enclosed: true });
            }
          }
        }
      }
    }

    return { ok: true, mode, damage, cost, targets: targets.length, damaged, captured, killedPlayers };
  }

  // Полный разгром: все клетки жертвы переходят победителю
  eliminatePlayer(killer, victim, captured, killedPlayers) {
    for (const vk of [...victim.cells]) {
      const [vr, vc] = vk.split(',').map(Number);
      const vcell = this.world.get(vr, vc);
      if (vcell) {
        vcell.owner = killer.id;
        vcell.hp = killer.maxHp();
        vcell.maxHp = killer.maxHp();
        vcell.isTower = false;
        killer.cells.add(vk);
        captured.push({ r: vr, c: vc, oldOwner: victim.id, fromKill: true });
      }
    }
    victim.cells.clear();
    victim.startCellKey = null;
    victim.towerPos = null;
    victim.towerHp = 0;
    const reward = this.applyKillReward(killer, victim);
    killedPlayers.push({ id: victim.id, name: victim.name, reward });
  }

  applyKillReward(killer, victim) {
    const energyReward = Math.floor(victim.energy * CONFIG.KILL_REWARD_ENERGY);
    killer.energy += energyReward;
    killer.conquerorUntil = Date.now() + CONFIG.CONQUEROR_DURATION * 1000;
    return { energyReward };
  }
}