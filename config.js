export const CONFIG = {
  map: {
    cols: 24,
    rows: 36,
    cellPx: 36,
    cameraClamp: true,
    renderRadius: 20,
    updateRadius: 40,
  },
  hero: {
    archer: { name:'Лучник', emoji:'🏹', hp:200, attack:15, attackSpeed:1.5, range:4.5, projectileSpeed:16, projectileColor:'#4ade80', aoe:0, moveSpeed:3.5, weapon:'bow' },
    mage:   { name:'Маг',    emoji:'🔮', hp:150, attack:22, attackSpeed:0.9, range:3.5, projectileSpeed:10, projectileColor:'#c084fc', aoe:1.2, moveSpeed:3.2, weapon:'staff' },
  },
  level: { baseXp:50, xpGrowth:1.35, maxLevel:80, hpPerLevel:80, attackPerLevel:3 },
  death: { respawnTime:10, xpLossPercent:0.10 },
  startGold: 30000,
};

export const SLOTS = ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet'];

export const SLOT_NAMES = {
  weapon:'Оружие', helmet:'Шлем', armor:'Броня', gloves:'Перчатки',
  boots:'Сапоги', cloak:'Плащ', ring:'Кольцо', amulet:'Амулет',
};

// ===== СТАТЫ =====
export const STAT_NAMES = {
  attack:'Атака', defense:'Защита', hp:'HP',
  critChance:'Крит шанс', critDamage:'Крит урон', dodge:'Уворот',
  attackSpeed:'Скор. атаки', lifesteal:'Вампиризм', range:'Дальность',
  accuracy:'Точность', critResist:'Сопр. криту', armorPen:'Пробитие',
  antiHeal:'Анти-хил', berserk:'Берсерк', thorns:'Шипы', moveSpeed:'Скорость бега',
};

export const STAT_SUFFIX = {
  critChance:'%', critDamage:'%', dodge:'%', attackSpeed:'%', lifesteal:'%',
  accuracy:'%', critResist:'%', armorPen:'%', antiHeal:'%', berserk:'%',
  thorns:'%', moveSpeed:'%',
};

export const PERCENT_STATS = [
  'critChance','critDamage','dodge','attackSpeed','lifesteal',
  'accuracy','critResist','armorPen','antiHeal','berserk','thorns','moveSpeed',
];

// ===== ВАРИАНТЫ И ЗАТОЧКА =====
// Ключ = слот. Значение = объект с вариантами.
// Каждый вариант: [главный стат, второй стат]
export const ENHANCE_STATS = {
  weapon: {
    speed: ['attackSpeed','attack'],
    range: ['range','critDamage'],
    crit:  ['critChance','critDamage'],
    aoe:   ['attack','critDamage'],
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
    crit:   ['critChance','attack'],
    resist: ['critResist','hp'],
    berserk:['berserk','attack'],
  },
  amulet: {
    lifesteal: ['lifesteal','hp'],
    hp:        ['hp','lifesteal'],
    antiHeal:  ['antiHeal','hp'],
  },
};

// ===== БАЗОВЫЕ СТАТЫ ПРЕДМЕТОВ =====
// weapon — варианты для лука (archer) и посоха (mage)
export const BASE_STATS = {
  weapon_archer_speed:  { attack: 10, attackSpeed: 6 },
  weapon_archer_range:  { attack: 12, range: 0.4, critDamage: 8 },
  weapon_archer_crit:   { attack: 11, critChance: 2, critDamage: 10 },
  weapon_mage_aoe:      { attack: 18, critDamage: 12 },
  weapon_mage_speed:    { attack: 14, attackSpeed: 5 },
  weapon_mage_crit:     { attack: 16, critChance: 2, critDamage: 12 },

  helmet_hp:    { hp: 40, defense: 3 },
  helmet_def:   { defense: 5, hp: 20 },
  helmet_dodge: { dodge: 3, hp: 15 },

  armor_def:    { defense: 8, hp: 50 },
  armor_thorns: { thorns: 3, hp: 40 },
  armor_hp:     { hp: 70, defense: 4 },

  gloves_speed:    { attackSpeed: 5, critChance: 1 },
  gloves_crit:     { critChance: 2, attackSpeed: 3 },
  gloves_accuracy: { accuracy: 4, critChance: 1 },

  boots_dodge: { dodge: 4, hp: 15 },
  boots_hp:    { hp: 35, dodge: 2 },
  boots_speed: { moveSpeed: 4, dodge: 2 },

  cloak_range: { range: 0.3, dodge: 3 },
  cloak_dodge: { dodge: 4, range: 0.2 },
  cloak_thorns:{ thorns: 3, dodge: 3 },

  ring_crit:    { critChance: 2, attack: 4 },
  ring_resist:  { critResist: 3, hp: 15 },
  ring_berserk: { berserk: 3, attack: 3 },

  amulet_lifesteal: { lifesteal: 1, hp: 20 },
  amulet_hp:        { hp: 40, lifesteal: 0.5 },
  amulet_antiHeal:  { antiHeal: 3, hp: 20 },
};

// ===== ГРЕЙДЫ =====
export const GRADES = {
  ng: { name:'No-Grade', short:'NG', color:'#94a3b8', mult:1.0,   tier: 1, levelReq: 1  },
  d:  { name:'D-Grade',  short:'D',  color:'#22c55e', mult:2.5,   tier: 2, levelReq: 5  },
  c:  { name:'C-Grade',  short:'C',  color:'#3b82f6', mult:6.0,   tier: 3, levelReq: 15 },
  b:  { name:'B-Grade',  short:'B',  color:'#a855f7', mult:15.0,  tier: 4, levelReq: 30 },
  a:  { name:'A-Grade',  short:'A',  color:'#f59e0b', mult:40.0,  tier: 5, levelReq: 45 },
  s:  { name:'S-Grade',  short:'S',  color:'#ef4444', mult:100.0, tier: 6, levelReq: 60 },
};
export const GRADE_ORDER = ['ng','d','c','b','a','s'];

// ===== НАЗВАНИЯ И ИКОНКИ ПРЕДМЕТОВ =====
// Ключ = grade_variant (без weapon-типа, он подставляется)
export const GRADE_ITEMS = {
  ng: {
    weapon_archer_speed:  { name:'Лук новичка (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук новичка (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук новичка (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох новичка (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох новичка (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох новичка (крит)', icon:'🪄' },
    helmet_hp:    { name:'Шлем новичка (HP)', icon:'⛑️' },
    helmet_def:   { name:'Шлем новичка (защита)', icon:'⛑️' },
    helmet_dodge: { name:'Шлем новичка (уворот)', icon:'⛑️' },
    armor_def:    { name:'Кожаная броня (защита)', icon:'🥋' },
    armor_thorns: { name:'Кожаная броня (шипы)', icon:'🥋' },
    armor_hp:     { name:'Кожаная броня (HP)', icon:'🥋' },
    gloves_speed:    { name:'Перчатки новичка (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Перчатки новичка (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Перчатки новичка (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги новичка (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги новичка (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги новичка (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ новичка (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ новичка (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ новичка (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо новичка (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо новичка (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо новичка (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет новичка (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет новичка (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет новичка (анти-хил)', icon:'📿' },
  },
  d: {
    weapon_archer_speed:  { name:'Лук охотника (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук охотника (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук охотника (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох охотника (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох охотника (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох охотника (крит)', icon:'🪄' },
    helmet_hp:    { name:'Шлем охотника (HP)', icon:'⛑️' },
    helmet_def:   { name:'Шлем охотника (защита)', icon:'⛑️' },
    helmet_dodge: { name:'Шлем охотника (уворот)', icon:'⛑️' },
    armor_def:    { name:'Доспех охотника (защита)', icon:'🥋' },
    armor_thorns: { name:'Доспех охотника (шипы)', icon:'🥋' },
    armor_hp:     { name:'Доспех охотника (HP)', icon:'🥋' },
    gloves_speed:    { name:'Перчатки охотника (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Перчатки охотника (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Перчатки охотника (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги охотника (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги охотника (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги охотника (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ охотника (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ охотника (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ охотника (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо охотника (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо охотника (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо охотника (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет охотника (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет охотника (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет охотника (анти-хил)', icon:'📿' },
  },
  c: {
    weapon_archer_speed:  { name:'Лук бури (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук бури (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук бури (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох бури (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох бури (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох бури (крит)', icon:'🪄' },
    helmet_hp:    { name:'Шлем бури (HP)', icon:'⛑️' },
    helmet_def:   { name:'Шлем бури (защита)', icon:'⛑️' },
    helmet_dodge: { name:'Шлем бури (уворот)', icon:'⛑️' },
    armor_def:    { name:'Доспех бури (защита)', icon:'🥋' },
    armor_thorns: { name:'Доспех бури (шипы)', icon:'🥋' },
    armor_hp:     { name:'Доспех бури (HP)', icon:'🥋' },
    gloves_speed:    { name:'Перчатки бури (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Перчатки бури (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Перчатки бури (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги бури (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги бури (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги бури (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ бури (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ бури (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ бури (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо бури (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо бури (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо бури (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет бури (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет бури (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет бури (анти-хил)', icon:'📿' },
  },
  b: {
    weapon_archer_speed:  { name:'Лук демона (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук демона (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук демона (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох демона (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох демона (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох демона (крит)', icon:'🪄' },
    helmet_hp:    { name:'Корона демона (HP)', icon:'👑' },
    helmet_def:   { name:'Корона демона (защита)', icon:'👑' },
    helmet_dodge: { name:'Корона демона (уворот)', icon:'👑' },
    armor_def:    { name:'Доспех демона (защита)', icon:'🥋' },
    armor_thorns: { name:'Доспех демона (шипы)', icon:'🥋' },
    armor_hp:     { name:'Доспех демона (HP)', icon:'🥋' },
    gloves_speed:    { name:'Рукавицы демона (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Рукавицы демона (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Рукавицы демона (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги демона (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги демона (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги демона (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ демона (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ демона (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ демона (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо демона (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо демона (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо демона (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет демона (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет демона (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет демона (анти-хил)', icon:'📿' },
  },
  a: {
    weapon_archer_speed:  { name:'Лук дракона (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук дракона (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук дракона (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох дракона (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох дракона (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох дракона (крит)', icon:'🪄' },
    helmet_hp:    { name:'Шлем дракона (HP)', icon:'⛑️' },
    helmet_def:   { name:'Шлем дракона (защита)', icon:'⛑️' },
    helmet_dodge: { name:'Шлем дракона (уворот)', icon:'⛑️' },
    armor_def:    { name:'Доспех дракона (защита)', icon:'🥋' },
    armor_thorns: { name:'Доспех дракона (шипы)', icon:'🥋' },
    armor_hp:     { name:'Доспех дракона (HP)', icon:'🥋' },
    gloves_speed:    { name:'Перчатки дракона (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Перчатки дракона (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Перчатки дракона (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги дракона (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги дракона (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги дракона (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ дракона (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ дракона (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ дракона (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо дракона (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо дракона (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо дракона (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет дракона (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет дракона (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет дракона (анти-хил)', icon:'📿' },
  },
  s: {
    weapon_archer_speed:  { name:'Лук богов (скорость)', icon:'🏹' },
    weapon_archer_range:  { name:'Лук богов (дальность)', icon:'🏹' },
    weapon_archer_crit:   { name:'Лук богов (крит)', icon:'🏹' },
    weapon_mage_aoe:      { name:'Посох богов (AoE)', icon:'🪄' },
    weapon_mage_speed:    { name:'Посох богов (скорость)', icon:'🪄' },
    weapon_mage_crit:     { name:'Посох богов (крит)', icon:'🪄' },
    helmet_hp:    { name:'Венец королей (HP)', icon:'👑' },
    helmet_def:   { name:'Венец королей (защита)', icon:'👑' },
    helmet_dodge: { name:'Венец королей (уворот)', icon:'👑' },
    armor_def:    { name:'Броня богов (защита)', icon:'🥋' },
    armor_thorns: { name:'Броня богов (шипы)', icon:'🥋' },
    armor_hp:     { name:'Броня богов (HP)', icon:'🥋' },
    gloves_speed:    { name:'Рукавицы богов (скорость)', icon:'🧤' },
    gloves_crit:     { name:'Рукавицы богов (крит)', icon:'🧤' },
    gloves_accuracy: { name:'Рукавицы богов (точность)', icon:'🧤' },
    boots_dodge: { name:'Сапоги богов (уворот)', icon:'👢' },
    boots_hp:    { name:'Сапоги богов (HP)', icon:'👢' },
    boots_speed: { name:'Сапоги богов (скорость)', icon:'👢' },
    cloak_range: { name:'Плащ богов (дальность)', icon:'🧥' },
    cloak_dodge: { name:'Плащ богов (уворот)', icon:'🧥' },
    cloak_thorns:{ name:'Плащ богов (шипы)', icon:'🧥' },
    ring_crit:    { name:'Кольцо богов (крит)', icon:'💍' },
    ring_resist:  { name:'Кольцо богов (сопр.)', icon:'💍' },
    ring_berserk: { name:'Кольцо богов (берсерк)', icon:'💍' },
    amulet_lifesteal: { name:'Амулет богов (вампиризм)', icon:'📿' },
    amulet_hp:        { name:'Амулет богов (HP)', icon:'📿' },
    amulet_antiHeal:  { name:'Амулет богов (анти-хил)', icon:'📿' },
  },
};

export const EQUIP_PRICES = { ng:150, d:800, c:3500, b:15000, a:60000, s:250000 };
export const SCROLL_PRICES = { ng:60, d:300, c:1200, b:5000, a:20000, s:80000 };
export const SOULSHOT_PRICES = { ng:10, d:40, c:150, b:600, a:2500, s:10000 };

export function scrollType(slot) { return slot === 'weapon' ? 'weapon' : 'armor'; }

export const MAX_ENHANCE = 20;

export const ENHANCE_CHANCE = [
  1.00, 1.00, 1.00,
  0.95, 0.95, 0.95,
  0.90, 0.90, 0.90,
  0.80, 0.75, 0.70,
  0.60, 0.55, 0.50,
  0.45, 0.40, 0.35,
  0.30, 0.20,
];

export const BREAK_START_LEVEL = 6;

export function willBreakAt(level) {
  return level >= BREAK_START_LEVEL && level < MAX_ENHANCE;
}

// ===== БОНУСЫ +15 =====
// Ключ = слот (потом будет слот+вариант)
export const ENHANCE_BONUSES = {
  weapon: {
    name: 'Масс-атака', icon: '⚔',
    getValue: (e) => e < 15 ? 0 : 3 + (e - 15) * 2,
    format: (v) => `${v} целей`,
    apply: (hero, v) => { hero.chainTargets = v; },
  },
  helmet: {
    name: 'Живучесть', icon: '❤',
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

// СЕЙЧАС: ключ = слот. ПОТОМ: ключ = слот_вариант.
export function getBonusKey(item) {
  return item.slot;
  // Потом: return `${item.slot}_${item.variant}`;
}

export function getEnhanceBonus(item) {
  if (!item) return null;
  const key = getBonusKey(item);
  const def = ENHANCE_BONUSES[key];
  if (!def) return null;
  const value = def.getValue(item.enhance);
  if (value <= 0) return null;
  return {
    name: def.name,
    icon: def.icon,
    value,
    display: def.format(value),
    apply: def.apply,
  };
}

// ===== ЗЕЛЬЯ =====
export const POTIONS = {
  small:  { name:'Малое зелье HP',     icon:'🧪', heal:150,  price:50,   color:'#ef4444' },
  medium: { name:'Зелье HP',           icon:'⚗️', heal:400,  price:150,  color:'#f97316' },
  large:  { name:'Сильное зелье HP',   icon:'🍷', heal:900,  price:500,  color:'#a855f7' },
  epic:   { name:'Эпическое зелье HP', icon:'🏺', heal:2000, price:2000, color:'#fbbf24' },
};
export const POTION_ORDER = ['small','medium','large','epic'];
export const POTION_AUTO_HP_PERCENT = 0.5;
export const POTION_COOLDOWN = 3;

// ===== БАФФ-СВИТКИ =====
export const BUFF_SCROLLS = {
  attack: { id:'attack', name:'Свиток ярости',  icon:'🗡', color:'#ef4444', stat:'attack',    bonus:0.20, duration:20*60,  desc:'+20% атака' },
  crit:   { id:'crit',   name:'Свиток удачи',   icon:'💥', color:'#f97316', stat:'critChance',bonus:15,    duration:20*60,  desc:'+15% крит' },
  speed:  { id:'speed',  name:'Свиток ветра',   icon:'⚡', color:'#fde047', stat:'attackSpeed',bonus:0.50, duration:20*60,  desc:'+50% скор. атаки' },
  range:  { id:'range',  name:'Свиток охоты',   icon:'📏', color:'#a3e635', stat:'range',     bonus:0.50, duration:20*60,  desc:'+50% дальность' },
};
export const BUFF_ORDER = ['attack','crit','speed','range'];

// ===== УРОН МОБОВ =====
export const MOB_DAMAGE_PERCENT = { easy: 0.015, medium: 0.030, hard: 0.050 };
export const BOSS_DAMAGE_PERCENT = 0.08;
export const BOSS_AOE_PERCENT = 0.25;

export const START_ITEMS = {
  potions: { small:5, medium:0, large:0, epic:0 },
  soulshots: { ng:20, d:0, c:0, b:0, a:0, s:0 },
};

// ===== МОБЫ =====
export const MOBS = {
  gremlin:   { id:'gremlin',   name:'Гремлин',        emoji:'👹', hp:40,   attack:3,  speed:1.2, reward:15,  xp:5,   size:0.55 },
  keltir:    { id:'keltir',    name:'Кельтир',        emoji:'🐺', hp:60,   attack:5,  speed:1.4, reward:22,  xp:8,   size:0.6  },
  werewolf:  { id:'werewolf',  name:'Оборотень',      emoji:'🐺', hp:200,  attack:12, speed:1.5, reward:50,  xp:25,  size:0.7  },
  orc:       { id:'orc',       name:'Орк',            emoji:'👺', hp:120,  attack:8,  speed:1.0, reward:35,  xp:15,  size:0.65 },
  skeleton:  { id:'skeleton',  name:'Скелет',         emoji:'💀', hp:90,   attack:7,  speed:1.2, reward:30,  xp:12,  size:0.6  },
  spider:    { id:'spider',    name:'Паук',           emoji:'🕷️', hp:180,  attack:12, speed:1.5, reward:60,  xp:22,  size:0.6  },
  warg:      { id:'warg',      name:'Варг',           emoji:'🐕', hp:240,  attack:15, speed:1.4, reward:80,  xp:28,  size:0.65 },
  ghost:     { id:'ghost',     name:'Призрак',        emoji:'👻', hp:300,  attack:18, speed:1.3, reward:110, xp:40,  size:0.65 },
  golem:     { id:'golem',     name:'Голем',          emoji:'🗿', hp:500,  attack:22, speed:0.8, reward:160, xp:55,  size:0.8  },
  demon:     { id:'demon',     name:'Демон',          emoji:'😈', hp:700,  attack:30, speed:1.4, reward:250, xp:90,  size:0.75 },
  dragon:    { id:'dragon',    name:'Дракон',         emoji:'🐉', hp:1200, attack:45, speed:1.0, reward:500, xp:180, size:0.95 },
  ice_golem: { id:'ice_golem', name:'Ледяной голем',  emoji:'❄️', hp:2000, attack:60, speed:0.7, reward:800, xp:300, size:0.85 },
  archdemon: { id:'archdemon', name:'Архидемон',      emoji:'👿', hp:3000, attack:90, speed:1.2, reward:1500,xp:600, size:1.0  },
};

export const CHAMPION = {
  hpMult: 3,
  attackMult: 1.5,
  rewardMult: 3,
  xpMult: 3,
  blessedDropChance: 0.02,
};
export const BUFF_DROP_CHANCE = {
  normal: 0.008,
  champion: 0.05,
};