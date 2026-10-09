import { MOBS, CHAMPION } from './config.js';
import { getMobXp } from './config.js';
let nextGroupId = 1;

export function createMob(def, x, y, mult = 1, opts = {}) {
  const isChampion = opts.champion || false;
  const aggroRange = opts.aggroRange ?? 5;
  const wanderTime = opts.wander ?? 1.5;
  const kite = opts.kite ?? 0;   // ← кайт из лейра

  const hpMult = isChampion ? CHAMPION.hpMult : 1;
  const atkMult = isChampion ? CHAMPION.attackMult : 1;
  const xpMult = isChampion ? CHAMPION.xpMult : 1;

  return {
    id: def.id,
    team: 'enemy',
    level: def.level || 1,
    name: isChampion ? '⭐ ' + def.name : def.name,
    emoji: def.emoji,
    hp: Math.floor(def.hp * mult * hpMult),
    maxHp: Math.floor(def.hp * mult * hpMult),
    attack: Math.floor(def.attack * Math.sqrt(mult) * atkMult),
    speed: def.speed,
    xp: Math.floor(getMobXp(def.level) * xpMult),
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
    baseAttackCd: 1.0,
    dead: false,
    facing: 1,
    facingAngle: 0,
    renderAngle: 0,

    // Дебаффы
    stunUntil: 0,
    slowUntil: 0,
    slowMult: 1,
    attackSpeedDebuff: null,
    silenceUntil: 0,
    dots: [],

    // Дальний бой (если указан в config моба)
    attackRange: def.attackRange || 0.8,
    attackProjectile: def.attackProjectile || null,
    keepDistance: def.keepDistance || false,

    // Кайт
    kite: kite,
    _kiteCooldown: 0,
  };
}

export function createGroupId() { return nextGroupId++; }

export function pickMobDefFromZone(zone) {
  const id = zone.mobs[Math.floor(Math.random() * zone.mobs.length)];
  return MOBS[id] || MOBS.gremlin;
}

export function updateMob(m, dt, hero, heroX, heroY) {
  if (m.dead) return null;

  if (!Number.isFinite(m.x)) m.x = Number.isFinite(m.lairCx) ? m.lairCx : 25;
  if (!Number.isFinite(m.y)) m.y = Number.isFinite(m.lairCy) ? m.lairCy : 25;
  if (!Number.isFinite(heroX)) heroX = 25;
  if (!Number.isFinite(heroY)) heroY = 25;
  if (!Number.isFinite(m.speed)) m.speed = 1.0;
  if (!Number.isFinite(dt) || dt <= 0) dt = 0.016;

  if (m.spawnAnim > 0) m.spawnAnim -= dt;
  if (m.hitFlash > 0) m.hitFlash -= dt;
  if (m._kiteCooldown > 0) m._kiteCooldown -= dt;
  m.attackCd -= dt;

  const immune = m._aggroImmuneUntil && m._aggroImmuneUntil > Date.now();

  // ══════════════ LEASH ══════════════
  const hasHome = Number.isFinite(m.homeX) && Number.isFinite(m.homeY) && m.leashRange > 0;
  if (hasHome) {
    const distHome = Math.hypot(m.x - m.homeX, m.y - m.homeY);

    if (!m.returning && distHome > m.leashRange) {
      m.returning = true;
      m.aggro = false;
      m.stunUntil = 0;
      m.slowUntil = 0;
      m.slowMult = 1;
    }

    if (m.returning) {
      const dxh = m.homeX - m.x;
      const dyh = m.homeY - m.y;
      const dh = Math.hypot(dxh, dyh) || 1;

      m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.30 * dt);

      if (dh < 1.0) {
        m.returning = false;
        m.hp = m.maxHp;
        m.aggro = false;
        m._aggroImmuneUntil = Date.now() + 3000;
      } else {
        const speedMult = 1.6;
        m.x += dxh / dh * m.speed * speedMult * dt;
        m.y += dyh / dh * m.speed * speedMult * dt;
        m.facingAngle = Math.atan2(dyh, dxh);
        m.facing = dxh > 0 ? 1 : -1;

        let diff = m.facingAngle - m.renderAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const maxStep = 8 * dt;
        if (Math.abs(diff) < maxStep) m.renderAngle = m.facingAngle;
        else m.renderAngle += Math.sign(diff) * maxStep;

        return null;
      }
    }
  }

  // Стан
  if (m.stunUntil && m.stunUntil > Date.now()) return null;

  // Замедление
  let speedMult = 1;
  if (m.slowUntil && m.slowUntil > Date.now()) {
    speedMult = m.slowMult ?? 1;
  }

  const dx = heroX - m.x, dy = heroY - m.y;
  const dist = Math.hypot(dx, dy) || 1;
  m.facingAngle = Math.atan2(dy, dx);

  // ══════════════ АГРО ══════════════
  const canAggro = !m.returning && !immune && (m.aggroRange || 0) > 0;
  if (!m.aggro && canAggro && dist < m.aggroRange) {
    m.aggro = true;
  }

  if (m.aggro) {
    const maxChase = m.leashRange || 15;
    if (dist > maxChase) {
      m.aggro = false;
      if (hasHome) m.returning = true;
    }
  }

  // ══════════════ БОЙ ══════════════
  if (m.aggro && !m.returning) {
    const attackDist = 1.0;
    const kiteDist = m.kite || 0;

    // Кайт — ТОЛЬКО если в лейре kite > 0
    if (kiteDist > 0 && dist < kiteDist - 0.5 && m._kiteCooldown <= 0) {
      m.x -= dx / dist * m.speed * speedMult * dt;
      m.y -= dy / dist * m.speed * speedMult * dt;
      m._kiteCooldown = 0.4;
    } else if (dist > attackDist) {
      // Идём в упор
      m.x += dx / dist * m.speed * speedMult * dt;
      m.y += dy / dist * m.speed * speedMult * dt;
      if (Math.abs(dx) > 0.1) m.facing = dx > 0 ? 1 : -1;
    } else if (m.attackCd <= 0) {
      m.attackCd = m.baseAttackCd || 1.0;
      return 'attack';
    }
  }

  // ══════════════ БЛУЖДАНИЕ ══════════════
  // ВАЖНО: НЕТ автоотхода от героя. Пассивные стоят/бродят у себя.
  if (!m.aggro && !m.returning) {
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

    if (hasHome && m.homeRadius > 0) {
      const distNext = Math.hypot(nextX - m.homeX, nextY - m.homeY);
      if (distNext > m.homeRadius) {
        m.wanderX = -m.wanderX;
        m.wanderY = -m.wanderY;
      } else {
        m.x = nextX;
        m.y = nextY;
      }
    } else {
      m.x = nextX;
      m.y = nextY;
    }

    if (Math.abs(m.wanderX) > 0.1) m.facing = m.wanderX > 0 ? 1 : -1;
    if (m.wanderX !== 0 || m.wanderY !== 0) {
      m.facingAngle = Math.atan2(m.wanderY, m.wanderX);
    }
  }

  // Плавный поворот
  let diff = m.facingAngle - m.renderAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const maxStep = 8 * dt;
  if (Math.abs(diff) < maxStep) m.renderAngle = m.facingAngle;
  else m.renderAngle += Math.sign(diff) * maxStep;

  return null;
}

export function aggroGroup(allMobs, groupId) {
  if (!groupId) return;
  for (const m of allMobs) if (m.groupId === groupId) m.aggro = true;
}