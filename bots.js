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
  const level = 1 + Math.floor(rating / 30);   // <-- ДОБАВИТЬ ЭТУ СТРОКУ

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
    level,                                    // <-- ДОБАВИТЬ
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
    critDamage: Math.min(300, 50 + bCritDmg),
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
     level: bot.level, 
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


// Возвращает объект того же типа, что и герой игрока,
// чтобы battle.js мог работать с ним единообразно.
export function botToArenaHero(bot) {
  const stats = getBotStats(bot);
  const level = bot.level || (1 + Math.floor(bot.rating / 30));
  const isMage = bot.classType === 'mage' || bot.classType === 'staff';

  // Стартовые расходники бота
  const potions = { small: 0, medium: 0, large: 0, epic: 0 };
  const potionTotal = Object.values(bot.potions || {}).reduce((a,b) => a+b, 0);
  if (potionTotal > 0) potions.small = potionTotal;

  // Скиллы: если у бота задан skillIds — используем его, иначе по классу
  const botSkills = {};
  const botSlots = [];
  const botSkillIds = (bot.skillIds && bot.skillIds.length)
    ? bot.skillIds
    : (isMage ? ['fireball', 'frost', 'heal'] : ['multishot', 'dodge', 'stun']);
  for (const id of botSkillIds) {
    botSkills[id] = { level: 1 };
    botSlots.push(id);
  }

  return {
    isAI: true,
    team: 'enemy',
    classType: isMage ? 'mage' : 'archer',
    name: bot.name,
    emoji: isMage ? '🔮' : '🏹',
    weaponType: isMage ? 'staff' : 'bow',

    level,
    xp: 0, xpToNext: 999999,

    baseMaxHp: stats.maxHp,
    maxHp: stats.maxHp,
    hp: stats.maxHp,
    baseMaxMana: isMage ? 120 : 80,
    maxMana: isMage ? 120 : 80,
    mana: isMage ? 120 : 80,
    baseManaRegen: isMage ? 6 : 4,
    manaRegen: isMage ? 6 : 4,

      baseAttack: stats.attack,
    attack: stats.attack * ((bot.activeBuffs?.attack) ? 1.20 : 1),
    baseAttackSpeed: stats.attackSpeed,
    attackSpeed: stats.attackSpeed * ((bot.activeBuffs?.speed) ? 1.50 : 1),
    baseRange: stats.range,
    range: stats.range * ((bot.activeBuffs?.range) ? 1.50 : 1),
    baseMoveSpeed: 3.2,
    moveSpeed: 3.2,
    defense: stats.defense,

    critChance: Math.min(75, stats.critChance + ((bot.activeBuffs?.crit) ? 15 : 0)),
    critDamage: stats.critDamage,
    dodge: stats.dodge,
    lifesteal: stats.lifesteal,
    accuracy: stats.accuracy || 0,
    critResist: stats.critResist || 0,
    armorPen: stats.armorPen || 0,
    antiHeal: stats.antiHeal || 0,
    berserk: stats.berserk || 0,
    thorns: stats.thorns || 0,

    chainTargets: 0,
    hpBonus: 0,
    thornsPercent: 0,
    doubleStrikeChance: 0,
    speedBonus: 0,
    cloakDodge: 0,
    executeBonus: 0,
    shieldPercent: 0,

    cooldown: 0, hitAnim: 0, attackAnim: 0, dead: false,
    x: 0, y: 0, facing: 1, facingAngle: 0,
    size: 0.8,

    // ===== КАСТ =====
    casting: null,
    _pendingCastResult: null,
    castSpeed: 0,
    castStability: 0,

    // ===== ДЕБАФФЫ =====
    stunUntil: 0,
    slowUntil: 0,
    silenceUntil: 0,
    attackSpeedDebuff: null,
    dots: [],

    equipment: bot.equipment || {},
    backpack: [],

    skills: botSkills,
    skillSlots: botSlots,
    skillCooldowns: {},
    skillBuffs: {},

      potions,
    activePotion: (Object.values(bot.potions || {}).some(v => v > 0)) ? 'small' : null,
    soulshots: bot.soulshots || {},
    soulshotActive: Object.values(bot.soulshots || {}).some(v => v > 0),
    activeBuffs: bot.activeBuffs || {},

    arenaRating: bot.rating,
    arenaId: bot.id,
  };
}