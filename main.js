import { CONFIG, LOCATIONS, TELEPORT_COST } from './config.js';
import { createHero, updateHero, addXp, damageHero, recalcStats, useHpPotion, canUseSoulshot, consumeSoulshot } from './hero.js';
import { createMob, createGroupId, pickMobDef, updateMob, aggroGroup } from './mobs.js';
import { rollDrops, gradeName } from './items.js';
import { createAuction, tickAuction, collectSold } from './auction.js';
import { createShop, buildStock } from './shop.js';
import { render } from './render.js';
import { initUI, refreshUI, toast } from './ui.js';
import {
  initAudio, sfxShoot, sfxHit, sfxDeath, sfxHeroHit, sfxLevelUp, sfxHeroDie
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let COLS = 12, ROWS = 20;

const layout = { COLS, ROWS, cellPx: 40, offsetX: 0, offsetY: 0 };

const state = {
  hero: null, mobs: [], projectiles: [], effects: [], gold: 0,
  currentLocation: 'talking_island', spawnTimer: CONFIG.spawn.baseInterval,
  respawnTimer: 0, paused: false,
};

const auction = createAuction();
const shop = createShop();

const input = {
  left: false, right: false, up: false, down: false,
  joyActive: false, joyX: 0, joyY: 0, joyStartX: 0, joyStartY: 0,
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const availH = canvas.height - 100 - 56;
  layout.COLS = COLS; layout.ROWS = ROWS;
  layout.cellPx = Math.min(canvas.width / COLS, availH / ROWS);
  layout.offsetX = (canvas.width - layout.cellPx * COLS) / 2;
  layout.offsetY = 80 + Math.max(0, (availH - layout.cellPx * ROWS) / 2);
}
window.addEventListener('resize', resize);
resize();

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = true;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = true;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = true;
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') input.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') input.down = false;
  if (e.code === 'KeyA' || e.code === 'ArrowLeft') input.left = false;
  if (e.code === 'KeyD' || e.code === 'ArrowRight') input.right = false;
});

const joyEl = document.getElementById('joystick');
const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
let joyTouchId = null;

function handleJoyStart(e) {
  if (!state.hero) return;
  if (e.target.closest('#bottom-panel') || e.target.closest('.modal')) return;
  for (const touch of e.changedTouches) {
    const x = touch.clientX, y = touch.clientY;
    if (y > window.innerHeight - 56) continue;
    if (x < window.innerWidth * 0.5) {
      joyTouchId = touch.identifier;
      input.joyStartX = x; input.joyStartY = y; input.joyActive = true;
      joyBase.style.left = x + 'px'; joyBase.style.top = y + 'px';
      joyStick.style.left = '50%'; joyStick.style.top = '50%';
      joyEl.classList.remove('hidden');
      break;
    }
  }
}
function handleJoyMove(e) {
  if (!input.joyActive) return;
  for (const touch of e.changedTouches) {
    if (touch.identifier !== joyTouchId) continue;
    let dx = touch.clientX - input.joyStartX;
    let dy = touch.clientY - input.joyStartY;
    const dist = Math.hypot(dx, dy), maxDist = 60;
    if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
    input.joyX = dx / maxDist; input.joyY = dy / maxDist;
    joyStick.style.left = `calc(50% + ${dx}px)`;
    joyStick.style.top = `calc(50% + ${dy}px)`;
    break;
  }
}
function handleJoyEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === joyTouchId) {
      joyTouchId = null; input.joyActive = false; input.joyX = 0; input.joyY = 0;
      joyEl.classList.add('hidden'); break;
    }
  }
}
canvas.addEventListener('touchstart', handleJoyStart, { passive: true });
canvas.addEventListener('touchmove', handleJoyMove, { passive: true });
canvas.addEventListener('touchend', handleJoyEnd, { passive: true });
canvas.addEventListener('touchcancel', handleJoyEnd, { passive: true });

document.querySelectorAll('.class-btn').forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.class));
});

function startGame(classType) {
  initAudio();
  state.hero = createHero(classType);
  state.hero.x = COLS / 2; state.hero.y = ROWS / 2;
  state.mobs = []; state.projectiles = []; state.effects = [];
state.gold = CONFIG.startGold || 3000; state.spawnTimer = 1;

  document.getElementById('class-select').classList.add('hidden');
  document.getElementById('bottom-panel').classList.remove('hidden');

  shop.stock = buildStock();
  initUI(state, auction, shop, {
    onEquipChange: () => { updateHUD(); refreshUI(); },
    onTravel: (id, cost) => travelTo(id, cost),
  });

  updateHUD(); updateLocationDisplay(); refreshUI();

  for (let i = 0; i < 5; i++) trySpawnMob();
}

function travelTo(id, cost) {
  state.gold -= cost;
  state.currentLocation = id;
  state.mobs = []; state.projectiles = []; state.effects = [];
  state.spawnTimer = 1;
  const loc = LOCATIONS[id];
  COLS = loc.cols; ROWS = loc.rows;
  layout.COLS = COLS; layout.ROWS = ROWS;
  resize();
  state.hero.x = COLS / 2; state.hero.y = ROWS / 2;
  updateHUD(); updateLocationDisplay();
  toast(`Телепорт: ${loc.name}`, 'legendary');
}

function updateHUD() {
  const h = state.hero; if (!h) return;
  document.getElementById('hp').textContent = `${Math.ceil(h.hp)}/${h.maxHp}`;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('level').textContent = h.level;
  document.getElementById('xp-fill').style.width = Math.min(100, (h.xp / h.xpToNext) * 100) + '%';
}

function updateLocationDisplay() {
  const loc = LOCATIONS[state.currentLocation];
  document.getElementById('location-name').textContent = loc.name;
  document.getElementById('location-sub').textContent = loc.sub;
}

function log(msg, color) {
  const el = document.getElementById('combat-log');
  const div = document.createElement('div');
  div.textContent = msg; div.style.color = color || '#94a3b8';
  el.appendChild(div);
  setTimeout(() => div.remove(), 3000);
  while (el.children.length > 5) el.removeChild(el.firstChild);
}

function trySpawnMob() {
  if (state.mobs.length >= CONFIG.spawn.maxMobs) return;
  const def = pickMobDef(state.currentLocation);
  const h = state.hero;
  const levelMult = 1 + (h.level - 1) * 0.12;
  const scaled = {
    ...def,
    hp: Math.floor(def.hp * levelMult),
    attack: Math.floor(def.attack * levelMult),
    reward: Math.floor(def.reward * (1 + (h.level - 1) * 0.08)),
    xp: Math.floor(def.xp * (1 + (h.level - 1) * 0.1)),
    level: def.level || 1,
  };
  let x, y, tries = 0;
  do {
    x = 1 + Math.random() * (COLS - 2);
    y = 1 + Math.random() * (ROWS - 2);
    tries++;
  } while (tries < 20 && Math.hypot(x - h.x, y - h.y) < CONFIG.spawn.minDistanceFromHero);

  if (Math.random() < CONFIG.spawn.groupChance) {
    const count = CONFIG.spawn.groupSize[0] + Math.floor(Math.random() * (CONFIG.spawn.groupSize[1] - CONFIG.spawn.groupSize[0] + 1));
    const groupId = createGroupId();
    for (let i = 0; i < count; i++) {
      const gx = Math.max(0.5, Math.min(COLS - 0.5, x + (Math.random() - 0.5) * 2));
      const gy = Math.max(0.5, Math.min(ROWS - 0.5, y + (Math.random() - 0.5) * 2));
      state.mobs.push(createMob(scaled, gx, gy, groupId));
    }
  } else {
    state.mobs.push(createMob(scaled, x, y));
  }
}

function heroDie() {
  const h = state.hero;
  const lost = Math.floor(h.xp * CONFIG.death.xpLossPercent);
  h.xp -= lost;
  sfxHeroDie();
  log(`💀 Погиб! -${lost} опыта`, '#ef4444');
  document.getElementById('lost-xp').textContent = lost;
  document.getElementById('respawn-timer').textContent = CONFIG.death.respawnTime;
  document.getElementById('death-screen').classList.remove('hidden');
  state.respawnTimer = CONFIG.death.respawnTime;
}

function respawnHero() {
  const h = state.hero;
  h.hp = h.maxHp; h.dead = false;
  h.x = COLS / 2; h.y = ROWS / 2; h.cooldown = 0;
  state.mobs = []; state.projectiles = []; state.spawnTimer = 2;
  document.getElementById('death-screen').classList.add('hidden');
  updateHUD();
  log('Возврат в город', '#4ade80');
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state.hero && !state.paused) update(dt);
  render(ctx, canvas, state, layout);
  requestAnimationFrame(loop);
}

function update(dt) {
  const hero = state.hero;
  if (hero.dead) {
    state.respawnTimer -= dt;
    document.getElementById('respawn-timer').textContent = Math.ceil(Math.max(0, state.respawnTimer));
    if (state.respawnTimer <= 0) respawnHero();
    return;
  }

  // Тик аукциона и магазина
  tickAuction(auction, dt, hero.level);
  const sold = collectSold(auction, state);
  if (sold > 0) toast(`Продано с аукциона: +${sold}💰`, 'legendary');

  const moveInput = {
    left: input.left || input.joyX < -0.2,
    right: input.right || input.joyX > 0.2,
    up: input.up || input.joyY < -0.2,
    down: input.down || input.joyY > 0.2,
  };

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    trySpawnMob();
    const interval = Math.max(CONFIG.spawn.minInterval, CONFIG.spawn.baseInterval - hero.level * 0.05);
    state.spawnTimer = interval * (0.7 + Math.random() * 0.6);
  }

  for (const m of state.mobs) {
    if (m.dead) continue;
    const action = updateMob(m, dt, hero, hero.x, hero.y);
    m.x = Math.max(0.3, Math.min(COLS - 0.3, m.x));
    m.y = Math.max(0.3, Math.min(ROWS - 0.3, m.y));
    if (action === 'attack') {
      const died = damageHero(hero, m.attack);
      sfxHeroHit();
      state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ef4444', text: '-' + Math.floor(m.attack) });
      if (died) { heroDie(); return; }
      updateHUD();
    }
  }

  updateHero(hero, dt, state.mobs, state.projectiles, moveInput, { cols: COLS, rows: ROWS });

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 4) p.trail.shift();
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;

    let hit = false;
    for (const m of state.mobs) {
      if (m.dead) continue;
      const dist = Math.hypot(m.x - p.x, m.y - p.y);
      if (dist < m.size * 0.5 + 0.2) {
        m.hp -= p.damage; m.hitFlash = 0.12; m.aggro = true;
        if (m.groupId) aggroGroup(state.mobs, m.groupId);
        sfxHit();
        state.effects.push({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: '#facc15', text: '-' + Math.floor(p.damage) });
        if (p.aoe > 0) {
          for (const other of state.mobs) {
            if (other === m || other.dead) continue;
            if (Math.hypot(other.x - m.x, other.y - m.y) <= p.aoe) {
              other.hp -= p.damage * 0.6; other.hitFlash = 0.12; other.aggro = true;
              if (other.groupId) aggroGroup(state.mobs, other.groupId);
            }
          }
        }
        hit = true; break;
      }
    }
    if (hit || p.life <= 0 || p.y < -2 || p.y > ROWS + 2 || p.x < -2 || p.x > COLS + 2) {
      state.projectiles.splice(i, 1);
    }
  }

  const prevLevel = hero.level;
  for (let i = state.mobs.length - 1; i >= 0; i--) {
    const m = state.mobs[i];
    if (m.hp <= 0) {
      m.dead = true;
      state.gold += m.reward;
      addXp(hero, m.xp);
      sfxDeath();

     const drops = rollDrops(hero.level);
      for (const it of drops.items) {
        hero.backpack.push(it);
        toast(`${it.icon} ${it.name}`, it.grade);
      }
      for (const sc of drops.scrolls) {
        const grade = sc.grade;
        const type = sc.type;
        if (!hero.scrolls[grade]) hero.scrolls[grade] = { weapon: 0, armor: 0 };
        hero.scrolls[grade][type] = (hero.scrolls[grade][type] || 0) + 1;
        toast(`📜 Свиток ${type === 'weapon' ? 'оружия' : 'брони'}: ${gradeName(grade)}`, grade);
      }

      if (drops.items.length || drops.scrolls.length) refreshUI();

      state.mobs.splice(i, 1);
    }
  }

  if (hero.level > prevLevel) {
    sfxLevelUp();
    log(`⭐ Уровень ${hero.level}!`, '#a78bfa');
    updateHUD();
    refreshUI();
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }

  updateHUD();
}

requestAnimationFrame(loop);