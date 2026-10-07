import { GRADES } from './config.js';

// ============================================================
// БОССЫ
// ============================================================
//
// У каждого босса:
//   статы (hp, attack, speed, xp, size, emoji)
//   drops    — таблица дропа, тот же формат, что у мобов:
//              { id:'<itemId>', chance:0.X, min:N, max:M }
//   skills   — список активных скиллов босса (логика — потом)
//   resists  — сопротивления урону/эффектам (логика — потом)
//
// Формат drops — см. loot.js (ITEM_REGISTRY).
//
// Базовые примеры для заполнения:
//   { id:'gold',              chance:1.0,  min:500, max:1000 }
//   { id:'arena_pass',        chance:1.0,  min:1,   max:1 }
//   { id:'scroll_weapon_d',   chance:0.5,  min:5,   max:15 }
//   { id:'blessed_scroll',    chance:0.2,  min:1,   max:3 }
//   { id:'book_fireball',     chance:0.1,  min:1,   max:1 }
//   { id:'weapon_bow_speed_d',chance:0.05, min:1,   max:1 }

export const BOSSES = {
  ng: {
    id:'boss_ng', name:'Король гремлинов', emoji:'👑',
    hp:2000, attack:25, speed:0.6, xp:200, size:1.5,
    drops: [],
    skills: [],
    resists: {},
  },
  d: {
    id:'boss_d', name:'Тролль-вождь', emoji:'🧌',
    hp:6000, attack:50, speed:0.6, xp:500, size:1.5,
    drops: [],
    skills: [],
    resists: {},
  },
  c: {
    id:'boss_c', name:'Королева пауков', emoji:'🕸️',
    hp:18000, attack:100, speed:0.6, xp:1200, size:1.5,
    drops: [],
    skills: [],
    resists: {},
  },
  b: {
    id:'boss_b', name:'Древний лич', emoji:'☠️',
    hp:50000, attack:200, speed:0.6, xp:3000, size:1.6,
    drops: [],
    skills: [],
    resists: {},
  },
  a: {
    id:'boss_a', name:'Дракон-тиран', emoji:'🐲',
    hp:150000, attack:400, speed:0.6, xp:8000, size:1.7,
    drops: [],
    skills: [],
    resists: {},
  },
  s: {
    id:'boss_s', name:'Владыка бездны', emoji:'👁️',
    hp:400000, attack:800, speed:0.6, xp:20000, size:1.8,
    drops: [],
    skills: [],
    resists: {},
  },
};

// Прогрессия призыва охраны по грейду
export const GUARD_CALL = {
  ng: { interval: 15, count: 3, max: 10 },
  d:  { interval: 15, count: 4, max: 15 },
  c:  { interval: 13, count: 5, max: 20 },
  b:  { interval: 12, count: 6, max: 25 },
  a:  { interval: 10, count: 7, max: 30 },
  s:  { interval: 8,  count: 8, max: 40 },
};

// Прогрессия AoE-атак по грейду
export const BOSS_AOE = {
  ng: { dmgPercent: 0.20, interval: [6, 8],   shake: 2, types: ['circle','marker'] },
  d:  { dmgPercent: 0.25, interval: [5.5, 7.5], shake: 3, types: ['circle','marker','line'] },
  c:  { dmgPercent: 0.30, interval: [5, 7],   shake: 4, types: ['circle','marker','line','ring'] },
  b:  { dmgPercent: 0.35, interval: [4.5, 6.5], shake: 5, types: ['circle','marker','line','ring','fire'] },
  a:  { dmgPercent: 0.40, interval: [4, 6],   shake: 6, types: ['circle','marker','line','ring','fire'] },
  s:  { dmgPercent: 0.50, interval: [3.5, 5.5], shake: 8, types: ['circle','marker','line','ring','fire'] },
};

export function createBoss(grade, x, y, mult = 1) {
  const def = BOSSES[grade] || BOSSES.ng;
  const call = GUARD_CALL[grade] || GUARD_CALL.ng;
  const hp = Math.floor(def.hp * mult);
  const atk = Math.floor(def.attack * Math.sqrt(mult));
  return {
    id: def.id,
    defId: grade,             // ключ грейда — нужен для поиска .drops
    name: def.name,
    emoji: def.emoji,
    boss: true,
    grade,
    hp, maxHp: hp,
    attack: atk,
    speed: def.speed,
    xp: Math.floor(def.xp * Math.sqrt(mult)),
    size: def.size,
    x, y,
    aggro: true,
    attackCd: 0,
    spawnAnim: 0.6,
    hitFlash: 0,
    dead: false,

    // AoE
    aoeTimer: 2 + Math.random() * 2,
    castGlow: 0,

    // Призыв охраны
    guardTimer: call.interval,
    guardsSpawned: 0,
  };
}

// Создаёт AoE от босса (случайный тип из доступных для грейда)
export function castBossAoe(boss, hero) {
  const grade = boss.grade || 'ng';
  const aoeDef = BOSS_AOE[grade] || BOSS_AOE.ng;
  const types = aoeDef.types;
  const type = types[Math.floor(Math.random() * types.length)];

  const dmg = Math.floor(hero.maxHp * aoeDef.dmgPercent);
  const delay = 3.0;

  if (type === 'circle') {
    return {
      type: 'circle',
      x: boss.x, y: boss.y,
      radius: 4,
      delay, life: delay,
      damage: dmg,
      color: '#ef4444',
    };
  }
  if (type === 'marker') {
    return {
      type: 'marker',
      x: hero.x, y: hero.y,
      radius: 2.5,
      delay, life: delay,
      damage: dmg,
      color: '#f97316',
    };
  }
  if (type === 'line') {
    return {
      type: 'line',
      x: hero.x, y: hero.y,
      length: 30, thickness: 1.5,
      delay, life: delay,
      damage: dmg,
      color: '#dc2626',
    };
  }
  if (type === 'ring') {
    return {
      type: 'ring',
      x: boss.x, y: boss.y,
      innerRadius: 2.5,
      outerRadius: 7,
      delay, life: delay,
      damage: dmg,
      color: '#a855f7',
    };
  }
  if (type === 'fire') {
    const spots = [];
    for (let i = 0; i < 3 + Math.floor(Math.random() * 2); i++) {
      spots.push({
        x: hero.x + (Math.random() - 0.5) * 5,
        y: hero.y + (Math.random() - 0.5) * 5,
        radius: 1.8,
        life: delay + 5,
        damage: Math.floor(hero.maxHp * 0.10),
        tickTimer: 0,
        burned: 0,
      });
    }
    return {
      type: 'fire',
      x: hero.x, y: hero.y,
      delay, life: delay + 5,
      damage: dmg,
      spots,
      color: '#ea580c',
    };
  }
  return null;
}

export function checkAoeHit(aoe, hero) {
  if (aoe.type === 'circle' || aoe.type === 'marker') {
    const d = Math.hypot(aoe.x - hero.x, aoe.y - hero.y);
    return d <= aoe.radius;
  }
  if (aoe.type === 'line') {
    const half = aoe.length / 2;
    const dx = Math.abs(hero.x - aoe.x);
    const dy = Math.abs(hero.y - aoe.y);
    return dx <= aoe.thickness && dy <= half;
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
    const d = Math.hypot(s.x - hero.x, s.y - hero.y);
    if (d <= s.radius) return true;
  }
  return false;
}