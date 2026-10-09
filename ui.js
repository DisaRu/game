import { SLOTS, SLOT_NAMES, STAT_NAMES, STAT_SUFFIX, POTION_ORDER, POTIONS, GRADE_ORDER, GRADES, MAX_ENHANCE, ENHANCE_CHANCE, willBreakAt, getEnhanceBonus, ENHANCE_BONUSES, BUFF_SCROLLS, RATING_CHESTS, SKILLS, SKILL_ORDER,SKILL_DESC, MAX_SKILL_LEVEL } from './config.js';
import { itemStats, estimateItemValue, gradeName, gradeShort, gradeColor, getVariantsForSlot, createItem } from './items.js';
import { equipItem, unequipItem, canEquip, tryEnhance, getSkillManaCost, getSkillCooldown, getSkillCastTime, isSkillReady, getSkillRemainingCooldown, learnSkill, setSkillSlot, parseSlotAction, setSlotAction, useBuffScroll, getSkillMilestones, getSkillEffect } from './hero.js';
import { buyEquipment, buyScroll, buyPotion, buySoulshot } from './shop.js';
import { CITIES, CITY_ORDER, cityTeleportCost, zoneDifficultyLabel } from './cities.js';
import { getAvailableChests, claimChest, rollCardRewards, estimateWinChance, expectedScore } from './arena.js';
import { getBotStats } from './bots.js';
import { buyListing, listItem, sellToBot, cancelListing } from './auction.js';
import { openWiki as _openWiki, closeWiki as _closeWiki } from './wiki.js';
import { openWiki } from './wiki.js';
// Рендер иконки: PNG-файл, если это путь; иначе — эмодзи.
function iconHtml(icon, size = 42) {
  if (!icon) return '';
  if (icon.includes('.') || icon.includes('/')) {
    return `<img src="${icon}" style="width:${size}px;height:${size}px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;display:inline-block;" alt="">`;
  }
  return `<span style="font-size:${size}px;line-height:1;vertical-align:middle;">${icon}</span>`;
}
let state = null;
let auction = null;
let shop = null;
let arena = null;
let callbacks = {};
let currentAuctionTab = 'buy';
let shopCat = 'equipment';
let heroTab = 'backpack';
let enhanceSelectedItem = null;
let arenaScreen = 'list';
let lastArenaResult = null;
let compareBotId = null;

const STAT_ORDER = [
  'attack','defense','hp','mana','manaRegen','critChance','critDamage','dodge',
  'attackSpeed','lifesteal','range',
  'accuracy','critResist','armorPen','antiHeal','berserk','thorns','moveSpeed',
];

const STAT_ICON = {
  attack:'⚔', defense:'🛡', hp:'❤', mana:'🔷', manaRegen:'🔹',
  critChance:'💥', critDamage:'💢',
  dodge:'💨', attackSpeed:'⚡', lifesteal:'🩸', range:'📏',
  accuracy:'🎯', critResist:'🛡️', armorPen:'🔨', antiHeal:'🚫',
  berserk:'😡', thorns:'🌵', moveSpeed:'👟',
};

// ===== LONG-PRESS =====
let _holdBuy = null;
let _lastLongPressTime = 0;
let _suppressNextClick = false;

function openBuyDialog(info, buyFn) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  if (!popup || !body) return;

  let qty = 1;
  const maxQty = Math.max(1, Math.floor(state.gold / info.price));

  function render() {
    const total = qty * info.price;
    const canAfford = total <= state.gold;
    body.innerHTML = `
      <div class="item-icon-big">${iconHtml(info.icon, 48)}</div>
      <h3 style="text-align:center">${info.name}</h3>
      <div class="stat-row"><span class="stat-name">Цена за 1</span><span class="stat-val">${info.price.toLocaleString()}💰</span></div>
      <div class="stat-row"><span class="stat-name">В кошельке</span><span class="stat-val">${state.gold.toLocaleString()}💰</span></div>
      <div class="stat-row" style="align-items:center">
        <span class="stat-name">Количество</span>
        <span class="stat-val" style="display:flex;gap:4px;align-items:center">
          <button class="qty-btn" id="qty-minus" style="width:28px;height:28px;font-size:16px;font-weight:bold;background:#1a2340;border:1px solid #4ade80;color:#4ade80;border-radius:4px;cursor:pointer">−</button>
          <input id="qty-input" type="number" min="1" value="${qty}" style="width:70px;text-align:center;background:#0d1526;border:1px solid #2a3a5c;color:#c8d1e6;padding:5px;border-radius:3px;font-family:inherit;font-size:14px;font-weight:bold">
          <button class="qty-btn" id="qty-plus" style="width:28px;height:28px;font-size:16px;font-weight:bold;background:#1a2340;border:1px solid #4ade80;color:#4ade80;border-radius:4px;cursor:pointer">+</button>
        </span>
      </div>
      <div class="stat-row" style="border-top:1px solid #d4af37;margin-top:6px;padding-top:6px">
        <span class="stat-name" style="font-size:12px">ИТОГО</span>
        <span class="stat-val" style="color:${canAfford ? '#fbbf24' : '#ef4444'};font-size:18px;font-weight:900">${total.toLocaleString()}💰</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="popup-close" id="qty-buy" style="border-color:${canAfford ? '#4ade80' : '#64748b'};color:${canAfford ? '#4ade80' : '#64748b'};flex:1;font-size:13px;font-weight:bold" ${canAfford ? '' : 'disabled'}>✅ Купить</button>
        <button class="popup-close" id="qty-max" style="border-color:#fbbf24;color:#fbbf24;flex:1;font-size:13px;font-weight:bold">🔼 Макс (${maxQty})</button>
      </div>
      <button class="popup-close" id="qty-cancel" style="border-color:#64748b;color:#64748b;margin-top:6px">Отмена</button>
    `;

    const input = document.getElementById('qty-input');
    input.addEventListener('input', () => {
      qty = Math.max(1, Math.min(maxQty || 1, parseInt(input.value) || 1));
      render();
    });
    document.getElementById('qty-minus').onclick = () => {
      qty = Math.max(1, qty - 1);
      render();
    };
    document.getElementById('qty-plus').onclick = () => {
      qty = Math.min(maxQty, qty + 1);
      render();
    };
    document.getElementById('qty-max').onclick = () => {
      qty = maxQty;
      render();
    };
    document.getElementById('qty-buy').onclick = () => {
      if (qty * info.price > state.gold) return;
      const result = buyFn(qty);
      if (result && result.ok === false && result.reason === 'no_gold') {
        toast('Недостаточно золота', 'epic');
        return;
      }
      hideItemPopup();
      callbacks.onEquipChange && callbacks.onEquipChange();
    };
    document.getElementById('qty-cancel').onclick = hideItemPopup;
  }

  render();
  popup.classList.remove('hidden');
}
function bindBuyButton(btn, buyFn, getInfo) {
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof getInfo === 'function') {
      const info = getInfo();
      if (info) { openBuyDialog(info, buyFn); return; }
    }
    buyFn(1);
  });
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
    _autoTickCounter = 0;

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

// Счётчики для батчинга тяжёлых обновлений при автоточке
let _autoTickCounter = 0;

function _doAutoTick(useBlessed) {
  const hero = state.hero;
  const item = enhanceSelectedItem;
  if (!item) { _stopAutoEnhance(); return false; }

  // ── Автоточка работает только до +11. +12 и выше — только клик.
  if (item.enhance >= 12) {
    _stopAutoEnhance();
    return false;
  }

  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  if (scrollsHave <= 0) {
    _stopAutoEnhance();
    return false;
  }

  const listBefore = getBackpackEnhanceList(true);
  const idxBefore = listBefore.indexOf(item);
  const r = tryEnhance(hero, item, useBlessed);
  if (!r.ok) {
    _stopAutoEnhance();
    return false;
  }

  _autoTickCounter++;

  // Разрушение — обновить DOM
  if (r.result === 'destroyed') {
    _flashEnhanceResult('destroyed');
    const oldCard = document.querySelector(`.enhance-item[data-item-id="${item.id}"]`);
    if (oldCard) oldCard.remove();
    const listAfter = getBackpackEnhanceList(true);
    let next = null;
    if (idxBefore >= 0 && listAfter.length > 0) {
      next = listAfter[Math.min(idxBefore, listAfter.length - 1)];
    } else if (listAfter.length > 0) {
      next = listAfter[0];
    }
    if (!next) {
      _stopAutoEnhance();
      enhanceSelectedItem = null;
      showEnhanceDetail(null);
      return false;
    }
    enhanceSelectedItem = next;
    _selectEnhanceCard(next);
    showEnhanceDetail(next);
    callbacks.onEquipChange && callbacks.onEquipChange();
    return true;
  }

  // Обычная точка — обновить карточку и подсветку
  updateEnhanceItemCard(item);
  _flashEnhanceResult(r.result);

  if (_autoTickCounter % 4 === 0) {
    updateEnhanceLive();
  }

  // Дошли до +12? Стоп автоточки, дальше только клик.
  if (item.enhance >= 12) {
    _stopAutoEnhance();
    return false;
  }

  return true;
}

// Лёгкий всплеск-индикатор вместо pop-up. Не создаёт DOM каждый тик.
function _flashEnhanceResult(result) {
  const detail = document.getElementById('enhance-detail');
  if (!detail) return;
  const color = result === 'success' ? '#4ade80'
              : result === 'fail' ? '#ef4444'
              : '#8b0000';
  detail.style.transition = 'none';
  detail.style.boxShadow = `inset 0 0 20px ${color}80`;
  setTimeout(() => {
    detail.style.transition = 'box-shadow 0.3s ease-out';
    detail.style.boxShadow = '';
  }, 60);
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

  // +12 и выше → одна точка + эпичная карточка
  if (item.enhance >= 12) {
    showBigEnhanceAnim(item, useBlessed);
    return;
  }

  // До +11 → обычная быстрая точка
  const r = tryEnhance(hero, item, useBlessed);
  if (!r.ok) { toast('Нельзя', 'epic'); return; }

  playEnhanceAnim(r.result, item, r.blessedUsed);
  _selectEnhanceCard(item);

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
    if (it.kind !== 'equip') continue;
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

      if (panel === 'city') {
        // Закрываем все модалки и попапы — они мешают городу
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        const pp = document.getElementById('item-popup');
        if (pp) pp.classList.add('hidden');
        const sp = document.getElementById('skill-popup');
        if (sp) sp.classList.add('hidden');
        callbacks.onReturnToCity && callbacks.onReturnToCity();
        return;
      }

      if (panel === 'arena') {
        // Тоже закрываем модалки перед ареной
        document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
        const pp = document.getElementById('item-popup');
        if (pp) pp.classList.add('hidden');
        openArena();
        return;
      }

      // Открывая новый модал — закрываем предыдущий
      document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
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

  document.querySelectorAll('#skill-bar .skill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const slot = parseInt(btn.dataset.skillSlot, 10);
      if (!isNaN(slot) && callbacks.onSkillClick) callbacks.onSkillClick(slot);
    });
  });

  // ============================================================
  // ПУБЛИЧНЫЙ API для inline-скрипта в index.html
  // ============================================================
  window.__ui = {
    renderHero: () => renderHero(),
    renderBackpack: () => renderBackpack(),
    renderSkillsTab: () => renderSkillsTab(),
    renderSkillBar: () => renderSkillBar(),
    renderScrolls: () => renderScrolls(),
    renderPotions: () => renderPotions(),
    renderSoulshots: () => renderSoulshots(),

    setSkillSlot: (slotIndex, skillId) => {
      const r = setSkillSlot(state.hero, slotIndex, skillId);
      if (r.ok) {
        renderSkillsTab();
        renderSkillBar();
        updateSkillBar();
      }
      return r;
    },

    setSlotAction: (slotIndex, kind, id) => {
      const r = setSlotAction(state.hero, slotIndex, kind, id);
      if (r.ok) {
        renderSkillsTab();
        renderSkillBar();
        updateSkillBar();
        renderHero();
      }
      return r;
    },

    learnSkill: (skillId) => {
      const r = learnSkill(state.hero, skillId);
      if (r.ok) {
        const hero = state.hero;
        const book = hero.backpack.find(x => x.kind === 'book' && x.skillId === skillId);
        if (book) {
          if ((book.count || 1) > 1) book.count -= 1;
          else hero.backpack.splice(hero.backpack.indexOf(book), 1);
        }
        renderSkillsTab();
        renderSkillBar();
        renderHero();
      }
      return r;
    },

      getSkillInfo: (skillId) => {
      const def = SKILLS[skillId];
      if (!def) return null;
      const hero = state.hero;
      const lvl = hero.skills?.[skillId]?.level || 1;
      const cost = getSkillManaCost(hero, skillId);
      const cd = getSkillCooldown(hero, skillId);
      const eff = getSkillEffect(hero, skillId);
      return {
        id: skillId,
        name: def.name,
        icon: def.icon,
        level: lvl,
        maxLevel: MAX_SKILL_LEVEL,
        manaCost: cost,
        cooldown: cd,
        castTime: getSkillCastTime(hero, skillId),
        baseDesc: SKILL_DESC[skillId] || def.desc || '',
        inSlot: hero.skillSlots?.indexOf('skill:' + skillId) ?? -1,
        freeSlot: hero.skillSlots?.indexOf(null) ?? -1,
        bookCount: hero.backpack
          .filter(x => x.kind === 'book' && x.skillId === skillId)
          .reduce((s, x) => s + (x.count || 1), 0),
        milestones: getSkillMilestones(lvl),
        duration: eff?.duration ?? null,
      };
    },

    sortBackpack: () => {
      const hero = state.hero;
      const slotOrder = {
        weapon: 1, armor: 2, helmet: 3, gloves: 4, boots: 5, cloak: 6, ring: 7, amulet: 8,
        scroll: 9, buff: 10, potion: 11, soulshot: 12, book: 13, blessed: 14, pass: 15,
      };
      const gradeOrder = { s: 0, a: 1, b: 2, c: 3, d: 4, ng: 5, any: 6, buff: 6 };
      hero.backpack.sort((a, b) => {
        const ta = slotOrder[a.slot] ?? 99;
        const tb = slotOrder[b.slot] ?? 99;
        if (ta !== tb) return ta - tb;
        const ga = gradeOrder[a.grade] ?? 6;
        const gb = gradeOrder[b.grade] ?? 6;
        if (ga !== gb) return ga - gb;
        return (b.enhance || 0) - (a.enhance || 0);
      });
      renderBackpack();
      toast('🎒 Отсортировано: оружие → свитки', 'rare');
    },
  };
}
// Описания скиллов (после initUI)
function _getSkillDescription(skillId, lvl) {
  const lvlMult = 1 + 0.05 * (lvl - 1);
  const map = {
    multishot: () => `Выпускает 3 стрелы подряд, каждая наносит ${Math.round(40 * lvlMult)}% урона атаки.`,
    fireball:  () => `Огненный шар: ${Math.round(100 * lvlMult)}% урона по цели + сплэш 1.5 клетки.`,
    poison:    () => `Накладывает яд: ${Math.round(30 * lvlMult)}% урона в секунду в течение 5 сек.`,
    stun:      () => `Оглушает цель на 3 сек. Шанс успеха 60%.`,
    frost:     () => `Замедляет скорость атаки цели на 50% в течение 4 сек.`,
    silence:   () => `Накладывает немоту на 3 сек — цель не может использовать скиллы.`,
    heal:      () => `Восстанавливает ${Math.round(20 * lvlMult)}% от максимума HP.`,
    dodge:     () => `Повышает уклонение на 60% в течение 4 сек.`,
    cleanse:   () => `Снимает все дебаффы (стан, замедление, немоту, яд).`,
    summon_shadow: () => `Призывает тень-помощника на 20 сек. Тень атакует цели заклинателя.`,
  };
  const fn = map[skillId];
  return fn ? fn() : 'Описание недоступно.';
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
  renderHeroContent();
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
        <div class="eq-icon">${iconHtml(item.icon)}</div>
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
  let eqMana=0, eqManaRegen=0;
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    eqHp += (s.hp||0); eqAtk += (s.attack||0); eqDef += (s.defense||0);
    eqCrit += (s.critChance||0); eqCritDmg += (s.critDamage||0);
    eqDodge += (s.dodge||0); eqAtkSpd += (s.attackSpeed||0);
    eqLs += (s.lifesteal||0); eqRange += (s.range||0);
    eqAcc += (s.accuracy||0); eqCritRes += (s.critResist||0);
    eqArmorPen += (s.armorPen||0); eqAntiHeal += (s.antiHeal||0);
    eqBerserk += (s.berserk||0); eqThorns += (s.thorns||0); eqMoveSpd += (s.moveSpeed||0);
    eqMana += (s.mana||0); eqManaRegen += (s.manaRegen||0);
  }
  const bonusHp = Math.round((hero.baseMaxHp + eqHp) * (hero.hpBonus || 0));
  const curMana = Math.floor(hero.mana || 0);
  const maxMana = Math.round(hero.maxMana || 0);
  const manaRegen = (hero.manaRegen || 0);
  const stats = document.getElementById('hero-stats');
  stats.innerHTML = `
    <div class="hs-group">
      <div class="hs-title">Основные</div>
      <div class="hs-grid">
        <div class="hs-cell"><span class="hs-ico">⭐</span><span class="hs-label">Ур.</span><span class="hs-total">${hero.level}</span></div>
        <div class="hs-cell"><span class="hs-ico">❤</span><span class="hs-label">HP</span>${eqHp>0?`<span class="hs-add">+${Math.round(eqHp)}</span>`:''}${bonusHp>0?`<span class="hs-add">+${bonusHp}🌟</span>`:''}<span class="hs-total">${hero.maxHp}</span></div>
        <div class="hs-cell"><span class="hs-ico">🔷</span><span class="hs-label">Мана</span>${eqMana>0?`<span class="hs-add">+${Math.round(eqMana)}</span>`:''}<span class="hs-total mana-total">${curMana}/${maxMana}</span></div>
        <div class="hs-cell"><span class="hs-ico">🔹</span><span class="hs-label">Реген</span>${eqManaRegen>0?`<span class="hs-add">+${eqManaRegen.toFixed(1)}</span>`:''}<span class="hs-total mana-total">${manaRegen.toFixed(1)}/с</span></div>
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
    html += `<div class="hb-title">✨ Бонусы +15 (${itemBonuses.length})</div><div class="hb-list">${itemBonuses.map(x => `<div class="hb-row"><span class="hb-icon">${iconHtml(x.item.icon, 14)}</span><span class="hb-name">${iconHtml(x.bonus.icon, 12)} ${x.bonus.name}</span><span class="hb-val">${x.bonus.display}</span></div>`).join('')}</div>`;
  }
  if (activeBuffs.length > 0) {
    html += `<div class="hb-title" style="margin-top:6px">🧪 Активные свитки (${activeBuffs.length})</div><div class="hb-list">${activeBuffs.map(x => `<div class="hb-row"><span class="hb-icon">${iconHtml(x.def.icon, 16)}</span><span class="hb-name" style="color:${x.def.color}">${x.def.name}</span><span class="hb-time">${x.timeLeft}</span></div>`).join('')}</div>`;
  }
  bonusBox.innerHTML = html || '<div class="hb-empty">Нет бонусов и активных свитков</div>';
}

function renderHeroTabs() {
  // Слоты скиллов рендерятся всегда — они теперь на главной вкладке
  renderSkillsTab();

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
      el.innerHTML = `${countBadge}<div class="bp-icon">${iconHtml(item.icon)}</div><div class="bp-grade" style="color:#fbbf24">BLESSED</div><div class="bp-name">${item.name}</div>`;
    } else if (item.kind === 'pass') {
      el.innerHTML = `${countBadge}<div class="bp-icon">${iconHtml(item.icon)}</div><div class="bp-grade" style="color:#a855f7">PASS</div><div class="bp-name">${item.name}</div>`;
    } else if (item.kind === 'book') {
      const def = SKILLS[item.skillId];
      const known = state.hero.skills?.[item.skillId];
      const lvl = known?.level || 0;
      const tag = lvl >= MAX_SKILL_LEVEL ? 'MAX' : (lvl > 0 ? 'Lv.' + lvl : 'NEW');
      const cls = def?.class || 'common';
      const isForbidden = cls !== 'common' && cls !== hero.classType;
      const clsIcon = cls === 'archer' ? '🏹' : cls === 'mage' ? '🔮' : '✨';
      el.style.borderColor = isForbidden ? '#7a2a2a' : (cls === 'archer' ? '#4ade80' : cls === 'mage' ? '#c084fc' : '#fbbf24');
      el.style.opacity = isForbidden ? '0.55' : '';
      el.innerHTML = `${countBadge}<div class="bp-icon">${iconHtml(item.icon)}</div><div class="bp-grade" style="color:#60a5fa">${clsIcon} КНИГА</div><div class="bp-name">${item.name.replace('📖 ','')}</div><div class="bp-book-lvl">${isForbidden ? '✗ не твой класс' : tag}</div>`;
    } else {
      el.innerHTML = `${countBadge}${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}<div class="bp-icon">${iconHtml(item.icon)}</div><div class="bp-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div><div class="bp-name">${item.name}</div><div class="bp-stats">${statsCompact(item)}</div>`;
    }
    el.addEventListener('click', () => showItemPopup(item, 'backpack'));
    grid.appendChild(el);
  }
}
// ===== ВКЛАДКА СКИЛЛОВ =====
function renderSkillsTab() {
  const hero = state.hero;
  if (!hero.skillSlots || hero.skillSlots.length < 3) {
    hero.skillSlots = [null, null, null];
  }

  // --- 5 боевых слотов ---
  const slotsRow = document.getElementById('skill-slots-row');
  if (slotsRow) {
    slotsRow.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slotStr = hero.skillSlots[i];
      const disp = slotStr ? _slotDisplay(slotStr, hero) : null;
      const el = document.createElement('div');
      el.className = 'skill-slot ' + (disp && !disp.empty ? 'filled' : 'empty');
      el.dataset.slot = String(i);
      if (slotStr) el.dataset.slotStr = slotStr;

      if (disp && !disp.empty) {
        el.innerHTML = `
          <span class="slot-num">${i + 1}</span>
          <span class="slot-icon">${disp.icon}</span>
          <span class="slot-lvl">${disp.kind === 'skill' ? 'Lv.' + (hero.skills[disp.id]?.level || 1) : '×' + disp.sub}</span>
        `;
      } else {
        el.innerHTML = `
          <span class="slot-num">${i + 1}</span>
          <span class="slot-empty-label">Пусто</span>
        `;
      }

      el.addEventListener('click', () => {
        if (hero.skillSlots[i]) {
          setSlotAction(hero, i, null, null);
          renderSkillsTab();
          renderSkillBar();
          toast('Слот очищен', 'epic');
        } else {
          toast('Выбери скилл из списка ниже или предмет из рюкзака', 'epic');
        }
      });
      slotsRow.appendChild(el);
    }
  }

  // --- Изученные скиллы ---
  const learnedEl = document.getElementById('learned-skills');
  if (learnedEl) {
    learnedEl.innerHTML = '';
    const learnedIds = SKILL_ORDER.filter(id => {
      if (!hero.skills?.[id]) return false;
      const def = SKILLS[id];
      if (!def) return false;    // защита от мусорных ключей в сейве
      const cls = def.class || 'common';
      // Показываем свои + общие
      return cls === 'common' || cls === hero.classType;
    });
    if (learnedIds.length === 0) {
      learnedEl.innerHTML = '<div class="skills-empty">Пока ничего не изучено. Открой книжку скилла из рюкзака.</div>';
    } else {
      for (const skillId of learnedIds) {
        const def = SKILLS[skillId];
        const lvl = hero.skills[skillId].level;
        const cost = getSkillManaCost(hero, skillId);
        const slotIdx = hero.skillSlots.indexOf(skillId);
        const inSlot = slotIdx >= 0;

        const card = document.createElement('div');
        card.className = 'skill-card' + (inSlot ? ' in-slot' : '');
        card.dataset.skillId = skillId;
        card.innerHTML = `
          ${inSlot ? `<span class="sc-in-slot">✓ слот ${slotIdx + 1}</span>` : ''}
          <span class="sc-lvl">Lv.${lvl}</span>
          <div class="sc-icon">${iconHtml(def.icon, 26)}</div>
          <div class="sc-name">${def.name}</div>
          <div class="sc-meta"><span>🔷 <b>${cost}</b></span><span>⏱ ${def.cooldown}с</span></div>
        `;
   card.dataset.skillId = skillId;
card.addEventListener('click', () => {
          if (inSlot) {
            setSkillSlot(hero, slotIdx, null);
            toast(`Снят из слота ${slotIdx + 1}`, 'epic');
          } else {
                        const empty = hero.skillSlots.indexOf(null);
            if (empty < 0) { toast('Все 5 слотов заняты — освободи один', 'epic'); return; }
            setSkillSlot(hero, empty, skillId);
            toast(`${def.icon} ${def.name} → слот ${empty + 1}`, 'legendary');
          }
          renderSkillsTab();
          renderSkillBar();
        });
        learnedEl.appendChild(card);
      }
    }
  }
}

function renderScrolls() {
  const hero = state.hero;
  const sc = document.getElementById('scrolls-list');
  if (!sc) return;
  sc.innerHTML = '';
  const scrollIcons = { ng:'📜', d:'📗', c:'📘', b:'📙', a:'📕', s:'🌟' };
  let has = false;

  for (const grade of GRADE_ORDER) {
    const w = hero.scrolls[grade]?.weapon || 0;
    const a = hero.scrolls[grade]?.armor || 0;

    if (w > 0) {
      has = true;
      const el = document.createElement('div');
      el.className = 'scroll-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Оружие</span><span class="scroll-count">×${w}</span>`;
      el.dataset.cat = 'scroll';
      el.dataset.grade = grade;
      el.dataset.scrollType = 'weapon';
      el.dataset.count = String(w);
      sc.appendChild(el);
    }

    if (a > 0) {
      has = true;
      const el = document.createElement('div');
      el.className = 'scroll-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `<span class="scroll-icon">${scrollIcons[grade]}</span><span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Броня</span><span class="scroll-count">×${a}</span>`;
      el.dataset.cat = 'scroll';
      el.dataset.grade = grade;
      el.dataset.scrollType = 'armor';
      el.dataset.count = String(a);
      sc.appendChild(el);
    }
  }

  // Бафф-свитки из рюкзака
  const buffItems = hero.backpack.filter(it => it.kind === 'buff');
  for (const item of buffItems) {
    const def = BUFF_SCROLLS[item.buffType];
    if (!def) continue;
    has = true;
    const el = document.createElement('div');
    el.className = 'scroll-item';
    el.style.borderColor = def.color;
    const cnt = item.count || 1;
    el.innerHTML = `<span class="scroll-icon">${iconHtml(item.icon)}</span><span class="scroll-name" style="color:${def.color}">${item.name}</span><span class="scroll-count">×${cnt}</span>`;
    el.dataset.cat = 'buff';
    el.dataset.buffType = item.buffType;
    el.dataset.count = String(cnt);
    sc.appendChild(el);
  }

  if (!has) sc.innerHTML = '<div class="bp-empty">Нет свитков</div>';
}

function renderPotions() {
  const hero = state.hero;
  const pot = document.getElementById('potions-list');
  if (!pot) return;
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
    el.dataset.cat = 'potion';
    el.dataset.potionType = type;
    el.dataset.count = String(c);
    pot.appendChild(el);
  }
  if (!has) pot.innerHTML = '<div class="bp-empty">Нет зелий</div>';
}



function renderSoulshots() {
  const hero = state.hero;
  const ss = document.getElementById('soulshots-list');
  if (!ss) return;
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
    el.dataset.cat = 'soulshot';
    el.dataset.grade = grade;
    el.dataset.count = String(c);
    ss.appendChild(el);
  }
  if (!has) ss.innerHTML = '<div class="bp-empty">Нет сосок</div>';
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
    if (item.kind !== 'equip') continue;   // только экипировка
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
  const bonusLine = item.source === 'shop'
    ? '<span style="color:#7a2a2a;font-size:7px">❌ без бонуса</span>'
    : (bonus ? bonus.icon + ' ' + bonus.display : '');
  el.innerHTML = `
    <div class="ei-icon">${iconHtml(item.icon)}</div>
    <div class="ei-enh" style="opacity:${item.enhance > 0 ? 1 : 0}">+${item.enhance}</div>
    <div class="ei-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
    <div class="ei-stats">${statsTwoMain(item)}</div>
    <div class="ei-bonus" style="color:#fbbf24;font-size:8px;font-weight:bold">${bonusLine}</div>
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
    <div class="eh-head"><span class="eh-icon">${iconHtml(item.icon)}</span><span class="eh-name">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</span></div>
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
  let cls = 'fail';
  let txt = 'FAIL';
  if (result === 'success') { cls = 'success'; txt = `+${item.enhance}`; }
  else if (result === 'downgrade') { cls = 'fail'; txt = `+${item.enhance} ↓`; }
  else if (result === 'fail') { cls = 'fail'; txt = blessedUsed ? 'СПАСЁН' : 'FAIL'; }
  else if (result === 'destroyed') { cls = 'destroyed'; txt = '💥'; }

  div.className = 'enhance-anim ' + cls;
  div.textContent = txt;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 900);

  if (result === 'success') {
    toast(`Успех! +${item.enhance}`, 'legendary');
  } else if (result === 'downgrade') {
    toast(`⚠️ Провал — откат до +${item.enhance}`, 'epic');
  } else if (result === 'fail') {
    toast(blessedUsed ? 'Провал (Blessed спас)' : 'Заточка провалилась', 'epic');
  } else if (result === 'destroyed') {
    toast('💥 Предмет сгорел', 'unique');
  }
}

function showBigEnhanceAnim(item, useBlessed) {
  const hero = state.hero;
  const overlay = document.createElement('div');
  overlay.className = 'enhance-overlay';
  const card = document.createElement('div');
  card.className = 'enhance-big-card';
  card.innerHTML = `<div class="ebc-inner"><div class="ebc-icon">${iconHtml(item.icon)}</div><div class="ebc-enh" id="ebc-enh">+${item.enhance}</div><div class="ebc-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div></div>`;
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
    }
    else if (r.result === 'downgrade') {
      // Откат до +6 — вещь не сгорает
      enhEl.textContent = '+' + item.enhance + ' ↓';
      enhEl.style.color = '#ef4444';
      card.classList.add('glow-fail');
      toast(`⚠️ Провал — откат до +${item.enhance}`, 'epic');
    }
    else if (r.result === 'fail') {
      enhEl.textContent = 'FAIL';
      enhEl.style.color = '#ef4444';
      card.classList.add('glow-fail');
      toast(useBlessed ? 'Провал (Blessed спас)' : 'Провал', 'epic');
    }
    else if (r.result === 'destroyed') {
      enhEl.textContent = '💥';
      enhEl.style.color = '#dc2626';
      card.classList.add('glow-destroyed');
      toast('Предмет сгорел', 'unique');
      enhanceSelectedItem = getNextBackpackItem(item, true);
    }

    callbacks.onEquipChange && callbacks.onEquipChange();
    setTimeout(() => { overlay.remove(); renderEnhance(); }, 1200);
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

  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.flexWrap = 'wrap';
  grid.style.gap = 'var(--cell-gap)';
  grid.style.padding = '4px';
  grid.style.justifyContent = 'flex-start';
  grid.style.alignContent = 'flex-start';
  grid.style.background = '#05070d';
  grid.style.border = '1px solid var(--l2-border)';
  grid.style.borderRadius = '3px';
  content.appendChild(grid);

  // ─── Экипировка ───
  if (shopCat === 'equipment') {
    for (const entry of shop.stock.equipment) {
      const realItem = callbacks.makeItem(shop.stock.grade, entry.slot, entry.weaponType, entry.variant, 'shop');
      if (!realItem) continue;
      const el = document.createElement('div');
      el.className = 'bp-item';
      const gc = gradeColor(realItem.grade);
      el.style.borderColor = gc;
      el.innerHTML = `
        <div class="bp-icon">${iconHtml(realItem.icon)}</div>
        <div class="bp-grade" style="color:${gc}">${gradeShort(realItem.grade)}</div>
        <div class="bp-name">${realItem.name}</div>
      `;
      el.addEventListener('click', () => {
        _openBuyDialog({
          title: realItem.name,
          icon: realItem.icon,
          price: entry.price,
          subtitle: `Грейд: ${gradeName(realItem.grade)}`,
        }, (qty) => {
          let last = null;
          for (let i = 0; i < qty; i++) {
            const r = buyEquipment(shop, state.hero, state, entry.slot, entry.weaponType, entry.variant);
            if (!r.ok) { last = r; break; }
            last = r;
          }
          if (last && last.ok) toast(`🛒 ${realItem.name} ×${qty}`, shop.stock.grade);
          else if (last && last.reason === 'no_gold') toast('Недостаточно золота', 'epic');
          renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
          return last;
        });
      });
      grid.appendChild(el);
    }
  }

  // ─── Свитки ───
  else if (shopCat === 'scrolls') {
    for (const type of ['weapon','armor']) {
      const entry = shop.stock.scrolls[type];
      const have = state.hero.scrolls[shop.stock.grade]?.[type] || 0;
      const tName = type === 'weapon' ? 'Оружие' : 'Броня';
      const el = document.createElement('div');
      el.className = 'bp-item';
      el.style.borderColor = gradeColor(shop.stock.grade);
      el.innerHTML = `
        <div class="bp-icon">📜</div>
        <div class="bp-grade" style="color:${gradeColor(shop.stock.grade)}">${gradeShort(shop.stock.grade)}</div>
        <div class="bp-name">${tName}</div>
        <div class="bp-book-lvl" style="color:#d4af37">×${have}</div>
      `;
      el.addEventListener('click', () => {
        _openBuyDialog({
          title: `Свиток: ${tName}`,
          icon: '📜',
          price: entry.price,
          subtitle: `У тебя: ${have}`,
        }, (qty) => {
          let last = null;
          for (let i = 0; i < qty; i++) {
            const r = buyScroll(shop, state.hero, state, type);
            if (!r.ok) { last = r; break; }
            last = r;
          }
          if (last && last.ok) toast(`🛒 Свиток ×${qty}`, shop.stock.grade);
          else if (last && last.reason === 'no_gold') toast('Недостаточно золота', 'epic');
          renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
          return last;
        });
      });
      grid.appendChild(el);
    }
  }

  // ─── Зелья ───
  else if (shopCat === 'potions') {
    for (const type of POTION_ORDER) {
      const p = POTIONS[type];
      const have = state.hero.potions[type] || 0;
      const el = document.createElement('div');
      el.className = 'bp-item';
      el.style.borderColor = p.color;
      el.innerHTML = `
        <div class="bp-icon">${iconHtml(p.icon)}</div>
        <div class="bp-grade" style="color:${p.color}">HP</div>
        <div class="bp-name">${p.name}</div>
        <div class="bp-book-lvl" style="color:#d4af37">×${have}</div>
      `;
      el.addEventListener('click', () => {
        _openBuyDialog({
          title: p.name,
          icon: p.icon,
          price: p.price,
          subtitle: `Восст. ${p.heal} HP · У тебя: ${have}`,
        }, (qty) => {
          let last = null;
          for (let i = 0; i < qty; i++) {
            const r = buyPotion(shop, state.hero, state, type);
            if (!r.ok) { last = r; break; }
            last = r;
          }
          if (last && last.ok) toast(`🛒 ${p.name} ×${qty}`, 'rare');
          else if (last && last.reason === 'no_gold') toast('Недостаточно золота', 'epic');
          renderShop();
          callbacks.onEquipChange && callbacks.onEquipChange();
          return last;
        });
      });
      grid.appendChild(el);
    }
  }

  // ─── Соски ───
  else if (shopCat === 'soulshots') {
    const entry = shop.stock.soulshots;
    const have = state.hero.soulshots[shop.stock.grade] || 0;
    const el = document.createElement('div');
    el.className = 'bp-item';
    el.style.borderColor = gradeColor(shop.stock.grade);
    el.innerHTML = `
      <div class="bp-icon">⚡</div>
      <div class="bp-grade" style="color:${gradeColor(shop.stock.grade)}">${gradeShort(shop.stock.grade)}</div>
      <div class="bp-name">Соски ×10</div>
      <div class="bp-book-lvl" style="color:#d4af37">×${have}</div>
    `;
    el.addEventListener('click', () => {
      _openBuyDialog({
        title: `Соски ${gradeName(shop.stock.grade)}`,
        icon: '⚡',
        price: entry.price,
        subtitle: `Пачка 10 шт. · У тебя: ${have}`,
      }, (qty) => {
        let last = null;
        let total = 0;
        for (let i = 0; i < qty; i++) {
          const r = buySoulshot(shop, state.hero, state);
          if (!r.ok) { last = r; break; }
          last = r;
          total += 10;
        }
        if (last && last.ok) toast(`🛒 Соски ×${total}`, shop.stock.grade);
        else if (last && last.reason === 'no_gold') toast('Недостаточно золота', 'epic');
        renderShop();
        callbacks.onEquipChange && callbacks.onEquipChange();
        return last;
      });
    });
    grid.appendChild(el);
  }
}
// ===== МАГАЗИН: покупка через диалог с количеством =====
function showShopItemPopup(entry, realItem) {
  const price = entry.price;
  _openBuyDialog({
    title: realItem.name,
    icon: realItem.icon,
    price,
    subtitle: `Грейд: ${gradeName(realItem.grade)}`,
  }, (qty) => {
    let last = null;
    for (let i = 0; i < qty; i++) {
      const r = buyEquipment(shop, state.hero, state, entry.slot, entry.weaponType, entry.variant);
      if (!r.ok) { last = r; break; }
      last = r;
    }
    if (last && last.ok) {
      toast(`🛒 ${realItem.name} ×${qty}`, shop.stock.grade);
      callbacks.onEquipChange && callbacks.onEquipChange();
    } else if (last && last.reason === 'no_gold') {
      toast('Недостаточно золота', 'epic');
    }
    renderShop();
    return last;
  });
}

function showShopResourcePopup(entry, kind, key) {
  let title, icon, price, extraLine = '';

  if (kind === 'scroll') {
    const tName = key === 'weapon' ? 'Оружие' : 'Броня';
    title = `Свиток: ${tName}`;
    icon = '📜';
    price = entry.price;
    const have = state.hero.scrolls[shop.stock.grade]?.[key] || 0;
    extraLine = `У тебя: ${have}`;
  }
  else if (kind === 'potion') {
    const p = POTIONS[key];
    title = p.name;
    icon = p.icon;
    price = p.price;
    const have = state.hero.potions[key] || 0;
    extraLine = `Восст. ${p.heal} HP · У тебя: ${have}`;
  }
  else if (kind === 'soulshot') {
    title = `Соски ${gradeName(shop.stock.grade)}`;
    icon = '⚡';
    price = entry.price;
    const have = state.hero.soulshots[shop.stock.grade] || 0;
    extraLine = `Пачка 10 шт. · У тебя: ${have}`;
  }


}




// ─── Универсальный диалог покупки ────────────────────────────

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
      <div class="auction-icon">${iconHtml(item.icon)}</div>
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
    else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; statsLine = `<span style="color:${def.color};font-weight:bold">${iconHtml(def.icon, 14)} ${def.desc}</span>`; }
    else if (item.kind === 'pass') statsLine = '<span style="color:#a855f7;font-weight:bold">🎫 Пропуск на арену</span>';
    else statsLine = statsCompact(item);
    const nameColor = item.kind === 'blessed' ? '#fbbf24' : item.kind === 'buff' ? BUFF_SCROLLS[item.buffType].color : item.kind === 'pass' ? '#a855f7' : gradeColor(item.grade);
    const row = document.createElement('div');
    row.className = 'sell-item-row';
    row.innerHTML = `
      <div class="auction-icon">${iconHtml(item.icon)}</div>
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
    const cnt = item.count || 1;
    const total = 90;
    const pct = Math.max(0, Math.min(100, ((total - l.timeLeft) / total) * 100));
    const row = document.createElement('div');
    row.className = 'my-listing';
    row.innerHTML = `
      <div class="auction-icon">${iconHtml(item.icon)}</div>
      <div class="sell-info" style="flex:1">
        <div class="sell-name">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}${cnt > 1 ? ' ×' + cnt : ''}</div>
        <div class="progress-bar" style="margin-top:4px"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="sell-prices">${l.price}💰 / шт · Итого: ${l.price * cnt}💰</div>
      </div>
      <button class="ml-cancel" data-cancel-id="${l.id}" title="Вернуть в рюкзак">✕</button>
    `;
    el.appendChild(row);
  }

  el.querySelectorAll('[data-cancel-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.cancelId, 10);
      const r = cancelListing(auction, state.hero, id);
      if (r.ok) {
        toast(`↩ Возвращено: ${r.item.name}${r.quantity > 1 ? ' ×' + r.quantity : ''}`, 'rare');
        renderAuctionMy();
        renderHero();
        callbacks.onEquipChange && callbacks.onEquipChange();
      } else {
        toast('Не удалось снять лот', 'epic');
      }
    });
  });
}

function showSellPopup(item) {
  const estimate = estimateItemValue(item);
  const cnt = item.count || 1;
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');

  let headInfo = '';
  if (item.kind === 'blessed') headInfo = '<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#fbbf24">✨ Blessed Scroll</span></div>';
  else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; headInfo = `<div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:${def.color}">${def.desc}</span></div>`; }
  else if (item.kind === 'pass') headInfo = '<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#a855f7">🎫 Пропуск на арену</span></div>';
  else if (item.kind === 'book') {
    const def = SKILLS[item.skillId];
    headInfo = `<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#60a5fa">📖 Книга: ${def?.name || item.skillId}</span></div>`;
  }
  else headInfo = `<div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>${statsMultiline(item)}`;

  body.innerHTML = `
    <div class="item-icon-big">${iconHtml(item.icon)}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    ${headInfo}
    <div class="stat-row"><span class="stat-name">В рюкзаке</span><span class="stat-val">${cnt} шт.</span></div>
    <div class="stat-row"><span class="stat-name">Оценка за 1 шт</span><span class="stat-val" style="color:#fbbf24">${estimate}💰</span></div>

    <div class="sell-input-row">
      <label class="sell-label">Кол-во</label>
      <input type="number" id="sell-qty" min="1" max="${cnt}" value="1" class="sell-input">
    </div>
    <div class="sell-input-row">
      <label class="sell-label">Цена / шт</label>
      <input type="number" id="sell-price" min="1" value="${estimate}" class="sell-input">
    </div>
    <div class="sell-input-row">
      <label class="sell-label">Итого</label>
      <span id="sell-total" class="sell-total">${estimate}💰</span>
    </div>

    <button class="popup-close" id="pp-auction-list" style="border-color:#4ade80;color:#4ade80">💰 Выставить на аукцион</button>
    <button class="popup-close" id="pp-close" style="border-color:#64748b;color:#64748b">Закрыть</button>
  `;
  popup.classList.remove('hidden');

  const qtyEl = document.getElementById('sell-qty');
  const priceEl = document.getElementById('sell-price');
  const totalEl = document.getElementById('sell-total');

  const updateTotal = () => {
    const q = Math.max(1, Math.min(parseInt(qtyEl.value) || 1, cnt));
    const p = Math.max(1, parseInt(priceEl.value) || 1);
    totalEl.innerHTML = `${(q * p).toLocaleString()}💰`;
  };
  qtyEl.addEventListener('input', updateTotal);
  priceEl.addEventListener('input', updateTotal);

  document.getElementById('pp-close').addEventListener('click', hideItemPopup);
  document.getElementById('pp-auction-list').addEventListener('click', () => {
    const q = Math.max(1, Math.min(parseInt(qtyEl.value) || 1, cnt));
    const p = Math.max(1, parseInt(priceEl.value) || 1);
    const r = listItem(auction, state.hero, item, p, q);
    if (r.ok) {
      toast(`Выставлено: ${item.name} ×${r.listed} за ${r.price}💰`, 'rare');
      hideItemPopup();
      renderAuctionSell();
      renderHero();
      callbacks.onEquipChange && callbacks.onEquipChange();
    } else {
      toast('Не удалось выставить', 'epic');
    }
  });
}
export function showItemPopup(item, context) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  const estimate = estimateItemValue(item);
  let actionBtns = '';
  if (context === 'backpack') {
    // ── Кнопка «Надеть» для экипировки (если можно) ──
    if (item.kind === 'equip') {
      const can = canEquip(state.hero, item);
      if (can) {
        actionBtns += `<button class="popup-close" id="pp-equip" style="border-color:#4ade80;color:#b9f5c8">✅ Надеть</button>`;
      } else {
        // Не подходит — покажем почему
        let reason = 'Нельзя надеть';
        if (item.slot === 'weapon' && item.weaponType !== state.hero.weaponType) {
          reason = '✗ Оружие другого класса';
        } else {
          const g = GRADES[item.grade];
          if (g && state.hero.level < g.levelReq) {
            reason = `✗ Нужен ${g.levelReq} уровень`;
          }
        }
        actionBtns += `<button class="popup-close" disabled style="border-color:#7a2a2a;color:#b83232;cursor:not-allowed">${reason}</button>`;
      }
    }

    // ── Кнопка «Изучить» для книжек ──
    if (item.kind === 'book') {
      const def = SKILLS[item.skillId];
      const cls = def?.class || 'common';
      const isForbidden = cls !== 'common' && cls !== state.hero.classType;
      if (isForbidden) {
        const clsName = cls === 'archer' ? 'Лучника' : cls === 'mage' ? 'Мага' : '';
        actionBtns += `<button class="popup-close" disabled style="border-color:#7a2a2a;color:#b83232;cursor:not-allowed">✗ Книга ${clsName}</button>`;
      } else {
        actionBtns += `<button class="popup-close" id="pp-learn" style="border-color:#60a5fa;color:#60a5fa">📖 Изучить</button>`;
      }
    }

    // ── Продажа доступна всегда ──
    actionBtns += `<button class="popup-close" id="pp-sell" style="border-color:#fbbf24;color:#fbbf24">Продать боту (${Math.floor(estimate * 0.5)}💰)</button>`;
  } else if (context === 'equip') {
    actionBtns = `<button class="popup-close" id="pp-unequip">Снять</button>`;
  }

  let extra = '';
  // Активный бонус (если уже ≥15)
  const bonus = getEnhanceBonus(item);
  if (bonus) {
    extra += `<div class="stat-row" style="color:#fbbf24;background:rgba(212,175,55,.08);padding:4px;border-radius:3px;margin-top:4px">
      <span class="stat-name">${bonus.icon} ${bonus.name}</span>
      <span class="stat-val">${bonus.display}</span>
    </div>`;
  }
    // Превью бонуса на +15
  // Превью бонуса на +15
  if (item.kind === 'equip' && item.enhance < 15) {
    if (item.source === 'shop') {
      extra += `<div class="stat-row" style="opacity:.55;font-size:9px;padding:3px 0">
        <span class="stat-name" style="color:#94a3b8">❌ Бонус +15</span>
        <span class="stat-val" style="color:#94a3b8">недоступен (магазин)</span>
      </div>`;
    } else {
      const willBonus = getEnhanceBonus({ ...item, enhance: 15 });
      if (willBonus) {
        extra += `<div class="stat-row" style="opacity:.75;font-size:9px;color:#c9a961;padding:3px 0">
          <span class="stat-name">🌟 Бонус на +15</span>
          <span class="stat-val" style="color:#c9a961">${willBonus.icon} ${willBonus.display}</span>
        </div>`;
      }
    }
  }

  let bodyHtml = '';
  if (item.kind === 'pass') bodyHtml = `<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#a855f7">🎫 Пропуск на арену</span></div><div class="stat-row"><span class="stat-name">Описание</span><span class="stat-val">1 бой на арене</span></div>`;
  else if (item.kind === 'book') {
    const def = SKILLS[item.skillId];
    const lvl = state.hero.skills?.[item.skillId]?.level || 0;
    bodyHtml = `
      <div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#60a5fa">📖 Книга скилла</span></div>
      ${def ? `<div class="stat-row"><span class="stat-name">Скилл</span><span class="stat-val">${iconHtml(def.icon, 14)} ${def.name}</span></div>` : ''}
      ${def ? `<div class="stat-row"><span class="stat-name">Описание</span><span class="stat-val">${SKILL_DESC[item.skillId] || def.desc || ''}</span></div>` : ''}
      ${def ? `<div class="stat-row"><span class="stat-name">Мана</span><span class="stat-val">${def.manaCost}</span></div>` : ''}
      ${def ? `<div class="stat-row"><span class="stat-name">КД</span><span class="stat-val">${def.cooldown}с</span></div>` : ''}
      <div class="stat-row"><span class="stat-name">Уровень</span><span class="stat-val">${lvl > 0 ? 'Lv.' + lvl : 'не изучен'}</span></div>
    `;
  }  else if (item.kind === 'buff') { const def = BUFF_SCROLLS[item.buffType]; bodyHtml = `<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:${def.color}">📜 Боевой свиток</span></div><div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:${def.color}">${def.desc}</span></div>${item.count > 1 ? `<div class="stat-row"><span class="stat-name">Количество</span><span class="stat-val">×${item.count}</span></div>` : ''}`; }
  else if (item.kind === 'blessed') bodyHtml = `<div class="stat-row"><span class="stat-name">Тип</span><span class="stat-val" style="color:#fbbf24">✨ Blessed-скролл</span></div><div class="stat-row"><span class="stat-name">Эффект</span><span class="stat-val" style="color:#fbbf24">Спасает от сгорания</span></div>${item.count > 1 ? `<div class="stat-row"><span class="stat-name">Количество</span><span class="stat-val">×${item.count}</span></div>` : ''}`;
  else bodyHtml = `<div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div><div class="stat-row"><span class="stat-name">Слот</span><span class="stat-val">${SLOT_NAMES[item.slot] || '—'}</span></div>${statsMultiline(item)}`;

  body.innerHTML = `
    <div class="item-icon-big">${iconHtml(item.icon)}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    ${bodyHtml}${extra}${actionBtns}
    <button class="popup-close" id="pp-close" style="border-color:#64748b;color:#64748b">Закрыть</button>
  `;
  popup.classList.remove('hidden');

  document.getElementById('pp-close')?.addEventListener('click', hideItemPopup);
  document.getElementById('pp-learn')?.addEventListener('click', () => {
    const r = learnSkill(state.hero, item.skillId);
    if (!r.ok) {
      if (r.reason === 'max_level') toast('Уже максимальный уровень', 'epic');
      else if (r.reason === 'wrong_class') {
        const clsName = r.requiredClass === 'archer' ? 'Лучнику' : r.requiredClass === 'mage' ? 'Магу' : '?';
        toast(`Книга только для класса: ${clsName}`, 'epic');
      }
      else toast('Нельзя изучить', 'epic');
      return;
    }
    const idx = state.hero.backpack.indexOf(item);
    if (idx >= 0) {
      const it = state.hero.backpack[idx];
      if ((it.count || 1) > 1) it.count -= 1;
      else state.hero.backpack.splice(idx, 1);
    }
    if (r.learned) toast(`📖 Изучен: ${SKILLS[item.skillId].name} (Lv.1)`, 'legendary');
    else toast(`📖 ${SKILLS[item.skillId].name} → Lv.${r.level}`, 'legendary');
    hideItemPopup();
    renderHeroTabs();
    renderSkillBar();
    callbacks.onEquipChange && callbacks.onEquipChange();
  });  document.getElementById('pp-equip')?.addEventListener('click', () => {
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




function _openBuyDialog(info, buyFn) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  if (!popup || !body) return;

  let qty = 1;
  const maxQty = Math.max(1, Math.floor(state.gold / info.price));

  function render() {
    const total = qty * info.price;
    const canAfford = total <= state.gold;
    body.innerHTML = `
      <div class="item-icon-big">${iconHtml(info.icon, 48)}</div>
      <h3 style="text-align:center;margin-bottom:4px">${info.title}</h3>
      ${info.subtitle ? `<div style="text-align:center;font-size:11px;color:#94a3b8;margin-bottom:8px">${info.subtitle}</div>` : ''}

      <div class="stat-row"><span class="stat-name">Цена за 1</span><span class="stat-val">${info.price.toLocaleString()}💰</span></div>
      <div class="stat-row"><span class="stat-name">В кошельке</span><span class="stat-val">${state.gold.toLocaleString()}💰</span></div>

      <div class="stat-row" style="align-items:center">
        <span class="stat-name">Количество</span>
        <span class="stat-val" style="display:flex;gap:4px;align-items:center">
          <button class="qty-btn" id="qty-minus">−</button>
          <input id="qty-input" type="number" min="1" max="${maxQty}" value="${qty}">
          <button class="qty-btn" id="qty-plus">+</button>
        </span>
      </div>

      <div class="stat-row" style="border-top:1px solid #d4af37;margin-top:6px;padding-top:6px">
        <span class="stat-name" style="font-size:12px">ИТОГО</span>
        <span class="stat-val" style="color:${canAfford ? '#fbbf24' : '#ef4444'};font-size:18px;font-weight:900">${total.toLocaleString()}💰</span>
      </div>

      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="popup-close" id="qty-buy" style="border-color:${canAfford ? '#4ade80' : '#64748b'};color:${canAfford ? '#4ade80' : '#64748b'};flex:1;font-size:13px;font-weight:bold" ${canAfford ? '' : 'disabled'}>✅ Купить</button>
        <button class="popup-close" id="qty-max" style="border-color:#fbbf24;color:#fbbf24;flex:1;font-size:13px;font-weight:bold">Макс (${maxQty})</button>
      </div>
      <button class="popup-close" id="qty-cancel" style="border-color:#64748b;color:#64748b;margin-top:6px">Отмена</button>
    `;

    const input = document.getElementById('qty-input');
    input.addEventListener('input', () => {
      qty = Math.max(1, Math.min(maxQty || 1, parseInt(input.value) || 1));
      render();
    });
    document.getElementById('qty-minus').onclick = () => { qty = Math.max(1, qty - 1); render(); };
    document.getElementById('qty-plus').onclick  = () => { qty = Math.min(maxQty, qty + 1); render(); };
    document.getElementById('qty-max').onclick   = () => { qty = maxQty; render(); };
    document.getElementById('qty-buy').onclick   = () => {
      if (qty * info.price > state.gold) return;
      buyFn(qty);
      hideItemPopup();
    };
    document.getElementById('qty-cancel').onclick = hideItemPopup;
  }

  render();
  popup.classList.remove('hidden');
}


export function hideItemPopup() {
  document.getElementById('item-popup').classList.add('hidden');
}

export function toast(text, cls = '') {
  if (window._offlineSim) return;
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  if (text.includes('<')) el.innerHTML = text;
  else el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 2000);
  while (container.children.length > 6) container.removeChild(container.firstChild);
}
window.toast = toast;

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
  const myClassIcon = hero.classType === 'mage' ? '🔮' : '🏹';

  el.innerHTML = all.map((entry, i) => {
    const place = i + 1;
    if (entry.type === 'me') {
      return `<div class="arena-row arena-row-me">
        <span class="ar-place">#${place}</span>
        <span class="ar-class">${myClassIcon}</span>
        <span class="ar-name">⭐ ${hero.name} (ты)</span>
        <span class="ar-level">Lv.${hero.level}</span>
        <span class="ar-rating">${entry.rating}</span>
        <span class="ar-rest">🎫 ${passes}</span>
      </div>`;
    }
    const bot = entry.bot;
    const classIcon = bot.isTest ? '🧪' : (bot.classType === 'mage' ? '🔮' : '🏹');
    const level = bot.level || (1 + Math.floor(bot.rating / 30));
    const expected = expectedScore(hero.arena.rating, bot.rating);
    const winChange = Math.round(32 * (1 - expected));
    const loseChange = Math.round(32 * (0 - (1 - expected)));

    return `<div class="arena-row arena-row-bot">
      <span class="ar-place">#${place}</span>
      <span class="ar-class">${classIcon}</span>
      <span class="ar-name">${bot.name}</span>
      <span class="ar-level">Lv.${level}</span>
      <span class="ar-rating">${bot.rating}</span>
      <span class="ar-change">${winChange >= 0 ? '+' : ''}${winChange}/${loseChange}</span>
      <button class="ar-btn" data-fight="${bot.id}" ${passes <= 0 ? 'disabled' : ''}>Сравнить</button>
    </div>`;
  }).join('');

  el.querySelectorAll('[data-fight]').forEach(btn => {
    btn.addEventListener('click', () => {
      const botId = btn.dataset.fight;
      openCompareModal(botId);
    });
  });
}

function openCompareModal(botId) {
  const hero = state.hero;
  const bot = arena.bots.find(b => String(b.id) === String(botId));
  if (!bot) { toast('Бот не найден', 'epic'); return; }

  compareBotId = botId;

  const myStats = hero;
  const oppStats = getBotStats(bot);
  const expected = expectedScore(hero.arena.rating, bot.rating);
  const winChange = Math.round(32 * (1 - expected));
  const loseChange = Math.round(32 * (0 - (1 - expected)));
  const passes = hero.backpack.filter(x => x.kind === 'pass').reduce((s,x) => s + (x.count||1), 0);

  const modal = document.getElementById('modal-compare');
  const body = document.getElementById('compare-body');
  if (!modal || !body) return;

  const mySS = Object.values(hero.soulshots || {}).reduce((a,b) => a+b, 0);
  const myPot = Object.values(hero.potions || {}).reduce((a,b) => a+b, 0);
  const myScr = hero.backpack.filter(x => x.kind === 'buff').reduce((a,b) => a + (b.count||1), 0);
  const oppSS = Object.values(bot.soulshots || {}).reduce((a,b) => a+b, 0);
  const oppPot = Object.values(bot.potions || {}).reduce((a,b) => a+b, 0);
  const oppScr = Object.values(bot.activeBuffs || {}).filter(x => x).length;

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
      </div>
      <div class="cmp-vs">VS</div>
      <div class="cmp-side">
        <div class="cmp-avatar ${bot.classType === 'mage' ? 'battle-mage' : 'battle-archer'}">${bot.classType === 'mage' ? '🔮' : '🏹'}</div>
        <div class="cmp-name">${bot.name}</div>
        <div class="cmp-level">Lv.${bot.level || (1 + Math.floor(bot.rating / 30))} · ${bot.classType === 'mage' ? '🔮' : '🏹'}</div>
      </div>
    </div>

    <div class="cmp-section">
      <div class="cmp-title">📊 Статы</div>
      ${compare('Атака', '⚔', myStats.attack, oppStats.attack)}
      ${compare('Защита', '🛡', myStats.defense, oppStats.defense)}
      ${compare('HP', '❤', myStats.maxHp, oppStats.maxHp)}
      ${compare('Мана', '🔷', myStats.maxMana, oppStats.maxMana || 0)}
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
  const bot = arena.bots.find(b => String(b.id) === String(botId));
  if (!bot) { toast('Бот не найден', 'epic'); return; }

  // Закрываем модалку арены + сравнения
  const modalArena = document.getElementById('modal-arena');
  if (modalArena) modalArena.classList.add('hidden');
  const modalCmp = document.getElementById('modal-compare');
  if (modalCmp) modalCmp.classList.add('hidden');

  // Передаём в main.js — он переключит режим
  if (typeof window.enterArena === 'function') {
    window.enterArena(bot);
  } else {
    toast('Арена не инициализирована', 'epic');
  }
}

// ===== РЕЗУЛЬТАТ АРЕНЫ (вызывается из main.js) =====
export function onArenaEnd(resultData) {
  if (!resultData) return;

  // Возвращаемся в город
  showCityScreen();
  if (callbacks.onEquipChange) callbacks.onEquipChange();

  const { won, result, ratingChange: change, oldRating, newRating, botName } = resultData;
  const title = won ? '🏆 Победа!' : (result === 'draw' ? '🤝 Ничья' : '💀 Поражение');
  const color = won ? '#4ade80' : (result === 'draw' ? '#94a3b8' : '#ef4444');
  const changeText = change > 0 ? `+${change}` : `${change}`;
  const changeColor = change > 0 ? '#4ade80' : (change < 0 ? '#ef4444' : '#94a3b8');

  toast(`${title} vs ${botName} · рейтинг ${changeText}`, won ? 'legendary' : 'epic');

  showArenaResultOverlay({
    title, color,
    botName, change, changeText, changeColor,
    oldRating, newRating, won,
    log: resultData.log || [],
    duration: resultData.duration || 0,
    myHpLeft: resultData.myHpLeft,
    myMaxHp: resultData.myMaxHp,
    oppHpLeft: resultData.oppHpLeft,
    oppMaxHp: resultData.oppMaxHp,
  });
}

function showArenaResultOverlay(info) {
  const oldOverlay = document.getElementById('arena-result-overlay');
  if (oldOverlay) oldOverlay.remove();

  const overlay = document.createElement('div');
  overlay.id = 'arena-result-overlay';
  overlay.className = 'arena-result-overlay';

  // Лог боя
  const logLines = (info.log || [])
    .slice(-80)
    .map(ev => renderArenaLogRow(ev))
    .join('');

  // HP-полоски
  const myMax = info.myMaxHp || 1;
  const oppMax = info.oppMaxHp || 1;
  const myHpPct = info.myHpLeft != null ? Math.max(0, Math.min(100, info.myHpLeft / myMax * 100)) : 100;
  const oppHpPct = info.oppHpLeft != null ? Math.max(0, Math.min(100, info.oppHpLeft / oppMax * 100)) : 100;

  overlay.innerHTML = `
    <div class="aro-panel aro-panel-large">
      <div class="aro-title" style="color:${info.color}">${info.title}</div>
      <div class="aro-sub">vs ${info.botName}${info.duration ? ' · ' + info.duration.toFixed(1) + 'с' : ''}</div>
      <div class="aro-rating">
        Рейтинг: ${info.oldRating} → <b>${info.newRating}</b>
        <span style="color:${info.changeColor}">(${info.changeText})</span>
      </div>

      ${info.myHpLeft != null ? `
      <div class="aro-hp-row">
        <span class="aro-hp-label arl-me">Ты</span>
        <div class="aro-hp-bar"><div class="aro-hp-fill arl-me" style="width:${myHpPct}%"></div></div>
        <span class="aro-hp-num">${info.myHpLeft} / ${info.myMaxHp}</span>
      </div>
      <div class="aro-hp-row">
        <span class="aro-hp-label arl-opp">Враг</span>
        <div class="aro-hp-bar"><div class="aro-hp-fill arl-opp" style="width:${oppHpPct}%"></div></div>
        <span class="aro-hp-num">${info.oppHpLeft} / ${info.oppMaxHp}</span>
      </div>
      ` : ''}

      <div class="aro-log-title">📜 Лог боя</div>
      <div class="arl-body" id="arl-body">${logLines || '<div class="arl-empty">Лог пуст</div>'}</div>

      <div class="aro-log-title">🎁 Награда</div>
      <div class="aro-cards" id="aro-cards"></div>
      <div class="aro-hint">Нажми на карточку</div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Скроллим лог вниз
  const logBody = overlay.querySelector('#arl-body');
  if (logBody) logBody.scrollTop = logBody.scrollHeight;

  // Карточки наград
  const cityGrade = CITIES[state.currentCity].grade;
  const rewards = rollCardRewards(info.won, cityGrade);
  const cardsEl = overlay.querySelector('#aro-cards');
  cardsEl.innerHTML = rewards.map((reward, i) => `
    <div class="reward-card card-${reward.rarity}" data-idx="${i}" style="animation-delay:${i * 0.15}s">
      <div class="card-glow"></div>
      <div class="card-icon">${iconHtml(reward.icon, 44)}</div>
      <div class="card-name">${reward.name}</div>
      <div class="card-rarity">${getRarityLabel(reward.rarity)}</div>
    </div>
  `).join('');

  cardsEl.querySelectorAll('.reward-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('card-picked')) return;
      const idx = parseInt(card.dataset.idx, 10);
      const reward = rewards[idx];

      cardsEl.querySelectorAll('.reward-card').forEach(c => {
        if (c === card) c.classList.add('card-picked');
        else c.classList.add('card-dimmed');
      });

      applyCardReward(state.hero, reward);

      setTimeout(() => {
        overlay.classList.add('reward-closing');
        setTimeout(() => overlay.remove(), 300);
      }, 1200);
    });
  });
}
// Рендер одной строки лога боя
function renderArenaLogRow(ev) {
  const t = (ev.t || 0).toFixed(1);
  const side = ev.side === 'me' ? 'me' : 'opp';
  const who = `<span class="arl-who arl-${side}">${ev.attacker || ev.name || '?'}</span>`;
  const tgt = ev.target ? `<span class="arl-tgt">→ ${ev.target}</span>` : '';

  if (ev.kind === 'miss') {
    return `<div class="arl-row arl-miss"><span class="arl-t">${t}с</span>${who} ${tgt}: <b>промах</b></div>`;
  }
  if (ev.kind === 'potion') {
    return `<div class="arl-row arl-potion"><span class="arl-t">${t}с</span>${who}: <b>🧪 +${ev.heal} HP</b></div>`;
  }
  if (ev.kind === 'death') {
    return `<div class="arl-row arl-death"><span class="arl-t">${t}с</span><b>💀 ${ev.name} погиб</b></div>`;
  }
  if (ev.kind === 'debuff') {
    const icon = ev.debuff === 'stun' ? '💫' : (ev.debuff === 'slow' ? '❄️' : '✦');
    const label = ev.debuff === 'stun' ? 'стан' : (ev.debuff === 'slow' ? 'замедление' : 'дебафф');
    return `<div class="arl-row arl-debuff"><span class="arl-t">${t}с</span>${who} ${tgt}: <b>${icon} ${label} ${(ev.duration || 0).toFixed(1)}с</b></div>`;
  }
  // hit / skill
  const crit = ev.crit ? ' <span class="arl-crit">💥КРИТ</span>' : '';
  const skill = ev.kind === 'skill' ? ' <span class="arl-skill">✦ умение</span>' : '';
  return `<div class="arl-row arl-hit${ev.crit ? ' arl-row-crit' : ''}"><span class="arl-t">${t}с</span>${who} ${tgt}: <b class="arl-dmg">-${ev.damage}</b>${crit}${skill}</div>`;
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
          <div class="battle-emoji">${iconHtml(b.myEmoji, 30)}</div>
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
          <div class="battle-emoji">${iconHtml(b.oppEmoji, 30)}</div>
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
            <div class="card-icon">${iconHtml(reward.icon, 44)}</div>
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
      msg = `${iconHtml(item.icon)} ${item.name}`;
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
    } else {
      lsEl.classList.add('hidden');
    }
  }
  // Кнопка "Справочник"
  const wikiBtnWrap = document.getElementById('wiki-btn-wrap');
  if (!wikiBtnWrap) {
    const wrap = document.createElement('div');
    wrap.id = 'wiki-btn-wrap';
    wrap.style.cssText = 'display:flex;justify-content:center;margin:8px 0;width:100%;max-width:400px';
    const btn = document.createElement('button');
    btn.className = 'city-btn';
    btn.textContent = '📖 Справочник';
    btn.onclick = () => {
      if (window.__openWiki) window.__openWiki();
    };
    wrap.appendChild(btn);
    document.getElementById('city-zones').before(wrap);
  }
  const zonesEl = document.getElementById('city-zones');
    if (!document.getElementById('wiki-btn-wrap')) {
    const wrap = document.createElement('div');
    wrap.id = 'wiki-btn-wrap';
    wrap.style.cssText = 'display:flex;justify-content:center;margin:8px 0;width:100%;max-width:400px';
    const btn = document.createElement('button');
    btn.className = 'city-btn';
    btn.textContent = '📖 Справочник';
    btn.onclick = () => openWiki();
    wrap.appendChild(btn);
    document.getElementById('city-zones').before(wrap);
  }
  zonesEl.innerHTML = '';

  const hero = state.hero;
  const offlineZoneId = (hero && hero.offlineActive) ? hero.offlineZoneId : null;

  for (const zone of city.zones) {
    const isOfflineZone = offlineZoneId === zone.id;
    const card = document.createElement('div');
    card.className = 'zone-card zone-' + zone.diff;

    let html = `
      <div class="zone-name">${zone.name}</div>
      <div class="zone-diff">${zoneDifficultyLabel(zone.diff)}</div>
      <div class="zone-cost">Телепорт: ${zone.teleportCost}💰</div>
    `;

    if (isOfflineZone) {
      html += `<button class="zone-offline-check" data-zone="${zone.id}" style="margin-top:6px;width:100%;background:linear-gradient(180deg,#312e81,#1e1b4b);border:1px solid #6366f1;color:#a5b4fc;padding:6px;border-radius:4px;font-family:inherit;font-size:11px;font-weight:bold;cursor:pointer;">💤 Проверить героя</button>`;
    }

    card.innerHTML = html;

    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('zone-offline-check')) return;
      if (state.gold < zone.teleportCost) { toast('Недостаточно золота', 'epic'); return; }
      callbacks.onEnterZone && callbacks.onEnterZone(zone.id);
    });

    if (isOfflineZone) {
      const btn = card.querySelector('.zone-offline-check');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (state.gold < zone.teleportCost) { toast('Недостаточно золота', 'epic'); return; }
          callbacks.onEnterZone && callbacks.onEnterZone(zone.id);
        });
      }
    }

    zonesEl.appendChild(card);
  }
}

export function showCityScreen() {
  // Сброс таргета + скрыть плашки
  if (window.state) window.state.target = null;
  document.body.classList.add('city-open');

  // Гарантированно убираем всё, что связано с ареной
  const _ids = ['arena-hud', 'arena-side-me', 'arena-side-opp', 'arena-mobile-hud'];
  for (const id of _ids) {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  }
  document.body.classList.remove('arena-active');

  const city = document.getElementById('city-screen');
  if (city) city.classList.remove('hidden');
  const ht = document.getElementById('hud-top');
  if (ht) ht.classList.remove('hidden');
  const hs = document.getElementById('hud-stats');
  if (hs) hs.classList.remove('hidden');
  const hz = document.getElementById('hud-zone');
  if (hz) hz.classList.add('hidden');
  const cl = document.getElementById('combat-log');
  if (cl) cl.classList.add('hidden');

  const mb = document.getElementById('mana-bar-wrap');
  if (mb) mb.classList.remove('hidden');

  // Плашки игрока и таргета — скрываем в городе
  const mePlate = document.getElementById('hud-plate-me');
  if (mePlate) mePlate.classList.add('hidden');
  const tgtPlate = document.getElementById('hud-plate-target');
  if (tgtPlate) tgtPlate.classList.add('hidden');

  // Офлайн-кнопка в шапке — в городе не нужна
  const offBtn = document.getElementById('hud-offline');
  if (offBtn) offBtn.style.display = 'none';

  // Skill-bar — скрываем
  const sb = document.getElementById('skill-bar');
  if (sb) sb.classList.add('hidden');
  const ab = document.getElementById('btn-auto');
  if (ab) ab.classList.add('hidden');
  renderCityScreen();
}
export function hideCityScreen() {
  document.body.classList.remove('city-open');
  const city = document.getElementById('city-screen');
  if (city) city.classList.add('hidden');
  const ht = document.getElementById('hud-top');
  if (ht) ht.classList.remove('hidden');
  const hs = document.getElementById('hud-stats');
  if (hs) hs.classList.remove('hidden');
  const hz = document.getElementById('hud-zone');
  if (hz) hz.classList.remove('hidden');
  const cl = document.getElementById('combat-log');
  if (cl) cl.classList.remove('hidden');

  const mb = document.getElementById('mana-bar-wrap');
  if (mb) mb.classList.remove('hidden');

  // Офлайн-кнопка в шапке
  const offBtn = document.getElementById('hud-offline');
  if (offBtn) offBtn.style.display = '';

  // Skill-bar — показываем в бою
  const sb = document.getElementById('skill-bar');
  if (sb) sb.classList.remove('hidden');
    const ab2 = document.getElementById('btn-auto');
  if (ab2) ab2.classList.remove('hidden');
  const ab = document.getElementById('btn-auto');
  if (ab) ab.classList.remove('hidden');
  // Плашка игрока — видна в бою (фарм + арена)
  const mePlate = document.getElementById('hud-plate-me');
  if (mePlate) mePlate.classList.remove('hidden');

  // Плашка таргета — покажем если есть цель
  const tgtPlate = document.getElementById('hud-plate-target');
  if (tgtPlate) {
    if (state?.target && !state.target.dead) tgtPlate.classList.remove('hidden');
    else tgtPlate.classList.add('hidden');
  }

  renderSkillBar();
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

// ===== БОКОВЫЕ ПАНЕЛИ АРЕНЫ =====
function isMobileView() {
  return window.innerWidth <= 900;
}

export function showArenaHud(oppName) {
    console.log('[showArenaHud] called, before:', document.getElementById('arena-side-me')?.className);

  // Верхняя плашка
  const el = document.getElementById('arena-hud');
  if (el) { el.classList.remove('hidden'); el.style.display = ''; }
  const nameEl = document.getElementById('ah-opp-name');
  if (nameEl) nameEl.textContent = oppName || 'Противник';

  // Боковые панели
  const me = document.getElementById('arena-side-me');
  const opp = document.getElementById('arena-side-opp');
  if (me) { me.classList.remove('hidden'); me.style.display = ''; }
  if (opp) { opp.classList.remove('hidden'); opp.style.display = ''; }

  // Название врага
  const oppNameEl = document.getElementById('as-opp-name');
  if (oppNameEl) oppNameEl.textContent = oppName || 'Враг';

  document.body.classList.add('arena-active');

  // Кнопка «Выйти»
  const exitBtn = document.getElementById('ah-exit');
  if (exitBtn && !exitBtn.dataset.bound) {
    exitBtn.dataset.bound = '1';
    exitBtn.addEventListener('click', () => {
      if (typeof window.exitArena === 'function') window.exitArena();
    });
  }

  // Скиллы и АВТО — как в зоне
  const sb = document.getElementById('skill-bar');
  if (sb) sb.classList.remove('hidden');
  const ab = document.getElementById('btn-auto');
  if (ab) ab.classList.remove('hidden');

  state.arenaElapsed = 0;
  updateArenaHud();
}

export function hideArenaHud() {
  const ids = ['arena-hud', 'arena-side-me', 'arena-side-opp', 'arena-mobile-hud'];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.style.display = 'none';
    }
  }
  document.body.classList.remove('arena-active');
}

// ===== ОБНОВЛЕНИЕ ПАНЕЛЕЙ =====
export function updateArenaHud() {
  const hero = state?.hero;
  const enemy = state?.arenaEnemy;

  // Секундомер
  state.arenaElapsed = (state.arenaElapsed || 0) + 0.05;
  const timerEl = document.getElementById('ah-timer');
  if (timerEl) {
    const sec = state.arenaElapsed;
    const m = Math.floor(sec / 60);
    const s = (sec % 60).toFixed(1);
    timerEl.textContent = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }

  if (!hero || !enemy) return;

  // HP / мана — ты
  const meHpPct = Math.max(0, Math.min(100, hero.hp / hero.maxHp * 100));
  const meManaPct = hero.maxMana > 0 ? Math.max(0, Math.min(100, hero.mana / hero.maxMana * 100)) : 0;

  setFillWidth('as-me-hp-fill', meHpPct);
  setFillWidth('as-me-mana-fill', meManaPct);
  setFillWidth('amh-me-hp', meHpPct);
  setFillWidth('amh-me-mana', meManaPct);
  setText('as-me-hp-text', `${Math.max(0, Math.floor(hero.hp))}/${hero.maxHp}`);
  setText('as-me-mana-text', `${Math.floor(hero.mana)}/${hero.maxMana}`);

  // HP / мана — враг
  const oppHpPct = Math.max(0, Math.min(100, enemy.hp / enemy.maxHp * 100));
  const oppManaPct = enemy.maxMana > 0 ? Math.max(0, Math.min(100, enemy.mana / enemy.maxMana * 100)) : 0;

  setFillWidth('as-opp-hp-fill', oppHpPct);
  setFillWidth('as-opp-mana-fill', oppManaPct);
  setFillWidth('amh-opp-hp', oppHpPct);
  setFillWidth('amh-opp-mana', oppManaPct);
  setText('as-opp-hp-text', `${Math.max(0, Math.floor(enemy.hp))}/${enemy.maxHp}`);
  setText('as-opp-mana-text', `${Math.floor(enemy.mana)}/${enemy.maxMana}`);

  // Скиллы — ты
  renderArenaSkillIcons('as-me-skills', 'amh-me-skills', hero);
  // Скиллы — враг
  renderArenaSkillIcons('as-opp-skills', 'amh-opp-skills', enemy);

  // Баффы — ты (только десктоп)
  renderArenaBuffs('as-me-buffs', hero);
  // Баффы — враг
  renderArenaBuffs('as-opp-buffs', enemy);
}

function setFillWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = pct + '%';
}
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderArenaSkillIcons(sideId, mobileId, char) {
  const container = document.getElementById(sideId);
  const mobile = document.getElementById(mobileId);
  const rawSlots = char.skillSlots || [];

  // Парсим слоты: "skill:fireball" → "fireball"
  const slots = rawSlots.map(s => {
    if (!s || typeof s !== 'string') return null;
    const idx = s.indexOf(':');
    if (idx === -1) return s;
    const kind = s.slice(0, idx);
    if (kind !== 'skill') return null;
    return s.slice(idx + 1);
  });
  // ... дальше как было

  if (container) {
    container.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const skillId = slots[i];
      const def = skillId ? SKILLS[skillId] : null;
      const cd = skillId ? (char.skillCooldowns?.[skillId] || 0) : 0;
      const ready = skillId && cd <= 0;
      const el = document.createElement('div');
      el.className = 'as-skill' + (def ? '' : ' empty') + (ready ? ' ready' : '') + (cd > 0 ? ' on-cd' : '');
      if (def) {
        el.innerHTML = `
          <span class="as-skill-icon">${def.icon}</span>
          <span class="as-skill-cd">${cd > 0 ? Math.ceil(cd) : ''}</span>
        `;
      } else {
        el.innerHTML = `<span class="as-skill-icon" style="opacity:0.2">·</span>`;
      }
      container.appendChild(el);
    }
  }

  if (mobile) {
    mobile.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const skillId = slots[i];
      const def = skillId ? SKILLS[skillId] : null;
      const cd = skillId ? (char.skillCooldowns?.[skillId] || 0) : 0;

      const el = document.createElement('div');
      el.className = 'amh-skill' + (cd > 0 ? ' on-cd' : '');
      if (def) {
        el.textContent = def.icon;
        if (cd > 0) el.dataset.cd = String(Math.ceil(cd));
      } else {
        el.textContent = '·';
        el.style.opacity = '0.3';
      }
      mobile.appendChild(el);
    }
  }
}

function renderArenaBuffs(containerId, char) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  const now = Date.now();
  const buffs = [];

  // ── Скилловые баффы (skillBuffs) ──
  const sb = char.skillBuffs || {};
  const sbMap = {
    dodge: { icon: '💨', color: '#80d4e0' },
    attackSpeed: { icon: '⚡', color: '#fde047' },
    defense: { icon: '🛡', color: '#60a5fa' },
    attack: { icon: '🗡', color: '#ef4444' },
    critChance: { icon: '💥', color: '#f97316' },
    lifesteal: { icon: '🩸', color: '#e07878' },
    reflect: { icon: '🪞', color: '#c084fc' },
    range: { icon: '📏', color: '#a3e635' },
  };
  for (const key in sb) {
    const b = sb[key];
    if (b && b.until > now) {
      const m = sbMap[key] || { icon: '✦', color: '#94a3b8' };
      buffs.push({ icon: m.icon, time: Math.ceil((b.until - now) / 1000), color: m.color });
    }
  }

  // ── Свитки (activeBuffs) ──
  for (const type of ['attack', 'crit', 'speed', 'range']) {
    const until = char.activeBuffs?.[type];
    if (until && until > now) {
      const def = BUFF_SCROLLS[type];
      if (def) buffs.push({ icon: def.icon, time: Math.ceil((until - now) / 1000), color: def.color });
    }
  }

  // ── Щит ──
  if (char.shield && char.shield.until > now && char.shield.remaining > 0) {
    buffs.push({ icon: '🔮', time: Math.ceil((char.shield.until - now) / 1000), color: '#60a5fa' });
  }

  // ── Дебаффы (stun/slow/silence/frost) ──
  if (char.stunUntil && char.stunUntil > now) {
    buffs.push({ icon: '💫', time: Math.ceil((char.stunUntil - now) / 1000), color: '#fbbf24', debuff: true });
  }
  if (char.slowUntil && char.slowUntil > now) {
    buffs.push({ icon: '❄️', time: Math.ceil((char.slowUntil - now) / 1000), color: '#67e8f9', debuff: true });
  }
  if (char.silenceUntil && char.silenceUntil > now) {
    buffs.push({ icon: '🤐', time: Math.ceil((char.silenceUntil - now) / 1000), color: '#3b82f6', debuff: true });
  }
  if (char.attackSpeedDebuff && char.attackSpeedDebuff.until > now) {
    buffs.push({ icon: '🐢', time: Math.ceil((char.attackSpeedDebuff.until - now) / 1000), color: '#67e8f9', debuff: true });
  }
  if (char.dots && char.dots.length > 0) {
    buffs.push({ icon: '🩸', time: '', color: '#22c55e', debuff: true });
  }

  for (const b of buffs) {
    const el = document.createElement('div');
    el.className = 'as-buff' + (b.time && b.time <= 2 ? ' expiring' : '');
    if (b.color) el.style.borderColor = b.color;
    el.innerHTML = `${b.icon}${b.time ? `<span class="as-buff-time">${b.time}</span>` : ''}`;
    container.appendChild(el);
  }
}
// ===== ПАНЕЛЬ СКИЛЛОВ В HUD =====
// Получить иконку и суб-текст по типу слота
function _slotDisplay(slotStr, hero) {
  const parsed = parseSlotAction(slotStr);
  if (!parsed) return { icon: '·', sub: '', kind: 'empty', empty: true };

  const { kind, id } = parsed;

  if (kind === 'skill') {
    const def = SKILLS[id];
    if (!def) return { icon: '·', sub: '', kind: 'empty', empty: true };
    const cost = getSkillManaCost(hero, id);
    return { icon: def.icon, sub: String(cost), kind: 'skill', skillDef: def, id };
  }
  if (kind === 'potion') {
    const def = POTIONS[id];
    const count = hero.potions?.[id] || 0;
    return { icon: def?.icon || '🧪', sub: String(count), kind: 'potion', id, count };
  }
  if (kind === 'soulshot') {
    const count = hero.soulshots?.[id] || 0;
    return { icon: '⚡', sub: String(count), kind: 'soulshot', id, count };
  }
  if (kind === 'buff') {
    const def = BUFF_SCROLLS[id];
    let count = 0;
    for (const x of hero.backpack || []) {
      if (x.kind === 'buff' && x.buffType === id) count += (x.count || 1);
    }
    return { icon: def?.icon || '📜', sub: String(count), kind: 'buff', id, count };
  }
  return { icon: '·', sub: '', kind: 'empty', empty: true };
}

export function renderSkillBar() {
  const hero = state?.hero;
  const bar = document.getElementById('skill-bar');
  if (!bar || !hero) return;
  const btns = bar.querySelectorAll('.skill-btn');

  for (let i = 0; i < btns.length; i++) {
    const btn = btns[i];
    if (!btn) continue;
    const slotStr = hero.skillSlots?.[i] || null;

    const iconEl = btn.querySelector('.skill-icon');
    const manaEl = btn.querySelector('.skill-mana');

    if (!slotStr) {
      btn.classList.add('empty');
      btn.classList.remove('ready', 'on-cd');
      btn.disabled = true;
      if (iconEl) iconEl.textContent = '·';
      if (manaEl) manaEl.textContent = '';
      btn.dataset.slotKind = '';
      btn.dataset.slotId = '';
      continue;
    }

    const disp = _slotDisplay(slotStr, hero);
    btn.classList.remove('empty');
    btn.dataset.slotKind = disp.kind;
    btn.dataset.slotId = disp.id || '';
    btn.dataset.slotStr = slotStr;
    if (iconEl) iconEl.textContent = disp.icon;
    if (manaEl) manaEl.textContent = disp.sub;

    if (disp.kind === 'skill') {
      const ready = isSkillReady(hero, disp.id);
      const hasMana = hero.mana >= (getSkillManaCost(hero, disp.id) || 0);
      btn.disabled = !ready || !hasMana;
      btn.classList.toggle('ready', ready && hasMana);
      btn.classList.remove('on-cd');
    } else if (disp.kind === 'potion') {
      btn.disabled = !disp.count;
      btn.classList.remove('ready', 'on-cd');
    } else if (disp.kind === 'soulshot') {
      btn.disabled = false;
      btn.classList.toggle('ready', !!hero.soulshotActive && hero.soulshotGrade === disp.id);
      btn.classList.remove('on-cd');
    } else if (disp.kind === 'buff') {
      const now = Date.now();
      const active = hero.activeBuffs?.[disp.id] && hero.activeBuffs[disp.id] > now;
      const cd = hero.buffScrollCooldowns?.[disp.id] || 0;
      const hasScroll = disp.count > 0;
      btn.disabled = !hasScroll || active || cd > now;
      btn.classList.toggle('ready', !active && cd <= now && hasScroll);
      btn.classList.remove('on-cd');
    }
  }
}

export function updateSkillBar() {
  const hero = state?.hero;
  const bar = document.getElementById('skill-bar');
  if (!bar || !hero || bar.classList.contains('hidden')) return;
  const btns = bar.querySelectorAll('.skill-btn');
  const now = Date.now();

  for (let i = 0; i < btns.length; i++) {
    const btn = btns[i];
    if (!btn || btn.classList.contains('empty')) continue;
    const slotStr = btn.dataset.slotStr || hero.skillSlots?.[i];
    if (!slotStr) continue;
    const parsed = parseSlotAction(slotStr);
    if (!parsed) continue;

    const iconEl = btn.querySelector('.skill-icon');
    const manaEl = btn.querySelector('.skill-mana');
    const cdNum = btn.querySelector('.skill-cd-num');

    if (parsed.kind === 'skill') {
      const cd = getSkillRemainingCooldown(hero, parsed.id);
      const cost = getSkillManaCost(hero, parsed.id);
      if (iconEl) iconEl.textContent = SKILLS[parsed.id]?.icon || '·';
      if (manaEl) manaEl.textContent = String(cost);
      if (cd > 0) {
        btn.classList.add('on-cd');
        if (cdNum) cdNum.textContent = Math.ceil(cd);
      } else {
        btn.classList.remove('on-cd');
        if (cdNum) cdNum.textContent = '';
      }
      const ready = cd <= 0;
      const hasMana = hero.mana >= cost;
      btn.disabled = !ready || !hasMana;
      btn.classList.toggle('ready', ready && hasMana);

    } else if (parsed.kind === 'potion') {
      const count = hero.potions?.[parsed.id] || 0;
      const cd = hero.potionCooldown || 0;
      const isActive = hero.activePotion === parsed.id;
      if (manaEl) manaEl.textContent = String(count);
      if (cd > 0) {
        btn.classList.add('on-cd');
        if (cdNum) cdNum.textContent = Math.ceil(cd);
      } else {
        btn.classList.remove('on-cd');
        if (cdNum) cdNum.textContent = '';
      }
      btn.classList.toggle('ready', count > 0 && cd <= 0 && isActive);
      btn.disabled = count <= 0 || cd > 0;

    } else if (parsed.kind === 'soulshot') {
      const count = hero.soulshots?.[parsed.id] || 0;
      if (manaEl) manaEl.textContent = String(count);
      btn.classList.remove('on-cd');
      const isOn = !!hero.soulshotActive && hero.soulshotGrade === parsed.id;
      btn.classList.toggle('ready', isOn);
      btn.disabled = false;
      if (cdNum) cdNum.textContent = '';

    } else if (parsed.kind === 'buff') {
      const cd = hero.buffScrollCooldowns?.[parsed.id] || 0;
      const active = hero.activeBuffs?.[parsed.id] && hero.activeBuffs[parsed.id] > now;
      if (cd > now) {
        btn.classList.add('on-cd');
        if (cdNum) cdNum.textContent = Math.ceil((cd - now) / 1000);
      } else if (active) {
        btn.classList.add('on-cd');
        if (cdNum) cdNum.textContent = '✓';
      } else {
        btn.classList.remove('on-cd');
        if (cdNum) cdNum.textContent = '';
      }
      const hasScroll = (function(){
        for (const x of hero.backpack || []) {
          if (x.kind === 'buff' && x.buffType === parsed.id) return true;
        }
        return false;
      })();
      btn.disabled = !hasScroll;
      btn.classList.toggle('ready', !active && cd <= now && hasScroll);
    }
  }
}

window.showArenaHud = showArenaHud;
window.hideArenaHud = hideArenaHud;
window.updateArenaHud = updateArenaHud;
window.onArenaEnd = onArenaEnd;
