// physics.js — физика: гравитация, прыжки, коллизии

export const PHYS = {
  gravity: 1800,
  moveSpeed: 260,
  jumpVelocity: -620,
  doubleJumpVelocity: -520,
  maxFallSpeed: 1200,
  coyoteTime: 0.12,
  jumpBuffer: 0.15,
  wallSlideSpeed: 120,
  wallJumpVelocityX: 320,
  wallJumpVelocityY: -560,
  variableJumpCut: 0.5,   // при отпускании кнопки vy *= 0.5
};

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y,
    w: 24, h: 32,
    vx: 0, vy: 0,
    onGround: false,
    onWall: 0,             // -1 слева, 1 справа, 0 нет
    jumpsLeft: 1,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    jumpHeld: false,
    facing: 1,
    dead: false,
  };
}

export function updatePlayer(p, input, dt, level, entities) {
  if (p.dead) return;

  const phys = level.physics || PHYS;

  // --- горизонталь ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.vx = dir * phys.moveSpeed;
  if (dir !== 0) p.facing = dir;

  // --- wall slide ---
  p.onWall = 0;
  if (!p.onGround && p.vy > 0) {
    // проверяем стены слева/справа
    for (const e of entities) {
      if (!e.solid || !e.active) continue;
      if (e.type === 'spike' || e.type === 'goal') continue;
      // стена слева
      if (aabb({ x: p.x - 2, y: p.y, w: 2, h: p.h }, e)) {
        p.onWall = -1;
      }
      // стена справа
      if (aabb({ x: p.x + p.w, y: p.y, w: 2, h: p.h }, e)) {
        p.onWall = 1;
      }
    }
    if (p.onWall !== 0 && p.vy > PHYS.wallSlideSpeed) {
      p.vy = PHYS.wallSlideSpeed;
    }
  }

  // --- прыжок ---
  if (p.jumpBufferTimer > 0) {
    if (p.onGround || p.coyoteTimer > 0) {
      p.vy = phys.jumpVelocity;
      p.jumpsLeft = 1;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
    } else if (p.onWall !== 0) {
      // wall jump
      p.vy = PHYS.wallJumpVelocityY;
      p.vx = -p.onWall * PHYS.wallJumpVelocityX;
      p.jumpsLeft = 1;
      p.jumpBufferTimer = 0;
    } else if (p.jumpsLeft > 0) {
      p.vy = phys.doubleJumpVelocity;
      p.jumpsLeft -= 1;
      p.jumpBufferTimer = 0;
    }
  }

  // --- переменная высота прыжка ---
  if (!p.jumpHeld && p.vy < 0) {
    p.vy *= PHYS.variableJumpCut;
  }

  // --- гравитация ---
  p.vy += phys.gravity * dt;
  if (p.vy > PHYS.maxFallSpeed) p.vy = PHYS.maxFallSpeed;

  // --- таймеры ---
  if (p.onGround) {
    p.coyoteTimer = PHYS.coyoteTime;
  } else if (p.coyoteTimer > 0) {
    p.coyoteTimer -= dt;
  }
  if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;

  // --- движение X с коллизиями ---
  p.x += p.vx * dt;
  for (const e of entities) {
    if (!e.solid || !e.active) continue;
    if (e.type === 'spike' || e.type === 'goal') continue;
    if (aabb(p, e)) {
      if (p.vx > 0) p.x = e.x - p.w;
      else if (p.vx < 0) p.x = e.x + e.w;
      p.vx = 0;
    }
  }

  // --- движение Y с коллизиями ---
  p.onGround = false;
  p.y += p.vy * dt;
  for (const e of entities) {
    if (!e.solid || !e.active) continue;
    if (e.type === 'spike' || e.type === 'goal') continue;
    if (aabb(p, e)) {
      if (p.vy > 0) {
        p.y = e.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 1;
      } else if (p.vy < 0) {
        p.y = e.y + e.h;
        p.vy = 0;
      }
    }
  }

  // --- едем вместе с движущейся платформой ---
  if (p.onGround) {
    for (const e of entities) {
      if (e.type !== 'moving') continue;
      if (!e.solid) continue;
      // проверяем, стоит ли игрок на этой платформе
      if (Math.abs((p.y + p.h) - e.y) < 2 &&
          p.x + p.w > e.x && p.x < e.x + e.w) {
        p.x += e.vx || 0;
        p.y += e.vy || 0;
        // для движущихся по X/Y нужно знать дельту, посчитаем в updateEntity
        // Простой вариант: сохраняем prevX/prevY в updateEntity
      }
    }
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}