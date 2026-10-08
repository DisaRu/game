// loot.js
// Единая система дропа. Одна таблица записей формата:
//   { id:'<name>', chance:0.05, min:1, max:1 }
//
// Вызывается из main.js после смерти моба/босса:
//   const drops = rollDrops(mob.drops, ctx);
//   applyDrops(drops, hero, state, cityGrade);
//
// ctx = { cityGrade, heroWeaponType, heroWeaponGrade }

import { GRADE_ORDER, SLOTS, ENHANCE_STATS, POTIONS, POTION_ORDER, BUFF_SCROLLS } from './config.js';
import {
  createItem, createBlessedScroll, createBuffScroll,
  createArenaPass, createSkillBook,
} from './items.js';

// ============================================================
// РЕЕСТР ИМЁННЫХ ПРЕДМЕТОВ
// ============================================================
// Каждая запись:
//   { kind:'gold' }                                       — золото
//   { kind:'backpack', make:() => item }                  — предмет в рюкзак
//   { kind:'counter', counter:'scroll',  grade, type }    — счётчик свитков
//   { kind:'counter', counter:'potion',  potionType }     — счётчик зелий
//   { kind:'counter', counter:'soulshot', grade }         — счётчик сосок
//   { kind:'equip',  grade, slot, variant, weaponType }   — экипировка

export const ITEM_REGISTRY = {
  // ----- Золото -----
  gold: { kind: 'gold' },

  // ----- Уникальные -----
  blessed_scroll: { kind: 'backpack', make: () => createBlessedScroll(1) },
  arena_pass:     { kind: 'backpack', make: () => createArenaPass(1) },

  // ----- Бафф-свитки -----
  buff_attack: { kind: 'backpack', make: () => createBuffScroll('attack') },
  buff_crit:   { kind: 'backpack', make: () => createBuffScroll('crit') },
  buff_speed:  { kind: 'backpack', make: () => createBuffScroll('speed') },
  buff_range:  { kind: 'backpack', make: () => createBuffScroll('range') },

  // ----- Книжки скиллов (31 шт) -----
  // Общие
  book_heal:        { kind: 'backpack', make: () => createSkillBook('heal') },
  book_cleanse:     { kind: 'backpack', make: () => createSkillBook('cleanse') },
  book_dodge:       { kind: 'backpack', make: () => createSkillBook('dodge') },
  book_haste:       { kind: 'backpack', make: () => createSkillBook('haste') },
  book_iron_skin:   { kind: 'backpack', make: () => createSkillBook('iron_skin') },
  book_reflect:     { kind: 'backpack', make: () => createSkillBook('reflect') },
  book_vampiric:    { kind: 'backpack', make: () => createSkillBook('vampiric') },
  book_berserk:     { kind: 'backpack', make: () => createSkillBook('berserk') },
  book_focus:       { kind: 'backpack', make: () => createSkillBook('focus') },
  book_last_stand:  { kind: 'backpack', make: () => createSkillBook('last_stand') },

  // Лучник
  book_multishot:    { kind: 'backpack', make: () => createSkillBook('multishot') },
  book_power_shot:   { kind: 'backpack', make: () => createSkillBook('power_shot') },
  book_double_shot:  { kind: 'backpack', make: () => createSkillBook('double_shot') },
  book_precise_shot: { kind: 'backpack', make: () => createSkillBook('precise_shot') },
  book_lethal_shot:  { kind: 'backpack', make: () => createSkillBook('lethal_shot') },
  book_stun_shot:    { kind: 'backpack', make: () => createSkillBook('stun_shot') },
  book_slow_arrow:   { kind: 'backpack', make: () => createSkillBook('slow_arrow') },
  book_poison_arrow: { kind: 'backpack', make: () => createSkillBook('poison_arrow') },
  book_arrow_rain:   { kind: 'backpack', make: () => createSkillBook('arrow_rain') },
  book_hawk_eye:     { kind: 'backpack', make: () => createSkillBook('hawk_eye') },
  book_panther:      { kind: 'backpack', make: () => createSkillBook('panther') },

  // Маг
  book_fireball:        { kind: 'backpack', make: () => createSkillBook('fireball') },
  book_ice_bolt:        { kind: 'backpack', make: () => createSkillBook('ice_bolt') },
  book_lightning:       { kind: 'backpack', make: () => createSkillBook('lightning') },
  book_chain_lightning: { kind: 'backpack', make: () => createSkillBook('chain_lightning') },
  book_meteor:          { kind: 'backpack', make: () => createSkillBook('meteor') },
  book_frost_nova:      { kind: 'backpack', make: () => createSkillBook('frost_nova') },
  book_silence:         { kind: 'backpack', make: () => createSkillBook('silence') },
  book_sleep:           { kind: 'backpack', make: () => createSkillBook('sleep') },
  book_arcane_shield:   { kind: 'backpack', make: () => createSkillBook('arcane_shield') },
  book_shadow:          { kind: 'backpack', make: () => createSkillBook('shadow') },

  // ----- Зелья (счётчик) -----
  potion_small:  { kind: 'counter', counter: 'potion', potionType: 'small' },
  potion_medium: { kind: 'counter', counter: 'potion', potionType: 'medium' },
  potion_large:  { kind: 'counter', counter: 'potion', potionType: 'large' },
  potion_epic:   { kind: 'counter', counter: 'potion', potionType: 'epic' },

  // ----- Свитки заточки / соски — без грейда (грейд от контекста) -----
  scroll_weapon: { kind: 'counter', counter: 'scroll', type: 'weapon' }, // грейд = cityGrade
  scroll_armor:  { kind: 'counter', counter: 'scroll', type: 'armor'  }, // грейд = cityGrade
  soulshot:      { kind: 'counter', counter: 'soulshot' },              // грейд = heroWeaponGrade
};

// ----- Свитки заточки / соски с жёстким грейдом -----
for (const g of GRADE_ORDER) {
  ITEM_REGISTRY['scroll_weapon_' + g] = { kind: 'counter', counter: 'scroll', grade: g, type: 'weapon' };
  ITEM_REGISTRY['scroll_armor_'  + g] = { kind: 'counter', counter: 'scroll', grade: g, type: 'armor'  };
  ITEM_REGISTRY['soulshot_'      + g] = { kind: 'counter', counter: 'soulshot', grade: g };
}

// ----- Конкретная экипировка -----
// <slot>_<variant>_<grade>  для не-оружия: gloves_speed_ng, helmet_hp_d
// weapon_<bow|staff>_<variant>_<grade>: weapon_bow_speed_d
// weapon_<bow|staff>_<grade>: weapon_bow_d (вариант random)
// weapon_<grade>: weapon_d (тип random, вариант random)
// equip_<grade>_<slot>: equip_d_gloves (вариант random)
// equip_<grade>: equip_d (слот + вариант random)
// equip_random: полностью случайный, грейд от города

function _regEquip(slot, variant, grade, weaponType = null) {
  const key = slot === 'weapon'
    ? `weapon_${weaponType}_${variant}_${grade}`
    : `${slot}_${variant}_${grade}`;
  ITEM_REGISTRY[key] = { kind: 'equip', grade, slot, variant, weaponType };
}

for (const g of GRADE_ORDER) {
  for (const slot of SLOTS) {
    if (slot === 'weapon') {
      for (const wt of ['bow', 'staff']) {
        const variants = wt === 'bow' ? ['speed', 'range', 'crit'] : ['aoe', 'speed', 'crit'];
        for (const v of variants) _regEquip('weapon', v, g, wt);
        ITEM_REGISTRY[`weapon_${wt}_${g}`] = { kind: 'equip', grade: g, slot: 'weapon', variant: 'random', weaponType: wt };
      }
      ITEM_REGISTRY[`weapon_${g}`] = { kind: 'equip', grade: g, slot: 'weapon', variant: 'random', weaponType: 'random' };
    } else {
      const variants = Object.keys(ENHANCE_STATS[slot] || {});
      for (const v of variants) _regEquip(slot, v, g);
      ITEM_REGISTRY[`equip_${g}_${slot}`] = { kind: 'equip', grade: g, slot, variant: 'random' };
    }
  }
  ITEM_REGISTRY[`equip_${g}`] = { kind: 'equip', grade: g, slot: 'random', variant: 'random' };
}
ITEM_REGISTRY['equip_random'] = { kind: 'equip', grade: 'from_city', slot: 'random', variant: 'random' };
ITEM_REGISTRY['weapon_random'] = { kind: 'equip', grade: 'from_city', slot: 'weapon', variant: 'random', weaponType: 'random' };

// ============================================================
// ВСПОМОГАТЕЛЬНОЕ
// ============================================================

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function variantsForSlot(slot, weaponType) {
  if (slot === 'weapon') {
    if (weaponType === 'bow') return ['speed', 'range', 'crit'];
    if (weaponType === 'staff') return ['aoe', 'speed', 'crit'];
    return ['speed', 'range', 'crit', 'aoe'];
  }
  return Object.keys(ENHANCE_STATS[slot] || {});
}

// Разрешение одной записи реестра в конкретный предмет
function resolveEntry(def, ctx) {
  if (def.kind === 'gold') return { kind: 'gold' };

  if (def.kind === 'counter') {
    if (def.counter === 'scroll') {
      const grade = def.grade || ctx.cityGrade;
      return { kind: 'counter', counter: 'scroll', grade, type: def.type };
    }
    if (def.counter === 'potion') {
      return { kind: 'counter', counter: 'potion', potionType: def.potionType };
    }
    if (def.counter === 'soulshot') {
      const grade = def.grade || ctx.heroWeaponGrade || 'ng';
      return { kind: 'counter', counter: 'soulshot', grade };
    }
  }

  if (def.kind === 'backpack') {
    return { kind: 'backpack', make: def.make };
  }

  if (def.kind === 'equip') {
    let grade = def.grade === 'from_city' ? ctx.cityGrade : def.grade;
    if (!grade) grade = 'ng';

    let slot = def.slot === 'random' ? pick(SLOTS) : def.slot;
    let weaponType = def.weaponType;
    if (slot === 'weapon') {
      if (!weaponType || weaponType === 'random') weaponType = Math.random() < 0.5 ? 'bow' : 'staff';
    } else {
      weaponType = null;
    }

    let variant = def.variant;
    if (!variant || variant === 'random') {
      const vars = variantsForSlot(slot, weaponType);
      variant = vars.length ? pick(vars) : null;
    }

    return { kind: 'equip', grade, slot, weaponType, variant };
  }

  return null;
}

// ============================================================
// ОСНОВНАЯ ФУНКЦИЯ
// ============================================================

// Принимает список записей дропа, возвращает массив
// разрешённых дропов: [{ kind, amount|item|... }]
// Каждая запись бросает кубик независимо.
export function rollDrops(entries, ctx) {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const out = [];
  for (const e of entries) {
    if (!e || !e.id) continue;
    if (Math.random() > (e.chance ?? 0)) continue;

    const min = e.min ?? 1;
    const max = e.max ?? min;
    const amount = min + Math.floor(Math.random() * (max - min + 1));
    if (amount <= 0) continue;

    const def = ITEM_REGISTRY[e.id];
    if (!def) {
      console.warn('[loot] unknown id:', e.id);
      continue;
    }

    const resolved = resolveEntry(def, ctx);
    if (!resolved) continue;

    resolved.amount = amount;
    out.push(resolved);
  }
  return out;
}

// Применение к герою/состоянию. Возвращает сводку для sessionStats.
// out = { gold, items, scrolls, blessed, books, potions, soulshots }
export function applyDrops(drops, hero, state) {
  const summary = { gold: 0, items: 0, scrolls: 0, blessed: 0, books: 0, potions: 0, soulshots: 0 };
  if (!Array.isArray(drops)) return summary;

  const bagPush = (item) => {
    // Стак по kind+buffType/kind+skillId, как в addToBackpack
    if (item.kind === 'buff' || item.kind === 'blessed' || item.kind === 'pass' || item.kind === 'book') {
      const existing = hero.backpack.find(x =>
        x.kind === item.kind &&
        (item.kind !== 'buff' || x.buffType === item.buffType) &&
        (item.kind !== 'book' || x.skillId === item.skillId)
      );
      if (existing) { existing.count = (existing.count || 1) + (item.count || 1); return; }
    }
    hero.backpack.push(item);
  };

  for (const d of drops) {
    const n = d.amount || 1;

    if (d.kind === 'gold') {
      state.gold += n;
      summary.gold += n;
      continue;
    }

    if (d.kind === 'counter') {
      if (d.counter === 'scroll') {
        if (!hero.scrolls[d.grade]) hero.scrolls[d.grade] = { weapon: 0, armor: 0 };
        hero.scrolls[d.grade][d.type] = (hero.scrolls[d.grade][d.type] || 0) + n;
        summary.scrolls += n;
      } else if (d.counter === 'potion') {
        hero.potions[d.potionType] = (hero.potions[d.potionType] || 0) + n;
        summary.potions += n;
      } else if (d.counter === 'soulshot') {
        hero.soulshots[d.grade] = (hero.soulshots[d.grade] || 0) + n;
        summary.soulshots += n;
      }
      continue;
    }

    if (d.kind === 'backpack') {
      const item = d.make();
      if (!item) continue;
      item.count = (item.count || 1) * n;
      bagPush(item);
      if (item.kind === 'book') summary.books += n;
      else if (item.kind === 'blessed') summary.blessed += n;
      else summary.items += n;
      continue;
    }

    if (d.kind === 'equip') {
      for (let i = 0; i < n; i++) {
        const item = createItem(d.grade, d.slot, d.weaponType, d.variant);
        if (item) {
          hero.backpack.push(item);
          summary.items++;
        }
      }
      continue;
    }
  }
  return summary;
}