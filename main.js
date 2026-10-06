import { CONFIG, GRADE_ORDER, BUFF_SCROLLS, BUFF_ORDER, BUFF_DROP_CHANCE, MOBS, POTIONS } from './config.js';
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
import { initAuth, getAuthUser } from './auth-ui.js';
import { saveProgress, saveLocalBackup } from './save.js';
import { startOfflineFarm, getOfflineStatus, stopOffline, saveOfflineLocal, setOfflineUid, OFFLINE_MAX_HOURS } from './offline.js';

// === ПРОГРЕВ SUPABASE ===
import { supabase } from './supabase.js';

async function warmupSupabase() {
  const t0 = Date.now();
  try {
    await supabase.auth.getSession();
    console.log('Supabase warmup:', Date.now() - t0, 'ms');
  } catch (e) {
    console.log('Supabase warmup failed:', e.message);
  }
}
warmupSupabase();

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
  offlineAliveCheck: false,
  offlineInterval: null,
  aliveTime: 0,
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

  // Кнопка офлайн-фарма
  const offlineBtn = document.getElementById('hud-offline');
  if (offlineBtn) {
    offlineBtn.addEventListener('click', () => {
      const hero = state.hero;
      if (!hero) return;
      if (hero.offlineActive) {
        // Клик по активной кнопке = выключить офлайн-режим (нужно быть в зоне)
        if (state.currentZone && state.currentZone.id === hero.offlineZoneId && !state.dungeon) {
          returnFromOffline();
        } else {
          toast('Вернись в фарм-зону, чтобы выключить офлайн', 'epic');
        }
        return;
      }
      if (!state.currentZone) { toast('Офлайн-фарм только в зоне', 'epic'); return; }
      if (state.dungeon) { toast('Нельзя в данже', 'epic'); return; }

      const result = startOfflineFarm(state);
      if (!result.ok) { toast('Нельзя', 'epic'); return; }

      toast('💤 Офлайн-фарм запущен. Бой продолжается.', 'legendary');
      setTimeout(() => openOfflinePanel(), 100);
    });
  }
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

  arena.bots = createBots(100);

  document.getElementById('class-select').classList.add('hidden');
  document.getElementById('bottom-panel').classList.remove('hidden');

  rebuildShopStock();



updateHUD();
showCityScreen();

// Сохранить нового героя
setTimeout(() => saveProgress(state), 500);
}

function rebuildShopStock() {
  const city = CITIES[state.currentCity];
  shop.stock = buildStock(city.grade, state.hero.weaponType);
}

function enterZone(zoneId) {
  const city = CITIES[state.currentCity];
  const zone = findZone(state.currentCity, zoneId);
   if (state.hero && state.hero.offlineActive) {
    // Разрешаем только в ту же зону, где идёт офлайн
    if (state.hero.offlineZoneId !== zoneId) {
      toast('Персонаж занят офлайн-фармом в другой зоне', 'epic');
      return;
    }
    // Возврат в свою офлайн-зону: НЕ хилим и НЕ воскрешаем бесплатно —
    // иначе смерть в офлайне и расход зелий обходятся даром
    if (zone) {
      state.currentZone = zone;
      state.zoneBg = city.bg;
      // Из города state.inBattle был сброшен — без него loop не крутит
      // update() после выхода из офлайна, и зона «залипает» без боя
      state.inBattle = true;
      // Мобы во время офлайна живут только в памяти симуляции; если их нет
      // (возврат из города) — заново заспавним, бой подхватит loop
      if (state.mobs.length === 0) state.spawnTimer = 0.3;
      if (!state.hero.dead && !state.portal) state.portal = spawnPortalInZone(zone);
      document.getElementById('bottom-panel').classList.remove('hidden');
      document.getElementById('zone-name').textContent = zone.name;
      document.getElementById('zone-diff').textContent = zone.diff === 'easy' ? '🟢' : zone.diff === 'medium' ? '🟡' : '🔴';
      hideCityScreen();
      updateHUD();
    }
    return;
  }
  if (!zone) return;
  if (state.gold < zone.teleportCost) { toast('Недостаточно золота', 'epic'); return; }

  state.gold -= zone.teleportCost;
  state.currentZone = zone;
  state.zoneBg = city.bg;
  state.mobs = []; state.projectiles = []; state.effects = [];
  state.spawnTimer = 0.5;
  state.hero.x = COLS/2; state.hero.y = ROWS/2;
  if (!state.hero?.offlineActive) {
    state.sessionStats = { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };
  }  state.hero.dead = false;
  state.hero.hp = state.hero.maxHp;
  state.inBattle = true;

  state.portal = spawnPortalInZone(zone);
  state.dungeon = null;
  state.aoeList = [];
  state.offlineAliveCheck = false;
  state.aliveTime = 0;

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

  // Выход в город при активном офлайне: оставляем currentZone для
  // возврата, но офлайн ставится на паузу (watermark двигает live-тик,
  // а плашка скрывается по cityVisible в loop)
  if (!state.hero?.offlineActive) {
    state.currentZone = null;
    state.mobs = [];
    state.projectiles = [];
    state.effects = [];
    state.portal = null;
  }
  state.dungeon = null;
  state.aoeList = [];

  document.getElementById('offline-overlay').classList.add('hidden');
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
  // Во время офлайн-досчёта HUD не трогаем — обновим один раз по окончании батча
  if (window._offlineSim) return;
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
        const minSpawnDist = state.currentZone?.spawn?.minSpawnDist ?? 8;
    if (distHero < minSpawnDist) continue;
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

  // Во время офлайн-досчёта не трогаем death-screen/combat-log — плашка
  // офлайна сама покажет смерть. Смерть сразу персистим, иначе после
  // перезагрузки герой «воскреснет» и то же окно досчитается заново
  if (window._offlineSim) {
    state.lastSession = { zone: state.currentZone?.name || '—', ...state.sessionStats };
    if (h.offlineLog) h.offlineLog.push({ time: Math.floor((Date.now() - (h.offlineStartTime || Date.now())) / 1000), text: `💀 Погиб, -${lost} опыта`, type: 'death' });
    try { saveOfflineLocal(state); } catch (e) {}
    return;
  }

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

  const hero = state.hero;
  const shouldTick = hero && !hero.dead && state.currentZone && state.inBattle && !hero.offlineActive;
  const inOfflineZone = hero && hero.offlineActive && state.currentZone && state.currentZone.id === hero.offlineZoneId && !state.dungeon;

  if (shouldTick) {
    // === ОБЫЧНЫЙ БОЙ: update(dt) ===
    update(dt);
  }

  // Офлайн-фарм: периодический локальный сейв (лог боя пишет симуляция)
  if (inOfflineZone && hero && !hero.dead) {
    hero._offlineSaveTick = (hero._offlineSaveTick || 0) + dt;
    if (hero._offlineSaveTick >= 5) {
      hero._offlineSaveTick = 0;
      try { saveOfflineLocal(state); } catch (e) {}
    }
  }

  if (hero && !state.inBattle && !hero.offlineActive) tickBots(arena.bots, dt);
  // В офлайне канвас НЕ рендерим вообще: плашка заменяет собой вид фарм-зоны,
  // отрисовка идущего за ней боя только лагает и жрёт бюджет
  if (state.inBattle && !hero?.offlineActive && !window._offlineCatchup) {
    render(ctx, canvas, state, layout, camera);
  }

  // Плашка офлайна — компактная, видна только в своей фарм-зоне
  // (не в данже, не в городе); класс меняем только при смене признака
  const overlay = document.getElementById('offline-overlay');
  if (overlay) {
    const cityVisible = !document.getElementById('city-screen')?.classList.contains('hidden');
    const wantVisible = !!inOfflineZone && !cityVisible;
    const isHidden = overlay.classList.contains('hidden');
    if (isHidden === wantVisible) overlay.classList.toggle('hidden', !wantVisible);
  }

  requestAnimationFrame(loop);
}

// Фоновый тик офлайна через setInterval — работает даже в фоновой вкладке
// Симуляция дробится на подшаги dt=0.05: тик dt=1 сек ломал физику боя
// (снаряды телепортировались мимо мобов, хил не успевал) и вешал вкладку
const OFFLINE_SIM_SUBSTEP = 0.05;
const OFFLINE_SIM_MAX_STEPS_PER_TICK = 200; // не более 10 сим-секунд за один setInterval
const OFFLINE_CATCHUP_BUDGET_MS = 15; // мс реального времени на батч досчёта

// Скользящее окно сим-секунд: live-тик двигает offlineStartTime не чаще
// раза в 5 секунд (иначе перманентный дрейф из-за округления floor в elapsed)
let _offlineSimAccum = 0;
let _offlineSimMarkTime = 0;
function commitOfflineSimTime(simSeconds) {
  _offlineSimAccum += simSeconds;
  const now = Date.now();
  if (now - _offlineSimMarkTime >= 5000 && _offlineSimAccum >= 1) {
    const whole = Math.floor(_offlineSimAccum);
    _offlineSimAccum -= whole;
    const hero = state.hero;
    if (hero && hero.offlineActive) {
      hero.offlineStartTime = Math.min(now, (hero.offlineStartTime || now) + whole * 1000);
      hero.offlineElapsedTotal = Math.min(
        (hero.offlineElapsedTotal || 0) + whole,
        OFFLINE_MAX_HOURS * 3600
      );
    }
  }
}

setInterval(() => {
  const hero = state.hero;
  if (!hero || !hero.offlineActive || hero.dead) return;
  if (!state.currentZone) return;

  // Вне своей фарм-зоны (город/другая зона/данж) — офлайн на паузе:
  // сдвигаем watermark, чтобы это время не досчитывалось как бой
  if (state.currentZone.id !== hero.offlineZoneId || state.dungeon) {
    hero.offlineStartTime = Date.now();
    _offlineSimAccum = 0;
    return;
  }

  // Кап OFFLINE_MAX_HOURS действует и на живой фарм с открытой вкладкой
  if ((hero.offlineElapsedTotal || 0) >= OFFLINE_MAX_HOURS * 3600) return;

  // Во время catch-up-досчёта не мешаем: он сам всё досчитает
  if (window._offlineCatchup) return;

  // Сколько реальных секунд не досчитано (с учётом троттлинга фонового
  // setInterval) — ровно столько и симулируем, не больше капа
  const backlogSec = Math.floor((Date.now() - (hero.offlineStartTime || Date.now())) / 1000);
  if (backlogSec < 1) return;
  const budgetSec = Math.min(backlogSec, OFFLINE_SIM_MAX_STEPS_PER_TICK * OFFLINE_SIM_SUBSTEP);
  simulateOfflineSeconds(budgetSec, OFFLINE_SIM_MAX_STEPS_PER_TICK);
}, 1000);

// Симуляция N секунд офлайн-боя маленькими подшагами.
// Возвращает true, если досчёт закончен (умер или догнал targetSec),
// false — если лимит шагов на этот вызов исчерпан и надо продолжить.
function simulateOfflineSeconds(seconds, maxSteps) {
  const hero = state.hero;
  if (!hero || hero.dead) return true;

  const savedInput = {
    left: input.left, right: input.right, up: input.up, down: input.down,
    joyX: input.joyX, joyY: input.joyY, joyActive: input.joyActive,
  };
  input.left = input.right = input.up = input.down = false;
  input.joyX = 0; input.joyY = 0; input.joyActive = false;

  // Если внутри досчёта случился ещё один досчёт (catch-up + live-tick),
  // не сбрасываем флаг досчёта раньше времени
  const nested = window._offlineSim;
  window._offlineSim = true;
  window._sfxDisabled = true;
  try {
    const steps = Math.min(maxSteps || Infinity, Math.ceil(seconds / OFFLINE_SIM_SUBSTEP));
    let done = 0;
    for (let i = 0; i < steps; i++) {
      if (hero.dead || !hero.offlineActive) break;
      update(OFFLINE_SIM_SUBSTEP);
      done++;
      _offlineSimClock += OFFLINE_SIM_SUBSTEP;
      // Строка боя в лог плашки: первая через 30 сим-секунд, дальше раз в минуту
      if (_offlineSimClock >= _offlineLogNextAt) {
        // Счётчик следующий строки — кратно периоду после текущей метки
        while (_offlineLogNextAt <= _offlineSimClock) _offlineLogNextAt += OFFLINE_LOG_PERIOD_SEC;
        flushOfflineCombatLog(hero, Math.floor(_offlineSimClock + (hero.offlineElapsedTotal || 0)));
      }
    }
    // Watermark: засчитанное симуляцией время накапливаем и двигаем
    // offlineStartTime окном по 5 секунд (см. commitOfflineSimTime).
    // Во время catch-up watermark ставит finish-блок целиком — здесь не трогаем
    if (done > 0 && hero.offlineActive && !hero.dead && !window._offlineCatchup) {
      commitOfflineSimTime(done * OFFLINE_SIM_SUBSTEP);
    }
    return done * OFFLINE_SIM_SUBSTEP >= seconds - 1e-9;
  } finally {
    if (!nested) {
      window._offlineSim = false;
      window._sfxDisabled = false;
    }
    Object.assign(input, savedInput);
  }
}

function addEffect(fx) {
  // Во время офлайн-досчёта визуальные эффекты не создаём (сотни тысяч объектов)
  if (!window._offlineSim) state.effects.push(fx);
}

// ===== ОФЛАЙН-ЛОГ БОЯ =====
// Накопитель событий за текущий интервал логирования (агрегируем, чтобы
// не плодить объекты на каждом ударе). Сбрасывается при записи строки лога.
const _offCombat = { deal: 0, dealCnt: 0, crit: 0, critCnt: 0, miss: 0, taken: 0, takenCnt: 0, dodge: 0, lastMob: '', kills: 0, gold: 0, drops: {} };
const OFFLINE_LOG_FIRST_SEC = 30;  // первая строка лога — через 30 сим-секунд
const OFFLINE_LOG_PERIOD_SEC = 60; // дальше — раз в минуту
let _offlineLogNextAt = OFFLINE_LOG_FIRST_SEC; // абсолютная метка след. строки
let _offlineSimClock = 0; // абсолютное симулированное время офлайна (сек)

// Сброс накопителей при старте/остановке офлайна (вызывается из offline.stopOffline)
window._offlineResetCounters = () => {
  _offlineLogNextAt = OFFLINE_LOG_FIRST_SEC;
  _offlineSimClock = 0;
  _offCombat.deal = 0; _offCombat.dealCnt = 0;
  _offCombat.crit = 0; _offCombat.critCnt = 0;
  _offCombat.miss = 0;
  _offCombat.taken = 0; _offCombat.takenCnt = 0;
  _offCombat.dodge = 0;
  _offCombat.kills = 0; _offCombat.gold = 0; _offCombat.drops = {};
};

function noteOfflineCombatEvent(kind, info) {
  if (!window._offlineSim) return; // в живом бою не нужно — там визуал на канвасе
  switch (kind) {
    case 'deal': _offCombat.deal += info.dmg; _offCombat.dealCnt++; break;
    case 'crit': _offCombat.crit += info.dmg; _offCombat.critCnt++; break;
    case 'miss': _offCombat.miss++; break;
    case 'hit': _offCombat.taken += info.dmg; _offCombat.takenCnt++; _offCombat.lastMob = info.mob || _offCombat.lastMob; break;
    case 'dodge': _offCombat.dodge++; break;
    case 'kill': _offCombat.kills++; _offCombat.gold += info.gold || 0; break;
    case 'drop': {
      const g = info.grade || '?';
      _offCombat.drops[g] = (_offCombat.drops[g] || 0) + 1;
      break;
    }
  }
}

function flushOfflineCombatLog(hero, elapsedSec) {
  const c = hero.offlineCounters || {};
  const parts = [];
  const totalDealt = _offCombat.deal + _offCombat.crit;
  if (totalDealt > 0) {
    const dps = Math.round(totalDealt / OFFLINE_LOG_PERIOD_SEC);
    parts.push(`⚔ -${totalDealt} (${dps}/с)`);
  }
  if (_offCombat.critCnt > 0) parts.push(`💥 ${_offCombat.critCnt}`);
  if (_offCombat.miss > 0) parts.push(`💨 ${_offCombat.miss}`);
  if (_offCombat.takenCnt > 0) parts.push(`🩸 -${_offCombat.taken} (${_offCombat.takenCnt} уд.${_offCombat.lastMob ? ' ' + _offCombat.lastMob : ''})`);
  if (_offCombat.dodge > 0) parts.push(`🌀 ${_offCombat.dodge}`);
  if (_offCombat.kills > 0) parts.push(`☠ ${_offCombat.kills} (+${Math.floor(_offCombat.gold)}💰)`);
  // Дроп карточек по грейдам за интервал
  const dropKeys = Object.keys(_offCombat.drops);
  if (dropKeys.length > 0) {
    parts.push('📦 ' + dropKeys.sort().map(g => `${g}:${_offCombat.drops[g]}`).join(' '));
  }

  // Сброс накопителя в любом случае
  _offCombat.deal = 0; _offCombat.dealCnt = 0;
  _offCombat.crit = 0; _offCombat.critCnt = 0;
  _offCombat.miss = 0;
  _offCombat.taken = 0; _offCombat.takenCnt = 0;
  _offCombat.dodge = 0;
  _offCombat.kills = 0; _offCombat.gold = 0; _offCombat.drops = {};

  if (!hero.offlineLog) hero.offlineLog = [];
  hero.offlineLog.push({ time: elapsedSec, text: parts.join(' · '), type: 'progress' });
  if (hero.offlineLog.length > 50) hero.offlineLog.shift();
}

function update(dt) {
   const hero = state.hero;
  if (!hero) return;
  if (!state.currentZone) return;  // нет зоны — нет боя
  if (hero.dead) {
    state.deathTimer -= dt;
    if (!window._offlineSim) {
      document.getElementById('respawn-timer').textContent = Math.ceil(Math.max(0, state.deathTimer));
      if (state.deathTimer <= 0) {
        document.getElementById('death-screen').classList.add('hidden');
        playTeleportAnim(() => respawnHero());
      }
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

  if (!state.dungeon && state.currentZone) {
    const sp = state.currentZone.spawn;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      trySpawnMob();
      state.spawnTimer = sp.interval * (0.7 + Math.random() * 0.6);
    }
  }
  // Передаём safeRadius из зоны
  window.__zoneSafeRadius = state.currentZone?.spawn?.safeRadius ?? 4;

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
        noteOfflineCombatEvent('dodge', { mob: m.name || m.id });
        addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a5f3fc', text: 'DODGE' });
      } else {
        if (hero.thornsPercent > 0) {
          const thorns = Math.floor(mobDmg * hero.thornsPercent);
          m.hp -= thorns;
          m.hitFlash = 0.15;
          addEffect({ x: m.x, y: m.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a855f7', text: '🌵' + thorns, big: true });
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#a855f7', radius: 0.9 });
        }
        sfxHeroHit();
        noteOfflineCombatEvent('hit', { mob: m.name || m.id, dmg: mobDmg });
        addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ef4444', text: '-' + mobDmg });
        if (result === 'dead') { heroDie(); return; }
      }
      updateHUD();
    }
  }

  updateHero(hero, dt, state.mobs, state.projectiles, moveInput, { cols: COLS, rows: ROWS }, state.effects);

  const potResult = autoUsePotion(hero, dt);
  if (potResult) {
    addEffect({ x: hero.x, y: hero.y - 1, life: 1.0, maxLife: 1.0, color: potResult.color, text: '+' + potResult.healed, big: true });
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
              addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ea580c', text: '-' + Math.floor(dmg) });
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
        addEffect({ x: hero.x, y: hero.y - 1, life: 1.0, maxLife: 1.0, color: '#dc2626', text: '-' + Math.floor(dmg), big: true });
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
          noteOfflineCombatEvent('miss');
          addEffect({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a5f3fc', text: 'MISS' });
          hit = true;
          break;
        }

        const effDef = calcEffectiveDefense(m, hero);
        let finalDamage = Math.max(1, p.damage - Math.floor(effDef * 0.5));

        if (p.doubleStrike && !p.doubleStrikeDone) {
          p.doubleStrikeDone = true;
          finalDamage *= 2;
          addEffect({ x: m.x, y: m.y - 1.2, life: 0.8, maxLife: 0.8, color: '#fbbf24', text: '👊 x2', big: true });
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#fbbf24', radius: 1.0 });
        }

        if (p.isExecute) {
          addEffect({ x: m.x, y: m.y - 1.6, life: 0.9, maxLife: 0.9, color: '#dc2626', text: '💀 КАЗНЬ', big: true });
        }

        m.hp -= finalDamage; m.hitFlash = 0.12; m.aggro = true;
        if (m.groupId) aggroGroup(state.mobs, m.groupId);
        sfxHit();
        noteOfflineCombatEvent(p.isCrit ? 'crit' : 'deal', { mob: m.name || m.id, dmg: Math.floor(finalDamage) });
        const dmgColor = p.isCrit ? '#f97316' : '#facc15';
        const dmgText = (p.isCrit ? '💥' : '-') + Math.floor(finalDamage);
        addEffect({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: dmgColor, text: dmgText, big: p.isCrit });

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
            addEffect({ x: target.x, y: target.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a855f7', text: '⚡' + Math.floor(finalDamage * 0.7), big: true });
            for (let k = 0; k < 2; k++) {
              addEffect({ kind: 'chain', x1: prev.x, y1: prev.y, x2: target.x, y2: target.y, life: 0.35, maxLife: 0.35, color: k === 0 ? '#a855f7' : '#d4a5ff' });
            }
            addEffect({ kind: 'flash', x: target.x, y: target.y, life: 0.3, maxLife: 0.3, color: '#a855f7', radius: 0.8 });
            prev = target;
          }
          if (candidates.length > 0) {
            addEffect({ x: m.x, y: m.y - 2.0, life: 0.7, maxLife: 0.7, color: '#d4a5ff', text: '⚡⚡⚡ x' + candidates.length, big: true });
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
          if (hero.offlineActive && hero.offlineCounters) {
        hero.offlineCounters.gold += m.reward;
        hero.offlineCounters.xp += m.xp;
        hero.offlineCounters.kills++;
        noteOfflineCombatEvent('kill', { gold: m.reward });
      }
      sfxDeath();

      if (m.boss && state.dungeon) {
        const drops = rollBossDrops(hero, state.currentZone, state.dungeon.cityGrade);
        state.gold += drops.gold;
        state.sessionStats.gold += drops.gold;
        toast(`💰 +${drops.gold} с босса`, 'legendary');

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
        if (hero.offlineActive && hero.offlineCounters) {
          hero.offlineCounters.items++;
          noteOfflineCombatEvent('drop', { grade: it.grade });
        }
        toast(`${it.icon} ${it.name}`, it.grade);
      }
      for (const sc of drops.scrolls) {
        if (!hero.scrolls[sc.grade]) hero.scrolls[sc.grade] = { weapon: 0, armor: 0 };
        hero.scrolls[sc.grade][sc.type]++;
        state.sessionStats.scrolls++;
        if (hero.offlineActive && hero.offlineCounters) {
          hero.offlineCounters.scrolls++;
          noteOfflineCombatEvent('drop', { grade: sc.grade });
        }
        toast(`📜 Свиток: ${gradeName(sc.grade)}`, sc.grade);
      }
      if (drops.blessed > 0) {
        for (let k = 0; k < drops.blessed; k++) addToBackpack(hero, createBlessedScroll());
        state.sessionStats.blessed += drops.blessed;
        if (hero.offlineActive && hero.offlineCounters) {
          hero.offlineCounters.scrolls++;
          noteOfflineCombatEvent('drop', { grade: 'blessed' });
        }
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
    if (!window._offlineSim) log(`⭐ Уровень ${hero.level}!`, '#a78bfa');
    updateHUD();
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }

  updateCamera(hero);
  updateHUD();

  // Трекинг "жив 30 секунд" для офлайн-фарма
  if (state.inBattle && !hero.dead && !hero.offlineActive) {
    state.aliveTime = (state.aliveTime || 0) + dt;
    if (state.aliveTime >= 30 && !state.offlineAliveCheck) {
      state.offlineAliveCheck = true;
      const btn = document.getElementById('hud-offline');
      if (btn) btn.classList.add('ready');
    }
  }
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

// ===== АВТОСЕЙВ =====
setInterval(() => {
  if (state.hero && getAuthUser()) {
    saveProgress(state);
  }
}, 15000);  // раз в 15 сек

window.addEventListener('beforeunload', () => {
  const hero = state.hero;
  if (!hero) return;
  if (hero.offlineActive) saveOfflineLocal(state);
  if (getAuthUser()) saveProgress(state);
});
// ===== ИНИЦИАЛИЗАЦИЯ UI (один раз) =====
initUI(state, auction, shop, arena, {
  onEquipChange: () => { updateHUD(); refreshUI(); },
  onEnterZone: (zoneId) => enterZone(zoneId),
  onTravelToCity: (cityId, cost) => travelToCity(cityId, cost),
  onReturnToCity: () => returnToCity(),
  makeItem: (grade, slot, wt, variant) => createItem(grade, slot, wt, variant),
});
// ===== АВТОРИЗАЦИЯ =====
// ===== АВТОРИЗАЦИЯ =====
let _progressLoaded = false;
// Хэндл catch-up-досчёта, чтобы returnFromOffline мог его остановить
let _catchupIntervalId = null;
// ===== ОФЛАЙН-ПАНЕЛЬ =====
function openOfflinePanel() {
  const hero = state.hero;
  if (!hero || !hero.offlineActive) return;
  if (!state.currentZone || state.currentZone.id !== hero.offlineZoneId) return;
  const overlay = document.getElementById('offline-overlay');
  if (!overlay) return;
  overlay.classList.remove('hidden');
  updateOfflinePanel();
}

function updateOfflinePanel() {
  // Во время офлайн-досчёта панель не обновляем — она обновится после батча
  if (window._offlineSim || window._offlineCatchup) return;
  const hero = state.hero;
  if (!hero || !hero.offlineActive) return;
  const st = getOfflineStatus(state);
  if (!st) return;

  // Таймер офлайна: честный источник — накопленное досчитанное время
  // (offlineElapsedTotal) + незакрытый хвост от watermark до текущего
  // момента. Сглаживаем: не даём времени идти назад между обновлениями
  const tailSec = Math.max(0, Math.floor((Date.now() - (hero.offlineStartTime || Date.now())) / 1000));
  let shownSeconds = Math.min((hero.offlineElapsedTotal || 0) + tailSec, st.maxSeconds);
  if (state._offlineTimerShown === undefined) state._offlineTimerShown = 0;
  if (shownSeconds < state._offlineTimerShown) shownSeconds = Math.min(state._offlineTimerShown, st.maxSeconds);
  else state._offlineTimerShown = shownSeconds;
  const effective = shownSeconds;

  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  const setWidth = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.style.width = val + '%';
  };

  const hours = Math.floor(effective / 3600);
  const mins = Math.floor((effective % 3600) / 60);

  setText('offline-zone', `Зона: ${st.zoneName}`);
  setText('offline-timer', `${hours}ч ${mins}мин`);
  setText('offline-gold', Math.floor(st.gold).toLocaleString());
  setText('offline-xp', Math.floor(st.xp).toLocaleString());
  setText('offline-kills', Math.floor(st.kills));
  setText('offline-drops', Math.floor(st.items));

  // Ресурсы: показываем ТОЛЬКО то, что реально используется — активное
  // зелье и соски (если включены). Пустые строки скрываем.
  const setResRow = (rowId, valId, val) => {
    const row = document.getElementById(rowId);
    if (row) row.style.display = 'flex';
    setText(valId, val);
  };
  const hideResRow = (rowId) => {
    const row = document.getElementById(rowId);
    if (row) row.style.display = 'none';
  };
  if (hero.soulshotActive && hero.equipment.weapon) {
    setResRow('offline-res-ss', 'offline-soulshots', `${st.soulshotsLeft} (${gradeName(hero.equipment.weapon.grade)})`);
  } else {
    hideResRow('offline-res-ss');
  }
  if (hero.activePotion) {
    setResRow('offline-res-pot', 'offline-potions', `${hero.potions[hero.activePotion] || 0} (${POTIONS[hero.activePotion]?.name || hero.activePotion})`);
  } else {
    hideResRow('offline-res-pot');
  }

  const progress = Math.min(100, (effective / st.maxSeconds) * 100);
  setWidth('offline-progress', progress);

  const forecast = document.getElementById('offline-forecast');
  if (forecast) {
    const rate = `☠ ${st.killsPerHour.toFixed(0)}/ч · 💰 ${Math.round(st.goldPerHour).toLocaleString()}/ч`;
    if (st.dead) {
      forecast.innerHTML = `💀 Умер. HP 0/${st.maxHp}<br><span class="of-rate">${rate}</span>`;
      forecast.style.color = '#ef4444';
    } else {
      forecast.innerHTML = `❤ HP ${st.hp}/${st.maxHp}<br><span class="of-rate">${rate}</span>`;
      forecast.style.color = st.hp / st.maxHp > 0.5 ? '#4ade80' : '#ef4444';
    }
  }

  const logEl = document.getElementById('offline-log');
  if (logEl) {
    // Перерисовываем лог только когда появились новые записи — раньше это
    // плодило десятки DOM-узлов каждый кадр и вешало вкладку
    const last = st.log[st.log.length - 1];
    const sig = st.log.length + '|' + (last ? last.time + last.text : '');
    if (logEl.dataset.sig !== sig) {
      logEl.dataset.sig = sig;
      logEl.innerHTML = '';
      for (const entry of st.log) {
        const div = document.createElement('div');
        div.className = entry.type === 'death' ? 'log-death' : 'log-progress';
        const m = Math.floor(entry.time / 60);
        const s = Math.floor(entry.time % 60);
        div.textContent = `[${m}:${s < 10 ? '0' : ''}${s}] ${entry.text}`;
        logEl.appendChild(div);
      }
      logEl.scrollTop = logEl.scrollHeight;
    }
  }

  const btn = document.getElementById('offline-return');
  if (btn) {
    btn.textContent = st.dead ? '🏙 В город' : '🏃 Вернуться в игру';
  }
}

function returnFromOffline() {
  const hero = state.hero;
  if (!hero || !hero.offlineActive) return;

  // Останавливаем досчёт, если он ещё идёт
  if (_catchupIntervalId !== null) {
    clearInterval(_catchupIntervalId);
    _catchupIntervalId = null;
    window._offlineCatchup = false;
  }

  const wasDead = hero.dead;

  stopOffline(state);
  setTimeout(() => saveProgress(state), 200);

  document.getElementById('offline-overlay').classList.add('hidden');

  if (wasDead) {
    // Возврат в город с респавном
    hero.hp = hero.maxHp;
    hero.dead = false;
    state.inBattle = false;
    state.mobs = [];
    state.projectiles = [];
    state.effects = [];
    state.currentZone = null;
    state.dungeon = null;
    state.portal = null;
    state.aoeList = [];
    showCityScreen();
    updateHUD();
  } else {
    // Продолжаем в зоне
    // Возврат из города: там был сброшен inBattle и вычищены моб-объекты —
    // без этого loop не крутит update() и зона «залипает» без боя
    state.inBattle = true;
    if (!state.currentZone && state.hero.offlineZoneId) {
      state.currentZone = findZone(state.hero.offlineCityId || state.currentCity, state.hero.offlineZoneId);
    }
    if (state.currentZone) {
      if (state.mobs.length === 0) state.spawnTimer = 0.3;
      if (!state.portal) state.portal = spawnPortalInZone(state.currentZone);
      document.getElementById('bottom-panel').classList.remove('hidden');
      document.getElementById('zone-name').textContent = state.currentZone.name;
      document.getElementById('zone-diff').textContent = state.currentZone.diff === 'easy' ? '🟢' : state.currentZone.diff === 'medium' ? '🟡' : '🔴';
    }
    toast('💤 Офлайн завершён. Управление возвращено.', 'legendary');
    updateHUD();
    refreshUI();
  }

  try { saveLocalBackup(state); } catch (e) {}
}

initAuth({
  onLoadProgress: (save) => {
    if (_progressLoaded) return;
    _progressLoaded = true;
    setOfflineUid(getAuthUser()?.id);

    try {
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('class-select').classList.add('hidden');

      if (!save || !save.hero) {
        document.getElementById('class-select').classList.remove('hidden');
        return;
      }

           state.hero = save.hero;
      state.gold = save.gold || 3000;
      state.currentCity = save.currentCity || 'talking_island';
      recalcStats(state.hero);

      // ✅ Создаём ботов (иначе арена пустая)
      if (!arena.bots || arena.bots.length === 0) {
        arena.bots = createBots(100);
      }
             // === ВОССТАНОВЛЕНИЕ ОФЛАЙНА из localStorage ===
            // === ВОССТАНОВЛЕНИЕ ОФЛАЙНА из localStorage ===
           // === ВОССТАНОВЛЕНИЕ ОФЛАЙНА из localStorage ===
      let localOff = null;
      try {
        const raw = localStorage.getItem('offline_state_' + (getAuthUser()?.id || '_anon'));
        if (raw) localOff = JSON.parse(raw);
      } catch (e) {}

      if (localOff && localOff.active) {
        state.hero.offlineActive = true;
        state.hero.offlineZoneId = localOff.zoneId;
        state.hero.offlineCityId = localOff.cityId;
        state.hero.offlineZoneName = localOff.zoneName;
        state.hero.offlineStartTime = localOff.startTime || Date.now();
        // Валидация накопленного времени офлайна (защита от битых/старых сейвов)
        state.hero.offlineElapsedTotal = Math.max(0, Math.min(
          Number(localOff.elapsedTotal) || 0,
          OFFLINE_MAX_HOURS * 3600
        ));
        state.hero.offlineCounters = localOff.counters || { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };
        state.hero.offlineLog = localOff.log || [];
        state.hero.dead = !!localOff.dead;
        // HP: для мёртвого держим 0, для живого клампим к текущему maxHp
        const savedMaxHp = localOff.maxHp || state.hero.maxHp;
        const savedHp = (typeof localOff.hp === 'number') ? localOff.hp : state.hero.maxHp;
        state.hero.hp = state.hero.dead ? 0 : Math.min(savedHp, state.hero.maxHp);
      }

      if (state.hero.offlineActive && state.hero.offlineZoneId) {
        const offCity = state.hero.offlineCityId || state.currentCity;
        const offZone = findZone(offCity, state.hero.offlineZoneId);

        if (offZone) {
          state.currentCity = offCity;
          state.currentZone = offZone;
          state.inBattle = true;
          state.mobs = [];
          state.projectiles = [];
          state.effects = [];
          state.spawnTimer = 0.5;
          state.hero.x = COLS / 2;
          state.hero.y = ROWS / 2;
          if (!state.hero.dead) state.portal = spawnPortalInZone(offZone);
          state.dungeon = null;
          state.aoeList = [];
          document.getElementById('zone-name').textContent = offZone.name;
          document.getElementById('zone-diff').textContent = offZone.diff === 'easy' ? '🟢' : offZone.diff === 'medium' ? '🟡' : '🔴';
          document.getElementById('bottom-panel').classList.remove('hidden');
          rebuildShopStock();
          hideCityScreen();
          updateHUD();

          // ДОСЧЁТ
          const startedAt = state.hero.offlineStartTime;
          if (startedAt && !state.hero.dead) {
            const elapsed = Math.floor((Date.now() - startedAt) / 1000);
            console.log('[OFFLINE] elapsed =', elapsed, 'sec');

            if (elapsed > 0) {
              // Досчёт подшагами dt=0.05. Живой офлайн-тик (setInterval) глушим
              // на время досчёта, чтобы они не крутили бой параллельно
              const cappedElapsed = Math.min(elapsed, OFFLINE_MAX_HOURS * 3600);
              let simSec = 0;
              let simTime = 0; // реальное время, потраченное на досчёт
              let lastPanelUpdate = 0;
              window._offlineCatchup = true;

              const catchupInterval = setInterval(() => {
                const now = Date.now();
                try {
                // Выход из офлайна во время досчёта — немедленно останавливаем
                if (!state.hero || !state.hero.offlineActive) {
                  clearInterval(catchupInterval);
                  _catchupIntervalId = null;
                  window._offlineCatchup = false;
                  return;
                }
                const finished = state.hero.dead || simSec >= cappedElapsed || now - simTime > 60000;
                if (finished) {
                  clearInterval(catchupInterval);
                  _catchupIntervalId = null;
                  window._offlineCatchup = false;
                  if (state.hero.dead && state.hero.offlineLog) {
                    state.hero.offlineLog.push({ time: cappedElapsed, text: `💀 Умер в офлайне`, type: 'death' });
                  }
                  // Сдвигаем watermark: недосчитанный остаток (если выбит лимит
                  // 60 сек) будет досчитан при следующем входе, а не потерян
                  state.hero.offlineStartTime = Math.min(
                    Date.now(),
                    startedAt + Math.round(simSec) * 1000
                  );
                  // Накопленное досчитанное время — ЕДИНСТВЕННЫЙ источник
                  // для таймера плашки (commitOfflineSimTime на время catch-up
                  // отключён, так что здесь без двойного счёта)
                  state.hero.offlineElapsedTotal = Math.min(
                    (state.hero.offlineElapsedTotal || 0) + Math.min(Math.round(simSec), cappedElapsed),
                    OFFLINE_MAX_HOURS * 3600
                  );
                  // Прогресс-бар и таймер после досчёта должны быть корректными
                  _offlineSimMarkTime = Date.now();
                  // НЕ сбрасываем counters — они накопительные
                  saveOfflineLocal(state);
                  updateHUD();
                  updateOfflinePanel();
                  setTimeout(() => openOfflinePanel(), 200);
                  return;
                }
                // Батч досчёта: до 15 мс реального времени подшагами dt=0.05
                // (~300 сим-сек за реальный кадр при быстром железе)
                const batchStart = performance.now();
                let batched = 0;
                while (performance.now() - batchStart < OFFLINE_CATCHUP_BUDGET_MS && !state.hero.dead) {
                  simulateOfflineSeconds(1, 20);
                  batched += 1;
                }
                simSec += batched;
                // Прогресс досчёта показываем раз в секунду
                if (now - lastPanelUpdate > 1000) {
                  lastPanelUpdate = now;
                  const el = document.getElementById('offline-timer');
                  if (el) el.textContent = `Досчёт ${Math.min(100, Math.floor(simSec / cappedElapsed * 100))}%...`;
                }
                } catch (e) {
                  // Любая ошибка не должна оставлять флаг досчёта залипшим
                  console.error('[OFFLINE] catchup error:', e);
                  clearInterval(catchupInterval);
                  _catchupIntervalId = null;
                  window._offlineCatchup = false;
                }
              }, 50);
              _catchupIntervalId = catchupInterval;
              simTime = Date.now();
            } else {
              saveOfflineLocal(state);
              setTimeout(() => openOfflinePanel(), 200);
            }
          } else {
            setTimeout(() => openOfflinePanel(), 200);
          }
          return;
        }
      }
      
      document.getElementById('bottom-panel').classList.remove('hidden');
      rebuildShopStock();

      // === ОФЛАЙН — приоритет ===
      // Офлайн без валидной зоны (зона не найдена) — в город, офлайн активен
      if (state.hero.offlineActive) {
        showCityScreen();
        updateHUD();
        return;
      }
      // === Обычная загрузка ===
      if (save.currentZoneId && save.inBattle) {
        const zone = findZone(state.currentCity, save.currentZoneId);
        if (zone) {
          state.currentZone = zone;
          state.inBattle = true;
          state.mobs = [];
          state.projectiles = [];
          state.effects = [];
          state.spawnTimer = 0.5;
          state.hero.x = COLS / 2;
          state.hero.y = ROWS / 2;
          state.hero.dead = false;
          state.hero.hp = state.hero.maxHp;
          state.portal = spawnPortalInZone(zone);
          state.dungeon = null;
          state.aoeList = [];
          document.getElementById('zone-name').textContent = zone.name;
          document.getElementById('zone-diff').textContent = zone.diff === 'easy' ? '🟢' : zone.diff === 'medium' ? '🟡' : '🔴';
          hideCityScreen();
        } else {
          showCityScreen();
        }
      } else {
        showCityScreen();
      }

      updateHUD();
      toast(`👋 С возвращением!`, 'legendary');
    } catch (e) {
      console.error('onLoadProgress error:', e);
    }
  },
  onNewPlayer: (user) => {
    if (_progressLoaded) return;
    _progressLoaded = true;
    setOfflineUid(user?.id);
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('class-select').classList.remove('hidden');
  },
});

// Привязка кнопок офлайна
setTimeout(() => {
  const returnBtn = document.getElementById('offline-return');
  if (returnBtn) returnBtn.addEventListener('click', returnFromOffline);
  const minimizeBtn = document.getElementById('offline-minimize');
  if (minimizeBtn) minimizeBtn.addEventListener('click', () => {
    document.getElementById('offline-overlay').classList.add('hidden');
  });
  const closeBtn = document.getElementById('report-close');
  if (closeBtn) closeBtn.addEventListener('click', () => {
    document.getElementById('offline-report').classList.add('hidden');
  });
  setInterval(() => {
    if (state.hero?.offlineActive) updateOfflinePanel();
  }, 1000);
}, 200);

window.openOfflinePanel = openOfflinePanel;

requestAnimationFrame(loop);