export const CONFIG = {
  hero: {
    archer: { name:'Лучник', emoji:'🏹', hp:200, attack:15, attackSpeed:1.5, range:4.5, projectileSpeed:14, projectileColor:'#4ade80', aoe:0, moveSpeed:3.5 },
    mage:   { name:'Маг',    emoji:'🔮', hp:150, attack:22, attackSpeed:0.9, range:3.5, projectileSpeed:10, projectileColor:'#c084fc', aoe:1.2, moveSpeed:3.2 },
  },
  level: { baseXp:50, xpGrowth:1.35, maxLevel:80, hpPerLevel:25, attackPerLevel:3 },
  death: { respawnTime:3, xpLossPercent:0.10 },
  spawn: { baseInterval:2.0, minInterval:0.7, groupChance:0.15, groupSize:[3,5], maxMobs:25, minDistanceFromHero:5 },
  aggro: { range:5, wanderChangeTime:1.5 },
  startGold: 3000,
};

export const SLOTS = ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet'];
export const SLOT_NAMES = {
  weapon:'Оружие', helmet:'Шлем', armor:'Броня', gloves:'Перчатки',
  boots:'Сапоги', cloak:'Плащ', ring:'Кольцо', amulet:'Амулет',
};

// === ГРЕЙДЫ (как в L2) ===
export const GRADES = {
  ng: { name:'No-Grade', short:'NG', color:'#94a3b8', mult:1.0,  levelReq:1  },
  d:  { name:'D-Grade',  short:'D',  color:'#22c55e', mult:1.6,  levelReq:5  },
  c:  { name:'C-Grade',  short:'C',  color:'#3b82f6', mult:2.5,  levelReq:10 },
  b:  { name:'B-Grade',  short:'B',  color:'#a855f7', mult:4.0,  levelReq:20 },
  a:  { name:'A-Grade',  short:'A',  color:'#f59e0b', mult:6.5,  levelReq:35 },
  s:  { name:'S-Grade',  short:'S',  color:'#ef4444', mult:10.0, levelReq:50 },
};
export const GRADE_ORDER = ['ng','d','c','b','a','s'];

// Один комплект на грейд — по 8 предметов
export const GRADE_ITEMS = {
  ng: {
    weapon: { name:'Меч новичка',       icon:'🗡️' },
    helmet: { name:'Шлем новичка',      icon:'⛑️' },
    armor:  { name:'Кожаная броня',     icon:'🥋' },
    gloves: { name:'Кожаные перчатки',  icon:'🧤' },
    boots:  { name:'Кожаные сапоги',    icon:'👢' },
    cloak:  { name:'Плащ новичка',      icon:'🧥' },
    ring:   { name:'Кольцо новичка',    icon:'💍' },
    amulet: { name:'Амулет новичка',    icon:'📿' },
  },
  d: {
    weapon: { name:'Клинок охотника',   icon:'⚔️' },
    helmet: { name:'Шлем охотника',     icon:'⛑️' },
    armor:  { name:'Доспех охотника',   icon:'🥋' },
    gloves: { name:'Перчатки охотника', icon:'🧤' },
    boots:  { name:'Сапоги охотника',   icon:'👢' },
    cloak:  { name:'Плащ охотника',     icon:'🧥' },
    ring:   { name:'Кольцо охотника',   icon:'💍' },
    amulet: { name:'Амулет охотника',   icon:'📿' },
  },
  c: {
    weapon: { name:'Клинок бури',       icon:'⚔️' },
    helmet: { name:'Шлем бури',         icon:'⛑️' },
    armor:  { name:'Доспех бури',       icon:'🥋' },
    gloves: { name:'Перчатки бури',     icon:'🧤' },
    boots:  { name:'Сапоги бури',       icon:'👢' },
    cloak:  { name:'Плащ бури',         icon:'🧥' },
    ring:   { name:'Кольцо бури',       icon:'💍' },
    amulet: { name:'Амулет бури',       icon:'📿' },
  },
  b: {
    weapon: { name:'Клинок демона',     icon:'⚔️' },
    helmet: { name:'Корона демона',     icon:'👑' },
    armor:  { name:'Доспех демона',     icon:'🥋' },
    gloves: { name:'Рукавицы демона',   icon:'🧤' },
    boots:  { name:'Сапоги демона',     icon:'👢' },
    cloak:  { name:'Плащ демона',       icon:'🧥' },
    ring:   { name:'Кольцо демона',     icon:'💍' },
    amulet: { name:'Амулет демона',     icon:'📿' },
  },
  a: {
    weapon: { name:'Клинок дракона',    icon:'🔥' },
    helmet: { name:'Шлем дракона',      icon:'⛑️' },
    armor:  { name:'Доспех дракона',    icon:'🥋' },
    gloves: { name:'Перчатки дракона',  icon:'🧤' },
    boots:  { name:'Сапоги дракона',    icon:'👢' },
    cloak:  { name:'Плащ дракона',      icon:'🧥' },
    ring:   { name:'Кольцо дракона',    icon:'💍' },
    amulet: { name:'Амулет дракона',    icon:'📿' },
  },
  s: {
    weapon: { name:'Экскалибур',        icon:'⚡' },
    helmet: { name:'Венец королей',     icon:'👑' },
    armor:  { name:'Броня богов',       icon:'🥋' },
    gloves: { name:'Рукавицы богов',    icon:'🧤' },
    boots:  { name:'Сапоги богов',      icon:'👢' },
    cloak:  { name:'Плащ богов',        icon:'🧥' },
    ring:   { name:'Кольцо богов',      icon:'💍' },
    amulet: { name:'Амулет богов',      icon:'📿' },
  },
};

// Базовые статы слота (на NG)
export const BASE_STATS = {
  weapon: { attack: 8 },
  helmet: { hp: 20, defense: 2 },
  armor:  { hp: 40, defense: 5 },
  gloves: { attack: 3, defense: 1 },
  boots:  { defense: 2, hp: 15 },
  cloak:  { hp: 25, defense: 3 },
  ring:   { attack: 4, hp: 10 },
  amulet: { hp: 20, attack: 3 },
};

// === ЛОКАЦИИ ===
export const LOCATIONS = {
  talking_island: { name:'Talking Island', sub:'Поля гремлинов', mobs:'talking_island', unlockLevel:1,  cols:12, rows:20 },
  giran:          { name:'Giran',          sub:'Порт и болота',  mobs:'giran',          unlockLevel:5,  cols:12, rows:20 },
  dion:           { name:'Dion',           sub:'Поля и фермы',   mobs:'dion',           unlockLevel:10, cols:12, rows:20 },
  oren:           { name:'Oren',           sub:'Лес и руины',    mobs:'oren',           unlockLevel:20, cols:12, rows:20 },
  aden:           { name:'Aden',           sub:'Столица',        mobs:'aden',           unlockLevel:35, cols:12, rows:20 },
};
export const TELEPORT_COST = 500;

// === МОБЫ ===
export const MOBS = {
  talking_island: [
    { id:'gremlin', name:'Гремлин', emoji:'👹', hp:40,  attack:3,  speed:1.2, reward:15, xp:5,  size:0.55 },
    { id:'keltir',  name:'Кельтир', emoji:'🐺', hp:60,  attack:5,  speed:1.4, reward:22, xp:8,  size:0.6  },
  ],
  giran: [
    { id:'orc',      name:'Орк',     emoji:'👺', hp:120, attack:8,  speed:1.0, reward:35, xp:15, size:0.65 },
    { id:'skeleton', name:'Скелет',  emoji:'💀', hp:90,  attack:7,  speed:1.2, reward:30, xp:12, size:0.6  },
  ],
  dion: [
    { id:'spider', name:'Паук', emoji:'🕷️', hp:180, attack:12, speed:1.5, reward:60, xp:22, size:0.6 },
    { id:'warg',   name:'Варг', emoji:'🐕', hp:240, attack:15, speed:1.4, reward:80, xp:28, size:0.65 },
  ],
  oren: [
    { id:'ghost', name:'Призрак', emoji:'👻', hp:300, attack:18, speed:1.3, reward:110, xp:40, size:0.65 },
    { id:'golem', name:'Голем',   emoji:'🗿', hp:500, attack:22, speed:0.8, reward:160, xp:55, size:0.8  },
  ],
  aden: [
    { id:'demon',  name:'Демон',  emoji:'😈', hp:700,  attack:30, speed:1.4, reward:250, xp:90,  size:0.75 },
    { id:'dragon', name:'Дракон', emoji:'🐉', hp:1200, attack:45, speed:1.0, reward:500, xp:180, size:0.95 },
  ],
};
// Цены в магазине
export const EQUIP_PRICES = {
  ng: 150, d: 800, c: 3500, b: 15000, a: 60000, s: 250000,
};
export const SCROLL_PRICES = {
  ng: 60, d: 300, c: 1200, b: 5000, a: 20000, s: 80000,
};

// Тип свитка по слоту
export function scrollType(slot) {
  return slot === 'weapon' ? 'weapon' : 'armor';
}
// Зелья
export const POTION_HP_PRICE = 50;
export const POTION_HP_HEAL = 150;

// Соски (soulshots)
export const SOULSHOT_PRICES = {
  ng: 10, d: 40, c: 150, b: 600, a: 2500, s: 10000,
};

// Стартовый набор
export const START_ITEMS = {
  potions: { hp: 5 },
  soulshots: { ng: 20, d: 0, c: 0, b: 0, a: 0, s: 0 },
};