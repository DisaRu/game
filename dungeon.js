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

  // ── Ищем лаир с боссом в зоне ──
  let bossId = null;
  if (zone.lairs && zone.lairs.length > 0) {
    for (const lair of zone.lairs) {
      if (lair.bosses && lair.bosses.length > 0) {
        bossId = lair.bosses[0].id;
        break;
      }
    }
  }

  // Fallback по грейду города, если в лаирах боссов нет
  if (!bossId) {
    const FALLBACK_BOSSES = {
      ng: 'gremlin_king',
      d:  'pirate_captain',
      c:  'fire_mage',
      b:  'skeleton_lord_boss',
      a:  'dragon',
      s:  'ice_golem',
    };
    bossId = FALLBACK_BOSSES[cityGrade] || 'gremlin_king';
  }

const bx = 25, by = 25;   // ближе к центру
  // Пробуем создать босса — если не получилось, fallback на gremlin_king
  dungeon.boss = createBoss(bossId, bx, by, zone.mult);
  if (!dungeon.boss) {
    console.warn('[dungeon] createBoss("' + bossId + '") вернул null, fallback на gremlin_king');
    dungeon.boss = createBoss('gremlin_king', bx, by, zone.mult);
  }

  // Если и gremlin_king не создался — что-то совсем плохо
  if (!dungeon.boss) {
    console.error('[dungeon] не удалось создать ни одного босса!');
    return dungeon;
  }

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
  // Собираем список мобов зоны из всех лаиров
  let mobPool = [];
  if (zone.lairs && zone.lairs.length > 0) {
    for (const lair of zone.lairs) {
      if (lair.mobs) mobPool = mobPool.concat(lair.mobs);
    }
  }
  // Fallback — старая структура
  if (mobPool.length === 0 && Array.isArray(zone.mobs)) {
    mobPool = zone.mobs;
  }
  // Крайний fallback
  if (mobPool.length === 0) mobPool = ['gremlin'];

  const mobDefId = mobPool[Math.floor(Math.random() * mobPool.length)];
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