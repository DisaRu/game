export const CITIES = {
  talking_island: {
    id:'talking_island', name:'Talking Island', sub:'Стартовый остров', grade:'ng', tier:1,
    bg:'#1a2a10',
    zones: [
      { id:'ti_easy',   name:'Поля Гремлинов',   diff:'easy',   mult:1,  mobs:['gremlin','keltir'],
        teleportCost:50,  spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'ti_medium', name:'Лес Кельтиров',    diff:'medium', mult:3,  mobs:['keltir','werewolf'],
        teleportCost:150, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'ti_hard',   name:'Пещера Оборотней', diff:'hard',   mult:8,  mobs:['werewolf','golem'],
        teleportCost:400, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
    ],
  },
  giran: {
    id:'giran', name:'Giran', sub:'Портовый город', grade:'d', tier:2,
    bg:'#0f1a2a',
    zones: [
      { id:'gi_easy',   name:'Порт',   diff:'easy',   mult:6,  mobs:['orc','skeleton'],
        teleportCost:100, spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'gi_medium', name:'Болото', diff:'medium', mult:18, mobs:['skeleton','spider'],
        teleportCost:300, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'gi_hard',   name:'Руины',  diff:'hard',   mult:45, mobs:['ghost','golem'],
        teleportCost:800, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
    ],
  },
  dion: {
    id:'dion', name:'Dion', sub:'Поля и фермы', grade:'c', tier:3,
    bg:'#2a1a10',
    zones: [
      { id:'di_easy',   name:'Фермы',        diff:'easy',   mult:30,  mobs:['spider','warg'],
        teleportCost:150, spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'di_medium', name:'Поля',         diff:'medium', mult:80,  mobs:['warg','ghost'],
        teleportCost:450, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'di_hard',   name:'Паучье логово',diff:'hard',   mult:200, mobs:['ghost','golem'],
        teleportCost:1200, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
    ],
  },
  oren: {
    id:'oren', name:'Oren', sub:'Лес и руины', grade:'b', tier:4,
    bg:'#1a0f2a',
    zones: [
      { id:'or_easy',   name:'Тёмный лес',   diff:'easy',   mult:150,  mobs:['golem','ghost'],
        teleportCost:200, spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'or_medium', name:'Древние руины',diff:'medium', mult:400,  mobs:['ghost','demon'],
        teleportCost:600, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'or_hard',   name:'Шахта големов',diff:'hard',   mult:1000, mobs:['golem','demon'],
        teleportCost:1500, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
    ],
  },
  aden: {
    id:'aden', name:'Aden', sub:'Столица', grade:'a', tier:5,
    bg:'#2a0a0a',
    zones: [
      { id:'ad_easy',   name:'Предместья',      diff:'easy',   mult:800,  mobs:['demon','dragon'],
        teleportCost:300, spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'ad_medium', name:'Столичные поля',  diff:'medium', mult:2000, mobs:['dragon','demon'],
        teleportCost:800, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'ad_hard',   name:'Драконье логово', diff:'hard',   mult:5000, mobs:['dragon'],
        teleportCost:2000, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
    ],
  },
  goddard: {
    id:'goddard', name:'Goddard', sub:'Ледяные земли', grade:'s', tier:6,
    bg:'#0a1a2a',
    zones: [
      { id:'gd_easy',   name:'Ледяные поля',      diff:'easy',   mult:4000,  mobs:['ice_golem','archdemon'],
        teleportCost:500, spawn:{ maxMobs:25, interval:2.0, aggroRange:3, wander:1.5, groupChance:0.15, champChance:0.05 } },
      { id:'gd_medium', name:'Замёрзшие руины',   diff:'medium', mult:10000, mobs:['ice_golem','archdemon'],
        teleportCost:1500, spawn:{ maxMobs:40, interval:1.4, aggroRange:6, wander:1.0, groupChance:0.25, champChance:0.08 } },
      { id:'gd_hard',   name:'Логово архидемонов',diff:'hard',   mult:25000, mobs:['archdemon','dragon'],
        teleportCost:4000, spawn:{ maxMobs:60, interval:0.8, aggroRange:99, wander:0.5, groupChance:0.35, champChance:0.12 } },
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