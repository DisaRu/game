// ═══════════════════════════════════════════════════════════════════════
//  bosses.js — СПРАВОЧНИК БОССОВ
// ═══════════════════════════════════════════════════════════════════════
//
//  Поля босса:
//    id, name, emoji, grade        — идентификация
//    hp, attack, speed, xp, size   — базовые статы (× zone.mult)
//    statMult{}                    — множители: { hp: 1.5, attack: 1.2 }
//    statBonus{}                   — плоские:   { defense: 100, critChance: 20 }
//    buffs[]                       — постоянные баффы (id из BUFF_SCROLLS)
//    skills[]                      — [{ id, level, cd, when }] (id из SKILLS)
//    resists{}                     — резисты: { stun: 0.7 }
//    guards{}                      — { mobs[], count, interval, max }
//    aoe{}                         — { dmgPercent, interval:[min,max], shake, types[] }
//    drops[]                       — таблица дропа
//    attackRange / attackProjectile / keepDistance — для рейндж-боссов
//
// ═══════════════════════════════════════════════════════════════════════

export const BOSSES = {

  // ═════════════════════════════════════════════════════════════════════
  //  КОРОЛЬ ГРЕМЛИНОВ — мили-босс первой зоны
  // ═════════════════════════════════════════════════════════════════════
  gremlin_king: {
    id: 'gremlin_king',
    name: 'Король гремлинов',
    emoji: '👑',
    grade: 'ng',
    hp: 5000, attack: 50, speed: 0.6, xp: 200, size: 2.5,
    statBonus: { defense: 20, hp: 200 },
    buffs: ['attack'],
    skills: [
      { id: 'fireball', level: 20, cd: 2 },
      { id: 'heal',     level: 30, cd: 25, when: 'hp_below_50' },
      { id: 'haste',    level: 20, cd: 10, when: 'hp_above_70' },
    ],
    resists: { stun: 0.3, slow: 0.2 },
    guards: { mobs: ['keltir'], count: 5, interval: 15, max: 10 },
    aoe: { dmgPercent: 0.20, interval: [6, 8], shake: 2, types: ['circle', 'marker'] },
    drops: [
      { id:'gold',             chance:1.0,  min:500, max:1000 },
      { id:'scroll_weapon_ng', chance:0.5,  min:5,   max:15   },
      { id:'scroll_armor_ng',  chance:0.5,  min:5,   max:15   },
      { id:'blessed_scroll',   chance:0.2,  min:1,   max:3    },
      { id:'book_double_shot', chance:0.15, min:1,   max:1    },
      { id:'book_heal',        chance:0.15, min:1,   max:1    },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ОГНЕННЫЙ МАГ — рейндж-босс (стреляет фаерболами)
  // ═════════════════════════════════════════════════════════════════════
  fire_mage: {
    id: 'fire_mage',
    name: 'Огненный маг',
    emoji: '🧙',
    grade: 'c',
    hp: 12000, attack: 80, speed: 0.5, xp: 1000, size: 1.3,
    attackRange: 8,
    attackProjectile: { type: 'staff', color: '#f97316', speed: 12 },
    keepDistance: true,
    statBonus: { critChance: 20, critDamage: 40 },
    buffs: [],
    skills: [
      { id: 'fireball',      level: 60, cd: 3 },
      { id: 'meteor',        level: 60, cd: 20 },
      { id: 'arcane_shield', level: 60, cd: 30, when: 'hp_below_60' },
      { id: 'heal',          level: 60, cd: 25, when: 'hp_below_40' },
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
  //  ВОЖДЬ КЕЛЬТИРОВ — босс ti_medium
  // ═════════════════════════════════════════════════════════════════════
  keltir_alpha: {
    id: 'keltir_alpha',
    name: 'Вождь кельтиров',
    emoji: '🐺',
    grade: 'ng',
    hp: 1800, attack: 22, speed: 0.8, xp: 180, size: 1.4,
    statBonus: { critChance: 10, dodge: 5 },
    buffs: ['speed'],
    skills: [
      { id: 'slow_arrow', level: 30, cd: 8 },
      { id: 'dodge',      level: 40, cd: 15, when: 'hp_below_50' },
    ],
    resists: { slow: 0.3 },
    guards: { mobs: ['direwolf'], count: 4, interval: 15, max: 8 },
    aoe: { dmgPercent: 0.20, interval: [6, 8], shake: 2, types: ['circle', 'marker'] },
    drops: [
      { id:'gold',             chance:1.0, min:400, max:900 },
      { id:'scroll_weapon_ng', chance:0.5, min:5,   max:12  },
      { id:'scroll_armor_ng',  chance:0.5, min:5,   max:12  },
      { id:'blessed_scroll',   chance:0.2, min:1,   max:2   },
      { id:'arena_pass',       chance:1.0, min:1,   max:1   },
      { id:'book_slow_arrow',  chance:0.2, min:1,   max:1   },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ТРОЛЛЬ-ВОЖДЬ — босс ti_hard
  // ═════════════════════════════════════════════════════════════════════
  troll_chief: {
    id: 'troll_chief',
    name: 'Тролль-вождь',
    emoji: '🧌',
    grade: 'ng',
    hp: 2500, attack: 28, speed: 0.6, xp: 250, size: 1.5,
    statBonus: { defense: 20, hp: 300 },
    buffs: ['attack'],
    skills: [
      { id: 'power_shot', level: 30, cd: 8 },
      { id: 'berserk',    level: 40, cd: 30, when: 'hp_below_50' },
    ],
    resists: { stun: 0.3 },
    guards: { mobs: ['stone_golem'], count: 5, interval: 15, max: 10 },
    aoe: { dmgPercent: 0.22, interval: [6, 8], shake: 3, types: ['circle', 'marker', 'line'] },
    drops: [
      { id:'gold',             chance:1.0, min:600, max:1200 },
      { id:'scroll_weapon_ng', chance:0.6, min:6,   max:15   },
      { id:'scroll_armor_ng',  chance:0.6, min:6,   max:15   },
      { id:'blessed_scroll',   chance:0.25, min:1,  max:3    },
      { id:'arena_pass',       chance:1.0, min:1,   max:1    },
      { id:'book_power_shot',  chance:0.2, min:1,   max:1    },
    ],
      // ─── TI medium ───
  stone_golem_king: {
    id:'stone_golem_king', name:'Король големов', emoji:'🗿',
    grade:'ng', hp:3000, attack:35, speed:0.5, xp:280, size:1.6,
    statBonus:{ defense:40, hp:400 },
    buffs:['attack'],
    skills:[{ id:'stun', level:30, cd:12 }, { id:'heal', level:30, cd:30, when:'hp_below_50' }],
    resists:{ stun:0.3 },
    guards:{ mobs:['stone_golem'], count:6, interval:12, max:12 },
    aoe:{ dmgPercent:0.22, interval:[6,8], shake:3, types:['circle','marker'] },
    drops:[
      { id:'gold',            chance:1.0, min:800, max:1500 },
      { id:'scroll_weapon_ng',chance:0.6, min:8,   max:18   },
      { id:'scroll_armor_ng', chance:0.6, min:8,   max:18   },
      { id:'blessed_scroll',  chance:0.3, min:1,   max:3    },
      { id:'arena_pass',      chance:1.0, min:1,   max:2    },
      { id:'book_iron_skin',  chance:0.25,min:1,   max:1    },
    ],
  },

  // ─── TI hard ───
  cave_lord: {
    id:'cave_lord', name:'Владыка пещеры', emoji:'👹',
    grade:'ng', hp:4000, attack:42, speed:0.7, xp:350, size:1.7,
    statBonus:{ defense:25, critChance:15 },
    buffs:['attack','speed'],
    skills:[{ id:'berserk', level:40, cd:25, when:'hp_below_40' }, { id:'stun', level:40, cd:15 }],
    resists:{ stun:0.4 },
    guards:{ mobs:['werewolf'], count:6, interval:12, max:14 },
    aoe:{ dmgPercent:0.25, interval:[6,8], shake:4, types:['circle','marker','line'] },
    drops:[
      { id:'gold',            chance:1.0, min:1000, max:2000 },
      { id:'scroll_weapon_d', chance:0.5, min:5,   max:12   },
      { id:'scroll_armor_d',  chance:0.5, min:5,   max:12   },
      { id:'blessed_scroll',  chance:0.35,min:2,   max:4    },
      { id:'arena_pass',      chance:1.0, min:1,   max:2    },
      { id:'book_stun_shot',  chance:0.25,min:1,   max:1    },
    ],
  },

  // ─── Giran easy ───
  pirate_captain: {
    id:'pirate_captain', name:'Капитан пиратов', emoji:'🏴‍☠️',
    grade:'d', hp:6000, attack:60, speed:0.6, xp:600, size:1.5,
    statBonus:{ critChance:20, dodge:10 },
    buffs:['attack'],
    skills:[{ id:'stun', level:50, cd:10 }, { id:'heal', level:50, cd:30, when:'hp_below_50' }],
    resists:{ stun:0.3 },
    guards:{ mobs:['orc'], count:5, interval:12, max:10 },
    aoe:{ dmgPercent:0.28, interval:[5,7], shake:4, types:['circle','marker','line'] },
    drops:[
      { id:'gold',            chance:1.0, min:5000, max:10000 },
      { id:'scroll_weapon_d', chance:0.6, min:10,  max:20    },
      { id:'scroll_armor_d',  chance:0.6, min:10,  max:20    },
      { id:'blessed_scroll',  chance:0.4, min:3,   max:6     },
      { id:'arena_pass',      chance:1.0, min:2,   max:3     },
      { id:'book_power_shot', chance:0.3, min:1,   max:1     },
    ],
  },

  // ─── Giran medium ───
  swamp_witch: {
    id:'swamp_witch', name:'Болотная ведьма', emoji:'🧙‍♀️',
    grade:'d', hp:8000, attack:75, speed:0.5, xp:800, size:1.4,
    attackRange: 8, attackProjectile:{ type:'staff', color:'#a855f7', speed:12 },
    keepDistance:true,
    statBonus:{ critChance:15 },
    buffs:['attack','crit'],
    skills:[{ id:'fireball', level:50, cd:4 }, { id:'frost', level:50, cd:12 }, { id:'heal', level:50, cd:25 }],
    resists:{ silence:0.5 },
    guards:{ mobs:['spider'], count:4, interval:12, max:10 },
    aoe:{ dmgPercent:0.28, interval:[5,7], shake:4, types:['circle','marker','ring'] },
    drops:[
      { id:'gold',            chance:1.0, min:7000, max:14000 },
      { id:'scroll_weapon_d', chance:0.6, min:12,  max:25    },
      { id:'scroll_armor_d',  chance:0.6, min:12,  max:25    },
      { id:'blessed_scroll',  chance:0.45,min:4,   max:8     },
      { id:'arena_pass',      chance:1.0, min:2,   max:4     },
      { id:'book_fireball',   chance:0.3, min:1,   max:1     },
    ],
  },

  orc_warlord: {
    id:'orc_warlord', name:'Орочий военачальник', emoji:'👹',
    grade:'d', hp:12000, attack:100, speed:0.7, xp:1100, size:1.7,
    statBonus:{ defense:40, critChance:20, critDamage:30 },
    buffs:['attack','crit'],
    skills:[{ id:'berserk', level:60, cd:20, when:'hp_below_50' }, { id:'stun', level:60, cd:12 }],
    resists:{ stun:0.4, slow:0.3 },
    guards:{ mobs:['orc_shaman'], count:6, interval:12, max:14 },
    aoe:{ dmgPercent:0.30, interval:[5,7], shake:5, types:['circle','marker','line','ring'] },
    drops:[
      { id:'gold',            chance:1.0, min:12000, max:24000 },
      { id:'scroll_weapon_d', chance:0.7, min:15,  max:30    },
      { id:'scroll_weapon_c', chance:0.3, min:2,   max:5     },
      { id:'blessed_scroll',  chance:0.5, min:5,   max:10    },
      { id:'arena_pass',      chance:1.0, min:3,   max:5     },
      { id:'book_berserk',    chance:0.35,min:1,   max:1     },
    ],
  },

  // ─── Giran hard ───
  skeleton_lord_boss: {
    id:'skeleton_lord_boss', name:'Король-лич', emoji:'☠️',
    grade:'c', hp:20000, attack:150, speed:0.6, xp:2000, size:1.7,
    attackRange: 7, attackProjectile:{ type:'staff', color:'#7f1d1d', speed:13 },
    statBonus:{ critChance:20, critDamage:40 },
    buffs:['attack','crit'],
    skills:[{ id:'fireball', level:60, cd:4 }, { id:'stun', level:60, cd:12 }, { id:'heal', level:60, cd:20 }],
    resists:{ stun:0.5, silence:0.4 },
    guards:{ mobs:['skeleton'], count:8, interval:10, max:20 },
    aoe:{ dmgPercent:0.32, interval:[4.5,6.5], shake:6, types:['circle','marker','line','ring','fire'] },
    drops:[
      { id:'gold',            chance:1.0, min:25000, max:50000 },
      { id:'scroll_weapon_c', chance:0.7, min:15,  max:30    },
      { id:'scroll_weapon_b', chance:0.2, min:2,   max:5     },
      { id:'blessed_scroll',  chance:0.55,min:6,   max:12    },
      { id:'arena_pass',      chance:1.0, min:3,   max:6     },
      { id:'book_meteor',     chance:0.2, min:1,   max:1     },
    ],
  },

  stone_colossus: {
    id:'stone_colossus', name:'Каменный колосс', emoji:'🗿',
    grade:'c', hp:30000, attack:180, speed:0.5, xp:2500, size:1.9,
    statBonus:{ defense:80, hp:2000 },
    buffs:['attack'],
    skills:[{ id:'stun', level:70, cd:10 }, { id:'heal', level:70, cd:30 }],
    resists:{ stun:0.6, slow:0.5 },
    guards:{ mobs:['golem'], count:8, interval:10, max:20 },
    aoe:{ dmgPercent:0.35, interval:[4.5,6.5], shake:6, types:['circle','marker','line','ring'] },
    drops:[
      { id:'gold',            chance:1.0, min:35000, max:70000 },
      { id:'scroll_weapon_c', chance:0.75,min:20,  max:40    },
      { id:'scroll_weapon_b', chance:0.3, min:3,   max:8     },
      { id:'blessed_scroll',  chance:0.6, min:8,   max:15    },
      { id:'arena_pass',      chance:1.0, min:4,   max:8     },
      { id:'book_last_stand', chance:0.25,min:1,   max:1     },
    ],
  },
  },
};

// ───────────────────────────────────────────────────────────────────────
//  Дефолтные паттерны по грейду
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

  const hp  = Math.floor(def.hp * mult * (sm.hp || 1)) + (sb.hp || 0);
  const atk = Math.floor(def.attack * Math.sqrt(mult) * (sm.attack || 1)) + (sb.attack || 0);
  const xp  = Math.floor(def.xp * Math.sqrt(mult) * (sm.xp || 1));

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
    attackRange: def.attackRange || 1.5,
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
    skills: (def.skills || []).map(s => ({
      id: s.id,
      level: Math.max(1, Math.min(100, s.level || 1)),
      cd: s.cd || 10,
      cdLeft: s.cd || 10,
      when: s.when || 'always',
    })),
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
  // Не кастуем, если герой слишком далеко от босса.
  // Иначе marker/line/fire появляются «по всей карте» — они строятся
  // от координат героя, а не босса, и босс «снайперит» через пол-локации.
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