// ═══════════════════════════════════════════════════════════════════════
//  bosses.js — СПРАВОЧНИК БОССОВ
// ═══════════════════════════════════════════════════════════════════════
//
//  ВСЁ УПРАВЛЕНИЕ БОССОМ — в блоке BOSSES[id]. Больше нигде.
//
//  Поля босса:
//    id, name, emoji, grade        — идентификация
//
//    hp                            — здоровье
//    attack                        — урон автоатаки (ровно это число, без множителей)
//    speed                         — скорость бега (клеток/сек)
//                                   0.5 = медленный, 1.0 = обычный, 2.0+ = быстрый
//    baseAttackCd                  — пауза между ударами в секундах
//                                   1.5 = раз в 1.5 сек, 0.8 = раз в 0.8 сек
//    xp                            — опыт за убийство
//    size                          — визуальный размер (1.5 = крупный, 3 = огромный)
//
//    statBonus{}                   — плоские бонусы статов
//                                    { defense, hp, critChance, critDamage,
//                                      dodge, lifesteal, accuracy, critResist,
//                                      armorPen, antiHeal, berserk, thorns }
//
//    buffs[]                       — постоянные баффы (id из BUFF_SCROLLS):
//                                    'attack', 'crit', 'speed', 'defense',
//                                    'evasion', 'critdmg', 'vampiric',
//                                    'accuracy', 'mana'
//
//    skills[]                      — скиллы: { id, level, cd, when }
//                                    id — из SKILLS (см. config.js)
//                                    level — 1..100
//                                    cd — кулдаун в секундах
//                                    when — 'always' | 'hp_below_50' |
//                                           'hp_below_40' | 'hp_above_70'
//
//    resists{}                     — резисты: { stun: 0.3, slow: 0.2 }
//
//    guards{}                      — охрана: { mobs[], count, interval, max }
//
//    aoe{}                         — AoE-паттерн:
//                                    { dmgPercent, interval:[min,max],
//                                      shake, types:['circle','marker','line','ring','fire'] }
//
//    drops[]                       — дроп: { id, chance, min, max }
//
//    attackRange                   — радиус атаки (1.5 = мили, 7-8 = рейндж)
//    attackProjectile              — { type, color, speed } для рейндж-боссов
//    keepDistance                  — true = отходит при подходе героя
//
// ═══════════════════════════════════════════════════════════════════════

// Алиасы для старых id скиллов у боссов
const SKILL_ALIASES = {
  stun:          'stun_shot',
  frost:         'slow_arrow',
  poison:        'poison_arrow',
  summon_shadow: 'shadow',
};

export const BOSSES = {

  // ═════════════════════════════════════════════════════════════════════
  //  КОРОЛЬ ГРЕМЛИНОВ — мили-босс первой зоны (Talking Island, easy)
  //  Тип: мили, быстрый, средний HP
  // ═════════════════════════════════════════════════════════════════════
  gremlin_king: {
    id: 'gremlin_king',
    name: 'Король гремлинов',
    emoji: '👑',
    grade: 'ng',

    hp: 15000,
    attack: 200,
    speed: 1.2,
    baseAttackCd: 1.0,
    xp: 2000,
    size: 2.5,

    statBonus: {
      defense: 100, hp: 2000,
      critChance: 25, critDamage: 50,
    },
    buffs: ['attack', 'crit'],

    skills: [
      { id: 'fireball',  level: 100, cd: 1 },
      { id: 'heal',      level: 30, cd: 25, when: 'hp_below_50' },
      { id: 'haste',     level: 20, cd: 10, when: 'hp_above_70' },
      { id: 'stun_shot', level: 100, cd: 5 },
      { id: 'iron_skin', level: 20, cd: 20, when: 'hp_below_60' },
      { id: 'berserk',   level: 100, cd: 5, when: 'hp_below_40' },
    ],

    resists: { stun: 0.3, slow: 0.2 },
    guards: { mobs: ['keltir'], count: 5, interval: 15, max: 10 },

    aoe: {
      dmgPercent: 0.20,
      interval: [6, 8],
      shake: 2,
      types: ['circle', 'marker'],
    },

    drops: [
      { id:'gold',             chance:1.0,  min:5000, max:10000 },
      { id:'scroll_weapon_ng', chance:0.5,  min:15,  max:35    },
      { id:'scroll_armor_ng',  chance:0.5,  min:15,  max:35    },
      { id:'blessed_scroll',   chance:0.3,  min:2,   max:5     },
      { id:'book_double_shot', chance:0.2,  min:1,   max:1     },
      { id:'book_heal',        chance:0.2,  min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ОГНЕННЫЙ МАГ — рейндж-босс (стреляет фаерболами с дистанции)
  // ═════════════════════════════════════════════════════════════════════
  fire_mage: {
    id: 'fire_mage',
    name: 'Огненный маг',
    emoji: '🧙',
    grade: 'c',

    hp: 12000,
    attack: 80,
    speed: 0.5,
    baseAttackCd: 1.2,
    xp: 1000,
    size: 1.3,

    attackRange: 8,
    attackProjectile: { type: 'staff', color: '#f97316', speed: 12 },
    keepDistance: true,

    statBonus: {
      critChance: 20, critDamage: 40,
      defense: 30,
    },
    buffs: [],

    skills: [
      { id: 'fireball',      level: 60, cd: 3 },
      { id: 'meteor',        level: 60, cd: 20 },
      { id: 'arcane_shield', level: 60, cd: 30, when: 'hp_below_60' },
      { id: 'heal',          level: 60, cd: 25, when: 'hp_below_40' },
      { id: 'silence',       level: 60, cd: 15 },
      { id: 'ice_bolt',      level: 60, cd: 6 },
    ],

    resists: { stun: 0.3, silence: 0.4 },
    guards: { mobs: ['ghost'], count: 4, interval: 15, max: 10 },

    aoe: null,

    drops: [
      { id:'gold',             chance:1.0,  min:10000, max:25000 },
      { id:'scroll_weapon_c',  chance:0.6,  min:3,     max:8     },
      { id:'scroll_armor_c',   chance:0.6,  min:3,     max:8     },
      { id:'blessed_scroll',   chance:0.3,  min:1,     max:3     },
      { id:'arena_pass',       chance:1.0,  min:2,     max:4     },
      { id:'book_fireball',    chance:0.25, min:1,     max:1     },
      { id:'book_meteor',      chance:0.1,  min:1,     max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ВОЖДЬ КЕЛЬТИРОВ — быстрый мили-босс (Talking Island, medium)
  // ═════════════════════════════════════════════════════════════════════
  keltir_alpha: {
    id: 'keltir_alpha',
    name: 'Вождь кельтиров',
    emoji: '🐺',
    grade: 'ng',

    hp: 5000,
    attack: 120,
    speed: 1.5,
    baseAttackCd: 1.0,
    xp: 1800,
    size: 1.4,

    statBonus: {
      critChance: 15, dodge: 10,
      defense: 30,
    },
    buffs: ['speed', 'attack'],

    skills: [
      { id: 'slow_arrow', level: 30, cd: 8 },
      { id: 'dodge',      level: 40, cd: 15, when: 'hp_below_50' },
      { id: 'stun_shot',  level: 30, cd: 15 },
      { id: 'haste',      level: 30, cd: 20, when: 'hp_below_70' },
    ],

    resists: { slow: 0.3 },
    guards: { mobs: ['direwolf'], count: 4, interval: 15, max: 8 },

    aoe: {
      dmgPercent: 0.20,
      interval: [6, 8],
      shake: 2,
      types: ['circle', 'marker'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:800, max:1800 },
      { id:'scroll_weapon_ng', chance:0.5, min:10,  max:25   },
      { id:'scroll_armor_ng',  chance:0.5, min:10,  max:25   },
      { id:'blessed_scroll',   chance:0.3, min:2,   max:4    },
      { id:'arena_pass',       chance:1.0, min:1,   max:2    },
      { id:'book_slow_arrow',  chance:0.25,min:1,   max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ТРОЛЛЬ-ВОЖДЬ — танк-босс (Talking Island, hard)
  // ═════════════════════════════════════════════════════════════════════
  troll_chief: {
    id: 'troll_chief',
    name: 'Тролль-вождь',
    emoji: '🧌',
    grade: 'ng',

    hp: 8000,
    attack: 200,
    speed: 1.0,
    baseAttackCd: 1.2,
    xp: 2500,
    size: 1.5,

    statBonus: {
      defense: 50, hp: 800,
      critChance: 10,
    },
    buffs: ['attack'],

    skills: [
      { id: 'power_shot', level: 30, cd: 8 },
      { id: 'berserk',    level: 40, cd: 30, when: 'hp_below_50' },
      { id: 'stun_shot',  level: 40, cd: 15 },
      { id: 'iron_skin',  level: 40, cd: 20, when: 'hp_below_60' },
    ],

    resists: { stun: 0.3 },
    guards: { mobs: ['stone_golem'], count: 5, interval: 15, max: 10 },

    aoe: {
      dmgPercent: 0.25,
      interval: [6, 8],
      shake: 3,
      types: ['circle', 'marker', 'line'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:1500, max:3000 },
      { id:'scroll_weapon_ng', chance:0.6, min:15,   max:35   },
      { id:'scroll_armor_ng',  chance:0.6, min:15,   max:35   },
      { id:'blessed_scroll',   chance:0.35,min:2,    max:5    },
      { id:'arena_pass',       chance:1.0, min:1,    max:2    },
      { id:'book_power_shot',  chance:0.25,min:1,    max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  КОРОЛЬ ГОЛЕМОВ — танк-босс (Talking Island, medium)
  // ═════════════════════════════════════════════════════════════════════
  stone_golem_king: {
    id: 'stone_golem_king',
    name: 'Король големов',
    emoji: '🗿',
    grade: 'ng',

    hp: 10000,
    attack: 150,
    speed: 0.8,
    baseAttackCd: 1.5,
    xp: 2000,
    size: 1.6,

    statBonus: {
      defense: 80, hp: 1500,
    },
    buffs: ['attack', 'iron_skin'],

    skills: [
      { id: 'stun_shot', level: 30, cd: 12 },
      { id: 'heal',      level: 30, cd: 30, when: 'hp_below_50' },
      { id: 'iron_skin', level: 30, cd: 20, when: 'hp_below_70' },
    ],

    resists: { stun: 0.3 },
    guards: { mobs: ['stone_golem'], count: 6, interval: 12, max: 12 },

    aoe: {
      dmgPercent: 0.22,
      interval: [6, 8],
      shake: 3,
      types: ['circle', 'marker'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:1500, max:3000 },
      { id:'scroll_weapon_ng', chance:0.6, min:15,   max:30   },
      { id:'scroll_armor_ng',  chance:0.6, min:15,   max:30   },
      { id:'blessed_scroll',   chance:0.3, min:2,    max:5    },
      { id:'arena_pass',       chance:1.0, min:1,    max:2    },
      { id:'book_iron_skin',   chance:0.25,min:1,    max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ВЛАДЫКА ПЕЩЕРЫ — быстрый мили-босс (Talking Island, hard)
  // ═════════════════════════════════════════════════════════════════════
  cave_lord: {
    id: 'cave_lord',
    name: 'Владыка пещеры',
    emoji: '👹',
    grade: 'ng',

    hp: 12000,
    attack: 250,
    speed: 1.2,
    baseAttackCd: 1.0,
    xp: 3000,
    size: 1.7,

    statBonus: {
      defense: 50,
      critChance: 20, critDamage: 40,
    },
    buffs: ['attack', 'speed'],

    skills: [
      { id: 'berserk',   level: 40, cd: 25, when: 'hp_below_40' },
      { id: 'stun_shot', level: 40, cd: 15 },
      { id: 'fireball',  level: 40, cd: 5 },
      { id: 'haste',     level: 40, cd: 20, when: 'hp_below_70' },
    ],

    resists: { stun: 0.4 },
    guards: { mobs: ['werewolf'], count: 6, interval: 12, max: 14 },

    aoe: {
      dmgPercent: 0.28,
      interval: [6, 8],
      shake: 4,
      types: ['circle', 'marker', 'line'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:2000, max:4000 },
      { id:'scroll_weapon_d',  chance:0.5, min:8,    max:20   },
      { id:'scroll_armor_d',   chance:0.5, min:8,    max:20   },
      { id:'blessed_scroll',   chance:0.35,min:3,    max:6    },
      { id:'arena_pass',       chance:1.0, min:1,    max:2    },
      { id:'book_stun_shot',   chance:0.3, min:1,    max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  КАПИТАН ПИРАТОВ — Giran easy
  // ═════════════════════════════════════════════════════════════════════
  pirate_captain: {
    id: 'pirate_captain',
    name: 'Капитан пиратов',
    emoji: '🏴‍☠️',
    grade: 'd',

    hp: 15000,
    attack: 400,
    speed: 1.0,
    baseAttackCd: 1.0,
    xp: 2500,
    size: 1.5,

    statBonus: {
      critChance: 20, dodge: 10,
      defense: 50,
    },
    buffs: ['attack', 'speed'],

    skills: [
      { id: 'stun_shot', level: 50, cd: 10 },
      { id: 'heal',      level: 50, cd: 30, when: 'hp_below_50' },
      { id: 'haste',     level: 50, cd: 15 },
      { id: 'fireball',  level: 50, cd: 6 },
    ],

    resists: { stun: 0.3 },
    guards: { mobs: ['orc'], count: 5, interval: 12, max: 10 },

    aoe: {
      dmgPercent: 0.30,
      interval: [5, 7],
      shake: 4,
      types: ['circle', 'marker', 'line'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:5000, max:10000 },
      { id:'scroll_weapon_d',  chance:0.6, min:10,  max:20    },
      { id:'scroll_armor_d',   chance:0.6, min:10,  max:20    },
      { id:'blessed_scroll',   chance:0.4, min:3,   max:6     },
      { id:'arena_pass',       chance:1.0, min:2,   max:3     },
      { id:'book_power_shot',  chance:0.3, min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  БОЛОТНАЯ ВЕДЬМА — Giran medium (рейндж)
  // ═════════════════════════════════════════════════════════════════════
  swamp_witch: {
    id: 'swamp_witch',
    name: 'Болотная ведьма',
    emoji: '🧙‍♀️',
    grade: 'd',

    hp: 18000,
    attack: 300,
    speed: 0.8,
    baseAttackCd: 1.2,
    xp: 3000,
    size: 1.4,

    attackRange: 8,
    attackProjectile: { type: 'staff', color: '#a855f7', speed: 12 },
    keepDistance: true,

    statBonus: {
      critChance: 20, critDamage: 30,
      defense: 40,
    },
    buffs: ['attack', 'crit'],

    skills: [
      { id: 'fireball',   level: 50, cd: 4 },
      { id: 'slow_arrow', level: 50, cd: 12 },
      { id: 'heal',       level: 50, cd: 25 },
      { id: 'silence',    level: 50, cd: 15 },
      { id: 'meteor',     level: 50, cd: 25 },
    ],

    resists: { silence: 0.5 },
    guards: { mobs: ['spider'], count: 4, interval: 12, max: 10 },

    aoe: {
      dmgPercent: 0.30,
      interval: [5, 7],
      shake: 4,
      types: ['circle', 'marker', 'ring'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:7000, max:14000 },
      { id:'scroll_weapon_d',  chance:0.6, min:12,  max:25    },
      { id:'scroll_armor_d',   chance:0.6, min:12,  max:25    },
      { id:'blessed_scroll',   chance:0.45,min:4,   max:8     },
      { id:'arena_pass',       chance:1.0, min:2,   max:4     },
      { id:'book_fireball',    chance:0.3, min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ОРОЧИЙ ВОЕНАЧАЛЬНИК — Giran medium
  // ═════════════════════════════════════════════════════════════════════
  orc_warlord: {
    id: 'orc_warlord',
    name: 'Орочий военачальник',
    emoji: '👹',
    grade: 'd',

    hp: 25000,
    attack: 500,
    speed: 1.3,
    baseAttackCd: 0.9,
    xp: 4000,
    size: 1.7,

    statBonus: {
      defense: 80,
      critChance: 25, critDamage: 50,
    },
    buffs: ['attack', 'crit', 'speed'],

    skills: [
      { id: 'berserk',   level: 60, cd: 20, when: 'hp_below_50' },
      { id: 'stun_shot', level: 60, cd: 12 },
      { id: 'fireball',  level: 60, cd: 5 },
      { id: 'iron_skin', level: 60, cd: 25, when: 'hp_below_60' },
    ],

    resists: { stun: 0.4, slow: 0.3 },
    guards: { mobs: ['orc_shaman'], count: 6, interval: 12, max: 14 },

    aoe: {
      dmgPercent: 0.32,
      interval: [5, 7],
      shake: 5,
      types: ['circle', 'marker', 'line', 'ring'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:12000, max:24000 },
      { id:'scroll_weapon_d',  chance:0.7, min:15,  max:30    },
      { id:'scroll_weapon_c',  chance:0.3, min:2,   max:5     },
      { id:'blessed_scroll',   chance:0.5, min:5,   max:10    },
      { id:'arena_pass',       chance:1.0, min:3,   max:5     },
      { id:'book_berserk',     chance:0.35,min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  КОРОЛЬ-ЛИЧ — Giran hard (рейндж)
  // ═════════════════════════════════════════════════════════════════════
  skeleton_lord_boss: {
    id: 'skeleton_lord_boss',
    name: 'Король-лич',
    emoji: '☠️',
    grade: 'c',

    hp: 40000,
    attack: 700,
    speed: 1.0,
    baseAttackCd: 0.9,
    xp: 6000,
    size: 1.7,

    attackRange: 7,
    attackProjectile: { type: 'staff', color: '#7f1d1d', speed: 13 },
    keepDistance: true,

    statBonus: {
      critChance: 25, critDamage: 50,
      defense: 60,
    },
    buffs: ['attack', 'crit'],

    skills: [
      { id: 'fireball',  level: 60, cd: 4 },
      { id: 'stun_shot', level: 60, cd: 12 },
      { id: 'heal',      level: 60, cd: 20 },
      { id: 'meteor',    level: 60, cd: 25 },
      { id: 'silence',   level: 60, cd: 15 },
      { id: 'ice_bolt',  level: 60, cd: 6 },
    ],

    resists: { stun: 0.5, silence: 0.4 },
    guards: { mobs: ['skeleton'], count: 8, interval: 10, max: 20 },

    aoe: {
      dmgPercent: 0.35,
      interval: [4.5, 6.5],
      shake: 6,
      types: ['circle', 'marker', 'line', 'ring', 'fire'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:25000, max:50000 },
      { id:'scroll_weapon_c',  chance:0.7, min:15,  max:30    },
      { id:'scroll_weapon_b',  chance:0.2, min:2,   max:5     },
      { id:'blessed_scroll',   chance:0.55,min:6,   max:12    },
      { id:'arena_pass',       chance:1.0, min:3,   max:6     },
      { id:'book_meteor',      chance:0.2, min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  КАМЕННЫЙ КОЛОСС — Giran hard
  // ═════════════════════════════════════════════════════════════════════
  stone_colossus: {
    id: 'stone_colossus',
    name: 'Каменный колосс',
    emoji: '🗿',
    grade: 'c',

    hp: 60000,
    attack: 900,
    speed: 0.8,
    baseAttackCd: 1.5,
    xp: 8000,
    size: 1.9,

    statBonus: {
      defense: 200, hp: 5000,
      critResist: 30,
    },
    buffs: ['attack', 'iron_skin'],

    skills: [
      { id: 'stun_shot', level: 70, cd: 10 },
      { id: 'heal',      level: 70, cd: 30 },
      { id: 'iron_skin', level: 70, cd: 25, when: 'hp_below_60' },
      { id: 'berserk',   level: 70, cd: 30, when: 'hp_below_40' },
      { id: 'reflect',   level: 70, cd: 40 },
    ],

    resists: { stun: 0.6, slow: 0.5 },
    guards: { mobs: ['golem'], count: 8, interval: 10, max: 20 },

    aoe: {
      dmgPercent: 0.38,
      interval: [4.5, 6.5],
      shake: 6,
      types: ['circle', 'marker', 'line', 'ring'],
    },

    drops: [
      { id:'gold',             chance:1.0, min:35000, max:70000 },
      { id:'scroll_weapon_c',  chance:0.75,min:20,  max:40    },
      { id:'scroll_weapon_b',  chance:0.3, min:3,   max:8     },
      { id:'blessed_scroll',   chance:0.6, min:8,   max:15    },
      { id:'arena_pass',       chance:1.0, min:4,   max:8     },
      { id:'book_last_stand',  chance:0.25,min:1,   max:1     },
    ],
  },
};

// ───────────────────────────────────────────────────────────────────────
//  Дефолтные паттерны по грейду (для охраны и AoE)
// ───────────────────────────────────────────────────────────────────────
export const GUARD_CALL = {
  ng: { interval: 15, count: 3, max: 10 },
  d:  { interval: 15, count: 4, max: 15 },
  c:  { interval: 13, count: 5, max: 20 },
  b:  { interval: 12, count: 6, max: 25 },
  a:  { interval: 10, count: 7, max: 30 },
  s:  { interval: 8,  count: 8, max: 40 },
};

export const BOSS_AOE = {
  ng: { dmgPercent: 0.20, interval: [6, 8],     shake: 2, types: ['circle','marker'] },
  d:  { dmgPercent: 0.25, interval: [5.5, 7.5], shake: 3, types: ['circle','marker','line'] },
  c:  { dmgPercent: 0.30, interval: [5, 7],     shake: 4, types: ['circle','marker','line','ring'] },
  b:  { dmgPercent: 0.35, interval: [4.5, 6.5], shake: 5, types: ['circle','marker','line','ring','fire'] },
  a:  { dmgPercent: 0.40, interval: [4, 6],     shake: 6, types: ['circle','marker','line','ring','fire'] },
  s:  { dmgPercent: 0.50, interval: [3.5, 5.5], shake: 8, types: ['circle','marker','line','ring','fire'] },
};

// ───────────────────────────────────────────────────────────────────────
//  createBoss — собирает боевой объект
//  ВАЖНО: mult УБРАН. Статы босса — ровно как в BOSSES[id].
// ───────────────────────────────────────────────────────────────────────
export function createBoss(bossId, x, y, mult = 1) {
  const def = BOSSES[bossId];
  if (!def) {
    console.warn('[bosses] unknown boss id:', bossId);
    return null;
  }

  const grade = def.grade || 'ng';
  const guards = def.guards || GUARD_CALL[grade] || GUARD_CALL.ng;
  const sm = def.statMult || {};
  const sb = def.statBonus || {};

  // ⚠️ mult убран — статы босса = числа из BOSSES[id]
  const hp  = Math.floor(def.hp * (sm.hp || 1)) + (sb.hp || 0);
  const atk = Math.floor(def.attack * (sm.attack || 1)) + (sb.attack || 0);
  const xp  = Math.floor(def.xp * (sm.xp || 1));

  if (!Number.isFinite(x)) x = 25;
  if (!Number.isFinite(y)) y = 25;

  return {
    id: def.id,
    defId: def.id,
    level: def.level || (def.grade === 'ng' ? 15 : def.grade === 'd' ? 30 : def.grade === 'c' ? 45 : def.grade === 'b' ? 55 : def.grade === 'a' ? 70 : 75),
    grade,
    name: def.name,
    emoji: def.emoji,
    boss: true,
    team: 'enemy',
    hp, maxHp: hp,

    // ─── BASE-СТАТЫ (для recalcStats) ───
    baseMaxHp: hp,
    baseMaxMana: 99999,
    baseAttack: atk,
    baseAttackSpeed: 1.0,
    baseRange: def.attackRange || 1.5,
    baseMoveSpeed: def.speed || 0.6,

    // ─── МАНА ───
    mana: 99999,
    maxMana: 99999,
    manaRegen: 0,

    // ─── СКИЛЛЫ и слоты ───
    skillCooldowns: {},
    skillBuffs: {},
    skillSlots: (def.skills || []).map(s => 'skill:' + (SKILL_ALIASES[s.id] || s.id)),

    // ─── Заглушки для recalcStats ───
    equipment: { weapon: null, helmet: null, armor: null, gloves: null, boots: null, cloak: null, ring: null, amulet: null },
    backpack: [],
    scrolls: { ng: { weapon: 0, armor: 0 }, d: { weapon: 0, armor: 0 }, c: { weapon: 0, armor: 0 }, b: { weapon: 0, armor: 0 }, a: { weapon: 0, armor: 0 }, s: { weapon: 0, armor: 0 } },
    potions: { small: 0, medium: 0, large: 0, epic: 0 },
    soulshots: { ng: 0, d: 0, c: 0, b: 0, a: 0, s: 0 },
    buffScrollCooldowns: {},

    isAI: true,
    ignoreClassLock: true,
    attack: atk,
    speed: def.speed,
    xp,
    size: def.size,
    x, y,
    aggro: true,
    attackCd: 0,
    baseAttackCd: def.baseAttackCd || 1.5,
    spawnAnim: 0,
    hitFlash: 0,
    dead: false,

    attackRange: def.attackRange || 1.5,
    range: def.attackRange || 1.5,
    attackProjectile: def.attackProjectile || null,
    keepDistance: def.keepDistance || false,

    defense:    (sb.defense || 0),
    critChance: (sb.critChance || 0),
    critDamage: (sb.critDamage || 0),
    dodge:      (sb.dodge || 0),
    lifesteal:  (sb.lifesteal || 0),
    accuracy:   (sb.accuracy || 0),
    critResist: (sb.critResist || 0),
    armorPen:   (sb.armorPen || 0),
    antiHeal:   (sb.antiHeal || 0),
    berserk:    (sb.berserk || 0),
    thorns:     (sb.thorns || 0),

    // ─── СКИЛЛЫ (объект, не массив) ───
    skills: (def.skills || []).reduce((acc, s) => {
      const id = SKILL_ALIASES[s.id] || s.id;
      acc[id] = {
        level: Math.max(1, Math.min(100, s.level || 1)),
        cd: s.cd || 10,
        cdLeft: s.cd || 10,
        when: s.when || 'always',
      };
      return acc;
    }, {}),

    activeBuffs: (def.buffs || []).reduce((acc, type) => {
      acc[type] = Date.now() + 999_999_999;
      return acc;
    }, {}),
    resists: { ...(def.resists || {}) },
    _guardsConfig: guards,
    aoeTimer: 2 + Math.random() * 2,
    castGlow: 0,
    _customAoe: def.aoe || null,
    guardTimer: guards.interval || 15,
    guardsSpawned: 0,
  };
}

// ───────────────────────────────────────────────────────────────────────
//  castBossAoe
// ───────────────────────────────────────────────────────────────────────
export function castBossAoe(boss, hero) {
  const distToHero = Math.hypot(hero.x - boss.x, hero.y - boss.y);
  if (distToHero > 12) return null;

  const grade = boss.grade || 'ng';
  const aoeDef = boss._customAoe || BOSS_AOE[grade] || BOSS_AOE.ng;
  const types = aoeDef.types;
  const type = types[Math.floor(Math.random() * types.length)];
  const dmg = Math.floor(hero.maxHp * aoeDef.dmgPercent);
  const delay = 3.0;

  if (type === 'circle') return { type:'circle', x:boss.x, y:boss.y, radius:4, delay, life:delay, damage:dmg, color:'#ef4444' };
  if (type === 'marker') return { type:'marker', x:hero.x, y:hero.y, radius:2.5, delay, life:delay, damage:dmg, color:'#f97316' };
  if (type === 'line')   return { type:'line', x:hero.x, y:hero.y, length:30, thickness:1.5, delay, life:delay, damage:dmg, color:'#dc2626' };
  if (type === 'ring')   return { type:'ring', x:boss.x, y:boss.y, innerRadius:2.5, outerRadius:7, delay, life:delay, damage:dmg, color:'#a855f7' };
  if (type === 'fire') {
    const spots = [];
    for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
      spots.push({
        x: hero.x + (Math.random() - 0.5) * 5,
        y: hero.y + (Math.random() - 0.5) * 5,
        radius: 1.8, life: delay + 5,
        damage: Math.floor(hero.maxHp * 0.10),
        tickTimer: 0, burned: 0,
      });
    }
    return { type:'fire', x:hero.x, y:hero.y, delay, life:delay+5, damage:dmg, spots, color:'#ea580c' };
  }
  return null;
}

export function checkAoeHit(aoe, hero) {
  if (aoe.type === 'circle' || aoe.type === 'marker') {
    return Math.hypot(aoe.x - hero.x, aoe.y - hero.y) <= aoe.radius;
  }
  if (aoe.type === 'line') {
    const half = aoe.length / 2;
    return Math.abs(hero.x - aoe.x) <= aoe.thickness && Math.abs(hero.y - aoe.y) <= half;
  }
  if (aoe.type === 'ring') {
    const d = Math.hypot(aoe.x - hero.x, aoe.y - hero.y);
    return d >= aoe.innerRadius && d <= aoe.outerRadius;
  }
  return false;
}

export function checkFireHit(aoe, hero) {
  if (aoe.type !== 'fire') return false;
  for (const s of aoe.spots) {
    if (s.life <= 0) continue;
    if (Math.hypot(s.x - hero.x, s.y - hero.y) <= s.radius) return true;
  }
  return false;
}