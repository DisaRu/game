export function render(ctx, canvas, level, player, camera) {
  // фон
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // сетка (параллакс)
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

  // платформы
  ctx.fillStyle = '#4a4a6a';
  for (const p of level.platforms) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  }

  // цель
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(level.goal.x, level.goal.y, level.goal.w, level.goal.h);

  // игрок
  ctx.fillStyle = player.onGround ? '#facc15' : '#fb923c';
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // глаза (направление)
  ctx.fillStyle = '#1a1a2e';
  const eyeX = player.facing > 0 ? player.x + player.w - 9 : player.x + 5;
  ctx.fillRect(eyeX, player.y + 8, 4, 4);

  ctx.restore();
}