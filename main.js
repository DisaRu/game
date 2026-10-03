// main.js — точка входа, игровой цикл, события

import { CONFIG } from './config.js';
import { createGame, spawnPlayer, respawnPlayer } from './game.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';

const { world, combat, growth, me, bots } = createGame();

// Полная генерация карты (мир маленький)
world.generateAll();

// Состояние
const camera = { x: 0, y: 0 };
let dragging = false;
let lastMouse = { x: 0, y: 0 };
let holding = false;
let waitingForRespawn = false;
let gameStarted = false;
let selectedBase = null;
// Удар по зажатию: урон раз в секунду, пока кнопка удерживается
let attackHeld = false;
let attackCell = null;
let attackMoved = 0;
let lastAttackTick = 0;

// UI и Renderer
const canvas = document.getElementById('canvas');
const renderer = new Renderer(canvas, world, camera, me.id);
const ui = new UI();
ui.bindModeSwitch();

// ============ УПРАВЛЕНИЕ КАМЕРОЙ ============
// Край поля упирается в край экрана — за пределы карты листать нельзя.
// Если поле меньше экрана — оно центрируется.
function clampCamera() {
  const zoom = camera.zoom || 1;
  const cellPx = CONFIG.CELL * zoom;
  const cw = canvas.width;
  const ch = canvas.height;
  const minR = -CONFIG.MAP_RADIUS;
  const maxR = CONFIG.MAP_RADIUS;

  // Левый/правый край поля на экране не должны выходить за экран
  const minCamX = minR * cellPx + cw / 2;
  const maxCamX = (maxR + 1) * cellPx - cw / 2;
  if (minCamX <= maxCamX) {
    camera.x = Math.max(minCamX, Math.min(maxCamX, camera.x));
  } else {
    camera.x = (minCamX + maxCamX) / 2;
  }

  const minCamY = minR * cellPx + ch / 2;
  const maxCamY = (maxR + 1) * cellPx - ch / 2;
  if (minCamY <= maxCamY) {
    camera.y = Math.max(minCamY, Math.min(maxCamY, camera.y));
  } else {
    camera.y = (minCamY + maxCamY) / 2;
  }
}

canvas.addEventListener('mousedown', (e) => {
  dragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
  // Зажатие атаки: фиксируем клетку, удары пойдут раз в секунду
  if (gameStarted && !waitingForRespawn) {
    attackHeld = true;
    attackCell = cellFromEvent(e);
    attackMoved = 0;
    lastAttackTick = performance.now();
  }
});
canvas.addEventListener('mousemove', (e) => {
  if (attackHeld) {
    attackMoved += Math.hypot(e.clientX - lastMouse.x, e.clientY - lastMouse.y);
    if (attackMoved > 12) attackHeld = false;   // это драг камеры, не атака
    else attackCell = cellFromEvent(e);
  }
  if (!dragging) return;
  camera.x += e.clientX - lastMouse.x;
  camera.y += e.clientY - lastMouse.y;
  clampCamera();
  lastMouse = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('mouseup', () => { dragging = false; attackHeld = false; });
canvas.addEventListener('mouseleave', () => { dragging = false; attackHeld = false; });

// Zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const oldZoom = camera.zoom || 1;
  const delta = e.deltaY > 0 ? -CONFIG.ZOOM_STEP : CONFIG.ZOOM_STEP;
  camera.zoom = Math.max(CONFIG.ZOOM_MIN, Math.min(CONFIG.ZOOM_MAX, oldZoom + delta));
  // Корректируем позицию камеры чтобы зум был к курсору
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  camera.x -= mx * (camera.zoom - oldZoom);
  camera.y -= my * (camera.zoom - oldZoom);
  clampCamera();
}, { passive: false });

// Touch
let touchStart = null;
let lastTouch = { x: 0, y: 0 };
canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY, camX: camera.x, camY: camera.y };
  if (gameStarted && !waitingForRespawn) {
    attackHeld = true;
    attackCell = cellFromEvent(t);
    attackMoved = 0;
    lastAttackTick = performance.now();
  }
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (!touchStart) return;
  const t = e.touches[0];
  if (attackHeld) {
    attackMoved += Math.hypot(t.clientX - lastTouch.x, t.clientY - lastTouch.y);
    if (attackMoved > 12) attackHeld = false;
    else attackCell = cellFromEvent(t);
  }
  lastTouch = { x: t.clientX, y: t.clientY };
  camera.x = touchStart.camX + (t.clientX - touchStart.x);
  camera.y = touchStart.camY + (t.clientY - touchStart.y);
  clampCamera();
}, { passive: true });
canvas.addEventListener('touchend', () => { touchStart = null; attackHeld = false; });

// ============ СТАРТОВЫЙ ЭКРАН: ВЫБОР МЕСТА БАЗЫ ============
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

function spawnBots() {
  const maxR = CONFIG.MAP_RADIUS - 4;
  bots.forEach((bot) => {
    let r, c, tries = 0;
    do {
      r = Math.round((Math.random() - 0.5) * 2 * maxR);
      c = Math.round((Math.random() - 0.5) * 2 * maxR);
      tries++;
    } while (tries < 40 && Math.hypot(r - me.towerPos.r, c - me.towerPos.c) < 12);
    spawnPlayer(world, bot, r, c, true);
  });
}

startBtn.addEventListener('click', () => {
  if (!selectedBase) return;
  spawnPlayer(world, me, selectedBase.r, selectedBase.c, true);
  spawnBots();
  gameStarted = true;
  renderer.selectedBase = null;
  startScreen.style.display = 'none';
  camera.x = selectedBase.c * CONFIG.CELL + CONFIG.CELL / 2;
  camera.y = selectedBase.r * CONFIG.CELL + CONFIG.CELL / 2;
  clampCamera();
  ui.toast('🏰 База основана!', '#34c759');
});

// ============ КЛИК / УДАР ПО ЗАЖАТИЮ ============
// Координаты курсора -> клетка мира
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const zoom = camera.zoom || 1;
  const offsetX = canvas.width / 2 - camera.x;
  const offsetY = canvas.height / 2 - camera.y;
  const wx = (e.clientX - rect.left - offsetX) / zoom;
  const wy = (e.clientY - rect.top - offsetY) / zoom;
  return { r: Math.floor(wy / CONFIG.CELL), c: Math.floor(wx / CONFIG.CELL) };
}

// Атака в клетке (quiet = без тостов, для повторов по зажатию)
function doAttack(r, c, quiet = false) {
  // До старта — выбор места базы
  if (!gameStarted) {
    if (!world.inBounds(r - 1, c - 1) || !world.inBounds(r + 1, c + 1)) {
      ui.toast('Слишком близко к краю карты', '#888');
      return;
    }
    selectedBase = { r, c };
    renderer.selectedBase = selectedBase;
    startBtn.disabled = false;
    startBtn.classList.add('ready');
    startBtn.textContent = 'Основать здесь';
    return;
  }

  // Режим респавна
  if (waitingForRespawn) {
    if (!world.inBounds(r - 1, c - 1) || !world.inBounds(r + 1, c + 1)) {
      ui.toast('Слишком близко к краю карты', '#888');
      return;
    }
    respawnPlayer(world, me, r, c);
    waitingForRespawn = false;
    renderer.waitingForRespawn = false;
    ui.setRespawnMode(false);
    camera.x = c * CONFIG.CELL + CONFIG.CELL / 2;
    camera.y = r * CONFIG.CELL + CONFIG.CELL / 2;
    clampCamera();
    ui.toast('🛡️ Щит 10 сек', '#4da3ff');
    return;
  }

  const cell = world.get(r, c);

  // BORDER: по своей клетке
  if (ui.currentMode === 'border') {
    if (!cell || cell.owner !== me.id) {
      if (!quiet) ui.toast('Кликни по своей клетке', '#888');
      return;
    }
    const result = combat.attack(me, 'border', r, c, 0, 0);
    if (!result.ok) {
      if (quiet) return;
      if (result.reason === 'no_energy') ui.toast(`Нужно ${result.cost} энергии`, '#ff9500');
      else if (result.reason === 'no_border') ui.toast('Нет врагов вокруг', '#888');
      else ui.toast('Нельзя', '#888');
      return;
    }
    showAttackResult(result);
    return;
  }

  // FOCUS / DEEP: по врагу
  if (!cell || cell.owner === me.id || cell.owner === 'neutral' || !cell.owner) {
    if (!quiet) ui.toast('Кликни по врагу', '#888');
    return;
  }

  const result = combat.attack(me, ui.currentMode, 0, 0, r, c);
  if (!result.ok) {
    if (quiet) return;
    if (result.reason === 'no_energy') ui.toast(`Нужно ${result.cost} энергии`, '#ff9500');
    else if (result.reason === 'not_adjacent') ui.toast('Не граничит — используй «Вглубь»', '#888');
    else if (result.reason === 'shielded') ui.toast('🛡️ Щит', '#888');
    else ui.toast('Нельзя', '#888');
    return;
  }
  showAttackResult(result);
}

canvas.addEventListener('click', (e) => {
  // Одиночный клик: выбор базы / респавн (атаки идут зажатием)
  if (!gameStarted || waitingForRespawn) {
    const { r, c } = cellFromEvent(e);
    doAttack(r, c);
  }
});

function showAttackResult(result) {
  let msg = `💥 ${result.damage} по ${result.targets}`;
  if (result.captured.length > 0) {
    const enclosed = result.captured.filter(c => c.enclosed).length;
    msg = enclosed > 0
      ? `🍣 Замкнуто! Захвачено ${enclosed}`
      : `✅ Захвачено ${result.captured.length}`;
  }
  if (result.killedPlayers.length > 0) {
    const k = result.killedPlayers[0];
    msg = `🏆 ${k.name || k.id} разгромлен! +${k.reward.energyReward}⚡`;
  }
  ui.toast(msg, result.captured.length > 0 ? '#34c759' : '#ff9500');
}

// ============ КНОПКА РОСТ ============
const btn = document.getElementById('btn');

function startHold(e) {
  e.preventDefault();
  if (waitingForRespawn) return;
  holding = true;
  btn.classList.add('holding');
  btn.textContent = 'ДЕРЖИ!';
}
function endHold() {
  if (!holding) return;
  holding = false;
  btn.classList.remove('holding');
  btn.textContent = 'РОСТ';
}

btn.addEventListener('mousedown', startHold);
window.addEventListener('mouseup', endHold);
btn.addEventListener('touchstart', startHold, { passive: false });
btn.addEventListener('touchend', endHold);
btn.addEventListener('touchcancel', endHold);

// ============ КНОПКА ЛЕЧИТЬ (зажать) ============
const healBtn = document.getElementById('healBtn');
let healHeld = false;

function startHeal(e) {
  e.preventDefault();
  if (waitingForRespawn) return;
  healHeld = true;
  healBtn.classList.add('holding');
}
function endHeal() {
  if (!healHeld) return;
  healHeld = false;
  healBtn.classList.remove('holding');
}

healBtn.addEventListener('mousedown', startHeal);
window.addEventListener('mouseup', endHeal);
healBtn.addEventListener('touchstart', startHeal, { passive: false });
healBtn.addEventListener('touchend', endHeal);
healBtn.addEventListener('touchcancel', endHeal);

// ============ ИГРОВОЙ ЦИКЛ ============
let lastTime = performance.now();
let botTimer = 0;
let winTimer = 0;
let growTick = 0;
let healTick = 0;
const TOTAL_CELLS = (2 * CONFIG.MAP_RADIUS + 1) ** 2;

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  // До старта игры — только рендер карты
  if (!gameStarted) {
    world.ensureChunksAround(camera.x, camera.y);
    renderer.draw();
    requestAnimationFrame(loop);
    return;
  }

  if (!waitingForRespawn) {
    // Единая энергия: зажал РОСТ — копится вверх
    if (holding) {
      me.energy += me.growRate() * dt;
      growTick = now;   // после отпускания первый тик роста — через секунду
    } else if (me.energy > 0 && now - growTick >= 1000) {
      // Тик раз в секунду: энергия тратится, появляются клетки (1 энергия = 1 клетка)
      growTick = now;
      const spend = Math.min(CONFIG.SPEND_RATE, me.energy);
      me.energy -= spend;
      let cells = Math.floor(spend / CONFIG.GROW_ENERGY_PER_CELL);
      while (cells-- > 0) {
        const res = growth.expand(me);
        if (!res.expanded) break;
      }
    }

    // Удар по зажатию: урон раз в секунду
    if (attackHeld && attackCell && now - lastAttackTick >= 1000) {
      lastAttackTick = now;
      doAttack(attackCell.r, attackCell.c, true);
    }

    // Лечение башни зажатой кнопкой: раз в секунду, тратит энергию
    if (healHeld && me.towerPos && me.towerHp < me.towerMaxHp() && me.energy > 0 && now - healTick >= 1000) {
      healTick = now;
      const gain = Math.min(CONFIG.HEAL_HP_RATE, me.towerMaxHp() - me.towerHp);
      const cost = Math.min(gain * (CONFIG.HEAL_ATTACK_RATE / CONFIG.HEAL_HP_RATE), me.energy);
      me.energy -= cost;
      me.towerHp += cost * (CONFIG.HEAL_HP_RATE / CONFIG.HEAL_ATTACK_RATE);
    }

    // Проверка смерти — башня разрушена ИЛИ игрока разгромили (нет башни)
    if (!me.towerPos || me.towerHp <= 0) {
      waitingForRespawn = true;
      renderer.waitingForRespawn = true;
      ui.setRespawnMode(true);
      ui.toast('💀 Башня разрушена! Выбери место для новой базы', '#ff3b30');
    }
  }

  // Боты: общий тик раз в секунду
  if (now - botTimer > 1000) {
    botTimer = now;
    tickBots();
  }

  // Победа + рейтинг — раз в секунду
  if (now - winTimer > 1000) {
    winTimer = now;
    ui.updateRating(world.players);
    for (const p of world.players.values()) {
      if (p.cellCount >= TOTAL_CELLS) {
        renderer.gameOverMsg = p.id === me.id
          ? '🏆 ПОБЕДА! Вся карта твоя!'
          : `💀 ${p.name} захватил всю карту`;
        gameStarted = false;
      }
    }
  }

  // HUD
  ui.update(me);

  // Рендер
  world.ensureChunksAround(camera.x, camera.y);
  renderer.draw();

  requestAnimationFrame(loop);
}

function tickBots() {
  for (const bot of bots) {
    if (bot.cells.size === 0) {
      // Возрождение в пределах карты
      const maxR = CONFIG.MAP_RADIUS - 3;
      const br = Math.round((Math.random() - 0.5) * 2 * maxR);
      const bc = Math.round((Math.random() - 0.5) * 2 * maxR);
      respawnPlayer(world, bot, br, bc);
      ui.toast(`🤖 ${bot.name} возродился`, bot.color);
      continue;
    }
    if (bot.isShielded) continue;

    // Боты: та же экономика, что и у игрока (единая энергия, тик 1 сек)
    const rate = bot.growRate();
    bot.energy += rate;

    // Тик раз в секунду: трата энергии → клетки (1 энергия = 1 клетка)
    if (bot.energy > 0) {
      const spend = Math.min(CONFIG.SPEND_RATE, bot.energy);
      bot.energy -= spend;
      let cells = Math.floor(spend / CONFIG.GROW_ENERGY_PER_CELL);
      while (cells-- > 0) {
        const res = growth.expand(bot);
        if (!res.expanded) break;
      }
    }

    // Боты лечат себя по той же цене, что и игрок (одинаково для всех)
    if (bot.towerPos && bot.towerHp < bot.towerMaxHp() && bot.energy > CONFIG.HEAL_ATTACK_RATE) {
      const hpGain = Math.min(CONFIG.HEAL_HP_RATE, bot.towerMaxHp() - bot.towerHp);
      const atkCost = hpGain * (CONFIG.HEAL_ATTACK_RATE / CONFIG.HEAL_HP_RATE);
      bot.energy -= atkCost;
      bot.towerHp += hpGain;
    }

    // Боты охотно жмут «Вырезать» чужие клетки — их башня сильнее от числа клеток
    if (bot.energy >= bot.attackCost('focus') && Math.random() < 0.7) {
      const cells = [...bot.cells];
      const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
      const scanLimit = Math.min(cells.length, 100);   // лимит скана — против лагов
      for (let i = 0; i < scanLimit; i++) {
        const [r, c] = cells[i].split(',').map(Number);
        let found = false;
        for (const [dr, dc] of dirs) {
          const nc = world.get(r + dr, c + dc);
          if (nc && nc.owner !== bot.id && nc.owner !== 'neutral' && nc.owner) {
            combat.attack(bot, 'focus', 0, 0, r + dr, c + dc);
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }

    // Боты бьют «Вглубь» по главной башне врага в зоне видимости (по списку игроков, не клеток)
    if (bot.energy >= bot.attackCost('deep') && Math.random() < 0.8) {
      let target = null, best = Infinity;
      for (const p of world.players.values()) {
        if (p.id === bot.id || !p.towerPos || p.towerHp <= 0) continue;
        const d = Math.hypot(p.towerPos.r - bot.towerPos.r, p.towerPos.c - bot.towerPos.c);
        if (d > CONFIG.BOT_VISION || d >= best) continue;
        best = d;
        target = p.towerPos;
      }
      if (target) combat.attack(bot, 'deep', 0, 0, target.r, target.c);
    }
  }
}

// ============ СТАРТ ============
camera.x = 0;
camera.y = 0;
requestAnimationFrame(loop);