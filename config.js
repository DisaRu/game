export const CONFIG = {
  hero: {
    archer: { name:'Лучник', emoji:'🏹', hp:200, attack:15, attackSpeed:1.5, range:4.5, projectileSpeed:16, projectileColor:'#4ade80', aoe:0, moveSpeed:3.5, weapon:'bow' },
    mage:   { name:'Маг',    emoji:'🔮', hp:150, attack:22, attackSpeed:0.9, range:3.5, projectileSpeed:10, projectileColor:'#c084fc', aoe:1.2, moveSpeed:3.2, weapon:'staff' },
  },
  level: { baseXp:50, xpGrowth:1.35, maxLevel:80, hpPerLevel:25, attackPerLevel:3 },
  death: { respawnTime:10, xpLossPercent:0.10 },
  startGold: 30000,
};

export const SLOTS = ['weapon','helmet','armor','gloves','boots','cloak','ring','amulet'];
export const SLOT_NAMES = {
  weapon:'Оружие', helmet:'Шлем', armor:'Броня', gloves:'Перчатки',
  boots:'Сапоги', cloak:'Плащ', ring:'Кольцо', amulet:'Амулет',
};

export const STAT_NAMES = {
  attack:'Атака', defense:'Защита', hp:'HP',
  critChance:'Крит шанс', critDamage:'Крит урон', dodge:'Уворот',
  attackSpeed:'Скор. атаки', lifesteal:'Вампиризм',
  range:'Дальность',
};

export const STAT_SUFFIX = {
  critChance:'%', critDamage:'%', dodge:'%', attackSpeed:'%', lifesteal:'%',
};

export const PERCENT_STATS = ['critChance','critDamage','dodge','attackSpeed','lifesteal'];

export const ENHANCE_STATS = {
  weapon: ['attack','critDamage'],
  helmet: ['hp','defense'],
  armor:  ['defense','hp'],
  gloves: ['attackSpeed','critChance'],
  boots:  ['dodge','hp'],
  cloak:  ['range','dodge'],
  ring:   ['critChance','attack'],
  amulet: ['lifesteal','hp'],
};

export const BASE_STATS = {
  weapon: { attack: 12, critDamage: 10 },
  helmet: { hp: 30, defense: 3 },
  armor:  { defense: 6, hp: 60 },
  gloves: { attackSpeed: 4, critChance: 1 },
  boots:  { dodge: 3, hp: 15 },
  cloak:  { range: 0.2, dodge: 4 },
  ring:   { critChance: 2, attack: 4 },
  amulet: { lifesteal: 1, hp: 20 },
};

export const GRADES = {
  ng: { name:'No-Grade', short:'NG', color:'#94a3b8', mult:1.0,  tier: 1, levelReq: 1  },
  d:  { name:'D-Grade',  short:'D',  color:'#22c55e', mult:1.6,  tier: 2, levelReq: 5  },
  c:  { name:'C-Grade',  short:'C',  color:'#3b82f6', mult:2.5,  tier: 3, levelReq: 15 },
  b:  { name:'B-Grade',  short:'B',  color:'#a855f7', mult:4.0,  tier: 4, levelReq: 30 },
  a:  { name:'A-Grade',  short:'A',  color:'#f59e0b', mult:6.5,  tier: 5, levelReq: 45 },
  s:  { name:'S-Grade',  short:'S',  color:'#ef4444', mult:10.0, tier: 6, levelReq: 60 },
};
export const GRADE_ORDER = ['ng','d','c','b','a','s'];

export const GRADE_ITEMS = {
  ng: {
    weapon_archer: { name:'Лук новичка',    icon:'🏹' },
    weapon_mage:   { name:'Посох новичка',  icon:'🪄' },
    helmet: { name:'Шлем новичка',      icon:'⛑️' },
    armor:  { name:'Кожаная броня',     icon:'🥋' },
    gloves: { name:'Кожаные перчатки',  icon:'🧤' },
    boots:  { name:'Кожаные сапоги',    icon:'👢' },
    cloak:  { name:'Плащ новичка',      icon:'🧥' },
    ring:   { name:'Кольцо новичка',    icon:'💍' },
    amulet: { name:'Амулет новичка',    icon:'📿' },
  },
  d: {
    weapon_archer: { name:'Лук охотника',   icon:'🏹' },
    weapon_mage:   { name:'Посох охотника', icon:'🪄' },
    helmet: { name:'Шлем охотника',     icon:'⛑️' },
    armor:  { name:'Доспех охотника',   icon:'🥋' },
    gloves: { name:'Перчатки охотника', icon:'🧤' },
    boots:  { name:'Сапоги охотника',   icon:'👢' },
    cloak:  { name:'Плащ охотника',     icon:'🧥' },
    ring:   { name:'Кольцо охотника',   icon:'💍' },
    amulet: { name:'Амулет охотника',   icon:'📿' },
  },
  c: {
    weapon_archer: { name:'Лук бури',       icon:'🏹' },
    weapon_mage:   { name:'Посох бури',     icon:'🪄' },
    helmet: { name:'Шлем бури',         icon:'⛑️' },
    armor:  { name:'Доспех бури',       icon:'🥋' },
    gloves: { name:'Перчатки бури',     icon:'🧤' },
    boots:  { name:'Сапоги бури',       icon:'👢' },
    cloak:  { name:'Плащ бури',         icon:'🧥' },
    ring:   { name:'Кольцо бури',       icon:'💍' },
    amulet: { name:'Амулет бури',       icon:'📿' },
  },
  b: {
    weapon_archer: { name:'Лук демона',     icon:'🏹' },
    weapon_mage:   { name:'Посох демона',   icon:'🪄' },
    helmet: { name:'Корона демона',     icon:'👑' },
    armor:  { name:'Доспех демона',     icon:'🥋' },
    gloves: { name:'Рукавицы демона',   icon:'🧤' },
    boots:  { name:'Сапоги демона',     icon:'👢' },
    cloak:  { name:'Плащ демона',       icon:'🧥' },
    ring:   { name:'Кольцо демона',     icon:'💍' },
    amulet: { name:'Амулет демона',     icon:'📿' },
  },
  a: {
    weapon_archer: { name:'Лук дракона',    icon:'🏹' },
    weapon_mage:   { name:'Посох дракона',  icon:'🪄' },
    helmet: { name:'Шлем дракона',      icon:'⛑️' },
    armor:  { name:'Доспех дракона',    icon:'🥋' },
    gloves: { name:'Перчатки дракона',  icon:'🧤' },
    boots:  { name:'Сапоги дракона',    icon:'👢' },
    cloak:  { name:'Плащ дракона',      icon:'🧥' },
    ring:   { name:'Кольцо дракона',    icon:'💍' },
    amulet: { name:'Амулет дракона',    icon:'📿' },
  },
  s: {
    weapon_archer: { name:'Лук богов',      icon:'🏹' },
    weapon_mage:   { name:'Посох богов',    icon:'🪄' },
    helmet: { name:'Венец королей',     icon:'👑' },
    armor:  { name:'Броня богов',       icon:'🥋' },
    gloves: { name:'Рукавицы богов',    icon:'🧤' },
    boots:  { name:'Сапоги богов',      icon:'👢' },
    cloak:  { name:'Плащ богов',        icon:'🧥' },
    ring:   { name:'Кольцо богов',      icon:'💍' },
    amulet: { name:'Амулет богов',      icon:'📿' },
  },
};

export const EQUIP_PRICES = { ng:150, d:800, c:3500, b:15000, a:60000, s:250000 };
export const SCROLL_PRICES = { ng:60, d:300, c:1200, b:5000, a:20000, s:80000 };
export const SOULSHOT_PRICES = { ng:10, d:40, c:150, b:600, a:2500, s:10000 };

export function scrollType(slot) { return slot === 'weapon' ? 'weapon' : 'armor'; }

export const MAX_ENHANCE = 20;

// Плавная кривая: индекс = текущий уровень
export const ENHANCE_CHANCE = [
  1.00, // +0 -> +1
  1.00, // +1 -> +2
  1.00, // +2 -> +3
  0.95, // +3 -> +4
  0.95, // +4 -> +5
  0.95, // +5 -> +6
  0.90, // +6 -> +7  (с этого шага сгорание)
  0.90, // +7 -> +8
  0.90, // +8 -> +9
  0.80, // +9 -> +10
  0.75, // +10 -> +11
  0.70, // +11 -> +12
  0.60, // +12 -> +13
  0.55, // +13 -> +14
  0.50, // +14 -> +15
  0.45, // +15 -> +16
  0.40, // +16 -> +17
  0.35, // +17 -> +18
  0.30, // +18 -> +19
  0.20, // +19 -> +20
];

// С +6 сгорает при провале
export const BREAK_START_LEVEL = 6;

export function willBreakAt(level) {
  return level >= BREAK_START_LEVEL && level < MAX_ENHANCE;
}

export const POTIONS = {
  small:  { name:'Малое зелье HP',     icon:'🧪', heal:150,  price:50,   color:'#ef4444' },
  medium: { name:'Зелье HP',           icon:'⚗️', heal:400,  price:150,  color:'#f97316' },
  large:  { name:'Сильное зелье HP',   icon:'🍷', heal:900,  price:500,  color:'#a855f7' },
  epic:   { name:'Эпическое зелье HP', icon:'🏺', heal:2000, price:2000, color:'#fbbf24' },
};
export const POTION_ORDER = ['small','medium','large','epic'];
export const POTION_AUTO_HP_PERCENT = 0.5;
export const POTION_COOLDOWN = 3;

export const START_ITEMS = {
  potions: { small:5, medium:0, large:0, epic:0 },
  soulshots: { ng:20, d:0, c:0, b:0, a:0, s:0 },
};

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