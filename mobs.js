import { MOBS, CHAMPION } from './config.js';

let nextGroupId = 1;

export function createMob(def, x, y, mult = 1, opts = {}) {
  const isChampion = opts.champion || false;
  const aggroRange = opts.aggroRange ?? 5;
  const wanderTime = opts.wander ?? 1.5;

  const hpMult = isChampion ? CHAMPION.hpMult : 1;
  const atkMult = isChampion ? CHAMPION.attackMult : 1;
  const rewardMult = isChampion ? CHAMPION.rewardMult : 1;
  const xpMult = isChampion ? CHAMPION.xpMult : 1;

  return {
    id: def.id,
    name: isChampion ? '⭐ ' + def.name : def.name,
    emoji: def.emoji,
    hp: Math.floor(def.hp * mult * hpMult),
    maxHp: Math.floor(def.hp * mult * hpMult),
    attack: Math.floor(def.attack * Math.sqrt(mult) * atkMult),
    speed: def.speed,
    reward: Math.floor(def.reward * Math.sqrt(mult) * rewardMult),
    xp: Math.floor(def.xp * Math.sqrt(mult) * xpMult),
    size: def.size * (isChampion ? 1.25 : 1),
    champion: isChampion,
    x, y,
    groupId: opts.groupId || null,
    aggroRange,
    aggro: false,
    wanderX: 0, wanderY: 0,
    wanderTimer: Math.random() * wanderTime,
    wanderTime,
    spawnAnim: 0.3,
    hitFlash: 0,
    attackCd: 0,
    dead: false,
     facing: 1,
        facingAngle: 0,       // целевой угол
    renderAngle: 0,       // текущий (плавный)

  };
}

export function createGroupId() { return nextGroupId++; }

export function pickMobDefFromZone(zone) {
  const id = zone.mobs[Math.floor(Math.random() * zone.mobs.length)];
  return MOBS[id] || MOBS.gremlin;
}

export function updateMob(m, dt, hero, heroX, heroY) {
  if (m.dead) return null;
  if (m.spawnAnim > 0) m.spawnAnim -= dt;
  if (m.hitFlash > 0) m.hitFlash -= dt;
  m.attackCd -= dt;

  const dx = heroX - m.x, dy = heroY - m.y;
  const dist = Math.hypot(dx, dy) || 1;
    // Угол к герою (для top-down)
  m.facingAngle = Math.atan2(dy, dx);

  if (!m.aggro && dist < m.aggroRange) m.aggro = true;

    if (m.aggro) {
    if (dist > 0.8) {
      m.x += dx/dist * m.speed * dt;
      m.y += dy/dist * m.speed * dt;
      if (Math.abs(dx) > 0.1) m.facing = dx > 0 ? 1 : -1;
    } else if (m.attackCd <= 0) {
      m.attackCd = 1.0;
      return 'attack';
    }
  } else {
    // Настройка из зоны (cities.js → spawn.safeRadius)
    const safeRadius = window.__zoneSafeRadius ?? 4;

    const toHeroX = heroX - m.x;
    const toHeroY = heroY - m.y;
    const toHeroDist = Math.hypot(toHeroX, toHeroY) || 1;

    if (toHeroDist < safeRadius) {
      // Слишком близко к герою — отходим в противоположную сторону
      m.x -= toHeroX / toHeroDist * m.speed * 0.8 * dt;
      m.y -= toHeroY / toHeroDist * m.speed * 0.8 * dt;
      m.facingAngle = Math.atan2(-toHeroY, -toHeroX);
    } else {
      // Обычное блуждание
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        m.wanderTimer = m.wanderTime * (0.5 + Math.random());
        const a = Math.random() * Math.PI * 2;
        m.wanderX = Math.cos(a);
        m.wanderY = Math.sin(a);
        if (Math.random() < 0.4) { m.wanderX = 0; m.wanderY = 0; }
      }

      // Проверяем, не ведёт ли wander к герою
      const nextX = m.x + m.wanderX * m.speed * 0.5 * dt;
      const nextY = m.y + m.wanderY * m.speed * 0.5 * dt;
      const nextDist = Math.hypot(heroX - nextX, heroY - nextY);

      if (nextDist < safeRadius) {
        // Wander ведёт к герою — разворачиваемся
        m.wanderX = -m.wanderX;
        m.wanderY = -m.wanderY;
      }

      if (Math.abs(m.wanderX) > 0.1) m.facing = m.wanderX > 0 ? 1 : -1;
      if (m.wanderX !== 0 || m.wanderY !== 0) {
        m.facingAngle = Math.atan2(m.wanderY, m.wanderX);
      }

      m.x += m.wanderX * m.speed * 0.5 * dt;
      m.y += m.wanderY * m.speed * 0.5 * dt;
    }
  }

  // === ПЛАВНЫЙ ПОВОРОТ ===
  // Кратчайший угол между renderAngle и facingAngle
  let diff = m.facingAngle - m.renderAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  // Скорость поворота: 8 рад/сек ≈ 0.13 сек на 180°
  const turnSpeed = 8;
  const maxStep = turnSpeed * dt;
  if (Math.abs(diff) < maxStep) {
    m.renderAngle = m.facingAngle;
  } else {
    m.renderAngle += Math.sign(diff) * maxStep;
  }

  return null;
}

export function aggroGroup(allMobs, groupId) {
  if (!groupId) return;
  for (const m of allMobs) if (m.groupId === groupId) m.aggro = true;
}