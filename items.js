import { GRADES, GRADE_ORDER, GRADE_ITEMS, BASE_STATS, SLOTS, EQUIP_PRICES, SCROLL_PRICES } from './config.js';

let nextItemId = 1;

export function maxGradeForLevel(level) {
  if (level >= 50) return 's';
  if (level >= 35) return 'a';
  if (level >= 20) return 'b';
  if (level >= 10) return 'c';
  if (level >= 5)  return 'd';
  return 'ng';
}

export function rollGrade(heroLevel) {
  const maxIdx = GRADE_ORDER.indexOf(maxGradeForLevel(heroLevel));
  const r = Math.random();
  if (r < 0.5) return GRADE_ORDER[maxIdx];
  if (r < 0.8 && maxIdx >= 1) return GRADE_ORDER[maxIdx - 1];
  if (maxIdx >= 2) return GRADE_ORDER[maxIdx - 2];
  return GRADE_ORDER[0];
}

export function createItem(grade, slot, enhance = 0) {
  const def = GRADE_ITEMS[grade][slot];
  return {
    id: nextItemId++,
    kind: 'equip',
    slot, grade, enhance,
    name: def.name,
    icon: def.icon,
    baseStats: { ...BASE_STATS[slot] },
  };
}

export function generateItem(heroLevel, forceGrade = null, forceSlot = null) {
  const grade = forceGrade || rollGrade(heroLevel);
  const slot = forceSlot || SLOTS[Math.floor(Math.random() * SLOTS.length)];
  return createItem(grade, slot);
}

export function itemPrice(item) {
  return EQUIP_PRICES[item.grade] || 100;
}

export function scrollPrice(grade) {
  return SCROLL_PRICES[grade] || 100;
}

export function itemStats(item) {
  const g = GRADES[item.grade];
  const enhMult = 1 + item.enhance * 0.12;
  const res = {};
  for (const [k, v] of Object.entries(item.baseStats)) {
    res[k] = Math.floor(v * g.mult * enhMult);
  }
  return res;
}

export function estimateItemValue(item) {
  const g = GRADES[item.grade];
  const enhMult = 1 + item.enhance * 0.5;
  return Math.floor(100 * g.mult * enhMult);
}

export function gradeName(grade) { return GRADES[grade].name; }
export function gradeShort(grade) { return GRADES[grade].short; }
export function gradeColor(grade) { return GRADES[grade].color; }
export function gradeLevelReq(grade) { return GRADES[grade].levelReq; }

export function rollDrops(heroLevel) {
  const drops = { items: [], scrolls: [] };
  if (Math.random() < 0.12) drops.items.push(generateItem(heroLevel));
  if (Math.random() < 0.25) {
    const grade = rollGrade(heroLevel);
    const type = Math.random() < 0.3 ? 'weapon' : 'armor';
    drops.scrolls.push({ grade, type });
  }
  return drops;
}