import { GRADE_ITEMS, SLOTS, EQUIP_PRICES, SCROLL_PRICES, SOULSHOT_PRICES, POTIONS, ENHANCE_STATS } from './config.js';
import { createItem, getVariantsForSlot } from './items.js';

export function createShop() { return { stock: null }; }

export function buildStock(cityGrade, heroWeaponType) {
  const equipment = [];

  // Оружие — 3 варианта под класс героя
  const wt = heroWeaponType === 'staff' ? 'mage' : 'archer';
  const weaponPrefix = `weapon_${wt}`;
  const weaponVariants = getVariantsForSlot('weapon', heroWeaponType);
  for (const variant of weaponVariants) {
    const key = `${weaponPrefix}_${variant}`;
    const def = GRADE_ITEMS[cityGrade]?.[key];
    if (!def) continue;
    equipment.push({
      slot: 'weapon',
      weaponType: heroWeaponType,
      variant,
      name: def.name,
      icon: def.icon,
      price: Math.floor(EQUIP_PRICES[cityGrade] * 1.5),
    });
  }

  // Остальные 7 слотов — по 3 варианта
  const armorSlots = ['helmet','armor','gloves','boots','cloak','ring','amulet'];
  for (const slot of armorSlots) {
    const variants = getVariantsForSlot(slot);
    for (const variant of variants) {
      const key = `${slot}_${variant}`;
      const def = GRADE_ITEMS[cityGrade]?.[key];
      if (!def) continue;
      equipment.push({
        slot,
        weaponType: null,
        variant,
        name: def.name,
        icon: def.icon,
        price: EQUIP_PRICES[cityGrade],
      });
    }
  }

  const scrolls = {
    weapon: { grade: cityGrade, type:'weapon', price: Math.floor(SCROLL_PRICES[cityGrade] * 1.3) },
    armor:  { grade: cityGrade, type:'armor',  price: SCROLL_PRICES[cityGrade] },
  };
  const soulshots = { grade: cityGrade, price: SOULSHOT_PRICES[cityGrade] };
  return { equipment, scrolls, soulshots, potions: { ...POTIONS }, grade: cityGrade };
}

export function buyEquipment(shop, hero, state, slot, weaponType, variant) {
  const entry = shop.stock.equipment.find(e =>
    e.slot === slot &&
    e.weaponType === weaponType &&
    e.variant === variant
  );
  if (!entry) return { ok:false, reason:'not_found' };
  if (state.gold < entry.price) return { ok:false, reason:'no_gold' };
  state.gold -= entry.price;
  const item = createItem(shop.stock.grade, slot, weaponType, variant);
  if (!item) return { ok:false, reason:'create_failed' };
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