import { GRADE_ORDER, GRADE_ITEMS, SLOTS, EQUIP_PRICES, SCROLL_PRICES, POTIONS, SOULSHOT_PRICES } from './config.js';
import { createItem } from './items.js';

export function createShop() { return { stock: null }; }

export function buildStock() {
  const equipment = {};
  for (const grade of GRADE_ORDER) {
    equipment[grade] = SLOTS.map(slot => ({
      grade, slot,
      name: GRADE_ITEMS[grade][slot].name,
      icon: GRADE_ITEMS[grade][slot].icon,
      price: Math.floor(EQUIP_PRICES[grade] * (slot === 'weapon' ? 1.5 : 1)),
    }));
  }
  const scrolls = {};
  for (const grade of GRADE_ORDER) {
    scrolls[grade] = {
      weapon: { grade, type: 'weapon', price: Math.floor(SCROLL_PRICES[grade] * 1.3) },
      armor:  { grade, type: 'armor',  price: SCROLL_PRICES[grade] },
    };
  }
  const soulshots = {};
  for (const grade of GRADE_ORDER) {
    soulshots[grade] = { grade, price: SOULSHOT_PRICES[grade] };
  }
  return { equipment, scrolls, soulshots, potions: { ...POTIONS } };
}

export function buyEquipment(shop, hero, state, grade, slot) {
  const price = Math.floor(EQUIP_PRICES[grade] * (slot === 'weapon' ? 1.5 : 1));
  if (state.gold < price) return { ok: false, reason: 'no_gold' };
  state.gold -= price;
  hero.backpack.push(createItem(grade, slot));
  return { ok: true, price };
}

export function buyScroll(shop, hero, state, grade, type) {
  const price = type === 'weapon' ? Math.floor(SCROLL_PRICES[grade] * 1.3) : SCROLL_PRICES[grade];
  if (state.gold < price) return { ok: false, reason: 'no_gold' };
  state.gold -= price;
  hero.scrolls[grade][type] = (hero.scrolls[grade][type] || 0) + 1;
  return { ok: true, price };
}

export function buyPotion(shop, hero, state, type) {
  const p = POTIONS[type];
  if (!p) return { ok: false };
  if (state.gold < p.price) return { ok: false, reason: 'no_gold' };
  state.gold -= p.price;
  hero.potions[type] = (hero.potions[type] || 0) + 1;
  return { ok: true, price: p.price, type };
}

export function buySoulshot(shop, hero, state, grade) {
  const price = SOULSHOT_PRICES[grade];
  if (state.gold < price) return { ok: false, reason: 'no_gold' };
  state.gold -= price;
  hero.soulshots[grade] = (hero.soulshots[grade] || 0) + 10;
  return { ok: true, price };
}