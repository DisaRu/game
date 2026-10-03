import { MOBS, CONFIG } from './config.js';

let nextGroupId = 1;

export function createMob(def, x, y, groupId = null) {
  return {
    id: def.id, name: def.name, emoji: def.emoji,
    hp: def.hp, maxHp: def.hp, attack: def.attack,
    speed: def.speed, reward: def.reward, xp: def.xp,
    level: def.level || 1,
    size: def.size, x, y, groupId, aggro: false,
    wanderX: 0, wanderY: 0,
    wanderTimer: Math.random() * CONFIG.aggro.wanderChangeTime,
    spawnAnim: 0.3, hitFlash: 0, attackCd: 0, dead: false,
  };
}

export function createGroupId() { return nextGroupId++; }

export function pickMobDef(locationId) {
  const list = MOBS[locationId];
  return list[Math.floor(Math.random() * list.length)];
}

export function updateMob(m, dt, hero, heroX, heroY) {
  if (m.dead) return null;
  if (m.spawnAnim > 0) m.spawnAnim -= dt;
  if (m.hitFlash > 0) m.hitFlash -= dt;
  m.attackCd -= dt;

  const dx = heroX - m.x, dy = heroY - m.y;
  const dist = Math.hypot(dx, dy) || 1;

  if (!m.aggro && dist < CONFIG.aggro.range) m.aggro = true;

  if (m.aggro) {
    if (dist > 0.8) {
      m.x += (dx/dist) * m.speed * dt;
      m.y += (dy/dist) * m.speed * dt;
    } else if (m.attackCd <= 0) {
      m.attackCd = 1.0;
      return 'attack';
    }
  } else {
    m.wanderTimer -= dt;
    if (m.wanderTimer <= 0) {
      m.wanderTimer = CONFIG.aggro.wanderChangeTime * (0.5 + Math.random());
      const a = Math.random() * Math.PI * 2;
      m.wanderX = Math.cos(a); m.wanderY = Math.sin(a);
      if (Math.random() < 0.4) { m.wanderX = 0; m.wanderY = 0; }
    }
    m.x += m.wanderX * m.speed * 0.5 * dt;
    m.y += m.wanderY * m.speed * 0.5 * dt;
  }
  return null;
}

export function aggroGroup(allMobs, groupId) {
  if (!groupId) return;
  for (const m of allMobs) if (m.groupId === groupId) m.aggro = true;
}