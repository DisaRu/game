// game.js — фабрика: сборка мира, систем, игроков

import { World } from './world.js';
import { Player } from './player.js';
import { CombatSystem } from './combat.js';
import { GrowthSystem } from './growth.js';
import { CONFIG } from './config.js';

export function createGame() {
  const world = new World();
  const combat = new CombatSystem(world);
  const growth = new GrowthSystem(world);

  const me = new Player('me', CONFIG.COLORS[0]);
  me.name = 'ТЫ';
  world.players.set(me.id, me);

  const bots = [];
  for (let i = 0; i < CONFIG.BOT_COUNT; i++) {
    const bot = new Player('bot' + i, CONFIG.COLORS[(i + 1) % CONFIG.COLORS.length]);
    bot.name = CONFIG.BOT_NAMES[i % CONFIG.BOT_NAMES.length];
    bot.energy = 30;
    world.players.set(bot.id, bot);
    bots.push(bot);
  }

  return { world, combat, growth, me, bots };
}

// Спавн игрока на конкретной клетке
export function spawnPlayer(world, player, r, c, isStart = true) {
  // set() сам перезапишет neutral
  const maxHp = player.maxHp();
  if (isStart) {
    // Главная башня занимает блок 3x3
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (!world.inBounds(rr, cc)) continue;
        world.set(rr, cc, { owner: player.id, hp: maxHp, maxHp, isTower: true });
        player.cells.add(world.key(rr, cc));
      }
    }
    player.towerPos = { r, c };
    player.startCellKey = world.key(r, c);
    player.towerHp = player.towerMaxHp();
  } else {
    world.set(r, c, { owner: player.id, hp: maxHp, maxHp });
    player.cells.add(world.key(r, c));
    player.towerPos = { r, c };
  }
  world.players.set(player.id, player);
}

// Возрождение
export function respawnPlayer(world, player, r, c) {
  player.cells.clear();
  player.energy = 0;
  player.shieldUntil = Date.now() + CONFIG.RESPAWN_SHIELD_TIME * 1000;
  player.towerHp = 0;
  spawnPlayer(world, player, r, c, true);
}