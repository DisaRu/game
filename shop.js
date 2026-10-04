import { GRADE_ITEMS, SLOTS, EQUIP_PRICES, SCROLL_PRICES, SOULSHOT_PRICES, POTIONS } from './config.js';
import { createItem } from './items.js';

export function createShop() { return { stock: null }; }

export function buildStock(cityGrade, heroWeaponType) {
  const equipment = [];
  for (const slot of SLOTS) {
    let key = slot;
    if (slot === 'weapon') key = 'weapon_' + (heroWeaponType === 'staff' ? 'mage' : 'archer');
    const def = GRADE_ITEMS[cityGrade][key];
    if (!def) continue;
    equipment.push({
      slot,
      weaponType: slot === 'weapon' ? heroWeaponType : null,
      name: def.name,
      icon: def.icon,
      price: Math.floor(EQUIP_PRICES[cityGrade] * (slot === 'weapon' ? 1.5 : 1)),
    });
  }
  const scrolls = {
    weapon: { grade: cityGrade, type:'weapon', price: Math.floor(SCROLL_PRICES[cityGrade] * 1.3) },
    armor:  { grade: cityGrade, type:'armor',  price: SCROLL_PRICES[cityGrade] },
  };
  const soulshots = { grade: cityGrade, price: SOULSHOT_PRICES[cityGrade] };
  return { equipment, scrolls, soulshots, potions: { ...POTIONS }, grade: cityGrade };
}

export function buyEquipment(shop, hero, state, slot, weaponType) {
  const entry = shop.stock.equipment.find(e => e.slot === slot);
  if (!entry) return { ok:false };
  if (state.gold < entry.price) return { ok:false, reason:'no_gold' };
  state.gold -= entry.price;
  const item = createItem(shop.stock.grade, slot, weaponType);
  hero.backpack.push(item);
  return { ok:true, item };
}

export function buyScroll(shop, hero, state, type) {
  const s = shop.stock.scrolls[type];
  if (state.gold < s.price) return { ok:false, reason:'no_gold' };
  state.gold -= s.price;
  hero.scrolls[shop.stock.grade][type]++;
  return { ok:true };
}

export function buyPotion(shop, hero, state, type) {
  const p = POTIONS[type];
  if (state.gold < p.price) return { ok:false, reason:'no_gold' };
  state.gold -= p.price;
  hero.potions[type] = (hero.potions[type]||0) + 1;
  return { ok:true };
}

export function buySoulshot(shop, hero, state) {
  const s = shop.stock.soulshots;
  if (state.gold < s.price) return { ok:false, reason:'no_gold' };
  state.gold -= s.price;
  hero.soulshots[shop.stock.grade] = (hero.soulshots[shop.stock.grade]||0) + 10;
  return { ok:true };
}