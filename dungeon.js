import { CITIES } from './cities.js';
import { createBoss, GUARD_CALL } from './bosses.js';
import { createMob, createGroupId } from './mobs.js';
import { MOBS } from './config.js';

const PORTAL_RESPAWN_MIN = 20 * 60 * 1000;
const PORTAL_RESPAWN_MAX = 40 * 60 * 1000;
const PORTAL_RESPAWN_TEST = 60 * 1000;

export function createPortal() {
  return { x: 12, y: 18, active: true, respawnAt: 0, pulse: 0 };
}

export function spawnPortalInZone(zone) {
  const portal = createPortal();
  portal.x = 3 + Math.random() * 18;
  portal.y = 3 + Math.random() * 30;
  return portal;
}

export function updatePortal(portal, dt, isDungeonActive) {
  if (!portal) return;
  portal.pulse += dt * 3;
  if (isDungeonActive) { portal.active = false; return; }
  if (!portal.active) {
    portal.respawnAt -= dt * 1000;
    if (portal.respawnAt <= 0) {
      portal.active = true;
      portal.x = 3 + Math.random() * 18;
      portal.y = 3 + Math.random() * 30;
    }
  }
}

export function getPortalCooldown() {
  return PORTAL_RESPAWN_TEST;
}

// Создать данж: 5 охранных мобов + босс
export function createDungeon(zone, cityId) {
  const cityGrade = CITIES[cityId]?.grade || 'ng';
  const dungeon = {
    cityId,
    cityGrade,
    zone,
    mobs: [],
    boss: null,
    aoeList: [],
    cleared: false,
  };

  const bx = 12, by = 18;
  dungeon.boss = createBoss(cityGrade, bx, by, zone.mult);

  // Начальная охрана — 5 мобов
  const groupId = createGroupId();
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const mx = bx + Math.cos(angle) * 4;
    const my = by + Math.sin(angle) * 4;
    dungeon.mobs.push(spawnGuard(zone, mx, my, groupId));
  }

  return dungeon;
}

// Создать одного моба-охрану
export function spawnGuard(zone, x, y, groupId) {
  const mobDefId = zone.mobs[Math.floor(Math.random() * zone.mobs.length)];
  const def = MOBS[mobDefId] || MOBS.gremlin;
  const m = createMob(def, x, y, zone.mult, {
    aggroRange: 99,
    wander: 0.5,
    champion: false,
    groupId,
  });
  m.dungeonGuard = true;
  return m;
}

// Дроп с босса
export function rollBossDrops(hero, zone, cityGrade) {
  const drops = { gold: 0, buffs: [], blessed: 0, item: null };

  const baseReward = 30;
  drops.gold = Math.floor(baseReward * zone.mult * 20);

  const buffCount = 1 + Math.floor(Math.random() * 2);
  const types = ['attack','crit','speed','range'];
  for (let i = 0; i < buffCount; i++) {
    drops.buffs.push(types[Math.floor(Math.random() * types.length)]);
  }

  if (Math.random() < 0.20) drops.blessed = 1;

  if (Math.random() < 0.20) {
    const gradeOrder = ['ng','d','c','b','a','s'];
    const idx = gradeOrder.indexOf(cityGrade);
    const nextGrade = gradeOrder[Math.min(idx + 1, gradeOrder.length - 1)];
    drops.item = nextGrade;
  }

  return drops;
}