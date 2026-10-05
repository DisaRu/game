import { GRADES, GRADE_ORDER, GRADE_ITEMS, BASE_STATS, SLOTS, ENHANCE_STATS, PERCENT_STATS, CHAMPION, BUFF_SCROLLS, getEnhanceBonus, ARENA_PASS } from './config.js';

let nextItemId = 1;

// ===== СОЗДАНИЕ ПРЕДМЕТОВ =====

export function createItem(grade, slot, weaponType = null, variant = null) {
  let key;
  if (slot === 'weapon') {
    const wt = weaponType === 'staff' ? 'mage' : 'archer';
    key = `weapon_${wt}`;
    if (variant) key += `_${variant}`;
  } else {
    key = slot;
    if (variant) key += `_${variant}`;
  }

  let def = GRADE_ITEMS[grade]?.[key];
  let baseStats = BASE_STATS[key];

  if (!def || !baseStats) {
    const prefix = slot === 'weapon'
      ? `weapon_${weaponType === 'staff' ? 'mage' : 'archer'}`
      : slot;
    const found = Object.keys(GRADE_ITEMS[grade] || {}).find(k => k.startsWith(prefix));
    if (found) {
      def = GRADE_ITEMS[grade][found];
      baseStats = BASE_STATS[found];
      variant = found.replace(prefix + '_', '');
    }
  }

  if (!def || !baseStats) return null;

  return {
    id: nextItemId++,
    kind: 'equip',
    slot, grade, enhance: 0,
    variant: variant || 'default',
    weaponType: slot === 'weapon' ? (weaponType || 'bow') : null,
    name: def.name,
    icon: def.icon,
    baseStats: { ...baseStats },
    durability: 100,
  };
}

export function createBlessedScroll(count = 1) {
  return {
    id: nextItemId++,
    kind: 'blessed',
    name: 'Blessed Scroll',
    icon: '✨',
    slot: 'blessed',
    grade: 'any',
    count: count,
  };
}

export function createBuffScroll(type, count = 1) {
  const def = BUFF_SCROLLS[type];
  if (!def) return null;
  return {
    id: nextItemId++,
    kind: 'buff',
    buffType: type,
    name: def.name,
    icon: def.icon,
    slot: 'buff',
    grade: 'buff',
    count: count,
  };
}

// НОВОЕ: Пропуск на арену
export function createArenaPass(count = 1) {
  return {
    id: nextItemId++,
    kind: 'pass',
    name: ARENA_PASS.name,
    icon: ARENA_PASS.icon,
    slot: 'pass',
    grade: 'any',
    count: count,
  };
}

// ===== СТАТЫ =====

function getEnhanceKeys(item) {
  const slotMap = ENHANCE_STATS[item.slot];
  if (!slotMap) return [];
  if (item.variant && slotMap[item.variant]) return slotMap[item.variant];
  const firstKey = Object.keys(slotMap)[0];
  return slotMap[firstKey] || [];
}

export function itemStats(item) {
  if (!item || !item.baseStats) return {};
  const g = GRADES[item.grade] || { mult: 1 };
  const enhanceKeys = getEnhanceKeys(item);
  const mainKey = enhanceKeys[0];
  const secondKey = enhanceKeys[1];
  const res = {};

  for (const [k, v] of Object.entries(item.baseStats)) {
    const noGradeMult = ['attackSpeed','lifesteal','moveSpeed','thorns','berserk','critResist','armorPen','antiHeal','accuracy'];
    if (noGradeMult.includes(k)) {
      let val = v;
      if (k === mainKey) val *= (1 + item.enhance * 0.15);
      else if (k === secondKey) val *= (1 + item.enhance * 0.10);
      res[k] = Math.round(val * 10) / 10;
      continue;
    }

    const isPerc = PERCENT_STATS.includes(k);
    let val = v * g.mult;
    if (k === mainKey) val *= (1 + item.enhance * 0.45);
    else if (k === secondKey) val *= (1 + item.enhance * 0.30);

    if (k === 'range') {
      res[k] = Math.round(val * 100) / 100;
    } else if (isPerc) {
      res[k] = Math.round(val * 10) / 10;
    } else {
      res[k] = Math.floor(val);
    }
  }
  return res;
}

export function estimateItemValue(item) {
  if (!item) return 0;
  if (item.kind === 'blessed') return 5000;
  if (item.kind === 'buff') return 3000;
  if (item.kind === 'pass') return 50000;

  const g = GRADES[item.grade];
  if (!g) return 100;
  const enhMult = 1 + item.enhance * 0.7;
  return Math.floor(100 * g.mult * enhMult);
}

export function gradeName(g) { return GRADES[g]?.name || '—'; }
export function gradeShort(g) { return GRADES[g]?.short || '?'; }
export function gradeColor(g) { return GRADES[g]?.color || '#94a3b8'; }

export function getVariantsForSlot(slot, weaponType = null) {
  if (slot === 'weapon') {
    const wt = weaponType === 'staff' ? 'mage' : 'archer';
    return Object.keys(ENHANCE_STATS.weapon).filter(v => {
      if (wt === 'archer' && v === 'aoe') return false;
      if (wt === 'mage' && v === 'range') return false;
      return true;
    });
  }
  return Object.keys(ENHANCE_STATS[slot] || {});
}

// ===== ДРОП =====

export function rollDrops(zoneGrade, isChampion) {
  const drops = { items: [], scrolls: [], blessed: 0, passes: 0 };
  const itemChance = isChampion ? 0.09 : 0.03;
  const scrollChance = isChampion ? 0.24 : 0.08;

  if (Math.random() < itemChance) {
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const weaponType = slot === 'weapon' ? (Math.random() < 0.5 ? 'bow' : 'staff') : null;
    const variants = getVariantsForSlot(slot, weaponType);
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const item = createItem(zoneGrade, slot, weaponType, variant);
    if (item) drops.items.push(item);
  }
  if (Math.random() < scrollChance) {
    const type = Math.random() < 0.3 ? 'weapon' : 'armor';
    drops.scrolls.push({ grade: zoneGrade, type });
  }
  if (isChampion && Math.random() < CHAMPION.blessedDropChance) {
    drops.blessed = 1;
  }
  // Пропуск с чемпионов — 2%
  if (isChampion && Math.random() < 0.02) {
    drops.passes = 1;
  }
  return drops;
}

// ===== ПРОЧНОСТЬ =====

// Износ при атаке: победа -5%, поражение -15%
export function applyDurabilityLoss(item, percent) {
  if (!item || item.durability === undefined) return;
  item.durability = Math.max(0, item.durability - percent);
}

// Эффективный множитель статов от прочности
export function durabilityMultiplier(item) {
  if (!item || item.durability === undefined) return 1;
  return item.durability / 100;
}