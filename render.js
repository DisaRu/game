export function render(ctx, canvas, state, layout) {
  const { cellPx, offsetX, offsetY, COLS, ROWS } = layout;

  if (!state.hero) {
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#1a1030');
    bg.addColorStop(1, '#06090f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const boardW = cellPx * COLS;
  const boardH = cellPx * ROWS;

  // === БИОМ-ФОН ===
  const bg = ctx.createLinearGradient(0, 0, 0, offsetY + boardH);
  bg.addColorStop(0, '#0f1a1a');
  bg.addColorStop(0.5, '#1a2a1a');
  bg.addColorStop(1, '#2a3018');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // область карты
  ctx.fillStyle = '#1a2a10';
  ctx.fillRect(offsetX, offsetY, boardW, boardH);

  // трава с градиентом
  const grassGrad = ctx.createLinearGradient(0, offsetY, 0, offsetY + boardH);
  grassGrad.addColorStop(0, 'rgba(30, 50, 20, 0.6)');
  grassGrad.addColorStop(1, 'rgba(50, 60, 25, 0.9)');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(offsetX, offsetY, boardW, boardH);

  // декор
  drawDecor(ctx, canvas, offsetX, offsetY, boardW, boardH);

  // граница карты
  ctx.strokeStyle = 'rgba(74, 222, 128, 0.3)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.strokeRect(offsetX, offsetY, boardW, boardH);
  ctx.setLineDash([]);

  // === Мобы ===
  for (const m of state.mobs) {
    if (m.dead) continue;
    const px = offsetX + m.x * cellPx;
    const py = offsetY + m.y * cellPx;
    const size = m.size * cellPx;
    const scale = m.spawnAnim > 0 ? (1 - m.spawnAnim / 0.3) : 1;
    const shake = m.hitFlash > 0 ? (Math.random() - 0.5) * 4 : 0;

    // ореол
    const auraRadius = size * 0.75 * scale;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, auraRadius);
    if (m.hitFlash > 0) {
      rg.addColorStop(0, 'rgba(255,255,255,0.8)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (m.aggro) {
      rg.addColorStop(0, 'rgba(220, 60, 60, 0.6)');
      rg.addColorStop(1, 'rgba(220, 60, 60, 0)');
    } else {
      rg.addColorStop(0, 'rgba(120, 120, 120, 0.3)');
      rg.addColorStop(1, 'rgba(120, 120, 120, 0)');
    }
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(px, py, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${Math.floor(size * scale)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(m.emoji, px + shake, py);
    ctx.restore();

    if (m.hp < m.maxHp) {
      const w = size * 0.9;
      const h = 3;
      const ratio = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(px - w / 2, py - size * 0.6 - 8, w, h);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(px - w / 2, py - size * 0.6 - 8, w * ratio, h);
    }
  }

  // === Герой ===
  drawHero(ctx, state.hero, cellPx, offsetX, offsetY);

  // === Снаряды ===
  for (const p of state.projectiles) {
    const px = offsetX + p.x * cellPx;
    const py = offsetY + p.y * cellPx;

    if (p.trail) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i / p.trail.length) * 0.4;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(offsetX + t.x * cellPx, offsetY + t.y * cellPx, cellPx * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, cellPx * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // === Всплывающий урон ===
  for (const fx of state.effects) {
    const px = offsetX + fx.x * cellPx;
    const py = offsetY + fx.y * cellPx;
    const a = fx.life / fx.maxLife;
    ctx.globalAlpha = a;
    ctx.font = `bold ${Math.floor(cellPx * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const y = py - (1 - a) * cellPx * 1.2;
    ctx.strokeText(fx.text, px, y);
    ctx.fillStyle = fx.color;
    ctx.fillText(fx.text, px, y);
    ctx.globalAlpha = 1;
  }
}

function drawDecor(ctx, canvas, offsetX, offsetY, boardW, boardH) {
  if (!drawDecor.cache || drawDecor.cacheW !== boardW) {
    const items = [];
    let seed = 42;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 120; i++) {
      items.push({
        x: offsetX + rnd() * boardW,
        y: offsetY + rnd() * boardH,
        size: 2 + rnd() * 5,
        type: rnd() < 0.6 ? 'grass' : (rnd() < 0.5 ? 'stone' : 'bush'),
      });
    }
    drawDecor.cache = items;
    drawDecor.cacheW = boardW;
  }
  for (const it of drawDecor.cache) {
    if (it.type === 'grass') {
      ctx.strokeStyle = 'rgba(120, 200, 100, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(it.x, it.y);
      ctx.lineTo(it.x - 2, it.y - it.size);
      ctx.moveTo(it.x, it.y);
      ctx.lineTo(it.x + 2, it.y - it.size);
      ctx.stroke();
    } else if (it.type === 'stone') {
      ctx.fillStyle = 'rgba(120, 120, 120, 0.35)';
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(40, 80, 40, 0.5)';
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHero(ctx, hero, cellPx, offsetX, offsetY) {
  if (!hero || hero.dead) return;
  const px = offsetX + hero.x * cellPx;
  const py = offsetY + hero.y * cellPx;
  const r = cellPx * 0.55;

  const scale = hero.attackAnim > 0 ? 1 + hero.attackAnim * 0.5 : 1;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);

  const grad = ctx.createRadialGradient(0, -r * 0.3, 0, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(74, 222, 128, 0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hero.hitAnim > 0 ? '#ef4444' : '#4ade80';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.font = `${Math.floor(cellPx * 0.65)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(hero.emoji, 0, 0);

  ctx.restore();

  const w = r * 2;
  const h = 4;
  const ratio = Math.max(0, hero.hp / hero.maxHp);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(px - w / 2, py - r - 12, w, h);
  ctx.fillStyle = ratio > 0.3 ? '#4ade80' : '#ef4444';
  ctx.fillRect(px - w / 2, py - r - 12, w * ratio, h);
}