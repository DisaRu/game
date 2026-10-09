// ═══════════════════════════════════════════════════════════════════════
//  config.js — ЕДИНЫЙ ФАЙЛ НАСТРОЕК БАЛАНСА
// ═══════════════════════════════════════════════════════════════════════
//
//  ЧТО ЗДЕСЬ: все цифры игры — статы, множители, шансы, цены, дроп.
//  ЧТО НЕ ЗДЕСЬ: зоны и лаиры → cities.js. Боссы → bosses.js.
//
//  ПРАВИЛА:
//   • Меняешь цифру → Ctrl+F5 в браузере → видишь результат.
//   • ID (gremlin, fireball, ng, archer) НЕ МЕНЯТЬ — сломает сейвы.
//   • name и icon — меняй свободно.
//   • Если icon — строка с точкой (sprites/mob.png) → рисуется PNG.
//   • Если icon — эмодзи (👹) → рисуется как символ.
//
// ═══════════════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────────────
//  1. КАРТА И ОТРИСОВКА
// ───────────────────────────────────────────────────────────────────────
export const CONFIG = {
  map: {
    cols: 50,           // Ширина карты в клетках.
    rows: 50,           // Высота карты в клетках.
    cellPx: 36,         // Размер клетки в пикселях (36 = стандарт).
    cameraClamp: true,  // true = камера не выходит за края карты.
    renderRadius: 20,   // Радиус отрисовки от героя (в клетках).
                        // Больше = видно дальше, но FPS падает.
    updateRadius: 40,   // Радиус симуляции мобов (в клетках).
  },

// ───────────────────────────────────────────────────────────────────────
//  2. ГЕРОИ — БАЗОВЫЕ СТАТЫ КЛАССОВ (1 уровень)
// ───────────────────────────────────────────────────────────────────────
//  Эти числа — стартовая точка. Дальше всё прибавляется от уровня,
//  экипировки и баффов. Менять — только если хочешь другой «фундамент».
// ───────────────────────────────────────────────────────────────────────
  hero: {
    archer: {
      name: 'Лучник',
      emoji: '🏹',
      hp: 200,                  // стартовое HP (лучник крепче мага)
      attack: 15,               // базовая атака (маг сильнее)
      attackSpeed: 1.5,         // ударов/сек (1.5 = быстрый лучник)
      range: 0.5,               // дальность автоатаки в клетках
      projectileSpeed: 16,      // скорость снаряда (клеток/сек)
      projectileColor: '#4ade80',
      aoe: 0,                   // 0 = одиночная цель (лучник стреляет точно)
      moveSpeed: 3.5,           // скорость бега (клеток/сек)
      weapon: 'bow',
      maxMana: 80,              // стартовая мана
      manaRegen: 4,             // реген маны в секунду
    },
    mage: {
      name: 'Маг',
      emoji: '🔮',
      hp: 150,                  // маг хрупче (на 50 HP меньше)
      attack: 22,               // но бьёт сильнее (+7)
      attackSpeed: 0.9,         // медленнее (0.9 удара/сек)
      range: 0.8,               // чуть дальше лучника
      projectileSpeed: 10,      // снаряд медленнее (видно как летит заклинание)
      projectileColor: '#c084fc',
      aoe: 1.2,                 // AoE 1.2 клетки — бьёт по площади
      moveSpeed: 3.2,
      weapon: 'staff',
      maxMana: 120,             // маны больше (маг зависит от каста)
      manaRegen: 6,
    },
  },

// ───────────────────────────────────────────────────────────────────────
//  3. УРОВНИ — ПРОГРЕССИЯ
// ───────────────────────────────────────────────────────────────────────
//  Формула XP: nextXp = baseXp × (xpGrowth ^ level)
//  Пример для baseXp=50, xpGrowth=1.35:
//    2 ур.: 50 × 1.35^0 ≈ 50
//    10 ур.: 50 × 1.35^9 ≈ 900
//    40 ур.: 50 × 1.35^39 ≈ 120 000
//    80 ур.: 50 × 1.35^79 ≈ 3 000 000
// ───────────────────────────────────────────────────────────────────────
  level: {
    baseXp: 30,               // XP для перехода на 2-й уровень.
   xpGrowth: 1.7,           // Множитель роста XP.
                              // 1.20 = лёгкая прокачка, до 80 быстро.
                              // 1.35 = стандарт.
                              // 1.50 = хардкор, до 80 идут месяцы.
    maxLevel: 80,             // Потолок уровня.
    hpPerLevel: 80,           // Прибавка HP за уровень (на 80 ур. +6400).
    attackPerLevel: 3,        // Прибавка атаки за уровень (на 80 ур. +240).
    manaPerLevel: 15,         // Прибавка маны за уровень.
    manaRegenPerLevel: 0.15,  // Прибавка регена маны за уровень.
  },

// ───────────────────────────────────────────────────────────────────────
//  4. СМЕРТЬ И ВОЗРОЖДЕНИЕ
// ───────────────────────────────────────────────────────────────────────
  death: {
    respawnTime: 10,          // Секунд до авто-возрождения.
    xpLossPercent: 0.10,      // 0.10 = теряется 10% текущего XP при смерти.
                              // 0.20 = жёстче, 0.00 = без штрафа.
  },

// ───────────────────────────────────────────────────────────────────────
//  5. СТАРТОВЫЕ РЕСУРСЫ
// ───────────────────────────────────────────────────────────────────────
  startGold: 300,             // Стартовое золото при создании героя.
};

// ───────────────────────────────────────────────────────────────────────
//  6. СЛОТЫ ЭКИПИРОВКИ
// ───────────────────────────────────────────────────────────────────────
export const SLOTS = ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet'];

export const SLOT_NAMES = {
  weapon:'Оружие',  helmet:'Шлем',   armor:'Броня',  gloves:'Перчатки',
  boots:'Сапоги',   cloak:'Плащ',    ring:'Кольцо',  amulet:'Амулет',
};

// ───────────────────────────────────────────────────────────────────────
//  7. СТАТЫ — ОПИСАНИЯ ДЛЯ UI
// ───────────────────────────────────────────────────────────────────────
export const STAT_NAMES = {
  attack:'Атака', defense:'Защита', hp:'HP',
  mana:'Мана', manaRegen:'Реген маны',
  critChance:'Крит шанс', critDamage:'Крит урон', dodge:'Уворот',
  attackSpeed:'Скорость атаки', lifesteal:'Вампиризм', range:'Дальность',
  accuracy:'Точность', critResist:'Сопр. криту', armorPen:'Пробитие',
  antiHeal:'Анти-хил', berserk:'Берсерк', thorns:'Шипы', moveSpeed:'Скорость бега',
  castSpeed:'Скорость каста', castStability:'Устойчивость каста',
};

export const STAT_SUFFIX = {
  critChance:'%', critDamage:'%', dodge:'%', attackSpeed:'%', lifesteal:'%',
  accuracy:'%', critResist:'%', armorPen:'%', antiHeal:'%', berserk:'%',
  thorns:'%', moveSpeed:'%', manaRegen:'/с', castSpeed:'%', castStability:'%',
};

export const PERCENT_STATS = [
  'critChance','critDamage','dodge','attackSpeed','lifesteal',
  'accuracy','critResist','armorPen','antiHeal','berserk','thorns','moveSpeed',
];

// ───────────────────────────────────────────────────────────────────────
//  8. ГРЕЙДЫ ПРЕДМЕТОВ
// ───────────────────────────────────────────────────────────────────────
//  Грейд — «уровень качества» предмета. NG = старт, S = топ.
//  mult — множитель к BASE_STATS (см. секцию 10).
//  levelReq — минимальный уровень героя для ношения.
//  tier — порядок для телепорта и сортировки (не менять).
// ───────────────────────────────────────────────────────────────────────
export const GRADES = {
  ng: { name:'No-Grade', short:'NG', color:'#94a3b8', mult:1.0,   tier:1, levelReq: 1  },
  d:  { name:'D-Grade',  short:'D',  color:'#22c55e', mult:2.5,   tier:2, levelReq: 20  },
  c:  { name:'C-Grade',  short:'C',  color:'#3b82f6', mult:6.0,   tier:3, levelReq: 40 },
  b:  { name:'B-Grade',  short:'B',  color:'#a855f7', mult:15.0,  tier:4, levelReq: 52 },
  a:  { name:'A-Grade',  short:'A',  color:'#f59e0b', mult:40.0,  tier:5, levelReq: 62 },
  s:  { name:'S-Grade',  short:'S',  color:'#ef4444', mult:100.0, tier:6, levelReq: 75 },
};

export const GRADE_ORDER = ['ng','d','c','b','a','s'];

// ───────────────────────────────────────────────────────────────────────
//  9. ВАРИАНТЫ ЗАТОЧКИ
// ───────────────────────────────────────────────────────────────────────
//  Для каждого слота — 3–4 варианта. Вариант = «в какие статы точить».
//  Пример: weapon.speed = заточка «на скорость» → +attackSpeed, +attack.
//  Первая стата в массиве — «главная», растёт от заточки быстрее.
// ───────────────────────────────────────────────────────────────────────
export const ENHANCE_STATS = {
    shop:  0.6,   // магазинные — слабее на 40%
  drop1: 1.0,   // обычный дроп с мобов
  drop2: 1.3,   // топовый дроп с боссов
  weapon: {
    speed: ['attackSpeed','attack'],
    range: ['range','critDamage'],
    crit:  ['critChance','critDamage'],
    aoe:   ['attack','critDamage'],       // только у мага
  },
  helmet: {
    hp:    ['hp','defense'],
    def:   ['defense','hp'],
    dodge: ['dodge','hp'],
  },
  armor: {
    def:   ['defense','hp'],
    thorns:['thorns','hp'],
    hp:    ['hp','defense'],
  },
  gloves: {
    speed:   ['attackSpeed','critChance'],
    crit:    ['critChance','attackSpeed'],
    accuracy:['accuracy','critChance'],
  },
  boots: {
    dodge: ['dodge','hp'],
    hp:    ['hp','dodge'],
    speed: ['moveSpeed','dodge'],
  },
  cloak: {
    range: ['range','dodge'],
    dodge: ['dodge','range'],
    thorns:['thorns','dodge'],
  },
  ring: {
    crit:      ['critChance','attack'],
    resist:    ['critResist','hp'],
    berserk:   ['berserk','attack'],
    manaRegen: ['manaRegen','mana'],
  },
  amulet: {
    lifesteal: ['lifesteal','hp'],
    hp:        ['hp','lifesteal'],
    antiHeal:  ['antiHeal','hp'],
    mana:      ['mana','hp'],
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  ИСТОЧНИК ВАРИАНТА — откуда берётся каждый вариант экипировки
// ═══════════════════════════════════════════════════════════════════════
//
//  'shop'   — продаётся в магазине города, статы ×0.6, без бонуса +15
//  'drop1'  — падает с обычных мобов (редко), статы ×1.0, бонус +15
//  'drop2'  — падает с боссов (очень редко), статы ×1.3, бонус +15 усиленный
//
//  Порядок вариантов в ENHANCE_STATS — определяет роль:
//    первый  → shop
//    второй  → drop1
//    третий  → drop2
// ═══════════════════════════════════════════════════════════════════════
export const VARIANT_ROLE = {
  shop:  0,     // индекс в списке вариантов слота
  drop1: 1,
  drop2: 2,
};

// Множители статов по источнику
export const SOURCE_MULT = {
  shop:  0.6,   // магазинные — на 40% слабее
  drop1: 1.0,   // обычные дроп-предметы
  drop2: 1.3,   // топовые — на 30% сильнее
};
// ───────────────────────────────────────────────────────────────────────
//  10. БАЗОВЫЕ СТАТЫ ПРЕДМЕТОВ
// ───────────────────────────────────────────────────────────────────────
//  Формула: итог = BASE_STATS × GRADES[grade].mult × заточка.
//  Пример: weapon_archer_speed.attack = 10.
//    NG:  10 × 1.0   = 10
//    D:   10 × 2.5   = 25
//    S:   10 × 100.0 = 1000
// ───────────────────────────────────────────────────────────────────────
export const BASE_STATS = {
  // ─── Оружие лучника ────────────────────────────────────
  weapon_archer_speed:  { attack: 10, attackSpeed: 6 },     // + скор. атаки
  weapon_archer_range:  { attack: 12, range: 0.4, critDamage: 8 },
  weapon_archer_crit:   { attack: 11, critChance: 2, critDamage: 10 },

  // ─── Оружие мага ───────────────────────────────────────
  weapon_mage_aoe:      { attack: 18, critDamage: 12 },     // AoE-посох (больше атаки)
  weapon_mage_speed:    { attack: 14, attackSpeed: 5 },
  weapon_mage_crit:     { attack: 16, critChance: 2, critDamage: 12 },

  // ─── Шлем ──────────────────────────────────────────────
  helmet_hp:    { hp: 40, defense: 3 },
  helmet_def:   { defense: 5, hp: 20 },
  helmet_dodge: { dodge: 3, hp: 15 },

  // ─── Броня ─────────────────────────────────────────────
  armor_def:    { defense: 8, hp: 50 },
  armor_thorns: { thorns: 3, hp: 40 },                     // шипы (отражает урон)
  armor_hp:     { hp: 70, defense: 4 },                    // больше HP

  // ─── Перчатки ──────────────────────────────────────────
  gloves_speed:    { attackSpeed: 5, critChance: 1 },
  gloves_crit:     { critChance: 2, attackSpeed: 3 },
  gloves_accuracy: { accuracy: 4, critChance: 1 },

  // ─── Сапоги ────────────────────────────────────────────
  boots_dodge: { dodge: 4, hp: 15 },
  boots_hp:    { hp: 35, dodge: 2 },
  boots_speed: { moveSpeed: 4, dodge: 2 },

  // ─── Плащ ──────────────────────────────────────────────
  cloak_range: { range: 0.3, dodge: 3 },
  cloak_dodge: { dodge: 4, range: 0.2 },
  cloak_thorns:{ thorns: 3, dodge: 3 },

  // ─── Кольцо ────────────────────────────────────────────
  ring_crit:      { critChance: 2, attack: 4 },
  ring_resist:    { critResist: 3, hp: 15 },
  ring_berserk:   { berserk: 3, attack: 3 },               // + урон при HP<50%
  ring_manaRegen: { manaRegen: 1.5, mana: 20 },

  // ─── Амулет ────────────────────────────────────────────
  amulet_lifesteal: { lifesteal: 1, hp: 20 },
  amulet_hp:        { hp: 40, lifesteal: 0.5 },
  amulet_antiHeal:  { antiHeal: 3, hp: 20 },               // режет хил врага
  amulet_mana:      { mana: 30, hp: 15 },
};

// ───────────────────────────────────────────────────────────────────────
//  11. ИМЕНА И ИКОНКИ ПРЕДМЕТОВ
// ───────────────────────────────────────────────────────────────────────
//  Структура: GRADE_ITEMS[grade][<slot>_<variant>] = { name, icon }.
//  Если icon содержит точку или слэш → рисуется PNG. Иначе эмодзи.
// ───────────────────────────────────────────────────────────────────────
export const GRADE_ITEMS = {
  ng: {
    weapon_archer_speed:  { name:'Лук новичка (скорость)',   icon:'sprites/ng-bow.png' },
    weapon_archer_range:  { name:'Лук новичка (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук новичка (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох новичка (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох новичка (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох новичка (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Шлем новичка (HP)',        icon:'⛑️' },
    helmet_def:           { name:'Шлем новичка (защита)',    icon:'⛑️' },
    helmet_dodge:         { name:'Шлем новичка (уворот)',    icon:'⛑️' },
    armor_def:            { name:'Кожаная броня (защита)',   icon:'sprites/ATT_armor_apprentices_tunic_i00.png' },
    armor_thorns:         { name:'Кожаная броня (шипы)',     icon:'🥋' },
    armor_hp:             { name:'Кожаная броня (HP)',       icon:'🥋' },
    gloves_speed:         { name:'Перчатки новичка (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Перчатки новичка (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Перчатки новичка (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги новичка (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги новичка (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги новичка (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ новичка (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ новичка (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ новичка (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо новичка (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо новичка (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо новичка (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо новичка (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет новичка (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет новичка (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет новичка (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет новичка (мана)',    icon:'📿' },
  },
  d: {
    weapon_archer_speed:  { name:'Лук охотника (скорость)',   icon:'🏹' },
    weapon_archer_range:  { name:'Лук охотника (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук охотника (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох охотника (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох охотника (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох охотника (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Шлем охотника (HP)',        icon:'⛑️' },
    helmet_def:           { name:'Шлем охотника (защита)',    icon:'⛑️' },
    helmet_dodge:         { name:'Шлем охотника (уворот)',    icon:'⛑️' },
    armor_def:            { name:'Доспех охотника (защита)',  icon:'🥋' },
    armor_thorns:         { name:'Доспех охотника (шипы)',    icon:'🥋' },
    armor_hp:             { name:'Доспех охотника (HP)',      icon:'🥋' },
    gloves_speed:         { name:'Перчатки охотника (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Перчатки охотника (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Перчатки охотника (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги охотника (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги охотника (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги охотника (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ охотника (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ охотника (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ охотника (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо охотника (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо охотника (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо охотника (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо охотника (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет охотника (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет охотника (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет охотника (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет охотника (мана)',    icon:'📿' },
  },
  c: {
    weapon_archer_speed:  { name:'Лук бури (скорость)',   icon:'🏹' },
    weapon_archer_range:  { name:'Лук бури (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук бури (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох бури (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох бури (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох бури (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Шлем бури (HP)',        icon:'⛑️' },
    helmet_def:           { name:'Шлем бури (защита)',    icon:'⛑️' },
    helmet_dodge:         { name:'Шлем бури (уворот)',    icon:'⛑️' },
    armor_def:            { name:'Доспех бури (защита)',  icon:'🥋' },
    armor_thorns:         { name:'Доспех бури (шипы)',    icon:'🥋' },
    armor_hp:             { name:'Доспех бури (HP)',      icon:'🥋' },
    gloves_speed:         { name:'Перчатки бури (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Перчатки бури (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Перчатки бури (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги бури (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги бури (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги бури (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ бури (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ бури (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ бури (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо бури (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо бури (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо бури (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо бури (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет бури (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет бури (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет бури (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет бури (мана)',    icon:'📿' },
  },
  b: {
    weapon_archer_speed:  { name:'Лук демона (скорость)',   icon:'🏹' },
    weapon_archer_range:  { name:'Лук демона (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук демона (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох демона (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох демона (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох демона (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Корона демона (HP)',      icon:'👑' },
    helmet_def:           { name:'Корона демона (защита)',  icon:'👑' },
    helmet_dodge:         { name:'Корона демона (уворот)',  icon:'👑' },
    armor_def:            { name:'Доспех демона (защита)',  icon:'🥋' },
    armor_thorns:         { name:'Доспех демона (шипы)',    icon:'🥋' },
    armor_hp:             { name:'Доспех демона (HP)',      icon:'🥋' },
    gloves_speed:         { name:'Рукавицы демона (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Рукавицы демона (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Рукавицы демона (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги демона (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги демона (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги демона (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ демона (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ демона (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ демона (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо демона (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо демона (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо демона (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо демона (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет демона (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет демона (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет демона (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет демона (мана)',    icon:'📿' },
  },
  a: {
    weapon_archer_speed:  { name:'Лук дракона (скорость)',   icon:'🏹' },
    weapon_archer_range:  { name:'Лук дракона (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук дракона (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох дракона (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох дракона (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох дракона (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Шлем дракона (HP)',        icon:'⛑️' },
    helmet_def:           { name:'Шлем дракона (защита)',    icon:'⛑️' },
    helmet_dodge:         { name:'Шлем дракона (уворот)',    icon:'⛑️' },
    armor_def:            { name:'Доспех дракона (защита)',  icon:'🥋' },
    armor_thorns:         { name:'Доспех дракона (шипы)',    icon:'🥋' },
    armor_hp:             { name:'Доспех дракона (HP)',      icon:'🥋' },
    gloves_speed:         { name:'Перчатки дракона (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Перчатки дракона (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Перчатки дракона (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги дракона (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги дракона (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги дракона (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ дракона (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ дракона (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ дракона (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо дракона (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо дракона (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо дракона (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо дракона (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет дракона (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет дракона (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет дракона (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет дракона (мана)',    icon:'📿' },
  },
  s: {
    weapon_archer_speed:  { name:'Лук богов (скорость)',   icon:'🏹' },
    weapon_archer_range:  { name:'Лук богов (дальность)',  icon:'🏹' },
    weapon_archer_crit:   { name:'Лук богов (крит)',       icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох богов (AoE)',      icon:'🪄' },
    weapon_mage_speed:    { name:'Посох богов (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох богов (крит)',     icon:'🪄' },
    helmet_hp:            { name:'Венец королей (HP)',     icon:'👑' },
    helmet_def:           { name:'Венец королей (защита)', icon:'👑' },
    helmet_dodge:         { name:'Венец королей (уворот)', icon:'👑' },
    armor_def:            { name:'Броня богов (защита)',   icon:'🥋' },
    armor_thorns:         { name:'Броня богов (шипы)',     icon:'🥋' },
    armor_hp:             { name:'Броня богов (HP)',       icon:'🥋' },
    gloves_speed:         { name:'Рукавицы богов (скорость)', icon:'🧤' },
    gloves_crit:          { name:'Рукавицы богов (крит)',  icon:'🧤' },
    gloves_accuracy:      { name:'Рукавицы богов (точность)', icon:'🧤' },
    boots_dodge:          { name:'Сапоги богов (уворот)',  icon:'👢' },
    boots_hp:             { name:'Сапоги богов (HP)',      icon:'👢' },
    boots_speed:          { name:'Сапоги богов (скорость)', icon:'👢' },
    cloak_range:          { name:'Плащ богов (дальность)', icon:'🧥' },
    cloak_dodge:          { name:'Плащ богов (уворот)',    icon:'🧥' },
    cloak_thorns:         { name:'Плащ богов (шипы)',      icon:'🧥' },
    ring_crit:            { name:'Кольцо богов (крит)',    icon:'💍' },
    ring_resist:          { name:'Кольцо богов (сопр.)',   icon:'💍' },
    ring_berserk:         { name:'Кольцо богов (берсерк)', icon:'💍' },
    ring_manaRegen:       { name:'Кольцо богов (реген маны)', icon:'💍' },
    amulet_lifesteal:     { name:'Амулет богов (вампиризм)', icon:'📿' },
    amulet_hp:            { name:'Амулет богов (HP)',      icon:'📿' },
    amulet_antiHeal:      { name:'Амулет богов (анти-хил)', icon:'📿' },
    amulet_mana:          { name:'Амулет богов (мана)',    icon:'📿' },
  },
};

// ───────────────────────────────────────────────────────────────────────
//  12. ЦЕНЫ В МАГАЗИНЕ
// ───────────────────────────────────────────────────────────────────────
export const EQUIP_PRICES    = { ng:150,  d:800,    c:3500,   b:15000,  a:60000,  s:250000 };
export const SCROLL_PRICES   = { ng:60,   d:300,    c:1200,   b:5000,   a:20000,  s:80000  };
export const SOULSHOT_PRICES = { ng:10,   d:40,     c:150,    b:600,    a:2500,   s:10000  };

// Хелпер: возвращает 'weapon' или 'armor' — для свитков заточки.
export function scrollType(slot) { return slot === 'weapon' ? 'weapon' : 'armor'; }

// ───────────────────────────────────────────────────────────────────────
//  13. ЗАТОЧКА ПРЕДМЕТОВ
// ───────────────────────────────────────────────────────────────────────
export const MAX_ENHANCE = 20;      // Максимальный уровень заточки.
export const BREAK_START_LEVEL = 6; // С какого уровня возможна поломка.
                                    // Меньше → опасно точить раньше.
                                    // Больше → безопасная заточка до +N.

// Шансы заточки зависят от грейда предмета — топ-гир точить сложнее
export const ENHANCE_CHANCE_BY_GRADE = {
  ng: [1.00,1.00,1.00,1.00,0.98,0.95,0.92,0.88,0.85,0.80,0.75,0.68,0.60,0.50,0.40,0.30,0.22,0.15,0.10,0.05],
  d:  [1.00,1.00,1.00,0.98,0.95,0.92,0.88,0.85,0.80,0.75,0.68,0.60,0.50,0.42,0.34,0.26,0.18,0.12,0.08,0.04],
  c:  [1.00,1.00,0.98,0.95,0.92,0.88,0.85,0.80,0.75,0.70,0.62,0.55,0.47,0.38,0.30,0.22,0.15,0.10,0.06,0.03],
  b:  [1.00,0.98,0.95,0.92,0.88,0.85,0.80,0.75,0.70,0.63,0.56,0.48,0.40,0.32,0.25,0.18,0.12,0.08,0.05,0.02],
  a:  [1.00,0.96,0.92,0.88,0.85,0.80,0.75,0.70,0.63,0.56,0.48,0.40,0.33,0.27,0.20,0.14,0.09,0.05,0.03,0.01],
  s:  [1.00,0.95,0.90,0.85,0.80,0.75,0.70,0.63,0.56,0.48,0.40,0.33,0.25,0.18,0.12,0.08,0.05,0.03,0.01,0.005],
};

// Старый плоский массив — оставляем для совместимости (код его использует)
export const ENHANCE_CHANCE = ENHANCE_CHANCE_BY_GRADE.c;

export function getEnhanceChance(grade, level) {
  const arr = ENHANCE_CHANCE_BY_GRADE[grade] || ENHANCE_CHANCE_BY_GRADE.c;
  if (level >= arr.length) return 0;
  return arr[level];
}

// Хелпер: сломается ли предмет при провале на этом уровне.
export function willBreakAt(level) {
  return level >= BREAK_START_LEVEL && level < MAX_ENHANCE;
}

// ───────────────────────────────────────────────────────────────────────
//  14. БОНУСЫ ЗАТОЧКИ +15
// ───────────────────────────────────────────────────────────────────────
//  При достижении +15 предмет получает особое умение.
//  С +16...+20 бонус растёт линейно.
//  getValue(e) — функция от текущего уровня заточки.
// ───────────────────────────────────────────────────────────────────────
export const ENHANCE_BONUSES = {
  weapon: {
    name: 'Масс-атака', icon: '⚔',
    // +15: 3 цели, +20: 13 целей.
    getValue: (e) => e < 15 ? 0 : 3 + (e - 15) * 2,
    format: (v) => `${v} целей`,
    apply: (hero, v) => { hero.chainTargets = v; },
  },
  helmet: {
    name: 'Живучесть', icon: '❤',
    // +15: +20% HP, +20: +45% HP.
    getValue: (e) => e < 15 ? 0 : 0.20 + (e - 15) * 0.05,
    format: (v) => `+${Math.round(v*100)}% HP`,
    apply: (hero, v) => { hero.hpBonus = (hero.hpBonus || 0) + v; },
  },
  armor: {
    name: 'Шипы', icon: '🛡',
    getValue: (e) => e < 15 ? 0 : 0.15 + (e - 15) * 0.03,
    format: (v) => `${Math.round(v*100)}% отражения`,
    apply: (hero, v) => { hero.thornsPercent = (hero.thornsPercent || 0) + v; },
  },
  gloves: {
    name: 'Двойной удар', icon: '👊',
    getValue: (e) => e < 15 ? 0 : 0.15 + (e - 15) * 0.05,
    format: (v) => `${Math.round(v*100)}% шанс`,
    apply: (hero, v) => { hero.doubleStrikeChance = (hero.doubleStrikeChance || 0) + v; },
  },
  boots: {
    name: 'Рывок', icon: '💨',
    getValue: (e) => e < 15 ? 0 : 0.20 + (e - 15) * 0.05,
    format: (v) => `+${Math.round(v*100)}% скорости`,
    apply: (hero, v) => { hero.speedBonus = (hero.speedBonus || 0) + v; },
  },
  cloak: {
    name: 'Невидимость', icon: '👻',
    getValue: (e) => e < 15 ? 0 : 0.08 + (e - 15) * 0.02,
    format: (v) => `${Math.round(v*100)}% уворота`,
    apply: (hero, v) => { hero.cloakDodge = (hero.cloakDodge || 0) + v; },
  },
  ring: {
    name: 'Казнь', icon: '💀',
    // +15: +30% по HP<30%, +20: +80% по HP<30%.
    getValue: (e) => e < 15 ? 0 : 0.30 + (e - 15) * 0.10,
    format: (v) => `+${Math.round(v*100)}% по HP<30%`,
    apply: (hero, v) => { hero.executeBonus = (hero.executeBonus || 0) + v; },
  },
  amulet: {
    name: 'Кровавый пир', icon: '🩸',
    getValue: (e) => e < 15 ? 0 : 0.15 + (e - 15) * 0.03,
    format: (v) => `${Math.round(v*100)}% щита`,
    apply: (hero, v) => { hero.shieldPercent = (hero.shieldPercent || 0) + v; },
  },
};

// Хелперы для UI: по предмету вернуть его бонус +15 (если есть).
export function getBonusKey(item) { return item.slot; }

export function getEnhanceBonus(item) {
  if (!item) return null;

  // Магазинный предмет (source: 'shop') — БЕЗ бонуса +15.
  if (item.source === 'shop') return null;

  const key = getBonusKey(item);
  const def = ENHANCE_BONUSES[key];
  if (!def) return null;
  const value = def.getValue(item.enhance);
  if (value <= 0) return null;

  // drop2 — усиленный бонус (×1.5)
  const boost = item.source === 'drop2' ? 1.5 : 1.0;

  return {
    name: def.name,
    icon: def.icon,
    value: value * boost,
    display: def.format(value * boost),
    apply: def.apply,
  };
}
// ───────────────────────────────────────────────────────────────────────
//  15. ЗЕЛЬЯ HP
// ───────────────────────────────────────────────────────────────────────
//  Восстанавливают HP. В авторежиме пьются при HP < 50%.
//  Меняешь heal → меняешь силу лечения.
// ───────────────────────────────────────────────────────────────────────
export const POTIONS = {
  small:  { name:'Малое зелье HP',     icon:'🧪', heal:150,  price:50,   color:'#ef4444' },
  medium: { name:'Зелье HP',           icon:'⚗️', heal:400,  price:150,  color:'#f97316' },
  large:  { name:'Сильное зелье HP',   icon:'🍷', heal:900,  price:500,  color:'#a855f7' },
  epic:   { name:'Эпическое зелье HP', icon:'🏺', heal:2000, price:2000, color:'#fbbf24' },
};

export const POTION_ORDER = ['small','medium','large','epic'];  // порядок в UI/авто-питье
export const POTION_AUTO_HP_PERCENT = 0.5;  // авто-питьё при HP < 50%
export const POTION_COOLDOWN = 3;           // секунд между авто-зельями

// ───────────────────────────────────────────────────────────────────────
//  16. БАФФ-СВИТКИ
// ───────────────────────────────────────────────────────────────────────
//  Временные баффы на 20 минут. Тратятся при использовании из слота.
//  stat — какой стат усиливают. bonus — сила прибавки (для % статов — доля).
// ───────────────────────────────────────────────────────────────────────
export const BUFF_SCROLLS = {
  attack: {
    id:'attack', name:'Свиток ярости', icon:'🗡', color:'#ef4444',
    stat:'attack', bonus:0.20, duration:20*60, desc:'+20% атака',
  },
  crit: {
    id:'crit', name:'Свиток удачи', icon:'💥', color:'#f97316',
    stat:'critChance', bonus:15, duration:20*60, desc:'+15% крит',
  },
  speed: {
    id:'speed', name:'Свиток ветра', icon:'⚡', color:'#fde047',
    stat:'attackSpeed', bonus:0.50, duration:20*60, desc:'+50% скор. атаки',
  },
  range: {
    id:'range', name:'Свиток охоты', icon:'📏', color:'#a3e635',
    stat:'range', bonus:0.50, duration:20*60, desc:'+50% дальность',
  },
};

export const BUFF_ORDER = ['attack','crit','speed','range'];

// ───────────────────────────────────────────────────────────────────────
//  17. УРОН МОБОВ (% от максимального HP героя)
// ───────────────────────────────────────────────────────────────────────
//  Мобы бьют не фиксированными цифрами, а процентом от твоего HP.
//  Так урон остаётся «актуальным» на любом уровне.
//  easy: 1.5% HP/сек — почти безопасно.
//  hard: 5.0% HP/сек — нужно лечиться постоянно.
// ───────────────────────────────────────────────────────────────────────
export const MOB_DAMAGE_PERCENT = { easy: 0.015, medium: 0.030, hard: 0.050 };
export const BOSS_DAMAGE_PERCENT = 0.08;   // обычная атака босса — 8% HP
export const BOSS_AOE_PERCENT = 0.25;      // AoE-удар босса — 25% HP

// ═══════════════════════════════════════════════════════════════════════
//  MOBS — СТАТЫ МОБОВ + ДРОП
// ═══════════════════════════════════════════════════════════════════════
//
//  ОБЩИЕ ПОЛЯ:
//    id            — ключ (не менять, используется в сейвах и cities.js).
//    name          — имя в UI.
//    emoji         — эмодзи ИЛИ путь к PNG ('sprites/mobs/gremlin.png').
//    hp/attack/xp  — базовые статы (реальные = база × mult зоны, см. cities.js).
//    speed         — скорость бега (клеток/сек). 0.8=медленный, 2.2=быстрый.
//    size          — визуальный размер (0.7=мелкий, 1.0=крупный).
//
//  ДАЛЬНИЙ БОЙ (опционально, для рейндж-мобов):
//    attackRange      — с какого расстояния атакует. По умолчанию 0.8 (мили).
//                       5–8 = стрелок, 10+ = снайпер.
//    attackProjectile — параметры снаряда: { type, color, speed }
//                       type: 'bow' | 'staff'
//                       speed: клеток/сек (12=средний, 20=быстрый)
//    keepDistance     — true = отходит если герой подошёл вплотную.
//
//  ДРОП (drops[]):
//    Каждая запись = { id, chance, min, max }.
//      id      — ключ из loot.js (см. ITEM_REGISTRY)
//      chance  — вероятность 0..1 (0.05 = 5%)
//      min/max — сколько штук (рандом)
//
//  ЧЕМПИОН (championDrops[]):
//    Таблица для ⭐-чемпиона (×3 HP, ×3 награда). Если пусто — падает drops.
//
// ═══════════════════════════════════════════════════════════════════════


export const MOBS = {
  // ═════════════════════════════════════════════════════════════════════
  //  NG TIER — Talking Island (уровни 1-20)
  //  Easy: 4 моба  |  Medium: 4 моба  |  Hard: 4 моба
  // ═════════════════════════════════════════════════════════════════════

  // ══ EASY ═════════════════════════════════════════════════════════════
  gremlin: {
    id:'gremlin', name:'Гремлин', emoji:'sprites/mobs/gremlin.png',
    level:1, hp:40, attack:4, speed:2.2, xp:10, size:0.7,
    drops: [
      { id:'gold',             chance:1.00, min:4,  max:8  },
      { id:'potion_small',     chance:0.05, min:1,  max:1  },
      { id:'soulshot_ng',      chance:0.10, min:3,  max:8  },
      { id:'scroll_weapon_ng', chance:0.04, min:1,  max:1  },
      { id:'scroll_armor_ng',  chance:0.04, min:1,  max:1  },
      { id:'equip_random',     chance:0.003,min:1,  max:1  },
      { id:'book_multishot',   chance:0.0005,min:1, max:1  },
      { id:'book_dodge',       chance:0.0005,min:1, max:1  },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:80, max:150 },
      { id:'potion_small',     chance:0.80, min:3,  max:6   },
      { id:'soulshot_ng',      chance:1.00, min:20, max:40  },
      { id:'scroll_weapon_ng', chance:0.35, min:2,  max:5   },
      { id:'scroll_armor_ng',  chance:0.35, min:2,  max:5   },
      { id:'blessed_scroll',   chance:0.05, min:1,  max:1   },
      { id:'arena_pass',       chance:0.05, min:1,  max:1   },
      { id:'equip_random',     chance:0.05, min:1,  max:1   },
      { id:'book_multishot',   chance:0.005,min:1,  max:1   },
      { id:'book_heal',        chance:0.005,min:1,  max:1   },
    ],
  },

  keltir: {
    id:'keltir', name:'Кельтир', emoji:'🐺',
    level:4, hp:60, attack:6, speed:1.6, xp:16, size:0.6,
    drops: [
      { id:'gold',             chance:1.00, min:16, max:32  },
      { id:'potion_small',     chance:0.25, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.40, min:4,  max:10  },
      { id:'scroll_weapon_ng', chance:0.05, min:1,  max:1   },
      { id:'scroll_armor_ng',  chance:0.05, min:1,  max:1   },
      { id:'equip_random',     chance:0.003,min:1,  max:1   },
      { id:'book_fireball',    chance:0.0005,min:1, max:1   },
      { id:'book_frost',       chance:0.0005,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:120, max:200 },
      { id:'potion_small',     chance:0.80, min:3,  max:8   },
      { id:'soulshot_ng',      chance:1.00, min:25, max:50  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:6   },
      { id:'scroll_armor_ng',  chance:0.40, min:3,  max:6   },
      { id:'blessed_scroll',   chance:0.06, min:1,  max:1   },
      { id:'arena_pass',       chance:0.06, min:1,  max:1   },
      { id:'book_double_shot', chance:0.006,min:1,  max:1   },
    ],
  },

  bandit_archer: {
    id:'bandit_archer', name:'Разбойник-лучник', emoji:'🏹',
    level:5, hp:55, attack:6, speed:1.7, xp:18, size:0.65,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#fbbf24', speed:16 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:20, max:40  },
      { id:'potion_small',     chance:0.25, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.45, min:4,  max:10  },
      { id:'scroll_weapon_ng', chance:0.05, min:1,  max:1   },
      { id:'scroll_armor_ng',  chance:0.05, min:1,  max:1   },
      { id:'equip_random',     chance:0.003,min:1,  max:1   },
      { id:'book_hawk_eye',    chance:0.0005,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:150, max:250 },
      { id:'potion_small',     chance:0.80, min:3,  max:8   },
      { id:'soulshot_ng',      chance:1.00, min:25, max:50  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:6   },
      { id:'scroll_armor_ng',  chance:0.40, min:3,  max:6   },
      { id:'blessed_scroll',   chance:0.06, min:1,  max:1   },
      { id:'arena_pass',       chance:0.06, min:1,  max:1   },
      { id:'book_hawk_eye',    chance:0.006,min:1,  max:1   },
    ],
  },

  wolf_pup: {
    id:'wolf_pup', name:'Волчонок', emoji:'🐕',
    level:6, hp:70, attack:7, speed:1.8, xp:20, size:0.55,
    drops: [
      { id:'gold',             chance:1.00, min:24, max:48  },
      { id:'potion_small',     chance:0.28, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.45, min:5,  max:12  },
      { id:'scroll_weapon_ng', chance:0.05, min:1,  max:1   },
      { id:'scroll_armor_ng',  chance:0.05, min:1,  max:1   },
      { id:'book_double_shot', chance:0.0005,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:180, max:300 },
      { id:'soulshot_ng',      chance:1.00, min:30, max:55  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:7   },
      { id:'scroll_armor_ng',  chance:0.40, min:3,  max:7   },
      { id:'blessed_scroll',   chance:0.06, min:1,  max:1   },
      { id:'arena_pass',       chance:0.06, min:1,  max:1   },
    ],
  },

  // ══ MEDIUM ═══════════════════════════════════════════════════════════
  goblin_archer: {
    id:'goblin_archer', name:'Гоблин-лучник', emoji:'🏹',
    level:7, hp:65, attack:7, speed:1.6, xp:22, size:0.65,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#4ade80', speed:16 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:24, max:48  },
      { id:'potion_small',     chance:0.28, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.45, min:5,  max:12  },
      { id:'scroll_weapon_ng', chance:0.05, min:1,  max:1   },
      { id:'scroll_weapon_d',  chance:0.03, min:1,  max:1   },
      { id:'equip_random',     chance:0.004,min:1,  max:1   },
      { id:'equip_d',          chance:0.0005,min:1, max:1   },
      { id:'book_precise_shot',chance:0.0008,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:180, max:300 },
      { id:'potion_small',     chance:0.80, min:4,  max:10  },
      { id:'soulshot_ng',      chance:1.00, min:30, max:60  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:7   },
      { id:'scroll_weapon_d',  chance:0.08, min:1,  max:3   },
      { id:'blessed_scroll',   chance:0.06, min:1,  max:1   },
      { id:'arena_pass',       chance:0.06, min:1,  max:1   },
      { id:'book_precise_shot',chance:0.008,min:1,  max:1   },
    ],
  },

  goblin_mage: {
    id:'goblin_mage', name:'Гоблин-маг', emoji:'🔮',
    level:8, hp:70, attack:8, speed:1.0, xp:24, size:0.7,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#c084fc', speed:11 },
    drops: [
      { id:'gold',             chance:1.00, min:28, max:56  },
      { id:'potion_small',     chance:0.30, min:1,  max:2   },
      { id:'potion_medium',    chance:0.05, min:1,  max:1   },
      { id:'soulshot_ng',      chance:0.45, min:5,  max:12  },
      { id:'scroll_weapon_ng', chance:0.05, min:1,  max:1   },
      { id:'scroll_weapon_d',  chance:0.03, min:1,  max:1   },
      { id:'equip_random',     chance:0.004,min:1,  max:1   },
      { id:'book_ice_bolt',    chance:0.0008,min:1, max:1   },
      { id:'book_focus',       chance:0.0008,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:200, max:340 },
      { id:'potion_small',     chance:0.80, min:4,  max:10  },
      { id:'potion_medium',    chance:0.20, min:1,  max:3   },
      { id:'soulshot_ng',      chance:1.00, min:30, max:60  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:7   },
      { id:'scroll_weapon_d',  chance:0.08, min:1,  max:3   },
      { id:'blessed_scroll',   chance:0.06, min:1,  max:1   },
      { id:'arena_pass',       chance:0.06, min:1,  max:1   },
      { id:'book_ice_bolt',    chance:0.008,min:1,  max:1   },
    ],
  },

  goblin_warrior: {
    id:'goblin_warrior', name:'Гоблин-воин', emoji:'👹',
    level:9, hp:100, attack:10, speed:1.3, xp:26, size:0.65,
    drops: [
      { id:'gold',             chance:1.00, min:32, max:64  },
      { id:'potion_small',     chance:0.30, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.45, min:6,  max:14  },
      { id:'scroll_weapon_ng', chance:0.06, min:1,  max:1   },
      { id:'scroll_weapon_d',  chance:0.03, min:1,  max:1   },
      { id:'equip_random',     chance:0.004,min:1,  max:1   },
      { id:'book_haste',       chance:0.0008,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:220, max:380 },
      { id:'soulshot_ng',      chance:1.00, min:32, max:65  },
      { id:'scroll_weapon_ng', chance:0.40, min:3,  max:8   },
      { id:'scroll_weapon_d',  chance:0.10, min:1,  max:3   },
      { id:'blessed_scroll',   chance:0.07, min:1,  max:1   },
      { id:'arena_pass',       chance:0.07, min:1,  max:1   },
      { id:'book_haste',       chance:0.008,min:1,  max:1   },
    ],
  },

  direwolf: {
    id:'direwolf', name:'Дикий волк', emoji:'🐺',
    level:10, hp:120, attack:11, speed:1.8, xp:30, size:0.7,
    drops: [
      { id:'gold',             chance:1.00, min:36, max:72  },
      { id:'potion_small',     chance:0.30, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.45, min:6,  max:14  },
      { id:'scroll_weapon_ng', chance:0.06, min:1,  max:1   },
      { id:'scroll_weapon_d',  chance:0.04, min:1,  max:1   },
      { id:'scroll_armor_d',   chance:0.04, min:1,  max:1   },
      { id:'equip_random',     chance:0.005,min:1,  max:1   },
      { id:'equip_d',          chance:0.0008,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:240, max:400 },
      { id:'potion_small',     chance:0.80, min:5,  max:10  },
      { id:'soulshot_ng',      chance:1.00, min:35, max:70  },
      { id:'scroll_weapon_d',  chance:0.10, min:2,  max:4   },
      { id:'scroll_armor_d',   chance:0.10, min:2,  max:4   },
      { id:'blessed_scroll',   chance:0.08, min:1,  max:1   },
      { id:'arena_pass',       chance:0.08, min:1,  max:1   },
      { id:'equip_d',          chance:0.05, min:1,  max:1   },
    ],
  },

  // ══ HARD ═════════════════════════════════════════════════════════════
  werewolf: {
    id:'werewolf', name:'Оборотень', emoji:'🐺',
    level:12, hp:200, attack:14, speed:1.5, xp:44, size:0.7,
    drops: [
      { id:'gold',             chance:1.00, min:48, max:96  },
      { id:'potion_small',     chance:0.32, min:1,  max:2   },
      { id:'potion_medium',    chance:0.06, min:1,  max:1   },
      { id:'soulshot_ng',      chance:0.50, min:8,  max:16  },
      { id:'scroll_weapon_ng', chance:0.06, min:1,  max:1   },
      { id:'scroll_weapon_d',  chance:0.06, min:1,  max:1   },
      { id:'scroll_armor_d',   chance:0.06, min:1,  max:1   },
      { id:'equip_random',     chance:0.006,min:1,  max:1   },
      { id:'equip_d',          chance:0.002,min:1,  max:1   },
      { id:'book_slow_arrow',  chance:0.0015,min:1, max:1   },
      { id:'book_poison_arrow',chance:0.0015,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:400, max:700 },
      { id:'potion_small',     chance:0.80, min:5,  max:12  },
      { id:'potion_medium',    chance:0.30, min:2,  max:5   },
      { id:'soulshot_ng',      chance:1.00, min:40, max:80  },
      { id:'scroll_weapon_d',  chance:0.15, min:2,  max:5   },
      { id:'scroll_armor_d',   chance:0.15, min:2,  max:5   },
      { id:'blessed_scroll',   chance:0.10, min:1,  max:1   },
      { id:'arena_pass',       chance:0.10, min:1,  max:1   },
      { id:'equip_d',          chance:0.08, min:1,  max:1   },
      { id:'book_stun_shot',   chance:0.015,min:1,  max:1   },
    ],
  },

  forest_spider: {
    id:'forest_spider', name:'Лесной паук', emoji:'🕷️',
    level:14, hp:240, attack:16, speed:1.4, xp:52, size:0.65,
    drops: [
      { id:'gold',             chance:1.00, min:56, max:112 },
      { id:'potion_small',     chance:0.32, min:1,  max:3   },
      { id:'potion_medium',    chance:0.08, min:1,  max:1   },
      { id:'soulshot_ng',      chance:0.50, min:8,  max:18  },
      { id:'scroll_weapon_d',  chance:0.07, min:1,  max:1   },
      { id:'scroll_armor_d',   chance:0.07, min:1,  max:1   },
      { id:'equip_random',     chance:0.007,min:1,  max:1   },
      { id:'equip_d',          chance:0.002,min:1,  max:1   },
      { id:'book_cleanse',     chance:0.0015,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:500, max:850 },
      { id:'potion_small',     chance:0.80, min:5,  max:12  },
      { id:'potion_medium',    chance:0.30, min:2,  max:5   },
      { id:'soulshot_ng',      chance:1.00, min:40, max:80  },
      { id:'scroll_weapon_d',  chance:0.18, min:2,  max:5   },
      { id:'scroll_armor_d',   chance:0.18, min:2,  max:5   },
      { id:'blessed_scroll',   chance:0.10, min:1,  max:1   },
      { id:'arena_pass',       chance:0.10, min:1,  max:1   },
      { id:'equip_d',          chance:0.10, min:1,  max:1   },
    ],
  },

  cave_bat: {
    id:'cave_bat', name:'Пещерная мышь', emoji:'🦇',
    level:16, hp:280, attack:18, speed:2.0, xp:60, size:0.6,
    drops: [
      { id:'gold',             chance:1.00, min:64, max:128 },
      { id:'potion_small',     chance:0.32, min:1,  max:3   },
      { id:'potion_medium',    chance:0.10, min:1,  max:2   },
      { id:'soulshot_ng',      chance:0.55, min:10, max:20  },
      { id:'scroll_weapon_d',  chance:0.08, min:1,  max:1   },
      { id:'scroll_armor_d',   chance:0.08, min:1,  max:1   },
      { id:'equip_random',     chance:0.008,min:1,  max:1   },
      { id:'equip_d',          chance:0.003,min:1,  max:1   },
      { id:'book_stun',        chance:0.0015,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:600, max:1000 },
      { id:'potion_small',     chance:0.80, min:6,  max:14   },
      { id:'potion_medium',    chance:0.35, min:2,  max:6    },
      { id:'soulshot_ng',      chance:1.00, min:45, max:90   },
      { id:'scroll_weapon_d',  chance:0.20, min:3,  max:6    },
      { id:'scroll_armor_d',   chance:0.20, min:3,  max:6    },
      { id:'blessed_scroll',   chance:0.12, min:1,  max:2    },
      { id:'arena_pass',       chance:0.12, min:1,  max:1    },
      { id:'equip_d',          chance:0.12, min:1,  max:1    },
    ],
  },

  stone_golem: {
    id:'stone_golem', name:'Каменный голем', emoji:'🗿',
    level:18, hp:500, attack:26, speed:0.6, xp:90, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:80, max:160 },
      { id:'potion_medium',    chance:0.30, min:1,  max:2   },
      { id:'potion_large',     chance:0.05, min:1,  max:1   },
      { id:'soulshot_ng',      chance:0.60, min:12, max:25  },
      { id:'scroll_weapon_d',  chance:0.10, min:1,  max:1   },
      { id:'scroll_armor_d',   chance:0.10, min:1,  max:1   },
      { id:'equip_d',          chance:0.004,min:1,  max:1   },
      { id:'book_iron_skin',   chance:0.0018,min:1, max:1   },
      { id:'book_reflect',     chance:0.0018,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:1000, max:1800 },
      { id:'potion_medium',    chance:0.80, min:5,   max:12   },
      { id:'potion_large',     chance:0.30, min:2,   max:5    },
      { id:'soulshot_ng',      chance:1.00, min:60,  max:120  },
      { id:'scroll_weapon_d',  chance:0.25, min:4,   max:8    },
      { id:'scroll_armor_d',   chance:0.25, min:4,   max:8    },
      { id:'blessed_scroll',   chance:0.15, min:1,   max:2    },
      { id:'arena_pass',       chance:0.15, min:1,   max:1    },
      { id:'equip_d',          chance:0.20, min:1,   max:1    },
      { id:'book_iron_skin',   chance:0.020,min:1,   max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  D TIER — Giran (уровни 20-32)
  // ═════════════════════════════════════════════════════════════════════

  // ══ EASY ═════════════════════════════════════════════════════════════
  orc: {
    id:'orc', name:'Орк', emoji:'👺',
    level:22, hp:260, attack:22, speed:1.0, xp:110, size:0.65,
    drops: [
      { id:'gold',             chance:1.00, min:110, max:220 },
      { id:'potion_medium',    chance:0.30, min:1,   max:2   },
      { id:'potion_large',     chance:0.05, min:1,   max:1   },
      { id:'soulshot_d',       chance:0.45, min:8,   max:18  },
      { id:'scroll_weapon_d',  chance:0.06, min:1,   max:1   },
      { id:'scroll_armor_d',   chance:0.06, min:1,   max:1   },
      { id:'equip_d',          chance:0.004,min:1,   max:1   },
      { id:'book_power_shot',  chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:1400, max:2400 },
      { id:'potion_medium',    chance:0.80, min:5,   max:12   },
      { id:'soulshot_d',       chance:1.00, min:50,  max:100  },
      { id:'scroll_weapon_d',  chance:0.30, min:4,   max:9    },
      { id:'scroll_armor_d',   chance:0.30, min:4,   max:9    },
      { id:'blessed_scroll',   chance:0.12, min:1,   max:1    },
      { id:'arena_pass',       chance:0.12, min:1,   max:1    },
      { id:'equip_d',          chance:0.15, min:1,   max:1    },
      { id:'book_power_shot',  chance:0.015,min:1,   max:1    },
    ],
  },

  orc_archer: {
    id:'orc_archer', name:'Орк-лучник', emoji:'🏹',
    level:23, hp:220, attack:24, speed:1.3, xp:115, size:0.65,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#dc2626', speed:18 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:120, max:240 },
      { id:'potion_medium',    chance:0.30, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.45, min:8,   max:18  },
      { id:'scroll_weapon_d',  chance:0.06, min:1,   max:1   },
      { id:'scroll_armor_d',   chance:0.06, min:1,   max:1   },
      { id:'equip_d',          chance:0.004,min:1,   max:1   },
      { id:'book_lethal_shot', chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:1500, max:2600 },
      { id:'soulshot_d',       chance:1.00, min:55,  max:110  },
      { id:'scroll_weapon_d',  chance:0.30, min:4,   max:9    },
      { id:'scroll_armor_d',   chance:0.30, min:4,   max:9    },
      { id:'blessed_scroll',   chance:0.12, min:1,   max:1    },
      { id:'arena_pass',       chance:0.12, min:1,   max:1    },
      { id:'book_lethal_shot', chance:0.015,min:1,   max:1    },
    ],
  },

  skeleton: {
    id:'skeleton', name:'Скелет', emoji:'💀',
    level:24, hp:240, attack:26, speed:1.2, xp:120, size:0.6,
    drops: [
      { id:'gold',             chance:1.00, min:130, max:260 },
      { id:'potion_medium',    chance:0.30, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.45, min:8,   max:18  },
      { id:'scroll_weapon_d',  chance:0.06, min:1,   max:1   },
      { id:'scroll_armor_d',   chance:0.06, min:1,   max:1   },
      { id:'equip_d',          chance:0.005,min:1,   max:1   },
      { id:'book_reflect',     chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:1600, max:2700 },
      { id:'soulshot_d',       chance:1.00, min:55,  max:110  },
      { id:'scroll_weapon_d',  chance:0.32, min:4,   max:10   },
      { id:'scroll_armor_d',   chance:0.32, min:4,   max:10   },
      { id:'blessed_scroll',   chance:0.13, min:1,   max:1    },
      { id:'arena_pass',       chance:0.13, min:1,   max:1    },
      { id:'equip_d',          chance:0.15, min:1,   max:1    },
    ],
  },

  // ══ MEDIUM ═══════════════════════════════════════════════════════════
  skeleton_archer: {
    id:'skeleton_archer', name:'Скелет-лучник', emoji:'💀',
    level:26, hp:210, attack:28, speed:1.4, xp:135, size:0.6,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#a5f3fc', speed:18 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:150, max:300 },
      { id:'potion_medium',    chance:0.32, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.50, min:10,  max:22  },
      { id:'scroll_weapon_d',  chance:0.07, min:1,   max:1   },
      { id:'scroll_weapon_c',  chance:0.03, min:1,   max:1   },
      { id:'equip_d',          chance:0.005,min:1,   max:1   },
      { id:'equip_c',          chance:0.0005,min:1,  max:1   },
      { id:'book_vampiric',    chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:1900, max:3200 },
      { id:'soulshot_d',       chance:1.00, min:60,  max:120  },
      { id:'scroll_weapon_d',  chance:0.35, min:5,   max:10   },
      { id:'scroll_weapon_c',  chance:0.10, min:1,   max:3    },
      { id:'blessed_scroll',   chance:0.13, min:1,   max:1    },
      { id:'arena_pass',       chance:0.13, min:1,   max:1    },
      { id:'book_vampiric',    chance:0.015,min:1,   max:1    },
    ],
  },

  orc_shaman: {
    id:'orc_shaman', name:'Орк-шаман', emoji:'🧙',
    level:27, hp:230, attack:30, speed:1.0, xp:140, size:0.7,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#22c55e', speed:12 },
    drops: [
      { id:'gold',             chance:1.00, min:160, max:320 },
      { id:'potion_medium',    chance:0.32, min:1,   max:2   },
      { id:'potion_large',     chance:0.05, min:1,   max:1   },
      { id:'soulshot_d',       chance:0.50, min:10,  max:22  },
      { id:'scroll_weapon_d',  chance:0.07, min:1,   max:1   },
      { id:'scroll_weapon_c',  chance:0.03, min:1,   max:1   },
      { id:'equip_d',          chance:0.005,min:1,   max:1   },
      { id:'book_panther',     chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:2000, max:3400 },
      { id:'potion_medium',    chance:0.80, min:5,   max:12   },
      { id:'soulshot_d',       chance:1.00, min:60,  max:120  },
      { id:'scroll_weapon_d',  chance:0.35, min:5,   max:10   },
      { id:'scroll_weapon_c',  chance:0.10, min:1,   max:3    },
      { id:'blessed_scroll',   chance:0.14, min:1,   max:2    },
      { id:'arena_pass',       chance:0.14, min:1,   max:1    },
      { id:'book_panther',     chance:0.015,min:1,   max:1    },
    ],
  },

  spider: {
    id:'spider', name:'Гигантский паук', emoji:'🕷️',
    level:28, hp:300, attack:32, speed:1.5, xp:150, size:0.65,
    drops: [
      { id:'gold',             chance:1.00, min:170, max:340 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.05, min:1,   max:1   },
      { id:'soulshot_d',       chance:0.50, min:10,  max:22  },
      { id:'scroll_weapon_d',  chance:0.08, min:1,   max:1   },
      { id:'scroll_weapon_c',  chance:0.04, min:1,   max:1   },
      { id:'scroll_armor_c',   chance:0.04, min:1,   max:1   },
      { id:'equip_d',          chance:0.006,min:1,   max:1   },
      { id:'book_stun',        chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:2200, max:3800 },
      { id:'potion_medium',    chance:0.80, min:6,   max:14   },
      { id:'soulshot_d',       chance:1.00, min:65,  max:130  },
      { id:'scroll_weapon_d',  chance:0.38, min:5,   max:11   },
      { id:'scroll_weapon_c',  chance:0.12, min:1,   max:3    },
      { id:'blessed_scroll',   chance:0.14, min:1,   max:2    },
      { id:'arena_pass',       chance:0.14, min:1,   max:1    },
      { id:'equip_d',          chance:0.18, min:1,   max:1    },
    ],
  },

  // ══ HARD ═════════════════════════════════════════════════════════════
  werewolf_alpha: {
    id:'werewolf_alpha', name:'Альфа-оборотень', emoji:'🐺',
    level:30, hp:600, attack:42, speed:1.7, xp:220, size:0.8,
    drops: [
      { id:'gold',             chance:1.00, min:240, max:480 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.08, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_d',  chance:0.10, min:1,   max:2   },
      { id:'scroll_weapon_c',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_c',   chance:0.08, min:1,   max:1   },
      { id:'equip_d',          chance:0.008,min:1,   max:1   },
      { id:'equip_c',          chance:0.002,min:1,   max:1   },
      { id:'book_arrow_rain',  chance:0.0018,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:3000, max:5000 },
      { id:'potion_medium',    chance:0.80, min:6,   max:14   },
      { id:'soulshot_d',       chance:1.00, min:70,  max:140  },
      { id:'scroll_weapon_d',  chance:0.40, min:6,   max:12   },
      { id:'scroll_weapon_c',  chance:0.18, min:2,   max:5    },
      { id:'scroll_armor_c',   chance:0.18, min:2,   max:5    },
      { id:'blessed_scroll',   chance:0.15, min:2,   max:3    },
      { id:'arena_pass',       chance:0.15, min:1,   max:2    },
      { id:'equip_c',          chance:0.10, min:1,   max:1    },
      { id:'book_arrow_rain',  chance:0.020,min:1,   max:1    },
    ],
  },

  skeleton_lord: {
    id:'skeleton_lord', name:'Скелет-лорд', emoji:'☠️',
    level:31, hp:750, attack:46, speed:1.0, xp:240, size:0.75,
    drops: [
      { id:'gold',             chance:1.00, min:260, max:520 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.08, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_d',  chance:0.10, min:1,   max:2   },
      { id:'scroll_weapon_c',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_c',   chance:0.08, min:1,   max:1   },
      { id:'equip_d',          chance:0.008,min:1,   max:1   },
      { id:'book_silence',     chance:0.0018,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:3200, max:5500 },
      { id:'potion_medium',    chance:0.80, min:6,   max:14   },
      { id:'soulshot_d',       chance:1.00, min:75,  max:150  },
      { id:'scroll_weapon_d',  chance:0.42, min:6,   max:13   },
      { id:'scroll_weapon_c',  chance:0.20, min:2,   max:5    },
      { id:'scroll_armor_c',   chance:0.20, min:2,   max:5    },
      { id:'blessed_scroll',   chance:0.16, min:2,   max:3    },
      { id:'arena_pass',       chance:0.16, min:1,   max:2    },
      { id:'equip_c',          chance:0.12, min:1,   max:1    },
      { id:'book_silence',     chance:0.020,min:1,   max:1    },
    ],
  },

  gargoyle: {
    id:'gargoyle', name:'Гаргулья', emoji:'🦇',
    level:32, hp:900, attack:48, speed:1.3, xp:270, size:0.8,
    drops: [
      { id:'gold',             chance:1.00, min:280, max:560 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.10, min:1,   max:2   },
      { id:'soulshot_d',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_d',  chance:0.12, min:1,   max:2   },
      { id:'scroll_weapon_c',  chance:0.10, min:1,   max:2   },
      { id:'scroll_armor_c',   chance:0.10, min:1,   max:2   },
      { id:'equip_d',          chance:0.010,min:1,   max:1   },
      { id:'equip_c',          chance:0.003,min:1,   max:1   },
      { id:'book_lightning',   chance:0.0020,min:1,  max:1   },
      { id:'book_summon_shadow',chance:0.0010,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:3600, max:6000 },
      { id:'potion_medium',    chance:0.80, min:7,   max:15   },
      { id:'soulshot_d',       chance:1.00, min:80,  max:160  },
      { id:'scroll_weapon_d',  chance:0.45, min:6,   max:14   },
      { id:'scroll_weapon_c',  chance:0.22, min:3,   max:6    },
      { id:'scroll_armor_c',   chance:0.22, min:3,   max:6    },
      { id:'blessed_scroll',   chance:0.18, min:2,   max:4    },
      { id:'arena_pass',       chance:0.18, min:1,   max:2    },
      { id:'equip_c',          chance:0.15, min:1,   max:1    },
      { id:'book_summon_shadow',chance:0.015,min:1,  max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  C TIER — Dion (уровни 32-45)
  // ═════════════════════════════════════════════════════════════════════

  warg: {
    id:'warg', name:'Варг', emoji:'🐕',
    level:34, hp:1000, attack:55, speed:1.6, xp:300, size:0.7,
    drops: [
      { id:'gold',             chance:1.00, min:340, max:680 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.10, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_c',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_c',   chance:0.08, min:1,   max:1   },
      { id:'equip_c',          chance:0.006,min:1,   max:1   },
      { id:'book_sleep',       chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:4500, max:7500 },
      { id:'soulshot_c',       chance:1.00, min:80,  max:160  },
      { id:'scroll_weapon_c',  chance:0.40, min:6,   max:12   },
      { id:'scroll_armor_c',   chance:0.40, min:6,   max:12   },
      { id:'blessed_scroll',   chance:0.18, min:2,   max:3    },
      { id:'arena_pass',       chance:0.18, min:1,   max:2    },
      { id:'equip_c',          chance:0.20, min:1,   max:1    },
    ],
  },

  banshee: {
    id:'banshee', name:'Банши', emoji:'👻',
    level:35, hp:900, attack:58, speed:1.2, xp:310, size:0.7,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#a5f3fc', speed:12 },
    drops: [
      { id:'gold',             chance:1.00, min:360, max:720 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.10, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_c',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_c',   chance:0.08, min:1,   max:1   },
      { id:'equip_c',          chance:0.006,min:1,   max:1   },
      { id:'book_arcane_shield',chance:0.0012,min:1, max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:4800, max:8000 },
      { id:'soulshot_c',       chance:1.00, min:85,  max:170  },
      { id:'scroll_weapon_c',  chance:0.42, min:6,   max:13   },
      { id:'scroll_armor_c',   chance:0.42, min:6,   max:13   },
      { id:'blessed_scroll',   chance:0.20, min:2,   max:4    },
      { id:'arena_pass',       chance:0.18, min:1,   max:2    },
      { id:'book_arcane_shield',chance:0.015,min:1,  max:1    },
    ],
  },

  ghost: {
    id:'ghost', name:'Призрак', emoji:'👻',
    level:37, hp:1100, attack:64, speed:1.3, xp:340, size:0.65,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#c084fc', speed:12 },
    drops: [
      { id:'gold',             chance:1.00, min:400, max:800 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.10, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_c',  chance:0.10, min:1,   max:1   },
      { id:'scroll_weapon_b',  chance:0.03, min:1,   max:1   },
      { id:'equip_c',          chance:0.006,min:1,   max:1   },
      { id:'book_shadow',      chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:5200, max:8800 },
      { id:'soulshot_c',       chance:1.00, min:90,  max:180  },
      { id:'scroll_weapon_c',  chance:0.42, min:6,   max:13   },
      { id:'scroll_weapon_b',  chance:0.10, min:1,   max:3    },
      { id:'blessed_scroll',   chance:0.20, min:2,   max:4    },
      { id:'arena_pass',       chance:0.20, min:1,   max:2    },
      { id:'book_shadow',      chance:0.015,min:1,   max:1    },
    ],
  },

  troll: {
    id:'troll', name:'Тролль', emoji:'🧌',
    level:38, hp:1400, attack:68, speed:0.9, xp:360, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:420, max:840 },
      { id:'potion_medium',    chance:0.35, min:1,   max:3   },
      { id:'potion_large',     chance:0.12, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.55, min:12,  max:26  },
      { id:'scroll_weapon_c',  chance:0.10, min:1,   max:1   },
      { id:'scroll_weapon_b',  chance:0.03, min:1,   max:1   },
      { id:'equip_c',          chance:0.008,min:1,   max:1   },
      { id:'equip_b',          chance:0.0005,min:1,  max:1   },
      { id:'book_sleep',       chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:5600, max:9500 },
      { id:'soulshot_c',       chance:1.00, min:90,  max:180  },
      { id:'scroll_weapon_c',  chance:0.45, min:7,   max:14   },
      { id:'scroll_weapon_b',  chance:0.12, min:1,   max:3    },
      { id:'blessed_scroll',   chance:0.22, min:2,   max:4    },
      { id:'arena_pass',       chance:0.20, min:1,   max:2    },
      { id:'equip_c',          chance:0.20, min:1,   max:1    },
    ],
  },

  wraith: {
    id:'wraith', name:'Тень смерти', emoji:'☠️',
    level:41, hp:1800, attack:80, speed:1.3, xp:440, size:0.75,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#7f1d1d', speed:13 },
    drops: [
      { id:'gold',             chance:1.00, min:500, max:1000 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.60, min:15,  max:30  },
      { id:'scroll_weapon_c',  chance:0.12, min:1,   max:2   },
      { id:'scroll_weapon_b',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_b',   chance:0.08, min:1,   max:1   },
      { id:'equip_c',          chance:0.010,min:1,   max:1   },
      { id:'equip_b',          chance:0.002,min:1,   max:1   },
      { id:'book_chain_lightning',chance:0.0018,min:1, max:1 },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:7500, max:12000 },
      { id:'soulshot_c',       chance:1.00, min:100, max:200   },
      { id:'scroll_weapon_c',  chance:0.48, min:8,   max:16    },
      { id:'scroll_weapon_b',  chance:0.20, min:3,   max:6     },
      { id:'scroll_armor_b',   chance:0.20, min:3,   max:6     },
      { id:'blessed_scroll',   chance:0.25, min:3,   max:5     },
      { id:'arena_pass',       chance:0.22, min:1,   max:2     },
      { id:'equip_b',          chance:0.15, min:1,   max:1     },
      { id:'book_chain_lightning',chance:0.020,min:1, max:1    },
    ],
  },

  treant: {
    id:'treant', name:'Древень', emoji:'🌳',
    level:43, hp:2200, attack:88, speed:0.7, xp:480, size:0.9,
    drops: [
      { id:'gold',             chance:1.00, min:550, max:1100 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.60, min:15,  max:30  },
      { id:'scroll_weapon_c',  chance:0.12, min:1,   max:2   },
      { id:'scroll_weapon_b',  chance:0.08, min:1,   max:1   },
      { id:'scroll_armor_b',   chance:0.08, min:1,   max:1   },
      { id:'equip_c',          chance:0.012,min:1,   max:1   },
      { id:'equip_b',          chance:0.002,min:1,   max:1   },
      { id:'book_last_stand',  chance:0.0015,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:8500, max:14000 },
      { id:'soulshot_c',       chance:1.00, min:100, max:200   },
      { id:'scroll_weapon_c',  chance:0.50, min:8,   max:18    },
      { id:'scroll_weapon_b',  chance:0.22, min:3,   max:7     },
      { id:'scroll_armor_b',   chance:0.22, min:3,   max:7     },
      { id:'blessed_scroll',   chance:0.25, min:3,   max:6     },
      { id:'arena_pass',       chance:0.22, min:1,   max:2     },
      { id:'equip_b',          chance:0.18, min:1,   max:1     },
      { id:'book_last_stand',  chance:0.018,min:1,   max:1     },
    ],
  },

  nightshade: {
    id:'nightshade', name:'Ночная тень', emoji:'🥷',
    level:44, hp:1500, attack:98, speed:1.8, xp:520, size:0.7,
    drops: [
      { id:'gold',             chance:1.00, min:600, max:1200 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_c',       chance:0.60, min:15,  max:30  },
      { id:'scroll_weapon_c',  chance:0.15, min:1,   max:2   },
      { id:'scroll_weapon_b',  chance:0.10, min:1,   max:1   },
      { id:'scroll_armor_b',   chance:0.10, min:1,   max:1   },
      { id:'equip_c',          chance:0.012,min:1,   max:1   },
      { id:'equip_b',          chance:0.003,min:1,   max:1   },
      { id:'book_berserk',     chance:0.0018,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:9500, max:16000 },
      { id:'soulshot_c',       chance:1.00, min:110, max:220   },
      { id:'scroll_weapon_c',  chance:0.50, min:9,   max:20    },
      { id:'scroll_weapon_b',  chance:0.25, min:3,   max:8     },
      { id:'scroll_armor_b',   chance:0.25, min:3,   max:8     },
      { id:'blessed_scroll',   chance:0.28, min:3,   max:6     },
      { id:'arena_pass',       chance:0.24, min:1,   max:2     },
      { id:'equip_b',          chance:0.20, min:1,   max:1     },
      { id:'book_berserk',     chance:0.020,min:1,   max:1     },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  B TIER — Oren (уровни 45-58)
  // ═════════════════════════════════════════════════════════════════════

  golem: {
    id:'golem', name:'Железный голем', emoji:'🗿',
    level:47, hp:3000, attack:110, speed:0.8, xp:700, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:700, max:1400 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_b',       chance:0.55, min:15,  max:32  },
      { id:'scroll_weapon_b',  chance:0.10, min:1,   max:1   },
      { id:'scroll_armor_b',   chance:0.10, min:1,   max:1   },
      { id:'equip_b',          chance:0.008,min:1,   max:1   },
      { id:'book_frost_nova',  chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:12000, max:20000 },
      { id:'soulshot_b',       chance:1.00, min:100, max:200    },
      { id:'scroll_weapon_b',  chance:0.45, min:8,   max:16     },
      { id:'scroll_armor_b',   chance:0.45, min:8,   max:16     },
      { id:'blessed_scroll',   chance:0.25, min:3,   max:6      },
      { id:'arena_pass',       chance:0.22, min:1,   max:2      },
      { id:'equip_b',          chance:0.20, min:1,   max:1      },
      { id:'book_frost_nova',  chance:0.018,min:1,   max:1      },
    ],
  },

  harpy: {
    id:'harpy', name:'Гарпия', emoji:'🦅',
    level:48, hp:2200, attack:118, speed:1.9, xp:730, size:0.75,
    attackRange: 6,
    attackProjectile: { type:'bow', color:'#fbbf24', speed:20 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:720, max:1440 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_b',       chance:0.55, min:15,  max:32  },
      { id:'scroll_weapon_b',  chance:0.10, min:1,   max:1   },
      { id:'scroll_armor_b',   chance:0.10, min:1,   max:1   },
      { id:'equip_b',          chance:0.008,min:1,   max:1   },
      { id:'book_frost_nova',  chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:13000, max:22000 },
      { id:'soulshot_b',       chance:1.00, min:105, max:210    },
      { id:'scroll_weapon_b',  chance:0.45, min:8,   max:17     },
      { id:'scroll_armor_b',   chance:0.45, min:8,   max:17     },
      { id:'blessed_scroll',   chance:0.25, min:3,   max:6      },
      { id:'arena_pass',       chance:0.22, min:1,   max:2      },
      { id:'equip_b',          chance:0.20, min:1,   max:1      },
    ],
  },

  demon: {
    id:'demon', name:'Демон', emoji:'😈',
    level:50, hp:3500, attack:130, speed:1.4, xp:800, size:0.75,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#dc2626', speed:14 },
    drops: [
      { id:'gold',             chance:1.00, min:800, max:1600 },
      { id:'potion_large',     chance:0.30, min:1,   max:2   },
      { id:'soulshot_b',       chance:0.55, min:15,  max:32  },
      { id:'scroll_weapon_b',  chance:0.12, min:1,   max:2   },
      { id:'scroll_weapon_a',  chance:0.03, min:1,   max:1   },
      { id:'equip_b',          chance:0.008,min:1,   max:1   },
      { id:'book_berserk',     chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:15000, max:25000 },
      { id:'soulshot_b',       chance:1.00, min:110, max:220    },
      { id:'scroll_weapon_b',  chance:0.48, min:9,   max:18     },
      { id:'scroll_weapon_a',  chance:0.10, min:1,   max:3      },
      { id:'blessed_scroll',   chance:0.28, min:3,   max:6      },
      { id:'arena_pass',       chance:0.24, min:1,   max:2      },
      { id:'book_berserk',     chance:0.018,min:1,   max:1      },
    ],
  },

  medusa: {
    id:'medusa', name:'Медуза', emoji:'🐍',
    level:52, hp:4000, attack:140, speed:1.2, xp:880, size:0.8,
    attackRange: 7,
    attackProjectile: { type:'staff', color:'#a855f7', speed:15 },
    drops: [
      { id:'gold',             chance:1.00, min:880, max:1760 },
      { id:'potion_large',     chance:0.32, min:1,   max:2   },
      { id:'soulshot_b',       chance:0.55, min:15,  max:32  },
      { id:'scroll_weapon_b',  chance:0.12, min:1,   max:2   },
      { id:'scroll_weapon_a',  chance:0.03, min:1,   max:1   },
      { id:'equip_b',          chance:0.010,min:1,   max:1   },
      { id:'book_last_stand',  chance:0.0012,min:1,  max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:17000, max:28000 },
      { id:'soulshot_b',       chance:1.00, min:115, max:230    },
      { id:'scroll_weapon_b',  chance:0.50, min:9,   max:19     },
      { id:'scroll_weapon_a',  chance:0.12, min:1,   max:3      },
      { id:'blessed_scroll',   chance:0.30, min:3,   max:7      },
      { id:'arena_pass',       chance:0.24, min:1,   max:2      },
      { id:'book_last_stand',  chance:0.018,min:1,   max:1      },
    ],
  },

  lich: {
    id:'lich', name:'Древний лич', emoji:'☠️',
    level:54, hp:5000, attack:160, speed:1.0, xp:1000, size:0.9,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#7f1d1d', speed:15 },
    drops: [
      { id:'gold',             chance:1.00, min:1000, max:2000 },
      { id:'potion_large',     chance:0.32, min:1,    max:2   },
      { id:'soulshot_b',       chance:0.60, min:18,   max:36  },
      { id:'scroll_weapon_b',  chance:0.14, min:1,    max:2   },
      { id:'scroll_weapon_a',  chance:0.08, min:1,    max:1   },
      { id:'scroll_armor_a',   chance:0.08, min:1,    max:1   },
      { id:'equip_b',          chance:0.012,min:1,    max:1   },
      { id:'equip_a',          chance:0.002,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0018,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:22000, max:36000 },
      { id:'soulshot_b',       chance:1.00, min:130, max:260    },
      { id:'scroll_weapon_b',  chance:0.55, min:10,  max:20     },
      { id:'scroll_weapon_a',  chance:0.20, min:3,   max:6      },
      { id:'scroll_armor_a',   chance:0.20, min:3,   max:6      },
      { id:'blessed_scroll',   chance:0.32, min:4,   max:8      },
      { id:'arena_pass',       chance:0.28, min:1,   max:3      },
      { id:'equip_a',          chance:0.15, min:1,   max:1      },
      { id:'book_meteor',      chance:0.025,min:1,   max:1      },
    ],
  },

  infernal_guard: {
    id:'infernal_guard', name:'Адская стража', emoji:'👹',
    level:56, hp:6000, attack:180, speed:1.3, xp:1100, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:1100, max:2200 },
      { id:'potion_large',     chance:0.32, min:1,    max:2   },
      { id:'soulshot_b',       chance:0.60, min:18,   max:36  },
      { id:'scroll_weapon_b',  chance:0.15, min:1,    max:2   },
      { id:'scroll_weapon_a',  chance:0.08, min:1,    max:1   },
      { id:'scroll_armor_a',   chance:0.08, min:1,    max:1   },
      { id:'equip_b',          chance:0.012,min:1,    max:1   },
      { id:'equip_a',          chance:0.002,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:24000, max:40000 },
      { id:'soulshot_b',       chance:1.00, min:135, max:270    },
      { id:'scroll_weapon_b',  chance:0.55, min:10,  max:22     },
      { id:'scroll_weapon_a',  chance:0.22, min:3,   max:6      },
      { id:'scroll_armor_a',   chance:0.22, min:3,   max:6      },
      { id:'blessed_scroll',   chance:0.35, min:4,   max:8      },
      { id:'arena_pass',       chance:0.28, min:1,   max:3      },
      { id:'equip_a',          chance:0.18, min:1,   max:1      },
    ],
  },

  shadow_knight: {
    id:'shadow_knight', name:'Рыцарь тени', emoji:'🗡️',
    level:58, hp:7000, attack:200, speed:1.2, xp:1250, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:1200, max:2400 },
      { id:'potion_large',     chance:0.35, min:1,    max:3   },
      { id:'soulshot_b',       chance:0.60, min:18,   max:36  },
      { id:'scroll_weapon_b',  chance:0.15, min:1,    max:2   },
      { id:'scroll_weapon_a',  chance:0.10, min:1,    max:1   },
      { id:'scroll_armor_a',   chance:0.10, min:1,    max:1   },
      { id:'equip_b',          chance:0.014,min:1,    max:1   },
      { id:'equip_a',          chance:0.003,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:26000, max:44000 },
      { id:'soulshot_b',       chance:1.00, min:140, max:280    },
      { id:'scroll_weapon_b',  chance:0.55, min:10,  max:22     },
      { id:'scroll_weapon_a',  chance:0.25, min:4,   max:8      },
      { id:'scroll_armor_a',   chance:0.25, min:4,   max:8      },
      { id:'blessed_scroll',   chance:0.35, min:4,   max:8      },
      { id:'arena_pass',       chance:0.30, min:2,   max:4      },
      { id:'equip_a',          chance:0.20, min:1,   max:1      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  A TIER — Aden (уровни 58-72)
  // ═════════════════════════════════════════════════════════════════════

  dragon: {
    id:'dragon', name:'Дракон', emoji:'🐉',
    level:60, hp:9000, attack:240, speed:1.0, xp:1600, size:0.95,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#ea580c', speed:15 },
    drops: [
      { id:'gold',             chance:1.00, min:1400, max:2800 },
      { id:'potion_epic',      chance:0.20, min:1,    max:1   },
      { id:'soulshot_a',       chance:0.55, min:18,   max:36  },
      { id:'scroll_weapon_a',  chance:0.12, min:1,    max:2   },
      { id:'scroll_armor_a',   chance:0.12, min:1,    max:2   },
      { id:'equip_a',          chance:0.010,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0012,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:30000, max:50000 },
      { id:'soulshot_a',       chance:1.00, min:130, max:260    },
      { id:'scroll_weapon_a',  chance:0.55, min:10,  max:22     },
      { id:'scroll_armor_a',   chance:0.55, min:10,  max:22     },
      { id:'blessed_scroll',   chance:0.35, min:5,   max:10     },
      { id:'arena_pass',       chance:0.32, min:2,   max:4      },
      { id:'equip_a',          chance:0.22, min:1,   max:1      },
      { id:'book_meteor',      chance:0.020,min:1,   max:1      },
    ],
  },

  drake_rider: {
    id:'drake_rider', name:'Наездник на дрейке', emoji:'🦎',
    level:62, hp:7500, attack:260, speed:1.7, xp:1700, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:1500, max:3000 },
      { id:'potion_epic',      chance:0.20, min:1,    max:1   },
      { id:'soulshot_a',       chance:0.55, min:18,   max:36  },
      { id:'scroll_weapon_a',  chance:0.12, min:1,    max:2   },
      { id:'scroll_armor_a',   chance:0.12, min:1,    max:2   },
      { id:'equip_a',          chance:0.010,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:32000, max:54000 },
      { id:'soulshot_a',       chance:1.00, min:135, max:270    },
      { id:'scroll_weapon_a',  chance:0.55, min:10,  max:22     },
      { id:'scroll_armor_a',   chance:0.55, min:10,  max:22     },
      { id:'blessed_scroll',   chance:0.38, min:5,   max:10     },
      { id:'arena_pass',       chance:0.32, min:2,   max:4      },
      { id:'equip_a',          chance:0.22, min:1,   max:1      },
    ],
  },

  wyvern: {
    id:'wyvern', name:'Виверна', emoji:'🐲',
    level:64, hp:8000, attack:280, speed:1.3, xp:1800, size:0.9,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#84cc16', speed:22 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:1600, max:3200 },
      { id:'potion_epic',      chance:0.22, min:1,    max:2   },
      { id:'soulshot_a',       chance:0.60, min:20,   max:40  },
      { id:'scroll_weapon_a',  chance:0.14, min:1,    max:2   },
      { id:'scroll_weapon_s',  chance:0.04, min:1,    max:1   },
      { id:'scroll_armor_a',   chance:0.14, min:1,    max:2   },
      { id:'equip_a',          chance:0.012,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:36000, max:60000 },
      { id:'soulshot_a',       chance:1.00, min:140, max:280    },
      { id:'scroll_weapon_a',  chance:0.55, min:10,  max:22     },
      { id:'scroll_weapon_s',  chance:0.15, min:2,   max:4      },
      { id:'blessed_scroll',   chance:0.40, min:5,   max:10     },
      { id:'arena_pass',       chance:0.35, min:2,   max:4      },
      { id:'equip_a',          chance:0.25, min:1,   max:1      },
    ],
  },

  fire_djinn: {
    id:'fire_djinn', name:'Огненный джинн', emoji:'🔥',
    level:66, hp:8500, attack:300, speed:1.4, xp:1900, size:0.85,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#f97316', speed:16 },
    drops: [
      { id:'gold',             chance:1.00, min:1700, max:3400 },
      { id:'potion_epic',      chance:0.24, min:1,    max:2   },
      { id:'soulshot_a',       chance:0.60, min:20,   max:40  },
      { id:'scroll_weapon_a',  chance:0.14, min:1,    max:2   },
      { id:'scroll_weapon_s',  chance:0.04, min:1,    max:1   },
      { id:'scroll_armor_s',   chance:0.04, min:1,    max:1   },
      { id:'equip_a',          chance:0.012,min:1,    max:1   },
      { id:'equip_s',          chance:0.0008,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:40000, max:68000 },
      { id:'soulshot_a',       chance:1.00, min:145, max:290    },
      { id:'scroll_weapon_a',  chance:0.55, min:10,  max:22     },
      { id:'scroll_weapon_s',  chance:0.18, min:2,   max:5      },
      { id:'scroll_armor_s',   chance:0.18, min:2,   max:5      },
      { id:'blessed_scroll',   chance:0.42, min:6,   max:12     },
      { id:'arena_pass',       chance:0.35, min:2,   max:5      },
      { id:'equip_s',          chance:0.08, min:1,   max:1      },
    ],
  },

  dragon_lord: {
    id:'dragon_lord', name:'Владыка драконов', emoji:'🐲',
    level:68, hp:12000, attack:340, speed:1.2, xp:2200, size:1.0,
    attackRange: 7,
    attackProjectile: { type:'staff', color:'#dc2626', speed:17 },
    drops: [
      { id:'gold',             chance:1.00, min:2000, max:4000 },
      { id:'potion_epic',      chance:0.28, min:1,    max:2   },
      { id:'soulshot_a',       chance:0.60, min:20,   max:40  },
      { id:'scroll_weapon_a',  chance:0.16, min:1,    max:2   },
      { id:'scroll_weapon_s',  chance:0.08, min:1,    max:1   },
      { id:'scroll_armor_s',   chance:0.08, min:1,    max:1   },
      { id:'equip_a',          chance:0.014,min:1,    max:1   },
      { id:'equip_s',          chance:0.002,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0018,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:50000, max:85000 },
      { id:'soulshot_a',       chance:1.00, min:160, max:320    },
      { id:'scroll_weapon_a',  chance:0.60, min:12,  max:25     },
      { id:'scroll_weapon_s',  chance:0.25, min:4,   max:8      },
      { id:'scroll_armor_s',   chance:0.25, min:4,   max:8      },
      { id:'blessed_scroll',   chance:0.45, min:6,   max:12     },
      { id:'arena_pass',       chance:0.40, min:3,   max:5      },
      { id:'equip_s',          chance:0.15, min:1,   max:1      },
      { id:'book_meteor',      chance:0.025,min:1,   max:1      },
    ],
  },

  titan: {
    id:'titan', name:'Титан', emoji:'🗿',
    level:70, hp:16000, attack:400, speed:0.7, xp:2400, size:1.1,
    drops: [
      { id:'gold',             chance:1.00, min:2200, max:4400 },
      { id:'potion_epic',      chance:0.30, min:1,    max:2   },
      { id:'soulshot_a',       chance:0.60, min:20,   max:40  },
      { id:'scroll_weapon_s',  chance:0.10, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.10, min:1,    max:2   },
      { id:'equip_a',          chance:0.016,min:1,    max:1   },
      { id:'equip_s',          chance:0.003,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:60000, max:100000 },
      { id:'soulshot_a',       chance:1.00, min:170, max:340     },
      { id:'scroll_weapon_s',  chance:0.30, min:5,   max:10      },
      { id:'scroll_armor_s',   chance:0.30, min:5,   max:10      },
      { id:'blessed_scroll',   chance:0.48, min:8,   max:15      },
      { id:'arena_pass',       chance:0.42, min:3,   max:6       },
      { id:'equip_s',          chance:0.20, min:1,   max:1       },
    ],
  },

  dark_angel: {
    id:'dark_angel', name:'Тёмный ангел', emoji:'😇',
    level:72, hp:10000, attack:450, speed:1.8, xp:2600, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:2400, max:4800 },
      { id:'potion_epic',      chance:0.32, min:1,    max:2   },
      { id:'soulshot_a',       chance:0.60, min:20,   max:40  },
      { id:'scroll_weapon_s',  chance:0.12, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.12, min:1,    max:2   },
      { id:'equip_a',          chance:0.018,min:1,    max:1   },
      { id:'equip_s',          chance:0.004,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0020,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:65000, max:110000 },
      { id:'soulshot_a',       chance:1.00, min:180, max:360     },
      { id:'scroll_weapon_s',  chance:0.35, min:6,   max:12      },
      { id:'scroll_armor_s',   chance:0.35, min:6,   max:12      },
      { id:'blessed_scroll',   chance:0.50, min:8,   max:16      },
      { id:'arena_pass',       chance:0.45, min:3,   max:6       },
      { id:'equip_s',          chance:0.25, min:1,   max:1       },
      { id:'book_meteor',      chance:0.028,min:1,   max:1       },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  S TIER — Goddard (уровни 72-80)
  // ═════════════════════════════════════════════════════════════════════

  ice_golem: {
    id:'ice_golem', name:'Ледяной голем', emoji:'❄️',
    level:74, hp:20000, attack:500, speed:0.7, xp:3000, size:0.9,
    drops: [
      { id:'gold',             chance:1.00, min:3000, max:6000 },
      { id:'potion_epic',      chance:0.35, min:1,    max:3   },
      { id:'soulshot_s',       chance:0.60, min:20,   max:42  },
      { id:'scroll_weapon_s',  chance:0.14, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.14, min:1,    max:2   },
      { id:'equip_s',          chance:0.012,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0015,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:85000, max:140000 },
      { id:'soulshot_s',       chance:1.00, min:180, max:360     },
      { id:'scroll_weapon_s',  chance:0.55, min:10,  max:22      },
      { id:'scroll_armor_s',   chance:0.55, min:10,  max:22      },
      { id:'blessed_scroll',   chance:0.50, min:8,   max:16      },
      { id:'arena_pass',       chance:0.45, min:3,   max:6       },
      { id:'equip_s',          chance:0.28, min:1,   max:1       },
      { id:'book_meteor',      chance:0.030,min:1,   max:1       },
    ],
  },

  frost_wolf: {
    id:'frost_wolf', name:'Ледяной волк', emoji:'🐺',
    level:75, hp:16000, attack:520, speed:2.0, xp:3100, size:0.85,
    drops: [
      { id:'gold',             chance:1.00, min:3200, max:6400 },
      { id:'potion_epic',      chance:0.35, min:1,    max:3   },
      { id:'soulshot_s',       chance:0.60, min:20,   max:42  },
      { id:'scroll_weapon_s',  chance:0.14, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.14, min:1,    max:2   },
      { id:'equip_s',          chance:0.012,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:90000, max:150000 },
      { id:'soulshot_s',       chance:1.00, min:190, max:380     },
      { id:'scroll_weapon_s',  chance:0.55, min:10,  max:24      },
      { id:'scroll_armor_s',   chance:0.55, min:10,  max:24      },
      { id:'blessed_scroll',   chance:0.52, min:8,   max:16      },
      { id:'arena_pass',       chance:0.48, min:3,   max:6       },
      { id:'equip_s',          chance:0.30, min:1,   max:1       },
    ],
  },

  archdemon: {
    id:'archdemon', name:'Архидемон', emoji:'👿',
    level:77, hp:24000, attack:600, speed:1.4, xp:3600, size:1.0,
    attackRange: 6,
    attackProjectile: { type:'staff', color:'#7f1d1d', speed:16 },
    drops: [
      { id:'gold',             chance:1.00, min:3800, max:7600 },
      { id:'potion_epic',      chance:0.40, min:1,    max:3   },
      { id:'soulshot_s',       chance:0.65, min:22,   max:46  },
      { id:'scroll_weapon_s',  chance:0.16, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.16, min:1,    max:2   },
      { id:'equip_s',          chance:0.014,min:1,    max:1   },
      { id:'book_meteor',      chance:0.0018,min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:110000, max:180000 },
      { id:'soulshot_s',       chance:1.00, min:200, max:400      },
      { id:'scroll_weapon_s',  chance:0.58, min:12,  max:25       },
      { id:'scroll_armor_s',   chance:0.58, min:12,  max:25       },
      { id:'blessed_scroll',   chance:0.55, min:10,  max:20       },
      { id:'arena_pass',       chance:0.50, min:4,   max:8        },
      { id:'equip_s',          chance:0.32, min:1,   max:1        },
      { id:'book_meteor',      chance:0.032,min:1,   max:1        },
    ],
  },

  fallen_angel: {
    id:'fallen_angel', name:'Падший ангел', emoji:'😈',
    level:78, hp:22000, attack:640, speed:1.6, xp:3800, size:0.9,
    attackRange: 7,
    attackProjectile: { type:'bow', color:'#fbbf24', speed:22 },
    keepDistance: true,
    drops: [
      { id:'gold',             chance:1.00, min:4000, max:8000 },
      { id:'potion_epic',      chance:0.40, min:1,    max:3   },
      { id:'soulshot_s',       chance:0.65, min:22,   max:46  },
      { id:'scroll_weapon_s',  chance:0.18, min:1,    max:2   },
      { id:'scroll_armor_s',   chance:0.18, min:1,    max:2   },
      { id:'equip_s',          chance:0.016,min:1,    max:1   },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:120000, max:190000 },
      { id:'soulshot_s',       chance:1.00, min:210, max:420      },
      { id:'scroll_weapon_s',  chance:0.60, min:12,  max:26       },
      { id:'scroll_armor_s',   chance:0.60, min:12,  max:26       },
      { id:'blessed_scroll',   chance:0.58, min:10,  max:20       },
      { id:'arena_pass',       chance:0.55, min:4,   max:8        },
      { id:'equip_s',          chance:0.35, min:1,   max:1        },
    ],
  },

  frost_dragon: {
    id:'frost_dragon', name:'Ледяной дракон', emoji:'🧊',
    level:80, hp:30000, attack:720, speed:1.2, xp:4500, size:1.1,
    attackRange: 7,
    attackProjectile: { type:'staff', color:'#22d3ee', speed:18 },
    drops: [
      { id:'gold',             chance:1.00, min:5000, max:10000 },
      { id:'potion_epic',      chance:0.45, min:1,    max:3    },
      { id:'soulshot_s',       chance:0.70, min:25,   max:50   },
      { id:'scroll_weapon_s',  chance:0.20, min:1,    max:2    },
      { id:'scroll_armor_s',   chance:0.20, min:1,    max:2    },
      { id:'equip_s',          chance:0.018,min:1,    max:1    },
      { id:'book_meteor',      chance:0.0020,min:1,   max:1    },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:180000, max:300000 },
      { id:'soulshot_s',       chance:1.00, min:240, max:480      },
      { id:'scroll_weapon_s',  chance:0.65, min:15,  max:30       },
      { id:'scroll_armor_s',   chance:0.65, min:15,  max:30       },
      { id:'blessed_scroll',   chance:0.65, min:15,  max:25       },
      { id:'arena_pass',       chance:0.60, min:5,   max:10       },
      { id:'equip_s',          chance:0.40, min:1,   max:2        },
      { id:'book_meteor',      chance:0.040,min:1,   max:1        },
    ],
  },

  void_walker: {
    id:'void_walker', name:'Ходок пустоты', emoji:'👁️',
    level:80, hp:26000, attack:800, speed:1.9, xp:4800, size:0.9,
    drops: [
      { id:'gold',             chance:1.00, min:5500, max:11000 },
      { id:'potion_epic',      chance:0.45, min:1,    max:3    },
      { id:'soulshot_s',       chance:0.70, min:25,   max:50   },
      { id:'scroll_weapon_s',  chance:0.22, min:1,    max:2    },
      { id:'scroll_armor_s',   chance:0.22, min:1,    max:2    },
      { id:'equip_s',          chance:0.020,min:1,    max:1    },
      { id:'book_meteor',      chance:0.0020,min:1,   max:1    },
    ],
    championDrops: [
      { id:'gold',             chance:1.00, min:200000, max:340000 },
      { id:'soulshot_s',       chance:1.00, min:260, max:520      },
      { id:'scroll_weapon_s',  chance:0.68, min:15,  max:32       },
      { id:'scroll_armor_s',   chance:0.68, min:15,  max:32       },
      { id:'blessed_scroll',   chance:0.70, min:15,  max:28       },
      { id:'arena_pass',       chance:0.65, min:5,   max:10       },
      { id:'equip_s',          chance:0.45, min:1,   max:2        },
      { id:'book_meteor',      chance:0.045,min:1,   max:1        },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  XP МОБОВ — единая формула
// ═══════════════════════════════════════════════════════════════════════
//  mobXP(level) = round(2 × 1.11^level)
//  Убийств на уровень: 25–50 по всей игре.
//  Меняешь 1.11 → меняется весь темп прокачки.
// ═══════════════════════════════════════════════════════════════════════
export function getMobXp(level) {
  return Math.max(1, Math.round(2 * Math.pow(1.11, level || 1)));
}

// ───────────────────────────────────────────────────────────────────────
//  19. ЧЕМПИОНЫ — усиленные версии мобов
// ───────────────────────────────────────────────────────────────────────
//  Чемпион = ×3 HP, ×1.5 атака, ×3 награда, ×3 XP.
//  Спавнится с шансом champChance в лаире (см. cities.js).
//  Помечается ⭐ в имени и светится жёлтым.
// ───────────────────────────────────────────────────────────────────────
export const CHAMPION = {
  hpMult: 3,                 // множитель HP
  attackMult: 1.5,           // множитель атаки
  rewardMult: 3,             // множитель золота/наград
  xpMult: 3,                 // множитель XP
  blessedDropChance: 0.02,   // запасной шанс дропа Blessed (2%)
                             // используется, если у моба пустой championDrops
};

// Шанс дропа бафф-свитка с обычного / чемпиона (в дополнение к drops).
export const BUFF_DROP_CHANCE = {
  normal: 0.008,             // 0.8% с обычного моба
  champion: 0.05,            // 5% с чемпиона
};

// ───────────────────────────────────────────────────────────────────────
//  20. СКИЛЛЫ — УРОВНИ И MILESTONES
// ───────────────────────────────────────────────────────────────────────
//  Каждый скилл качается от 1 до 100 уровня (через книжки).
//  На каждом 10-м уровне — milestone (уникальный бонус).
// ───────────────────────────────────────────────────────────────────────
export const MAX_SKILL_LEVEL = 100;

// Множители от уровня скилла (формула: 1 + K × (уровень-1)).
export const SKILL_LEVEL_EFFECT   = 0.02;   // +2%/ур   → урон ×2.98 на 100
export const SKILL_LEVEL_DURATION = 0.045;  // +4.5%/ур → длительность ×5.46
export const SKILL_LEVEL_COST     = 0.001;  // +0.1%/ур → мана +10%
export const SKILL_LEVEL_CAST     = 0.006;  // −0.6%/ур → каст ×0.41

// Milestones — каждые 10 уровней.
export const SKILL_MILESTONES = [
  { lvl: 10,  id: 'cd10',    desc: '−10% КД' },
  { lvl: 20,  id: 'mana10',  desc: '−10% маны' },
  { lvl: 30,  id: 'crit5',   desc: '+5% шанс крита' },
  { lvl: 40,  id: 'cd20',    desc: '−10% КД (итого −20%)' },
  { lvl: 50,  id: 'aoe1',    desc: '+1 цель / +15% урона' },
  { lvl: 60,  id: 'mana25',  desc: '−15% маны (итого −25%)' },
  { lvl: 70,  id: 'critdmg', desc: '+50% крит-урона' },
  { lvl: 80,  id: 'cd35',    desc: '−15% КД (итого −35%)' },
  { lvl: 90,  id: 'pierce',  desc: 'Pierce 20%' },
  { lvl: 100, id: 'legend',  desc: 'Уникальный эффект' },
];

// ───────────────────────────────────────────────────────────────────────
//  21. СКИЛЛЫ — ОПИСАНИЯ ДЛЯ UI
// ───────────────────────────────────────────────────────────────────────
//  Короткие тексты в скилл-попапе. Меняешь — меняется только UI.
// ───────────────────────────────────────────────────────────────────────
export const SKILL_DESC = {
  // Общие
  heal:         'Восстанавливает 25% HP. На 100 уровне снимает 1 дебафф.',
  cleanse:      'Мгновенно снимает все дебаффы (стан, слоу, немота, яд).',
  dodge:        '+60% уворота на 4 сек. Спасает от физ. атак.',
  haste:        '+50% скорости атаки на 6 сек.',
  iron_skin:    '+80 защиты на 8 сек.',
  reflect:      'Отражает 30% полученного урона на 5 сек.',
  vampiric:     '+15% вампиризма на 8 сек (лечение от удара).',
  berserk:      '+60% атаки на 6 сек. Срабатывает только при HP < 50%.',
  focus:        '+25% шанса крита на 5 сек.',
  last_stand:   '+40% уворота на 4 сек. Только при HP < 30%.',

  // Лучник
  multishot:    'Выпускает 3 стрелы подряд, каждая наносит 45% урона атаки.',
  power_shot:   'Мощный выстрел на 180% урона атаки. Медленный, но бьёт сильно.',
  double_shot:  'Быстрые 2 стрелы по 60% урона. Малое КД, спам-скилл.',
  precise_shot: 'Точный выстрел 120% урона с +40% к шансу крита.',
  lethal_shot:  'Смертельный выстрел 150% урона. +80% при HP цели < 30%.',
  stun_shot:    'Оглушает цель на 2.5 сек с шансом 70%.',
  slow_arrow:   'Замедляет скорость атаки цели на 50% в течение 4 сек.',
  poison_arrow: 'Ядовитая стрела: 35% урона/сек в течение 6 сек.',
  arrow_rain:   'AoE: 5 стрел по 70% урона по площади радиуса 2 клетки.',
  hawk_eye:     '+40% дальности атаки на 8 сек.',
  panther:      'Призывает пантеру: 25% ATK лучника, ближний бой, 15 сек.',

  // Маг
  fireball:        'Огненный шар 160% урона + AoE 1.5 клетки.',
  ice_bolt:        'Ледяная стрела 110% урона + замедляет цель на 30% на 3 сек.',
  lightning:       'Молния 170% урона. Мгновенная, без AoE.',
  chain_lightning: 'Цепь на 3 цели: 120% урона первой, 70% второй, далее — по 70%.',
  meteor:          'Метеор 250% урона + AoE радиуса 3.5. Долгий каст.',
  frost_nova:      'AoE-замедление: −60% скорости атаки всех врагов в радиусе 3 на 5 сек.',
  silence:         'Немота на 3 сек: цель не может использовать скиллы.',
  sleep:           'Сон 3.5 сек с шансом 75%. Цель не двигается, но получает урон.',
  arcane_shield:   'Магический щит: поглощает 40% от макс. HP в виде урона. 8 сек.',
  shadow:          'Призывает тень: 15% ATK мага, дальний бой, 15 сек.',
};

// ───────────────────────────────────────────────────────────────────────
//  22. СКИЛЛЫ — ОСНОВНОЙ ОБЪЕКТ
// ───────────────────────────────────────────────────────────────────────
//  Формат: SKILLS[<skillId>] = {...}.
//  Поля:
//    id — ключ (не менять).
//    class: common | archer | mage.
//    role: dd_burst | dd_sustained | cc_stun | cc_slow | cc_silence | ...
//    manaCost, cooldown (сек), castTime (сек).
//    effect — параметры эффекта (зависит от type).
//    tags — метки для AI.
//
//  effect.type:
//    damage     — прямой урон (value = множитель атаки).
//    multishot  — несколько выстрелов (count, interval, aoe).
//    dot        — периодический урон (value, duration, tickInterval).
//    debuff     — дебафф на цель (stat, value, duration, chance).
//    heal       — лечение (value = доля от макс HP).
//    buff       — бафф на себя (stat, value, duration, requireHpBelow).
//    cleanse    — снятие дебаффов.
//    summon     — призыв пета (petType, damagePercent, duration).
//    shield     — щит (value = доля от макс HP, duration).
//
// ───────────────────────────────────────────────────────────────────────
export const SKILLS = {

  // ═══ ОБЩИЕ (10) — оба класса ═══════════════════════════════════════
  heal: {
    id: 'heal', name: 'Хил', icon: '❤️',
    class: 'common', role: 'heal',
    manaCost: 40, cooldown: 12, castTime: 1.0,
    effect: { type: 'heal', value: 0.25 },
    tags: ['support'],
  },
  cleanse: {
    id: 'cleanse', name: 'Очищение', icon: '✨',
    class: 'common', role: 'cleanse',
    manaCost: 30, cooldown: 15, castTime: 0.5,
    effect: { type: 'cleanse' },
    tags: ['support'],
  },
  dodge: {
    id: 'dodge', name: 'Уворот', icon: '💨',
    class: 'common', role: 'buff_def',
    manaCost: 20, cooldown: 12, castTime: 0,
    effect: { type: 'buff', stat: 'dodge', value: 60, duration: 4 },
    tags: ['support'],
  },
  haste: {
    id: 'haste', name: 'Ускорение', icon: '⚡',
    class: 'common', role: 'buff_off',
    manaCost: 30, cooldown: 20, castTime: 0,
    effect: { type: 'buff', stat: 'attackSpeed', value: 50, duration: 6 },
    tags: ['support'],
  },
  iron_skin: {
    id: 'iron_skin', name: 'Каменная кожа', icon: '🛡',
    class: 'common', role: 'buff_def',
    manaCost: 40, cooldown: 25, castTime: 1.0,
    effect: { type: 'buff', stat: 'defense', value: 80, duration: 8 },
    tags: ['support'],
  },
  reflect: {
    id: 'reflect', name: 'Отражение', icon: '🪞',
    class: 'common', role: 'buff_def',
    manaCost: 50, cooldown: 30, castTime: 1.0,
    effect: { type: 'buff', stat: 'reflect', value: 30, duration: 5 },
    tags: ['support'],
  },
  vampiric: {
    id: 'vampiric', name: 'Вампиризм', icon: '🩸',
    class: 'common', role: 'buff_off',
    manaCost: 40, cooldown: 25, castTime: 0.5,
    effect: { type: 'buff', stat: 'lifesteal', value: 15, duration: 8 },
    tags: ['support'],
  },
  berserk: {
    id: 'berserk', name: 'Ярость', icon: '😡',
    class: 'common', role: 'emergency',
    manaCost: 0, cooldown: 40, castTime: 0,
    effect: { type: 'buff', stat: 'attack', value: 60, duration: 6, requireHpBelow: 0.5 },
    tags: ['support'],
  },
  focus: {
    id: 'focus', name: 'Сосредоточение', icon: '🧘',
    class: 'common', role: 'emergency',
    manaCost: 0, cooldown: 30, castTime: 0,
    effect: { type: 'buff', stat: 'critChance', value: 25, duration: 5 },
    tags: ['support'],
  },
  last_stand: {
    id: 'last_stand', name: 'Последний рубеж', icon: '💀',
    class: 'common', role: 'emergency',
    manaCost: 0, cooldown: 60, castTime: 0,
    effect: { type: 'buff', stat: 'dodge', value: 40, duration: 4, requireHpBelow: 0.3 },
    tags: ['support'],
  },

  // ═══ ЛУЧНИК (11) ═══════════════════════════════════════════════════
  multishot: {
    id: 'multishot', name: 'Мультивыстрел', icon: '🏹',
    class: 'archer', role: 'dd_burst',
    manaCost: 25, cooldown: 12, castTime: 0.8,
    effect: { type: 'multishot', value: 1.3, count: 3, interval: 0.5 },
    tags: ['damage'],
  },
  power_shot: {
    id: 'power_shot', name: 'Мощный выстрел', icon: '💥',
    class: 'archer', role: 'dd_burst',
    manaCost: 35, cooldown: 10, castTime: 1.2,
    effect: { type: 'damage', value: 4.2 },
    tags: ['damage'],
  },
  double_shot: {
    id: 'double_shot', name: 'Двойной выстрел', icon: '⚔️',
    class: 'archer', role: 'dd_sustained',
    manaCost: 15, cooldown: 4, castTime: 0,
    effect: { type: 'multishot', value: 0.9, count: 2, interval: 0.15 },
    tags: ['damage'],
  },
  precise_shot: {
    id: 'precise_shot', name: 'Точный выстрел', icon: '🎯',
    class: 'archer', role: 'dd_crit',
    manaCost: 20, cooldown: 6, castTime: 0.3,
    effect: { type: 'damage', value: 2.4, critBonus: 40 },
    tags: ['damage'],
  },
  lethal_shot: {
    id: 'lethal_shot', name: 'Смертельный выстрел', icon: '☠️',
    class: 'archer', role: 'dd_execute',
    manaCost: 50, cooldown: 20, castTime: 1.0,
    effect: { type: 'damage', value: 3.2, executeBonus: 0.8 },
    tags: ['damage'],
  },
  poison_arrow: {
    id: 'poison_arrow', name: 'Ядовитая стрела', icon: '🧪',
    class: 'archer', role: 'dd_sustained',
    manaCost: 30, cooldown: 12, castTime: 0.6,
    effect: { type: 'dot', value: 0.55, duration: 6, tickInterval: 1.0 },
    tags: ['damage', 'dot'],
  },
  arrow_rain: {
    id: 'arrow_rain', name: 'Дождь стрел', icon: '🌧',
    class: 'archer', role: 'dd_aoe',
    manaCost: 70, cooldown: 30, castTime: 1.5,
    // dotDuration/dotValue — lingering DoT в радиусе aoe.
    effect: { type: 'multishot', value: 1.5, count: 5, interval: 0.3, aoe: 2.0, dotDuration: 3, dotValue: 0.4 },
    tags: ['damage', 'aoe', 'dot'],
  },
  stun_shot: {
    id: 'stun_shot', name: 'Оглушающий выстрел', icon: '💫',
    class: 'archer', role: 'cc_stun',
    manaCost: 60, cooldown: 25, castTime: 1.5,
    effect: { type: 'debuff', stat: 'stun', duration: 2.5, chance: 0.7 },
    tags: ['control'],
  },
  slow_arrow: {
    id: 'slow_arrow', name: 'Замедляющая стрела', icon: '🐢',
    class: 'archer', role: 'cc_slow',
    manaCost: 25, cooldown: 12, castTime: 1.0,
    effect: { type: 'debuff', stat: 'attackSpeed', value: -50, duration: 4 },
    tags: ['control'],
  },
  hawk_eye: {
    id: 'hawk_eye', name: 'Соколиный глаз', icon: '🦅',
    class: 'archer', role: 'buff_off',
    manaCost: 30, cooldown: 25, castTime: 0,
    effect: { type: 'buff', stat: 'range', value: 40, duration: 8 },
    tags: ['support'],
  },
  panther: {
    id: 'panther', name: 'Пантера', icon: '🐆',
    class: 'archer', role: 'summon',
    manaCost: 80, cooldown: 40, castTime: 2.0,
    effect: { type: 'summon', petType: 'panther', damagePercent: 25, duration: 15, shadowPerLevels: 10 },
    tags: ['summon'],
  },

  // ═══ МАГ (10) ══════════════════════════════════════════════════════
  fireball: {
    id: 'fireball', name: 'Огненный шар', icon: '🔥',
    class: 'mage', role: 'dd_burst',
    manaCost: 35, cooldown: 8, castTime: 1.0,
    effect: { type: 'damage', value: 2.6, aoe: 1.5, slowProjectile: true },
    tags: ['damage', 'aoe'],
  },
  ice_bolt: {
    id: 'ice_bolt', name: 'Ледяная стрела', icon: '❄️',
    class: 'mage', role: 'dd_burst',
    manaCost: 25, cooldown: 6, castTime: 0.8,
    effect: { type: 'damage', value: 2.0, debuff: { stat: 'attackSpeed', value: -30, duration: 3 } },
    tags: ['damage', 'control'],
  },
  lightning: {
    id: 'lightning', name: 'Молния', icon: '⚡',
    class: 'mage', role: 'dd_burst',
    manaCost: 40, cooldown: 8, castTime: 0.9,
    effect: { type: 'damage', value: 3.0 },
    tags: ['damage'],
  },
  chain_lightning: {
    id: 'chain_lightning', name: 'Цепная молния', icon: '🌩',
    class: 'mage', role: 'dd_multi',
    manaCost: 60, cooldown: 15, castTime: 1.0,
    effect: { type: 'damage', value: 2.4, chain: 3, chainDecay: 0.7 },
    tags: ['damage', 'aoe'],
  },
  meteor: {
    id: 'meteor', name: 'Метеор', icon: '☄️',
    class: 'mage', role: 'dd_aoe',
    manaCost: 90, cooldown: 40, castTime: 1.8,
    effect: { type: 'damage', value: 5.0, aoe: 3.5, slowProjectile: true },
    tags: ['damage', 'aoe'],
  },
  frost_nova: {
    id: 'frost_nova', name: 'Ледяная новая', icon: '🌨',
    class: 'mage', role: 'aoe_slow',
    manaCost: 55, cooldown: 20, castTime: 1.0,
    effect: { type: 'debuff', stat: 'attackSpeed', value: -60, duration: 5, aoe: 3.0 },
    tags: ['control', 'aoe'],
  },
  silence: {
    id: 'silence', name: 'Немота', icon: '🤐',
    class: 'mage', role: 'cc_silence',
    manaCost: 45, cooldown: 18, castTime: 1.0,
    effect: { type: 'debuff', stat: 'silence', duration: 3.0 },
    tags: ['control'],
  },
  sleep: {
    id: 'sleep', name: 'Сон', icon: '😴',
    class: 'mage', role: 'cc_stun',
    manaCost: 70, cooldown: 30, castTime: 2.0,
    effect: { type: 'debuff', stat: 'stun', duration: 3.5, chance: 0.75 },
    tags: ['control'],
  },
  arcane_shield: {
    id: 'arcane_shield', name: 'Магический щит', icon: '🔮',
    class: 'mage', role: 'shield',
    manaCost: 50, cooldown: 25, castTime: 1.0,
    effect: { type: 'shield', value: 0.4, duration: 8 },
    tags: ['support'],
  },
  shadow: {
    id: 'shadow', name: 'Тень', icon: '👤',
    class: 'mage', role: 'summon',
    manaCost: 80, cooldown: 40, castTime: 2.5,
    effect: { type: 'summon', petType: 'shadow', damagePercent: 15, duration: 15, shadowPerLevels: 10 },
    tags: ['summon'],
  },
};

// ───────────────────────────────────────────────────────────────────────
//  23. СКИЛЛЫ — ВСПОМОГАТЕЛЬНОЕ
// ───────────────────────────────────────────────────────────────────────

// Цвета снарядов скиллов (для визуального различения).
// Если скилла нет в списке — берётся дефолтный цвет класса.
export const SKILL_COLORS = {
  multishot:       '#fbbf24',
  power_shot:      '#fbbf24',
  double_shot:     '#fde047',
  precise_shot:    '#22c55e',
  lethal_shot:     '#dc2626',
  arrow_rain:      '#a3e635',
  fireball:        '#f97316',
  ice_bolt:        '#7dd3fc',
  lightning:       '#fde047',
  chain_lightning: '#a855f7',
  meteor:          '#dc2626',
};

// Русские названия статов (для текста эффекта баффа).
export const STAT_RU = {
  dodge:       'Уворот',
  attackSpeed: 'Скор. атаки',
  defense:     'Защита',
  attack:      'Атака',
  critChance:  'Крит',
  lifesteal:   'Вампиризм',
  reflect:     'Отражение',
  range:       'Дальность',
};

// Порядок скиллов в UI (инвентарь, попапы, сортировка).
export const SKILL_ORDER = [
  // Общие
  'heal', 'cleanse', 'dodge', 'haste', 'iron_skin', 'reflect', 'vampiric', 'berserk', 'focus', 'last_stand',
  // Лучник
  'multishot', 'power_shot', 'double_shot', 'precise_shot', 'lethal_shot', 'stun_shot', 'slow_arrow', 'poison_arrow', 'arrow_rain', 'hawk_eye', 'panther',
  // Маг
  'fireball', 'ice_bolt', 'lightning', 'chain_lightning', 'meteor', 'frost_nova', 'silence', 'sleep', 'arcane_shield', 'shadow',
];

// Скиллы по классам (используется в UI классов).
export const SKILLS_BY_CLASS = {
  archer: ['multishot', 'power_shot', 'double_shot', 'precise_shot', 'lethal_shot', 'stun_shot', 'slow_arrow', 'poison_arrow', 'arrow_rain', 'hawk_eye', 'panther'],
  mage:   ['fireball', 'ice_bolt', 'lightning', 'chain_lightning', 'meteor', 'frost_nova', 'silence', 'sleep', 'arcane_shield', 'shadow'],
  common: ['heal', 'cleanse', 'dodge', 'haste', 'iron_skin', 'reflect', 'vampiric', 'berserk', 'focus', 'last_stand'],
};

// Стартовые скиллы при создании персонажа.
export const STARTING_SKILLS = {
  archer: ['multishot', 'double_shot', 'dodge'],
  mage:   ['fireball', 'ice_bolt', 'heal'],
};

// ───────────────────────────────────────────────────────────────────────
//  24. АРЕНА — ПРОПУСК, РУЛЕТКА, СУНДУКИ
// ───────────────────────────────────────────────────────────────────────

// Пропуск на арену (один бой = один пропуск).
export const ARENA_PASS = {
  id: 'arena_pass',
  name: 'Пропуск на арену',
  icon: '🎫',
  kind: 'pass',
  slot: 'pass',
  grade: 'any',
};

// Награды рулетки после боя на арене.
// chanceWin — вес при победе. chanceLose — вес при поражении.
// Сумма весов нормализуется автоматически (не обязательно 100).
export const ROULETTE_REWARDS = [
  { id: 'gold_500',  icon: '💰', name: '500 золота',       chanceWin: 30, chanceLose: 50 },
  { id: 'gold_2000', icon: '💰', name: '2 000 золота',     chanceWin: 25, chanceLose: 20 },
  { id: 'scroll_3',  icon: '📜', name: '3 свитка заточки', chanceWin: 20, chanceLose: 10 },
  { id: 'blessed',   icon: '✨', name: 'Blessed Scroll',   chanceWin: 12, chanceLose: 8  },
  { id: 'item',      icon: '⚔', name: 'Предмет',          chanceWin: 8,  chanceLose: 6  },
  { id: 'chest',     icon: '🎁', name: 'Сундук',           chanceWin: 3,  chanceLose: 3  },
  { id: 'pass',      icon: '🎫', name: 'Пропуск на арену', chanceWin: 2,  chanceLose: 3  },
];

// Сундуки за достигнутый рейтинг на арене.
// rating — порог. Один раз можно забрать.
export const RATING_CHESTS = [
  { rating: 1000, id: 'bronze',    name: 'Бронзовый',   icon: '🥉', gold: 5000,    scrolls: 3,   blessed: 1,  passes: 1,  itemGrade: null },
  { rating: 1200, id: 'silver',    name: 'Серебряный',  icon: '🥈', gold: 20000,   scrolls: 5,   blessed: 2,  passes: 2,  itemGrade: null },
  { rating: 1400, id: 'gold',      name: 'Золотой',     icon: '🥇', gold: 50000,   scrolls: 10,  blessed: 5,  passes: 3,  itemGrade: null },
  { rating: 1600, id: 'platinum',  name: 'Платиновый',  icon: '💎', gold: 150000,  scrolls: 20,  blessed: 10, passes: 5,  itemGrade: 'a'  },
  { rating: 1800, id: 'legendary', name: 'Легендарный', icon: '👑', gold: 500000,  scrolls: 50,  blessed: 20, passes: 10, itemGrade: 's'  },
  { rating: 2000, id: 'mythic',    name: 'Мифический',  icon: '🌟', gold: 1000000, scrolls: 100, blessed: 50, passes: 20, itemGrade: 's'  },
];

// ───────────────────────────────────────────────────────────────────────
//  25. СТАРТОВЫЕ ПРЕДМЕТЫ
// ───────────────────────────────────────────────────────────────────────
//  Что герой получает при создании персонажа.
// ───────────────────────────────────────────────────────────────────────
export const START_ITEMS = {
  potions:   { small: 5,  medium: 0, large: 0, epic: 0 },
  soulshots: { ng: 20,    d: 0,      c: 0,     b: 0, a: 0, s: 0 },
};
// ═══════════════════════════════════════════════════════════════════════
//  LEVEL-SCALING — зависимость XP и дропа от разницы уровней
// ═══════════════════════════════════════════════════════════════════════
//
//  diff = playerLevel - mobLevel
//
//  Множитель применяется к XP и ко ВСЕМ шансам дропа.
//  Диапазон: 0.10 (пол) … 1.40 (кап).
//
//  diff = 0    → 1.00  (моб = игроку)
//  diff = +5   → 0.80  (игрок выше)
//  diff = +15  → 0.40
//  diff = +25  → 0.10  (пол)
//  diff = -5   → 1.20  (игрок ниже)
//  diff = -10  → 1.40  (кап)
// ═══════════════════════════════════════════════════════════════════════

export const LEVEL_SCALING = {
  perLevelDiff: 0.04,   // −4% за каждый уровень разницы
  min: 0.10,            // минимум 10% (не 0 — топ-игрок всё равно что-то получает)
  max: 1.40,            // максимум 140% (за риск дают бонус)
};

// Функция расчёта множителя от разницы уровней.
// Используется в hero.js (XP) и loot.js (дроп).
export function levelMultiplier(playerLevel, mobLevel) {
  const diff = (playerLevel || 1) - (mobLevel || 1);
  const raw = 1 - diff * LEVEL_SCALING.perLevelDiff;
  return Math.max(LEVEL_SCALING.min, Math.min(LEVEL_SCALING.max, raw));
}


// ═══════════════════════════════════════════════════════════════════════
//  XP МОБОВ — единая формула
// ═══════════════════════════════════════════════════════════════════════
//
//  mobXP = round(2 × 1.11^level)
//
//  Убийств на уровень:
//    1 ур.  → 25 убийств
//    40 ур. → 36 убийств
//    80 ур. → 50 убийств
//
//  Меняешь формулу — весь XP-баланс меняется сразу.
//  Хочешь особенного моба (элита/босс) — прописывай xpOverride.
// ═══════════════════════════════════════════════════════════════════════

