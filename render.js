import { SKILLS } from './config.js';

export function render(ctx, canvas, state, layout, camera) {
  const { cellPx } = layout;

  if (!state.hero) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.fillStyle = state.zoneBg || '#1a2a10';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // === Портал ===
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

    const sprite = getSprite(m.emoji);
    if (sprite) {
      const drawSize = size * scale * 1.4;
      ctx.save();
      ctx.shadowColor = m.boss ? '#dc2626' : 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = m.boss ? 20 : 8;

      const angle = m.renderAngle !== undefined ? m.renderAngle : (m.facingAngle || 0);

      ctx.translate(px + shake, py);
      ctx.rotate(angle - Math.PI / 2);
      ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    } else {
      // Emoji fallback
      ctx.font = `${Math.floor(size * scale)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
      if (m.boss) { ctx.shadowColor = '#dc2626'; ctx.shadowBlur = 20; }
      ctx.fillText(m.emoji, px + shake, py);
      ctx.restore();
    }

    if (m.hp < m.maxHp) {
      const w = size * 0.9, h = 3;
      const ratio = Math.max(0, m.hp / m.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(px - w/2, py - size*0.6 - 8, w, h);
      ctx.fillStyle = m.boss ? '#dc2626' : '#ef4444';
      ctx.fillRect(px - w/2, py - size*0.6 - 8, w*ratio, h);
    }
  }

  // === Тени (summon_shadow) ===
  if (state.shadows && state.shadows.length > 0) {
    for (const s of state.shadows) {
      const sxp = s.x * cellPx;
      const syp = s.y * cellPx;
      const levit = Math.sin((s._levitate || 0) * 2) * cellPx * 0.1;
      const r = cellPx * 0.55;
        ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.translate(sxp, syp + levit);

      // Сияние
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6);
      grad.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

         // Тело
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

       // Эмодзи
      ctx.globalAlpha = 0.5;
      ctx.font = `${Math.floor(cellPx * 0.6)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.emoji || '👤', 0, 0);
      ctx.restore();

       // Имя над тенью
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.font = `bold ${Math.max(8, Math.floor(cellPx * 0.28))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText('👤 ' + s.name, sxp, syp + levit - r - 12);
      ctx.fillStyle = '#c084fc';
      ctx.fillText('👤 ' + s.name, sxp, syp + levit - r - 12);
      ctx.restore();

      // Мини HP-полоса тени
      const sMaxHp = s.maxHp || s.hp || 1;
      const sHpPct = Math.max(0, Math.min(1, (s.hp || 0) / sMaxHp));
      const sbW = cellPx * 1.2;
      const sbH = Math.max(3, Math.floor(cellPx * 0.10));
      const sbX = sxp - sbW / 2;
      const sbY = syp + levit - r - 10;
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(sbX - 1, sbY - 1, sbW + 2, sbH + 2);
      ctx.fillStyle = sHpPct > 0.3 ? '#a855f7' : '#7f1d1d';
      ctx.fillRect(sbX, sbY, sbW * sHpPct, sbH);
      ctx.restore();
    }
  }

  drawHero(ctx, state.hero, cellPx);

  // === Враг на арене ===
  if (state.arenaMode && state.arenaEnemy) {
    drawHero(ctx, state.arenaEnemy, cellPx);
  }

  // === Снаряды ===
  for (const p of state.projectiles) {
    // Задержанные снаряды (multishot) не рисуем пока не полетели
    if (p.delay && p.delay > 0) continue;
    if (p.x < startCol - 2 || p.x > endCol + 2) continue;
    if (p.y < startRow - 2 || p.y > endRow + 2) continue;

    const px = p.x * cellPx, py = p.y * cellPx;
    const isMage = p.weaponType === 'staff';
    const isSkill = p.isSkill === true;
    const trailScale = isSkill ? 1.6 : 1;

    if (p.trail) {
      for (let i = 0; i < p.trail.length; i++) {
        const t = p.trail[i];
        const a = (i / p.trail.length) * (isMage || isSkill ? 0.6 : 0.35);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(t.x * cellPx, t.y * cellPx, cellPx * (isMage ? 0.10 : 0.05) * trailScale, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

     ctx.shadowColor = p.color;
    ctx.shadowBlur = isSkill ? 22 : (isMage ? 14 : 6);
    ctx.fillStyle = p.color;
    if (p.bigProjectile) {
      // Крупный огненный шар
      const r1 = cellPx * 0.45;
      ctx.beginPath(); ctx.arc(px, py, r1, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath(); ctx.arc(px, py, r1 * 0.6, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, py, r1 * 0.3, 0, Math.PI*2); ctx.fill();
    } else if (isSkill) {
      ctx.beginPath(); ctx.arc(px, py, cellPx * 0.20, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, py, cellPx * 0.10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(px, py, cellPx * 0.05, 0, Math.PI*2); ctx.fill();
    } else if (isMage) {
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

  // === Эффекты ===
   // === Эффекты (фоновые: под текстом) ===
  for (const fx of state.effects) {
    const a = fx.life / fx.maxLife;
    const fxX = fx.x * cellPx;
    const fxY = fx.y * cellPx;

    if (fx.kind === 'chain') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(fx.x1 * cellPx, fx.y1 * cellPx);
      const midX = ((fx.x1 + fx.x2) / 2) * cellPx;
      const midY = ((fx.y1 + fx.y2) / 2) * cellPx + (Math.random() - 0.5) * 20;
      ctx.lineTo(midX, midY);
      ctx.lineTo(fx.x2 * cellPx, fx.y2 * cellPx);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'flash') {
      const r = (fx.radius || 0.8) * cellPx;
      ctx.globalAlpha = a * 0.7;
      const grad = ctx.createRadialGradient(fxX, fxY, 0, fxX, fxY, r);
      grad.addColorStop(0, fx.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fxX, fxY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'spin') {
      // Крутящееся кольцо уворота вокруг героя
      const prog = 1 - a;
      const r = cellPx * 1.0;
      ctx.globalAlpha = 0.65;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      const angle = prog * Math.PI * 6;
      ctx.arc(fxX, fxY, r, angle, angle + Math.PI * 0.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fxX, fxY, r, angle + Math.PI, angle + Math.PI * 1.9);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'stun_ring') {
      // Вращающиеся звёзды над станом
      const prog = 1 - a;
      const r = cellPx * 0.9;
      ctx.globalAlpha = 0.9;
      ctx.font = `${Math.floor(cellPx * 0.5)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < 3; k++) {
        const ang = prog * Math.PI * 4 + k * Math.PI * 2 / 3;
        const sx = fxX + Math.cos(ang) * r;
        const sy = fxY + Math.sin(ang) * r * 0.4;
        ctx.fillText('⭐', sx, sy);
      }
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'frost_ring') {
      // Ледяное кольцо-замедление
      ctx.globalAlpha = 0.55 * a;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(fxX, fxY, cellPx * 0.95, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = a;
      ctx.font = `${Math.floor(cellPx * 0.55)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❄️', fxX, fxY - cellPx * 0.9);
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'silence_ring') {
      // Пульсирующий синий круг
      const pulse = 0.9 + Math.sin(Date.now() / 200) * 0.15;
      ctx.globalAlpha = 0.55 * a;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(fxX, fxY, cellPx * 1.05 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = a;
      ctx.font = `${Math.floor(cellPx * 0.55)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤐', fxX, fxY - cellPx * 1.0);
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'cleanse_ring') {
      // Светлое расходящееся кольцо
      const prog = 1 - a;
      const r = cellPx * (0.5 + prog * 2.0);
      ctx.globalAlpha = 0.7 * a;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = fx.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(fxX, fxY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'heal_ring') {
      // Восходящие частицы хила
      const prog = 1 - a;
      ctx.globalAlpha = a;
      ctx.font = `${Math.floor(cellPx * 0.5)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI * 2 / 4 + prog * 2;
        const rr = cellPx * 0.7;
        const sx = fxX + Math.cos(ang) * rr;
        const sy = fxY + Math.sin(ang) * rr * 0.4 - prog * cellPx * 1.2;
        ctx.globalAlpha = a * (1 - prog);
        ctx.fillText('✚', sx, sy);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Текст (только эффекты с текстом)
  const _noTextKinds = ['chain','flash','spin','stun_ring','frost_ring','silence_ring','cleanse_ring','heal_ring'];
  for (const fx of state.effects) {
    if (_noTextKinds.includes(fx.kind)) continue;
    if (!fx.text) continue;
    if (fx.x < startCol - 2 || fx.x > endCol + 2) continue;
    if (fx.y < startRow - 2 || fx.y > endRow + 2) continue;

    const px = fx.x * cellPx, py = fx.y * cellPx;
    const a = fx.life / fx.maxLife;
    const size = fx.big ? 0.7 : 0.5;
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

// === КЕШ КАРТИНОК ===
const _imgCache = {};

function getSprite(path) {
  if (!path || !path.includes('.')) return null;
  if (_imgCache[path] === undefined) {
    const img = new Image();
    img.src = path;
    _imgCache[path] = img;
  }
  const img = _imgCache[path];
  return img.complete && img.naturalWidth > 0 ? img : null;
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
    let rIn = aoe.innerRadius * cellPx;
    const rOut = aoe.outerRadius * cellPx;
    if (rIn <= 0.1) rIn = 0.1;

    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
    ctx.beginPath(); ctx.arc(px, py, rIn, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath();
    ctx.arc(px, py, rOut, 0, Math.PI * 2);
    ctx.arc(px, py, rIn, 0, Math.PI * 2, true);
    ctx.fill();

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



// ===== ГЕРОЙ С КАСТОМ И БАФФАМИ =====
function drawHero(ctx, hero, cellPx) {
  if (!hero || hero.dead) return;
  const px = hero.x * cellPx, py = hero.y * cellPx;
  const r = Math.max(1, cellPx * 0.55);
  const scale = hero.attackAnim > 0 ? 1 + hero.attackAnim * 0.5 : 1;

  ctx.save(); ctx.translate(px, py); ctx.scale(scale, scale);

  const isEnemy = hero.team === 'enemy';
  const ringColor = hero.hitAnim > 0 ? '#ef4444' : (isEnemy ? '#c084fc' : '#4ade80');

  const grad = ctx.createRadialGradient(0, -r*0.3, 0, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.3)');
  grad.addColorStop(1, isEnemy ? 'rgba(192, 132, 252, 0.35)' : 'rgba(74, 222, 128, 0.35)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2.5; ctx.stroke();

  ctx.font = `${Math.floor(cellPx * 0.65)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(hero.emoji, 0, 0);
  ctx.restore();

  // ===== ИНДИКАТОР КАСТА =====
  if (hero.casting) {
    const c = hero.casting;
    const progress = Math.min(1, c.elapsed / c.duration);
    const radius = cellPx * 1.05;
    const skill = SKILLS[c.skillId];

    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(px, py, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, radius, -Math.PI / 2 + progress * Math.PI * 2, -Math.PI / 2 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (skill) {
      ctx.save();
      ctx.font = `${Math.floor(cellPx * 0.7)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.95;
      ctx.fillText(skill.icon, px, py);
      ctx.restore();

      ctx.save();
      ctx.font = `bold ${Math.max(9, Math.floor(cellPx * 0.28))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(skill.name, px, py - radius - 4);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(skill.name, px, py - radius - 4);
      ctx.restore();
    }
  }

  // ===== ИНДИКАТОРЫ БАФФОВ / ДЕБАФФОВ =====
  const _now = Date.now();
  const badges = [];

  if (hero.skillBuffs?.dodge && hero.skillBuffs.dodge.until > _now) {
    badges.push({ icon: '💨', color: '#80d4e0', left: (hero.skillBuffs.dodge.until - _now) / 1000 });
  }

  if (hero.stunUntil && hero.stunUntil > _now) {
    badges.push({ icon: '💫', color: '#fbbf24', left: (hero.stunUntil - _now) / 1000, debuff: true });
  }
  if (hero.slowUntil && hero.slowUntil > _now) {
    badges.push({ icon: '❄️', color: '#67e8f9', left: (hero.slowUntil - _now) / 1000, debuff: true });
  }
  if (hero.silenceUntil && hero.silenceUntil > _now) {
    badges.push({ icon: '🤐', color: '#3b82f6', left: (hero.silenceUntil - _now) / 1000, debuff: true });
  }
  if (hero.attackSpeedDebuff && hero.attackSpeedDebuff.until > _now) {
    badges.push({ icon: '🐢', color: '#67e8f9', left: (hero.attackSpeedDebuff.until - _now) / 1000, debuff: true });
  }

  if (badges.length > 0) {
    const badgeSize = cellPx * 1.15;
    const gap = 5;
    const totalW = badges.length * badgeSize + (badges.length - 1) * gap;
    let bx = px - totalW / 2;
    const by = py - r - cellPx * 1.5;

    for (const b of badges) {
      const blink = b.left < 2 && (Math.floor(_now / 200) % 2 === 0);
      ctx.save();
      ctx.globalAlpha = blink ? 0.35 : 1;

      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.beginPath();
      ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = b.debuff ? '#ef4444' : b.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.font = `${Math.floor(badgeSize * 0.7)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillText(b.icon, bx + badgeSize / 2, by + badgeSize / 2);
      ctx.shadowBlur = 0;

      ctx.font = `bold ${Math.max(9, Math.floor(badgeSize * 0.32))}px monospace`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      const txt = b.left >= 10 ? String(Math.ceil(b.left)) : b.left.toFixed(1);
      ctx.strokeText(txt, bx + badgeSize / 2, by + badgeSize);
      ctx.fillText(txt, bx + badgeSize / 2, by + badgeSize);

      ctx.restore();
      bx += badgeSize + gap;
    }
  }
}