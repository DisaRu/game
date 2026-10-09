// wiki.js — Справочник по игре
// Показывает: локации, мобов и предметы (кто что дропает)

import { CITIES, CITY_ORDER } from './cities.js';
import { MOBS, GRADES } from './config.js';
import { ITEM_REGISTRY } from './loot.js';

// ============================================================
// ИНДЕКСЫ (строятся один раз при первом открытии)
// ============================================================

let _index = null;

function buildIndex() {
  if (_index) return _index;

  // mobId → [{ city, zone, lair }]
  const mobZones = {};

  // itemId → [{ mobId, chance, min, max, champion }]
  const itemSources = {};

  // Собираем локации
  for (const cityId of CITY_ORDER) {
    const city = CITIES[cityId];
    if (!city) continue;
    for (const zone of city.zones) {
      const lairs = zone.lairs || zone.spawn?.lairs || [];
      for (const lair of lairs) {
        const mobIds = lair.mobs || [];
        for (const mobId of mobIds) {
          if (!mobZones[mobId]) mobZones[mobId] = [];
          // Не дублируем один и тот же лайр
          const exists = mobZones[mobId].some(x => x.lair.id === lair.id && x.zone.id === zone.id);
          if (!exists) {
            mobZones[mobId].push({ city, zone, lair });
          }
        }
      }
    }
  }

  // Собираем дропы мобов
  for (const mobId in MOBS) {
    const mob = MOBS[mobId];
    if (mob.drops) {
      for (const d of mob.drops) {
        if (!itemSources[d.id]) itemSources[d.id] = [];
        itemSources[d.id].push({
          mobId, champion: false,
          chance: d.chance, min: d.min || 1, max: d.max || 1,
        });
      }
    }
    if (mob.championDrops) {
      for (const d of mob.championDrops) {
        if (!itemSources[d.id]) itemSources[d.id] = [];
        itemSources[d.id].push({
          mobId, champion: true,
          chance: d.chance, min: d.min || 1, max: d.max || 1,
        });
      }
    }
  }

  _index = { mobZones, itemSources };
  return _index;
}

// ============================================================
// НАЗВАНИЯ ПРЕДМЕТОВ (по id из loot.js)
// ============================================================

function itemDisplayName(itemId) {
  if (!itemId) return '???';

  // Особые
  if (itemId === 'gold') return '💰 Золото';
  if (itemId === 'blessed_scroll') return '✨ Blessed Scroll';
  if (itemId === 'arena_pass') return '🎫 Пропуск на арену';

  // Зелья
  const potions = {
    potion_small: '🧪 Малое зелье HP',
    potion_medium: '⚗️ Зелье HP',
    potion_large: '🍷 Сильное зелье HP',
    potion_epic: '🏺 Эпическое зелье HP',
  };
  if (potions[itemId]) return potions[itemId];

  // Соски
  let m = itemId.match(/^soulshot_(\w+)$/);
  if (m) return `⚡ Соски ${gradeShort(m[1])}`;

  // Свитки заточки
  m = itemId.match(/^scroll_weapon_(\w+)$/);
  if (m) return `📜 Свиток (оружие ${gradeShort(m[1])})`;
  m = itemId.match(/^scroll_armor_(\w+)$/);
  if (m) return `📜 Свиток (броня ${gradeShort(m[1])})`;

  // Книжки скиллов
  m = itemId.match(/^book_(.+)$/);
  if (m) return `📖 Книга: ${m[1].replace(/_/g,' ')}`;

  // Экипировка
  if (itemId === 'equip_random') return '🎁 Случайный экип';
  m = itemId.match(/^equip_(\w+)$/);
  if (m) return `🎁 Экип ${gradeShort(m[1])} (случайный)`;
  m = itemId.match(/^equip_(\w+)_(\w+)$/);
  if (m) return `🎁 Экип ${gradeShort(m[1])} (${m[2]})`;

  // Фоллбэк
  return itemId;
}

function gradeShort(g) {
  if (!g) return '?';
  const def = GRADES?.[g];
  return def?.short || g.toUpperCase();
}

function gradeColor(g) {
  if (!g) return '#94a3b8';
  const def = GRADES?.[g];
  return def?.color || '#94a3b8';
}

function formatChance(c) {
  if (c >= 1) return '100%';
  const pct = c * 100;
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${pct.toFixed(1)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(3)}%`;
}

function mobLevel(mobId) {
  return MOBS[mobId]?.level || '?';
}

function mobEmoji(mobId) {
  return MOBS[mobId]?.emoji || '?';
}

function mobName(mobId) {
  return MOBS[mobId]?.name || mobId;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[ch]));
}

// ============================================================
// РЕНДЕР: вкладка "ЛОКАЦИИ"
// ============================================================

function renderWikiLocations(container, search) {
  const { mobZones } = buildIndex();
  const filter = search.trim().toLowerCase();

  let html = '';
  for (const cityId of CITY_ORDER) {
    const city = CITIES[cityId];
    if (!city) continue;

    let cityHtml = '';
    for (const zone of city.zones) {
      const lairs = zone.lairs || [];

      // Фильтр по названию зоны
      const zoneText = `${city.name} ${zone.name}`.toLowerCase();
      if (filter && !zoneText.includes(filter)) {
        // Проверим есть ли совпадение внутри мобов
        const hasMobMatch = lairs.some(l =>
          (l.mobs || []).some(m => mobName(m).toLowerCase().includes(filter))
        );
        if (!hasMobMatch) continue;
      }

      // Собираем уникальных мобов
      const mobSet = new Set();
      for (const lair of lairs) for (const m of (lair.mobs || [])) mobSet.add(m);
      const mobIds = [...mobSet];

      if (mobIds.length === 0) continue;

      const diffIcon = zone.diff === 'easy' ? '🟢' : zone.diff === 'medium' ? '🟡' : '🔴';
      const diffColor = zone.diff === 'easy' ? '#4ade80' : zone.diff === 'medium' ? '#fbbf24' : '#ef4444';

      let mobsHtml = '';
      for (const mobId of mobIds) {
        const lvl = mobLevel(mobId);
        const name = mobName(mobId);
        const emoji = mobEmoji(mobId);
        // Ищем лайры где спавнится этот моб
        const spawns = lairs.filter(l => (l.mobs||[]).includes(mobId));
        const spawnNames = spawns.map(l => l.name).join(', ');

        mobsHtml += `
          <div class="wiki-mob-line">
            <span class="wiki-mob-icon">${/\./.test(emoji) ? '👹' : emoji}</span>
            <span class="wiki-mob-name">${escapeHtml(name)}</span>
            <span class="wiki-mob-lvl">Lv.${lvl}</span>
            <span class="wiki-mob-spots">${escapeHtml(spawnNames)}</span>
          </div>
        `;
      }

      cityHtml += `
        <div class="wiki-zone">
          <div class="wiki-zone-header">
            <span class="wiki-zone-diff" style="color:${diffColor}">${diffIcon}</span>
            <span class="wiki-zone-name">${escapeHtml(zone.name)}</span>
            <span class="wiki-zone-cost">ТП: ${zone.teleportCost}💰</span>
          </div>
          <div class="wiki-zone-mobs">${mobsHtml}</div>
        </div>
      `;
    }

    if (!cityHtml) continue;

    const gradeCol = gradeColor(city.grade);
    html += `
      <div class="wiki-city">
        <div class="wiki-city-header" style="border-color:${gradeCol}">
          <span class="wiki-city-name">${escapeHtml(city.name)}</span>
          <span class="wiki-city-grade" style="color:${gradeCol}">${city.grade.toUpperCase()}</span>
        </div>
        ${cityHtml}
      </div>
    `;
  }

  container.innerHTML = html || '<div class="wiki-empty">Ничего не найдено</div>';
}

// ============================================================
// РЕНДЕР: вкладка "МОБЫ"
// ============================================================

function renderWikiMobs(container, search) {
  const { mobZones } = buildIndex();
  const filter = search.trim().toLowerCase();

  const mobIds = Object.keys(MOBS)
    .filter(id => !filter || mobName(id).toLowerCase().includes(filter))
    .sort((a, b) => (MOBS[a].level || 0) - (MOBS[b].level || 0));

  if (mobIds.length === 0) {
    container.innerHTML = '<div class="wiki-empty">Ничего не найдено</div>';
    return;
  }

  let html = '';
  for (const mobId of mobIds) {
    const mob = MOBS[mobId];
    const emoji = /\./.test(mob.emoji || '') ? '👹' : (mob.emoji || '?');
    const zones = mobZones[mobId] || [];

    const zoneText = zones.length
      ? zones.map(z => `${z.city.name} → ${z.zone.name}`).join(' · ')
      : '<span style="color:#7a2a2a">не спавнится</span>';

    // Дроп
    let dropsHtml = '';
    const allDrops = [
      ...(mob.drops || []).map(d => ({ ...d, champion: false })),
      ...(mob.championDrops || []).map(d => ({ ...d, champion: true })),
    ];
    // Уникальные id — берём макс. шанс
    const dropMap = {};
    for (const d of allDrops) {
      if (!dropMap[d.id]) dropMap[d.id] = d;
      else if (d.chance > dropMap[d.id].chance) dropMap[d.id] = d;
    }
    const drops = Object.values(dropMap).sort((a,b) => b.chance - a.chance);

    if (drops.length === 0) {
      dropsHtml = '<div class="wiki-empty-drops">Не дропает ничего</div>';
    } else {
      dropsHtml = drops.map(d => {
        const champ = d.champion ? ' <span class="wiki-champ" title="с чемпиона">⭐</span>' : '';
        const qty = (d.min && d.max && d.min !== d.max) ? ` ×${d.min}–${d.max}`
                  : (d.min && d.min > 1) ? ` ×${d.min}` : '';
        return `
          <div class="wiki-drop">
            <span class="wiki-drop-name">${itemDisplayName(d.id)}${champ}</span>
            <span class="wiki-drop-qty">${qty}</span>
            <span class="wiki-drop-chance">${formatChance(d.chance)}</span>
          </div>
        `;
      }).join('');
    }

    html += `
      <details class="wiki-mob-card">
        <summary>
          <span class="wiki-mob-icon">${emoji}</span>
          <span class="wiki-mob-name">${escapeHtml(mob.name || mobId)}</span>
          <span class="wiki-mob-lvl">Lv.${mob.level || '?'}</span>
          <span class="wiki-mob-hp">❤ ${mob.hp || '?'}</span>
          <span class="wiki-mob-xp">⭐ ${mob.xp || '?'}</span>
          <span class="wiki-mob-expand">▼</span>
        </summary>
        <div class="wiki-mob-body">
          <div class="wiki-mob-spawn"><b>Спавн:</b> ${zoneText}</div>
          <div class="wiki-mob-drops-title">Дроп</div>
          <div class="wiki-mob-drops">${dropsHtml}</div>
        </div>
      </details>
    `;
  }

  container.innerHTML = html;
}

// ============================================================
// РЕНДЕР: вкладка "ПРЕДМЕТЫ"
// ============================================================

function renderWikiItems(container, search) {
  const { itemSources } = buildIndex();
  const filter = search.trim().toLowerCase();

  // Собираем все id
  const itemIds = Object.keys(itemSources).sort((a, b) => {
    const na = itemDisplayName(a).toLowerCase();
    const nb = itemDisplayName(b).toLowerCase();
    return na.localeCompare(nb);
  });

  const filtered = itemIds.filter(id => !filter || itemDisplayName(id).toLowerCase().includes(filter));

  if (filtered.length === 0) {
    container.innerHTML = '<div class="wiki-empty">Ничего не найдено</div>';
    return;
  }

  let html = '';
  for (const itemId of filtered) {
    const sources = itemSources[itemId];
    const name = itemDisplayName(itemId);

    // Сортируем по шансу (лучшие сверху)
    const sorted = [...sources].sort((a, b) => b.chance - a.chance);

    const rows = sorted.map(s => {
      const champ = s.champion ? ' <span class="wiki-champ">⭐</span>' : '';
      const qty = (s.min && s.max && s.min !== s.max) ? ` ×${s.min}–${s.max}`
                : (s.min && s.min > 1) ? ` ×${s.min}` : '';
      return `
        <div class="wiki-source">
          <span class="wiki-source-mob">${mobEmoji(s.mobId)} ${escapeHtml(mobName(s.mobId))}${champ}</span>
          <span class="wiki-source-lvl">Lv.${mobLevel(s.mobId)}</span>
          <span class="wiki-source-qty">${qty}</span>
          <span class="wiki-source-chance">${formatChance(s.chance)}</span>
        </div>
      `;
    }).join('');

    html += `
      <details class="wiki-item-card">
        <summary>
          <span class="wiki-item-name">${name}</span>
          <span class="wiki-item-count">${sources.length} источников</span>
          <span class="wiki-mob-expand">▼</span>
        </summary>
        <div class="wiki-item-body">
          <div class="wiki-source-list">${rows}</div>
        </div>
      </details>
    `;
  }

  container.innerHTML = html;
}

// ============================================================
// ОСНОВНАЯ МОДАЛКА
// ============================================================

let _wikiState = {
  tab: 'locations',
  search: '',
};

export function openWiki() {
  let modal = document.getElementById('modal-wiki');
  if (!modal) {
    modal = _createWikiModal();
    document.body.appendChild(modal);
  }
  modal.classList.remove('hidden');
  _renderWikiContent();
}

export function closeWiki() {
  const modal = document.getElementById('modal-wiki');
  if (modal) modal.classList.add('hidden');
}
window.__openWiki = openWiki;
window.__closeWiki = closeWiki;
function _createWikiModal() {
  const modal = document.createElement('div');
  modal.id = 'modal-wiki';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-window wiki-window">
      <div class="modal-header">
        <h2>📖 Справочник</h2>
        <button class="modal-close" id="wiki-close">✕</button>
      </div>
      <div class="wiki-body">
        <div class="wiki-tabs">
          <button class="wiki-tab active" data-wiki-tab="locations">📍 Локации</button>
          <button class="wiki-tab" data-wiki-tab="mobs">👹 Мобы</button>
          <button class="wiki-tab" data-wiki-tab="items">⚔ Предметы</button>
        </div>
        <div class="wiki-search-wrap">
          <input type="text" id="wiki-search" class="wiki-search" placeholder="Поиск..." autocomplete="off">
        </div>
        <div class="wiki-content" id="wiki-content"></div>
      </div>
    </div>
  `;

  // Обработчики
  modal.querySelector('#wiki-close').addEventListener('click', closeWiki);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeWiki();
  });
  modal.querySelectorAll('.wiki-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _wikiState.tab = btn.dataset.wikiTab;
      modal.querySelectorAll('.wiki-tab').forEach(b => b.classList.toggle('active', b === btn));
      _renderWikiContent();
    });
  });
  const searchEl = modal.querySelector('#wiki-search');
  searchEl.addEventListener('input', () => {
    _wikiState.search = searchEl.value;
    _renderWikiContent();
  });

  return modal;
}

function _renderWikiContent() {
  const content = document.getElementById('wiki-content');
  if (!content) return;
  const { tab, search } = _wikiState;

  if (tab === 'locations') renderWikiLocations(content, search);
  else if (tab === 'mobs') renderWikiMobs(content, search);
  else if (tab === 'items') renderWikiItems(content, search);

  content.scrollTop = 0;
}