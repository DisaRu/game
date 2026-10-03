export function render(ctx, canvas, level, player, camera, entities) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#252540';
  ctx.lineWidth = 1;
  const step = 80;
  const offX = -camera.x % step;
  const offY = -camera.y % step;
  for (let x = offX; x < canvas.width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = offY; y < canvas.height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (const e of entities) drawEntity(ctx, e);
  drawPlayer(ctx, player);

  ctx.restore();
}

function drawEntity(ctx, e) {
  switch (e.type) {
    case 'platform':
      ctx.fillStyle = '#4a4a6a';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      break;

    case 'moving':
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#0c4a6e';
      ctx.fillRect(e.x + e.w / 2 - 4, e.y + e.h / 2 - 2, 8, 4);
      break;

    case 'breakable':
      if (e.broken) {
        ctx.strokeStyle = '#5a3a2a';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(e.x, e.y, e.w, e.h);
        ctx.setLineDash([]);
      } else {
        ctx.fillStyle = '#8b5a3c';
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.strokeStyle = '#5a3a2a';
        ctx.beginPath();
        ctx.moveTo(e.x + e.w * 0.3, e.y);
        ctx.lineTo(e.x + e.w * 0.4, e.y + e.h);
        ctx.moveTo(e.x + e.w * 0.7, e.y);
        ctx.lineTo(e.x + e.w * 0.6, e.y + e.h);
        ctx.stroke();
      }
      break;

    case 'blinking':
      if (e.visible) {
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(e.x, e.y, e.w, e.h);
      } else {
        ctx.strokeStyle = '#4c1d95';
        ctx.setLineDash([3, 5]);
        ctx.strokeRect(e.x, e.y, e.w, e.h);
        ctx.setLineDash([]);
      }
      break;

    case 'turret': {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#7f1d1d';
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const barrel = 12;
      if (e.dir === 'left')  ctx.fillRect(e.x - barrel, cy - 3, barrel, 6);
      if (e.dir === 'right') ctx.fillRect(e.x + e.w, cy - 3, barrel, 6);
      if (e.dir === 'up')    ctx.fillRect(cx - 3, e.y - barrel, 6, barrel);
      if (e.dir === 'down')  ctx.fillRect(cx - 3, e.y + e.h, 6, barrel);
      ctx.fillStyle = '#fbbf24';
      for (const b of e.bullets) ctx.fillRect(b.x, b.y, b.w, b.h);
      break;
    }

    case 'spike': {
      ctx.fillStyle = '#dc2626';
      const count = Math.max(1, Math.floor(e.w / 15));
      const sw = e.w / count;
      for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.moveTo(e.x + i * sw, e.y + e.h);
        ctx.lineTo(e.x + i * sw + sw / 2, e.y);
        ctx.lineTo(e.x + (i + 1) * sw, e.y + e.h);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'crusher': {
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#b45309';
      const teeth = Math.floor(e.w / 20);
      for (let i = 0; i < teeth; i++) {
        ctx.fillRect(e.x + i * 20, e.y + e.h, 10, 6);
      }
      break;
    }

    case 'goal':
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.lineWidth = 3;
      ctx.strokeRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);
      break;
  }
}

function drawPlayer(ctx, p) {
  ctx.fillStyle = p.onGround ? '#facc15' : '#fb923c';
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = '#1a1a2e';
  const eyeX = p.facing > 0 ? p.x + p.w - 9 : p.x + 5;
  ctx.fillRect(eyeX, p.y + 8, 4, 4);
}