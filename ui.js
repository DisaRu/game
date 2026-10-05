import { SLOTS, SLOT_NAMES, STAT_NAMES, STAT_SUFFIX, POTION_ORDER, POTIONS, GRADE_ORDER, GRADES, MAX_ENHANCE, ENHANCE_CHANCE, willBreakAt, getEnhanceBonus, ENHANCE_BONUSES, BUFF_SCROLLS, RATING_CHESTS } from './config.js';
import { itemStats, estimateItemValue, gradeName, gradeShort, gradeColor, getVariantsForSlot, durabilityMultiplier, createItem } from './items.js';
import { equipItem, unequipItem, canEquip, tryEnhance, getShadowStats, getShadowRepairCost, getAllShadowRepairCost, repairShadowItem, repairAllShadow, equipShadowItem, unequipShadowItem } from './hero.js';
import { buyListing, listItem, sellToBot } from './auction.js';
import { buyEquipment, buyScroll, buyPotion, buySoulshot } from './shop.js';
import { CITIES, CITY_ORDER, cityTeleportCost, zoneDifficultyLabel } from './cities.js';
import { getAvailableChests, claimChest, rollCardRewards, estimateWinChance, fightBot, expectedScore } from './arena.js';
import { getBotStats } from './bots.js';

let state = null;
let auction = null;
let shop = null;
let arena = null;
let callbacks = {};
let currentAuctionTab = 'buy';
let shopCat = 'equipment';
let heroTab = 'backpack';
let heroScreen = 'hero';
let enhanceSelectedItem = null;
let arenaScreen = 'list';
let lastArenaResult = null;
let compareBotId = null;

const STAT_ORDER = [
  'attack','defense','hp','critChance','critDamage','dodge',
  'attackSpeed','lifesteal','range',
  'accuracy','critResist','armorPen','antiHeal','berserk','thorns','moveSpeed',
];

const STAT_ICON = {
  attack:'⚔', defense:'🛡', hp:'❤', critChance:'💥', critDamage:'💢',
  dodge:'💨', attackSpeed:'⚡', lifesteal:'🩸', range:'📏',
  accuracy:'🎯', critResist:'🛡️', armorPen:'🔨', antiHeal:'🚫',
  berserk:'😡', thorns:'🌵', moveSpeed:'👟',
};

// ===== LONG-PRESS =====
let _holdBuy = null;
let _lastLongPressTime = 0;
let _suppressNextClick = false;

function _startHold(btn, onTick, holdMs = 400, repeatMs = 100) {
  _killHold(_holdBuy); _holdBuy = null;
  btn.classList.add('holding');
  const st = { btn, timeout: null, interval: null, alive: true, ticked: false };
  st.timeout = setTimeout(() => {
    if (!st.alive) return;
    const first = onTick(true);
    if (!first || !first.ok) { _killHold(st); return; }
    st.ticked = true;
    st.interval = setInterval(() => {
      if (!st.alive) { clearInterval(st.interval); return; }
      const r = onTick(true);
      if (!r || !r.ok) _killHold(st);
      else st.ticked = true;
    }, repeatMs);
  }, holdMs);
  return st;
}

function _killHold(st) {
  if (!st) return;
  st.alive = false;
  if (st.timeout) clearTimeout(st.timeout);
  if (st.interval) clearInterval(st.interval);
  if (st.btn) st.btn.classList.remove('holding');
  if (st.ticked) { _suppressNextClick = true; _lastLongPressTime = Date.now(); }
}

function _endHoldBuy() { if (_holdBuy) { _killHold(_holdBuy); _holdBuy = null; } }
window.addEventListener('pointerup', () => { _endHoldBuy(); });
window.addEventListener('pointercancel', () => { _endHoldBuy(); });

function bindBuyButton(btn, buyFn) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    if (_suppressNextClick) { _suppressNextClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (Date.now() - _lastLongPressTime < 500) return;
    e.preventDefault(); e.stopPropagation();
    buyFn(false);
  });
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    e.preventDefault(); e.stopPropagation();
    _holdBuy = _startHold(btn, (silent) => buyFn(true));
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ===== АВТО-ТОЧКА =====
let _autoEnhance = null;
let _lastAutoTime = 0;
let _suppressNextEnhanceClick = false;

function _stopAutoEnhance() {
  if (!_autoEnhance) return;
  _autoEnhance.alive = false;
  if (_autoEnhance.interval) clearInterval(_autoEnhance.interval);
  document.querySelectorAll('.enhance-btn.holding, .blessed-btn.holding').forEach(b => b.classList.remove('holding'));
  if (_autoEnhance.ticked) { _suppressNextEnhanceClick = true; _lastAutoTime = Date.now(); }
  _autoEnhance = null;
}
window.addEventListener('pointerup', _stopAutoEnhance);
window.addEventListener('pointercancel', _stopAutoEnhance);

function _selectEnhanceCard(item) {
  document.querySelectorAll('.enhance-item').forEach(e => e.classList.remove('selected'));
  const card = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
  if (card) card.classList.add('selected');
}

function _switchToNextEnhanceTarget(currentItem, useBlessed) {
  const list = getBackpackEnhanceList(true);
  const idx = list.indexOf(currentItem);
  if (idx < 0) {
    if (list.length > 0) {
      const first = list[0];
      const stype = first.slot === 'weapon' ? 'weapon' : 'armor';
      const scrolls = state.hero.scrolls[first.grade]?.[stype] || 0;
      if (scrolls > 0) { enhanceSelectedItem = first; _selectEnhanceCard(first); showEnhanceDetail(first); return true; }
    }
    return false;
  }
  for (let offset = 1; offset <= list.length; offset++) {
    const candidate = list[(idx + offset) % list.length];
    if (candidate === currentItem) break;
    const stype = candidate.slot === 'weapon' ? 'weapon' : 'armor';
    const scrolls = state.hero.scrolls[candidate.grade]?.[stype] || 0;
    if (scrolls > 0) { enhanceSelectedItem = candidate; _selectEnhanceCard(candidate); showEnhanceDetail(candidate); return true; }
  }
  return false;
}

function _doAutoTick(useBlessed) {
  const hero = state.hero;
  const item = enhanceSelectedItem;
  if (!item) { _stopAutoEnhance(); return false; }
  if (item.enhance >= 12) {
    if (!_switchToNextEnhanceTarget(item, useBlessed)) { _stopAutoEnhance(); return false; }
    return true;
  }
  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  if (scrollsHave <= 0) {
    if (!_switchToNextEnhanceTarget(item, useBlessed)) { _stopAutoEnhance(); return false; }
    return true;
  }
  const listBefore = getBackpackEnhanceList(true);
  const idxBefore = listBefore.indexOf(item);
  const r = tryEnhance(hero, item, useBlessed);
  if (!r.ok) {
    if (!_switchToNextEnhanceTarget(item, useBlessed)) { _stopAutoEnhance(); return false; }
    return true;
  }
  playEnhanceAnim(r.result, item, r.blessedUsed);
  callbacks.onEquipChange && callbacks.onEquipChange();
  if (r.result === 'destroyed') {
    const oldCard = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
    if (oldCard) oldCard.remove();
    const listAfter = getBackpackEnhanceList(true);
    let next = null;
    if (idxBefore >= 0 && listAfter.length > 0) {
      const pos = Math.min(idxBefore, listAfter.length - 1);
      next = listAfter[pos];
    } else if (listAfter.length > 0) next = listAfter[0];
    if (!next) { _stopAutoEnhance(); enhanceSelectedItem = null; showEnhanceDetail(null); return false; }
    enhanceSelectedItem = next;
    _selectEnhanceCard(next);
    showEnhanceDetail(next);
    return true;
  }
  updateEnhanceItemCard(item);
  updateEnhanceLive();
  if (item.enhance >= 12) {
    if (!_switchToNextEnhanceTarget(item, useBlessed)) { _stopAutoEnhance(); return false; }
  }
  return true;
}

function bindEnhanceButton(btn, getItem, useBlessed) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    if (_suppressNextEnhanceClick) { _suppressNextEnhanceClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (Date.now() - _lastAutoTime < 500) return;
    e.preventDefault(); e.stopPropagation();
    doOneEnhance(getItem(), useBlessed);
  });
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    e.preventDefault(); e.stopPropagation();
    const item = getItem();
    if (!item) return;
    btn.classList.add('holding');
    _autoEnhance = { alive: true, interval: null, useBlessed, ticked: false };
    setTimeout(() => {
      if (!_autoEnhance || !_autoEnhance.alive) return;
      const ok = _doAutoTick(useBlessed);
      if (!ok) { _stopAutoEnhance(); return; }
      _autoEnhance.ticked = true;
      _autoEnhance.interval = setInterval(() => {
        if (!_autoEnhance || !_autoEnhance.alive) {
          if (_autoEnhance) clearInterval(_autoEnhance.interval);
          return;
        }
        const ok2 = _doAutoTick(_autoEnhance.useBlessed);
        if (!ok2) { _stopAutoEnhance(); return; }
        _autoEnhance.ticked = true;
      }, 250);
    }, 400);
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

function doOneEnhance(item, useBlessed) {
  if (!item) return;
  const hero = state.hero;
  if (item.enhance >= 12) { showBigEnhanceAnim(item, useBlessed); return; }
  const r = tryEnhance(hero, item, useBlessed);
  if (!r.ok) { toast('Нельзя', 'epic'); return; }
  playEnhanceAnim(r.result, item, r.blessedUsed);
  if (r.result === 'destroyed') {
    const listBefore = getBackpackEnhanceList(true);
    const idxBefore = listBefore.indexOf(item);
    const oldCard = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
    if (oldCard) oldCard.remove();
    const listAfter = getBackpackEnhanceList(true);
    let next = null;
    if (idxBefore >= 0 && listAfter.length > 0) {
      const pos = Math.min(idxBefore, listAfter.length - 1);
      next = listAfter[pos];
    }
    enhanceSelectedItem = next;
    document.querySelectorAll('.enhance-item').forEach(e => e.classList.remove('selected'));
    if (next) {
      const newCard = document.querySelector(`.enhance-item[data-item-id="${next.id}"]`);
      if (newCard) newCard.classList.add('selected');
    }
    showEnhanceDetail(next);
  } else {
    updateEnhanceItemCard(item);
    updateEnhanceLive();
  }
  callbacks.onEquipChange && callbacks.onEquipChange();
}

function updateEnhanceItemCard(item) {
  const card = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
  if (!card) return;
  const enhEl = card.querySelector('.ei-enh');
  if (enhEl) {
    enhEl.textContent = item.enhance > 0 ? `+${item.enhance}` : '+0';
    enhEl.style.opacity = item.enhance > 0 ? '1' : '0';
  }
  const statsEl = card.querySelector('.ei-stats');
  if (statsEl) statsEl.innerHTML = statsTwoMain(item);
  const bonusEl = card.querySelector('.ei-bonus');
  if (bonusEl) {
    const bonus = getEnhanceBonus(item);
    bonusEl.innerHTML = bonus ? `${bonus.icon} ${bonus.display}` : '';
  }
}

function updateEnhanceLive() {
  const item = enhanceSelectedItem;
  const detail = document.getElementById('enhance-detail');
  if (!detail || !item) return;
  const hero = state.hero;
  const headIcon = detail.querySelector('.eh-icon');
  const headName = detail.querySelector('.eh-name');
  if (headIcon) headIcon.textContent = item.icon;
  if (headName) headName.textContent = `${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}`;
  const rows = detail.querySelectorAll('.eh-body .row');
  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  const willBreak = willBreakAt(item.enhance);
  const chance = item.enhance < MAX_ENHANCE ? (ENHANCE_CHANCE[item.enhance] ?? 0) : 0;
  const isMax = item.enhance >= MAX_ENHANCE;
  const blessedCount = hero.backpack.filter(x => x.kind === 'blessed').reduce((sum, x) => sum + (x.count || 1), 0);
  if (rows[1]) rows[1].querySelector('.val').textContent = `+${item.enhance} / +${MAX_ENHANCE}`;
  if (rows[2] && !isMax) {
    const v = rows[2].querySelector('.val');
    v.textContent = `${(chance*100).toFixed(0)}%`;
    v.className = 'val ' + (chance >= 0.5 ? 'good' : 'bad');
  }
  if (rows[3] && !isMax) {
    const v = rows[3].querySelector('.val');
    v.textContent = willBreak ? '🔥 Да' : '✓ Нет';
    v.className = 'val ' + (willBreak ? 'bad' : 'good');
  }
  if (rows[4]) {
    const v = rows[4].querySelector('.val');
    v.textContent = scrollsHave;
    v.className = 'val ' + (scrollsHave > 0 ? '' : 'bad');
  }
  if (rows[5]) {
    const v = rows[5].querySelector('.val');
    v.textContent = blessedCount;
    v.className = 'val ' + (blessedCount > 0 ? 'good' : 'bad');
  }
  const btnN = detail.querySelector('.enhance-btn:not(.blessed-btn)');
  const btnB = detail.querySelector('.blessed-btn');
  if (btnN) btnN.disabled = (isMax || scrollsHave <= 0);
  if (btnB) btnB.disabled = (isMax || scrollsHave <= 0 || blessedCount <= 0);
}

function getBackpackEnhanceList(skipMax = false) {
  const hero = state.hero;
  const list = [];
  for (const it of hero.backpack) {
    if (it.kind === 'blessed') continue;
    if (it.kind === 'buff') continue;
    if (it.kind === 'pass') continue;
    if (skipMax && it.enhance >= MAX_ENHANCE) continue;
    list.push(it);
  }
  return list;
}

function getNextBackpackItem(currentItem, skipMax = false) {
  const list = getBackpackEnhanceList(skipMax);
  if (list.length === 0) return null;
  if (!currentItem) return list[0];
  const idx = list.indexOf(currentItem);
  if (idx < 0) return list[0];
  if (idx + 1 < list.length) return list[idx + 1];
  if (idx - 1 >= 0) return list[idx - 1];
  return null;
}

function updateShopCounts() {
  const content = document.getElementById('shop-content');
  if (!content || !shop.stock) return;
  content.querySelectorAll('[data-have]').forEach(el => {
    const [cat, key] = el.dataset.have.split(':');
    let val = 0;
    if (cat === 'scroll') val = state.hero.scrolls[shop.stock.grade]?.[key] || 0;
    else if (cat === 'potion') val = state.hero.potions[key] || 0;
    else if (cat === 'soulshot') val = state.hero.soulshots[key] || 0;
    el.textContent = 'У тебя: ' + val;
  });
}

// ===== INIT =====
export function initUI(s, a, sh, ar, cb = {}) {
  state = s; auction = a; shop = sh; arena = ar; callbacks = cb;

  document.querySelectorAll('#bottom-panel button').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (panel === 'city') { callbacks.onReturnToCity && callbacks.onReturnToCity(); return; }
      if (panel === 'arena') { openArena(); return; }
      openModal(panel);
    });
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id.replace('modal-',''));
    });
  });
  document.getElementById('item-popup').addEventListener('click', (e) => {
    if (e.target.id === 'item-popup') hideItemPopup();
  });
  const tBtn = document.getElementById('btn-open-teleport');
  if (tBtn) tBtn.addEventListener('click', () => openModal('teleport'));

  document.querySelectorAll('.hero-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      heroScreen = btn.dataset.switch;
      document.querySelectorAll('.hero-switch-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderHero();
    });
  });

  document.querySelectorAll('#arena-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.arenaTab;
      document.querySelectorAll('#arena-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.arena-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('arena-tab-' + tab).classList.remove('hidden');
      renderArenaTab(tab);
    });
  });

  document.querySelectorAll('#modal-auction .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAuctionTab = btn.dataset.tab;
      document.querySelectorAll('#modal-auction .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('#modal-auction .tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('auction-' + currentAuctionTab).classList.remove('hidden');
      renderAuction();
    });
  });
  document.querySelectorAll('#shop-cat-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      shopCat = btn.dataset.shopCat;
      document.querySelectorAll('#shop-cat-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderShop();
    });
  });
  document.querySelectorAll('#hero-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      heroTab = btn.dataset.heroTab;
      document.querySelectorAll('#hero-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.hero-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('hero-tab-' + heroTab).classList.remove('hidden');
      renderHeroTabs();
    });
  });
}

function statLabel(k) { return STAT_NAMES[k] || k; }
function statSuffix(k) { return STAT_SUFFIX[k] || ''; }
function statLine(k, val) { return `<span class="stat-${k}">${STAT_ICON[k]} ${statLabel(k)} +${val}${statSuffix(k)}</span>`; }
function statsCompact(item) {
  const s = itemStats(item);
  const parts = [];
  for (const k of STAT_ORDER) {
    if (!s[k]) continue;
    parts.push(`<span class="stat-${k}">${STAT_ICON[k]}${s[k]}${statSuffix(k)}</span>`);
  }
  return parts.join('');
}
function statsMultiline(item) {
  const s = itemStats(item);
  const rows = [];
  for (const k of STAT_ORDER) {
    if (!s[k]) continue;
    rows.push(`<div class="stat-row"><span class="stat-name">${STAT_ICON[k]} ${statLabel(k)}</span><span class="stat-val">+${s[k]}${statSuffix(k)}</span></div>`);
  }
  return rows.join('');
}
function statsTwoMain(item) {
  const s = itemStats(item);
  const keys = Object.keys(s).slice(0, 2);
  const rows = [];
  for (const k of keys) rows.push(`<span class="stat-${k}">${STAT_ICON[k]}${s[k]}${statSuffix(k)}</span>`);
  return rows.join('');
}

// Прочность квадратиками
function durabilityBar(dur) {
  const filled = Math.max(0, Math.min(5, Math.ceil(dur / 20)));
  const color = dur >= 80 ? '#4ade80' : dur >= 60 ? '#fbbf24' : dur >= 40 ? '#fb923c' : dur >= 20 ? '#ef4444' : '#7f1d1d';
  let s = '';
  for (let i = 0; i < 5; i++) s += i < filled ? '█' : '░';
  return `<span style="color:${color};letter-spacing:-1px;font-size:11px;font-weight:bold">${s}</span>`;
}

// Средняя прочность бота
function avgDurability(bot) {
  let sum = 0, count = 0;
  for (const slot of SLOTS) {
    const item = bot.equipment[slot];
    if (item && item.durability !== undefined) { sum += item.durability; count++; }
  }
  return count > 0 ? Math.round(sum / count) : 100;
}

// Средняя прочность тени
function avgShadowDurability(hero) {
  let sum = 0, count = 0;
  for (const slot of SLOTS) {
    const item = hero.shadow.equipment[slot];
    if (item && item.durability !== undefined) { sum += item.durability; count++; }
  }
  return count > 0 ? Math.round(sum / count) : 100;
}

export function openModal(name) {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  const modal = document.getElementById('modal-' + name);
  if (!modal) return;
  modal.classList.remove('hidden');
  if (name === 'hero') renderHero();
  if (name === 'enhance') renderEnhance();
  if (name === 'shop') renderShop();
  if (name === 'auction') renderAuction();
  if (name === 'teleport') renderTeleport();
}

export function closeModal(name) {
  document.getElementById('modal-' + name).classList.add('hidden');
  hideItemPopup();
}

// ===== ЭКРАН ГЕРОЯ =====
function renderHero() {
  document.querySelectorAll('.hero-switch-btn').forEach(b => b.classList.toggle('active', b.dataset.switch === heroScreen));
  const heroBlock = document.getElementById('hero-block');
  const shadowBlock = document.getElementById('shadow-block');
  if (heroScreen === 'hero') {
    heroBlock.classList.remove('hidden');
    shadowBlock.classList.add('hidden');
    renderHeroContent();
  } else {
    heroBlock.classList.add('hidden');
    shadowBlock.classList.remove('hidden');
    renderShadowContent();
  }
}

function renderHeroContent() {
  const hero = state.hero;
  const man = document.getElementById('mannequin');
  man.innerHTML = '';
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    const el = document.createElement('div');
    el.className = 'eq-slot' + (item ? '' : ' empty');
    el.dataset.slot = slot;
    if (item) {
      const gc = gradeColor(item.grade);
      el.innerHTML = `
        <div class="eq-icon">${item.icon}</div>
        <div class="eq-grade" style="color:${gc}">${gradeShort(item.grade)}</div>
        ${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}
        <span class="slot-label">${SLOT_NAMES[slot]}</span>
      `;
      el.style.borderColor = gc;
      el.addEventListener('click', () => showItemPopup(item, 'equip'));
    } else el.textContent = SLOT_NAMES[slot];
    man.appendChild(el);
  }
  renderHeroStats();
  renderHeroBonuses();
  renderHeroTabs();
}

function renderHeroStats() {
  const hero = state.hero;
  let eqHp=0, eqAtk=0, eqDef=0, eqCrit=0, eqCritDmg=0, eqDodge=0;
  let eqAtkSpd=0, eqLs=0, eqRange=0, eqAcc=0, eqCritRes=0, eqArmorPen=0;
  let eqAntiHeal=0, eqBerserk=0, eqThorns=0, eqMoveSpd=0;
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    const dm = durabilityMultiplier(item);
    eqHp += (s.hp||0)*dm; eqAtk += (s.attack||0)*dm; eqDef += (s.defense||0)*dm;
    eqCrit += (s.critChance||0)*dm; eqCritDmg += (s.critDamage||0)*dm;
    eqDodge += (s.dodge||0)*dm; eqAtkSpd += (s.attackSpeed||0)*dm;
    eqLs += (s.lifesteal||0)*dm; eqRange += (s.range||0)*dm;
    eqAcc += (s.accuracy||0)*dm; eqCritRes += (s.critResist||0)*dm;
    eqArmorPen += (s.armorPen||0)*dm; eqAntiHeal += (s.antiHeal||0)*dm;
    eqBerserk += (s.berserk||0)*dm; eqThorns += (s.thorns||0)*dm; eqMoveSpd += (s.moveSpeed||0)*dm;
  }
  const bonusHp = Math.round((hero.baseMaxHp + eqHp) * (hero.hpBonus || 0));
  const stats = document.getElementById('hero-stats');
  stats.innerHTML = `
    <div class="hs-group">
      <div class="hs-title">Основные</div>
      <div class="hs-grid">
        <div class="hs-cell"><span class="hs-ico">⭐</span><span class="hs-label">Ур.</span><span class="hs-total">${hero.level}</span></div>
        <div class="hs-cell"><span class="hs-ico">❤</span><span class="hs-label">HP</span>${eqHp>0?`<span class="hs-add">+${Math.round(eqHp)}</span>`:''}${bonusHp>0?`<span class="hs-add">+${bonusHp}🌟</span>`:''}<span class="hs-total">${hero.maxHp}</span></div>
        <div class="hs-cell"><span class="hs-ico">⚔</span><span class="hs-label">Атака</span>${eqAtk>0?`<span class="hs-add">+${Math.round(eqAtk)}</span>`:''}<span class="hs-total">${Math.round(hero.attack)}</span></div>
        <div class="hs-cell"><span class="hs-ico">🛡</span><span class="hs-label">Защита</span>${eqDef>0?`<span class="hs-add">+${Math.round(eqDef)}</span>`:''}<span class="hs-total">${Math.round(hero.defense)}</span></div>
        <div class="hs-cell"><span class="hs-ico">📏</span><span class="hs-label">Даль.</span>${eqRange>0?`<span class="hs-add">+${eqRange.toFixed(2)}</span>`:''}<span class="hs-total">${hero.range.toFixed(2)}</span></div>
        <div class="hs-cell"><span class="hs-ico">⚡</span><span class="hs-label">Скор.</span>${eqAtkSpd>0?`<span class="hs-add">+${eqAtkSpd.toFixed(0)}%</span>`:''}<span class="hs-total">${hero.attackSpeed.toFixed(2)}</span></div>
      </div>
    </div>
    <div class="hs-group">
      <div class="hs-title">Крит и уворот</div>
      <div class="hs-grid">
        <div class="hs-cell"><span class="hs-ico">💥</span><span class="hs-label">Крит</span>${eqCrit>0?`<span class="hs-add">+${eqCrit.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.critChance.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">💢</span><span class="hs-label">Кр.урон</span>${eqCritDmg>0?`<span class="hs-add">+${eqCritDmg.toFixed(0)}%</span>`:''}<span class="hs-total">+${hero.critDamage.toFixed(0)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">💨</span><span class="hs-label">Уворот</span>${eqDodge>0?`<span class="hs-add">+${eqDodge.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.dodge.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">🎯</span><span class="hs-label">Точн.</span>${eqAcc>0?`<span class="hs-add">+${eqAcc.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.accuracy.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">🛡️</span><span class="hs-label">Сопр.кр</span>${eqCritRes>0?`<span class="hs-add">+${eqCritRes.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.critResist.toFixed(1)}%</span></div>
      </div>
    </div>
    <div class="hs-group">
      <div class="hs-title">Бой</div>
      <div class="hs-grid">
        <div class="hs-cell"><span class="hs-ico">🩸</span><span class="hs-label">Вампир.</span>${eqLs>0?`<span class="hs-add">+${eqLs.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.lifesteal.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">🔨</span><span class="hs-label">Пробит.</span>${eqArmorPen>0?`<span class="hs-add">+${eqArmorPen.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.armorPen.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">🚫</span><span class="hs-label">Анти-хил</span>${eqAntiHeal>0?`<span class="hs-add">+${eqAntiHeal.toFixed(1)}%</span>`:''}<span class="hs-total">${hero.antiHeal.toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">😡</span><span class="hs-label">Берсерк</span>${eqBerserk>0?`<span class="hs-add">+${eqBerserk.toFixed(1)}%</span>`:''}<span class="hs-total">${(hero.berserk||0).toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">🌵</span><span class="hs-label">Шипы</span>${eqThorns>0?`<span class="hs-add">+${eqThorns.toFixed(1)}%</span>`:''}<span class="hs-total">${(hero.thorns||0).toFixed(1)}%</span></div>
        <div class="hs-cell"><span class="hs-ico">👟</span><span class="hs-label">Бег</span>${eqMoveSpd>0?`<span class="hs-add">+${eqMoveSpd.toFixed(1)}</span>`:''}<span class="hs-total">${hero.moveSpeed.toFixed(2)}</span></div>
      </div>
    </div>
  `;
}

function renderHeroBonuses() {
  const hero = state.hero;
  const bonusBox = document.getElementById('hero-bonuses');
  if (!bonusBox) return;
  const itemBonuses = [];
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const b = getEnhanceBonus(item);
    if (b) itemBonuses.push({ slot, item, bonus: b });
  }
  const now = Date.now();
  const activeBuffs = [];
  for (const type of ['attack','crit','speed','range']) {
    const def = BUFF_SCROLLS[type];
    if (!def) continue;
    const until = hero.activeBuffs[type];
    if (until && until > now) {
      const left = Math.ceil((until - now) / 1000);
      const m = Math.floor(left / 60);
      const s = left % 60;
      activeBuffs.push({ def, timeLeft: `${m}:${s < 10 ? '0' : ''}${s}` });
    }
  }
  let html = '';
  if (itemBonuses.length > 0) {
    html += `<div class="hb-title">✨ Бонусы +15 (${itemBonuses.length})</div><div class="hb-list">${itemBonuses.map(x => `<div class="hb-row"><span class="hb-icon">${x.item.icon}</span><span class="hb-name">${x.bonus.icon} ${x.bonus.name}</span><span class="hb-val">${x.bonus.display}</span></div>`).join('')}</div>`;
  }
  if (activeBuffs.length > 0) {
    html += `<div class="hb-title" style="margin-top:6px">🧪 Активные свитки (${activeBuffs.length})</div><div class="hb-list">${activeBuffs.map(x => `<div class="hb-row"><span class="hb-icon">${x.def.icon}</span><span class="hb-name" style="color:${x.def.color}">${x.def.name}</span><span class="hb-time">${x.timeLeft}</span></div>`).join('')}</div>`;
  }
  bonusBox.innerHTML = html || '<div class="hb-empty">Нет бонусов и активных свитков</div>';
}

function renderHeroTabs() {
  if (heroTab === 'backpack') renderBackpack();
  else if (heroTab === 'scrolls') renderScrolls();
  else if (heroTab === 'potions') renderPotions();
  else if (heroTab === 'soulshots') renderSoulshots();
}

function renderBackpack() {
  const hero = state.hero;
  const grid = document.getElementById('backpack-grid');
  grid.innerHTML = '';
  const visibleItems = hero.backpack.filter(it => it.kind !== 'buff');
  if (visibleItems.length === 0) { grid.innerHTML = '<div class="bp-empty">Рюкзак пуст</div>'; return; }
  for (const item of visibleItems) {
    const el = document.createElement('div');
    el.className = 'bp-item';
    let borderColor = gradeColor(item.grade);
    if (item.kind === 'blessed') borderColor = '#fbbf24';
    if (item.kind === 'pass') borderColor = '#a855f7';
    el.style.borderColor = borderColor;
    const cnt = item.count || 1;
    const countBadge = cnt > 1 ? `<span class="bp-count">×${cnt}</span>` : '';
    if (item.kind === 'blessed') {
      el.innerHTML = `${countBadge}<div class="bp-icon">${item.icon}</div><div class="bp-grade" style="color:#fbbf24">BLESSED</div><div class="bp-name">${item.name}</div>`;
    } else if (item.kind === 'pass') {
      el.innerHTML = `${countBadge}<div class="bp-icon">${item.icon}</div><div class="bp-grade" style="color:#a855f7">PASS</div><div class="bp-name">${item.name}</div>`;
    } else {
      el.innerHTML = `${countBadge}${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}<div class="bp-icon">${item.icon}</div><div class="bp-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div><div class="bp-name">${item.name}</div><div class="bp-stats">${statsCompact(item)}</div>`;
    }
    el.addEventListener('click', () => showItemPopup(item, 'backpack'));
    grid.appendChild(el);
  }
}

function renderScrolls() {
  const hero = state.hero;
  const sc = document.getElementById('scrolls-list');
  sc.innerHTML = '';
  const scrollIcons = { ng:'📜', d:'📗', c:'📘', b:'📙', a:'📕', s:'🌟' };
  let has = false;
  for (const grade of GRADE_ORDER) {
    const w = hero.scrolls[grade]?.weapon || 0;
    const a = hero.scrolls[grade]?.armor || 0;
    if (w > 0) { has = true; const el = document.createElement('div'); el.className = 'scroll-item'; el.style.borderColor = gradeColor(grade); el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Оружие</span><span class="scroll-count">×${w}</span>`; sc.appendChild(el); }
    if (a > 0) { has = true; const el = document.createElement('div'); el.className = 'scroll-item'; el.style.borderColor = gradeColor(grade); el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Броня</span><span class="scroll-count">×${a}</span>`; sc.appendChild(el); }
  }
  const buffItems = hero.backpack.filter(it => it.kind === 'buff');
  for (const item of buffItems) {
    const def = BUFF_SCROLLS[item.buffType];
    if (!def) continue;
    has = true;
    const el = document.createElement('div');
    el.className = 'scroll-item';
    el.style.borderColor = def.color;
    const cnt = item.count || 1;
    el.innerHTML = `<span class="scroll-icon">${item.icon}</span><span class="scroll-name" style="color:${def.color}">${item.name}</span><span class="scroll-count">×${cnt}</span>`;
    sc.appendChild(el);
  }
  if (!has) sc.innerHTML = '<div class="bp-empty">Нет свитков</div>';
}

function renderPotions() {
  const hero = state.hero;
  const pot = document.getElementById('potions-list');
  pot.innerHTML = '';
  let has = false;
  for (const type of POTION_ORDER) {
    const c = hero.potions[type] || 0;
    if (c <= 0) continue;
    has = true;
    const p = POTIONS[type];
    const el = document.createElement('div');
    el.className = 'potion-item';
    el.style.borderColor = p.color;
    el.innerHTML = `<span class="potion-icon">${p.icon}</span><span class="scroll-name" style="color:${p.color}">${p.name}</span><span class="potion-count">×${c}</span>`;
    pot.appendChild(el);
  }
  if (!has) pot.innerHTML = '<div class="bp-empty">Нет зелий</div>';
}

function renderSoulshots() {
  const hero = state.hero;
  const ss = document.getElementById('soulshots-list');
  ss.innerHTML = '';
  let has = false;
  for (const grade of GRADE_ORDER) {
    const c = hero.soulshots[grade] || 0;
    if (c <= 0) continue;
    has = true;
    const el = document.createElement('div');
    el.className = 'soulshot-item';
    el.style.borderColor = gradeColor(grade);
    el.innerHTML = `<span class="soulshot-icon">⚡</span><span class="scroll-name" style="color:${gradeColor(grade)}">Соски ${gradeName(grade)}</span><span class="soulshot-count">×${c}</span>`;
    ss.appendChild(el);
  }
  if (!has) ss.innerHTML = '<div class="bp-empty">Нет сосок</div>';
}

// ===== ТЕНЬ =====
function renderShadowContent() {
  const hero = state.hero;
  const shadow = hero.shadow;

  const man = document.getElementById('shadow-mannequin');
  man.innerHTML = '';
  for (const slot of SLOTS) {
    const item = shadow.equipment[slot];
    const el = document.createElement('div');
    el.className = 'eq-slot' + (item ? '' : ' empty');
    el.dataset.slot = slot;
    if (item) {
      const gc = gradeColor(item.grade);
      const dur = item.durability !== undefined ? item.durability : 100;
      const durColor = dur >= 80 ? '#4ade80' : dur >= 50 ? '#fbbf24' : '#ef4444';
      el.innerHTML = `
        <div class="eq-icon">${item.icon}</div>
        <div class="eq-grade" style="color:${gc}">${gradeShort(item.grade)}</div>
        ${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}
        <div class="eq-dur" style="color:${durColor}">${dur}%</div>
        <span class="slot-label">${SLOT_NAMES[slot]}</span>
      `;
      el.style.borderColor = gc;
      el.addEventListener('click', () => showItemPopup(item, 'shadow'));
    } else {
      el.textContent = SLOT_NAMES[slot];
    }
    man.appendChild(el);
  }

  const stats = getShadowStats(hero);
  const statsEl = document.getElementById('shadow-stats');
  if (stats && statsEl) {
    statsEl.innerHTML = `
      <div class="hs-group">
        <div class="hs-title">Тень</div>
        <div class="hs-grid">
          <div class="hs-cell"><span class="hs-ico">⚔</span><span class="hs-label">Атака</span><span class="hs-total">${Math.round(stats.attack)}</span></div>
          <div class="hs-cell"><span class="hs-ico">🛡</span><span class="hs-label">Защита</span><span class="hs-total">${Math.round(stats.defense)}</span></div>
          <div class="hs-cell"><span class="hs-ico">❤</span><span class="hs-label">HP</span><span class="hs-total">${stats.maxHp}</span></div>
          <div class="hs-cell"><span class="hs-ico">📏</span><span class="hs-label">Даль.</span><span class="hs-total">${stats.range.toFixed(2)}</span></div>
          <div class="hs-cell"><span class="hs-ico">⚡</span><span class="hs-label">Скор.</span><span class="hs-total">${stats.attackSpeed.toFixed(2)}</span></div>
          <div class="hs-cell"><span class="hs-ico">💥</span><span class="hs-label">Крит</span><span class="hs-total">${stats.critChance.toFixed(1)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">💢</span><span class="hs-label">Кр.урон</span><span class="hs-total">+${stats.critDamage.toFixed(0)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">💨</span><span class="hs-label">Уворот</span><span class="hs-total">${stats.dodge.toFixed(1)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">🩸</span><span class="hs-label">Вампир.</span><span class="hs-total">${stats.lifesteal.toFixed(1)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">🎯</span><span class="hs-label">Точн.</span><span class="hs-total">${stats.accuracy.toFixed(1)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">🛡️</span><span class="hs-label">Сопр.кр</span><span class="hs-total">${stats.critResist.toFixed(1)}%</span></div>
          <div class="hs-cell"><span class="hs-ico">🔨</span><span class="hs-label">Пробит.</span><span class="hs-total">${stats.armorPen.toFixed(1)}%</span></div>
        </div>
      </div>
    `;
  }

  renderShadowSlots();
  renderShadowDurability();
  renderShadowBackpack();
}

function renderShadowSlots() {
  const hero = state.hero;
  const sh = hero.shadow;
  const el = document.getElementById('shadow-consumables');
  if (!el) return;

  const weapon = sh.equipment.weapon;
  const ssGrade = weapon ? weapon.grade : null;
  const ssHave = ssGrade ? (sh.soulshots[ssGrade] || 0) : 0;

  const potionSlots = POTION_ORDER.map(type => {
    const p = POTIONS[type];
    const have = sh.potions[type] || 0;
    const hasAny = have > 0;
    return `<div class="slot-item ${hasAny ? '' : 'slot-empty'}" data-add-potion="${type}">
      <div class="slot-icon">${p.icon}</div>
      <div class="slot-count">${have}</div>
      <div class="slot-label">${p.name.replace(' зелье HP', '').replace(' зелье', '')}</div>
    </div>`;
  }).join('');

  const scrollSlots = ['attack','crit','speed','range'].map(type => {
    const def = BUFF_SCROLLS[type];
    const have = sh.scrolls[type] || 0;
    const hasAny = have > 0;
    return `<div class="slot-item ${hasAny ? '' : 'slot-empty'}" data-add-scroll="${type}">
      <div class="slot-icon">${def.icon}</div>
      <div class="slot-count">${have}</div>
      <div class="slot-label">${def.name.replace('Свиток ', '')}</div>
    </div>`;
  }).join('');

  const ssSlot = `<div class="slot-item ${ssHave > 0 ? '' : 'slot-empty'}" data-add-soulshot="${ssGrade || ''}">
    <div class="slot-icon">⚡</div>
    <div class="slot-count">${ssHave}</div>
    <div class="slot-label">${ssGrade ? 'Соски ' + gradeShort(ssGrade) : 'Соски'}</div>
  </div>`;

  el.innerHTML = `
    <div class="sfs-title">🎒 Расходники</div>
    <div class="sfs-row">
      <div class="sfs-section">
        <div class="sfs-subtitle">Боеприпасы</div>
        <div class="sfs-slots">${ssSlot}</div>
      </div>
      <div class="sfs-section">
        <div class="sfs-subtitle">Зелья</div>
        <div class="sfs-slots">${potionSlots}</div>
      </div>
    </div>
    <div class="sfs-section">
      <div class="sfs-subtitle">Свитки</div>
      <div class="sfs-slots">${scrollSlots}</div>
    </div>
  `;

  el.querySelectorAll('[data-add-soulshot]').forEach(s => {
    s.addEventListener('click', () => {
      const grade = s.dataset.addSoulshot;
      if (!grade) { toast('Сначала надень оружие на тень', 'epic'); return; }
      openShadowAddDialog('soulshot', grade);
    });
  });
  el.querySelectorAll('[data-add-potion]').forEach(s => {
    s.addEventListener('click', () => openShadowAddDialog('potion', s.dataset.addPotion));
  });
  el.querySelectorAll('[data-add-scroll]').forEach(s => {
    s.addEventListener('click', () => openShadowAddDialog('scroll', s.dataset.addScroll));
  });
}

function openShadowAddDialog(kind, key) {
  const hero = state.hero;
  const sh = hero.shadow;

  let title = '';
  let haveInBag = 0;
  let haveInShadow = 0;

  if (kind === 'soulshot') {
    title = `Соски ${gradeName(key)}`;
    haveInBag = hero.soulshots[key] || 0;
    haveInShadow = sh.soulshots[key] || 0;
  } else if (kind === 'potion') {
    const p = POTIONS[key];
    title = p.name;
    haveInBag = hero.potions[key] || 0;
    haveInShadow = sh.potions[key] || 0;
  } else if (kind === 'scroll') {
    const def = BUFF_SCROLLS[key];
    title = def.name;
    haveInBag = hero.backpack.filter(x => x.kind === 'buff' && x.buffType === key).reduce((s,x) => s + (x.count||1), 0);
    haveInShadow = sh.scrolls[key] || 0;
  }

  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  body.innerHTML = `
    <h3 style="color:#a855f7">👤 ${title}</h3>
    <div class="stat-row"><span class="stat-name">В рюкзаке</span><span class="stat-val">${haveInBag}</span></div>
    <div class="stat-row"><span class="stat-name">В тени</span><span class="stat-val" style="color:#d4a5ff">${haveInShadow}</span></div>
    <div style="margin-top:8px">
      <input type="number" id="shadow-add-input" value="${Math.min(10, haveInBag)}" min="0" max="${haveInBag}" style="width:100%;padding:8px;background:#0d0515;border:1px solid #4a2a6a;color:#d4a5ff;font-family:inherit;font-size:14px;border-radius:3px;text-align:center">
    </div>
    <div style="display:flex;gap:4px;margin-top:8px">
      <button class="popup-close" id="sa-add" style="border-color:#a855f7;color:#a855f7;flex:1">📥 Положить</button>
      <button class="popup-close" id="sa-take" style="border-color:#fbbf24;color:#fbbf24;flex:1">📤 Забрать</button>
    </div>
    <button class="popup-close" id="sa-all" style="border-color:#4ade80;color:#4ade80;margin-top:4px">📥 Положить всё (${haveInBag})</button>
    <button class="popup-close" id="pp-close" style="border-color:#64748b;color:#64748b;margin-top:4px">Закрыть</button>
  `;
  popup.classList.remove('hidden');

  const input = document.getElementById('shadow-add-input');

  document.getElementById('pp-close').addEventListener('click', hideItemPopup);
  document.getElementById('sa-add').addEventListener('click', () => {
    const amount = Math.max(0, parseInt(input.value) || 0);
    if (amount <= 0) { toast('Введи количество', 'epic'); return; }
    const r = addToShadow(hero, kind, key, amount);
    if (r.ok) { toast(`+${r.amount} в тень`, 'rare'); hideItemPopup(); renderShadowContent(); }
    else toast(r.reason || 'Нельзя', 'epic');
  });
  document.getElementById('sa-take').addEventListener('click', () => {
    const amount = Math.max(0, parseInt(input.value) || 0);
    if (amount <= 0) { toast('Введи количество', 'epic'); return; }
    const r = takeFromShadow(hero, kind, key, amount);
    if (r.ok) { toast(`-${r.amount} из тени`, 'rare'); hideItemPopup(); renderShadowContent(); }
    else toast(r.reason || 'Нельзя', 'epic');
  });
  document.getElementById('sa-all').addEventListener('click', () => {
    const r = addToShadow(hero, kind, key, haveInBag);
    if (r.ok) { toast(`+${r.amount} в тень`, 'rare'); hideItemPopup(); renderShadowContent(); }
    else toast(r.reason || 'Нельзя', 'epic');
  });
}

function addToShadow(hero, kind, key, amount) {
  const sh = hero.shadow;
  if (kind === 'soulshot') {
    const have = hero.soulshots[key] || 0;
    const take = Math.min(amount, have);
    if (take <= 0) return { ok: false, reason: 'Нет сосок' };
    hero.soulshots[key] -= take;
    sh.soulshots[key] = (sh.soulshots[key] || 0) + take;
    return { ok: true, amount: take };
  }
  if (kind === 'potion') {
    const have = hero.potions[key] || 0;
    const take = Math.min(amount, have);
    if (take <= 0) return { ok: false, reason: 'Нет зелий' };
    hero.potions[key] -= take;
    sh.potions[key] = (sh.potions[key] || 0) + take;
    return { ok: true, amount: take };
  }
  if (kind === 'scroll') {
    let taken = 0;
    for (let i = hero.backpack.length - 1; i >= 0 && taken < amount; i--) {
      const it = hero.backpack[i];
      if (it.kind === 'buff' && it.buffType === key) {
        const cnt = it.count || 1;
        const toTake = Math.min(cnt, amount - taken);
        if (toTake >= cnt) hero.backpack.splice(i, 1);
        else it.count -= toTake;
        taken += toTake;
      }
    }
    if (taken <= 0) return { ok: false, reason: 'Нет свитков' };
    sh.scrolls[key] = (sh.scrolls[key] || 0) + taken;
    return { ok: true, amount: taken };
  }
  return { ok: false, reason: 'Неизвестно' };
}

function takeFromShadow(hero, kind, key, amount) {
  const sh = hero.shadow;
  if (kind === 'soulshot') {
    const have = sh.soulshots[key] || 0;
    const take = Math.min(amount, have);
    if (take <= 0) return { ok: false, reason: 'В тени нет' };
    sh.soulshots[key] -= take;
    hero.soulshots[key] = (hero.soulshots[key] || 0) + take;
    return { ok: true, amount: take };
  }
  if (kind === 'potion') {
    const have = sh.potions[key] || 0;
    const take = Math.min(amount, have);
    if (take <= 0) return { ok: false, reason: 'В тени нет' };
    sh.potions[key] -= take;
    hero.potions[key] = (hero.potions[key] || 0) + take;
    return { ok: true, amount: take };
  }
  if (kind === 'scroll') {
    const have = sh.scrolls[key] || 0;
    const take = Math.min(amount, have);
    if (take <= 0) return { ok: false, reason: 'В тени нет' };
    sh.scrolls[key] -= take;
    const existing = hero.backpack.find(x => x.kind === 'buff' && x.buffType === key);
    if (existing) existing.count = (existing.count || 1) + take;
    else {
      const def = BUFF_SCROLLS[key];
      hero.backpack.push({
        id: Date.now() + Math.random(),
        kind: 'buff', buffType: key,
        name: def.name, icon: def.icon,
        slot: 'buff', grade: 'buff',
        count: take,
      });
    }
    return { ok: true, amount: take };
  }
  return { ok: false, reason: 'Неизвестно' };
}

function renderShadowDurability() {
  const hero = state.hero;
  const el = document.getElementById('shadow-durability');
  if (!el) return;
  const rows = [];
  let hasBroken = false;
  for (const slot of SLOTS) {
    const item = hero.shadow.equipment[slot];
    if (!item) continue;
    const dur = item.durability !== undefined ? item.durability : 100;
    const cost = getShadowRepairCost(hero, slot);
    const color = dur >= 80 ? '#4ade80' : dur >= 50 ? '#fbbf24' : '#ef4444';
    if (dur < 100) hasBroken = true;
    rows.push(`<div class="sd-row">
      <span class="sd-icon">${item.icon}</span>
      <span class="sd-name">${SLOT_NAMES[slot]}</span>
      <div class="sd-bar"><div class="sd-fill" style="width:${dur}%;background:${color}"></div></div>
      <span class="sd-val" style="color:${color}">${dur}%</span>
      <button class="sd-btn" data-repair="${slot}" ${dur >= 100 ? 'disabled' : ''}>🔧 ${cost}💰</button>
    </div>`);
  }
  const totalCost = getAllShadowRepairCost(hero);
  el.innerHTML = `
    <div class="sd-title">🔧 Прочность</div>
    ${rows.join('') || '<div class="hb-empty">Нет экипировки</div>'}
    ${hasBroken ? `<button class="sd-repair-all" id="shadow-repair-all">🔧 Починить всё: ${totalCost}💰</button>` : ''}
  `;
  el.querySelectorAll('[data-repair]').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.repair;
      const r = repairShadowItem(hero, slot);
      if (r.ok) { toast(`Починено за ${r.cost}💰`, 'rare'); renderShadowContent(); callbacks.onEquipChange && callbacks.onEquipChange(); }
      else toast('Недостаточно золота', 'epic');
    });
  });
  document.getElementById('shadow-repair-all')?.addEventListener('click', () => {
    const r = repairAllShadow(hero);
    if (r.ok) { toast(`Починено ${r.repaired} за ${r.cost}💰`, 'rare'); renderShadowContent(); callbacks.onEquipChange && callbacks.onEquipChange(); }
    else toast('Нечего чинить', 'epic');
  });
}

function renderShadowBackpack() {
  const hero = state.hero;
  const el = document.getElementById('shadow-backpack');
  if (!el) return;

  const equips = hero.backpack.filter(x => x.kind === 'equip');
  if (equips.length === 0) {
    el.innerHTML = '<div class="bp-empty">Рюкзак пуст (нет экипировки)</div>';
    return;
  }

  el.innerHTML = equips.map(item => {
    const gc = gradeColor(item.grade);
    const canEquip = item.slot === 'weapon'
      ? item.weaponType === hero.weaponType
      : true;
    return `<div class="sb-item" data-item-id="${item.id}" ${canEquip ? '' : 'style="opacity:0.4"'}>
      <div class="sb-icon">${item.icon}</div>
      <div class="sb-grade" style="color:${gc}">${gradeShort(item.grade)}</div>
      ${item.enhance > 0 ? `<span class="sb-enh">+${item.enhance}</span>` : ''}
      <div class="sb-name">${item.name}</div>
      <div class="sb-stats">${statsTwoMain(item)}</div>
    </div>`;
  }).join('');

  el.querySelectorAll('.sb-item').forEach(card => {
    card.addEventListener('click', () => {
      const itemId = parseInt(card.dataset.itemId);
      const item = hero.backpack.find(x => x.id === itemId);
      if (!item) return;
      showItemPopup(item, 'backpack');
    });
  });
}

// ===== ЗАТОЧКА =====
function renderEnhance() {
  const hero = state.hero;
  const hstats = document.getElementById('enhance-hero-stats');
  hstats.innerHTML = `
    <div class="ehs">⚔ <span>${Math.round(hero.attack)}</span></div>
    <div class="ehs">🛡 <span>${Math.round(hero.defense)}</span></div>
    <div class="ehs">❤ <span>${hero.maxHp}</span></div>
    <div class="ehs">📏 <span>${hero.range.toFixed(1)}</span></div>
    <div class="ehs">💥 <span>${hero.critChance.toFixed(0)}%</span></div>
    <div class="ehs">💨 <span>${hero.dodge.toFixed(0)}%</span></div>
    <div class="ehs">🩸 <span>${hero.lifesteal.toFixed(0)}%</span></div>
  `;
  const eqEl = document.getElementById('enhance-equipped');
  eqEl.innerHTML = '';
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    eqEl.appendChild(makeEnhanceItemEl(item));
  }
  const bpEl = document.getElementById('enhance-backpack');
  bpEl.innerHTML = '';
  for (const item of hero.backpack) {
    if (item.kind === 'blessed') continue;
    if (item.kind === 'buff') continue;
    if (item.kind === 'pass') continue;
    bpEl.appendChild(makeEnhanceItemEl(item));
  }
  if (enhanceSelectedItem && !isItemStillPresent(enhanceSelectedItem)) {
    enhanceSelectedItem = getNextBackpackItem(enhanceSelectedItem);
  }
  showEnhanceDetail(enhanceSelectedItem || null);
}

function isItemStillPresent(item) {
  const hero = state.hero;
  if (hero.backpack.indexOf(item) >= 0) return true;
  for (const slot of SLOTS) if (hero.equipment[slot] === item) return true;
  return false;
}

function makeEnhanceItemEl(item) {
  const el = document.createElement('div');
  el.className = 'enhance-item' + (enhanceSelectedItem === item ? ' selected' : '');
  el.dataset.itemId = item.id;
  el.style.borderColor = gradeColor(item.grade);
  const bonus = getEnhanceBonus(item);
  el.innerHTML = `
    <div class="ei-icon">${item.icon}</div>
    <div class="ei-enh" style="opacity:${item.enhance > 0 ? 1 : 0}">+${item.enhance}</div>
    <div class="ei-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
    <div class="ei-stats">${statsTwoMain(item)}</div>
    <div class="ei-bonus" style="color:#fbbf24;font-size:8px;font-weight:bold">${bonus ? bonus.icon + ' ' + bonus.display : ''}</div>
  `;
  el.addEventListener('click', () => {
    enhanceSelectedItem = item;
    document.querySelectorAll('.enhance-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    showEnhanceDetail(item);
  });
  return el;
}

function showEnhanceDetail(item) {
  const hero = state.hero;
  const detail = document.getElementById('enhance-detail');
  if (!item) {
    detail.dataset.itemId = '';
    detail.innerHTML = `
      <div class="eh-head"><span class="eh-icon" style="opacity:0.35">—</span><span class="eh-name" style="opacity:0.4">Выбери предмет</span></div>
      <div class="eh-body"><div class="row" style="opacity:0.35"><span>Заточка</span><span class="val">— / +${MAX_ENHANCE}</span></div></div>
      <div class="enhance-buttons">
        <button class="enhance-btn" disabled>⚒ Точить</button>
        <button class="enhance-btn blessed-btn" disabled>✨ Blessed</button>
      </div>
    `;
    return;
  }
  detail.dataset.itemId = item.id;
  const chance = item.enhance < MAX_ENHANCE ? (ENHANCE_CHANCE[item.enhance] ?? 0) : 0;
  const willBreak = willBreakAt(item.enhance);
  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  const isMax = item.enhance >= MAX_ENHANCE;
  const blessedCount = hero.backpack.filter(x => x.kind === 'blessed').reduce((sum, x) => sum + (x.count || 1), 0);
  const blessedAvailable = blessedCount > 0;
  const bonus = getEnhanceBonus(item);
  const nextBonus = item.enhance < MAX_ENHANCE ? getEnhanceBonus({ ...item, enhance: item.enhance + 1 }) : null;
  const bonusRow = bonus
    ? `<div class="row"><span>${bonus.icon} ${bonus.name}</span><span class="val good">${bonus.display}</span></div>${nextBonus && nextBonus.display !== bonus.display ? `<div class="row" style="opacity:0.6"><span>→ далее</span><span class="val">${nextBonus.display}</span></div>` : ''}`
    : '';
  detail.innerHTML = `
    <div class="eh-head"><span class="eh-icon">${item.icon}</span><span class="eh-name">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</span></div>
    <div class="eh-body">
      <div class="row"><span>Грейд</span><span class="val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
      <div class="row"><span>Заточка</span><span class="val">+${item.enhance} / +${MAX_ENHANCE}</span></div>
      ${bonusRow}
      ${isMax
        ? '<div class="row"><span>Максимум</span><span class="val good">✓</span></div>'
        : `<div class="row"><span>Шанс успеха</span><span class="val ${chance >= 0.5 ? 'good' : 'bad'}">${(chance*100).toFixed(0)}%</span></div>
           <div class="row"><span>Сгорание</span><span class="val ${willBreak ? 'bad' : 'good'}">${willBreak ? '🔥 Да' : '✓ Нет'}</span></div>
           <div class="row"><span>Свитков</span><span class="val ${scrollsHave > 0 ? '' : 'bad'}">${scrollsHave}</span></div>
           <div class="row"><span>Blessed ✨</span><span class="val ${blessedAvailable ? 'good' : 'bad'}">${blessedCount}</span></div>`}
    </div>
    <div class="enhance-buttons">
      <button class="enhance-btn" ${(isMax || scrollsHave <= 0) ? 'disabled' : ''}>⚒ Точить</button>
      <button class="enhance-btn blessed-btn" ${(isMax || scrollsHave <= 0 || !blessedAvailable) ? 'disabled' : ''}>✨ Blessed</button>
    </div>
  `;
  if (isMax) return;
  const btnN = detail.querySelector('.enhance-btn:not(.blessed-btn)');
  const btnB = detail.querySelector('.blessed-btn');
  bindEnhanceButton(btnN, () => enhanceSelectedItem, false);
  bindEnhanceButton(btnB, () => enhanceSelectedItem, true);
}

function playEnhanceAnim(result, item, blessedUsed) {
  const div = document.createElement('div');
  div.className = 'enhance-anim ' + (result === 'success' ? 'success' : result === 'fail' ? 'fail' : 'destroyed');
  div.textContent = result === 'success' ? `+${item.enhance}` : result === 'fail' ? 'FAIL' : '💥';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 900);
  if (result === 'success') toast(`Успех! +${item.enhance}`, 'legendary');
  else if (result === 'fail') toast(blessedUsed ? 'Провал (Blessed спас)' : 'Заточка провалилась', 'epic');
  else toast('💥 Предмет сгорел', 'unique');
}

function showBigEnhanceAnim(item, useBlessed) {
  const hero = state.hero;
  const overlay = document.createElement('div');
  overlay.className = 'enhance-overlay';
  const card = document.createElement('div');
  card.className = 'enhance-big-card';
  card.innerHTML = `<div class="ebc-inner"><div class="ebc-icon">${item.icon}</div><div class="ebc-enh" id="ebc-enh">+${item.enhance}</div><div class="ebc-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div></div>`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  setTimeout(() => {
    const r = tryEnhance(hero, item, useBlessed);
    const enhEl = card.querySelector('#ebc-enh');
    if (!r.ok) { overlay.remove(); toast('Нельзя', 'epic'); return; }
    if (r.result === 'success') { enhEl.textContent = '+' + item.enhance; enhEl.style.color = '#4ade80'; card.classList.add('glow-success'); toast(`Успех! +${item.enhance}`, 'legendary'); }
    else if (r.result === 'fail') { enhEl.textContent = 'FAIL'; enhEl.style.color = '#ef4444'; card.classList.add('glow-fail'); toast(useBlessed ? 'Провал (Blessed спас)' : 'Провал', 'epic'); }
    else { enhEl.textContent = '💥'; enhEl.style.color = '#dc2626'; card.classList.add('glow-destroyed'); toast('Предмет сгорел', 'unique'); enhanceSelectedItem = getNextBackpackItem(item, true); }
    callbacks.onEquipChange && callbacks.onEquipChange();
    setTimeout(() => { overlay.remove(); renderEnhance(); }, 1200);
  }, 2200);
}

// ===== МАГАЗИН =====
function renderShop() {
  const gradeInfo = document.getElementById('shop-grade-info');
  if (gradeInfo && shop.stock) gradeInfo.innerHTML = `Городской грейд: <b style="color:${gradeColor(shop.stock.grade)}">${gradeName(shop.stock.grade)}</b>`;
  const content = document.getElementById('shop-content');
  content.innerHTML = '';
  if (!shop.stock) return;
  if (shopCat === 'equipment') {
    for (const entry of shop.stock.equipment) {
      const realItem = callbacks.makeItem(shop.stock.grade, entry.slot, entry.weaponType, entry.variant);
      if (!realItem) continue;
      const s = itemStats(realItem);
      const statParts = [];
      for (const k of STAT_ORDER) if (s[k]) statParts.push(statLine(k, s[k]));
      const bonus = ENHANCE_BONUSES[realItem.slot];
      const bonusPreview = bonus ? `+15: ${bonus.icon} ${bonus.name} — ${bonus.format(bonus.getValue(15))}` : '';
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">${entry.icon}</div>
        <div class="auction-info">
          <div class="auction-name">${entry.name}</div>
          <div class="auction-stats">${statParts.join('')}</div>
          ${bonusPreview ? `<div class="auction-bonus">${bonusPreview}</div>` : ''}
        </div>
        <div class="auction-price">${entry.price}💰</div>
        <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
      `;
      bindBuyButton(row.querySelector('button'), (silent) => {
        const r = buyEquipment(shop, state.hero, state, entry.slot, entry.weaponType, entry.variant);
        if (r.ok) { toast(`🛒 ${entry.name}`, shop.stock.grade); if (!silent) renderShop(); callbacks.onEquipChange && callbacks.onEquipChange(); }
        else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
        return r;
      });
      content.appendChild(row);
    }
  } else if (shopCat === 'scrolls') {
    for (const type of ['weapon','armor']) {
      const entry = shop.stock.scrolls[type];
      const have = state.hero.scrolls[shop.stock.grade]?.[type] || 0;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">📜</div>
        <div class="auction-info">
          <div class="auction-name">Свиток заточки: ${type === 'weapon' ? 'Оружие' : 'Броня'}</div>
          <div class="auction-grade" style="color:${gradeColor(shop.stock.grade)}">${gradeName(shop.stock.grade)}</div>
          <div class="auction-stats"><span data-have="scroll:${type}">У тебя: ${have}</span></div>
        </div>
        <div class="auction-price">${entry.price}💰</div>
        <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
      `;
      bindBuyButton(row.querySelector('button'), (silent) => {
        const r = buyScroll(shop, state.hero, state, type);
        if (r.ok) { toast(`🛒 Свиток ${gradeName(shop.stock.grade)}`, shop.stock.grade); updateShopCounts(); if (!silent) renderShop(); callbacks.onEquipChange && callbacks.onEquipChange(); }
        else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
        return r;
      });
      content.appendChild(row);
    }
  } else if (shopCat === 'potions') {
    for (const type of POTION_ORDER) {
      const p = POTIONS[type];
      const have = state.hero.potions[type] || 0;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">${p.icon}</div>
        <div class="auction-info">
          <div class="auction-name">${p.name}</div>
          <div class="auction-grade" style="color:${p.color}">Восстанавливает ${p.heal} HP</div>
          <div class="auction-stats"><span data-have="potion:${type}">У тебя: ${have}</span></div>
        </div>
        <div class="auction-price">${p.price}💰</div>
        <button ${state.gold < p.price ? 'disabled' : ''}>Купить</button>
      `;
      bindBuyButton(row.querySelector('button'), (silent) => {
        const r = buyPotion(shop, state.hero, state, type);
        if (r.ok) { toast(`🛒 ${p.name}`, 'rare'); updateShopCounts(); if (!silent) renderShop(); callbacks.onEquipChange && callbacks.onEquipChange(); }
        else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
        return r;
      });
      content.appendChild(row);
    }
  } else if (shopCat === 'soulshots') {
    const entry = shop.stock.soulshots;
    const have = state.hero.soulshots[shop.stock.grade] || 0;
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML = `
      <div class="auction-icon">⚡</div>
      <div class="auction-info">
        <div class="auction-name">Соски ${gradeName(shop.stock.grade)}</div>
        <div class="auction-grade" style="color:${gradeColor(shop.stock.grade)}">Удваивают урон оружия</div>
        <div class="auction-stats"><span data-have="soulshot:${shop.stock.grade}">У тебя: ${have}</span><span>+10 шт.</span></div>
      </div>
      <div class="auction-price">${entry.price}💰</div>
      <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
    `;
    bindBuyButton(row.querySelector('button'), (silent) => {
      const r = buySoulshot(shop, state.hero, state);
      if (r.ok) { toast(`🛒 Соски ×10`, shop.stock.grade); updateShopCounts(); if (!silent) renderShop(); callbacks.onEquipChange && callbacks.onEquipChange(); }
      else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
      return r;
    });
    content.appendChild(row);
  }
}

// ===== АУКЦИОН =====
function renderAuction() {
  if (currentAuctionTab === 'buy') renderAuctionBuy();
  if (currentAuctionTab === 'sell') renderAuctionSell();
  if (currentAuctionTab === 'my') renderAuctionMy();
}

function renderAuctionBuy() {
  const el = document.getElementById('auction-buy');
  el.innerHTML = '';
  if (auction.listings.length === 0) { el.innerHTML = '<div class="empty-state">Нет лотов</div>'; return; }
  for (const l of auction.listings) {
    const item = l.item;
    const row = document.createElement('div');
    row.className = 'auction-row';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="auction-info">
        <div class="auction-name" style="color:${gradeColor(item.grade)}">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</div>
        <div class="auction-grade" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</div>
        <div class="auction-stats">${statsCompact(item)}</div>
        <div class="auction-seller">${l.sellerName}</div>
      </div>
      <div class="auction-price">${l.price} 💰</div>
      <button ${state.gold < l.price ? 'disabled' : ''}>Купить</button>
    `;
    row.addEventListener('click', (e) => { if (e.target.tagName !== 'BUTTON') showItemPopup(item, 'auction'); });
    bindBuyButton(row.querySelector('button'), (silent) => {
      const r = buyListing(auction, l.id, state.hero, state);
      if (r.ok) { toast(`🛒 ${item.name}`, item.grade); renderAuctionBuy(); callbacks.onEquipChange && callbacks.onEquipChange(); }
      else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
      return r;
    });
    el.appendChild(row);
  }
}

function renderAuctionSell() {
  const el = document.getElementById('auction-sell');
  el.innerHTML = '';
  const bp = state.hero.backpack;
  if (bp.length === 0) { el.innerHTML = '<div class="empty-state">Рюкзак пуст</div>'; return; }
  for (const item of bp) {
    const estimate = estimateItemValue(item);
    let statsLine = '';
    if (item.kind === 'blessed') statsLine = '<span style="color:#fbbf24;font-weight:bold">✨ Универсальный свиток</span>';
    else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; statsLine = `<span style="color:${def.color};font-weight:bold">${def.icon} ${def.desc}</span>`; }
    else if (item.kind === 'pass') statsLine = '<span style="color:#a855f7;font-weight:bold">🎫 Пропуск на арену</span>';
    else statsLine = statsCompact(item);
    const nameColor = item.kind === 'blessed' ? '#fbbf24' : item.kind === 'buff' ? BUFF_SCROLLS[item.buffType].color : item.kind === 'pass' ? '#a855f7' : gradeColor(item.grade);
    const row = document.createElement('div');
    row.className = 'sell-item-row';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="sell-info">
        <div class="sell-name" style="color:${nameColor}">${item.name}${item.count > 1 ? ' ×' + item.count : ''}${item.enhance > 0 ? ' +' + item.enhance : ''}</div>
        <div class="auction-stats">${statsLine}</div>
        <div class="sell-prices">Аукцион: ~${estimate}💰 · Боту: ${Math.floor(estimate*0.5)}💰</div>
      </div>
    `;
    row.addEventListener('click', () => showSellPopup(item));
    el.appendChild(row);
  }
}

function renderAuctionMy() {
  const el = document.getElementById('auction-my');
  el.innerHTML = '';
  if (auction.myListings.length === 0) { el.innerHTML = '<div class="empty-state">Пусто</div>'; return; }
  for (const l of auction.myListings) {
    const item = l.item;
    const total = 90;
    const pct = Math.max(0, Math.min(100, ((total - l.timeLeft) / total) * 100));
    const row = document.createElement('div');
    row.className = 'my-listing';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="sell-info" style="flex:1">
        <div class="sell-name">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</div>
        <div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
      </div>
      <div class="auction-price">${l.price} 💰</div>
    `;
    el.appendChild(row);
  }
}

function showSellPopup(item) {
  const estimate = estimateItemValue(item);
  const botPrice = Math.floor(estimate * 0.5);
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  let headInfo = '';
  if (item.kind === 'blessed') headInfo = '<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#fbbf24">✨ Blessed Scroll</span></div>';
  else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; headInfo = `<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:${def.color}">${def.desc}</span></div>`; }
  else if (item.kind === 'pass') headInfo = '<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#a855f7">🎫 Пропуск на арену</span></div>';
  else headInfo = `<div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>${statsMultiline(item)}`;
  body.innerHTML = `
    <div class="item-icon-big">${item.icon}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    ${headInfo}
    <div style="display:flex;gap:6px;margin-top:10px">
      <button class="popup-close" id="pp-auction" style="border-color:#4ade80;color:#4ade80;flex:1">Аукцион: ${estimate}💰</button>
      <button class="popup-close" id="pp-bot" style="border-color:#fbbf24;color:#fbbf24;flex:1">Боту: ${botPrice}💰</button>
    </div>
  `;
  popup.classList.remove('hidden');
  document.getElementById('pp-auction').addEventListener('click', () => {
    const r = listItem(auction, state.hero, item, estimate);
    if (r.ok) { toast(`Выставлено: ${item.name}`, 'rare'); hideItemPopup(); renderAuctionSell(); renderHero(); }
  });
  document.getElementById('pp-bot').addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) { state.gold += r.price; toast(`Продано: +${r.price}💰`, 'rare'); hideItemPopup(); renderAuctionSell(); renderHero(); callbacks.onEquipChange && callbacks.onEquipChange(); }
  });
}

export function showItemPopup(item, context) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  let actionBtns = '';
  if (context === 'backpack') {
    const can = canEquip(state.hero, item);
    const estimate = estimateItemValue(item);
    if (item.kind === 'equip') {
      actionBtns = `
        <button class="popup-close" id="pp-equip" ${can ? '' : 'disabled'}>${can ? 'Надеть' : 'Нельзя надеть'}</button>
        <button class="popup-close" id="pp-shadow-equip" style="border-color:#a855f7;color:#a855f7">👤 В тень</button>
      `;
    }
    actionBtns += `<button class="popup-close" id="pp-sell" style="border-color:#fbbf24;color:#fbbf24">Продать боту (${Math.floor(estimate*0.5)})</button>`;
  } else if (context === 'equip') {
    actionBtns = `<button class="popup-close" id="pp-unequip">Снять</button>`;
  } else if (context === 'shadow') {
    actionBtns = `<button class="popup-close" id="pp-shadow-unequip" style="border-color:#a855f7;color:#a855f7">👤 Снять с тени</button>`;
  }

  let extra = '';
  if (item.kind === 'equip' && item.durability !== undefined) {
    const color = item.durability >= 80 ? '#4ade80' : item.durability >= 50 ? '#fbbf24' : '#ef4444';
    extra += `<div class="stat-row"><span class="stat-name">🔧 Прочность</span><span class="stat-val" style="color:${color}">${item.durability}%</span></div>`;
  }
  const bonus = getEnhanceBonus(item);
  if (bonus) extra += `<div class="stat-row" style="color:#fbbf24"><span class="stat-name">${bonus.icon} ${bonus.name}</span><span class="stat-val">${bonus.display}</span></div>`;

  let bodyHtml = '';
  if (item.kind === 'pass') bodyHtml = `<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#a855f7">🎫 Пропуск на арену</span></div><div class="stat-row"><span class="stat-name">Описание</span><span class="stat-val">1 бой на арене</span></div>`;
  else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; bodyHtml = `<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:${def.color}">${def.desc}</span></div>`; }
  else if (item.kind === 'blessed') bodyHtml = `<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:#fbbf24">Спасает от сгорания</span></div>`;
  else bodyHtml = `<div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div><div class="stat-row"><span class="stat-name">Слот</span><span class="stat-val">${SLOT_NAMES[item.slot] || '—'}</span></div>${statsMultiline(item)}`;

  body.innerHTML = `
    <div class="item-icon-big">${item.icon}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    ${bodyHtml}${extra}${actionBtns}
    <button class="popup-close" id="pp-close" style="border-color:#64748b;color:#64748b">Закрыть</button>
  `;
  popup.classList.remove('hidden');

  document.getElementById('pp-close')?.addEventListener('click', hideItemPopup);
  document.getElementById('pp-equip')?.addEventListener('click', () => {
    const r = equipItem(state.hero, item);
    if (r.ok) { hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
    else if (r.reason === 'class') toast('Это оружие другого класса', 'epic');
    else toast('Нельзя надеть', 'epic');
  });
  document.getElementById('pp-shadow-equip')?.addEventListener('click', () => {
    const r = equipShadowItem(state.hero, item);
    if (r.ok) { hideItemPopup(); toast('👤 Надето на тень', 'rare'); renderHero(); }
    else toast('Нельзя надеть', 'epic');
  });
  document.getElementById('pp-sell')?.addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) { state.gold += r.price; toast(`Продано: +${r.price}💰`, 'rare'); hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
  });
  document.getElementById('pp-unequip')?.addEventListener('click', () => {
    const r = unequipItem(state.hero, item.slot);
    if (r.ok) { hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
  });
  document.getElementById('pp-shadow-unequip')?.addEventListener('click', () => {
    const r = unequipShadowItem(state.hero, item.slot);
    if (r.ok) { hideItemPopup(); toast('👤 Снято с тени', 'rare'); renderHero(); }
  });
}

export function hideItemPopup() {
  document.getElementById('item-popup').classList.add('hidden');
}

export function toast(text, cls = '') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2000);
  while (container.children.length > 6) container.removeChild(container.firstChild);
}

// ===== АРЕНА =====
export function openArena() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  const modal = document.getElementById('modal-arena');
  if (!modal) return;
  modal.classList.remove('hidden');
  arenaScreen = 'list';
  renderArena();
}

function renderArena() {
  renderArenaProfile();
  renderArenaList();
  renderArenaHistory();
  renderArenaChests();
}

function renderArenaProfile() {
  const hero = state.hero;
  const el = document.getElementById('arena-profile');
  if (!el) return;
  const rating = hero.arena.rating;
  const tier = getTier(rating);
  const myDur = avgShadowDurability(hero);
  const passes = hero.backpack.filter(x => x.kind === 'pass').reduce((s,x) => s + (x.count||1), 0);
  el.innerHTML = `
    <div class="ap-rating">Рейтинг: <b>${rating}</b></div>
    <div class="ap-tier" style="color:${tier.color}">${tier.icon} ${tier.name}</div>
    <div class="ap-record">⚔ ${hero.arena.wins} · 💀 ${hero.arena.losses}</div>
  `;
}

function getTier(rating) {
  if (rating < 1000) return { name: 'Бронза III', icon: '🥉', color: '#94a3b8' };
  if (rating < 1200) return { name: 'Бронза II', icon: '🥉', color: '#94a3b8' };
  if (rating < 1400) return { name: 'Бронза I', icon: '🥉', color: '#cd7f32' };
  if (rating < 1600) return { name: 'Серебро', icon: '🥈', color: '#c0c0c0' };
  if (rating < 1800) return { name: 'Золото', icon: '🥇', color: '#ffd700' };
  if (rating < 2000) return { name: 'Платина', icon: '💎', color: '#a855f7' };
  return { name: 'Легенда', icon: '👑', color: '#ef4444' };
}

function renderArenaList() {
  const hero = state.hero;
  const el = document.getElementById('arena-list');
  if (!el) return;

  if (!arena || !arena.bots || arena.bots.length === 0) {
    el.innerHTML = '<div class="empty-state">Боты не загружены</div>';
    return;
  }

  const all = [];
  for (const bot of arena.bots) all.push({ type: 'bot', bot, rating: bot.rating });
  all.push({ type: 'me', rating: hero.arena.rating });
  all.sort((a, b) => b.rating - a.rating);

  const passes = hero.backpack.filter(x => x.kind === 'pass').reduce((s,x) => s + (x.count||1), 0);
  const myAvgDur = avgShadowDurability(hero);
  const myDurColor = myAvgDur >= 80 ? '#4ade80' : myAvgDur >= 50 ? '#fbbf24' : '#ef4444';
  const myClassIcon = hero.classType === 'mage' ? '🔮' : '🏹';

  el.innerHTML = all.map((entry, i) => {
    const place = i + 1;
    if (entry.type === 'me') {
      return `<div class="arena-row arena-row-me">
        <span class="ar-place">#${place}</span>
        <span class="ar-class">${myClassIcon}</span>
        <span class="ar-name">⭐ ${hero.name} (ты)</span>
        <span class="ar-level">Lv.${hero.level}</span>
        <span class="ar-dur">${durabilityBar(myAvgDur)}</span>
        <span class="ar-rating">${entry.rating}</span>
        <span class="ar-rest">🎫 ${passes}</span>
      </div>`;
    }
    const bot = entry.bot;
    const avgDur = avgDurability(bot);
    const classIcon = bot.classType === 'mage' ? '🔮' : '🏹';
    const level = bot.level || (1 + Math.floor(bot.rating / 30));
    const expected = expectedScore(hero.arena.rating, bot.rating);
    const winChange = Math.round(32 * (1 - expected));
    const loseChange = Math.round(32 * (0 - (1 - expected)));

    return `<div class="arena-row arena-row-bot">
      <span class="ar-place">#${place}</span>
      <span class="ar-class">${classIcon}</span>
      <span class="ar-name">${bot.name}</span>
      <span class="ar-level">Lv.${level}</span>
      <span class="ar-dur">${durabilityBar(avgDur)}</span>
      <span class="ar-rating">${bot.rating}</span>
      <span class="ar-change">${winChange >= 0 ? '+' : ''}${winChange}/${loseChange}</span>
      <button class="ar-btn" data-fight="${bot.id}" ${passes <= 0 ? 'disabled' : ''}>Сравнить</button>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-fight]').forEach(btn => {
    btn.addEventListener('click', () => {
      const botId = parseInt(btn.dataset.fight);
      openCompareModal(botId);
    });
  });
}

// ===== СРАВНЕНИЕ =====
function openCompareModal(botId) {
  const hero = state.hero;
  const bot = arena.bots.find(b => b.id === botId);
  if (!bot) { toast('Бот не найден', 'epic'); return; }

  compareBotId = botId;

  const myStats = getShadowStats(hero);
  const oppStats = getBotStats(bot);
  const expected = expectedScore(hero.arena.rating, bot.rating);
  const winChange = Math.round(32 * (1 - expected));
  const loseChange = Math.round(32 * (0 - (1 - expected)));
  const passes = hero.backpack.filter(x => x.kind === 'pass').reduce((s,x) => s + (x.count||1), 0);

  const modal = document.getElementById('modal-compare');
  const body = document.getElementById('compare-body');
  if (!modal || !body) return;

  // Твои расходники
  const mySS = Object.values(hero.shadow.soulshots || {}).reduce((a,b) => a+b, 0);
  const myPot = Object.values(hero.shadow.potions || {}).reduce((a,b) => a+b, 0);
  const myScr = Object.values(hero.shadow.scrolls || {}).reduce((a,b) => a+b, 0);

  // Расходники бота
  const oppSS = Object.values(bot.soulshots || {}).reduce((a,b) => a+b, 0);
  const oppPot = Object.values(bot.potions || {}).reduce((a,b) => a+b, 0);
  const oppScr = Object.values(bot.activeBuffs || {}).filter(x => x).length;

  const myDur = avgShadowDurability(hero);
  const oppDur = avgDurability(bot);

  // Функция сравнения статов
  const compare = (label, icon, my, opp, suffix = '') => {
    const myN = Math.round(my * 10) / 10;
    const oppN = Math.round(opp * 10) / 10;
    let myClass = '', oppClass = '';
    if (myN > oppN) { myClass = 'cmp-good'; oppClass = 'cmp-bad'; }
    else if (myN < oppN) { myClass = 'cmp-bad'; oppClass = 'cmp-good'; }
    return `<div class="cmp-row">
      <span class="cmp-val ${myClass}">${myN}${suffix}</span>
      <span class="cmp-label">${icon} ${label}</span>
      <span class="cmp-val ${oppClass}">${oppN}${suffix}</span>
    </div>`;
  };

  body.innerHTML = `
    <div class="cmp-header">
      <div class="cmp-side">
        <div class="cmp-avatar battle-archer">${hero.emoji}</div>
        <div class="cmp-name">${hero.name}</div>
        <div class="cmp-level">Lv.${hero.level} · ${hero.classType === 'mage' ? '🔮' : '🏹'}</div>
        <div class="cmp-dur">${durabilityBar(myDur)}</div>
      </div>
      <div class="cmp-vs">VS</div>
      <div class="cmp-side">
        <div class="cmp-avatar ${bot.classType === 'mage' ? 'battle-mage' : 'battle-archer'}">${bot.classType === 'mage' ? '🔮' : '🏹'}</div>
        <div class="cmp-name">${bot.name}</div>
        <div class="cmp-level">Lv.${bot.level || (1 + Math.floor(bot.rating / 30))} · ${bot.classType === 'mage' ? '🔮' : '🏹'}</div>
        <div class="cmp-dur">${durabilityBar(oppDur)}</div>
      </div>
    </div>

    <div class="cmp-section">
      <div class="cmp-title">📊 Статы</div>
      ${compare('Атака', '⚔', myStats.attack, oppStats.attack)}
      ${compare('Защита', '🛡', myStats.defense, oppStats.defense)}
      ${compare('HP', '❤', myStats.maxHp, oppStats.maxHp)}
      ${compare('Крит шанс', '💥', myStats.critChance, oppStats.critChance, '%')}
      ${compare('Крит урон', '💢', myStats.critDamage, oppStats.critDamage, '%')}
      ${compare('Скор. атаки', '⚡', myStats.attackSpeed, oppStats.attackSpeed)}
      ${compare('Уворот', '💨', myStats.dodge, oppStats.dodge, '%')}
      ${compare('Вампиризм', '🩸', myStats.lifesteal, oppStats.lifesteal, '%')}
      ${compare('Точность', '🎯', myStats.accuracy, oppStats.accuracy, '%')}
      ${compare('Пробитие', '🔨', myStats.armorPen, oppStats.armorPen, '%')}
      ${compare('Сопр. криту', '🛡️', myStats.critResist, oppStats.critResist, '%')}
    </div>

    <div class="cmp-section">
      <div class="cmp-title">🎒 Ресурсы</div>
      <div class="cmp-row">
        <span class="cmp-val">⚡${mySS} 🧪${myPot} 🗡${myScr}</span>
        <span class="cmp-label">Расходники</span>
        <span class="cmp-val">⚡${oppSS} 🧪${oppPot} 🗡${oppScr}</span>
      </div>
    </div>

    <div class="cmp-reward">
      <div class="cmp-reward-win">🏆 Победа: <b>+${winChange}</b> рейтинга</div>
      <div class="cmp-reward-lose">💀 Поражение: <b>${loseChange}</b> рейтинга</div>
    </div>

    <div class="cmp-buttons">
      <button class="cmp-btn cmp-btn-fight" id="cmp-fight" ${passes <= 0 ? 'disabled' : ''}>
        ${passes > 0 ? `🎫 Атаковать (${passes})` : '🎫 Нет пропуска'}
      </button>
      <button class="cmp-btn cmp-btn-back" id="cmp-back">← Назад</button>
    </div>
  `;

  modal.classList.remove('hidden');

  document.getElementById('cmp-back').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  document.getElementById('cmp-fight').addEventListener('click', () => {
    modal.classList.add('hidden');
    startArenaFight(botId);
  });
}

// ===== БОЙ =====
function startArenaFight(botId) {
  const hero = state.hero;
  const passIdx = hero.backpack.findIndex(x => x.kind === 'pass');
  if (passIdx < 0) { toast('Нет пропуска на арену!', 'epic'); return; }
  const pass = hero.backpack[passIdx];
  if (pass.count > 1) pass.count--;
  else hero.backpack.splice(passIdx, 1);

  const bot = arena.bots.find(b => b.id === botId);
  if (!bot) { toast('Бот не найден', 'epic'); return; }

  const result = fightBot(hero, bot);
  if (!result.ok) { toast('Ошибка боя: ' + result.reason, 'epic'); return; }

  lastArenaResult = result;
  arenaScreen = 'result';
  document.querySelectorAll('#arena-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.arena-tab-content').forEach(c => c.classList.add('hidden'));
  document.getElementById('arena-tab-result').classList.remove('hidden');
  renderArenaResult();
  callbacks.onEquipChange && callbacks.onEquipChange();
}

let _battleAnim = null;

function renderArenaResult() {
  const hero = state.hero;
  const el = document.getElementById('arena-result');
  const r = lastArenaResult;
  if (!r) { el.innerHTML = ''; return; }

  const b = r.battle;
  const win = b.result === 'win';
  const loss = b.result === 'loss';
  const color = win ? '#4ade80' : loss ? '#ef4444' : '#94a3b8';
  const title = win ? '🏆 Победа!' : loss ? '💀 Поражение' : '🤝 Ничья';

  const myCls = b.myClass === 'mage' ? 'battle-mage' : 'battle-archer';
  const oppCls = b.oppClass === 'mage' ? 'battle-mage' : 'battle-archer';

  el.innerHTML = `
    <div class="ar-result-title" style="color:${color}">${title}</div>

    <div class="battle-arena" id="battle-arena">
      <div class="battle-side battle-side-me">
        <div class="battle-hero ${myCls}" id="battle-hero-me">
          <div class="battle-emoji">${b.myEmoji}</div>
          <div class="battle-name">${b.myName}</div>
        </div>
        <div class="battle-hp-bar">
          <div class="battle-hp-fill" id="battle-hp-me" style="width:100%;background:#4ade80"></div>
          <div class="battle-hp-text" id="battle-hp-me-text">${b.myMaxHp} / ${b.myMaxHp}</div>
        </div>
      </div>

      <div class="battle-vs">VS</div>

      <div class="battle-side battle-side-opp">
        <div class="battle-hero ${oppCls}" id="battle-hero-opp">
          <div class="battle-emoji">${b.oppEmoji}</div>
          <div class="battle-name">${b.oppName}</div>
        </div>
        <div class="battle-hp-bar">
          <div class="battle-hp-fill" id="battle-hp-opp" style="width:100%;background:#4ade80"></div>
          <div class="battle-hp-text" id="battle-hp-opp-text">${b.oppMaxHp} / ${b.oppMaxHp}</div>
        </div>
      </div>
    </div>

    <div class="battle-controls">
      <button class="battle-btn" id="battle-skip">⏭ Пропустить</button>
      <span class="battle-timer" id="battle-timer">0.0 сек</span>
    </div>

    <div class="battle-log" id="battle-log"></div>

    <div class="ar-result-info" id="ar-result-info" style="display:none">
      <div>Рейтинг: ${r.oldRating} → <b style="color:${r.ratingChange > 0 ? '#4ade80' : '#ef4444'}">${r.newRating}</b> (${r.ratingChange > 0 ? '+' : ''}${r.ratingChange})</div>
      <div>Прочность тени: -${r.durabilityLoss}%</div>
      <div>Соски: ${r.usedSoulshots}, Зелья: ${r.usedPotions}</div>
    </div>

    <button class="ar-back-btn" id="ar-back">← К списку</button>
  `;

  document.getElementById('ar-back').addEventListener('click', () => {
    if (_battleAnim) { clearTimeout(_battleAnim); _battleAnim = null; }
    arenaScreen = 'list';
    document.querySelectorAll('#arena-tabs .tab-btn').forEach(b2 => b2.classList.toggle('active', b2.dataset.arenaTab === 'list'));
    document.querySelectorAll('.arena-tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById('arena-tab-list').classList.remove('hidden');
    renderArena();
  });

  playBattleAnimation(b);
}

function playBattleAnimation(battle) {
  const log = battle.log;
  const logEl = document.getElementById('battle-log');
  const timerEl = document.getElementById('battle-timer');
  const hpMe = document.getElementById('battle-hp-me');
  const hpOpp = document.getElementById('battle-hp-opp');
  const hpMeText = document.getElementById('battle-hp-me-text');
  const hpOppText = document.getElementById('battle-hp-opp-text');
  const heroMe = document.getElementById('battle-hero-me');
  const heroOpp = document.getElementById('battle-hero-opp');
  const skipBtn = document.getElementById('battle-skip');

  if (!logEl) return;
  logEl.innerHTML = '';

  let currentIdx = 0;
  let skipped = false;

  const myName = battle.myName;
  const oppName = battle.oppName;

  function finish() {
    if (skipped) return;
    skipped = true;

    hpMe.style.width = Math.max(0, battle.myHpLeft / battle.myMaxHp * 100) + '%';
    hpOpp.style.width = Math.max(0, battle.oppHpLeft / battle.oppMaxHp * 100) + '%';
    hpMe.style.background = battle.myHpLeft / battle.myMaxHp > 0.3 ? '#4ade80' : '#ef4444';
    hpOpp.style.background = battle.oppHpLeft / battle.oppMaxHp > 0.3 ? '#4ade80' : '#ef4444';
    hpMeText.textContent = `${battle.myHpLeft} / ${battle.myMaxHp}`;
    hpOppText.textContent = `${battle.oppHpLeft} / ${battle.oppMaxHp}`;
    timerEl.textContent = 'Бой завершён';

    document.getElementById('ar-result-info').style.display = '';
    skipBtn.disabled = true;
    skipBtn.textContent = '✓ Завершено';

    if (battle.result === 'win') {
      heroOpp.classList.add('battle-dead');
      heroMe.classList.add('battle-win');
    } else if (battle.result === 'loss') {
      heroMe.classList.add('battle-dead');
      heroOpp.classList.add('battle-win');
    }

    setTimeout(() => showCardRewards(), 500);
  }

  skipBtn.addEventListener('click', () => {
    if (skipped) return;
    while (currentIdx < log.length) {
      appendLogEntry(log[currentIdx]);
      currentIdx++;
    }
    finish();
  });

  function appendLogEntry(entry) {
    const line = document.createElement('div');
    const t = entry.time.toFixed(1);

    if (entry.miss) {
      const who = entry.side === 'me' ? myName : oppName;
      const target = entry.side === 'me' ? oppName : myName;
      line.className = 'bl-miss';
      line.innerHTML = `<span class="bl-time">${t}с</span> <span class="bl-who">${who}</span> → <span class="bl-target">${target}</span>: <span class="bl-miss-text">промах</span>`;
    } else if (entry.potion) {
      const who = entry.side === 'me' ? myName : oppName;
      line.className = 'bl-potion';
      line.innerHTML = `<span class="bl-time">${t}с</span> <span class="bl-who">${who}</span>: <span class="bl-potion-text">🧪 выпил зелье +${entry.potion}</span>`;
    } else {
      const who = entry.side === 'me' ? myName : oppName;
      const target = entry.side === 'me' ? oppName : myName;
      line.className = 'bl-dmg' + (entry.crit ? ' bl-crit' : '');
      const critText = entry.crit ? ' <span class="bl-crit-mark">💥 КРИТ</span>' : '';
      const soulshot = entry.usedSoulshot ? ' <span class="bl-soulshot">⚡</span>' : '';
      line.innerHTML = `<span class="bl-time">${t}с</span> <span class="bl-who">${who}</span> → <span class="bl-target">${target}</span>: <span class="bl-dmg-text">−${entry.dmg}</span>${critText}${soulshot}`;
    }

    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
    while (logEl.children.length > 50) logEl.removeChild(logEl.firstChild);
  }

  function step() {
    if (skipped) return;
    if (currentIdx >= log.length) { finish(); return; }

    const entry = log[currentIdx];
    appendLogEntry(entry);

    if (entry.myHp !== undefined && entry.myMaxHp) {
      const pct = Math.max(0, entry.myHp / entry.myMaxHp * 100);
      hpMe.style.width = pct + '%';
      hpMe.style.background = pct > 30 ? '#4ade80' : '#ef4444';
      hpMeText.textContent = `${entry.myHp} / ${entry.myMaxHp}`;
    }
    if (entry.oppHp !== undefined && entry.oppMaxHp) {
      const pct = Math.max(0, entry.oppHp / entry.oppMaxHp * 100);
      hpOpp.style.width = pct + '%';
      hpOpp.style.background = pct > 30 ? '#4ade80' : '#ef4444';
      hpOppText.textContent = `${entry.oppHp} / ${entry.oppMaxHp}`;
    }

    timerEl.textContent = `${entry.time.toFixed(1)} сек`;

    if (entry.side === 'me') {
      heroMe.classList.add('battle-attack-right');
      heroOpp.classList.add('battle-hit');
      setTimeout(() => {
        heroMe.classList.remove('battle-attack-right');
        heroOpp.classList.remove('battle-hit');
      }, 200);
    } else if (entry.side === 'opp') {
      heroOpp.classList.add('battle-attack-left');
      heroMe.classList.add('battle-hit');
      setTimeout(() => {
        heroOpp.classList.remove('battle-attack-left');
        heroMe.classList.remove('battle-hit');
      }, 200);
    }

    if (entry.crit) {
      const flash = document.createElement('div');
      flash.className = 'battle-flash';
      flash.textContent = '💥';
      (entry.side === 'me' ? heroOpp : heroMe).appendChild(flash);
      setTimeout(() => flash.remove(), 400);
    }

    currentIdx++;
    _battleAnim = setTimeout(step, 250);
  }

  step();
}

// ===== КАРТОЧКИ НАГРАД =====
function showCardRewards() {
  const hero = state.hero;
  const r = lastArenaResult;
  if (!r) return;

  const oldOverlay = document.getElementById('reward-overlay');
  if (oldOverlay) oldOverlay.remove();

  const won = r.battle.result === 'win';
  const rewards = rollCardRewards(won, CITIES[state.currentCity].grade);

  const overlay = document.createElement('div');
  overlay.id = 'reward-overlay';
  overlay.className = 'reward-overlay';
  overlay.innerHTML = `
    <div class="reward-panel">
      <div class="reward-title">🎁 Выбери награду</div>
      <div class="reward-cards">
        ${rewards.map((reward, i) => `
          <div class="reward-card card-${reward.rarity}" data-idx="${i}" style="animation-delay:${i * 0.15}s">
            <div class="card-glow"></div>
            <div class="card-icon">${reward.icon}</div>
            <div class="card-name">${reward.name}</div>
            <div class="card-rarity">${getRarityLabel(reward.rarity)}</div>
          </div>
        `).join('')}
      </div>
      <div class="reward-hint">Нажми на карточку</div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('.reward-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('card-picked')) return;
      const idx = parseInt(card.dataset.idx);
      const reward = rewards[idx];

      overlay.querySelectorAll('.reward-card').forEach(c => {
        if (c === card) c.classList.add('card-picked');
        else c.classList.add('card-dimmed');
      });

      applyCardReward(hero, reward);

      setTimeout(() => {
        overlay.classList.add('reward-closing');
        setTimeout(() => overlay.remove(), 300);
      }, 1200);
    });
  });
}

function getRarityLabel(rarity) {
  if (rarity === 'common') return 'Обычная';
  if (rarity === 'rare') return 'Редкая';
  if (rarity === 'epic') return 'Эпическая';
  if (rarity === 'legendary') return 'Легендарная';
  return '';
}

function applyCardReward(hero, reward) {
  const cityGrade = CITIES[state.currentCity].grade;
  let msg = '';

  if (reward.gold) {
    state.gold += reward.gold;
    msg = `+${reward.gold} золота`;
  }
  if (reward.scrolls) {
    if (!hero.scrolls[cityGrade]) hero.scrolls[cityGrade] = { weapon: 0, armor: 0 };
    hero.scrolls[cityGrade].weapon += reward.scrolls;
    msg = `+${reward.scrolls} свитков заточки`;
  }
  if (reward.blessed) {
    const existing = hero.backpack.find(x => x.kind === 'blessed');
    if (existing) existing.count = (existing.count || 1) + reward.blessed;
    else hero.backpack.push({
      id: Date.now() + Math.random(),
      kind: 'blessed', name: 'Blessed Scroll', icon: '✨',
      slot: 'blessed', grade: 'any', count: reward.blessed,
    });
    msg = `+${reward.blessed} Blessed`;
  }
  if (reward.passes) {
    const existing = hero.backpack.find(x => x.kind === 'pass');
    if (existing) existing.count = (existing.count || 1) + reward.passes;
    else hero.backpack.push({
      id: Date.now() + Math.random(),
      kind: 'pass', name: 'Пропуск на арену', icon: '🎫',
      slot: 'pass', grade: 'any', count: reward.passes,
    });
    msg = `+${reward.passes} пропуск(а)`;
  }
  if (reward.item) {
    const grade = reward.rareItem ? getHigherGrade(cityGrade) : cityGrade;
    const slots = SLOTS;
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const weaponType = slot === 'weapon' ? hero.weaponType : null;
    const variants = getVariantsForSlot(slot, weaponType);
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const item = createItem(grade, slot, weaponType, variant);
    if (item) {
      hero.backpack.push(item);
      msg = `${item.icon} ${item.name}`;
    }
  }

  toast(`🎁 ${msg}`, 'legendary');
  callbacks.onEquipChange && callbacks.onEquipChange();
}

function getHigherGrade(grade) {
  const order = ['ng','d','c','b','a','s'];
  const idx = order.indexOf(grade);
  return order[Math.min(idx + 1, order.length - 1)] || grade;
}

function renderArenaTab(tab) {
  if (tab === 'list') renderArenaList();
  if (tab === 'history') renderArenaHistory();
  if (tab === 'chests') renderArenaChests();
}

function renderArenaHistory() {
  const hero = state.hero;
  const el = document.getElementById('arena-history');
  if (!el) return;
  if (hero.arena.history.length === 0) { el.innerHTML = '<div class="empty-state">История боёв пуста</div>'; return; }
  el.innerHTML = hero.arena.history.map(h => {
    const resultText = h.result === 'win' ? '🏆 Победа' : h.result === 'loss' ? '💀 Поражение' : '🤝 Ничья';
    const color = h.result === 'win' ? '#4ade80' : h.result === 'loss' ? '#ef4444' : '#94a3b8';
    const sign = h.change > 0 ? '+' : '';
    return `<div class="ah-row">
      <span style="color:${color}">${resultText}</span>
      <span>vs ${h.botName} (${h.botRating})</span>
      <span style="color:${h.change > 0 ? '#4ade80' : '#ef4444'}">${sign}${h.change}</span>
    </div>`;
  }).join('');
}

function renderArenaChests() {
  const hero = state.hero;
  const el = document.getElementById('arena-chests');
  if (!el) return;
  el.innerHTML = RATING_CHESTS.map(chest => {
    const claimed = hero.arena.claimedChests.includes(chest.id);
    const canClaim = hero.arena.rating >= chest.rating && !claimed;
    let status = '';
    if (claimed) status = '<span class="ac-claimed">✓ Получено</span>';
    else if (canClaim) status = `<button class="ac-btn" data-claim="${chest.id}">Забрать</button>`;
    else status = `<span class="ac-locked">🔒 ${chest.rating}</span>`;
    return `<div class="ac-row ${canClaim ? 'ac-ready' : ''}">
      <span class="ac-icon">${chest.icon}</span>
      <span class="ac-name">${chest.name}</span>
      <span class="ac-info">${chest.gold}💰 · ${chest.scrolls}📜 · ${chest.blessed}✨ · ${chest.passes}🎫</span>
      ${status}
    </div>`;
  }).join('');

  el.querySelectorAll('[data-claim]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chestId = btn.dataset.claim;
      const r = claimChest(hero, chestId);
      if (r.ok) {
        state.gold += r.rewards.gold;
        if (r.rewards.scrolls) {
          const g = CITIES[state.currentCity].grade;
          if (!hero.scrolls[g]) hero.scrolls[g] = { weapon: 0, armor: 0 };
          hero.scrolls[g].weapon += r.rewards.scrolls;
        }
        if (r.rewards.blessed) {
          const existing = hero.backpack.find(x => x.kind === 'blessed');
          if (existing) existing.count = (existing.count || 1) + r.rewards.blessed;
          else hero.backpack.push({ id: Date.now(), kind: 'blessed', name: 'Blessed Scroll', icon: '✨', slot: 'blessed', grade: 'any', count: r.rewards.blessed });
        }
        if (r.rewards.passes) {
          const existing = hero.backpack.find(x => x.kind === 'pass');
          if (existing) existing.count = (existing.count || 1) + r.rewards.passes;
          else hero.backpack.push({ id: Date.now(), kind: 'pass', name: 'Пропуск на арену', icon: '🎫', slot: 'pass', grade: 'any', count: r.rewards.passes });
        }
        toast(`🎁 ${r.chest.name} сундук открыт!`, 'legendary');
        renderArenaChests();
        callbacks.onEquipChange && callbacks.onEquipChange();
      }
    });
  });
}

// ===== ГОРОД =====
export function renderCityScreen() {
  const city = CITIES[state.currentCity];
  document.getElementById('city-name').textContent = city.name;
  document.getElementById('city-sub').textContent = city.sub;
  const gradeEl = document.getElementById('city-grade');
  gradeEl.textContent = gradeName(city.grade);
  gradeEl.style.color = gradeColor(city.grade);
  const lsEl = document.getElementById('last-session');
  if (lsEl) {
    if (state.lastSession && (state.lastSession.kills > 0 || state.lastSession.gold > 0)) {
      lsEl.classList.remove('hidden');
      document.getElementById('ls-zone').textContent = state.lastSession.zone;
      document.getElementById('ls-gold').textContent = state.lastSession.gold;
      document.getElementById('ls-xp').textContent = state.lastSession.xp;
      document.getElementById('ls-kills').textContent = state.lastSession.kills;
      document.getElementById('ls-items').textContent = state.lastSession.items;
      document.getElementById('ls-scrolls').textContent = state.lastSession.scrolls;
      document.getElementById('ls-blessed').textContent = state.lastSession.blessed;
    } else lsEl.classList.add('hidden');
  }
  const zonesEl = document.getElementById('city-zones');
  zonesEl.innerHTML = '';
  for (const zone of city.zones) {
    const card = document.createElement('div');
    card.className = 'zone-card zone-' + zone.diff;
    card.innerHTML = `
      <div class="zone-name">${zone.name}</div>
      <div class="zone-diff">${zoneDifficultyLabel(zone.diff)}</div>
      <div class="zone-cost">Телепорт: ${zone.teleportCost}💰</div>
    `;
    card.addEventListener('click', () => {
      if (state.gold < zone.teleportCost) { toast('Недостаточно золота', 'epic'); return; }
      callbacks.onEnterZone && callbacks.onEnterZone(zone.id);
    });
    zonesEl.appendChild(card);
  }
}

export function showCityScreen() {
  document.getElementById('city-screen').classList.remove('hidden');
  document.getElementById('hud-top').classList.remove('hidden');
  document.getElementById('hud-stats').classList.remove('hidden');
  document.getElementById('hud-zone').classList.add('hidden');
  document.getElementById('hud-actions').classList.add('hidden');
  document.getElementById('combat-log').classList.add('hidden');
  renderCityScreen();
}

export function hideCityScreen() {
  document.getElementById('city-screen').classList.add('hidden');
  document.getElementById('hud-top').classList.remove('hidden');
  document.getElementById('hud-stats').classList.remove('hidden');
  document.getElementById('hud-zone').classList.remove('hidden');
  document.getElementById('hud-actions').classList.remove('hidden');
  document.getElementById('combat-log').classList.remove('hidden');
}

function renderTeleport() {
  const list = document.getElementById('teleport-list');
  list.innerHTML = '';
  const curCity = CITIES[state.currentCity];
  for (const id of CITY_ORDER) {
    const city = CITIES[id];
    const current = id === state.currentCity;
    const cost = cityTeleportCost(curCity.tier, city.tier);
    const el = document.createElement('div');
    el.className = 'map-item' + (current ? ' current' : '');
    el.innerHTML = `
      <div class="map-item-name">${city.name}</div>
      <div class="map-item-sub">${city.sub}</div>
      <div class="map-item-level" style="color:${gradeColor(city.grade)}">Грейд: ${gradeName(city.grade)}</div>
      ${current ? '<div class="map-item-level">● Текущий город</div>' : `<div class="map-item-level">Телепорт: ${cost}💰</div>`}
    `;
    if (!current) {
      el.addEventListener('click', () => {
        if (state.gold < cost) { toast('Недостаточно золота', 'epic'); return; }
        callbacks.onTravelToCity && callbacks.onTravelToCity(id, cost);
        closeModal('teleport');
      });
    }
    list.appendChild(el);
  }
}

export function tickUIPanels() {}
export function refreshUI() {}