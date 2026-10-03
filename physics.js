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
  variableJumpCut: 0.5,
};

export function createPlayer(spawn) {
  return {
    x: spawn.x, y: spawn.y,
    w: 24, h: 32,
    vx: 0, vy: 0,
    onGround: false,
    onWall: 0,
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

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  p.vx = dir * phys.moveSpeed;
  if (dir !== 0) p.facing = dir;

  // wall slide
  p.onWall = 0;
  if (!p.onGround && p.vy > 0 && Array.isArray(entities)) {
    for (const e of entities) {
      if (!e.solid || !e.active) continue;
      if (e.type === 'spike' || e.type === 'goal') continue;
      if (aabb({ x: p.x - 2, y: p.y, w: 2, h: p.h }, e)) p.onWall = -1;
      if (aabb({ x: p.x + p.w, y: p.y, w: 2, h: p.h }, e)) p.onWall = 1;
    }
    if (p.onWall !== 0 && p.vy > PHYS.wallSlideSpeed) {
      p.vy = PHYS.wallSlideSpeed;
    }
  }

  // прыжок
  if (p.jumpBufferTimer > 0) {
    if (p.onGround || p.coyoteTimer > 0) {
      p.vy = phys.jumpVelocity;
      p.jumpsLeft = 1;
      p.onGround = false;
      p.coyoteTimer = 0;
      p.jumpBufferTimer = 0;
    } else if (p.onWall !== 0) {
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

  if (!p.jumpHeld && p.vy < 0) {
    p.vy *= PHYS.variableJumpCut;
  }

  p.vy += phys.gravity * dt;
  if (p.vy > PHYS.maxFallSpeed) p.vy = PHYS.maxFallSpeed;

  if (p.onGround) {
    p.coyoteTimer = PHYS.coyoteTime;
  } else if (p.coyoteTimer > 0) {
    p.coyoteTimer -= dt;
  }
  if (p.jumpBufferTimer > 0) p.jumpBufferTimer -= dt;

  // X
  p.x += p.vx * dt;
  if (Array.isArray(entities)) {
    for (const e of entities) {
      if (!e.solid || !e.active) continue;
      if (e.type === 'spike' || e.type === 'goal') continue;
      if (aabb(p, e)) {
        if (p.vx > 0) p.x = e.x - p.w;
        else if (p.vx < 0) p.x = e.x + e.w;
        p.vx = 0;
      }
    }
  }

  // Y
  p.onGround = false;
  p.y += p.vy * dt;
  if (Array.isArray(entities)) {
    for (const e of entities) {
      if (!e.solid || !e.active) continue;
      if (e.type === 'spike' || e.type === 'goal') continue;
      if (aabb(p, e)) {
        if (p.vy > 0) {
          p.y = e.y - p.h;
          p.vy = 0;
          p.onGround = true;
          p.jumpsLeft = 1;
          // ломающаяся платформа ломается
          if (e.type === 'breakable' && !e.broken) {
            e.broken = true;
            e.solid = false;
            e.breakTimer = e.respawn;
          }
        } else if (p.vy < 0) {
          p.y = e.y + e.h;
          p.vy = 0;
        }
      }
    }
  }
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}