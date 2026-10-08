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
    baseXp: 50,               // XP для перехода на 2-й уровень.
    xpGrowth: 1.35,           // Множитель роста XP.
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
  d:  { name:'D-Grade',  short:'D',  color:'#22c55e', mult:2.5,   tier:2, levelReq: 5  },
  c:  { name:'C-Grade',  short:'C',  color:'#3b82f6', mult:6.0,   tier:3, levelReq: 15 },
  b:  { name:'B-Grade',  short:'B',  color:'#a855f7', mult:15.0,  tier:4, levelReq: 30 },
  a:  { name:'A-Grade',  short:'A',  color:'#f59e0b', mult:40.0,  tier:5, levelReq: 45 },
  s:  { name:'S-Grade',  short:'S',  color:'#ef4444', mult:100.0, tier:6, levelReq: 60 },
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

// Шансы успеха. Индекс = текущий уровень (ENHANCE_CHANCE[0] = +0→+1).
export const ENHANCE_CHANCE = [
  1.00, 1.00, 1.00,        // +0→+3 — гарантировано
  0.95, 0.95, 0.95,        // +3→+6 — почти всегда
  0.90, 0.90, 0.90,        // +6→+9 — ещё легко
  0.80, 0.75, 0.70,        // +9→+12 — уже риск
  0.60, 0.55, 0.50,        // +12→+15 — сложно
  0.45, 0.40, 0.35,        // +15→+18 — очень сложно
  0.30, 0.20,              // +18→+20 — легендарно
];

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
  const key = getBonusKey(item);
  const def = ENHANCE_BONUSES[key];
  if (!def) return null;
  const value = def.getValue(item.enhance);
  if (value <= 0) return null;
  return {
    name: def.name, icon: def.icon, value,
    display: def.format(value),
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
  //  ПЕРВАЯ ЗОНА — Talking Island → Поля Гремлинов
  //  Грейд: NG. Для героя 1–5 уровня. Дроп — базовый стартовый.
  // ═════════════════════════════════════════════════════════════════════

  // ─── Гремлин — МИЛИ-моб, базовый враг ─────────────────────────────
  gremlin: {
    id: 'gremlin',
    name: 'Гремлин',
    emoji: 'sprites/mobs/gremlin.png',   // PNG или эмодзи '👹'
    hp: 40,
    attack: 3,
    speed: 2.2,                          // шустрый, догоняет быстро
    xp: 150,
    size: 0.7,
    // attackRange НЕ указан → мили (0.8 клетки)

    drops: [
      // Золото — всегда
      { id:'gold',              chance:1.0,    min:5,   max:15  },
      // Зелья
      { id:'potion_small',      chance:0.10,   min:1,   max:2   },
      // Свитки заточки NG
      { id:'scroll_weapon_ng',  chance:0.02,   min:1,   max:1   },
      { id:'scroll_armor_ng',   chance:0.03,   min:1,   max:1   },
      // Случайный предмет NG-грейда
      { id:'equip_random',      chance:0.01,   min:1,   max:1   },
      // Книжки скиллов — очень редкие (0.1%)
      { id:'book_double_shot',  chance:0.0010, min:1,   max:1   },
      { id:'book_hawk_eye',     chance:0.0010, min:1,   max:1   },
      { id:'book_dodge',        chance:0.0010, min:1,   max:1   },
      { id:'book_heal',         chance:0.0010, min:1,   max:1   },
    ],
    championDrops: [
      // Чемпион — ×10 щедрее
      { id:'gold',              chance:1.0,    min:40,  max:80  },
      { id:'potion_small',      chance:0.5,    min:3,   max:6   },
      { id:'scroll_weapon_ng',  chance:0.15,   min:2,   max:5   },
      { id:'scroll_armor_ng',   chance:0.20,   min:2,   max:5   },
      { id:'blessed_scroll',    chance:0.05,   min:1,   max:1   },
      { id:'arena_pass',        chance:0.05,   min:1,   max:1   },
      { id:'book_summon_shadow',chance:0.005,  min:1,   max:1   },
    ],
  },

  // ─── Кельтир — МИЛИ-моб, чуть сильнее ─────────────────────────────
  keltir: {
    id: 'keltir',
    name: 'Кельтир',
    emoji: '🐺',
    hp: 60,
    attack: 5,
    speed: 1.4,
    xp: 8,
    size: 0.6,

    drops: [
      { id:'gold',              chance:1.0,    min:8,   max:20  },
      { id:'potion_small',      chance:0.12,   min:1,   max:2   },
      { id:'scroll_weapon_ng',  chance:0.03,   min:1,   max:1   },
      { id:'scroll_armor_ng',   chance:0.03,   min:1,   max:1   },
      { id:'book_precise_shot', chance:0.0008, min:1,   max:1   },
      { id:'book_slow_arrow',   chance:0.0008, min:1,   max:1   },
      { id:'book_poison_arrow', chance:0.0008, min:1,   max:1   },
      { id:'book_cleanse',      chance:0.0008, min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',              chance:1.0,    min:60,  max:120 },
      { id:'potion_small',      chance:0.6,    min:3,   max:8   },
      { id:'scroll_weapon_ng',  chance:0.2,    min:2,   max:6   },
      { id:'scroll_armor_ng',   chance:0.2,    min:2,   max:6   },
      { id:'blessed_scroll',    chance:0.08,   min:1,   max:1   },
      { id:'arena_pass',        chance:0.08,   min:1,   max:1   },
    ],
  },

  // ─── Гоблин-лучник — РЕЙНДЖ-моб, пример дальней атаки ─────────────
  // Держит дистанцию 6–7 клеток, стреляет зелёными стрелами.
  // Если герой подбегает ближе 3 клеток — отходит.
  goblin_archer: {
    id: 'goblin_archer',
    name: 'Гоблин-лучник',
    emoji: '🏹',
    hp: 45,
    attack: 4,
    speed: 1.6,
    xp: 12,
    size: 0.65,

    // ── ДАЛЬНИЙ БОЙ ──
    attackRange: 7,                       // стреляет с 7 клеток
    attackProjectile: {
      type: 'bow',                        // тип снаряда (рисуется стрелкой)
      color: '#4ade80',                   // зелёный
      speed: 16,                          // клеток/сек
    },
    keepDistance: true,                   // отходит когда герой ближе 3 клеток

    drops: [
      { id:'gold',              chance:1.0,    min:6,   max:18  },
      { id:'potion_small',      chance:0.10,   min:1,   max:2   },
      { id:'scroll_weapon_ng',  chance:0.03,   min:1,   max:1   },
      // Книжки лучника — базовые
      { id:'book_multishot',    chance:0.0008, min:1,   max:1   },
      { id:'book_precise_shot', chance:0.0008, min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',              chance:1.0,    min:50,  max:100 },
      { id:'potion_small',      chance:0.5,    min:2,   max:5   },
      { id:'scroll_weapon_ng',  chance:0.15,   min:2,   max:4   },
      { id:'blessed_scroll',    chance:0.05,   min:1,   max:1   },
      { id:'arena_pass',        chance:0.05,   min:1,   max:1   },
    ],
  },

  // ─── Оборотень — МИЛИ-моб для средней зоны (пример апгрейда) ─────
  werewolf: {
    id: 'werewolf',
    name: 'Оборотень',
    emoji: '🐺',
    hp: 200,
    attack: 12,
    speed: 1.5,
    xp: 25,
    size: 0.7,

    drops: [
      { id:'gold',              chance:1.0,    min:30,  max:80  },
      { id:'potion_small',      chance:0.15,   min:1,   max:3   },
      { id:'potion_medium',     chance:0.05,   min:1,   max:1   },
      { id:'scroll_weapon_ng',  chance:0.05,   min:1,   max:2   },
      { id:'scroll_armor_ng',   chance:0.05,   min:1,   max:2   },
      { id:'book_multishot',    chance:0.0006, min:1,   max:1   },
      { id:'book_stun_shot',    chance:0.0006, min:1,   max:1   },
      { id:'book_focus',        chance:0.0006, min:1,   max:1   },
      { id:'book_haste',        chance:0.0006, min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',              chance:1.0,    min:200, max:400 },
      { id:'potion_small',      chance:0.7,    min:5,   max:10  },
      { id:'scroll_weapon_ng',  chance:0.25,   min:3,   max:8   },
      { id:'scroll_armor_ng',   chance:0.25,   min:3,   max:8   },
      { id:'blessed_scroll',    chance:0.1,    min:1,   max:1   },
      { id:'arena_pass',        chance:0.1,    min:1,   max:1   },
    ],
  },
  // ─── Разбойник-лучник — РЕЙНДЖ-моб (стреляет стрелами) ────────────
  // ИИ: подходит на 7 клеток, стреляет, отходит если герой ближе 3.
  // Дальний бой → указаны attackRange + attackProjectile + keepDistance.
  bandit_archer: {
    id: 'bandit_archer',
    name: 'Разбойник-лучник',
    emoji: '🏹',
    hp: 50,
    attack: 5,
    speed: 1.7,
    xp: 15,
    size: 0.65,

    // ── ДАЛЬНИЙ БОЙ ──
    attackRange: 7,                          // стреляет с 7 клеток
    attackProjectile: {
      type: 'bow',                           // рисуется стрелкой
      color: '#fbbf24',                      // жёлтая стрела
      speed: 16,                             // клеток/сек
    },
    keepDistance: true,                      // отходит если герой вплотную

    drops: [
      { id:'gold',              chance:1.0,    min:8,   max:22  },
      { id:'potion_small',      chance:0.12,   min:1,   max:2   },
      { id:'scroll_weapon_ng',  chance:0.03,   min:1,   max:1   },
      { id:'book_multishot',    chance:0.0008, min:1,   max:1   },
      { id:'book_precise_shot', chance:0.0008, min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',              chance:1.0,    min:60,  max:120 },
      { id:'potion_small',      chance:0.5,    min:2,   max:5   },
      { id:'scroll_weapon_ng',  chance:0.15,   min:2,   max:4   },
      { id:'blessed_scroll',    chance:0.05,   min:1,   max:1   },
      { id:'arena_pass',        chance:0.05,   min:1,   max:1   },
    ],
  },

  // ─── Гоблин-маг — РЕЙНДЖ-моб (стреляет магией) ────────────────────
  // ИИ: подходит на 6 клеток, стреляет заклинанием (медленный снаряд),
  // НЕ отходит (маги стоят на месте).
  goblin_mage: {
    id: 'goblin_mage',
    name: 'Гоблин-маг',
    emoji: '🔮',
    hp: 55,
    attack: 6,
    speed: 1.0,
    xp: 18,
    size: 0.7,

    // ── ДАЛЬНИЙ БОЙ ──
    attackRange: 6,                          // стреляет с 6 клеток
    attackProjectile: {
      type: 'staff',                         // рисуется заклинанием
      color: '#c084fc',                      // фиолетовый
      speed: 11,                             // медленнее стрелы
    },
    // keepDistance НЕ указан → стоит и стреляет, не отходит

    drops: [
      { id:'gold',              chance:1.0,    min:10,  max:25  },
      { id:'potion_small',      chance:0.12,   min:1,   max:2   },
      { id:'potion_medium',     chance:0.03,   min:1,   max:1   },
      { id:'scroll_weapon_ng',  chance:0.03,   min:1,   max:1   },
      { id:'scroll_armor_ng',   chance:0.03,   min:1,   max:1   },
      { id:'book_fireball',     chance:0.0008, min:1,   max:1   },
      { id:'book_ice_bolt',     chance:0.0008, min:1,   max:1   },
    ],
    championDrops: [
      { id:'gold',              chance:1.0,    min:70,  max:150 },
      { id:'potion_small',      chance:0.5,    min:2,   max:5   },
      { id:'scroll_weapon_ng',  chance:0.15,   min:2,   max:4   },
      { id:'scroll_armor_ng',   chance:0.15,   min:2,   max:4   },
      { id:'blessed_scroll',    chance:0.05,   min:1,   max:1   },
      { id:'arena_pass',        chance:0.05,   min:1,   max:1   },
    ],
  },
  // ═══ GIRAN (D-грейд) ═══════════════════════════════════════════════
  orc: {
    id:'orc', name:'Орк', emoji:'👺',
    hp:120, attack:8, speed:1.0, xp:15, size:0.65,
    drops: [
      { id:'book_power_shot', chance:0.0005, min:1, max:1 },
      { id:'book_panther',    chance:0.0005, min:1, max:1 },
      { id:'book_ice_bolt',   chance:0.0005, min:1, max:1 },
      { id:'book_iron_skin',  chance:0.0005, min:1, max:1 },
    ],
    championDrops: [],
  },

  skeleton: {
    id:'skeleton', name:'Скелет', emoji:'💀',
    hp:90, attack:7, speed:1.2, xp:12, size:0.6,
    drops: [
      { id:'book_lethal_shot', chance:0.0004, min:1, max:1 },
      { id:'book_arrow_rain',  chance:0.0004, min:1, max:1 },
      { id:'book_silence',     chance:0.0004, min:1, max:1 },
      { id:'book_vampiric',    chance:0.0004, min:1, max:1 },
    ],
    championDrops: [],
  },

  spider: {
    id:'spider', name:'Паук', emoji:'🕷️',
    hp:180, attack:12, speed:1.5, xp:22, size:0.6,
    drops: [
      { id:'book_fireball',      chance:0.0003, min:1, max:1 },
      { id:'book_arcane_shield', chance:0.0003, min:1, max:1 },
      { id:'book_reflect',       chance:0.0003, min:1, max:1 },
      { id:'book_berserk',       chance:0.0003, min:1, max:1 },
    ],
    championDrops: [],
  },

  // ═══ DION (C-грейд) ════════════════════════════════════════════════
  warg: {
    id:'warg', name:'Варг', emoji:'🐕',
    hp:240, attack:15, speed:1.4, xp:28, size:0.65,
    drops: [],
    championDrops: [
      { id:'book_lightning',       chance:0.0003, min:1, max:1 },
      { id:'book_chain_lightning', chance:0.0003, min:1, max:1 },
      { id:'book_frost_nova',      chance:0.0003, min:1, max:1 },
      { id:'book_last_stand',      chance:0.0003, min:1, max:1 },
    ],
  },

  ghost: {
    id:'ghost', name:'Призрак', emoji:'👻',
    hp:300, attack:18, speed:1.3, xp:40, size:0.65,
    drops: [
      { id:'book_sleep',  chance:0.0002, min:1, max:1 },
      { id:'book_shadow', chance:0.0002, min:1, max:1 },
      { id:'book_focus',  chance:0.0002, min:1, max:1 },
    ],
    championDrops: [],
  },

  // ═══ OREN (B-грейд) ════════════════════════════════════════════════
  golem: {
    id:'golem', name:'Голем', emoji:'🗿',
    hp:500, attack:22, speed:0.8, xp:55, size:0.8,
    drops: [
      { id:'book_meteor', chance:0.0001, min:1, max:1 },
      { id:'book_sleep',  chance:0.0002, min:1, max:1 },
      { id:'book_shadow', chance:0.0002, min:1, max:1 },
    ],
    championDrops: [],
  },

  demon: {
    id:'demon', name:'Демон', emoji:'😈',
    hp:700, attack:30, speed:1.4, xp:90, size:0.75,
    drops: [
      { id:'book_meteor', chance:0.0001,  min:1, max:1 },
      { id:'book_sleep',  chance:0.00015, min:1, max:1 },
    ],
    championDrops: [],
  },

  // ═══ ADEN (A-грейд) ════════════════════════════════════════════════
  dragon: {
    id:'dragon', name:'Дракон', emoji:'🐉',
    hp:1200, attack:45, speed:1.0, xp:180, size:0.95,
    drops: [
      { id:'book_meteor', chance:0.0001, min:1, max:1 },
    ],
    championDrops: [],
  },

  // ═══ GODDARD (S-грейд) ═════════════════════════════════════════════
  ice_golem: {
    id:'ice_golem', name:'Ледяной голем', emoji:'❄️',
    hp:2000, attack:60, speed:0.7, xp:300, size:0.85,
    drops: [
      { id:'book_meteor',        chance:0.0001, min:1, max:1 },
      { id:'book_arcane_shield', chance:0.0001, min:1, max:1 },
    ],
    championDrops: [],
  },

  archdemon: {
    id:'archdemon', name:'Архидемон', emoji:'👿',
    hp:3000, attack:90, speed:1.2, xp:600, size:1.0,
    drops: [
      { id:'book_meteor', chance:0.00008, min:1, max:1 },
    ],
    championDrops: [],
  },
};

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