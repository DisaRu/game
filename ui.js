import { SLOTS, SLOT_NAMES, STAT_NAMES, STAT_SUFFIX, POTION_ORDER, POTIONS, GRADE_ORDER, GRADES, MAX_ENHANCE, ENHANCE_CHANCE, willBreakAt } from './config.js';
import { itemStats, estimateItemValue, gradeName, gradeShort, gradeColor } from './items.js';
import { equipItem, unequipItem, canEquip, tryEnhance } from './hero.js';
import { buyListing, listItem, sellToBot } from './auction.js';
import { buyEquipment, buyScroll, buyPotion, buySoulshot } from './shop.js';
import { CITIES, CITY_ORDER, cityTeleportCost, zoneDifficultyLabel } from './cities.js';
import { BUFF_SCROLLS } from './config.js';

let state = null;
let auction = null;
let shop = null;
let callbacks = {};
let currentAuctionTab = 'buy';
let shopCat = 'equipment';
let heroTab = 'backpack';
let enhanceSelectedItem = null;

const STAT_ORDER = ['attack','defense','hp','critChance','critDamage','dodge','attackSpeed','lifesteal','range'];
const STAT_ICON = { attack:'⚔', defense:'🛡', hp:'❤', critChance:'💥', critDamage:'💢', dodge:'💨', attackSpeed:'⚡', lifesteal:'🩸', range:'📏' };

const ENHANCE_STATS_MAP = {
  weapon: ['attack','critDamage'],
  helmet: ['hp','defense'],
  armor:  ['defense','hp'],
  gloves: ['attackSpeed','critChance'],
  boots:  ['dodge','hp'],
  cloak:  ['range','dodge'],
  ring:   ['critChance','attack'],
  amulet: ['lifesteal','hp'],
};

// ===== LONG-PRESS =====
let _holdBuy = null;
let _holdEnhance = null;
let _lastLongPressTime = 0;
let _suppressNextClick = false;

function _startHold(btn, onTick, holdMs = 400, repeatMs = 100) {
  _killHold(_holdBuy); _holdBuy = null;
  _killHold(_holdEnhance); _holdEnhance = null;
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
  if (st.ticked) {
    _suppressNextClick = true;
    _lastLongPressTime = Date.now();
  }
}

function _endHoldBuy() { if (_holdBuy) { _killHold(_holdBuy); _holdBuy = null; } }
function _endHoldEnhance() { if (_holdEnhance) { _killHold(_holdEnhance); _holdEnhance = null; } }

window.addEventListener('pointerup', () => { _endHoldBuy(); _endHoldEnhance(); });
window.addEventListener('pointercancel', () => { _endHoldBuy(); _endHoldEnhance(); });

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

function bindEnhanceButton(btn, getItem, useBlessed) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    if (_suppressNextClick) { _suppressNextClick = false; e.preventDefault(); e.stopPropagation(); return; }
    if (Date.now() - _lastLongPressTime < 500) return;
    e.preventDefault(); e.stopPropagation();
    doOneEnhance(getItem(), useBlessed);
  });
  btn.addEventListener('pointerdown', (e) => {
    if (btn.disabled) return;
    e.preventDefault(); e.stopPropagation();
    const item = getItem();
    if (!item) return;
    if (item.enhance >= 12) return;
    _holdEnhance = _startHold(btn, () => {
      const it = getItem();
      if (!it) return { ok: false };
      if (it.enhance >= 12) { _endHoldEnhance(); return { ok: false }; }

      const r = tryEnhance(state.hero, it, useBlessed);
      if (!r.ok) { _endHoldEnhance(); return { ok: false }; }

      playEnhanceAnim(r.result, it, r.blessedUsed);
      callbacks.onEquipChange && callbacks.onEquipChange();

      if (r.result === 'destroyed') {
        const oldCard = document.querySelector(`.enhance-item[data-item-id="${it.id}"]`);
        if (oldCard) oldCard.remove();

        const next = getNextEnhanceItem(it, true);
        enhanceSelectedItem = next;
        document.querySelectorAll('.enhance-item').forEach(e => e.classList.remove('selected'));

        if (!next) {
          showEnhanceDetail(null);
          return { ok: false };
        }

        const newCard = document.querySelector(`.enhance-item[data-item-id="${next.id}"]`);
        if (newCard) newCard.classList.add('selected');

        showEnhanceDetail(next);

        const detail = document.getElementById('enhance-detail');
        const newBtn = useBlessed
          ? detail.querySelector('.blessed-btn')
          : detail.querySelector('.enhance-btn:not(.blessed-btn)');
        if (newBtn && _holdEnhance && _holdEnhance.alive && !newBtn.disabled) {
          newBtn.classList.add('holding');
          _holdEnhance.btn = newBtn;
          return { ok: true };
        }
        return { ok: false };
      }

      updateEnhanceItemCard(it);
      updateEnhanceLive();
      return { ok: true };
    }, 400, 300);
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

function doOneEnhance(item, useBlessed) {
  if (!item) return;
  const hero = state.hero;
  if (item.enhance >= 12) {
    showBigEnhanceAnim(item, useBlessed);
    return;
  }
  const r = tryEnhance(hero, item, useBlessed);
  if (!r.ok) { toast('Нельзя', 'epic'); return; }
  playEnhanceAnim(r.result, item, r.blessedUsed);

  if (r.result === 'destroyed') {
    const oldCard = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
    if (oldCard) oldCard.remove();
    const next = getNextEnhanceItem(item, true);
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

  const blessedCount = hero.backpack
    .filter(x => x.kind === 'blessed')
    .reduce((sum, x) => sum + (x.count || 1), 0);

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

function getNextEnhanceItem(currentItem, skipMax = false) {
  const hero = state.hero;
  for (const slot of SLOTS) {
    if (hero.equipment[slot] === currentItem) return null;
  }
  return getNextBackpackItem(currentItem, skipMax);
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

// ===== ДРАГ И ДРОП =====
let dragData = null, dragGhost = null;
let _dragStartTimer = null;
let _dragStartX = 0;
let _dragStartY = 0;
let _dragPending = null;

function startDrag(e, item, sourceType) {
  _dragStartX = e.clientX;
  _dragStartY = e.clientY;
  _dragPending = { item, sourceType, e };

  clearTimeout(_dragStartTimer);
  _dragStartTimer = setTimeout(() => {
    if (!_dragPending) return;
    dragData = { item, sourceType };
    dragGhost = document.createElement('div');
    dragGhost.className = 'drag-ghost';
    dragGhost.textContent = item.icon;
    dragGhost.style.left = _dragPending.e.clientX + 'px';
    dragGhost.style.top = _dragPending.e.clientY + 'px';
    document.body.appendChild(dragGhost);
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    _dragPending = null;
  }, 150);
}

document.addEventListener('pointermove', (e) => {
  if (_dragPending) {
    const dx = Math.abs(e.clientX - _dragStartX);
    const dy = Math.abs(e.clientY - _dragStartY);
    if (dx > 8 || dy > 8) {
      clearTimeout(_dragStartTimer);
      _dragPending = null;
    }
  }
}, { passive: true });

document.addEventListener('pointerup', () => {
  clearTimeout(_dragStartTimer);
  _dragPending = null;
});

function onDragMove(e) {
  if (!dragGhost) return;
  dragGhost.style.left = e.clientX + 'px';
  dragGhost.style.top = e.clientY + 'px';
  document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
  if (target) target.classList.add('drop-hover');
}

function onDragEnd(e) {
  document.removeEventListener('pointermove', onDragMove);
  document.removeEventListener('pointerup', onDragEnd);
  if (dragGhost) { dragGhost.remove(); dragGhost = null; }
  const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
  document.querySelectorAll('.drop-hover').forEach(el => el.classList.remove('drop-hover'));
  if (target && dragData) handleDrop(dragData, target.dataset);
  dragData = null;
}

function handleDrop(data, target) {
  const { item, sourceType } = data;
  if (target.drop === 'slot' && sourceType === 'backpack') {
    if (item.kind === 'buff' || item.kind === 'blessed') {
      toast('Это нельзя надеть', 'epic');
      return;
    }
    const r = equipItem(state.hero, item);
    if (r.ok) { callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
    else if (r.reason === 'class') toast('Это оружие другого класса', 'epic');
    else toast('Нельзя надеть', 'epic');
  } else if (target.drop === 'backpack' && sourceType === 'equip') {
    const r = unequipItem(state.hero, item.slot);
    if (r.ok) { callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
  }
}

// ===== INIT =====
export function initUI(s, a, sh, cb = {}) {
  state = s; auction = a; shop = sh; callbacks = cb;

  document.querySelectorAll('#bottom-panel button').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      if (panel === 'city') { callbacks.onReturnToCity && callbacks.onReturnToCity(); return; }
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
    });
  });
}

function statLabel(k) { return STAT_NAMES[k] || k; }
function statSuffix(k) { return STAT_SUFFIX[k] || ''; }

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
    rows.push(`<div class="stat-row"><span class="stat-name">${statLabel(k)}</span><span class="stat-val">+${s[k]}${statSuffix(k)}</span></div>`);
  }
  return rows.join('');
}

function statsTwoMain(item) {
  const s = itemStats(item);
  const enhKeys = ENHANCE_STATS_MAP[item.slot] || [];
  const rows = [];
  for (const k of enhKeys) {
    if (!s[k]) continue;
    rows.push(`<span class="stat-${k}">${STAT_ICON[k]}${s[k]}${statSuffix(k)}</span>`);
  }
  return rows.join('');
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

// ===== ГЕРОЙ =====
function renderHero() {
  const hero = state.hero;
  const man = document.getElementById('mannequin');
  man.innerHTML = '';
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    const el = document.createElement('div');
    el.className = 'eq-slot' + (item ? '' : ' empty');
    el.dataset.drop = 'slot';
    el.dataset.slot = slot;
    if (item) {
      el.innerHTML = `${item.icon}<span class="slot-label">${SLOT_NAMES[slot]}</span>${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}`;
      el.style.borderColor = gradeColor(item.grade);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.bp-item')) return;
        showItemPopup(item, 'equip');
      });
    } else el.textContent = SLOT_NAMES[slot];
    man.appendChild(el);
  }

  const stats = document.getElementById('hero-stats');
  stats.innerHTML = `
    <div class="stat-row"><span>⭐ Уровень</span><span class="stat-val">${hero.level}</span></div>
    <div class="stat-row"><span>❤ HP</span><span class="stat-val">${Math.ceil(hero.hp)} / ${hero.maxHp}</span></div>
    <div class="stat-row"><span>⚔ Атака</span><span class="stat-val">${Math.round(hero.attack)}</span></div>
    <div class="stat-row"><span>🛡 Защита</span><span class="stat-val">${Math.round(hero.defense)}</span></div>
    <div class="stat-row"><span>📏 Дальность</span><span class="stat-val">${hero.range.toFixed(2)}</span></div>
    <div class="stat-row"><span>💥 Крит шанс</span><span class="stat-val">${hero.critChance.toFixed(1)}%</span></div>
    <div class="stat-row"><span>💢 Крит урон</span><span class="stat-val">+${hero.critDamage.toFixed(0)}%</span></div>
    <div class="stat-row"><span>💨 Уворот</span><span class="stat-val">${hero.dodge.toFixed(1)}%</span></div>
    <div class="stat-row"><span>🩸 Вампиризм</span><span class="stat-val">${hero.lifesteal.toFixed(1)}%</span></div>
    <div class="stat-row"><span>⚡ Скор. атаки</span><span class="stat-val">${hero.attackSpeed.toFixed(2)}</span></div>
  `;

  const grid = document.getElementById('backpack-grid');
  grid.innerHTML = '';
  if (hero.backpack.length === 0) grid.innerHTML = '<div class="bp-empty">Рюкзак пуст</div>';
  else {
    for (const item of hero.backpack) {
      const el = document.createElement('div');
      el.className = 'bp-item';
      el.style.borderColor = item.kind === 'buff' ? BUFF_SCROLLS[item.buffType].color
                            : item.kind === 'blessed' ? '#fbbf24'
                            : gradeColor(item.grade);

      const cnt = item.count || 1;
      const countBadge = cnt > 1 ? `<span class="bp-count">×${cnt}</span>` : '';

      if (item.kind === 'buff') {
        const def = BUFF_SCROLLS[item.buffType];
        el.innerHTML = `
          ${countBadge}
          <div class="bp-icon">${item.icon}</div>
          <div class="bp-grade" style="color:${def.color}">SCROLL</div>
          <div class="bp-name">${item.name}</div>
          <div class="bp-stats"><span style="color:${def.color};font-weight:bold">${def.desc}</span></div>
        `;
      } else if (item.kind === 'blessed') {
        el.innerHTML = `
          ${countBadge}
          <div class="bp-icon">${item.icon}</div>
          <div class="bp-grade" style="color:#fbbf24">BLESSED</div>
          <div class="bp-name">${item.name}</div>
          <div class="bp-stats"><span style="color:#fbbf24;font-weight:bold">Защита</span></div>
        `;
      } else {
        el.innerHTML = `
          ${countBadge}
          ${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}
          <div class="bp-icon">${item.icon}</div>
          <div class="bp-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
          <div class="bp-name">${item.name}</div>
          <div class="bp-stats">${statsCompact(item)}</div>
        `;
      }
      el.addEventListener('pointerdown', (e) => startDrag(e, item, 'backpack'));
      grid.appendChild(el);
    }
  }

  const sc = document.getElementById('scrolls-list');
  sc.innerHTML = '';
  const scrollIcons = { ng:'📜', d:'📗', c:'📘', b:'📙', a:'📕', s:'🌟' };
  let hasScrolls = false;
  for (const grade of GRADE_ORDER) {
    const w = hero.scrolls[grade]?.weapon || 0;
    const a = hero.scrolls[grade]?.armor || 0;
    if (w > 0) {
      hasScrolls = true;
      const el = document.createElement('div');
      el.className = 'scroll-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Оружие</span><span class="scroll-count">×${w}</span>`;
      sc.appendChild(el);
    }
    if (a > 0) {
      hasScrolls = true;
      const el = document.createElement('div');
      el.className = 'scroll-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Броня</span><span class="scroll-count">×${a}</span>`;
      sc.appendChild(el);
    }
  }
  if (!hasScrolls) sc.innerHTML = '<div class="bp-empty">Нет свитков</div>';

  const pot = document.getElementById('potions-list');
  pot.innerHTML = '';
  let hasPot = false;
  for (const type of POTION_ORDER) {
    const c = hero.potions[type] || 0;
    if (c <= 0) continue;
    hasPot = true;
    const p = POTIONS[type];
    const el = document.createElement('div');
    el.className = 'potion-item';
    el.style.borderColor = p.color;
    el.innerHTML = `<span class="potion-icon">${p.icon}</span><span class="scroll-name" style="color:${p.color}">${p.name}</span><span class="potion-count">×${c}</span>`;
    pot.appendChild(el);
  }
  if (!hasPot) pot.innerHTML = '<div class="bp-empty">Нет зелий</div>';

  const ss = document.getElementById('soulshots-list');
  ss.innerHTML = '';
  let hasSS = false;
  for (const grade of GRADE_ORDER) {
    const c = hero.soulshots[grade] || 0;
    if (c <= 0) continue;
    hasSS = true;
    const el = document.createElement('div');
    el.className = 'soulshot-item';
    el.style.borderColor = gradeColor(grade);
    el.innerHTML = `<span class="soulshot-icon">⚡</span><span class="scroll-name" style="color:${gradeColor(grade)}">Соски ${gradeName(grade)}</span><span class="soulshot-count">×${c}</span>`;
    ss.appendChild(el);
  }
  if (!hasSS) ss.innerHTML = '<div class="bp-empty">Нет сосок</div>';
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
  el.innerHTML = `
    <div class="ei-icon">${item.icon}</div>
    <div class="ei-enh" style="opacity:${item.enhance > 0 ? 1 : 0}">+${item.enhance}</div>
    <div class="ei-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
    <div class="ei-stats">${statsTwoMain(item)}</div>
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
    const blessedCount = hero.backpack
      .filter(x => x.kind === 'blessed')
      .reduce((sum, x) => sum + (x.count || 1), 0);

    detail.dataset.itemId = '';
    detail.innerHTML = `
      <div class="eh-head"><span class="eh-icon" style="opacity:0.35">—</span><span class="eh-name" style="opacity:0.4">Выбери предмет</span></div>
      <div class="eh-body">
        <div class="row" style="opacity:0.35"><span>Грейд</span><span class="val">—</span></div>
        <div class="row" style="opacity:0.35"><span>Заточка</span><span class="val">— / +${MAX_ENHANCE}</span></div>
        <div class="row" style="opacity:0.35"><span>Шанс успеха</span><span class="val">—</span></div>
        <div class="row" style="opacity:0.35"><span>Сгорание</span><span class="val">—</span></div>
        <div class="row" style="opacity:0.35"><span>Свитков</span><span class="val">—</span></div>
        <div class="row" style="opacity:0.35"><span>Blessed ✨</span><span class="val">${blessedCount}</span></div>
      </div>
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
  const blessedCount = hero.backpack
    .filter(x => x.kind === 'blessed')
    .reduce((sum, x) => sum + (x.count || 1), 0);
  const blessedAvailable = blessedCount > 0;

  detail.innerHTML = `
    <div class="eh-head">
      <span class="eh-icon">${item.icon}</span>
      <span class="eh-name">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</span>
    </div>
    <div class="eh-body">
      <div class="row"><span>Грейд</span><span class="val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
      <div class="row"><span>Заточка</span><span class="val">+${item.enhance} / +${MAX_ENHANCE}</span></div>
      ${isMax
        ? '<div class="row"><span>Максимум</span><span class="val good">✓</span></div>'
        : `<div class="row"><span>Шанс успеха</span><span class="val ${chance >= 0.5 ? 'good' : 'bad'}">${(chance*100).toFixed(0)}%</span></div>
           <div class="row"><span>Сгорание</span><span class="val ${willBreak ? 'bad' : 'good'}">${willBreak ? '🔥 Да' : '✓ Нет'}</span></div>
           <div class="row"><span>Свитков ${stype === 'weapon' ? 'оружия' : 'брони'}</span><span class="val ${scrollsHave > 0 ? '' : 'bad'}">${scrollsHave}</span></div>
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
  card.innerHTML = `
    <div class="ebc-inner">
      <div class="ebc-icon">${item.icon}</div>
      <div class="ebc-enh" id="ebc-enh">+${item.enhance}</div>
      <div class="ebc-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(() => {
    const r = tryEnhance(hero, item, useBlessed);
    const enhEl = card.querySelector('#ebc-enh');

    if (!r.ok) { overlay.remove(); toast('Нельзя', 'epic'); return; }

    if (r.result === 'success') {
      enhEl.textContent = '+' + item.enhance;
      enhEl.style.color = '#4ade80';
      card.classList.add('glow-success');
      toast(`Успех! +${item.enhance}`, 'legendary');
    } else if (r.result === 'fail') {
      enhEl.textContent = 'FAIL';
      enhEl.style.color = '#ef4444';
      card.classList.add('glow-fail');
      toast(useBlessed ? 'Провал (Blessed спас)' : 'Провал', 'epic');
    } else {
      enhEl.textContent = '💥';
      enhEl.style.color = '#dc2626';
      card.classList.add('glow-destroyed');
      toast('Предмет сгорел', 'unique');
      enhanceSelectedItem = getNextBackpackItem(item, true);
    }

    callbacks.onEquipChange && callbacks.onEquipChange();

    setTimeout(() => {
      overlay.remove();
      renderEnhance();
    }, 1200);
  }, 2200);
}

// ===== МАГАЗИН =====
function renderShop() {
  const gradeInfo = document.getElementById('shop-grade-info');
  if (gradeInfo && shop.stock) {
    gradeInfo.innerHTML = `Городской грейд: <b style="color:${gradeColor(shop.stock.grade)}">${gradeName(shop.stock.grade)}</b>`;
  }
  const content = document.getElementById('shop-content');
  content.innerHTML = '';
  if (!shop.stock) return;

  if (shopCat === 'equipment') {
    for (const entry of shop.stock.equipment) {
      const realItem = callbacks.makeItem(shop.stock.grade, entry.slot, entry.weaponType);
      const s = realItem ? itemStats(realItem) : {};
      const statParts = [];
      for (const k of STAT_ORDER) if (s[k]) statParts.push(`<span>${statLabel(k)} ${s[k]}${statSuffix(k)}</span>`);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">${entry.icon}</div>
        <div class="auction-info">
          <div class="auction-name">${entry.name}</div>
          <div class="auction-stats">${statParts.join('')}</div>
        </div>
        <div class="auction-price">${entry.price}💰</div>
        <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
      `;
      bindBuyButton(row.querySelector('button'), (silent) => {
        const r = buyEquipment(shop, state.hero, state, entry.slot, entry.weaponType);
        if (r.ok) {
          toast(`🛒 ${entry.name}`, shop.stock.grade);
          if (!silent) renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
        } else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
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
        if (r.ok) {
          toast(`🛒 Свиток ${gradeName(shop.stock.grade)}`, shop.stock.grade);
          updateShopCounts();
          if (!silent) renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
        } else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
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
        if (r.ok) {
          toast(`🛒 ${p.name}`, 'rare');
          updateShopCounts();
          if (!silent) renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
        } else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
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
        <div class="auction-grade" style="color:${gradeColor(shop.stock.grade)}">Удваивают урон оружия этого грейда</div>
        <div class="auction-stats"><span data-have="soulshot:${shop.stock.grade}">У тебя: ${have}</span><span>+10 шт.</span></div>
      </div>
      <div class="auction-price">${entry.price}💰</div>
      <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
    `;
    bindBuyButton(row.querySelector('button'), (silent) => {
      const r = buySoulshot(shop, state.hero, state);
      if (r.ok) {
        toast(`🛒 Соски ×10`, shop.stock.grade);
        updateShopCounts();
        if (!silent) renderShop();
        callbacks.onEquipChange && callbacks.onEquipChange();
      } else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
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
      if (r.ok) {
        toast(`🛒 ${item.name}`, item.grade);
        renderAuctionBuy();
        callbacks.onEquipChange && callbacks.onEquipChange();
      } else if (r.reason === 'no_gold' && !silent) toast('Недостаточно золота', 'epic');
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
    if (item.kind === 'blessed') {
      statsLine = '<span style="color:#fbbf24;font-weight:bold">✨ Универсальный свиток</span>';
    } else if (item.kind === 'buff') {
      const def = BUFF_SCROLLS[item.buffType];
      statsLine = `<span style="color:${def.color};font-weight:bold">${def.icon} ${def.desc}</span>`;
    } else {
      statsLine = statsCompact(item);
    }
    const nameColor = item.kind === 'blessed' ? '#fbbf24'
                    : item.kind === 'buff' ? BUFF_SCROLLS[item.buffType].color
                    : gradeColor(item.grade);

    const row = document.createElement('div');
    row.className = 'sell-item-row';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="sell-info">
        <div class="sell-name" style="color:${nameColor}">
          ${item.name}${item.count > 1 ? ' ×' + item.count : ''}${item.enhance > 0 ? ' +' + item.enhance : ''}
        </div>
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
  if (item.kind === 'blessed') {
    headInfo = '<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#fbbf24">✨ Blessed Scroll</span></div>' +
               '<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val">Спасает от сгорания</span></div>';
  } else if (item.kind === 'buff') {
    const def = BUFF_SCROLLS[item.buffType];
    headInfo = `<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:${def.color}">${def.desc}</span></div>
                <div class="stat-row"><span class="stat-name">Длительность</span><span class="stat-val">20 мин</span></div>`;
  } else {
    headInfo = `<div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
      ${statsMultiline(item)}`;
  }

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
    if (r.ok) {
      toast(`Выставлено: ${item.name}`, 'rare');
      hideItemPopup();
      renderAuctionSell();
      renderHero();
    }
  });
  document.getElementById('pp-bot').addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) {
      state.gold += r.price;
      toast(`Продано: +${r.price}💰`, 'rare');
      hideItemPopup();
      renderAuctionSell();
      renderHero();
      callbacks.onEquipChange && callbacks.onEquipChange();
    }
  });
}

// ===== POPUP =====
export function showItemPopup(item, context) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  let actionBtns = '';
  if (context === 'backpack') {
    const can = canEquip(state.hero, item);
    const estimate = estimateItemValue(item);
    actionBtns = `
      <button class="popup-close" id="pp-equip" ${can ? '' : 'disabled'}>${can ? 'Надеть' : 'Нельзя надеть'}</button>
      <button class="popup-close" id="pp-sell" style="border-color:#fbbf24;color:#fbbf24">Продать боту (${Math.floor(estimate*0.5)})</button>
    `;
  } else if (context === 'equip') {
    actionBtns = `<button class="popup-close" id="pp-unequip">Снять</button>`;
  }
  body.innerHTML = `
    <div class="item-icon-big">${item.icon}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    <div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
    <div class="stat-row"><span class="stat-name">Слот</span><span class="stat-val">${SLOT_NAMES[item.slot] || '—'}</span></div>
    <div class="stat-row"><span class="stat-name">Треб. уровень</span><span class="stat-val">${GRADES[item.grade]?.levelReq || 1}</span></div>
    ${statsMultiline(item)}
    ${actionBtns}
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
  document.getElementById('pp-sell')?.addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) { state.gold += r.price; toast(`Продано: +${r.price}💰`, 'rare'); hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
  });
  document.getElementById('pp-unequip')?.addEventListener('click', () => {
    const r = unequipItem(state.hero, item.slot);
    if (r.ok) { hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); }
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
    } else {
      lsEl.classList.add('hidden');
    }
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
      ${current ? '<div class="map-item-level">● Текущий город</div>' :
        `<div class="map-item-level">Телепорт: ${cost}💰</div>`}
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