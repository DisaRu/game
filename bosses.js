// ═══════════════════════════════════════════════════════════════════════
//  bosses.js — СПРАВОЧНИК БОССОВ
// ═══════════════════════════════════════════════════════════════════════
//
//  Каждый босс — отдельная запись с уникальным id.
//  Один лаир может содержать несколько боссов (см. cities.js → bosses[]).
//
//  ПОЛЯ БОССА:
//    id              — ключ (не менять — используется в сейвах и cities.js).
//    name            — имя для UI.
//    emoji           — эмодзи ИЛИ путь к PNG.
//    grade           — грейд (ng/d/c/b/a/s). Влияет на дефолтный AoE/охрану.
//    hp/attack/xp    — базовые статы. Финальные = база × zone.mult.
//    speed           — скорость бега.
//    size            — визуальный размер (1.5–2.0 у боссов).
//
//  ГИБКОСТЬ (все поля опциональны):
//    statMult  — множители статов:   { hp: 1.5, attack: 1.2 }
//    statBonus — плоские бонусы:     { defense: 100, critChance: 20 }
//    buffs[]   — постоянные баффы:   ['attack', 'speed']  (id из BUFF_SCROLLS)
//    skills[]  — активные скиллы:    [{ id, level, cd, when }]
//                  id    — из config.js → SKILLS
//                  level — 1..100
//                  cd    — перезарядка в секундах
//                  when  — условие каста: 'always' | 'hp_below_50' |
//                          'hp_below_30' | 'hp_above_70'
//    resists{} — резисты:            { stun: 0.7, crit: 0.4 }
//    guards{}  — охрана:             { mobs:['orc'], count:5, interval:15, max:15 }
//    aoe{}     — AoE-паттерн:        { dmgPercent, interval:[min,max], types:[] }
//                types: circle | marker | line | ring | fire
//    drops[]   — таблица дропа (как у мобов).
//
//  ДАЛЬНИЙ БОЙ (для боссов-магов/луков):
//    attackRange      — с какого расстояния бьёт автоатакой (7+ = стрелок).
//    attackProjectile — { type:'bow'|'staff', color, speed }
//    keepDistance     — true = отходит если герой подошёл вплотную.
//
// ═══════════════════════════════════════════════════════════════════════

export const BOSSES = {

  // ═════════════════════════════════════════════════════════════════════
  //  КОРОЛЬ ГРЕМЛИНОВ — босс первой зоны (Мили)
  // ═════════════════════════════════════════════════════════════════════
  //  Классический мили-босс: медленный, жирный, бьёт вплотную,
  //  раз в 30 сек призывает стаю гремлинов. При HP<50% лечится.
  // ═════════════════════════════════════════════════════════════════════
  gremlin_king: {
    id: 'gremlin_king',
    name: 'Король гремлинов',
    emoji: '👑',
    grade: 'ng',

    // ── Статы ──
    hp: 2000,
    attack: 25,
    speed: 0.6,                        // медленный, не догонит если убежать
    xp: 200,
    size: 1.5,                         // крупный (обычный моб 0.7)

    // ── Бонусы статов (опционально) ──
    statBonus: { defense: 20, hp: 200 },   // +20 защиты, +200 HP

    // ── Постоянные баффы на боссе, пока жив ──
    buffs: ['attack'],                  // +20% атаки (из BUFF_SCROLLS)

    // ── Активные скиллы ──
    skills: [
      // Фаербол — кастует раз в 10 сек всегда
      { id: 'fireball', level: 20, cd: 10 },

      // Хилка — только при HP<50%, раз в 25 сек
      { id: 'heal',     level: 30, cd: 25, when: 'hp_below_50' },

      // Ускорение — только при HP>70%, раз в 40 сек
      { id: 'haste',    level: 20, cd: 40, when: 'hp_above_70' },
    ],

    // ── Резисты ──
    resists: { stun: 0.3, slow: 0.2 },  // 30% шанс зарезистить стан

    // ── Охрана ──
    guards: {
      mobs: ['gremlin', 'keltir'],      // каких мобов призывает
      count: 5,                         // сколько спавнит сразу при появлении
      interval: 15,                     // раз в 15 сек призывает ещё
      max: 10,                          // максимум охранников одновременно
    },

    // ── AoE-паттерн ──
    // Раз в 6–8 сек босс делает AoE по одной из зон.
    // Каждый тип = разный рисунок атаки (круг, линия, кольцо, огонь).
    aoe: {
      dmgPercent: 0.20,                 // 20% от макс HP героя
      interval: [6, 8],                 // случайный интервал между кастами
      shake: 2,                         // сила тряски экрана
      types: ['circle', 'marker'],
    },

    // ── Дроп ──
    drops: [
      { id:'gold',             chance:1.0,  min:500, max:1000 },
      { id:'scroll_weapon_ng', chance:0.5,  min:5,   max:15   },
      { id:'scroll_armor_ng',  chance:0.5,  min:5,   max:15   },
      { id:'blessed_scroll',   chance:0.2,  min:1,   max:3    },
      { id:'arena_pass',       chance:1.0,  min:1,   max:1    },
      { id:'book_double_shot', chance:0.15, min:1,   max:1    },
      { id:'book_heal',        chance:0.15, min:1,   max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ОГНЕННЫЙ МАГ — босс-рейндж (Дальний бой)
  // ═════════════════════════════════════════════════════════════════════
  //  Пример босса-стрелка: атакует с 8 клеток, кастует фаерболы
  //  быстро (каждые 3 сек), отходит если подойти близко.
  //  Можно ставить в любую зону — просто добавь его id в cities.js.
  // ═════════════════════════════════════════════════════════════════════
  fire_mage: {
    id: 'fire_mage',
    name: 'Огненный маг',
    emoji: '🧙',
    grade: 'c',

    // ── Статы ──
    hp: 12000,
    attack: 80,
    speed: 0.5,
    xp: 1000,
    size: 1.3,

    // ── ДАЛЬНИЙ БОЙ ──
    attackRange: 8,                          // автоатака с 8 клеток
    attackProjectile: {                      // тип снаряда
      type: 'staff',                         // рисуется заклинанием
      color: '#f97316',                      // оранжевый
      speed: 12,                             // клеток/сек
    },
    keepDistance: true,                      // отходит когда герой подошёл вплотную

    statBonus: { critChance: 20, critDamage: 40 },

    // ── Скиллы ──
    skills: [
      // Быстрый фаербол — каждые 3 сек
      { id: 'fireball', level: 60, cd: 3 },

      // Метеор — раз в 20 сек (мощная AoE)
      { id: 'meteor',   level: 60, cd: 20 },

      // Щит при HP<60%
      { id: 'arcane_shield', level: 60, cd: 30, when: 'hp_below_60' },

      // Хилка при HP<40%
      { id: 'heal',     level: 60, cd: 25, when: 'hp_below_40' },
    ],

    resists: { stun: 0.3, silence: 0.4 },
    buffs: [],

    // Охрана — призраки вокруг мага
    guards: { mobs: ['ghost'], count: 4, interval: 15, max: 10 },

    // AoE не нужен — он и так стреляет фаерболами
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
};

// ───────────────────────────────────────────────────────────────────────
//  Дефолтные паттерны по грейду (если у босса не задан aoe/guards)
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
//  createBoss — собирает боевой объект из записи BOSSES[id]
// ───────────────────────────────────────────────────────────────────────
export function createBoss(bossId, x, y, mult = 1) {
  const def = BOSSES[bossId];
  if (!def) {
    console.warn('[bosses] unknown boss id:', bossId);
    return null;
  }

  const grade = def.grade || 'ng';
  const guards = def.guards || GUARD_CALL[grade] || GUARD_CALL.ng;

  // Статы: base × zone.mult × statMult + statBonus
  const sm = def.statMult || {};
  const sb = def.statBonus || {};

  const hp  = Math.floor(def.hp * mult * (sm.hp || 1)) + (sb.hp || 0);
  const atk = Math.floor(def.attack * Math.sqrt(mult) * (sm.attack || 1)) + (sb.attack || 0);
  const xp  = Math.floor(def.xp * Math.sqrt(mult) * (sm.xp || 1));

  return {
    id: def.id,
    defId: def.id,
    grade,
    name: def.name,
    emoji: def.emoji,
    boss: true,
    team: 'enemy',
    hp, maxHp: hp,
    attack: atk,
    speed: def.speed,
    xp,
    size: def.size,
    x, y,
    aggro: true,
    attackCd: 0,
    spawnAnim: 0.6,
    hitFlash: 0,
    dead: false,

    // Дальний бой (если задан)
    attackRange: def.attackRange || 1.5,
    attackProjectile: def.attackProjectile || null,
    keepDistance: def.keepDistance || false,

    // Бонусные статы
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

    // Скиллы (в боевом формате)
    skills: (def.skills || []).map(s => ({
      id: s.id,
      level: Math.max(1, Math.min(100, s.level || 1)),
      cd: s.cd || 10,
      cdLeft: s.cd || 10,
      when: s.when || 'always',
    })),

    // Постоянные баффы
    activeBuffs: (def.buffs || []).reduce((acc, type) => {
      acc[type] = Date.now() + 999_999_999;
      return acc;
    }, {}),

    // Резисты
    resists: { ...(def.resists || {}) },

    // Охрана
    _guardsConfig: guards,

    // AoE
    aoeTimer: 2 + Math.random() * 2,
    castGlow: 0,
    _customAoe: def.aoe || null,

    // Таймер призыва охраны
    guardTimer: guards.interval || 15,
    guardsSpawned: 0,
  };
}

// ───────────────────────────────────────────────────────────────────────
//  castBossAoe — без изменений
// ───────────────────────────────────────────────────────────────────────
export function castBossAoe(boss, hero) {
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