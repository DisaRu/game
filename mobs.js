import { MOBS, CHAMPION } from './config.js';

let nextGroupId = 1;

export function createMob(def, x, y, mult = 1, opts = {}) {
  const isChampion = opts.champion || false;
  const aggroRange = opts.aggroRange ?? 5;
  const wanderTime = opts.wander ?? 1.5;

  const hpMult = isChampion ? CHAMPION.hpMult : 1;
  const atkMult = isChampion ? CHAMPION.attackMult : 1;
  const xpMult = isChampion ? CHAMPION.xpMult : 1;

  return {
    id: def.id,
    team: 'enemy',            // ← ДОБАВЬ ЭТУ СТРОКУ
    name: isChampion ? '⭐ ' + def.name : def.name,
    emoji: def.emoji,
    hp: Math.floor(def.hp * mult * hpMult),
    maxHp: Math.floor(def.hp * mult * hpMult),
    attack: Math.floor(def.attack * Math.sqrt(mult) * atkMult),
    speed: def.speed,
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
    facingAngle: 0,
    renderAngle: 0,

     // ===== ДЕБАФФЫ (скиллы) =====
        // ===== ДЕБАФФЫ (скиллы) =====
    stunUntil: 0,
    slowUntil: 0,
    slowMult: 1,
    attackSpeedDebuff: null,
    silenceUntil: 0,
    dots: [],

     // ===== ДАЛЬНИЙ БОЙ (опционально) =====
    attackRange: def.attackRange || 0.8,
    attackProjectile: def.attackProjectile || null,
    keepDistance: def.keepDistance || false,

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

  // ===== ЗАМЕДЛЕНИЕ АТАКИ (frost) =====
  let atkSpeedMult = 1;
  if (m.attackSpeedDebuff && m.attackSpeedDebuff.until > Date.now()) {
    atkSpeedMult = m.attackSpeedDebuff.mult || 1;
  }

  m.attackCd -= dt * atkSpeedMult;

  // ===== СТАН =====
  if (m.stunUntil && m.stunUntil > Date.now()) return null;

  // ===== ЗАМЕДЛЕНИЕ =====
  let speedMult = 1;
  if (m.slowUntil && m.slowUntil > Date.now()) {
    speedMult = m.slowMult ?? 1;
  }

  const dx = heroX - m.x, dy = heroY - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  m.facingAngle = Math.atan2(dy, dx);

  // Агро
  // Пробуждение: через 2 сек после спавна включаем aggroRange
  if (m._aggroWakeAt && Date.now() >= m._aggroWakeAt) {
    m.aggroRange = m._wakeAggroRange || m.aggroRange;
    m._aggroWakeAt = 0;
  }
  if (!m.aggro && m.aggroRange > 0 && dist < m.aggroRange) m.aggro = true;

  // Если моб далеко от лаира и не агрится — идёт домой
  if (m.lairCx !== undefined && !m.aggro) {
    const homeDist = Math.hypot(m.x - m.lairCx, m.y - m.lairCy);
    if (homeDist > m.lairRadius * 1.5) {
      const hx = m.lairCx - m.x, hy = m.lairCy - m.y;
      const hd = Math.hypot(hx, hy) || 1;
      m.x += hx / hd * m.speed * dt;
      m.y += hy / hd * m.speed * dt;
      return null;
    }
  }

  if (m.aggro) {
    // Дистанция автоатаки: у мили 0.8, у рейнджа задаётся в MOBS[id].attackRange.
    const attackRange = m.attackRange || 0.8;

    if (dist > attackRange) {
      // Подходим к цели
      m.x += dx/dist * m.speed * speedMult * dt;
      m.y += dy/dist * m.speed * speedMult * dt;
      if (Math.abs(dx) > 0.1) m.facing = dx > 0 ? 1 : -1;
    } else if (m.attackCd <= 0) {
      m.attackCd = 1.0;
      return 'attack';
    }

    // keepDistance: рейндж-моб отходит, если герой слишком близко
    if (m.keepDistance && dist < Math.max(2, attackRange * 0.4)) {
      m.x -= dx/dist * m.speed * 0.6 * speedMult * dt;
      m.y -= dy/dist * m.speed * 0.6 * speedMult * dt;
    }
  } else {
    const safeRadius = window.__zoneSafeRadius ?? 4;

    const toHeroX = heroX - m.x;
    const toHeroY = heroY - m.y;
    const toHeroDist = Math.hypot(toHeroX, toHeroY) || 1;

    if (toHeroDist < safeRadius) {
      m.x -= toHeroX / toHeroDist * m.speed * 0.8 * speedMult * dt;
      m.y -= toHeroY / toHeroDist * m.speed * 0.8 * speedMult * dt;
      m.facingAngle = Math.atan2(-toHeroY, -toHeroX);
    } else {
      m.wanderTimer -= dt;
      if (m.wanderTimer <= 0) {
        m.wanderTimer = m.wanderTime * (0.5 + Math.random());
        const a = Math.random() * Math.PI * 2;
        m.wanderX = Math.cos(a);
        m.wanderY = Math.sin(a);
        if (Math.random() < 0.4) { m.wanderX = 0; m.wanderY = 0; }
      }

      const nextX = m.x + m.wanderX * m.speed * 0.5 * speedMult * dt;
      const nextY = m.y + m.wanderY * m.speed * 0.5 * speedMult * dt;
      const nextDist = Math.hypot(heroX - nextX, heroY - nextY);

      if (nextDist < safeRadius) {
        m.wanderX = -m.wanderX;
        m.wanderY = -m.wanderY;
      }

      if (Math.abs(m.wanderX) > 0.1) m.facing = m.wanderX > 0 ? 1 : -1;
      if (m.wanderX !== 0 || m.wanderY !== 0) {
        m.facingAngle = Math.atan2(m.wanderY, m.wanderX);
      }

      m.x += m.wanderX * m.speed * 0.5 * speedMult * dt;
      m.y += m.wanderY * m.speed * 0.5 * speedMult * dt;
    }
  }

  // === ПЛАВНЫЙ ПОВОРОТ ===
  let diff = m.facingAngle - m.renderAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

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