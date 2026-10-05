import { CONFIG, SLOTS, ROULETTE_REWARDS, RATING_CHESTS, EQUIP_PRICES, GRADE_ORDER } from './config.js';
import { itemStats, durabilityMultiplier, createArenaPass, createBlessedScroll, createItem, getVariantsForSlot } from './items.js';
import { getShadowStats, calcHitChance, calcCritChance, calcEffectiveDefense } from './hero.js';
import { getBotStats } from './bots.js';

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

// ===== ПРОГНОЗ ШАНСА ПОБЕДЫ =====

// Грубая оценка: сравниваем «силу» двух героев
function computePower(stats) {
  const dps = stats.attack * stats.attackSpeed * (1 + stats.critChance / 100 * stats.critDamage / 100);
  const ehp = stats.maxHp * (1 + stats.defense / 200) * (1 + stats.dodge / 100);
  const accuracy = 1 + (stats.accuracy || 0) / 100;
  const pen = 1 + (stats.armorPen || 0) / 100;
  const resist = 1 + (stats.critResist || 0) / 100;
  const antiHeal = 1 + (stats.antiHeal || 0) / 100;
  const ls = 1 + (stats.lifesteal || 0) / 100;
  return dps * ehp * accuracy * pen * resist * antiHeal * ls;
}

export function estimateWinChance(myStats, oppStats) {
  const myPower = computePower(myStats);
  const oppPower = computePower(oppStats);
  const total = myPower + oppPower;
  if (total <= 0) return 50;
  const raw = (myPower / total) * 100;
  // Сжимаем к 50%, чтобы не было 99% и 1%
  const clamped = Math.max(5, Math.min(95, raw));
  return Math.round(clamped);
}

// ===== СИМУЛЯЦИЯ БОЯ =====

const BATTLE_DURATION = 30; // секунд
const TICK_RATE = 0.5;       // каждые 0.5 сек — удар

// Симулируем бой между двумя героями
// myHero — реальный hero.shadow
// oppStats — статы бота
// oppConsumables — расходники бота
export function simulateBattle(myStats, oppStats, myConsumables, oppConsumables) {
  let myHp = myStats.maxHp;
  let oppHp = oppStats.maxHp;

  let mySoulshots = myConsumables?.soulshots || 0;
  let oppSoulshots = oppConsumables?.soulshots || 0;
  let myPotions = myConsumables?.potions || 0;
  let oppPotions = oppConsumables?.potions || 0;

  const myHasScrolls = myConsumables?.scrolls || {};
  const oppHasScrolls = oppConsumables?.scrolls || {};

  const log = [];
  let time = 0;

  const applyBuffs = (stats, scrolls) => {
    const s = { ...stats };
    if (scrolls.attack) s.attack *= 1.20;
    if (scrolls.crit) s.critChance = Math.min(75, s.critChance + 15);
    if (scrolls.speed) s.attackSpeed *= 1.50;
    if (scrolls.range) s.range *= 1.50;
    return s;
  };

  const myBuffed = applyBuffs(myStats, myHasScrolls);
  const oppBuffed = applyBuffs(oppStats, oppHasScrolls);

  let myCd = 1 / myBuffed.attackSpeed;
  let oppCd = 1 / oppBuffed.attackSpeed;

  // Более мелкий тик для плавности анимации
  const TICK = 0.25;
  let myHpDisplay = myHp;
  let oppHpDisplay = oppHp;

  while (time < BATTLE_DURATION && myHp > 0 && oppHp > 0) {
    time += TICK;

    // Мой удар
    myCd -= TICK;
    if (myCd <= 0) {
      myCd += 1 / myBuffed.attackSpeed;
      const hitChance = calcHitChance(myBuffed, oppBuffed);
      const roll = Math.random() * 100;
      if (roll < hitChance) {
        let dmg = myBuffed.attack;
        if (mySoulshots > 0) { dmg *= 2; mySoulshots--; }
        const critChance = calcCritChance(myBuffed, oppBuffed);
        const isCrit = Math.random() * 100 < critChance;
        if (isCrit) dmg *= (1 + myBuffed.critDamage / 100);
        if (myBuffed.berserk > 0 && myHp / myStats.maxHp < 0.5) dmg *= (1 + myBuffed.berserk / 100);
        const effDef = calcEffectiveDefense(oppBuffed, myBuffed);
        dmg = Math.max(1, dmg - Math.floor(effDef * 0.5));
        oppHp -= dmg;
        if (myBuffed.lifesteal > 0) {
          const heal = Math.min(dmg * myBuffed.lifesteal / 100, myStats.maxHp * 0.02);
          myHp = Math.min(myStats.maxHp, myHp + heal);
        }
        log.push({
          time, side: 'me', dmg: Math.floor(dmg), crit: isCrit,
          myHp: Math.max(0, myHp), oppHp: Math.max(0, oppHp),
          myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp,
          usedSoulshot: myConsumables?.soulshots > 0 && mySoulshots < (myConsumables?.soulshots || 0),
        });
      } else {
        log.push({ time, side: 'me', miss: true, myHp: Math.max(0, myHp), oppHp: Math.max(0, oppHp), myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp });
      }
    }

    // Удар противника
    oppCd -= TICK;
    if (oppCd <= 0) {
      oppCd += 1 / oppBuffed.attackSpeed;
      const hitChance = calcHitChance(oppBuffed, myBuffed);
      const roll = Math.random() * 100;
      if (roll < hitChance) {
        let dmg = oppBuffed.attack;
        if (oppSoulshots > 0) { dmg *= 2; oppSoulshots--; }
        const critChance = calcCritChance(oppBuffed, myBuffed);
        const isCrit = Math.random() * 100 < critChance;
        if (isCrit) dmg *= (1 + oppBuffed.critDamage / 100);
        if (oppBuffed.berserk > 0 && oppHp / oppStats.maxHp < 0.5) dmg *= (1 + oppBuffed.berserk / 100);
        const effDef = calcEffectiveDefense(myBuffed, oppBuffed);
        dmg = Math.max(1, dmg - Math.floor(effDef * 0.5));
        myHp -= dmg;
        if (oppBuffed.lifesteal > 0) {
          const heal = Math.min(dmg * oppBuffed.lifesteal / 100, oppStats.maxHp * 0.02);
          oppHp = Math.min(oppStats.maxHp, oppHp + heal);
        }
        log.push({
          time, side: 'opp', dmg: Math.floor(dmg), crit: isCrit,
          myHp: Math.max(0, myHp), oppHp: Math.max(0, oppHp),
          myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp,
        });
      } else {
        log.push({ time, side: 'opp', miss: true, myHp: Math.max(0, myHp), oppHp: Math.max(0, oppHp), myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp });
      }
    }

    // Зелья
    if (myHp > 0 && myHp / myStats.maxHp < 0.5 && myPotions > 0) {
      const heal = Math.floor(myStats.maxHp * 0.3);
      myHp = Math.min(myStats.maxHp, myHp + heal);
      myPotions--;
      log.push({ time, side: 'me', potion: heal, myHp, oppHp, myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp });
    }
    if (oppHp > 0 && oppHp / oppStats.maxHp < 0.5 && oppPotions > 0) {
      const heal = Math.floor(oppStats.maxHp * 0.3);
      oppHp = Math.min(oppStats.maxHp, oppHp + heal);
      oppPotions--;
      log.push({ time, side: 'opp', potion: heal, myHp, oppHp, myMaxHp: myStats.maxHp, oppMaxHp: oppStats.maxHp });
    }
  }

  const won = oppHp <= 0 && myHp > 0;
  const draw = myHp <= 0 && oppHp <= 0;
  const lost = myHp <= 0 && oppHp > 0;

  let result;
  if (won) result = 'win';
  else if (lost) result = 'loss';
  else if (draw) result = 'draw';
  else {
    const myPct = myHp / myStats.maxHp;
    const oppPct = oppHp / oppStats.maxHp;
    if (myPct > oppPct) result = 'win';
    else if (oppPct > myPct) result = 'loss';
    else result = 'draw';
  }

  return {
    result, log, duration: time,
    myHpLeft: Math.max(0, Math.floor(myHp)),
    oppHpLeft: Math.max(0, Math.floor(oppHp)),
    myMaxHp: myStats.maxHp,
    oppMaxHp: oppStats.maxHp,
    soulshotsUsed: (myConsumables?.soulshots || 0) - mySoulshots,
    potionsUsed: (myConsumables?.potions || 0) - myPotions,
    myName: myConsumables?.name || 'Ты',
    oppName: oppConsumables?.name || 'Противник',
    myEmoji: myConsumables?.emoji || '🧙',
    oppEmoji: oppConsumables?.emoji || '👤',
    myClass: myConsumables?.classType || 'archer',
    oppClass: oppConsumables?.classType || 'archer',
  };
}

// ===== ПРОВЕДЕНИЕ БОЯ =====

export function fightBot(hero, bot) {
  const myStats = getShadowStats(hero);
  if (!myStats) return { ok: false, reason: 'no_shadow' };

  const oppStats = getBotStats(bot);

  const myConsumables = {
    soulshots: Object.values(hero.shadow.soulshots || {}).reduce((a,b) => a+b, 0),
    potions: Object.values(hero.shadow.potions || {}).reduce((a,b) => a+b, 0),
    scrolls: {},
  };
  // Какие свитки активны у меня
  const now = Date.now();
  for (const type of ['attack','crit','speed','range']) {
    if (hero.shadow.scrolls[type] > 0) myConsumables.scrolls[type] = true;
  }

const oppConsumables = {
  soulshots: Object.values(bot.soulshots || {}).reduce((a,b) => a+b, 0),
  potions: Object.values(bot.potions || {}).reduce((a,b) => a+b, 0),
  scrolls: bot.activeBuffs || {},
  name: bot.name,
  emoji: bot.classType === 'staff' ? '🔮' : '🏹',
  classType: bot.classType,
};

  const battle = simulateBattle(myStats, oppStats, myConsumables, oppConsumables);

  const won = battle.result === 'win';
  const oldRating = hero.arena.rating;
  const change = ratingChange(oldRating, bot.rating, won);

  hero.arena.rating = Math.max(0, oldRating + change);
  if (won) hero.arena.wins++;
  else if (battle.result === 'loss') hero.arena.losses++;

  // Износ экипировки тени
  const durabilityLoss = won ? 5 : battle.result === 'loss' ? 15 : 8;
  for (const slot of SLOTS) {
    const item = hero.shadow.equipment[slot];
    if (item && item.durability !== undefined) {
      item.durability = Math.max(0, item.durability - durabilityLoss);
    }
  }

  // Трата расходников
  const usedSoulshots = battle.soulshotsUsed;
  const usedPotions = battle.potionsUsed;
  // Соски
  let remainSoulshots = usedSoulshots;
  for (const grade of GRADE_ORDER) {
    if (remainSoulshots <= 0) break;
    const have = hero.shadow.soulshots[grade] || 0;
    const take = Math.min(have, remainSoulshots);
    hero.shadow.soulshots[grade] -= take;
    remainSoulshots -= take;
  }
  // Зелья
  let remainPotions = usedPotions;
  for (const type of ['small','medium','large','epic']) {
    if (remainPotions <= 0) break;
    const have = hero.shadow.potions[type] || 0;
    const take = Math.min(have, remainPotions);
    hero.shadow.potions[type] -= take;
    remainPotions -= take;
  }
  // Свитки — тратятся по 1 за бой
  for (const type of ['attack','crit','speed','range']) {
    if (hero.shadow.scrolls[type] > 0) {
      hero.shadow.scrolls[type]--;
    }
  }

  // История
  const record = {
    botName: bot.name,
    botRating: bot.rating,
    result: battle.result,
    change,
    timestamp: Date.now(),
    durabilityLoss,
  };
  hero.arena.history.unshift(record);
  if (hero.arena.history.length > 20) hero.arena.history.pop();

  return {
    ok: true,
    battle,
    won,
    ratingChange: change,
    oldRating,
    newRating: hero.arena.rating,
    botName: bot.name,
    botRating: bot.rating,
    durabilityLoss,
    usedSoulshots,
    usedPotions,
  };
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

  // Выдаём награды
  const rewards = {
    gold: chest.gold,
    scrolls: chest.scrolls,
    blessed: chest.blessed,
    passes: chest.passes,
    itemGrade: chest.itemGrade,
  };

  // Золото
  // (hero.gold снаружи — но у нас есть только hero, state отдельно;
  //  поэтому возвращаем данные, а применяет вызывающий)

  return { ok: true, chest, rewards };
}

// ===== РУЛЕТКА =====

// Выбрать 3 карточки наград (без рулетки)
export function rollCardRewards(won, cityGrade = 'ng') {
  const pool = [
    { id: 'gold_small', icon: '💰', name: '500 золота', gold: 500, rarity: 'common' },
    { id: 'gold_med',   icon: '💰', name: '2 000 золота', gold: 2000, rarity: 'common' },
    { id: 'gold_big',   icon: '💰', name: '5 000 золота', gold: 5000, rarity: 'rare' },
    { id: 'scroll_3',   icon: '📜', name: '3 свитка заточки', scrolls: 3, rarity: 'common' },
    { id: 'scroll_5',   icon: '📜', name: '5 свитков заточки', scrolls: 5, rarity: 'rare' },
    { id: 'blessed',    icon: '✨', name: 'Blessed Scroll', blessed: 1, rarity: 'epic' },
    { id: 'blessed_3',  icon: '✨', name: '3 Blessed Scroll', blessed: 3, rarity: 'legendary' },
    { id: 'item',       icon: '⚔', name: 'Случайный предмет', item: true, rarity: 'epic' },
    { id: 'item_rare',  icon: '🗡', name: 'Редкий предмет', item: true, rareItem: true, rarity: 'legendary' },
    { id: 'pass',       icon: '🎫', name: 'Пропуск на арену', passes: 1, rarity: 'rare' },
    { id: 'pass_3',     icon: '🎫', name: '3 пропуска', passes: 3, rarity: 'epic' },
  ];

  // При победе — шансы лучше
  let pool2 = pool;
  if (!won) {
    // При поражении убираем самые жирные
    pool2 = pool.filter(p => p.rarity !== 'legendary');
  }

  // Выбираем 3 уникальные карточки
  const chosen = [];
  const used = new Set();
  while (chosen.length < 3) {
    const idx = Math.floor(Math.random() * pool2.length);
    if (used.has(idx)) continue;
    used.add(idx);
    chosen.push(pool2[idx]);
    if (used.size >= pool2.length) break;
  }

  return chosen;
}

// ===== ПРИМЕНЕНИЕ НАГРАДЫ РУЛЕТКИ =====

export function applyRouletteReward(hero, reward) {
  switch (reward.id) {
    case 'gold_500':
      return { gold: 500, message: '+500 золота' };
    case 'gold_2000':
      return { gold: 2000, message: '+2 000 золота' };
    case 'scroll_3':
      return { scrolls: 3, message: '+3 свитка заточки' };
    case 'blessed':
      return { blessed: 1, message: '+1 Blessed Scroll' };
    case 'item':
      return { item: true, message: 'Предмет!' };
    case 'chest':
      return { chest: true, message: 'Сундук!' };
    case 'pass':
      return { passes: 1, message: '+1 Пропуск на арену' };
    default:
      return { gold: 100, message: '+100 золота' };
  }
}

// ===== ПРИМЕНЕНИЕ РУЛЕТКИ К ГЕРОЮ =====

export function applyRouletteToHero(hero, reward, cityGrade = 'ng') {
  const result = applyRouletteReward(hero, reward);

  if (result.gold) hero.gold = (hero.gold || 0) + result.gold;

  if (result.scrolls) {
    const grade = cityGrade;
    if (!hero.scrolls[grade]) hero.scrolls[grade] = { weapon: 0, armor: 0 };
    hero.scrolls[grade].weapon += result.scrolls;
  }

  if (result.blessed) {
    const bs = createBlessedScroll(1);
    // стакаем
    const existing = hero.backpack.find(x => x.kind === 'blessed');
    if (existing) existing.count = (existing.count || 1) + 1;
    else hero.backpack.push(bs);
  }

  if (result.passes) {
    const pass = createArenaPass(1);
    const existing = hero.backpack.find(x => x.kind === 'pass');
    if (existing) existing.count = (existing.count || 1) + 1;
    else hero.backpack.push(pass);
  }

  if (result.item) {
    // Случайный предмет текущего грейда
    const slots = SLOTS;
    const slot = slots[Math.floor(Math.random() * slots.length)];
    const weaponType = slot === 'weapon' ? hero.weaponType : null;
    const variants = getVariantsForSlot(slot, weaponType);
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const item = createItem(cityGrade, slot, weaponType, variant);
    if (item) hero.backpack.push(item);
  }

  return result;
}