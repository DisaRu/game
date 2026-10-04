import { CONFIG, GRADE_ORDER } from './config.js';
import { createHero, updateHero, addXp, damageHero, autoUsePotion } from './hero.js';
import { createMob, createGroupId, pickMobDefFromZone, updateMob, aggroGroup } from './mobs.js';
import { rollDrops, gradeName, createItem, createBlessedScroll } from './items.js';
import { createAuction, tickAuction, collectSold } from './auction.js';
import { createShop, buildStock } from './shop.js';
import { render } from './render.js';
import { initUI, refreshUI, toast, showCityScreen, hideCityScreen } from './ui.js';
import { CITIES, CITY_ORDER, findZone, cityTeleportCost } from './cities.js';
import {
  initAudio, sfxShoot, sfxHit, sfxDeath, sfxHeroHit, sfxLevelUp, sfxHeroDie
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let COLS = 12, ROWS = 20;

const layout = { COLS, ROWS, cellPx: 40, offsetX: 0, offsetY: 0 };

const state = {
  hero: null, mobs: [], projectiles: [], effects: [],
  gold: 3000,
  currentCity: 'talking_island',
  currentZone: null,
  inBattle: false,
  zoneBg: '#1a2a10',
  spawnTimer: 0,
  respawnTimer: 0,
  paused: false,
  sessionStats: { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 },
  lastSession: null,
  deathTimer: 10,
};

const auction = createAuction();
const shop = createShop();

const input = {
  left:false, right:false, up:false, down:false,
  joyActive:false, joyX:0, joyY:0, joyStartX:0, joyStartY:0,
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

document.querySelectorAll('.class-btn').forEach(btn => {
  btn.addEventListener('click', () => startGame(btn.dataset.class));
});

function startGame(classType) {
  initAudio();
  state.hero = createHero(classType);
  state.hero.x = COLS/2;
  state.hero.y = ROWS/2;
  state.gold = CONFIG.startGold;
  state.currentCity = 'talking_island';
  state.currentZone = null;
  state.inBattle = false;

  document.getElementById('class-select').classList.add('hidden');
  document.getElementById('bottom-panel').classList.remove('hidden');

  rebuildShopStock();

  initUI(state, auction, shop, {
    onEquipChange: () => { updateHUD(); refreshUI(); },
    onEnterZone: (zoneId) => enterZone(zoneId),
    onTravelToCity: (cityId, cost) => travelToCity(cityId, cost),
    onReturnToCity: () => returnToCity(),
    makeItem: (grade, slot, wt) => createItem(grade, slot, wt),
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

  document.getElementById('zone-name').textContent = zone.name;
  document.getElementById('zone-diff').textContent = zone.diff === 'easy' ? '🟢' : zone.diff === 'medium' ? '🟡' : '🔴';

  hideCityScreen();
  updateHUD();
}

function returnToCity() {
  if (state.sessionStats.kills > 0 || state.sessionStats.gold > 0) {
    state.lastSession = {
      zone: state.currentZone?.name || '—',
      ...state.sessionStats,
    };
  }
  state.inBattle = false;
  state.mobs = []; state.projectiles = []; state.effects = [];
  state.currentZone = null;
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
  state.mobs = [];
  state.currentZone = null;
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
    if (el) el.style.display = count > 0 ? '' : 'none';
  }
  const ssGrade = h.equipment.weapon?.grade;
  const ssCount = ssGrade ? (h.soulshots[ssGrade] || 0) : 0;
  document.getElementById('soulshot-count').textContent = ssCount;
  const ssEl = document.getElementById('hud-soulshot');
  if (ssEl) ssEl.style.display = ssCount > 0 ? '' : 'none';
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

  // Заполнить отчёт
  document.getElementById('lost-xp').textContent = lost;
  document.getElementById('sr-gold').textContent = state.sessionStats.gold;
  document.getElementById('sr-xp').textContent = state.sessionStats.xp;
  document.getElementById('sr-kills').textContent = state.sessionStats.kills;
  document.getElementById('sr-items').textContent = state.sessionStats.items;
  document.getElementById('sr-scrolls').textContent = state.sessionStats.scrolls;
  document.getElementById('sr-blessed').textContent = state.sessionStats.blessed;

  state.lastSession = {
    zone: state.currentZone?.name || '—',
    ...state.sessionStats,
  };

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
  if (state.hero && state.inBattle && !state.paused) update(dt);
  if (state.inBattle) render(ctx, canvas, state, layout);
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

  const sp = state.currentZone.spawn;
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    trySpawnMob();
    state.spawnTimer = sp.interval * (0.7 + Math.random() * 0.6);
  }

  for (const m of state.mobs) {
    if (m.dead) continue;
    const action = updateMob(m, dt, hero, hero.x, hero.y);
    m.x = Math.max(0.3, Math.min(COLS - 0.3, m.x));
    m.y = Math.max(0.3, Math.min(ROWS - 0.3, m.y));
    if (action === 'attack') {
      const result = damageHero(hero, m.attack);
      if (result === 'dodge') {
        state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a5f3fc', text: 'DODGE' });
      } else {
        sfxHeroHit();
        state.effects.push({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ef4444', text: '-' + Math.floor(m.attack) });
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
        m.hp -= p.damage; m.hitFlash = 0.12; m.aggro = true;
        if (m.groupId) aggroGroup(state.mobs, m.groupId);
        sfxHit();
        const dmgColor = p.isCrit ? '#f97316' : '#facc15';
        const dmgText = (p.isCrit ? '💥' : '-') + Math.floor(p.damage);
        state.effects.push({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: dmgColor, text: dmgText, big: p.isCrit });
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
      state.sessionStats.gold += m.reward;
      state.sessionStats.xp += m.xp;
      state.sessionStats.kills++;
      sfxDeath();

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
        hero.blessed += drops.blessed;
        state.sessionStats.blessed += drops.blessed;
        toast(`✨ Blessed Scroll найден!`, 'unique');
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

  updateHUD();
}

requestAnimationFrame(loop);