import { LOCATIONS, SLOTS, SLOT_NAMES, GRADES, TELEPORT_COST, GRADE_ORDER, scrollType } from './config.js';
import { itemStats, estimateItemValue, gradeName, gradeShort, gradeColor, createItem } from './items.js';
import { equipItem, unequipItem, canEquip, tryEnhance, MAX_ENHANCE, ENHANCE_CHANCE } from './hero.js';
import { buyListing, listItem, sellToBot } from './auction.js';
import { buildStock, buyEquipment, buyScroll, buyPotion, buySoulshot } from './shop.js';

let state = null;
let auction = null;
let shop = null;
let callbacks = {};
let currentAuctionTab = 'buy';
let shopCat = 'equipment';
let shopGrade = 'ng';
let heroTab = 'backpack';

export function initUI(s, a, sh, cb = {}) {
  state = s;
  auction = a;
  shop = sh;
  callbacks = cb;

  document.querySelectorAll('#bottom-panel button').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.panel));
  });
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m.id.replace('modal-', ''));
    });
  });
  document.getElementById('item-popup').addEventListener('click', (e) => {
    if (e.target.id === 'item-popup') hideItemPopup();
  });

  // Табы аукциона
  document.querySelectorAll('#modal-auction .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentAuctionTab = btn.dataset.tab;
      document.querySelectorAll('#modal-auction .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('#modal-auction .tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('auction-' + currentAuctionTab).classList.remove('hidden');
      renderAuction();
    });
  });

  // Табы магазина
  document.querySelectorAll('#shop-cat-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      shopCat = btn.dataset.shopCat;
      document.querySelectorAll('#shop-cat-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderShop();
    });
  });

  // Табы героя
  document.querySelectorAll('#hero-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      heroTab = btn.dataset.heroTab;
      document.querySelectorAll('#hero-tabs .tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.hero-tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById('hero-tab-' + heroTab).classList.remove('hidden');
    });
  });
}

export function refreshUI() {
  if (!state || !state.hero) return;
  const hero = state.hero;
  document.getElementById('bp-hero-badge').textContent = hero.backpack.length;
  document.getElementById('bp-hero-badge').classList.toggle('show', hero.backpack.length > 0);
  const soldCount = auction ? auction.myListings.filter(l => l.sold).length : 0;
  const badge = document.getElementById('bp-auction-badge');
  if (badge) {
    badge.textContent = soldCount;
    badge.classList.toggle('show', soldCount > 0);
  }
}

export function openModal(name) {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  const modal = document.getElementById('modal-' + name);
  if (!modal) return;
  modal.classList.remove('hidden');
  if (name === 'map') renderMap();
  if (name === 'hero') renderHero();
  if (name === 'enhance') renderEnhance();
  if (name === 'shop') renderShop();
  if (name === 'auction') renderAuction();
}

export function closeModal(name) {
  document.getElementById('modal-' + name).classList.add('hidden');
  hideItemPopup();
}

// ===== КАРТА =====
function renderMap() {
  const list = document.getElementById('map-list');
  list.innerHTML = '';
  for (const [id, loc] of Object.entries(LOCATIONS)) {
    const unlocked = state.hero.level >= loc.unlockLevel;
    const current = state.currentLocation === id;
    const el = document.createElement('div');
    el.className = 'map-item' + (current ? ' current' : '') + (unlocked ? '' : ' locked');
    el.innerHTML = `
      <div class="map-item-name">${loc.name}</div>
      <div class="map-item-sub">${loc.sub}</div>
      <div class="map-item-level">${current ? '● Текущая' : 'Ур. ' + loc.unlockLevel + '+'}</div>
    `;
    if (unlocked && !current) el.addEventListener('click', () => showMapInfo(id));
    list.appendChild(el);
  }
}

function showMapInfo(id) {
  const loc = LOCATIONS[id];
  const info = document.getElementById('map-info');
  info.classList.remove('hidden');
  info.innerHTML = `
    <h3>${loc.name}</h3>
    <p>${loc.sub}</p>
    <p>Телепорт: <span style="color:#fbbf24">${TELEPORT_COST} 💰</span></p>
    <button id="btn-travel">Телепортироваться</button>
  `;
  document.getElementById('btn-travel').addEventListener('click', () => {
    if (state.gold < TELEPORT_COST) { toast('Недостаточно золота', 'epic'); return; }
    callbacks.onTravel && callbacks.onTravel(id, TELEPORT_COST);
    closeModal('map');
  });
}

// ===== ГЕРОЙ =====
function renderHero() {
  const hero = state.hero;

  // Манекен
  const man = document.getElementById('mannequin');
  man.innerHTML = '';
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    const el = document.createElement('div');
    el.className = 'eq-slot' + (item ? '' : ' empty');
    el.dataset.drop = 'slot';
    el.dataset.slot = slot;
    if (item) {
      el.innerHTML = `
        ${item.icon}
        <span class="slot-label">${SLOT_NAMES[slot]}</span>
        ${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}
      `;
      el.style.borderColor = gradeColor(item.grade);
      el.addEventListener('click', (e) => {
        if (e.target.closest('.bp-item')) return;
        showItemPopup(item, 'equip');
      });
    } else {
      el.textContent = SLOT_NAMES[slot];
    }
    man.appendChild(el);
  }

  // Статы персонажа
  const stats = document.getElementById('hero-stats');
  stats.innerHTML = `
    <div class="stat-row"><span>Уровень</span><span class="stat-val">${hero.level}</span></div>
    <div class="stat-row"><span>HP</span><span class="stat-val">${Math.ceil(hero.hp)} / ${hero.maxHp}</span></div>
    <div class="stat-row"><span>Атака</span><span class="stat-val">${Math.round(hero.attack)}</span></div>
    <div class="stat-row"><span>Защита</span><span class="stat-val">${Math.round(hero.defense)}</span></div>
    <div class="stat-row"><span>Скор. атаки</span><span class="stat-val">${hero.attackSpeed.toFixed(2)}</span></div>
    <div class="stat-row"><span>Радиус</span><span class="stat-val">${hero.range.toFixed(1)}</span></div>
  `;

  // Рюкзак
  const grid = document.getElementById('backpack-grid');
  grid.innerHTML = '';
  if (hero.backpack.length === 0) {
    grid.innerHTML = '<div class="bp-empty">Рюкзак пуст</div>';
  } else {
    for (const item of hero.backpack) {
      const el = document.createElement('div');
      el.className = 'bp-item';
      el.style.borderColor = gradeColor(item.grade);
      el.innerHTML = `
        ${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}
        <div class="bp-icon">${item.icon}</div>
        <div class="bp-grade" style="color:${gradeColor(item.grade)}">${gradeShort(item.grade)}</div>
        <div class="bp-name">${item.name}</div>
        <div class="bp-stats">${statsCompact(item)}</div>
      `;
      el.addEventListener('pointerdown', (e) => startDrag(e, item, 'backpack'));
      grid.appendChild(el);
    }
  }

  // Свитки
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
      el.innerHTML = `
        <span class="scroll-icon">${scrollIcons[grade]}</span>
        <span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Оружие</span>
        <span class="scroll-count">×${w}</span>
      `;
      sc.appendChild(el);
    }
    if (a > 0) {
      hasScrolls = true;
      const el = document.createElement('div');
      el.className = 'scroll-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `
        <span class="scroll-icon">${scrollIcons[grade]}</span>
        <span class="scroll-name" style="color:${gradeColor(grade)}">${gradeName(grade)} · Броня</span>
        <span class="scroll-count">×${a}</span>
      `;
      sc.appendChild(el);
    }
  }
  if (!hasScrolls) sc.innerHTML = '<div class="bp-empty">Нет свитков</div>';

  // Зелья
  const pot = document.getElementById('potions-list');
  if (pot) {
    pot.innerHTML = '';
    if (hero.potions.hp > 0) {
      const el = document.createElement('div');
      el.className = 'potion-item';
      el.innerHTML = `
        <span class="potion-icon">🧪</span>
        <span class="scroll-name" style="color:#ef4444">Зелье HP</span>
        <span class="potion-count">×${hero.potions.hp}</span>
      `;
      pot.appendChild(el);
    } else {
      pot.innerHTML = '<div class="bp-empty">Нет зелий</div>';
    }
  }

  // Соски
  const ss = document.getElementById('soulshots-list');
  if (ss) {
    ss.innerHTML = '';
    let hasSS = false;
    for (const grade of GRADE_ORDER) {
      const c = hero.soulshots[grade] || 0;
      if (c <= 0) continue;
      hasSS = true;
      const el = document.createElement('div');
      el.className = 'soulshot-item';
      el.style.borderColor = gradeColor(grade);
      el.innerHTML = `
        <span class="soulshot-icon">⚡</span>
        <span class="scroll-name" style="color:${gradeColor(grade)}">Соски ${gradeName(grade)}</span>
        <span class="soulshot-count">×${c}</span>
      `;
      ss.appendChild(el);
    }
    if (!hasSS) ss.innerHTML = '<div class="bp-empty">Нет сосок</div>';
  }
}

// ===== ЗАТОЧКА =====
function renderEnhance() {
  const hero = state.hero;
  const slots = document.getElementById('enhance-slots');
  slots.innerHTML = '';
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    const el = document.createElement('div');
    el.className = 'enhance-slot' + (item ? '' : ' empty');
    if (item) {
      el.innerHTML = `${item.icon}${item.enhance > 0 ? `<span class="enh">+${item.enhance}</span>` : ''}`;
      el.style.borderColor = gradeColor(item.grade);
      el.addEventListener('click', () => {
        document.querySelectorAll('.enhance-slot').forEach(s => s.classList.remove('selected'));
        el.classList.add('selected');
        showEnhanceDetail(item);
      });
    } else {
      el.textContent = SLOT_NAMES[slot];
    }
    slots.appendChild(el);
  }
  document.getElementById('enhance-detail').innerHTML = '<p class="muted">Нажми на вещь, чтобы заточить</p>';
}

function showEnhanceDetail(item) {
  const hero = state.hero;
  const detail = document.getElementById('enhance-detail');
  const stats = itemStats(item);
  const chance = item.enhance < MAX_ENHANCE ? ENHANCE_CHANCE[item.enhance] : 0;
  const stype = scrollType(item.slot);
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  const isMax = item.enhance >= MAX_ENHANCE;

  const statLines = Object.entries(stats).map(([k, v]) => {
    const nm = { hp:'HP', attack:'Атака', defense:'Защита' }[k] || k;
    return `<div class="row"><span>${nm}</span><span class="val">+${v}</span></div>`;
  }).join('');

  detail.innerHTML = `
    <h3>${item.icon} ${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    <div class="row"><span>Грейд</span><span class="val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
    ${statLines}
    <div class="row" style="margin-top:8px;border-top:1px solid #334155;padding-top:8px"><span>Заточка</span><span class="val">+${item.enhance} / +${MAX_ENHANCE}</span></div>
    ${isMax ? '<div class="row"><span>Максимум</span><span class="val good">✓</span></div>' :
      `<div class="row"><span>Шанс успеха</span><span class="val ${chance >= 0.5 ? 'good' : 'bad'}">${(chance*100).toFixed(0)}%</span></div>
       <div class="row"><span>Свитков ${stype === 'weapon' ? 'оружия' : 'брони'}</span><span class="val ${scrollsHave > 0 ? '' : 'bad'}">${scrollsHave}</span></div>`}
    <button class="enhance-btn" ${isMax || scrollsHave <= 0 ? 'disabled' : ''}>${isMax ? 'Максимум' : 'Точить'}</button>
  `;

  const btn = detail.querySelector('.enhance-btn');
  if (btn && !isMax && scrollsHave > 0) {
    btn.addEventListener('click', () => {
      const r = tryEnhance(hero, item);
      if (!r.ok) { toast(r.reason === 'no_scroll' ? 'Нет свитков' : 'Нельзя', 'epic'); return; }
      playEnhanceAnim(r.result, item);
      callbacks.onEquipChange && callbacks.onEquipChange();
      setTimeout(() => {
        renderEnhance();
        const slotIdx = SLOTS.indexOf(item.slot);
        if (slotIdx >= 0 && hero.equipment[item.slot] === item) {
          const els = document.querySelectorAll('.enhance-slot');
          if (els[slotIdx]) {
            els[slotIdx].classList.add('selected');
            showEnhanceDetail(item);
          }
        }
      }, 800);
    });
  }
}

function playEnhanceAnim(result, item) {
  const div = document.createElement('div');
  div.className = 'enhance-anim ' + (result === 'success' ? 'success' : result === 'fail' ? 'fail' : 'destroyed');
  div.textContent = result === 'success' ? `+${item.enhance}` : result === 'fail' ? 'FAIL' : '💥';
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 1200);
  if (result === 'success') toast(`Заточка успешна: +${item.enhance}`, 'legendary');
  else if (result === 'fail') toast('Заточка провалилась', 'epic');
  else toast('💥 Предмет уничтожен', 'unique');
}

// ===== Хелперы статов =====
function statsCompact(item) {
  const s = itemStats(item);
  const parts = [];
  if (s.attack)  parts.push(`<span class="atk">⚔${s.attack}</span>`);
  if (s.defense) parts.push(`<span class="def">🛡${s.defense}</span>`);
  if (s.hp)      parts.push(`<span class="hp">❤${s.hp}</span>`);
  return parts.join('');
}

function statsHtml(item) {
  const s = itemStats(item);
  const parts = [];
  if (s.attack)  parts.push(`<span>⚔ ${s.attack}</span>`);
  if (s.defense) parts.push(`<span>🛡 ${s.defense}</span>`);
  if (s.hp)      parts.push(`<span>❤ ${s.hp}</span>`);
  return parts.join('');
}

// ===== МАГАЗИН =====
function renderShop() {
  const gradeTabsEl = document.getElementById('shop-grade-tabs');
  gradeTabsEl.innerHTML = '';
  if (shopCat !== 'potions') {
    for (const g of GRADE_ORDER) {
      const btn = document.createElement('button');
      btn.className = 'grade-tab' + (g === shopGrade ? ' active' : '');
      btn.textContent = gradeShort(g);
      btn.style.color = g === shopGrade ? gradeColor(g) : '';
      btn.addEventListener('click', () => { shopGrade = g; renderShop(); });
      gradeTabsEl.appendChild(btn);
    }
  }

  const content = document.getElementById('shop-content');
  content.innerHTML = '';
  if (!shop.stock) shop.stock = buildStock();

  if (shopCat === 'equipment') {
    const items = shop.stock.equipment[shopGrade];
    for (const entry of items) {
      const sampleItem = createItem(entry.grade, entry.slot);
      const s = itemStats(sampleItem);
      const statParts = [];
      if (s.attack) statParts.push(`<span>⚔ ${s.attack}</span>`);
      if (s.defense) statParts.push(`<span>🛡 ${s.defense}</span>`);
      if (s.hp) statParts.push(`<span>❤ ${s.hp}</span>`);
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">${entry.icon}</div>
        <div class="auction-info">
          <div class="auction-name">${entry.name}</div>
          <div class="auction-grade" style="color:${gradeColor(entry.grade)}">${gradeName(entry.grade)}</div>
          <div class="auction-stats">${statParts.join('')}</div>
        </div>
        <div class="auction-price">${entry.price}💰</div>
        <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
      `;
      row.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        const r = buyEquipment(shop, state.hero, state, entry.grade, entry.slot);
        if (r.ok) {
          toast(`Куплено: ${entry.name}`, entry.grade);
          callbacks.onEquipChange && callbacks.onEquipChange();
          renderShop();
          refreshUI();
        } else if (r.reason === 'no_gold') toast('Недостаточно золота', 'epic');
      });
      content.appendChild(row);
    }
  } else if (shopCat === 'scrolls') {
    const sg = shop.stock.scrolls[shopGrade];
    for (const type of ['weapon', 'armor']) {
      const entry = sg[type];
      const have = state.hero.scrolls[shopGrade]?.[type] || 0;
      const row = document.createElement('div');
      row.className = 'shop-row';
      row.innerHTML = `
        <div class="auction-icon">📜</div>
        <div class="auction-info">
          <div class="auction-name">Свиток заточки: ${type === 'weapon' ? 'Оружие' : 'Броня'}</div>
          <div class="auction-grade" style="color:${gradeColor(shopGrade)}">${gradeName(shopGrade)}</div>
          <div class="auction-stats"><span>У тебя: ${have}</span></div>
        </div>
        <div class="auction-price">${entry.price}💰</div>
        <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
      `;
      row.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        const r = buyScroll(shop, state.hero, state, shopGrade, type);
        if (r.ok) {
          toast(`Куплен свиток: ${gradeName(shopGrade)}`, shopGrade);
          callbacks.onEquipChange && callbacks.onEquipChange();
          renderShop();
          refreshUI();
        } else if (r.reason === 'no_gold') toast('Недостаточно золота', 'epic');
      });
      content.appendChild(row);
    }
  } else if (shopCat === 'potions') {
    const price = shop.stock.potionPrice;
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML = `
      <div class="auction-icon">🧪</div>
      <div class="auction-info">
        <div class="auction-name">Зелье HP</div>
        <div class="auction-grade" style="color:#ef4444">Восстанавливает 150 HP</div>
        <div class="auction-stats"><span>У тебя: ${state.hero.potions.hp}</span></div>
      </div>
      <div class="auction-price">${price}💰</div>
      <button ${state.gold < price ? 'disabled' : ''}>Купить</button>
    `;
    row.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = buyPotion(shop, state.hero, state);
      if (r.ok) {
        toast('Куплено зелье', 'epic');
        callbacks.onEquipChange && callbacks.onEquipChange();
        renderShop();
        refreshUI();
      } else if (r.reason === 'no_gold') toast('Недостаточно золота', 'epic');
    });
    content.appendChild(row);
  } else if (shopCat === 'soulshots') {
    const entry = shop.stock.soulshots[shopGrade];
    const have = state.hero.soulshots[shopGrade] || 0;
    const row = document.createElement('div');
    row.className = 'shop-row';
    row.innerHTML = `
      <div class="auction-icon">⚡</div>
      <div class="auction-info">
        <div class="auction-name">Соски ${gradeName(shopGrade)}</div>
        <div class="auction-grade" style="color:${gradeColor(shopGrade)}">Удваивают урон оружия этого грейда</div>
        <div class="auction-stats"><span>У тебя: ${have}</span><span>+10 шт.</span></div>
      </div>
      <div class="auction-price">${entry.price}💰</div>
      <button ${state.gold < entry.price ? 'disabled' : ''}>Купить</button>
    `;
    row.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = buySoulshot(shop, state.hero, state, shopGrade);
      if (r.ok) {
        toast('Куплено 10 сосок', shopGrade);
        callbacks.onEquipChange && callbacks.onEquipChange();
        renderShop();
        refreshUI();
      } else if (r.reason === 'no_gold') toast('Недостаточно золота', 'epic');
    });
    content.appendChild(row);
  }
}

// ===== АУКЦИОН =====
function renderAuction() {
  if (currentAuctionTab === 'buy') renderAuctionBuy();
  if (currentAuctionTab === 'sell') renderAuctionSell();
  if (currentAuctionTab === 'my') renderAuctionMy();
  const cnt = document.getElementById('my-listings-count');
  if (cnt) cnt.textContent = `(${auction.myListings.length})`;
}

function renderAuctionBuy() {
  const el = document.getElementById('auction-buy');
  el.innerHTML = '';
  if (auction.listings.length === 0) {
    el.innerHTML = '<div class="empty-state">Нет лотов. Заходи позже.</div>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'auction-list';
  for (const l of auction.listings) {
    const item = l.item;
    const row = document.createElement('div');
    row.className = 'auction-row';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="auction-info">
        <div class="auction-name" style="color:${gradeColor(item.grade)}">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</div>
        <div class="auction-grade" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</div>
        <div class="auction-stats">${statsHtml(item)}</div>
        <div class="auction-seller">${l.sellerName}</div>
      </div>
      <div class="auction-price">${l.price} 💰</div>
      <button ${state.gold < l.price ? 'disabled' : ''}>Купить</button>
    `;
    row.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      showItemPopup(item, 'auction');
    });
    row.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      const r = buyListing(auction, l.id, state.hero, state);
      if (r.ok) {
        toast(`Куплено: ${item.name}`, item.grade);
        callbacks.onEquipChange && callbacks.onEquipChange();
        renderAuctionBuy();
        refreshUI();
      } else if (r.reason === 'no_gold') toast('Недостаточно золота', 'epic');
      else toast('Лот не найден', 'epic');
    });
    list.appendChild(row);
  }
  el.appendChild(list);
}

function renderAuctionSell() {
  const el = document.getElementById('auction-sell');
  el.innerHTML = '';
  const backpack = state.hero.backpack;
  if (backpack.length === 0) {
    el.innerHTML = '<div class="empty-state">Рюкзак пуст. Нечего продавать.</div>';
    return;
  }
  for (const item of backpack) {
    const estimate = estimateItemValue(item);
    const row = document.createElement('div');
    row.className = 'sell-item-row';
    row.innerHTML = `
      <div class="auction-icon">${item.icon}</div>
      <div class="sell-info">
        <div class="sell-name" style="color:${gradeColor(item.grade)}">${item.name}${item.enhance > 0 ? ' +' + item.enhance : ''}</div>
        <div class="auction-stats">${statsHtml(item)}</div>
        <div class="sell-prices">Аукцион: ~${estimate}💰 · Боту: ${Math.floor(estimate * 0.5)}💰</div>
      </div>
    `;
    row.addEventListener('click', () => showSellPopup(item));
    el.appendChild(row);
  }
}

function renderAuctionMy() {
  const el = document.getElementById('auction-my');
  el.innerHTML = '';
  if (auction.myListings.length === 0) {
    el.innerHTML = '<div class="empty-state">Ты ничего не выставил.</div>';
    return;
  }
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
  const stats = itemStats(item);
  const statLines = Object.entries(stats).map(([k, v]) => {
    const nm = { hp:'HP', attack:'Атака', defense:'Защита' }[k] || k;
    return `<div class="stat-row"><span class="stat-name">${nm}</span><span class="stat-val">+${v}</span></div>`;
  }).join('');

  body.innerHTML = `
    <div class="item-icon-big">${item.icon}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    <div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
    ${statLines}
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="popup-close" id="pp-auction" style="border-color:#4ade80;color:#4ade80;flex:1">Аукцион: ${estimate}💰</button>
      <button class="popup-close" id="pp-bot" style="border-color:#fbbf24;color:#fbbf24;flex:1">Боту: ${botPrice}💰</button>
    </div>
  `;
  popup.classList.remove('hidden');

  document.getElementById('pp-auction').addEventListener('click', () => {
    const r = listItem(auction, state.hero, item, estimate);
    if (r.ok) {
      toast(`Выставлено: ${estimate}💰`, 'rare');
      hideItemPopup();
      renderAuctionSell();
      refreshUI();
    }
  });
  document.getElementById('pp-bot').addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) {
      state.gold += r.price;
      toast(`Продано боту: ${r.price}💰`, 'rare');
      hideItemPopup();
      renderAuctionSell();
      refreshUI();
      callbacks.onEquipChange && callbacks.onEquipChange();
    }
  });
}

// ===== POPUP =====
export function showItemPopup(item, context) {
  const popup = document.getElementById('item-popup');
  const body = document.getElementById('item-popup-body');
  const stats = itemStats(item);
  const statLines = Object.entries(stats).map(([k, v]) => {
    const nm = { hp:'HP', attack:'Атака', defense:'Защита' }[k] || k;
    return `<div class="stat-row"><span class="stat-name">${nm}</span><span class="stat-val">+${v}</span></div>`;
  }).join('');

  let actionBtns = '';
  if (context === 'backpack') {
    const can = canEquip(state.hero, item);
    const estimate = estimateItemValue(item);
    actionBtns = `
      <button class="popup-close" id="pp-equip" ${can ? '' : 'disabled'}>${can ? 'Надеть' : `Нужен ур. ${GRADES[item.grade].levelReq}`}</button>
      <button class="popup-close" id="pp-sell" style="border-color:#fbbf24;color:#fbbf24">Продать боту (${Math.floor(estimate * 0.5)})</button>
    `;
  } else if (context === 'equip') {
    actionBtns = `<button class="popup-close" id="pp-unequip">Снять</button>`;
  }

  body.innerHTML = `
    <div class="item-icon-big">${item.icon}</div>
    <h3>${item.name} ${item.enhance > 0 ? `+${item.enhance}` : ''}</h3>
    <div class="stat-row"><span class="stat-name">Грейд</span><span class="stat-val" style="color:${gradeColor(item.grade)}">${gradeName(item.grade)}</span></div>
    <div class="stat-row"><span class="stat-name">Слот</span><span class="stat-val">${SLOT_NAMES[item.slot]}</span></div>
    <div class="stat-row"><span class="stat-name">Треб. уровень</span><span class="stat-val">${GRADES[item.grade].levelReq}</span></div>
    ${statLines}
    ${actionBtns}
    <button class="popup-close" id="pp-close" style="border-color:#64748b;color:#64748b">Закрыть</button>
  `;
  popup.classList.remove('hidden');

  document.getElementById('pp-close')?.addEventListener('click', hideItemPopup);
  document.getElementById('pp-equip')?.addEventListener('click', () => {
    const r = equipItem(state.hero, item);
    if (r.ok) { hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); refreshUI(); }
    else toast('Нельзя надеть', 'epic');
  });
  document.getElementById('pp-sell')?.addEventListener('click', () => {
    const r = sellToBot(state.hero, item);
    if (r.ok) {
      state.gold += r.price;
      toast(`Продано: ${r.price}💰`, 'rare');
      hideItemPopup();
      callbacks.onEquipChange && callbacks.onEquipChange();
      if (!document.getElementById('modal-hero').classList.contains('hidden')) renderHero();
      refreshUI();
    }
  });
  document.getElementById('pp-unequip')?.addEventListener('click', () => {
    const r = unequipItem(state.hero, item.slot);
    if (r.ok) { hideItemPopup(); callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); refreshUI(); }
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
  setTimeout(() => el.remove(), 2500);
}

// ===== DRAG & DROP =====
let dragData = null;
let dragGhost = null;

function startDrag(e, item, sourceType) {
  e.preventDefault();
  e.stopPropagation();
  dragData = { item, sourceType };
  dragGhost = document.createElement('div');
  dragGhost.className = 'drag-ghost';
  dragGhost.textContent = item.icon;
  dragGhost.style.left = e.clientX + 'px';
  dragGhost.style.top = e.clientY + 'px';
  document.body.appendChild(dragGhost);
  document.addEventListener('pointermove', onDragMove);
  document.addEventListener('pointerup', onDragEnd);
}

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
    const r = equipItem(state.hero, item);
    if (r.ok) { callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); refreshUI(); }
    else if (r.reason === 'level') toast(`Нужен уровень ${GRADES[item.grade].levelReq}`, 'epic');
  } else if (target.drop === 'backpack' && sourceType === 'equip') {
    const r = unequipItem(state.hero, item.slot);
    if (r.ok) { callbacks.onEquipChange && callbacks.onEquipChange(); renderHero(); refreshUI(); }
  }
}

export function tickUIPanels() {}