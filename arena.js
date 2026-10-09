// arena.js
import { RATING_CHESTS, SLOTS } from './config.js';
import { createArenaPass, createBlessedScroll, createItem, getVariantsForSlot } from './items.js';

// ===== СОЗДАНИЕ АРЕНЫ =====
export function createArena() {
  return {
    bots: [],
    myHistory: [],
    lastBattle: null,
    rouletteResult: null,
  };
}

// ===== РЕЙТИНГ (ЭЛО) =====
const K_FACTOR = 32;

export function expectedScore(myRating, oppRating) {
  return 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
}

export function ratingChange(myRating, oppRating, won) {
  const expected = expectedScore(myRating, oppRating);
  const actual = won ? 1 : 0;
  return Math.round(K_FACTOR * (actual - expected));
}

// ===== ОЦЕНКА ШАНСА ПОБЕДЫ (только для UI сравнения) =====
function computePower(stats) {
  if (!stats) return 0;
  const dps = (stats.attack || 0) * (stats.attackSpeed || 0)
            * (1 + (stats.critChance || 0) / 100 * (stats.critDamage || 0) / 100);
  const ehp = (stats.maxHp || 0) * (1 + (stats.defense || 0) / 200)
            * (1 + (stats.dodge || 0) / 100);
  const accuracy  = 1 + (stats.accuracy  || 0) / 100;
  const pen       = 1 + (stats.armorPen  || 0) / 100;
  const resist    = 1 + (stats.critResist || 0) / 100;
  const antiHeal  = 1 + (stats.antiHeal  || 0) / 100;
  const ls        = 1 + (stats.lifesteal || 0) / 100;
  return dps * ehp * accuracy * pen * resist * antiHeal * ls;
}

export function estimateWinChance(myStats, oppStats) {
  const myPower = computePower(myStats);
  const oppPower = computePower(oppStats);
  const total = myPower + oppPower;
  if (total <= 0) return 50;
  const raw = (myPower / total) * 100;
  return Math.round(Math.max(5, Math.min(95, raw)));
}

// ===== СУНДУКИ ЗА РЕЙТИНГ =====
export function getAvailableChests(hero) {
  const result = [];
  for (const chest of RATING_CHESTS) {
    if (hero.arena.rating >= chest.rating && !hero.arena.claimedChests.includes(chest.id)) {
      result.push(chest);
    }
  }
  return result;
}

export function claimChest(hero, chestId) {
  const chest = RATING_CHESTS.find(c => c.id === chestId);
  if (!chest) return { ok: false, reason: 'not_found' };
  if (hero.arena.claimedChests.includes(chestId)) return { ok: false, reason: 'already_claimed' };
  if (hero.arena.rating < chest.rating) return { ok: false, reason: 'too_low' };

  hero.arena.claimedChests.push(chestId);

  return {
    ok: true,
    chest,
    rewards: {
      gold: chest.gold,
      scrolls: chest.scrolls,
      blessed: chest.blessed,
      passes: chest.passes,
      itemGrade: chest.itemGrade,
    },
  };
}

// ===== КАРТОЧКИ НАГРАД ПОСЛЕ БОЯ =====
export function rollCardRewards(won, cityGrade = 'ng') {
  const pool = [
    { id: 'gold_small', icon: '💰', name: '500 золота',        gold: 500,   rarity: 'common' },
    { id: 'gold_med',   icon: '💰', name: '2 000 золота',      gold: 2000,  rarity: 'common' },
    { id: 'gold_big',   icon: '💰', name: '5 000 золота',      gold: 5000,  rarity: 'rare' },
    { id: 'scroll_3',   icon: '📜', name: '3 свитка заточки',  scrolls: 3,  rarity: 'common' },
    { id: 'scroll_5',   icon: '📜', name: '5 свитков заточки', scrolls: 5,  rarity: 'rare' },
    { id: 'blessed',    icon: '✨', name: 'Blessed Scroll',    blessed: 1,  rarity: 'epic' },
    { id: 'blessed_3',  icon: '✨', name: '3 Blessed Scroll',  blessed: 3,  rarity: 'legendary' },
    { id: 'item',       icon: '⚔',  name: 'Случайный предмет', item: true,  rarity: 'epic' },
    { id: 'item_rare',  icon: '🗡',  name: 'Редкий предмет',   item: true, rareItem: true, rarity: 'legendary' },
    { id: 'pass',       icon: '🎫', name: 'Пропуск на арену',  passes: 1,   rarity: 'rare' },
    { id: 'pass_3',     icon: '🎫', name: '3 пропуска',        passes: 3,   rarity: 'epic' },
  ];

  // При поражении убираем самые жирные
  const pool2 = won ? pool : pool.filter(p => p.rarity !== 'legendary');

  const chosen = [];
  const used = new Set();
  while (chosen.length < 3 && used.size < pool2.length) {
    const idx = Math.floor(Math.random() * pool2.length);
    if (used.has(idx)) continue;
    used.add(idx);
    chosen.push(pool2[idx]);
  }
  return chosen;
}

// ===== ПРИМЕНЕНИЕ НАГРАДЫ =====
export function applyRouletteReward(hero, reward) {
  switch (reward.id) {
    case 'gold_small': return { gold: 500,  message: '+500 золота' };
    case 'gold_med':   return { gold: 2000, message: '+2 000 золота' };
    case 'gold_big':   return { gold: 5000, message: '+5 000 золота' };
    case 'scroll_3':   return { scrolls: 3, message: '+3 свитка заточки' };
    case 'scroll_5':   return { scrolls: 5, message: '+5 свитков заточки' };
    case 'blessed':    return { blessed: 1, message: '+1 Blessed Scroll' };
    case 'blessed_3':  return { blessed: 3, message: '+3 Blessed Scroll' };
    case 'item':       return { item: true, message: 'Предмет!' };
    case 'item_rare':  return { item: true, rareItem: true, message: 'Редкий предмет!' };
    case 'pass':       return { passes: 1, message: '+1 Пропуск на арену' };
    case 'pass_3':     return { passes: 3, message: '+3 Пропуска на арену' };
    default:           return { gold: 100, message: '+100 золота' };
  }
}

export function applyRouletteToHero(hero, reward, cityGrade = 'ng') {
  const result = applyRouletteReward(hero, reward);

  if (result.gold) hero.gold = (hero.gold || 0) + result.gold;

  if (result.scrolls) {
    if (!hero.scrolls[cityGrade]) hero.scrolls[cityGrade] = { weapon: 0, armor: 0 };
    hero.scrolls[cityGrade].weapon += result.scrolls;
  }

  if (result.blessed) {
    const bs = createBlessedScroll(1);
    const existing = hero.backpack.find(x => x.kind === 'blessed');
    if (existing) existing.count = (existing.count || 1) + result.blessed;
    else hero.backpack.push(bs);
  }

  if (result.passes) {
    const pass = createArenaPass(1);
    const existing = hero.backpack.find(x => x.kind === 'pass');
    if (existing) existing.count = (existing.count || 1) + result.passes;
    else hero.backpack.push(pass);
  }

  if (result.item) {
    const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
    const weaponType = slot === 'weapon' ? hero.weaponType : null;
    const variants = getVariantsForSlot(slot, weaponType);
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const item = createItem(cityGrade, slot, weaponType, variant);
    if (item) hero.backpack.push(item);
  }

  return result;
}