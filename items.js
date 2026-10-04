import { GRADES, GRADE_ORDER, GRADE_ITEMS, BASE_STATS, SLOTS, ENHANCE_STATS, PERCENT_STATS, CHAMPION } from './config.js';

let nextItemId = 1;

export function createItem(grade, slot, weaponType = null) {
  let key = slot;
  if (slot === 'weapon') key = 'weapon_' + (weaponType === 'staff' ? 'mage' : 'archer');
  const def = GRADE_ITEMS[grade][key];
  if (!def) return null;
  return {
    id: nextItemId++,
    kind: 'equip',
    slot, grade, enhance: 0,
    weaponType: slot === 'weapon' ? (weaponType || 'bow') : null,
    name: def.name,
    icon: def.icon,
    baseStats: { ...BASE_STATS[slot] },
  };
}

export function createBlessedScroll() {
  return {
    id: nextItemId++,
    kind: 'blessed',
    name: 'Blessed Scroll',
    icon: '✨',
    slot: 'blessed',
    grade: 'any',
  };
}

export function itemStats(item) {
  const g = GRADES[item.grade] || { mult: 1 };
  const enhanceKeys = ENHANCE_STATS[item.slot] || [];
  const mainKey = enhanceKeys[0];
  const secondKey = enhanceKeys[1];
  const res = {};
  for (const [k, v] of Object.entries(item.baseStats || {})) {
    const isPerc = PERCENT_STATS.includes(k);
    let val = v * g.mult;
    if (k === mainKey) val *= (1 + item.enhance * 0.15);
    else if (k === secondKey) val *= (1 + item.enhance * 0.10);
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
  const g = GRADES[item.grade];
  if (!g) return 100;
  const enhMult = 1 + item.enhance * 0.7;
  return Math.floor(100 * g.mult * enhMult);
}

export function gradeName(g) { return GRADES[g]?.name || '—'; }
export function gradeShort(g) { return GRADES[g]?.short || '?'; }
export function gradeColor(g) { return GRADES[g]?.color || '#94a3b8'; }

export function rollDrops(zoneGrade, isChampion) {
  const drops = { items: [], scrolls: [], blessed: 0 };
  const itemChance = isChampion ? 0.09 : 0.03;
  const scrollChance = isChampion ? 0.24 : 0.08;

  if (Math.random() < itemChance) {
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const weaponType = slot === 'weapon' ? (Math.random() < 0.5 ? 'bow' : 'staff') : null;
    const item = createItem(zoneGrade, slot, weaponType);
    if (item) drops.items.push(item);
  }
  if (Math.random() < scrollChance) {
    const type = Math.random() < 0.3 ? 'weapon' : 'armor';
    drops.scrolls.push({ grade: zoneGrade, type });
  }
  if (isChampion && Math.random() < CHAMPION.blessedDropChance) {
    drops.blessed = 1;
  }
  return drops;
}