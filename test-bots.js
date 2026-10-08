// test-bots.js
// Тестовые боты для ручного тестирования баланса.
// Все S+20 (грейд S, заточка +20). Разные архетипы сборки.
// rating 3300 — они всегда в топе списка арены.
// Ищи их по эмодзи 🧪 в имени.

import { SLOTS } from './config.js';
import { createItem } from './items.js';

function makeEquip(grade, enhance, variantMap, weaponType) {
  const eq = {};
  for (const slot of SLOTS) {
    const v = variantMap[slot];
    if (!v) continue;
    const wt = slot === 'weapon' ? weaponType : null;
    const item = createItem(grade, slot, wt, v);
    if (item) {
      item.enhance = enhance;
      eq[slot] = item;
    }
  }
  return eq;
}

// Полный набор баффов — как у топ-игрока с 4 активными свитками
const FULL_BUFFS = { attack: true, crit: true, speed: true, range: true };

export function createTestBots() {
  const G = 's', E = 20;
  const bots = [];

  // 1. Крит-бурст — максимум крита и крит-урона
  bots.push({
    id: 'test_crit_archer',
    name: '🧪 Крит-бурст',
    isTest: true,
    classType: 'archer',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'crit', helmet:'dodge', armor:'hp', gloves:'crit',
      boots:'speed', cloak:'dodge', ring:'crit', amulet:'hp',
    }, 'bow'),
    soulshots: { s: 9999 },
    potions: { small: 30 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['multishot', 'dodge', 'stun'],
  });

  // 2. Танк — защита, HP, ответный урон
  bots.push({
    id: 'test_tank',
    name: '🧪 Танк',
    isTest: true,
    classType: 'archer',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'speed', helmet:'def', armor:'def', gloves:'accuracy',
      boots:'hp', cloak:'thorns', ring:'resist', amulet:'hp',
    }, 'bow'),
    soulshots: { s: 9999 },
    potions: { small: 50 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['dodge', 'heal', 'stun'],
  });

  // 3. Скоростной — attack speed + lifesteal
  bots.push({
    id: 'test_speed',
    name: '🧪 Скоростной',
    isTest: true,
    classType: 'archer',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'speed', helmet:'hp', armor:'hp', gloves:'speed',
      boots:'speed', cloak:'dodge', ring:'berserk', amulet:'lifesteal',
    }, 'bow'),
    soulshots: { s: 9999 },
    potions: { small: 30 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['multishot', 'dodge', 'stun'],
  });

  // 4. Вампир — lifesteal + berserk
  bots.push({
    id: 'test_vampire',
    name: '🧪 Вампир',
    isTest: true,
    classType: 'archer',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'crit', helmet:'hp', armor:'hp', gloves:'speed',
      boots:'hp', cloak:'dodge', ring:'berserk', amulet:'lifesteal',
    }, 'bow'),
    soulshots: { s: 9999 },
    potions: { small: 30 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['multishot', 'dodge', 'heal'],
  });

  // 5. Маг-скилловик — AoE-оружие, fireball
  bots.push({
    id: 'test_mage_aoe',
    name: '🧪 Маг-скилловик',
    isTest: true,
    classType: 'mage',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'aoe', helmet:'hp', armor:'def', gloves:'accuracy',
      boots:'hp', cloak:'dodge', ring:'berserk', amulet:'hp',
    }, 'staff'),
    soulshots: { s: 9999 },
    potions: { small: 30 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['fireball', 'frost', 'heal'],
  });

  // 6. Универсал — сбалансированный
  bots.push({
    id: 'test_universal',
    name: '🧪 Универсал',
    isTest: true,
    classType: 'archer',
    rating: 3300,
    level: 80,
    wins: 0, losses: 0,
    equipment: makeEquip(G, E, {
      weapon:'speed', helmet:'hp', armor:'def', gloves:'crit',
      boots:'dodge', cloak:'range', ring:'crit', amulet:'hp',
    }, 'bow'),
    soulshots: { s: 9999 },
    potions: { small: 30 },
    activeBuffs: FULL_BUFFS,
    skillIds: ['multishot', 'dodge', 'heal'],
  });

  return bots;
} 

// ===== ТРЕНИРОВОЧНЫЙ МАНЕКЕН =====
// Огромное HP, слабая автоатака, кастует всё что есть в слотах.
// Для теста эффектов скиллов на арене.
export function createTrainingDummy() {
  const skillIds = [
    'fireball',       // DD-burst маг (fireball + AoE 1.5)
    'multishot',      // DD-burst лук
    'stun_shot',      // CC-stun
    'silence',        // CC-silence
    'heal',           // само-хил
    'arcane_shield',  // щит
    'dodge',          // buff-def
    'panther',        // summon (пантера)
  ];

  return {
    id: 'training_dummy',
    name: '🎯 Тренировочный манекен',
    isTest: true,
    isTrainingDummy: true,
    ignoreClassLock: true,   // кастует любой скилл независимо от класса
    classType: 'mage',
    rating: 800,             // внизу списка, всегда доступен
    level: 80,
    wins: 0, losses: 0,
    equipment: {},
    soulshots: { s: 0 },
    potions: { small: 0 },
    activeBuffs: {},
    skillIds,

    // Переопределение статов (применяется в botToArenaHero)
    statsOverride: {
      maxHp: 999999, hp: 999999,
      attack: 3,          // очень слабая автоатака
      attackSpeed: 0.3,   // медленная
      defense: 0,
      maxMana: 99999, mana: 99999,
      manaRegen: 50,      // чтобы кастовал без остановки
      range: 999,
      emoji: '🎯',
    },
  };
}