export function render(ctx, canvas, state, layout, camera) {
  const { cellPx } = layout;

  if (!state.hero) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.fillStyle = state.zoneBg || '#1a2a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // === Тряска экрана ===
  let shakeX = 0, shakeY = 0;
  if (state.shake && state.shake.t > 0) {
    shakeX = (Math.random() - 0.5) * state.shake.power;
    shakeY = (Math.random() - 0.5) * state.shake.power;
  }

  ctx.save();
  ctx.translate(-camera.x * cellPx + shakeX, -camera.y * cellPx + shakeY);

  const startCol = Math.max(0, Math.floor(camera.x) - 1);
  const endCol = Math.min(layout.COLS, Math.ceil(camera.x + camera.w) + 1);
  const startRow = Math.max(0, Math.floor(camera.y) - 1);
  const endRow = Math.min(layout.ROWS, Math.ceil(camera.y + camera.h) + 1);

  // Сетка
  ctx.strokeStyle = 'rgba(100, 200, 120, 0.06)';
  ctx.lineWidth = 1;
  for (let x = startCol; x <= endCol; x++) {
    ctx.beginPath();
    ctx.moveTo(x * cellPx, startRow * cellPx);
    ctx.lineTo(x * cellPx, endRow * cellPx);
    ctx.stroke();
  }
  for (let y = startRow; y <= endRow; y++) {
    ctx.beginPath();
    ctx.moveTo(startCol * cellPx, y * cellPx);
    ctx.lineTo(endCol * cellPx, y * cellPx);
    ctx.stroke();
  }

  // === AoE-маркеры ===
  if (state.aoeList) {
    for (const aoe of state.aoeList) {
      drawAoe(ctx, aoe, cellPx);
    }
  }

  // === Портал в данж ===
  if (state.portal && state.portal.active) {
    const px = state.portal.x * cellPx;
    const py = state.portal.y * cellPx;
    const pulse = 1 + Math.sin(state.portal.pulse) * 0.15;
    const r = cellPx * 0.9 * pulse;

    ctx.save();
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 25;
    ctx.font = `${Math.floor(cellPx * 1.2)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏛', px, py);
    ctx.restore();

    ctx.strokeStyle = 'rgba(168, 85, 247, ' + (0.5 + Math.sin(state.portal.pulse*2) * 0.3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // === Мобы ===
  for (const m of state.mobs) {
    if (m.dead) continue;
    if (m.x < startCol - 1 || m.x > endCol + 1) continue;
    if (m.y < startRow - 1 || m.y > endRow + 1) continue;

    const px = m.x * cellPx, py = m.y * cellPx;
    const size = m.size * cellPx;
    const scale = m.spawnAnim > 0 ? (1 - m.spawnAnim / 0.3) : 1;
    const shake = m.hitFlash > 0 ? (Math.random() - 0.5) * 4 : 0;

    // Свечение босса перед кастом
    if (m.boss && m.castGlow > 0) {
      const glow = ctx.createRadialGradient(px, py, 0, px, py, size * 1.5);
      glow.addColorStop(0, 'rgba(255, 200, 50, ' + (0.6 * m.castGlow) + ')');
      glow.addColorStop(1, 'rgba(255, 200, 50, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(px, py, size * 1.5, 0, Math.PI * 2); ctx.fill();
    }

    let auraRadius = size * 0.75 * scale;
    if (auraRadius <= 0.1) auraRadius = 0.1;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, auraRadius);
    if (m.boss) {
      rg.addColorStop(0, 'rgba(220, 30, 30, 0.8)');
      rg.addColorStop(1, 'rgba(220, 30, 30, 0)');
    } else if (m.hitFlash > 0) {
      rg.addColorStop(0, 'rgba(255,255,255,0.8)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    } else if (m.aggro) {
      rg.addColorStop(0, 'rgba(220, 60, 60, 0.6)'); rg.addColorStop(1, 'rgba(220, 60, 60, 0)');
    } else {
      rg.addColorStop(0, 'rgba(120, 120, 120, 0.3)'); rg.addColorStop(1, 'rgba(120, 120, 120, 0)');
    }
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(px, py, auraRadius, 0, Math.PI * 2); ctx.fill();

    ctx.font = `${Math.floor(size * scale)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
    if (m.boss) { ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 20; }
    ctx.fillText(m.emoji, px + shake, py);
    ctx.restore();

    if (m.hp < m.maxHp) {
      const w = size * 0.9, h = 3;
      const ratio = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(px - w/2, py - size*0.6 - 8, w, h);
      ctx.fillStyle = m.boss ? '#dc2626' : '#ef4444';
      ctx.fillRect(px - w/2, py - size*0.6 - 8, w*ratio, h);
    }
  }

  // === Герой ===
  drawHero(ctx, state.hero, cellPx);

  // === Снаряды ===
  for (const p of state.projectiles) {
    if (p.x < startCol - 2 || p.x > endCol + 2) continue;
    if (p.y < startRow - 2 || p.y > endRow + 2) continue;

    const px = p.x * cellPx, py = p.y * cellPx;
    const isMage = p.weaponType === 'staff';

    if (p.trail) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i / p.trail.length) * (isMage ? 0.6 : 0.35);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(t.x * cellPx, t.y * cellPx, cellPx * (isMage ? 0.10 : 0.05), 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.shadowColor = p.color;
    ctx.shadowBlur = isMage ? 14 : 6;
    ctx.fillStyle = p.color;
    if (isMage) {
      ctx.beginPath(); ctx.arc(px, py, cellPx * 0.13, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, py, cellPx * 0.06, 0, Math.PI*2); ctx.fill();
    } else {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(angle);
      ctx.fillRect(-cellPx*0.15, -1, cellPx*0.3, 2);
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // === Цепные молнии ===
  for (const fx of state.effects) {
    if (fx.kind !== 'chain') continue;
    const a = fx.life / fx.maxLife;
    ctx.globalAlpha = a;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(fx.x1 * cellPx, fx.y1 * cellPx);
    const midX = ((fx.x1 + fx.x2) / 2) * cellPx;
    const midY = ((fx.y1 + fx.y2) / 2) * cellPx + (Math.random() - 0.5) * 20;
    ctx.lineTo(midX, midY);
    ctx.lineTo(fx.x2 * cellPx, fx.y2 * cellPx);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // === Эффекты ===
  for (const fx of state.effects) {
    if (fx.kind === 'chain') continue;
    if (fx.x < startCol - 2 || fx.x > endCol + 2) continue;
    if (fx.y < startRow - 2 || fx.y > endRow + 2) continue;

    const px = fx.x * cellPx, py = fx.y * cellPx;
    const a = fx.life / fx.maxLife;
    const size = fx.big ? 0.9 : 0.6;
    ctx.globalAlpha = a;
    ctx.font = `bold ${Math.floor(cellPx * size)}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000'; ctx.lineWidth = 5;
    const y = py - (1 - a) * cellPx * 1.5;
    ctx.strokeText(fx.text, px, y);
    ctx.fillStyle = fx.color;
    ctx.fillText(fx.text, px, y);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawAoe(ctx, aoe, cellPx) {
  const a = aoe.life / aoe.maxLife;
  const progress = 1 - a;
  const px = aoe.x * cellPx;
  const py = aoe.y * cellPx;
  const intensity = 0.3 + progress * 0.7;

  ctx.save();
  ctx.globalAlpha = intensity;

  if (aoe.type === 'circle' || aoe.type === 'marker') {
    let r = aoe.radius * cellPx;
    if (r <= 0.1) r = 0.1;
    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, r * (1 - progress), 0, Math.PI * 2); ctx.stroke();
  } else if (aoe.type === 'line') {
    const w = aoe.thickness * cellPx;
    const h = aoe.length * cellPx;
    ctx.fillStyle = aoe.color + '40';
    ctx.fillRect(px - w/2, py - h/2, w, h);
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.strokeRect(px - w/2, py - h/2, w, h);
    ctx.fillStyle = aoe.color;
    const shrink = 1 - progress;
    ctx.fillRect(px - w/2, py - h/2 * shrink, w, h * shrink);
  } else if (aoe.type === 'ring') {
    // Расширяющееся кольцо
    let rIn = aoe.innerRadius * cellPx;
    const rOut = aoe.outerRadius * cellPx;
    if (rIn <= 0.1) rIn = 0.1;

    // Безопасная зона внутри
    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
    ctx.beginPath(); ctx.arc(px, py, rIn, 0, Math.PI * 2); ctx.fill();

    // Опасная зона (кольцо)
    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath();
    ctx.arc(px, py, rOut, 0, Math.PI * 2);
    ctx.arc(px, py, rIn, 0, Math.PI * 2, true);
    ctx.fill();

    // Контуры
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, rIn, 0, Math.PI * 2); ctx.stroke();

    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, rOut, 0, Math.PI * 2); ctx.stroke();
  } else if (aoe.type === 'fire') {
    for (const s of aoe.spots) {
      if (s.life <= 0) continue;
      const sx = s.x * cellPx;
      const sy = s.y * cellPx;
      let r = s.radius * cellPx;
      if (r <= 0.1) r = 0.1;
      const alpha = Math.min(1, s.life / 2);

      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      grad.addColorStop(0, 'rgba(251, 146, 60, ' + (alpha * 0.9) + ')');
      grad.addColorStop(0.5, 'rgba(234, 88, 12, ' + (alpha * 0.6) + ')');
      grad.addColorStop(1, 'rgba(120, 30, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawHero(ctx, hero, cellPx) {
  if (!hero || hero.dead) return;
  const px = hero.x * cellPx, py = hero.y * cellPx;
  const r = Math.max(1, cellPx * 0.55);
  const scale = hero.attackAnim > 0 ? 1 + hero.attackAnim * 0.5 : 1;

  ctx.save(); ctx.translate(px, py); ctx.scale(scale, scale);

  const grad = ctx.createRadialGradient(0, -r*0.3, 0, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, 'rgba(74, 222, 128, 0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = hero.hitAnim > 0 ? '#ef4444' : '#4ade80';
  ctx.lineWidth = 2.5; ctx.stroke();

  ctx.font = `${Math.floor(cellPx * 0.65)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hero.emoji, 0, 0);
  ctx.restore();
}