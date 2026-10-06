// ============================================================
// ГОРОДА И ЗОНЫ
// ============================================================
//
// Каждая зона имеет блок spawn с настройками мобов:
//
//   maxMobs       — максимум мобов в зоне одновременно
//   interval      — секунд между попытками спавна (меньше = чаще)
//   aggroRange    — радиус агра (0 = пассивные, 99 = агрятся сразу)
//   wander        — секунд между сменой направления блуждания
//   groupChance   — шанс спавна группы 3–5 мобов вместо одного (0..1)
//   champChance   — шанс чемпиона ×3 HP / ×3 награда (0..1)
//
//   minSpawnDist  — минимум клеток от героя при спавне (мобы не появляются рядом)
//   safeRadius    — дистанция, ближе которой моб не подходит (0 = лезет вплотную)
//
// ============================================================

export const CITIES = {
  talking_island: {
    id:'talking_island', name:'Talking Island', sub:'Стартовый остров', grade:'ng', tier:1,
    bg:'#1a2a10', bgImage:'sprites/bg/ground.png',
    zones: [
      { id:'ti_easy', name:'Поля Гремлинов', diff:'easy', mult:1, mobs:['gremlin','keltir'],
        teleportCost:50,
        spawn:{
          maxMobs:145,        // много мобов — новичкам весело
          interval:1.0,      // спавн раз в секунду
          aggroRange:10,      // почти не агрятся
          wander:15,        // лениво блуждают
          groupChance:0.1,  // часто группами
          champChance:0.05,  // чемпионы редки
          minSpawnDist:1,    // спавн не ближе 8 клеток
          safeRadius:0,      // мобы обходят героя на 4 клетки
        } },

      { id:'ti_medium', name:'Лес Кельтиров', diff:'medium', mult:3, mobs:['keltir','werewolf'],
        teleportCost:150,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,      // средний агр
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'ti_hard', name:'Пещера Оборотней', diff:'hard', mult:8, mobs:['werewolf','golem'],
        teleportCost:400,
        spawn:{
          maxMobs:60,
          interval:0.8,      // частый спавн
          aggroRange:99,     // агрятся сразу
          wander:0.5,        // почти не блуждают
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:6,    // появляются ближе
          safeRadius:2,      // лезут почти вплотную
        } },
    ],
  },

  giran: {
    id:'giran', name:'Giran', sub:'Портовый город', grade:'d', tier:2,
    bg:'#0f1a2a', bgImage:'sprites/bg/grass.png',
    zones: [
      { id:'gi_easy', name:'Порт', diff:'easy', mult:6, mobs:['orc','skeleton'],
        teleportCost:100,
        spawn:{
          maxMobs:25,
          interval:2.0,
          aggroRange:3,
          wander:1.5,
          groupChance:0.15,
          champChance:0.05,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'gi_medium', name:'Болото', diff:'medium', mult:18, mobs:['skeleton','spider'],
        teleportCost:300,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:7,
          safeRadius:3,
        } },

      { id:'gi_hard', name:'Руины', diff:'hard', mult:45, mobs:['ghost','golem'],
        teleportCost:800,
        spawn:{
          maxMobs:60,
          interval:0.8,
          aggroRange:99,
          wander:0.5,
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:5,
          safeRadius:1,
        } },
    ],
  },

  dion: {
    id:'dion', name:'Dion', sub:'Поля и фермы', grade:'c', tier:3,
    bg:'#2a1a10',
    zones: [
      { id:'di_easy', name:'Фермы', diff:'easy', mult:30, mobs:['spider','warg'],
        teleportCost:150,
        spawn:{
          maxMobs:25,
          interval:2.0,
          aggroRange:3,
          wander:1.5,
          groupChance:0.15,
          champChance:0.05,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'di_medium', name:'Поля', diff:'medium', mult:80, mobs:['warg','ghost'],
        teleportCost:450,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:7,
          safeRadius:3,
        } },

      { id:'di_hard', name:'Паучье логово', diff:'hard', mult:200, mobs:['ghost','golem'],
        teleportCost:1200,
        spawn:{
          maxMobs:60,
          interval:0.8,
          aggroRange:99,
          wander:0.5,
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:5,
          safeRadius:1,
        } },
    ],
  },

  oren: {
    id:'oren', name:'Oren', sub:'Лес и руины', grade:'b', tier:4,
    bg:'#1a0f2a',
    zones: [
      { id:'or_easy', name:'Тёмный лес', diff:'easy', mult:150, mobs:['golem','ghost'],
        teleportCost:200,
        spawn:{
          maxMobs:25,
          interval:2.0,
          aggroRange:3,
          wander:1.5,
          groupChance:0.15,
          champChance:0.05,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'or_medium', name:'Древние руины', diff:'medium', mult:400, mobs:['ghost','demon'],
        teleportCost:600,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:7,
          safeRadius:3,
        } },

      { id:'or_hard', name:'Шахта големов', diff:'hard', mult:1000, mobs:['golem','demon'],
        teleportCost:1500,
        spawn:{
          maxMobs:60,
          interval:0.8,
          aggroRange:99,
          wander:0.5,
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:5,
          safeRadius:1,
        } },
    ],
  },

  aden: {
    id:'aden', name:'Aden', sub:'Столица', grade:'a', tier:5,
    bg:'#2a0a0a',
    zones: [
      { id:'ad_easy', name:'Предместья', diff:'easy', mult:800, mobs:['demon','dragon'],
        teleportCost:300,
        spawn:{
          maxMobs:25,
          interval:2.0,
          aggroRange:3,
          wander:1.5,
          groupChance:0.15,
          champChance:0.05,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'ad_medium', name:'Столичные поля', diff:'medium', mult:2000, mobs:['dragon','demon'],
        teleportCost:800,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:7,
          safeRadius:3,
        } },

      { id:'ad_hard', name:'Драконье логово', diff:'hard', mult:5000, mobs:['dragon'],
        teleportCost:2000,
        spawn:{
          maxMobs:60,
          interval:0.8,
          aggroRange:99,
          wander:0.5,
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:5,
          safeRadius:1,
        } },
    ],
  },

  goddard: {
    id:'goddard', name:'Goddard', sub:'Ледяные земли', grade:'s', tier:6,
    bg:'#0a1a2a',
    zones: [
      { id:'gd_easy', name:'Ледяные поля', diff:'easy', mult:4000, mobs:['ice_golem','archdemon'],
        teleportCost:500,
        spawn:{
          maxMobs:25,
          interval:2.0,
          aggroRange:3,
          wander:1.5,
          groupChance:0.15,
          champChance:0.05,
          minSpawnDist:8,
          safeRadius:4,
        } },

      { id:'gd_medium', name:'Замёрзшие руины', diff:'medium', mult:10000, mobs:['ice_golem','archdemon'],
        teleportCost:1500,
        spawn:{
          maxMobs:40,
          interval:1.4,
          aggroRange:6,
          wander:1.0,
          groupChance:0.25,
          champChance:0.08,
          minSpawnDist:7,
          safeRadius:3,
        } },

      { id:'gd_hard', name:'Логово архидемонов', diff:'hard', mult:25000, mobs:['archdemon','dragon'],
        teleportCost:4000,
        spawn:{
          maxMobs:60,
          interval:0.8,
          aggroRange:99,
          wander:0.5,
          groupChance:0.35,
          champChance:0.12,
          minSpawnDist:5,
          safeRadius:1,
        } },
    ],
  },
};

export const CITY_ORDER = ['talking_island','giran','dion','oren','aden','goddard'];

export function cityTeleportCost(fromTier, toTier) {
  const diff = Math.abs(fromTier - toTier);
  if (diff === 0) return 0;
  return [0, 200, 500, 1200, 3000, 7500][diff] || 10000;
}

export function findZone(cityId, zoneId) {
  const city = CITIES[cityId];
  if (!city) return null;
  return city.zones.find(z => z.id === zoneId);
}

export function zoneDifficultyLabel(diff) {
  if (diff === 'easy')   return '🟢 Лёгкая';
  if (diff === 'medium') return '🟡 Средняя';
  return '🔴 Сложная';
}