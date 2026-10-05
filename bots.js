import { GRADE_ORDER, SLOTS, ENHANCE_STATS, CONFIG } from './config.js';
import { createItem, itemStats } from './items.js';

// ===== ИМЕНА БОТОВ =====

const FIRST_NAMES = [
  'Kratos','Aragorn','Legolas','Gandalf','Frodo','Sauron','Eowyn','Boromir',
  'Galadriel','Elrond','Xerxes','Zeus','Odin','Loki','Thor','Freya','Baldur',
  'Heimdall','Tyr','Bragi','Hela','Fenrir','Jormungandr','Sigurd','Brynhild',
  'Ragnar','Ivar','Bjorn','Ubbe','Floki','Rollo','Athelstan','Ecbert',
  'Leonidas','Achilles','Hector','Perseus','Theseus','Odysseus','Ajax','Diomedes',
  'Merlin','Arthur','Lancelot','Gawain','Percival','Galahad','Tristan','Mordred',
  'Conan','Kull','Red Sonja','Valeria','Subotai','Thulsa','Doom','Crom',
  'Anakin','Obi-Wan','Yoda','Mace','Qui-Gon','Palpatine','Vader','Luke',
  'Neo','Morpheus','Trinity','Cypher','Smith','Oracle','Seraph','Merovingian',
];

// ===== ГЕНЕРАЦИЯ БОТОВ =====

let nextBotId = 1;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomName() {
  return pick(FIRST_NAMES) + '#' + randInt(1000, 9999);
}

// Рейтинг распределяется: большинство в 1000–1800, редкие в 2000+
function randomRating() {
  const roll = Math.random();
  if (roll < 0.40) return randInt(900, 1300);    // 40% — новички
  if (roll < 0.75) return randInt(1300, 1700);   // 35% — средние
  if (roll < 0.93) return randInt(1700, 2100);   // 18% — сильные
  if (roll < 0.99) return randInt(2100, 2500);   // 6%  — топы
  return randInt(2500, 2900);                     // 1%  — легенды
}

// Грейд экипировки зависит от рейтинга
function gradeForRating(rating) {
  if (rating < 1100) return 'ng';
  if (rating < 1300) return 'd';
  if (rating < 1500) return 'c';
  if (rating < 1700) return 'b';
  if (rating < 2000) return 'a';
  if (rating < 2400) return 's';
  return 's';
}

// Заточка зависит от рейтинга
function enhanceForRating(rating) {
  if (rating < 1100) return randInt(0, 3);
  if (rating < 1300) return randInt(3, 7);
  if (rating < 1500) return randInt(7, 11);
  if (rating < 1700) return randInt(10, 14);
  if (rating < 2000) return randInt(13, 17);
  if (rating < 2400) return randInt(15, 19);
  return randInt(17, 20);
}

// Прочность зависит от рейтинга и «активности» бота
function durabilityForRating(rating) {
  const base = rating < 1300 ? randInt(60, 100) : randInt(40, 100);
  return base;
}

// Бот — это «снимок» героя
function createBot(classType = null) {
  const rating = randomRating();
  const grade = gradeForRating(rating);
  const enhance = enhanceForRating(rating);
  const durability = durabilityForRating(rating);

  const ct = classType || (Math.random() < 0.5 ? 'archer' : 'mage');
  const base = CONFIG.hero[ct];

  const equipment = {};
  for (const slot of SLOTS) {
    let variant = null;
    if (slot === 'weapon') {
      const variants = ct === 'staff'
        ? ['aoe', 'speed', 'crit']
        : ['speed', 'range', 'crit'];
      variant = pick(variants);
    } else {
      const variants = Object.keys(ENHANCE_STATS[slot] || {});
      variant = variants.length > 0 ? pick(variants) : null;
    }

    const item = createItem(grade, slot, slot === 'weapon' ? base.weapon : null, variant);
    if (item) {
      item.enhance = enhance;
      item.durability = durability;
      equipment[slot] = item;
    }
  }

  // Расходники — зависят от рейтинга
  const soulshotCount = rating < 1300 ? randInt(0, 200) : rating < 1700 ? randInt(200, 800) : randInt(500, 2000);
  const potionCount = rating < 1300 ? randInt(0, 5) : rating < 1700 ? randInt(3, 10) : randInt(5, 20);

  const hasScrolls = rating > 1400 && Math.random() < 0.6;
  const scrollTypes = ['attack','crit','speed','range'];
  const scrollsActive = {};
  if (hasScrolls) {
    const count = randInt(1, 4);
    for (let i = 0; i < count; i++) {
      scrollsActive[pick(scrollTypes)] = true;
    }
  }

  const soulshots = { ng:0, d:0, c:0, b:0, a:0, s:0 };
  soulshots[grade] = soulshotCount;

  const potions = { small:0, medium:0, large:0, epic:0 };
  if (potionCount > 0) potions.small = potionCount;

  return {
    id: nextBotId++,
    name: randomName(),
    classType: ct,
    rating,
    wins: randInt(0, rating * 2),
    losses: randInt(0, rating * 2),
    equipment,
    soulshots,
    potions,
    activeBuffs: scrollsActive,
    durability,
  };
}

// ===== СОЗДАНИЕ АРМИИ БОТОВ =====

export function createBots(count = 100) {
  const bots = [];
  for (let i = 0; i < count; i++) {
    bots.push(createBot());
  }
  return bots;
}

// ===== СТАТЫ БОТА (для симуляции боя) =====

export function getBotStats(bot) {
  let bHp=0,bAtk=0,bDef=0,bCrit=0,bCritDmg=0,bDodge=0,bLs=0,bAtkSpd=0,bRange=0;
  let bAcc=0,bCritRes=0,bArmorPen=0,bAntiHeal=0,bBerserk=0,bThorns=0,bMoveSpd=0;

  for (const slot of SLOTS) {
    const item = bot.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    const durMult = (item.durability || 100) / 100;
    bHp += (s.hp||0) * durMult;
    bAtk += (s.attack||0) * durMult;
    bDef += (s.defense||0) * durMult;
    bCrit += (s.critChance||0) * durMult;
    bCritDmg += (s.critDamage||0) * durMult;
    bDodge += (s.dodge||0) * durMult;
    bLs += (s.lifesteal||0) * durMult;
    bAtkSpd += (s.attackSpeed||0) * durMult;
    bRange += (s.range||0) * durMult;
    bAcc += (s.accuracy||0) * durMult;
    bCritRes += (s.critResist||0) * durMult;
    bArmorPen += (s.armorPen||0) * durMult;
    bAntiHeal += (s.antiHeal||0) * durMult;
    bBerserk += (s.berserk||0) * durMult;
    bThorns += (s.thorns||0) * durMult;
    bMoveSpd += (s.moveSpeed||0) * durMult;
  }

  const base = CONFIG.hero[bot.classType];
  return {
    maxHp: base.hp + bHp,
    attack: base.attack + bAtk,
    defense: bDef,
    critChance: Math.min(75, 5 + bCrit),
    critDamage: 50 + bCritDmg,
    dodge: Math.min(60, bDodge),
    lifesteal: Math.min(30, bLs),
    attackSpeed: base.attackSpeed * (1 + bAtkSpd / 100),
    range: base.range + bRange,
    accuracy: bAcc,
    critResist: Math.min(60, bCritRes),
    armorPen: Math.min(80, bArmorPen),
    antiHeal: Math.min(60, bAntiHeal),
    berserk: bBerserk,
    thorns: bThorns,
  };
}

// ===== СИМУЛЯЦИЯ БОТА (для «жизни» рейтинга) =====

// Раз в минуту рейтинг ботов немного меняется
export function tickBots(bots, dt) {
  // Не каждый кадр, а раз в ~5 сек
  if (Math.random() > 0.01) return;

  for (const bot of bots) {
    // Небольшое случайное изменение рейтинга
    const change = randInt(-3, 3);
    bot.rating = Math.max(800, bot.rating + change);

    // Редко — обновление экипировки (бот «точится»)
    if (Math.random() < 0.001) {
      const newEnhance = Math.min(20, enhanceForRating(bot.rating));
      for (const slot of SLOTS) {
        const item = bot.equipment[slot];
        if (item && item.enhance < newEnhance) {
          item.enhance = newEnhance;
        }
      }
    }
  }
}

// ===== СЕРИАЛИЗАЦИЯ (для аукциона/боя) =====

export function botToShadow(bot) {
  return {
    name: bot.name,
    classType: bot.classType,
    rating: bot.rating,
    equipment: bot.equipment,
    soulshots: bot.soulshots,
    potions: bot.potions,
    activeBuffs: bot.activeBuffs,
    durability: bot.durability,
  };
}