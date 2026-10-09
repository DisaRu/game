import { CONFIG, GRADE_ORDER, BUFF_SCROLLS, BUFF_ORDER, BUFF_DROP_CHANCE, MOBS, POTIONS, SKILLS, SKILL_COLORS, STAT_RU, MAX_SKILL_LEVEL, SKILL_ORDER } from './config.js';
import { createMob, createGroupId, pickMobDefFromZone, updateMob, aggroGroup } from './mobs.js';
import { createBoss } from './bosses.js';
import { spawnPortalInZone, updatePortal, getPortalCooldown, createDungeon, spawnGuard } from './dungeon.js';
import { createHero, updateHero, addXp, damageHero, autoUsePotion, recalcStats, addToBackpack, mobDamageFor, bossDamageFor, bossAoeDamageFor, getChainTargets, calcHitChance, calcEffectiveDefense, gainManaOnKill, tryUseSkill, learnSkill, setSkillSlot, setSlotAction, parseSlotAction, syncSoulshotFromSlots, useBuffScroll } from './hero.js';
import { createAuction, tickAuction, collectSold } from './auction.js';
import { createShop, buildStock } from './shop.js';
import { CITIES, CITY_ORDER, findZone, cityTeleportCost } from './cities.js';
import { render } from './render.js';
import { initUI, refreshUI, toast, showCityScreen, hideCityScreen, openArena, updateSkillBar, renderSkillBar } from './ui.js';
import { gradeName, createItem, createBlessedScroll, createBuffScroll, createArenaPass, createSkillBook } from './items.js';
import { castBossAoe, checkAoeHit, checkFireHit, GUARD_CALL, BOSS_AOE, BOSSES } from './bosses.js';
import { createArena, ratingChange } from './arena.js';
import { createBots, tickBots, botToArenaHero } from './bots.js';
import { createTestBots, createTrainingDummy } from './test-bots.js';
import { initAudio, sfxShoot, sfxHit, sfxDeath, sfxHeroHit, sfxLevelUp, sfxHeroDie } from './audio.js';
import { initAuth, getAuthUser } from './auth-ui.js';
import { saveProgress, saveLocalBackup } from './save.js';
import { startOfflineFarm, getOfflineStatus, stopOffline, saveOfflineLocal, setOfflineUid, OFFLINE_MAX_HOURS } from './offline.js';
import { rollDrops, applyDrops } from './loot.js';
import { updateBattle } from './battle.js';// === ПРОГРЕВ SUPABASE ===

import { supabase } from './supabase.js';
// --- ISO helpers для кликов ---
const ISO_TW = 56, ISO_TH = 28;
function screenToWorld(clientX, clientY) {
  const cx = state.hero?.x ?? 0;
  const cy = state.hero?.y ?? 0;
  const fp = { sx: (cx - cy) * (ISO_TW / 2), sy: (cx + cy) * (ISO_TH / 2) };
  const camX = fp.sx - canvas.width / 2;
  const camY = fp.sy - canvas.height / 2;
  const dx = clientX + camX;
  const dy = clientY + camY;
  const wx = (dx / (ISO_TW / 2) + dy / (ISO_TH / 2)) / 2;
  const wy = (dy / (ISO_TH / 2) - dx / (ISO_TW / 2)) / 2;
  return { x: wx, y: wy };
}
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

let COLS = 50, ROWS = 50;

const layout = { COLS, ROWS, cellPx: 36, offsetX: 0, offsetY: 0 };

// Устанавливает эмодзи-иконку сложности зоны
function setZoneIcon(id, diff) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = diff === 'easy' ? '🟢'
    : diff === 'medium' ? '🟡'
    : diff === 'hard' ? '🔴'
    : '💀';
}
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

  autoBattle: true,

  arenaMode: false,
  target: null,
  arenaEnemy: null,
  arenaBot: null,
  arenaTime: 0,
  _heroOrigRange: null,

  portal: null,
  dungeon: null,
  aoeList: [],
  shadows: [],
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
  // Ограничиваем DPR — на мобиле рисуем в 1x вместо 3x.
  // Визуально почти не заметно, FPS вырастает в 2-3 раза.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  const ctx2 = canvas.getContext('2d');
  ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);

  layout.COLS = COLS; layout.ROWS = ROWS;
  layout.cellPx = CONFIG.map.cellPx;
  layout.offsetX = 0; layout.offsetY = 0;
  camera.w = window.innerWidth / layout.cellPx;
  camera.h = window.innerHeight / layout.cellPx;
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
  if (state.arenaMode) return;
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
   // Кнопка АВТО
   // Кнопка АВТО — клонируем узел, чтобы убить ВСЕ старые addEventListener,
  // которые могли накопиться от предыдущих bindHudActions.
  let autoBtn = document.getElementById('btn-auto');
  if (autoBtn && autoBtn.parentNode) {
    const fresh = autoBtn.cloneNode(true);
    autoBtn.parentNode.replaceChild(fresh, autoBtn);
    autoBtn = fresh;
    autoBtn.onclick = () => {
      state.autoBattle = !state.autoBattle;
      autoBtn.classList.toggle('on', state.autoBattle);
      autoBtn.textContent = state.autoBattle ? 'АВТО ✓' : 'АВТО';
      if (window.toast) window.toast(state.autoBattle ? '🤖 Авто включено' : '🤖 Авто выключено', 'legendary');
    };
  }

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
  arena.bots.push(...createTestBots());
  arena.bots.push(createTrainingDummy());
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
      setZoneIcon('zone-diff', zone.diff);
      hideCityScreen();
      updateHUD();
    }
    return;
  }
  if (!zone) return;
    // Сброс кэша фона — пересоберётся при первом кадре
  if (typeof window !== 'undefined') window._bgOffscreenKey = '';
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
    state.shadows = [];
  state.aliveTime = 0;

  document.getElementById('zone-name').textContent = zone.name;
  setZoneIcon('zone-diff', zone.diff);

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
  setZoneIcon('zone-diff', 'dead');
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
    setZoneIcon('zone-diff', state.currentZone.diff);
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
      if (typeof window !== 'undefined') window._bgOffscreenKey = '';
    toast(`Телепорт: ${CITIES[cityId].name}`, 'legendary');
  });
}

function updateHUD() {
  if (window._offlineSim) return;
  const h = state.hero; if (!h) return;

  // HP/MP полоски шапки удалены — теперь они в плашках #hud-plate-me / #hud-plate-target.
  // Обновляем плашку игрока и (если есть) плашку таргета.

  // ── Плашка игрока ─────────────────────────────
  const meHpFill = document.getElementById('as-me-hp-fill');
  const meHpText = document.getElementById('as-me-hp-text');
  const meMpFill = document.getElementById('as-me-mana-fill');
  const meMpText = document.getElementById('as-me-mana-text');
  if (meHpFill && h.maxHp > 0) {
    meHpFill.style.width = Math.max(0, Math.min(100, (h.hp / h.maxHp) * 100)) + '%';
  }
  if (meHpText) meHpText.textContent = `${Math.max(0, Math.ceil(h.hp))}/${h.maxHp}`;
  if (meMpFill && h.maxMana > 0) {
    meMpFill.style.width = Math.max(0, Math.min(100, (h.mana / h.maxMana) * 100)) + '%';
  }
  if (meMpText) meMpText.textContent = `${Math.floor(h.mana)}/${h.maxMana}`;

  // ── Плашка таргета ────────────────────────────
  const tgtPlate = document.getElementById('hud-plate-target');
  const target = state.target;
  if (tgtPlate && target && !target.dead && state.inBattle) {
    tgtPlate.classList.remove('hidden');
    const oHpFill = document.getElementById('as-opp-hp-fill');
    const oHpText = document.getElementById('as-opp-hp-text');
    const oMpFill = document.getElementById('as-opp-mana-fill');
    const oMpText = document.getElementById('as-opp-mana-text');
    if (oHpFill && target.maxHp > 0) {
      oHpFill.style.width = Math.max(0, Math.min(100, (target.hp / target.maxHp) * 100)) + '%';
    }
    if (oHpText) oHpText.textContent = `${Math.ceil(target.hp)}/${target.maxHp}`;
    if (oMpFill && target.maxMana > 0) {
      oMpFill.style.width = Math.max(0, Math.min(100, (target.mana / target.maxMana) * 100)) + '%';
    }
    if (oMpText) oMpText.textContent = target.maxMana > 0
      ? `${Math.floor(target.mana)}/${target.maxMana}`
      : '0/0';
  } else if (tgtPlate) {
    tgtPlate.classList.add('hidden');
  }
  // ── Баффы под плашками ─────────────────────────
  _renderPlateBuffs('as-me-buffs', h);
  _renderPlateBuffs('as-opp-buffs', state.target);
  // ── Золото / уровень / XP ─────────────────────
  const gEl = document.getElementById('gold');
  if (gEl) gEl.textContent = state.gold;
  const lEl = document.getElementById('level');
  if (lEl) lEl.textContent = h.level;
  const xEl = document.getElementById('xp-fill');
  if (xEl) xEl.style.width = Math.min(100, (h.xp / h.xpToNext) * 100) + '%';

  // ── Статы (строка под шапкой) ──────────────────
  const sAtk = document.getElementById('stat-atk');
  if (sAtk) {
    sAtk.textContent = Math.round(h.attack);
    const sDef = document.getElementById('stat-def');   if (sDef) sDef.textContent = Math.round(h.defense);
    const sRng = document.getElementById('stat-range'); if (sRng) sRng.textContent = h.range.toFixed(1);
    const sCrit = document.getElementById('stat-crit'); if (sCrit) sCrit.textContent = h.critChance.toFixed(0);
    const sDodge = document.getElementById('stat-dodge'); if (sDodge) sDodge.textContent = h.dodge.toFixed(0);
    const sLs = document.getElementById('stat-ls');     if (sLs) sLs.textContent = h.lifesteal.toFixed(0);
  }

  updateHudActions();
  updateSkillBar();
}

function updateHudActions() {
  const h = state.hero; if (!h) return;

  const offBtn = document.getElementById('hud-offline');
  if (offBtn) {
    // Кнопка видна ТОЛЬКО в бою (в зоне) и НЕ в городе
    const inZone = !!state.currentZone && state.inBattle;
    if (!inZone) {
      offBtn.style.display = 'none';
      offBtn.classList.remove('active', 'ready');
    } else {
      offBtn.style.display = '';
      if (h.offlineActive) {
        offBtn.classList.add('active');
        offBtn.classList.remove('ready');
      } else {
        offBtn.classList.remove('active');
        // Класс ready добавит пульсацию если игрок в бою > 30 сек
        if (state.aliveTime >= 30) offBtn.classList.add('ready');
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



// ===== СПАВН ПО ЛЕЙРАМ =====
// Каждый лейр (сектор карты) имеет свой лимит мобов.
// Мобы спавнятся внутри сектора — так их распределение осмысленное.

function countMobsByLair() {
  const counts = {};
  for (const m of state.mobs) {
    if (m.dead) continue;
    if (m.lairId) counts[m.lairId] = (counts[m.lairId] || 0) + 1;
  }
  return counts;
}

function pickRandomLair(lairs, counts) {
  // Взвешенный выбор: менее заполненные лейры приоритетнее.
  // Так все секторы заполняются равномерно, а не «жирный первый забьётся».
  const available = lairs.filter(l => (counts[l.id] || 0) < l.maxMobs);
  if (available.length === 0) return null;

  let totalW = 0;
  const ws = available.map(l => {
    const fill = (counts[l.id] || 0) / l.maxMobs;
    const w = Math.max(0.15, 1 - fill);
    totalW += w;
    return w;
  });
  let roll = Math.random() * totalW;
  for (let i = 0; i < available.length; i++) {
    roll -= ws[i];
    if (roll <= 0) return available[i];
  }
  return available[available.length - 1];
}

function trySpawnMob() {
  if (!state.currentZone) return;
  if (state.dungeon) return;

  const lairs = state.currentZone.lairs;
  if (!lairs || lairs.length === 0) return;

  // Глобальный кап по всей зоне (защита от раздувания)
  const totalCap = lairs.reduce((s, l) => s + l.maxMobs, 0);
  if (state.mobs.filter(m => !m.dead).length >= totalCap) return;

  const counts = countMobsByLair();
  const lair = pickRandomLair(lairs, counts);
  if (!lair) return;

  // Спавн внутри сектора
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * (lair.radius || 3);
  let x = (lair.cx || COLS / 2) + Math.cos(angle) * dist;
  let y = (lair.cy || ROWS / 2) + Math.sin(angle) * dist;
  x = Math.max(0.5, Math.min(COLS - 0.5, x));
  y = Math.max(0.5, Math.min(ROWS - 0.5, y));

  // Не спавним рядом с героем
  const minDist = lair.minSpawnDist ?? 1;
  if (Math.hypot(x - state.hero.x, y - state.hero.y) < minDist) return;

  // Моб из списка лейра
  const mobId = lair.mobs[Math.floor(Math.random() * lair.mobs.length)];
  const def = MOBS[mobId];
  if (!def) return;

  const mult = state.currentZone.mult;
  const isChampion = Math.random() < (lair.champChance || 0);
  const baseOpts = {
    aggroRange: lair.aggroRange ?? 5,
  wander: lair.wander ?? 1.5,
  champion: isChampion,
  kite: lair.kite ?? 0,  
  };

  const pushMob = (mob) => {
    mob.lairId = lair.id;
    mob.level = def.level || 1;
    // Leash — моб помнит свой сектор
    mob.homeX = lair.cx;
    mob.homeY = lair.cy;
    mob.homeRadius = (lair.radius || 3) + 2;
    mob.leashRange = (lair.radius || 3) + 10;
    mob.returning = false;
    mob.lairCx = lair.cx;   // для NaN-защиты
    mob.lairCy = lair.cy;
    state.mobs.push(mob);
  };
  // Группа?
  if (Math.random() < (lair.groupChance || 0)) {
    const count = 3 + Math.floor(Math.random() * 3);
    const groupId = createGroupId();
    for (let i = 0; i < count; i++) {
      if ((counts[lair.id] || 0) + i >= lair.maxMobs) break;
      const gx = Math.max(0.5, Math.min(COLS - 0.5, x + (Math.random() - 0.5) * 2.5));
      const gy = Math.max(0.5, Math.min(ROWS - 0.5, y + (Math.random() - 0.5) * 2.5));
      pushMob(createMob(def, gx, gy, mult, { ...baseOpts, groupId }));
    }
  } else {
    pushMob(createMob(def, x, y, mult, baseOpts));
  }

  // Обновляем счётчик для текущего лейра (для следующей попытки)
  counts[lair.id] = (counts[lair.id] || 0) + 1;

  // Скорость спавна зависит от самого "медленного" лейра
  const interval = lair.interval ?? 2.0;
  state.spawnTimer = interval * (0.7 + Math.random() * 0.6);
}
function spawnMobInLair(lair, zone, groupId) {
  // Защита: если cx/cy лаира не заданы — берём центр карты
  const cx = Number.isFinite(lair.cx) ? lair.cx : Math.floor((COLS || 50) / 2);
  const cy = Number.isFinite(lair.cy) ? lair.cy : Math.floor((ROWS || 50) / 2);
  const radius = Number.isFinite(lair.radius) ? lair.radius : 5;

  const ang = Math.random() * Math.PI * 2;
  const dist = Math.random() * radius;
  const x = Math.max(1, Math.min(COLS - 2, cx + Math.cos(ang) * dist));
  const y = Math.max(1, Math.min(ROWS - 2, cy + Math.sin(ang) * dist));

  const defId = lair.mobs[Math.floor(Math.random() * lair.mobs.length)];
  const def = MOBS[defId] || MOBS.gremlin;
  const isChamp = Math.random() < (lair.champChance || 0.05);

  const m = createMob(def, x, y, zone.mult, {
    aggroRange: 0,           // не агрится пока не ударят
    wander: 3,
    champion: isChamp,
    groupId,
  });
  // Просыпается через 2 сек после спавна — тогда начнёт агриться по дистанции
   m._aggroWakeAt = Date.now() + 2000;
  // ?? вместо || — 0 это валидное значение (пассивный лаир)!
  m._wakeAggroRange = (lair.aggroRange != null) ? lair.aggroRange : 7;
  // Используем ?? вместо || — 0 это валидное значение (пассивный лаир)!    m.lairId = lair.id;
  m.lairCx = lair.cx;
  m.lairCy = lair.cy;
  m.lairRadius = lair.radius;
  state.mobs.push(m);
}
// Спавнит одного моба-охранника вокруг босса.
// Использует пул mobs из BOSSES[id].guards.mobs (или из lair.mobs).
function spawnGuardForBoss(lair, zone, boss, mobPool) {
  const ang = Math.random() * Math.PI * 2;
  const dist = 2 + Math.random() * 3;
  const x = Math.max(1, Math.min(COLS - 2, boss.x + Math.cos(ang) * dist));
  const y = Math.max(1, Math.min(ROWS - 2, boss.y + Math.sin(ang) * dist));

  const pool = (mobPool && mobPool.length) ? mobPool : (lair.mobs || ['gremlin']);
  const defId = pool[Math.floor(Math.random() * pool.length)];
  const def = MOBS[defId] || MOBS.gremlin;

  // ── Охрана босса ВСЕГДА агрессивна ──
  // Даже если базовый моб пассивный (gremlin.aggroRange = 0),
  // охрана защищает босса и атакует игрока при подходе.
  const GUARD_AGGRO = 10;   // радиус агра охраны
  const m = createMob(def, x, y, zone.mult, {
    aggroRange: GUARD_AGGRO,   // ← не 0, а 10 клеток
    wander: 3,
    champion: false,
    groupId: null,
  });
  // Отключаем "пробуждение" — охрана активна сразу
  m._aggroWakeAt = 0;
  m.lairId = lair.id;
  m.lairCx = lair.cx;
  m.lairCy = lair.cy;
  m.lairRadius = lair.radius;
  m.dungeonGuard = true;
  state.mobs.push(m);
}
function heroDie() {
  const h = state.hero;
  const lost = Math.floor(h.xp * (CONFIG.death?.xpLossPercent ?? 0.10));
  sfxHeroDie();

  // Смерть снимает все положительные бафф-эффекты и ставит КД на свитки,
  // чтобы после респавна нельзя было сразу наложить их заново.
  const nowDeath = Date.now();
  const cdDeath = nowDeath + 5 * 60 * 1000;
  h.activeBuffs = {};
  if (!h.buffScrollCooldowns) h.buffScrollCooldowns = {};
  for (const type of ['attack','crit','speed','range']) {
    h.buffScrollCooldowns[type] = cdDeath;
  }
  recalcStats(h);
  updateHudActions && updateHudActions();

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

   if (state.arenaMode) {
    updateArena(dt);
  } else if (shouldTick) {
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
  // Скип рендера, если открыта модалка/попап/город — иначе тратится GPU зря
  const anyModal = document.querySelector('.modal:not(.hidden)');
  const anyPopup = document.querySelector('.popup:not(.hidden)');
  const cityOpen = document.getElementById('city-screen') && !document.getElementById('city-screen').classList.contains('hidden');
  if (!anyModal && !anyPopup && !cityOpen) {
    render(ctx, canvas, state, layout, camera);
  }
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
  // Страховка: HP ≤ 0 → смерть
  if (hero.hp <= 0 && !hero.dead) {
    hero.hp = 0;
    hero.dead = true;
    heroDie();
    return;
  }
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




// ===== СКИЛЛЫ: ПРИМЕНЕНИЕ ЭФФЕКТОВ =====
function findNearestMob(hero, maxRange) {
  const candidates = [];
  if (state.arenaMode) {
    if (hero.team === 'enemy') {
      if (state.hero && !state.hero.dead) candidates.push(state.hero);
    } else {
      if (state.arenaEnemy && !state.arenaEnemy.dead) candidates.push(state.arenaEnemy);
    }
  } else {
    for (const m of state.mobs) if (!m.dead) candidates.push(m);
  }
  let best = null, bestD = Infinity;
  for (const m of candidates) {
    const d = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (d <= maxRange && d < bestD) { best = m; bestD = d; }
  }
  return best;
}

function applySkillEffect(hero, result) {
  const fx = result.effect;
  if (!fx) return;
  const base = CONFIG.hero[hero.classType];
  const now = Date.now();

  switch (fx.type) {
    case 'multishot': {
      const target = findNearestMob(hero, hero.range + 3);
      if (!target) return;
      const count = fx.count || 3;
      const interval = fx.interval || 1.0;
      const baseAng = Math.atan2(target.y - hero.y, target.x - hero.x);
      const projColor = SKILL_COLORS[result.skillId] || '#fbbf24';
      const skillIcon = SKILLS[result.skillId]?.icon || '🏹';
      const skillName = (SKILLS[result.skillId]?.name || 'СКИЛЛ').toUpperCase();
      for (let i = 0; i < count; i++) {
        state.projectiles.push({
          x: hero.x, y: hero.y,
          vx: Math.cos(baseAng) * base.projectileSpeed,
          vy: Math.sin(baseAng) * base.projectileSpeed,
          damage: hero.attack * fx.value,
          aoe: fx.aoe || 0,
          color: projColor,
          weaponType: hero.weaponType,
          life: 3, trail: [],
          isCrit: false,
          isExecute: false,
          doubleStrike: false,
          isSkill: true,
          owner: hero,
          delay: i * interval,
          critBonus: fx.critBonus || 0,
          pierce: fx.pierce || 0,
          skillId: result.skillId,
        });
      }
      state.effects.push({ x: hero.x, y: hero.y - 1.4, life: 1.0, maxLife: 1.0, color: projColor, text: `${skillIcon} ${skillName} x${count}`, big: true });
      if (count >= 5 && target) {
        state.effects.push({ kind: 'arrow_rain_marker', x: target.x, y: target.y, life: 1.2, maxLife: 1.2, color: projColor, radius: fx.aoe || 2 });

        // ── Поле дождя: lingering DoT на все цели в радиусе aoe ──
        if (fx.dotDuration > 0 && fx.aoe > 0) {
          const dmgPerTick = Math.max(1, Math.floor(hero.attack * (fx.dotValue || 0.4)));
          const ticks = Math.max(1, Math.floor(fx.dotDuration));
          const aoeR = fx.aoe;
          // На арене враг один, в фарме — все мобы в радиусе
          const victims = state.arenaMode
            ? [state.arenaEnemy].filter(e => e && !e.dead && Math.hypot(e.x - target.x, e.y - target.y) <= aoeR + 1)
            : state.mobs.filter(m => !m.dead && Math.hypot(m.x - target.x, m.y - target.y) <= aoeR);
          const now = Date.now();
          for (const v of victims) {
            if (!v.dots) v.dots = [];
            v.dots.push({
              damage: dmgPerTick,
              ticksLeft: ticks,
              nextTick: now + 1000,
              tickInterval: 1,
              sourceName: hero.name,
              sourceTeam: hero.team || 'ally',
            });
          }
          // Визуал: зелёное кольцо дождя на время DoT
          state.effects.push({ kind: 'arrow_rain_marker', x: target.x, y: target.y, life: fx.dotDuration, maxLife: fx.dotDuration, color: projColor, radius: aoeR });
        }
      }
      break;
    }

    case 'damage': {
      const target = findNearestMob(hero, hero.range + 3);
      if (!target) return;
      const tx = target.x - hero.x, ty = target.y - hero.y;
      const dist = Math.hypot(tx, ty) || 1;
      const speed = base.projectileSpeed * (fx.slowProjectile ? 0.5 : 1);
      const projColor = SKILL_COLORS[result.skillId] || (fx.chain ? '#a855f7' : '#f97316');
      state.projectiles.push({
        x: hero.x, y: hero.y,
        vx: tx / dist * speed,
        vy: ty / dist * speed,
        damage: hero.attack * fx.value,
        aoe: fx.aoe || 0,
        color: projColor,
        weaponType: hero.weaponType,
        life: 4, trail: [],
        isCrit: false,
        isExecute: false,
        doubleStrike: false,
        isSkill: true,
        owner: hero,
        bigProjectile: !!fx.slowProjectile,
        critBonus: fx.critBonus || 0,
        pierce: fx.pierce || 0,
        executeBonus: fx.executeBonus || 0,
        chain: fx.chain || 0,
        chainDecay: fx.chainDecay || 0.7,
        onHitDebuff: fx.debuff || null,
        skillId: result.skillId,
      });
      const skillIcon = SKILLS[result.skillId]?.icon || '💥';
      const skillName = (SKILLS[result.skillId]?.name || 'ВЫСТРЕЛ').toUpperCase();
      state.effects.push({ x: hero.x, y: hero.y - 1.4, life: 1.0, maxLife: 1.0, color: projColor, text: `${skillIcon} ${skillName}`, big: true });
      if (fx.slowProjectile || fx.chain) {
        state.effects.push({ kind: 'flash', x: hero.x, y: hero.y, life: 0.4, maxLife: 0.4, color: projColor, radius: 1.4 });
      }
      break;
    }

    case 'dot': {
      const target = findNearestMob(hero, hero.range + 3);
      if (!target) return;
      const duration = fx.duration || 5;
      const tickInterval = fx.tickInterval || 1;
      const ticks = Math.max(1, Math.floor(duration / tickInterval));
      const dmgPerTick = Math.max(1, Math.floor(hero.attack * fx.value));
      if (!target.dots) target.dots = [];
      target.dots.push({
        damage: dmgPerTick,
        ticksLeft: ticks,
        nextTick: now + tickInterval * 1000,
        tickInterval,
        sourceName: hero.name,
        sourceTeam: hero.team || 'ally',
      });
      state.effects.push({ x: target.x, y: target.y - 1.2, life: 1.2, maxLife: 1.2, color: '#22c55e', text: '🧪 ЯД', big: true });
      break;
    }

    case 'heal': {
      const v = (typeof fx?.value === 'number' && fx.value > 0) ? fx.value : 0.20;
      const hpMax = hero.maxHp || 1;
      const heal = Math.floor(hpMax * v);
      const missing = Math.max(0, hpMax - hero.hp);
      const actual = Math.min(heal, missing);
      hero.hp = Math.min(hpMax, hero.hp + actual);
      const shown = Math.floor(actual);
      state.effects.push({ x: hero.x, y: hero.y - 1, life: 1.2, maxLife: 1.2, color: '#4ade80', text: '+' + shown, big: true });
      state.effects.push({ kind: 'heal_ring', x: hero.x, y: hero.y, life: 1.2, maxLife: 1.2, color: '#4ade80' });
      // Milestone 100: heal снимает 1 дебафф
      const lvl = hero.skills?.[result.skillId]?.level || 1;
      if (lvl >= 100) {
        if (hero.dots && hero.dots.length > 0) hero.dots.shift();
        else if (hero.slowUntil) hero.slowUntil = 0;
        else if (hero.silenceUntil) hero.silenceUntil = 0;
        state.effects.push({ x: hero.x, y: hero.y - 1.6, life: 1.0, maxLife: 1.0, color: '#fef3c7', text: '✨ −дебафф', big: false });
      }
      break;
    }

    case 'buff': {
      applyBuffByStat(hero, fx, now, result.skillId);
      break;
    }

    case 'debuff': {
      const range = fx.aoe ? hero.range + fx.aoe + 2 : hero.range + 4;
      if (fx.aoe) {
        // AoE-дебафф (frost_nova)
        let applied = 0;
        for (const m of state.mobs) {
          if (m.dead) continue;
          const d = Math.hypot(m.x - hero.x, m.y - hero.y);
          if (d > range) continue;
          applyDebuffOnTarget(m, fx, now);
          applied++;
        }
        state.effects.push({ kind: 'flash', x: hero.x, y: hero.y, life: 0.6, maxLife: 0.6, color: fx.color || '#67e8f9', radius: fx.aoe });
        state.effects.push({ kind: 'nova_wave', x: hero.x, y: hero.y, life: 0.7, maxLife: 0.7, color: fx.color || '#67e8f9', radius: fx.aoe });
        state.effects.push({ x: hero.x, y: hero.y - 1.8, life: 1.2, maxLife: 1.2, color: '#67e8f9', text: '🌨 НОВА x' + applied, big: true });
      } else {
        const target = findNearestMob(hero, range);
        if (!target) return;
        applyDebuffOnTarget(target, fx, now);
      }
      break;
    }

    case 'cleanse': {
      const removed = [];
      if (hero.stunUntil) { hero.stunUntil = 0; removed.push('стан'); }
      if (hero.slowUntil) { hero.slowUntil = 0; removed.push('замедл.'); }
      if (hero.silenceUntil) { hero.silenceUntil = 0; removed.push('немота'); }
      if (hero.dots && hero.dots.length) { hero.dots = []; removed.push('яд'); }
      if (hero.attackSpeedDebuff) { hero.attackSpeedDebuff = null; removed.push('зам.атк'); }
      state.effects.push({ kind: 'cleanse_ring', x: hero.x, y: hero.y, life: 0.8, maxLife: 0.8, color: '#fef3c7' });
      const label = removed.length ? `✨ −${removed.join(', ')}` : '✨ ОЧИЩЕН';
      state.effects.push({ x: hero.x, y: hero.y - 1.2, life: 1.4, maxLife: 1.4, color: '#fef3c7', text: label, big: true });
      break;
    }

    case 'summon': {
      const lvl = result.level || 1;
      const perLevels = fx.shadowPerLevels || 10;
      // Milestone 100: +1 призыв
      let count = 1 + Math.floor(lvl / perLevels);
      if (lvl >= 100) count += 1;
      const duration = fx.duration || 20;
      const damagePercent = fx.damagePercent || 15;

      if (!state.shadows) state.shadows = [];

      const enemyTeam = (hero.team === 'enemy') ? (state.hero ? [state.hero] : []) : state.mobs;
      const nearestEnemy = enemyTeam.find(e => e && !e.dead) || null;
      let dirX = 0, dirY = -1;
      if (nearestEnemy) {
        const dx = nearestEnemy.x - hero.x;
        const dy = nearestEnemy.y - hero.y;
        const d = Math.hypot(dx, dy) || 1;
        dirX = dx / d;
        dirY = dy / d;
      }

      const baseDist = 2.5;
      const isPanther = fx.petType === 'panther';
      const petEmoji = isPanther ? '🐆' : '👤';

      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(1, count)) * Math.PI * 2;
        const spread = 1.2;
        const ox = Math.cos(angle) * spread;
        const oy = Math.sin(angle) * spread;
        const shadowPct = (damagePercent || 15) / 100;
        state.shadows.push({
          x: hero.x + dirX * baseDist + ox,
          y: hero.y + dirY * baseDist + oy,
          ownerName: hero.name,
          ownerTeam: hero.team || 'ally',
          petType: fx.petType || 'shadow',

          attack: Math.max(1, Math.floor((hero.attack || 10) * shadowPct)),
          hp: Math.max(1, Math.floor((hero.maxHp || 100) * shadowPct * 1.5)),
          maxHp: Math.max(1, Math.floor((hero.maxHp || 100) * shadowPct * 1.5)),
          defense: Math.floor((hero.defense || 0) * shadowPct),
          attackSpeed: isPanther ? 1.2 : 1.5,
          critChance: (hero.critChance || 5) * 0.5,
          critDamage: (hero.critDamage || 50),
          accuracy: hero.accuracy || 0,
          armorPen: hero.armorPen || 0,
          lifesteal: 0,
          dodge: 0,
          range: isPanther ? 1.5 : Math.max(3, (hero.range || 4) * 0.8),
          moveSpeed: isPanther ? 0.55 : 0.4,
          damage: Math.max(1, Math.floor((hero.attack || 10) * shadowPct)),

          cooldown: 0,
          expiresAt: now + duration * 1000,
          emoji: petEmoji,
          name: isPanther ? 'Пантера' : 'Тень',
          size: 0.7,
        });
      }
      const icon = isPanther ? '🐆' : '👤';
      const label = isPanther ? 'ПАНТЕРА' : 'ТЕНЬ';
      state.effects.push({ x: hero.x, y: hero.y - 1.4, life: 1.5, maxLife: 1.5, color: '#a855f7', text: icon + ' ' + label + ' x' + count, big: true });
      break;
    }

    case 'shield': {
      const v = (typeof fx.value === 'number' && fx.value > 0) ? fx.value : 0.4;
      const duration = fx.duration || 8;
      hero.shield = {
        remaining: Math.floor(hero.maxHp * v),
        max: Math.floor(hero.maxHp * v),
        until: now + duration * 1000,
      };
      state.effects.push({ kind: 'shield_ring', x: hero.x, y: hero.y, life: duration, maxLife: duration, color: '#60a5fa', owner: hero });
      state.effects.push({ x: hero.x, y: hero.y - 1.6, life: 1.4, maxLife: 1.4, color: '#60a5fa', text: '🔮 ЩИТ ' + Math.floor(hero.maxHp * v), big: true });
      break;
    }
  }
}

// ── Применить бафф по stat ─────────────────────────────────
function applyBuffByStat(hero, fx, now, skillId) {
  const stat = fx.stat;
  const value = fx.value;

  // Emergency-скиллы требуют низкого HP
  if (fx.requireHpBelow !== undefined) {
    if (hero.hp / hero.maxHp > fx.requireHpBelow) return;
  }

  if (!hero.skillBuffs) hero.skillBuffs = {};
  const until = now + (fx.duration || 5) * 1000;

  // Скилловые баффы храним в skillBuffs
  if (stat === 'dodge') {
    hero.skillBuffs.dodge = { value, until };
  } else if (stat === 'attackSpeed') {
    hero.skillBuffs.attackSpeed = { value, until };
  } else if (stat === 'defense') {
    hero.skillBuffs.defense = { value, until };
  } else if (stat === 'attack') {
    hero.skillBuffs.attack = { value, until };
  } else if (stat === 'critChance') {
    hero.skillBuffs.critChance = { value, until };
  } else if (stat === 'lifesteal') {
    hero.skillBuffs.lifesteal = { value, until };
  } else if (stat === 'reflect') {
    hero.skillBuffs.reflect = { value, until };
  } else if (stat === 'range') {
    hero.skillBuffs.range = { value, until };
  }

  // Пересчёт статов (если есть функция)
  if (typeof recalcStats === 'function') recalcStats(hero);

  // Визуал
  const icon = SKILLS[skillId]?.icon || '✨';
  const colorMap = {
    dodge: '#80d4e0', attackSpeed: '#fde047', defense: '#60a5fa',
    attack: '#ef4444', critChance: '#f97316', lifesteal: '#e07878',
    reflect: '#c084fc', range: '#a3e635',
  };
  const color = colorMap[stat] || '#fbbf24';
  const ruName = STAT_RU[stat] || 'Эффект';
  state.effects.push({ x: hero.x, y: hero.y - 1, life: 1.2, maxLife: 1.2, color, text: `${icon} ${ruName}`, big: true });

  // Уникальная аура под тип баффа
  const auraKind = ({
    lifesteal:   'aura_vampiric',
    reflect:     'aura_reflect',
    defense:     'aura_stone',
    attackSpeed: 'aura_haste',
    attack:      'aura_rage',
  })[stat] || 'spin';

  state.effects.push({ kind: auraKind, x: hero.x, y: hero.y, life: (fx.duration || 5), maxLife: (fx.duration || 5), color, owner: hero });
}

// ── Применить дебафф на цель ──────────────────────────────
function applyDebuffOnTarget(target, fx, now) {
  if (fx.stat === 'stun') {
    if (Math.random() < (fx.chance || 1)) {
      target.stunUntil = now + fx.duration * 1000;
      state.effects.push({ x: target.x, y: target.y - 1.2, life: 1.2, maxLife: 1.2, color: '#fbbf24', text: '💫 STUN', big: true });
      state.effects.push({ kind: 'stun_ring', x: target.x, y: target.y, life: fx.duration, maxLife: fx.duration, color: '#fbbf24', owner: target });
    } else {
      state.effects.push({ x: target.x, y: target.y - 1.2, life: 0.9, maxLife: 0.9, color: '#94a3b8', text: 'MISS', big: false });
    }
  } else if (fx.stat === 'attackSpeed') {
    const mult = Math.max(0.1, 1 + (fx.value / 100));
    target.attackSpeedDebuff = { mult, until: now + fx.duration * 1000 };
    state.effects.push({ x: target.x, y: target.y - 1.2, life: 1.2, maxLife: 1.2, color: '#67e8f9', text: '❄️ ЗАМЕДЛЕНИЕ', big: true });
    state.effects.push({ kind: 'frost_ring', x: target.x, y: target.y, life: fx.duration, maxLife: fx.duration, color: '#67e8f9', owner: target });
  } else if (fx.stat === 'silence') {
    target.silenceUntil = now + fx.duration * 1000;
    if (target.casting) target.casting = null;
    state.effects.push({ x: target.x, y: target.y - 1.2, life: 1.2, maxLife: 1.2, color: '#3b82f6', text: '🤐 НЕМОТА', big: true });
    state.effects.push({ kind: 'silence_ring', x: target.x, y: target.y, life: fx.duration, maxLife: fx.duration, color: '#3b82f6', owner: target });
  }
}
function useActionFromSlot(slotIndex) {
  const hero = state.hero;
  if (!hero || hero.dead) return;
  const slotStr = hero.skillSlots?.[slotIndex];
  if (!slotStr) return;
  const parsed = parseSlotAction(slotStr);
  if (!parsed) return;

  // ── Скилл ────────────────────────────────────────
  if (parsed.kind === 'skill') {
    const r = tryUseSkill(hero, parsed.id);
    if (!r.ok) return;
    applySkillEffect(hero, r);
    updateSkillBar();
    return;
  }

  // ── Зелье: toggle активного зелья ────────────────
  if (parsed.kind === 'potion') {
    const count = hero.potions[parsed.id] || 0;
    if (count <= 0) { toast('Нет зелий', 'epic'); return; }

    // Если HP не полный и зелье не на КД — выпить прямо сейчас
    if (hero.hp < hero.maxHp && (hero.potionCooldown || 0) <= 0) {
      const p = POTIONS[parsed.id];
      if (p) {
        hero.potions[parsed.id]--;
        const healed = Math.min(p.heal, hero.maxHp - hero.hp);
        hero.hp = Math.min(hero.maxHp, hero.hp + healed);
        hero.potionCooldown = 3;
        toast(`🧪 +${Math.floor(healed)} HP`, 'rare');
      }
    }

    // И включаем авто-режим (пока зелья есть)
    if ((hero.potions[parsed.id] || 0) > 0) {
      hero.activePotion = parsed.id;
    }
    updateSkillBar();
    updateHUD();
    return;
  }

  // ── Соски: всегда авто, если в слоте ─────────────
  if (parsed.kind === 'soulshot') {
    if ((hero.soulshots[parsed.id] || 0) <= 0) {
      toast('Нет сосок', 'epic');
      return;
    }
    // Ничего не делаем — соски всегда активны, если в слоте.
    // Состояние выставляет syncSoulshotFromSlots.
    updateSkillBar();
    return;
  }

  // ── Бафф-свиток ──────────────────────────────────
  if (parsed.kind === 'buff') {
    const r = useBuffScroll(hero, parsed.id);
    if (!r.ok) {
      if (r.reason === 'already_active') toast('Эффект уже активен', 'epic');
      else if (r.reason === 'cooldown')   toast('КД свитка: ' + Math.ceil(r.remain / 1000) + 'с', 'epic');
      else if (r.reason === 'no_scroll')  toast('Нет свитка', 'epic');
      return;
    }
    const def = BUFF_SCROLLS[parsed.id];
    if (def) toast(`${def.icon} ${def.name} активирован`, 'legendary');
    updateSkillBar();
    return;
  }
}
// ===== АРЕНА =====

function enterArena(bot) {
  const hero = state.hero;
  if (!hero || !bot) return;

  // Пропуск
  const passIdx = hero.backpack.findIndex(x => x.kind === 'pass');
  if (passIdx < 0) { toast('Нет пропуска на арену!', 'epic'); return; }
  const pass = hero.backpack[passIdx];
  if ((pass.count || 1) > 1) pass.count--;
  else hero.backpack.splice(passIdx, 1);

  // Создать врага
  state.arenaBot = bot;
  state.arenaEnemy = botToArenaHero(bot);

    // Позиции: оба чуть выше, чтобы не лезли под HUD на мобиле
  hero.x = COLS / 2;
  hero.y = 28;
  hero.facing = -1;
  state.arenaEnemy.x = COLS / 2;
  state.arenaEnemy.y = 14;
  state.arenaEnemy.facing = 1;

  // HP/мана фулл, кулдауны сброшены
  hero.hp = hero.maxHp;
  hero.mana = hero.maxMana;
  hero.dead = false;
  hero.cooldown = 0;
  hero.skillCooldowns = {};

  // Range — на арене всё попадает, без движения
  state._heroOrigRange = hero.range;
  hero.range = 999;
  state.arenaEnemy.range = 999;

  // Флаги
    hero.range = 999;
  state.arenaEnemy.range = 999;
  state.arenaMode = true;
  state.inBattle = true;
  state.mobs = [];
  state._arenaLog = [];
  state.arenaRageApplied = false;
  hero._rageBaseAttack = 0;
  hero._rageBaseSpeed = 0;
  state.projectiles = [];
  state.effects = [];
  state.portal = null;
  state.dungeon = null;
  state.aoeList = [];

  // UI — плашка арены
  hideCityScreen();
  if (typeof window.showArenaHud === 'function') {
    try { window.showArenaHud(bot.name, bot.rating); } catch (e) { console.error('showArenaHud error:', e); }
  }

  // Страховка — принудительно показываем боковые панели
  const _me = document.getElementById('arena-side-me');
  const _opp = document.getElementById('arena-side-opp');
  const _ah = document.getElementById('arena-hud');
  if (_me) { _me.classList.remove('hidden'); _me.style.display = 'flex'; }
  if (_opp) { _opp.classList.remove('hidden'); _opp.style.display = 'flex'; }
  if (_ah) { _ah.classList.remove('hidden'); _ah.style.display = ''; }
  document.body.classList.add('arena-active');
  if (typeof window !== 'undefined') window._bgOffscreenKey = '';
  updateHUD();
  renderSkillBar();

  console.log('[enterArena] after show:', document.getElementById('arena-side-me')?.className);
}

function updateArena(dt) {
  const hero = state.hero;
  const enemy = state.arenaEnemy;
  if (!hero || !enemy) { endArena(); return; }
    // На арене range не учитываем — бьют через всю карту
  hero.range = 999;
  enemy.range = 999;

  // Таргет = противник (для баффов под плашкой)
  state.target = enemy && !enemy.dead ? enemy : null;
  if (hero && !hero.dead) hero.range = 999;
  if (enemy && !enemy.dead) enemy.range = 999;
  // ===== ЕДИНОЕ ЯДРО: два героя, без движения =====
  const logArena = (ev) => {
    if (state._arenaLog) {
      const clean = { ...ev, t: Math.round((state.arenaElapsed || 0) * 10) / 10 };
      if (typeof clean.damage === 'number') clean.damage = Math.round(clean.damage);
      if (typeof clean.heal === 'number') clean.heal = Math.round(clean.heal);
      state._arenaLog.push(clean);
    }
  };
  if (!state.shadows) state.shadows = [];

  updateBattle(dt, {
    heroes: [hero],
    enemies: [enemy],
    shadows: state.shadows,
    projectiles: state.projectiles,
    effects: state.effects,
    aoeList: [],
    bounds: { cols: COLS, rows: ROWS },
    moveInput: { left: false, right: false, up: false, down: false },
    currentZone: null,
    autoBattle: state.autoBattle,
    allowMovement: false,
    addEffect,
    applySkillEffect,
    noteOfflineEvent: () => {},
    toast: () => {},
    logArena,
  });

  // Клампим HP и флажок death (battle.js не ставит dead)
  if (hero.hp <= 0 && !hero.dead) { hero.hp = 0; hero.dead = true; }
  if (enemy.hp <= 0 && !enemy.dead) { enemy.hp = 0; enemy.dead = true; }

  // Тик эффектов
  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }
  // Таргет на арене = противник (для отрисовки баффов под плашкой)
  if (enemy && !enemy.dead) state.target = enemy;
  else state.target = null;
  // Камера — фиксируем на середину арены
  camera.x = Math.max(0, Math.min(COLS - camera.w, COLS / 2 - camera.w / 2));
  camera.y = Math.max(0, Math.min(ROWS - camera.h, ROWS / 2 - camera.h / 2));
  // Таргет на арене = противник
  if (enemy && !enemy.dead) state.target = enemy;
  else state.target = null;

    // Таргет на арене = противник
  if (enemy && !enemy.dead) state.target = enemy;
  else state.target = null;
  updateHUD();
  if (typeof window.updateArenaHud === 'function') window.updateArenaHud();

  // ===== ЯРОСТЬ БОЯ (через 2 минуты) =====
  if (!state.arenaRageApplied && state.arenaElapsed >= 120) {
    state.arenaRageApplied = true;
    hero._rageBaseAttack = hero._rageBaseAttack || hero.attack;
    hero._rageBaseSpeed = hero._rageBaseSpeed || hero.attackSpeed;
    enemy._rageBaseAttack = enemy._rageBaseAttack || enemy.attack;
    enemy._rageBaseSpeed = enemy._rageBaseSpeed || enemy.attackSpeed;
    hero.attack = hero._rageBaseAttack * 2;
    hero.attackSpeed = hero._rageBaseSpeed * 2;
    enemy.attack = enemy._rageBaseAttack * 2;
    enemy.attackSpeed = enemy._rageBaseSpeed * 2;
    toast('⚡ ЯРОСТЬ БОЯ! Урон и скорость ×2', 'legendary');
    if (typeof window.updateArenaHud === 'function') window.updateArenaHud();
  }

  // Проверка конца — только смерть
  if (hero.dead || enemy.dead) {
    endArena();
  }
}
// Принудительно завершаем бой (враг «умирает» — победа игрока не считается)
function exitArena() {
  const hero = state.hero;
  const enemy = state.arenaEnemy;
  if (!hero || !enemy || !state.arenaMode) return;

  hero.dead = false;
  enemy.dead = true;
  endArena();
}

function endArena() {
  const hero = state.hero;
  const enemy = state.arenaEnemy;
  const bot = state.arenaBot;
  if (!hero || !enemy || !bot) {
    state.arenaMode = false;
    return;
  }

  // Результат — только по смерти
  let result;
  if (enemy.dead && !hero.dead) result = 'win';
  else if (hero.dead && !enemy.dead) result = 'loss';
  else result = 'draw';

  const won = result === 'win';
  const oldRating = hero.arena.rating;
  const isDummy = !!bot.isTrainingDummy;
  const change = isDummy ? 0 : ratingChange(oldRating, bot.rating, won);
  if (!isDummy) {
    hero.arena.rating = Math.max(0, oldRating + change);
  }
  if (won) hero.arena.wins++;
  else if (result === 'loss') hero.arena.losses++;

  hero.arena.history.unshift({
    botName: bot.name,
    botRating: bot.rating,
    result,
    change,
    timestamp: Date.now(),
  });
  if (hero.arena.history.length > 20) hero.arena.history.pop();

  // Вернуть range
  if (state._heroOrigRange != null) {
    hero.range = state._heroOrigRange;
    recalcStats(hero);
    state._heroOrigRange = null;
  }

  // Флаги
  state.arenaMode = false;
  state.arenaEnemy = null;
  state.arenaBot = null;
  state.target = null;
  state.projectiles = [];
  state.effects = [];
  state.shadows = [];
  state.inBattle = false;

  // UI
  // UI
  if (typeof window.hideArenaHud === 'function') window.hideArenaHud();
  // Страховка на случай сбоя
  const _hideIds = ['arena-hud', 'arena-side-me', 'arena-side-opp', 'arena-mobile-hud'];
  for (const id of _hideIds) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  document.body.classList.remove('arena-active');
  const resultData = {
    won, result,
    oldRating,
    newRating: hero.arena.rating,
    ratingChange: change,
    botName: bot.name,
    botRating: bot.rating,
    log: state._arenaLog || [],
    duration: state.arenaElapsed || 0,
    myHpLeft: Math.max(0, Math.floor(hero.hp)),
    myMaxHp: hero.maxHp,
    oppHpLeft: Math.max(0, Math.floor(enemy.hp)),
    oppMaxHp: enemy.maxHp,
  };
  state.lastArenaResult = resultData;
  state._arenaLog = [];

  // Показать результат и вернуть в город
  if (typeof window.onArenaEnd === 'function') {
    window.onArenaEnd(resultData);
  } else {
    toast(won ? '🏆 Победа!' : (result === 'draw' ? '🤝 Ничья' : '💀 Поражение'), 'legendary');
    showCityScreen();
    updateHUD();
  }

  setTimeout(() => saveProgress(state), 300);
}

function update(dt) {
  const hero = state.hero;
  if (!hero) return;
  if (!state.currentZone) return;
    // Страховка: если HP ушёл в минус, но герой не помечен мёртвым — убиваем
  if (hero.hp <= 0 && !hero.dead) {
    hero.hp = 0;
    hero.dead = true;
    heroDie();
    return;
  }
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

  // ===== Аукцион =====
  tickAuction(auction, dt);
  const sold = collectSold(auction, state);
  if (sold > 0) toast(`Продано с аукциона: +${sold}💰`, 'legendary');

  // ===== Портал =====
  if (state.portal && !state.dungeon) {
    updatePortal(state.portal, dt, !!state.dungeon);
  }

  // ===== Спавн мобов =====
if (!state.dungeon && state.currentZone) {
  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    trySpawnMob();          // сам выставит новый spawnTimer
    if (state.spawnTimer <= 0) state.spawnTimer = 1.5; // страховка
  }
}

  // ===== Ввод движения =====
  const moveInput = {
    left: input.left || input.joyX < -0.2,
    right: input.right || input.joyX > 0.2,
    up: input.up || input.joyY < -0.2,
    down: input.down || input.joyY > 0.2,
  };

  // ===== ЕДИНОЕ ЯДРО БОЯ =====
  if (!state.shadows) state.shadows = [];
  const { killed, heroDied } = updateBattle(dt, {
    heroes: [hero],
    enemies: state.mobs,
    shadows: state.shadows,
    projectiles: state.projectiles,
    effects: state.effects,
    aoeList: state.aoeList,
    bounds: { cols: COLS, rows: ROWS },
    moveInput,
    currentZone: state.currentZone,
    autoBattle: state.autoBattle,
    allowMovement: true,
    addEffect,
    applySkillEffect,
    noteOfflineEvent: noteOfflineCombatEvent,
    toast,
    spawnBossGuard: spawnGuard,
  });

  // ===== Обработка убийств (xp, дроп, level up) =====
  const prevLevel = hero.level;
const _lootCtx = {
  cityGrade: CITIES[state.currentCity].grade,
  heroWeaponType: hero.weaponType,
  heroWeaponGrade: hero.equipment?.weapon?.grade || null,
  heroLevel: hero.level,
  mobLevel: 1,
};

for (const m of killed) {
  // XP-штраф за оверлевел
const _diff = hero.level - (m.level || 1);
let _xpMult;
if (_diff <= 3)       _xpMult = 1.00;
else if (_diff <= 5)  _xpMult = 0.75;
else if (_diff <= 8)  _xpMult = 0.50;
else if (_diff <= 11) _xpMult = 0.25;
else if (_diff <= 15) _xpMult = 0.05;
else                  _xpMult = 0.01;
const _xpGain = Math.max(1, Math.floor(m.xp * _xpMult));
addXp(hero, _xpGain);
    gainManaOnKill(hero);
    state.sessionStats.xp += m.xp;
    state.sessionStats.kills++;
    if (hero.offlineActive && hero.offlineCounters) {
      hero.offlineCounters.xp += m.xp;
      hero.offlineCounters.kills++;
    }

    // ===== ДРОП =====
    let entries = [];
    if (m.boss && state.dungeon) {
      const bossDef = BOSSES[m.defId || state.dungeon.cityGrade];
      entries = bossDef?.drops || [];
    } else {
      const mobDef = MOBS[m.id];
      if (mobDef) {
        if (m.champion && Array.isArray(mobDef.championDrops) && mobDef.championDrops.length > 0) {
          entries = mobDef.championDrops;
        } else {
          entries = mobDef.drops || [];
        }
      }
    }

    const drops = rollDrops(entries, { ..._lootCtx, mobLevel: m.level || 1 });
    const summary = applyDrops(drops, hero, state);

    state.sessionStats.gold += summary.gold;
    state.sessionStats.items += summary.items;
    state.sessionStats.scrolls += summary.scrolls;
    state.sessionStats.blessed += summary.blessed;

    if (hero.offlineActive && hero.offlineCounters) {
      hero.offlineCounters.gold += summary.gold;
      hero.offlineCounters.items += summary.items;
      hero.offlineCounters.scrolls += summary.scrolls;
      if (summary.items > 0) noteOfflineCombatEvent('drop', { grade: '?' });
    }

    if (summary.gold > 0 && m.boss) toast(`💰 +${summary.gold} золота с босса`, 'legendary');
    if (summary.blessed > 0) toast(`✨ Blessed Scroll ×${summary.blessed}`, 'unique');
    if (summary.books > 0) toast(`📖 Книжка скилла!`, 'legendary');

    // Удаляем мёртвого из общего массива
    const idx = state.mobs.indexOf(m);
    if (idx >= 0) state.mobs.splice(idx, 1);

    // Босс — завершение данжа
    if (m.boss && state.dungeon) {
      setTimeout(() => { if (state.dungeon) exitDungeon(true); }, 1500);
    }
  }

  if (hero.level > prevLevel) {
    sfxLevelUp();
    if (!window._offlineSim) log(`⭐ Уровень ${hero.level}!`, '#a78bfa');
    updateHUD();
  }

  // ===== Смерть героя =====
  if (heroDied) {
    heroDie();
    return;
  }

  // ===== Тик эффектов =====
  for (let i = state.effects.length - 1; i >= 0; i--) {
    state.effects[i].life -= dt;
    if (state.effects[i].life <= 0) state.effects.splice(i, 1);
  }

  // ── Определяем текущий таргет ─────────────────
  // На арене таргет = arenaEnemy (ставится в updateArena).
  // В фарме = ближайший агрессивный моб в радиусе 12 клеток.
  if (!state.arenaMode) {
    let best = null, bestDist = Infinity;
    for (const m of state.mobs) {
      if (m.dead) continue;
      if (!m.aggro) continue;
      const d = Math.hypot(m.x - hero.x, m.y - hero.y);
      if (d < 12 && d < bestDist) { best = m; bestDist = d; }
    }
    state.target = best;
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
  if (code === 'books') {
    const all = [
      // Общие
      'heal','cleanse','dodge','haste','iron_skin','reflect','vampiric','berserk','focus','last_stand',
      // Лучник
      'multishot','power_shot','double_shot','precise_shot','lethal_shot','stun_shot','slow_arrow','poison_arrow','arrow_rain','hawk_eye','panther',
      // Маг
      'fireball','ice_bolt','lightning','chain_lightning','meteor','frost_nova','silence','sleep','arcane_shield','shadow',
    ];
    for (const id of all) {
      addToBackpack(hero, createSkillBook(id, 5));
    }
    toast('📖 Все 31 книжка ×5', 'unique');
    return;
  }
  if (code === 'learnall') {
    const all = [
      'heal','cleanse','dodge','haste','iron_skin','reflect','vampiric','berserk','focus','last_stand',
      'multishot','power_shot','double_shot','precise_shot','lethal_shot','stun_shot','slow_arrow','poison_arrow','arrow_rain','hawk_eye','panther',
      'fireball','ice_bolt','lightning','chain_lightning','meteor','frost_nova','silence','sleep','arcane_shield','shadow',
    ];
    for (const id of all) {
      for (let i = 0; i < 5; i++) learnSkill(hero, id);
    }
    hero.skillSlots = [
      'skill:multishot', 'skill:power_shot', 'skill:double_shot',
      'skill:stun_shot', 'skill:heal', 'skill:dodge', 'skill:haste', 'skill:slow_arrow',
    ];
    renderSkillBar();
    toast('📖 Изучены все 31 скилл', 'unique');
    return;
  }
  if (code === 'slot') {
    // Быстрая смена слотов для теста
    // slot multishot,fireball,heal
    const m = code.match(/^slot\s+(.+)$/i);
    if (m) {
      const ids = m[1].split(',').map(s => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        hero.skillSlots = [null, null, null, null, null];
        for (let i = 0; i < Math.min(5, ids.length); i++) {
          if (hero.skills[ids[i]]) hero.skillSlots[i] = ids[i];
        }
        renderSkillBar();
        toast('🎯 Слоты: ' + hero.skillSlots.filter(Boolean).join(', '), 'unique');
      }
      return;
    }
  }
  if (code === 'gold') { state.gold += 1000000; updateHUD(); toast('💰 +1 000 000 золота', 'unique'); return; } 
   if (code === 'arena') { state.hero.arena.rating = 1500; toast('🏟️ Рейтинг = 1500', 'unique'); return; }
  if (code === 'full') { applyDevCode('s20'); return; }

  // ===== skill10 / skill20 / ... / skill100 =====
  // Учит ВСЕ скиллы (общие + лучник + маг) и ставит им уровень N.
  // N = 1..100, ограничивается MAX_SKILL_LEVEL.
  const skillMatch = code.match(/^skill(\d+)$/);
  if (skillMatch) {
    const lvl = Math.max(1, Math.min(MAX_SKILL_LEVEL, parseInt(skillMatch[1], 10)));
    if (!hero.skills) hero.skills = {};

    let learned = 0;
    let updated = 0;
    for (const id of SKILL_ORDER) {
      const def = SKILLS[id];
      if (!def) continue;
      const had = !!hero.skills[id];
      hero.skills[id] = { level: lvl };
      if (had) updated++;
      else learned++;
    }

    // Автослот: если у героя пустые слоты — поставим 3 классовых DD + heal/dodge
    const isMage = hero.classType === 'mage';
    const defaults = isMage
      ? ['fireball', 'ice_bolt', 'lightning', 'heal', 'dodge']
      : ['multishot', 'power_shot', 'lethal_shot', 'heal', 'dodge'];
    if (!hero.skillSlots || hero.skillSlots.length === 0) {
      hero.skillSlots = [null, null, null, null, null, null, null, null];
    }
    // Заполняем только если слоты пусты
    for (let i = 0; i < defaults.length; i++) {
      if (!hero.skillSlots[i]) hero.skillSlots[i] = 'skill:' + defaults[i];
    }

    recalcStats(hero);
    renderSkillBar();
    updateHUD();
    refreshUI();
    toast(`📖 Скиллы Lv.${lvl}: +${learned} новых, ${updated} обновлено`, 'unique');
    return;
  }

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
  makeItem: (grade, slot, wt, variant, source) => createItem(grade, slot, wt, variant, source || 'shop'),   onSkillClick: (slot) => useActionFromSlot(slot),
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
      state.shadows = [];

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
      setZoneIcon('zone-diff', state.currentZone.diff);
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
      if (!arena.bots.some(b => b.isTest)) {
        arena.bots.push(...createTestBots());
      }
      if (!arena.bots.some(b => b.id === 'training_dummy')) {
        arena.bots.push(createTrainingDummy());
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

          // Сброс таймеров лаиров + предзаполнение
          if (offZone.lairs) {
            for (const lair of offZone.lairs) {
              lair._lastSpawn = 0;
              if (lair.bosses) {
                for (const bossCfg of lair.bosses) {
                  if (bossCfg.id) lair['_respawnAt_' + bossCfg.id] = 0;
                }
              }
            }
            for (const lair of offZone.lairs) {
              if (lair.bosses && lair.bosses.length > 0) continue;
              if (!lair.mobs || lair.mobs.length === 0) continue;
              if (!lair.maxMobs || lair.maxMobs <= 0) continue;
              const prefill = Math.floor(lair.maxMobs * 0.6);
              for (let i = 0; i < prefill; i++) {
                spawnMobInLair(lair, offZone);
              }
            }
          }

          state.hero.x = COLS / 2;
          state.hero.y = ROWS / 2;
          if (!state.hero.dead) state.portal = spawnPortalInZone(offZone);
          state.dungeon = null;
          state.aoeList = [];
          document.getElementById('zone-name').textContent = offZone.name;
          setZoneIcon('zone-diff', offZone.diff);
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
          setZoneIcon('zone-diff', zone.diff);
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
// Рендер баффов/дебаффов под плашкой HP/MP
function _renderPlateBuffs(containerId, unit) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = '';
  if (!unit || unit.dead) return;

  const now = Date.now();
  const items = [];

  // Скилловые баффы (dodge)
  if (unit.skillBuffs?.dodge && unit.skillBuffs.dodge.until > now) {
    items.push({ icon: '💨', time: Math.ceil((unit.skillBuffs.dodge.until - now) / 1000), color: '#80d4e0' });
  }

  // Свитки (attack/crit/speed/range)
  const sc = (typeof BUFF_SCROLLS !== 'undefined') ? BUFF_SCROLLS : {};
  for (const type of ['attack','crit','speed','range']) {
    const until = unit.activeBuffs?.[type];
    if (until && until > now) {
      const def = sc[type];
      if (def) items.push({ icon: def.icon, time: Math.ceil((until - now) / 1000), color: def.color });
    }
  }

  // Дебаффы
  if (unit.stunUntil && unit.stunUntil > now) {
    items.push({ icon: '💫', time: Math.ceil((unit.stunUntil - now) / 1000), color: '#fbbf24', debuff: true });
  }
  if (unit.slowUntil && unit.slowUntil > now) {
    items.push({ icon: '❄️', time: Math.ceil((unit.slowUntil - now) / 1000), color: '#67e8f9', debuff: true });
  }
  if (unit.silenceUntil && unit.silenceUntil > now) {
    items.push({ icon: '🤐', time: Math.ceil((unit.silenceUntil - now) / 1000), color: '#3b82f6', debuff: true });
  }
  if (unit.attackSpeedDebuff && unit.attackSpeedDebuff.until > now) {
    items.push({ icon: '🐢', time: Math.ceil((unit.attackSpeedDebuff.until - now) / 1000), color: '#67e8f9', debuff: true });
  }
  // DoT (яд)
  if (unit.dots && unit.dots.length > 0) {
    items.push({ icon: '🩸', time: '', color: '#22c55e', debuff: true });
  }

  for (const it of items) {
    const el = document.createElement('div');
    el.className = 'as-buff' + (it.time && it.time <= 2 ? ' expiring' : '');
    if (it.color) el.style.borderColor = it.color;
    el.innerHTML = `${it.icon}${it.time ? `<span class="as-buff-time">${it.time}</span>` : ''}`;
    box.appendChild(el);
  }
}
  
window.openOfflinePanel = openOfflinePanel;
window.enterArena = enterArena;
requestAnimationFrame(loop);

window.exitArena = exitArena;
window.arena = arena;
window.state = state;
window.__heroApi = { setSkillSlot, learnSkill };
