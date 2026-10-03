export const PHYS = {
  gravity: 1800,        // px/s²
  moveSpeed: 260,       // px/s
  jumpVelocity: -620,   // px/s (вверх — отрицательное)
  doubleJumpVelocity: -520,
  maxFallSpeed: 1200,
  coyoteTime: 0.10,     // сек: можно прыгнуть после схода с края
  jumpBuffer: 0.12,     // сек: прыжок "запоминается" при нажатии в воздухе
};

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y,
    w: 24, h: 32,
    vx: 0, vy: 0,
    onGround: false,
    jumpsLeft: 1,          // 1 обычный + 1 двойной
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    facing: 1,
  };
}

export function updatePlayer(p, input, dt, level) {
  // --- горизонталь ---
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.vx = dir * PHYS.moveSpeed;
  if (dir !== 0) p.facing = dir;

  // --- прыжок ---
  if (p.jumpBufferTimer > 0) {
    if (p.onGround || p.coyoteTimer > 0) {
      p.vy = PHYS.jumpVelocity;
      p.jumpsLeft = 1;         // двойной прыжок доступен
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
    } else if (p.jumpsLeft > 0) {
      p.vy = PHYS.doubleJumpVelocity;
      p.jumpsLeft -= 1;
      p.jumpBufferTimer = 0;
    }
  }

  // --- гравитация ---
  p.vy += PHYS.gravity * dt;
  if (p.vy > PHYS.maxFallSpeed) p.vy = PHYS.maxFallSpeed;

  // --- таймеры ---
  if (p.onGround) {
    p.coyoteTimer = PHYS.coyoteTime;
  } else if (p.coyoteTimer > 0) {
    p.coyoteTimer -= dt;
  }
  if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;

  // --- движение по X с коллизиями ---
  p.x += p.vx * dt;
  for (const plat of level.platforms) {
    if (aabb(p, plat)) {
      if (p.vx > 0) p.x = plat.x - p.w;
      else if (p.vx < 0) p.x = plat.x + plat.w;
      p.vx = 0;
    }
  }

  // --- движение по Y с коллизиями ---
  p.onGround = false;
  p.y += p.vy * dt;
  for (const plat of level.platforms) {
    if (aabb(p, plat)) {
      if (p.vy > 0) {           // падаем вниз — приземляемся
        p.y = plat.y - p.h;
        p.vy = 0;
        p.onGround = true;
        p.jumpsLeft = 1;
      } else if (p.vy < 0) {    // летим вверх — бьёмся головой
        p.y = plat.y + plat.h;
        p.vy = 0;
      }
    }
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}