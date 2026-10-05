import { CONFIG, GRADE_ORDER, BUFF_SCROLLS, BUFF_ORDER, BUFF_DROP_CHANCE, MOBS } from './config.js';
import { createMob, createGroupId, pickMobDefFromZone, updateMob, aggroGroup } from './mobs.js';
import { createHero, updateHero, addXp, damageHero, autoUsePotion, recalcStats, addToBackpack, mobDamageFor, bossDamageFor, bossAoeDamageFor, getChainTargets, calcHitChance, calcEffectiveDefense } from './hero.js';
import { rollDrops, gradeName, createItem, createBlessedScroll, createBuffScroll, createArenaPass } from './items.js';
import { createAuction, tickAuction, collectSold } from './auction.js';
import { createShop, buildStock } from './shop.js';
import { render } from './render.js';
import { initUI, refreshUI, toast, showCityScreen, hideCityScreen, openArena } from './ui.js';
import { CITIES, CITY_ORDER, findZone, cityTeleportCost } from './cities.js';
import { spawnPortalInZone, updatePortal, getPortalCooldown, createDungeon, rollBossDrops, spawnGuard } from './dungeon.js';
import { castBossAoe, checkAoeHit, checkFireHit, GUARD_CALL, BOSS_AOE } from './bosses.js';
import { createArena } from './arena.js';
import { createBots, tickBots } from './bots.js';
import {
  initAudio, sfxShoot, sfxHit, sfxDeath, sfxHeroHit, sfxLevelUp, sfxHeroDie
} from './audio.js';


const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let COLS = 24, ROWS = 36;
const layout = { COLS, ROWS, cellPx: 36, offsetX: 0, offsetY: 0 };
const camera = { x: 0, y: 0, w: 0, h: 0 };

const state = {
  hero: null, mobs: [], projectiles: [], effects: [],
  gold: 3000,
  currentCity: 'talking_island',
  currentZone: null,
  inBattle: false,
  zoneBg: '#1a2a10',
  spawnTimer: 0,
  deathTimer: 10,

  sessionStats: { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 },
  lastSession: null,

  portal: null,
  dungeon: null,
  aoeList: [],
};

const auction = createAuction();
const shop = createShop();
const arena = createArena();

const input = {
  left:false, right:false, up:false, down:false,
  joyActive:false, joyX:0, joyY:0, joyStartX:0, joyStartY:0,
};

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  layout.COLS = COLS; layout.ROWS = ROWS;
  layout.cellPx = CONFIG.map.cellPx;
  layout.offsetX = 0; layout.offsetY = 0;
  camera.w = canvas.width / layout.cellPx;
  camera.h = canvas.height / layout.cellPx;
}

function updateCamera(hero) {
  const targetX = hero.x + 0.5 - camera.w / 2;
  const targetY = hero.y + 0.5 - camera.h / 2;
  camera.x = Math.max(0, Math.min(COLS - camera.w, targetX));
  camera.y = Math.max(0, Math.min(ROWS - camera.h, targetY));
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

// Джойстик
const joyEl = document.getElementById('joystick');
const joyBase = document.getElementById('joystick-base');
const joyStick = document.getElementById('joystick-stick');
let joyTouchId = null;

function handleJoyStart(e) {
  if (!state.hero || !state.inBattle) return;
  if (e.target.closest('#bottom-panel') || e.target.closest('.modal') || e.target.closest('#city-screen')) return;
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
    const dist = Math.hypot(dx, dy), maxD = 60;
    if (dist > maxD) { dx = dx/dist*maxD; dy = dy/dist*maxD; }
    input.joyX = dx / maxD; input.joyY = dy / maxD;
    joyStick.style.left = `calc(50% + ${dx}px)`;
    joyStick.style.top = `calc(50% + ${dy}px)`;
    break;
  }
}
function handleJoyEnd(e) {
  for (const touch of e.changedTouches) {
    if (touch.identifier === joyTouchId) {
      joyTouchId = null; input.joyActive = false;
      input.joyX = 0; input.joyY = 0;
      joyEl.classList.add('hidden');
      break;
    }
  }
}
canvas.addEventListener('touchstart', handleJoyStart, { passive: true });
canvas.addEventListener('touchmove', handleJoyMove, { passive: true });
canvas.addEventListener('touchend', handleJoyEnd, { passive: true });
canvas.addEventListener('touchcancel', handleJoyEnd, { passive: true });

canvas.addEventListener('click', (e) => {
  if (!state.inBattle || !state.hero) return;
  if (state.portal && state.portal.active && !state.dungeon) {
    const px = (e.clientX) / layout.cellPx + camera.x;
    const py = (e.clientY) / layout.cellPx + camera.y;
    const d = Math.hypot(state.portal.x - px, state.portal.y - py);
    if (d < 1.5) {
      enterDungeon();
    }
  }
});

document.querySelectorAll('.class-btn').forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.class));
});

// HUD-кнопки
function bindHudActions() {
  document.querySelectorAll('.hud-potion').forEach(el => {
    el.addEventListener('click', () => {
      const h = state.hero; if (!h) return;
      const type = el.dataset.potion;
      if ((h.potions[type] || 0) <= 0) return;
      h.activePotion = (h.activePotion === type) ? null : type;
      updateHudActions();
    });
  });

  const ssBtn = document.getElementById('hud-soulshot');
  if (ssBtn) {
    ssBtn.addEventListener('click', () => {
      const h = state.hero; if (!h) return;
      const w = h.equipment.weapon;
      if (!w) { toast('Нужно оружие', 'epic'); return; }
      if ((h.soulshots[w.grade] || 0) <= 0) { toast('Нет сосок', 'epic'); return; }
      h.soulshotActive = !h.soulshotActive;
      updateHudActions();
    });
  }

  document.querySelectorAll('.hud-buff').forEach(el => {
    el.addEventListener('click', () => {
      const h = state.hero; if (!h) return;
      const type = el.dataset.buff;
      const now = Date.now();

      if (h.activeBuffs[type] && h.activeBuffs[type] > now) {
        delete h.activeBuffs[type];
        recalcStats(h);
        updateHudActions();
        return;
      }

      const idx = h.backpack.findIndex(x => x.kind === 'buff' && x.buffType === type);
      if (idx < 0) { toast('Нет свитка', 'epic'); return; }
      const stack = h.backpack[idx];
      if (stack.count && stack.count > 1) {
        stack.count -= 1;
      } else {
        h.backpack.splice(idx, 1);
      }
      const def = BUFF_SCROLLS[type];
      h.activeBuffs[type] = now + def.duration * 1000;
      recalcStats(h);
      toast(`${def.icon} ${def.name} активирован`, 'legendary');
      updateHudActions();
    });
  });
}
bindHudActions();

// DEBUG: B — 3 blessed + 3 пропуска
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyB' && state.hero) {
    for (let i = 0; i < 3; i++) addToBackpack(state.hero, createBlessedScroll());
    for (let i = 0; i < 3; i++) addToBackpack(state.hero, createArenaPass());
    toast('✨ +3 Blessed, 🎫 +3 Pass (debug)', 'unique');
    updateHudActions();
  }
});

function startGame(classType) {
  initAudio();
  state.hero = createHero(classType);
  state.hero.x = COLS/2; state.hero.y = ROWS/2;
  state.gold = CONFIG.startGold;
  state.currentCity = 'talking_island';
  state.currentZone = null;
  state.inBattle = false;

  // Арена: создаём ботов
  arena.bots = createBots(100);

  document.getElementById('class-select').classList.add('hidden');
  document.getElementById('bottom-panel').classList.remove('hidden');

  rebuildShopStock();

 initUI(state, auction, shop, arena, {
  onEquipChange: () => { updateHUD(); refreshUI(); },
  onEnterZone: (zoneId) => enterZone(zoneId),
  onTravelToCity: (cityId, cost) => travelToCity(cityId, cost),
  onReturnToCity: () => returnToCity(),
  makeItem: (grade, slot, wt, variant) => createItem(grade, slot, wt, variant),
});

  updateHUD();
  showCityScreen();
}

function rebuildShopStock() {
  const city = CITIES[state.currentCity];
  shop.stock = buildStock(city.grade, state.hero.weaponType);
}

function enterZone(zoneId) {
  const city = CITIES[state.currentCity];
  const zone = findZone(state.currentCity, zoneId);
  if (!zone) return;
  if (state.gold < zone.teleportCost) { toast('Недостаточно золота', 'epic'); return; }

  state.gold -= zone.teleportCost;
  state.currentZone = zone;
  state.zoneBg = city.bg;
  state.mobs = []; state.projectiles = []; state.effects = [];
  state.spawnTimer = 0.5;
  state.hero.x = COLS/2; state.hero.y = ROWS/2;
  state.sessionStats = { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };
  state.hero.dead = false;
  state.hero.hp = state.hero.maxHp;
  state.inBattle = true;

  state.portal = spawnPortalInZone(zone);
  state.dungeon = null;
  state.aoeList = [];

  document.getElementById('zone-name').textContent = zone.name;
  document.getElementById('zone-diff').textContent = zone.diff === 'easy' ? '🟢' : zone.diff === 'medium' ? '🟡' : '🔴';

  hideCityScreen();
  updateHUD();
}

function enterDungeon() {
  const zone = state.currentZone;
  if (!zone) return;

  state.dungeon = createDungeon(zone, state.currentCity);
  state.mobs = state.dungeon.mobs.slice();
  state.mobs.push(state.dungeon.boss);
  state.projectiles = []; state.effects = [];
  state.aoeList = [];
  state.portal.active = false;
  state.hero.x = COLS/2; state.hero.y = ROWS - 4;
  state.hero.hp = state.hero.maxHp;

  toast('🏛 Данж открыт!', 'legendary');
  document.getElementById('zone-name').textContent = 'Данж: ' + zone.name;
  document.getElementById('zone-diff').textContent = '💀';
}

function exitDungeon(won) {
  if (state.dungeon) {
    state.portal.active = false;
    state.portal.respawnAt = getPortalCooldown();
  }
  state.dungeon = null;
  state.aoeList = [];
  state.mobs = [];
  state.projectiles = [];
  state.effects = [];

  if (won) {
    state.hero.x = COLS/2; state.hero.y = ROWS/2;
    toast('🏆 Данж зачищен!', 'legendary');
    document.getElementById('zone-name').textContent = state.currentZone.name;
    document.getElementById('zone-diff').textContent = state.currentZone.diff === 'easy' ? '🟢' : state.currentZone.diff === 'medium' ? '🟡' : '🔴';
  } else {
    state.inBattle = false;
    state.currentZone = null;
    state.portal = null;
    showCityScreen();
  }
}

function returnToCity() {
  if (state.sessionStats.kills > 0 || state.sessionStats.gold > 0) {
    state.lastSession = { zone: state.currentZone?.name || '—', ...state.sessionStats };
  }
  state.inBattle = false;
  state.mobs = []; state.projectiles = []; state.effects = [];
  state.currentZone = null;
  state.dungeon = null;
  state.portal = null;
  state.aoeList = [];
  playTeleportAnim(() => {
    showCityScreen();
    updateHUD();
  });
}

function travelToCity(cityId, cost) {
  if (state.gold < cost) return;
  state.gold -= cost;
  state.currentCity = cityId;
  state.inBattle = false;
  state.mobs = []; state.currentZone = null;
  state.dungeon = null; state.portal = null; state.aoeList = [];
  rebuildShopStock();
  playTeleportAnim(() => {
    showCityScreen();
    updateHUD();
    toast(`Телепорт: ${CITIES[cityId].name}`, 'legendary');
  });
}

function updateHUD() {
  const h = state.hero; if (!h) return;
  document.getElementById('hp').textContent = `${Math.ceil(h.hp)}/${h.maxHp}`;
  document.getElementById('gold').textContent = state.gold;
  document.getElementById('level').textContent = h.level;
  document.getElementById('xp-fill').style.width = Math.min(100, (h.xp/h.xpToNext)*100) + '%';

  const sAtk = document.getElementById('stat-atk');
  if (sAtk) {
    sAtk.textContent = Math.round(h.attack);
    document.getElementById('stat-def').textContent = Math.round(h.defense);
    document.getElementById('stat-range').textContent = h.range.toFixed(1);
    document.getElementById('stat-crit').textContent = h.critChance.toFixed(0);
    document.getElementById('stat-dodge').textContent = h.dodge.toFixed(0);
    document.getElementById('stat-ls').textContent = h.lifesteal.toFixed(0);
  }

  updateHudActions();
}

function updateHudActions() {
  const h = state.hero; if (!h) return;

  const potMap = { small: h.potions.small, medium: h.potions.medium, large: h.potions.large, epic: h.potions.epic };
  for (const [type, count] of Object.entries(potMap)) {
    document.getElementById('pot-' + type).textContent = count || 0;
    const el = document.querySelector(`.hud-potion[data-potion="${type}"]`);
    if (!el) continue;
    el.style.display = count > 0 ? '' : 'none';
    el.classList.toggle('active', h.activePotion === type);
  }

  const ssGrade = h.equipment.weapon?.grade;
  const ssCount = ssGrade ? (h.soulshots[ssGrade] || 0) : 0;
  document.getElementById('soulshot-count').textContent = ssCount;
  const ssEl = document.getElementById('hud-soulshot');
  if (ssEl) {
    ssEl.style.display = ssCount > 0 ? '' : 'none';
    ssEl.classList.toggle('active', h.soulshotActive);
  }

  const now = Date.now();
  for (const type of BUFF_ORDER) {
    const el = document.querySelector(`.hud-buff[data-buff="${type}"]`);
    if (!el) continue;
    const have = h.backpack.some(x => x.kind === 'buff' && x.buffType === type);
    const active = h.activeBuffs[type] && h.activeBuffs[type] > now;
    if (!have && !active) {
      el.style.display = 'none';
    } else {
      el.style.display = '';
      el.classList.toggle('active', !!active);
      if (active) {
        const sec = Math.ceil((h.activeBuffs[type] - now) / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        el.querySelector('.hud-count').textContent = m + ':' + (s < 10 ? '0' : '') + s;
      } else {
        let count = 0;
        for (const x of h.backpack) {
          if (x.kind === 'buff' && x.buffType === type) count += (x.count || 1);
        }
        el.querySelector('.hud-count').textContent = count;
      }
    }
  }
}

function log(msg, color) {
  const el = document.getElementById('combat-log');
  const div = document.createElement('div');
  div.textContent = msg;
  div.style.color = color || '#94a3b8';
  el.appendChild(div);
  setTimeout(() => div.remove(), 3000);
  while (el.children.length > 5) el.removeChild(el.firstChild);
}

function findSpawnPoint() {
  const hero = state.hero;
  let x, y, tries = 0;
  do {
    x = 1 + Math.random() * (COLS - 2);
    y = 1 + Math.random() * (ROWS - 2);
    tries++;
    if (tries > 30) break;
    const distHero = Math.hypot(x - hero.x, y - hero.y);
    if (distHero < 3) continue;
    let tooClose = false;
    for (const m of state.mobs) {
      if (Math.hypot(x - m.x, y - m.y) < 1.2) { tooClose = true; break; }
    }
    if (tooClose) continue;
    return { x, y };
  } while (true);
  return { x, y };
}

function trySpawnMob() {
  if (!state.currentZone) return;
  if (state.dungeon) return;
  const sp = state.currentZone.spawn;
  if (state.mobs.length >= sp.maxMobs) return;

  const def = pickMobDefFromZone(state.currentZone);
  const mult = state.currentZone.mult;
  const pos = findSpawnPoint();

  const isChampion = Math.random() < sp.champChance;
  const mobOpts = { aggroRange: sp.aggroRange, wander: sp.wander, champion: isChampion };

  if (Math.random() < sp.groupChance) {
    const count = 3 + Math.floor(Math.random() * 3);
    const groupId = createGroupId();
    for (let i = 0; i < count; i++) {
      const gx = Math.max(0.5, Math.min(COLS - 0.5, pos.x + (Math.random() - 0.5) * 2));
      const gy = Math.max(0.5, Math.min(ROWS - 0.5, pos.y + (Math.random() - 0.5) * 2));
      state.mobs.push(createMob(def, gx, gy, mult, { ...mobOpts, groupId }));
    }
  } else {
    state.mobs.push(createMob(def, pos.x, pos.y, mult, mobOpts));
  }
}

function heroDie() {
  const h = state.hero;
  const lost = Math.floor(h.xp * CONFIG.death.xpLossPercent);
  h.xp -= lost;
  sfxHeroDie();
  log(`💀 Погиб! -${lost} опыта`, '#ef4444');

  document.getElementById('lost-xp').textContent = lost;
  document.getElementById('sr-gold').textContent = state.sessionStats.gold;
  document.getElementById('sr-xp').textContent = state.sessionStats.xp;
  document.getElementById('sr-kills').textContent = state.sessionStats.kills;
  document.getElementById('sr-items').textContent = state.sessionStats.items;
  document.getElementById('sr-scrolls').textContent = state.sessionStats.scrolls;
  document.getElementById('sr-blessed').textContent = state.sessionStats.blessed;

  state.lastSession = { zone: state.currentZone?.name || '—', ...state.sessionStats };

  document.getElementById('death-screen').classList.remove('hidden');
  state.deathTimer = 10;

  const btn = document.getElementById('btn-death-to-city');
  btn.onclick = () => {
    document.getElementById('death-screen').classList.add('hidden');
    playTeleportAnim(() => respawnHero());
  };
}

function respawnHero() {
  const h = state.hero;
  h.hp = h.maxHp; h.dead = false;
  h.x = COLS/2; h.y = ROWS/2; h.cooldown = 0;
  state.mobs = []; state.projectiles = []; state.spawnTimer = 2;
  state.inBattle = false;
  state.currentZone = null;
  state.dungeon = null;
  state.portal = null;
  state.aoeList = [];
  updateHUD();
  showCityScreen();
}

function playTeleportAnim(callback) {
  const el = document.getElementById('teleport-anim');
  el.classList.remove('hidden');
  setTimeout(() => {
    el.classList.add('hidden');
    callback && callback();
  }, 900);
}

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (state.hero && state.inBattle && !state.hero.dead) update(dt);
  if (state.hero && !state.inBattle) tickBots(arena.bots, dt);
  if (state.inBattle) render(ctx, canvas, state, layout, camera);
  requestAnimationFrame(loop);
}

function update(dt) {
  const hero = state.hero;
  if (hero.dead) {
    state.deathTimer -= dt;
    document.getElementById('respawn-timer').textContent = Math.ceil(Math.max(0, state.deathTimer));
    if (state.deathTimer <= 0) {
      document.getElementById('death-screen').classList.add('hidden');
      playTeleportAnim(() => respawnHero());
    }
    return;
  }

  tickAuction(auction, dt);
  const sold = collectSold(auction, state);
  if (sold > 0) toast(`Продано с аукциона: +${sold}💰`, 'legendary');

  const moveInput = {
    left: input.left || input.joyX < -0.2,
    right: input.right || input.joyX > 0.2,
    up: input.up || input.joyY < -0.2,
    down: input.down || input.joyY > 0.2,
  };

  if (state.portal && !state.dungeon) {
    updatePortal(state.portal, dt, !!state.dungeon);
  }

  if (!state.dungeon) {
    const sp = state.currentZone.spawn;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      trySpawnMob();
      state.spawnTimer = sp.interval * (0.7 + Math.random() * 0.6);
    }
  }

  for (const m of state.mobs) {
    if (m.dead) continue;
    const action = updateMob(m, dt, hero, hero.x, hero.y);
    m.x = Math.max(0.3, Math.min(COLS - 0.3, m.x));
    m.y = Math.max(0.3, Math.min(ROWS - 0.3, m.y));

    if (m.boss && !m.dead) {
      if (m.castGlow > 0) m.castGlow -= dt;

      m.aoeTimer -= dt;
      if (m.aoeTimer <= 0) {
        const grade = m.grade || 'ng';
        const aoeDef = BOSS_AOE[grade] || BOSS_AOE.ng;
        const interval = aoeDef.interval;
        m.aoeTimer = interval[0] + Math.random() * (interval[1] - interval[0]);
        m.castGlow = 0.6;
        const aoe = castBossAoe(m, hero);
        if (aoe) state.aoeList.push(aoe);
      }

      const call = GUARD_CALL[m.grade || 'ng'] || GUARD_CALL.ng;
      m.guardTimer -= dt;
      if (m.guardTimer <= 0) {
        m.guardTimer = call.interval;
        const guardsAlive = state.mobs.filter(x => x.dungeonGuard && !x.dead).length;
        const canSpawn = Math.min(call.count, call.max - guardsAlive);
        for (let g = 0; g < canSpawn; g++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * 4;
          const gx = Math.max(1, Math.min(COLS - 1, m.x + Math.cos(angle) * dist));
          const gy = Math.max(1, Math.min(ROWS - 1, m.y + Math.sin(angle) * dist));
          const guard = spawnGuard(state.currentZone, gx, gy, null);
          state.mobs.push(guard);
        }
        if (canSpawn > 0) toast(`⚠️ Босс призвал ${canSpawn} охраны`, 'epic');
      }
    }

    if (action === 'attack') {
      const mobDmg = m.boss ? bossDamageFor(hero) : mobDamageFor(hero, state.currentZone.diff);
      const result = damageHero(hero, mobDmg);
      if (result === 'dodge') {
        state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a5f3fc', text: 'DODGE' });
      } else {
        if (hero.thornsPercent > 0) {
          const thorns = Math.floor(mobDmg * hero.thornsPercent);
          m.hp -= thorns;
          m.hitFlash = 0.15;
          state.effects.push({ x: m.x, y: m.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a855f7', text: '🌵' + thorns, big: true });
          state.effects.push({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#a855f7', radius: 0.9 });
        }
        sfxHeroHit();
        state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ef4444', text: '-' + mobDmg });
        if (result === 'dead') { heroDie(); return; }
      }
      updateHUD();
    }
  }

  updateHero(hero, dt, state.mobs, state.projectiles, moveInput, { cols: COLS, rows: ROWS }, state.effects);

  const potResult = autoUsePotion(hero, dt);
  if (potResult) {
    state.effects.push({ x: hero.x, y: hero.y - 1, life: 1.0, maxLife: 1.0, color: potResult.color, text: '+' + potResult.healed, big: true });
  }

  for (let i = state.aoeList.length - 1; i >= 0; i--) {
    const aoe = state.aoeList[i];
    aoe.life -= dt;

    if (aoe.type === 'fire') {
      if (aoe.life > aoe.life - 0.01 || aoe.life <= 5) {
        for (const s of aoe.spots) {
          if (s.life <= 0) continue;
          s.life -= dt;
          s.tickTimer -= dt;
          if (s.tickTimer <= 0) {
            s.tickTimer = 1.0;
            const d = Math.hypot(s.x - hero.x, s.y - hero.y);
            if (d <= s.radius) {
              const dmg = Math.max(1, s.damage - Math.floor(hero.defense * 0.5));
              hero.hp -= dmg;
              hero.hitAnim = 0.15;
              state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ea580c', text: '-' + Math.floor(dmg) });
              sfxHeroHit();
              if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; heroDie(); return; }
            }
          }
        }
      }
    } else if (aoe.life <= 0) {
      if (checkAoeHit(aoe, hero)) {
        const dmg = bossAoeDamageFor(hero);
        hero.hp -= dmg;
        hero.hitAnim = 0.2;
        state.effects.push({ x: hero.x, y: hero.y - 1, life: 1.0, maxLife: 1.0, color: '#dc2626', text: '-' + Math.floor(dmg), big: true });
        sfxHeroHit();
        if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; heroDie(); return; }
      }
      state.aoeList.splice(i, 1);
      continue;
    }

    if (aoe.life <= -10) state.aoeList.splice(i, 1);
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;

    let hit = false;
    for (const m of state.mobs) {
      if (m.dead) continue;
      const dist = Math.hypot(m.x - p.x, m.y - p.y);
      if (dist < m.size * 0.5 + 0.2) {
        const hitChance = calcHitChance(hero, m);
        if (Math.random() * 100 > hitChance) {
          state.effects.push({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a5f3fc', text: 'MISS' });
          hit = true;
          break;
        }

        const effDef = calcEffectiveDefense(m, hero);
        let finalDamage = Math.max(1, p.damage - Math.floor(effDef * 0.5));

        if (p.doubleStrike && !p.doubleStrikeDone) {
          p.doubleStrikeDone = true;
          finalDamage *= 2;
          state.effects.push({ x: m.x, y: m.y - 1.2, life: 0.8, maxLife: 0.8, color: '#fbbf24', text: '👊 x2', big: true });
          state.effects.push({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#fbbf24', radius: 1.0 });
        }

        if (p.isExecute) {
          state.effects.push({ x: m.x, y: m.y - 1.6, life: 0.9, maxLife: 0.9, color: '#dc2626', text: '💀 КАЗНЬ', big: true });
        }

        m.hp -= finalDamage; m.hitFlash = 0.12; m.aggro = true;
        if (m.groupId) aggroGroup(state.mobs, m.groupId);
        sfxHit();
        const dmgColor = p.isCrit ? '#f97316' : '#facc15';
        const dmgText = (p.isCrit ? '💥' : '-') + Math.floor(finalDamage);
        state.effects.push({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: dmgColor, text: dmgText, big: p.isCrit });

        if (p.aoe > 0) {
          for (const other of state.mobs) {
            if (other === m || other.dead) continue;
            if (Math.hypot(other.x - m.x, other.y - m.y) <= p.aoe) {
              other.hp -= finalDamage * 0.6; other.hitFlash = 0.12; other.aggro = true;
              if (other.groupId) aggroGroup(state.mobs, other.groupId);
            }
          }
        }

        const chainCount = getChainTargets(hero);
        if (chainCount > 0) {
          const candidates = state.mobs
            .filter(x => !x.dead && x !== m && Math.hypot(x.x - m.x, x.y - m.y) <= 4)
            .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))
            .slice(0, chainCount);

          let prev = m;
          for (const target of candidates) {
            target.hp -= finalDamage * 0.7;
            target.hitFlash = 0.12; target.aggro = true;
            if (target.groupId) aggroGroup(state.mobs, target.groupId);
            state.effects.push({ x: target.x, y: target.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a855f7', text: '⚡' + Math.floor(finalDamage * 0.7), big: true });
            for (let k = 0; k < 2; k++) {
              state.effects.push({ kind: 'chain', x1: prev.x, y1: prev.y, x2: target.x, y2: target.y, life: 0.35, maxLife: 0.35, color: k === 0 ? '#a855f7' : '#d4a5ff' });
            }
            state.effects.push({ kind: 'flash', x: target.x, y: target.y, life: 0.3, maxLife: 0.3, color: '#a855f7', radius: 0.8 });
            prev = target;
          }
          if (candidates.length > 0) {
            state.effects.push({ x: m.x, y: m.y - 2.0, life: 0.7, maxLife: 0.7, color: '#d4a5ff', text: '⚡⚡⚡ x' + candidates.length, big: true });
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
      state.sessionStats.gold += m.reward;
      state.sessionStats.xp += m.xp;
      state.sessionStats.kills++;
      sfxDeath();

      if (m.boss && state.dungeon) {
        const drops = rollBossDrops(hero, state.currentZone, state.dungeon.cityGrade);
        state.gold += drops.gold;
        state.sessionStats.gold += drops.gold;
        toast(`💰 +${drops.gold} с босса`, 'legendary');

        // Пропуск на арену с босса — 100% 1 шт.
        addToBackpack(hero, createArenaPass(1));
        toast('🎫 Пропуск на арену!', 'legendary');

        for (const t of drops.buffs) {
          const sc = createBuffScroll(t);
          if (sc) addToBackpack(hero, sc);
        }
        if (drops.buffs.length > 0) toast(`📜 Свитки ×${drops.buffs.length}`, 'legendary');

        if (drops.blessed > 0) {
          addToBackpack(hero, createBlessedScroll());
          toast('✨ Blessed Scroll!', 'unique');
        }

        if (drops.item) {
          const item = createItem(drops.item, ['weapon','armor','helmet','boots','gloves','cloak','ring','amulet'][Math.floor(Math.random()*8)], state.hero.weaponType);
          if (item) { addToBackpack(hero, item); toast(`⚔ ${item.name}!`, drops.item); }
        }

        state.mobs.splice(i, 1);
        setTimeout(() => { if (state.dungeon) exitDungeon(true); }, 1500);
        continue;
      }

      const drops = rollDrops(CITIES[state.currentCity].grade, m.champion);
      for (const it of drops.items) {
        hero.backpack.push(it);
        state.sessionStats.items++;
        toast(`${it.icon} ${it.name}`, it.grade);
      }
      for (const sc of drops.scrolls) {
        if (!hero.scrolls[sc.grade]) hero.scrolls[sc.grade] = { weapon: 0, armor: 0 };
        hero.scrolls[sc.grade][sc.type]++;
        state.sessionStats.scrolls++;
        toast(`📜 Свиток: ${gradeName(sc.grade)}`, sc.grade);
      }
      if (drops.blessed > 0) {
        for (let k = 0; k < drops.blessed; k++) addToBackpack(hero, createBlessedScroll());
        state.sessionStats.blessed += drops.blessed;
        toast(`✨ Blessed Scroll найден!`, 'unique');
      }
      if (drops.passes > 0) {
        for (let k = 0; k < drops.passes; k++) addToBackpack(hero, createArenaPass());
        toast(`🎫 Пропуск на арену!`, 'unique');
      }

      const buffChance = m.champion ? BUFF_DROP_CHANCE.champion : BUFF_DROP_CHANCE.normal;
      if (Math.random() < buffChance) {
        const types = ['attack','crit','speed','range'];
        const t = types[Math.floor(Math.random() * types.length)];
        const scroll = createBuffScroll(t);
        if (scroll) { addToBackpack(hero, scroll); toast(`📜 ${scroll.name}`, 'legendary'); }
      }

      state.mobs.splice(i, 1);
    }
  }

  if (hero.level > prevLevel) {
    sfxLevelUp();
    log(`⭐ Уровень ${hero.level}!`, '#a78bfa');
    updateHUD();
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }

  updateCamera(hero);
  updateHUD();
}

// ===== DEV-КОДЫ =====
function applyDevCode(code) {
  code = code.trim().toLowerCase();
  if (!code) return;
  const hero = state.hero;
  if (!hero) return;

  const match = code.match(/^([dcbas])(\d+)$/);
  if (match) {
    const grade = match[1];
    const level = Math.min(20, Math.max(1, parseInt(match[2], 10)));
    for (const slot of ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet']) {
      if (hero.equipment[slot]) { hero.backpack.push(hero.equipment[slot]); hero.equipment[slot] = null; }
    }
    const slots = ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet'];
    for (const slot of slots) {
      const wt = slot === 'weapon' ? hero.weaponType : null;
      let variant = null;
      if (slot === 'weapon') variant = hero.weaponType === 'staff' ? 'aoe' : 'speed';
      const item = createItem(grade, slot, wt, variant);
      if (!item) continue;
      item.enhance = level;
      hero.equipment[slot] = item;
    }
    if (!hero.scrolls[grade]) hero.scrolls[grade] = { weapon: 0, armor: 0 };
    hero.scrolls[grade].weapon += 100;
    hero.scrolls[grade].armor += 100;
    for (let i = 0; i < 20; i++) addToBackpack(hero, createBlessedScroll());
    for (let i = 0; i < 10; i++) addToBackpack(hero, createArenaPass());
    for (const t of ['attack','crit','speed','range']) {
      for (let i = 0; i < 5; i++) {
        const sc = createBuffScroll(t);
        if (sc) addToBackpack(hero, sc);
      }
    }
    for (const t of ['small','medium','large','epic']) hero.potions[t] = (hero.potions[t] || 0) + 100;
    hero.soulshots[grade] = (hero.soulshots[grade] || 0) + 1000;
    state.gold += 100000;
    recalcStats(hero);
    updateHUD();
    refreshUI();
    toast(`🎁 Dev: ${grade.toUpperCase()}-сет +${level}`, 'unique');
    return;
  }
  if (code === 'gold') { state.gold += 1000000; updateHUD(); toast('💰 +1 000 000 золота', 'unique'); return; }
  if (code === 'level') { hero.level += 50; hero.baseMaxHp += 50 * 25; hero.baseAttack += 50 * 3; recalcStats(hero); updateHUD(); toast(`⭐ +50 уровней`, 'unique'); return; }
  if (code === 'arena') { state.hero.arena.rating = 1500; toast('🏟️ Рейтинг = 1500', 'unique'); return; }
  if (code === 'full') { applyDevCode('s20'); return; }
  toast('❌ Неизвестный код', 'epic');
}

document.getElementById('dev-code-apply').addEventListener('click', () => {
  const input = document.getElementById('dev-code-input');
  applyDevCode(input.value);
  input.value = '';
});
document.getElementById('dev-code-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { applyDevCode(e.target.value); e.target.value = ''; }
});

requestAnimationFrame(loop);