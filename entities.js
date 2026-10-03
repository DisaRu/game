export function createEntity(data) {
  const base = {
    x: data.x, y: data.y, w: data.w, h: data.h,
    type: data.type,
    vx: 0, vy: 0,
    solid: true,
    deadly: false,
    active: true,
    prevX: data.x, prevY: data.y,
  };

  switch (data.type) {
    case 'platform':
      return base;

    case 'moving': {
      const axis = data.axis || 'x';
      const range = data.range || 100;
      const speed = data.speed || 60;
      return {
        ...base,
        axis, range, speed,
        originX: data.x, originY: data.y,
        t: data.phase || 0,
      };
    }

    case 'breakable':
      return {
        ...base,
        respawn: data.respawn || 2000,
        broken: false,
        breakTimer: 0,
      };

    case 'blinking':
      return {
        ...base,
        onTime: data.onTime || 1000,
        offTime: data.offTime || 800,
        t: data.phase || 0,
        visible: true,
      };

    case 'turret':
      return {
        ...base,
        dir: data.dir || 'left',
        interval: data.interval || 1500,
        bulletSpeed: data.bulletSpeed || 280,
        timer: 0,
        bullets: [],
      };

    case 'spike':
      return { ...base, solid: false, deadly: true };

    case 'crusher':
      return {
        ...base,
        speed: data.speed || 40,
        range: data.range || 200,
        originY: data.y,
        dir: data.dir || -1,
        minY: data.y - (data.dir === -1 ? data.range : 0),
        maxY: data.y + (data.dir === 1 ? data.range : 0),
      };

    case 'goal':
      return { ...base, solid: false, deadly: false, isGoal: true };

    default:
      return base;
  }
}

export function updateEntity(e, dt, level) {
  switch (e.type) {
    case 'moving': {
      e.t += dt * e.speed;
      const offset = Math.sin(e.t / e.range * Math.PI) * e.range;
      if (e.axis === 'x') {
        e.x = e.originX + offset;
      } else if (e.axis === 'y') {
        e.y = e.originY + offset;
      } else if (e.axis === 'circle') {
        e.x = e.originX + Math.cos(e.t / e.range * Math.PI) * e.range;
        e.y = e.originY + Math.sin(e.t / e.range * Math.PI) * e.range;
      }
      break;
    }

    case 'breakable': {
      if (e.broken) {
        e.breakTimer -= dt * 1000;
        if (e.breakTimer <= 0) {
          e.broken = false;
          e.solid = true;
        }
      }
      break;
    }

    case 'blinking': {
      e.t += dt * 1000;
      const cycle = e.onTime + e.offTime;
      const phase = e.t % cycle;
      e.visible = phase < e.onTime;
      e.solid = e.visible;
      break;
    }

    case 'turret': {
      e.timer += dt * 1000;
      if (e.timer >= e.interval) {
        e.timer = 0;
        spawnBullet(e);
      }
      for (let i = e.bullets.length - 1; i >= 0; i--) {
        const b = e.bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -100 || b.x > level.width + 100 ||
            b.y < -100 || b.y > level.height + 100) {
          e.bullets.splice(i, 1);
        }
      }
      break;
    }

    case 'crusher': {
      e.y += e.speed * e.dir * dt;
      if (e.dir === -1 && e.y <= e.minY) { e.y = e.minY; e.dir = 1; }
      if (e.dir === 1 && e.y >= e.maxY) { e.y = e.maxY; e.dir = -1; }
      break;
    }
  }
}

function spawnBullet(turret) {
  const cx = turret.x + turret.w / 2;
  const cy = turret.y + turret.h / 2;
  const dirs = {
    left:  { vx: -turret.bulletSpeed, vy: 0 },
    right: { vx: turret.bulletSpeed,  vy: 0 },
    up:    { vx: 0, vy: -turret.bulletSpeed },
    down:  { vx: 0, vy: turret.bulletSpeed },
  };
  const d = dirs[turret.dir] || dirs.left;
  turret.bullets.push({
    x: cx - 4, y: cy - 4, w: 8, h: 8,
    vx: d.vx, vy: d.vy, life: 4,
  });
}