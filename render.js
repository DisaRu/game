// render.js — изометрический рендер (L2 / Diablo style)
// Вся логика и координаты (x, y) — те же. Меняется только projection.

import { SKILLS } from './config.js';

// ============================================================
// ISO-ПРОЕКЦИЯ
// ============================================================
const TW = 38;   // ширина ромба (диагональ по X) — 4:3
const TH = 28;   // высота ромба (диагональ по Y)
const HALF_W = TW / 2;
const HALF_H = TH / 2;
function project(x, y) {
  return {
    sx: (x - y) * (TW / 2),
    sy: (x + y) * (TH / 2),
  };
}

// Хеш строки — для seed зоны
function strHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

// Базовый хэш 2D
function hash2d(x, y, seed) {
  let n = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(seed, 83492791);
  n = (n >>> 0) % 1000;
  return n / 1000;
}

// Плавный value noise с smoothstep-интерполяцией
function smoothNoise(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2d(ix, iy, seed);
  const n10 = hash2d(ix + 1, iy, seed);
  const n01 = hash2d(ix, iy + 1, seed);
  const n11 = hash2d(ix + 1, iy + 1, seed);
  const nx0 = n00 * (1 - sx) + n10 * sx;
  const nx1 = n01 * (1 - sx) + n11 * sx;
  return nx0 * (1 - sy) + nx1 * sy;
}

// Сдвиг яркости hex-цвета (delta от -255 до +255)
function shiftBrightness(hex, delta) {
  const num = parseInt(hex.slice(1), 16);
  let r = ((num >> 16) & 0xff) + delta;
  let g = ((num >> 8) & 0xff) + delta;
  let b = (num & 0xff) + delta;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Цвет клетки по биому. Арена — отдельно.
function getBiomeColor(x, y, COLS, ROWS, seed) {
  // Многослойный шум
  const n1 = smoothNoise(x * 0.07, y * 0.07, seed);
  const n2 = smoothNoise(x * 0.18, y * 0.18, seed + 1000);
  const n3 = smoothNoise(x * 0.45, y * 0.45, seed + 2000);
  const noise = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;

  // Смещение зон шумом — границы "дышат", не прямые
  const ny = y / ROWS + (n1 - 0.5) * 0.18;

  // Плавные веса трёх биомов — перетекают друг в друга
  const forest = Math.max(0, 1 - Math.abs(ny - 0.15) * 2.5);
  const glade  = Math.max(0, 1 - Math.abs(ny - 0.50) * 2.5);
  const sand   = Math.max(0, 1 - Math.abs(ny - 0.85) * 2.5);
  const total  = forest + glade + sand + 0.001;

  // Палитра
  const F = [18, 42, 16];   // тёмный лес
  const G = [36, 74, 28];   // поляна
  const S = [64, 54, 30];   // песок/камень

  let r = (forest * F[0] + glade * G[0] + sand * S[0]) / total;
  let g = (forest * F[1] + glade * G[1] + sand * S[1]) / total;
  let b = (forest * F[2] + glade * G[2] + sand * S[2]) / total;

  // Микро-вариация для живости травы
  const v = (noise - 0.5) * 24;
  r += v; g += v; b += v;

  // Плавное затемнение к краям карты — за 8 клеток
  const edge = Math.min(x, y, COLS - 1 - x, ROWS - 1 - y);
  if (edge < 8) {
    const dim = (1 - edge / 8) * 0.7;
    r *= (1 - dim);
    g *= (1 - dim);
    b *= (1 - dim);
  }

  r = r < 0 ? 0 : r > 255 ? 255 : r;
  g = g < 0 ? 0 : g > 255 ? 255 : g;
  b = b < 0 ? 0 : b > 255 ? 255 : b;

  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

// Кэш текущего смещения камеры (в экранных пикселях)
const cam = { x: 0, y: 0 };

// ============================================================
// ГЛАВНАЯ ФУНКЦИЯ
// ============================================================
export function render(ctx, canvas, state, layout, camera) {
  if (!state.hero) {
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.fillStyle = state.zoneBg || '#0a0503';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Тряска экрана (если есть)
  let shakeX = 0, shakeY = 0;
  if (state.shake && state.shake.t > 0) {
    shakeX = (Math.random() - 0.5) * state.shake.power;
    shakeY = (Math.random() - 0.5) * state.shake.power;
  }

  // Камера: центр на герое (или середине арены)
  const focus = state.arenaMode && state.arenaEnemy
    ? { x: (state.hero.x + state.arenaEnemy.x) / 2,
        y: (state.hero.y + state.arenaEnemy.y) / 2 }
    : { x: state.hero.x, y: state.hero.y };

  const fp = project(focus.x, focus.y);
  const _vw = window.innerWidth;
  const _vh = window.innerHeight;
  cam.x = fp.sx - _vw / 2;
  cam.y = fp.sy - _vh / 2;

  ctx.save();
  ctx.translate(-cam.x + shakeX, -cam.y + shakeY);

  // Видимая область в мировых координатах (для culling)
  const COLS = layout.COLS || 24;
  const ROWS = layout.ROWS || 36;
  const viewR = 11;

  const hx = Math.round(state.hero.x);
  const hy = Math.round(state.hero.y);

  // ===== 1. ПОЛ (ромбы) =====
  drawGround(ctx, hx, hy, COLS, ROWS, viewR, state);
  // ===== 1b. Декор лаиров =====
  if (!state.arenaMode && state.currentZone?.lairs) {
    drawLairs(ctx, state.currentZone.lairs);
  }
  // ===== 2. AoE-маркеры (на земле) =====
  if (state.aoeList) {
    for (const aoe of state.aoeList) drawAoe(ctx, aoe);
  }

  // ===== 3. Портал (на земле) =====
  if (state.portal && state.portal.active) drawPortal(ctx, state.portal);

  // ===== 4. Собираем ВСЕХ живых сущностей, сортируем по (x + y) =====
  const entities = [];

  for (const m of state.mobs) {
    if (m.dead) continue;
    entities.push({ kind: 'mob', ref: m, sortY: m.x + m.y });
  }

  if (state.shadows && state.shadows.length > 0) {
    for (const s of state.shadows) {
      entities.push({ kind: 'shadow', ref: s, sortY: s.x + s.y });
    }
  }

  if (state.arenaMode && state.arenaEnemy) {
    entities.push({ kind: 'arenaEnemy', ref: state.arenaEnemy, sortY: state.arenaEnemy.x + state.arenaEnemy.y });
  }

  entities.push({ kind: 'hero', ref: state.hero, sortY: state.hero.x + state.hero.y });

  entities.sort((a, b) => a.sortY - b.sortY);

  // ===== 5. Рисуем в порядке дальние → ближние =====
  for (const e of entities) {
    if (e.kind === 'mob')          drawMob(ctx, e.ref);
    else if (e.kind === 'shadow')  drawShadow(ctx, e.ref);
    else if (e.kind === 'hero')    drawHero(ctx, e.ref, false);
    else if (e.kind === 'arenaEnemy') drawHero(ctx, e.ref, true);
  }

  // ===== 6. Снаряды (поверх всего, летят над землёй) =====
  for (const p of state.projectiles) {
    if (p.delay && p.delay > 0) continue;
    drawProjectile(ctx, p);
  }

  // ===== 7. Эффекты (фон + текст) =====
  for (const fx of state.effects) drawEffectBg(ctx, fx);
  for (const fx of state.effects) drawEffectText(ctx, fx);

  ctx.restore();

  // ── Виньетка по краям экрана (не только по карте) ──
  if (!state.arenaMode) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const grad = ctx.createRadialGradient(
      vw / 2, vh / 2, Math.min(vw, vh) * 0.35,
      vw / 2, vh / 2, Math.max(vw, vh) * 0.75
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
  }
}

// ============================================================
// ПОЛ — ромбы
// ============================================================
// Кэш offscreen-фона — пересобирается при смене зоны
let _bgOffscreen = null;
let _bgOffscreenKey = '';
let _bgOffscreenOx = 0;

function buildBackground(state, COLS, ROWS) {
  const key = (state.currentCity || '') + '|' + (state.currentZone?.id || 'arena') + '|' + COLS + 'x' + ROWS;
  if (_bgOffscreenKey === key && _bgOffscreen) return _bgOffscreen;

  const W = (COLS + ROWS) * (TW / 2) + TW;
  const H = (COLS + ROWS) * (TH / 2) + TH;
  const off = document.createElement('canvas');
  off.width = Math.ceil(W);
  off.height = Math.ceil(H);
  const octx = off.getContext('2d');

  const ox = ROWS * (TW / 2);
  _bgOffscreenOx = ox;

  const arenaMode = state.arenaMode;
  const seed = strHash(key);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const sx = (x - y) * (TW / 2) + ox;
      const sy = (x + y) * (TH / 2);

      let fill;
      if (arenaMode) {
        const isDark = (x + y) % 2 === 0;
        fill = isDark ? '#1e1830' : '#252038';
      } else {
        fill = getBiomeColor(x, y, COLS, ROWS, seed);
      }

      octx.beginPath();
      octx.moveTo(sx,     sy - TH / 2);
      octx.lineTo(sx + TW / 2, sy);
      octx.lineTo(sx,     sy + TH / 2);
      octx.lineTo(sx - TW / 2, sy);
      octx.closePath();
      octx.fillStyle = fill;
      octx.fill();
    }
  }

  _bgOffscreen = off;
  _bgOffscreenKey = key;
  return off;
}

function drawGround(ctx, hx, hy, COLS, ROWS, R, state) {
  const bg = buildBackground(state, COLS, ROWS);
  // Смещаем offscreen так, чтобы клетка (0,0) встала на своё мировое место
  ctx.drawImage(bg, -_bgOffscreenOx, 0);
}

function diamond(ctx, cx, cy, w, h, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(cx,     cy - h);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx,     cy + h);
  ctx.lineTo(cx - w, cy);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// ============================================================
// ТЕНЬ
// ============================================================
function drawEllipseShadow(ctx, sx, sy, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(sx, sy + ry * 0.5, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.fill();
}

// ============================================================
// ПОРТАЛ
// ============================================================
function drawPortal(ctx, portal) {
  const p = project(portal.x, portal.y);
  const pulse = 1 + Math.sin(portal.pulse) * 0.15;

  // Кольцо-основание на земле (эллипс)
  ctx.save();
  ctx.globalAlpha = 0.5 + Math.sin(portal.pulse * 2) * 0.3;
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, TW * 0.6 * pulse, TH * 0.6 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Иконка
  ctx.save();
  ctx.font = '32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 20;
  ctx.fillText('🏛', p.sx, p.sy - 4);
  ctx.restore();
}

// ============================================================
// МОБ
// ============================================================
function drawMob(ctx, m) {
  const p = project(m.x, m.y);
  const size = m.size || 0.7;
  const scale = m.spawnAnim > 0 ? (1 - m.spawnAnim / 0.3) : 1;
  const shake = m.hitFlash > 0 ? (Math.random() - 0.5) * 4 : 0;

  // Каст-глоу босса
  if (m.boss && m.castGlow > 0) {
    ctx.save();
    ctx.globalAlpha = m.castGlow;
    const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, TW * 1.2);
    grad.addColorStop(0, 'rgba(255,200,50,.6)');
    grad.addColorStop(1, 'rgba(255,200,50,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, TW * 1.2, TH * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Тень на земле
  const shadowRx = TW * 0.20 * size;
  const shadowRy = TH * 0.20 * size;
  ctx.save();
  if (m.boss) ctx.globalAlpha = 0.85;
  drawEllipseShadow(ctx, p.sx, p.sy, shadowRx, shadowRy);
  ctx.restore();

  // Аура агра — только у босса (тонкая тёмная тень под ним)
  if (m.boss) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, shadowRx * 1.3, shadowRy * 1.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Спрайт
  const sprite = getSprite(m.emoji);
   const drawH = TH *0.5 * size * scale;

  const drawW = drawH;

  ctx.save();
  if (m.boss) {
    ctx.shadowColor = '#dc2626';
    ctx.shadowBlur = 12;
  } else {
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 0;   // отключаем размытие у обычных мобов — большая экономия
  }
  if (sprite) {
    ctx.translate(p.sx + shake, p.sy - drawH * 0.5);
    ctx.scale(m.facing < 0 ? -1 : 1, 1);
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
  } else {
    ctx.font = `${Math.floor(drawH * 0.9)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(m.emoji, p.sx + shake, p.sy - 2);
  }
  ctx.restore();

  // ── ИМЯ над спрайтом (без HP-бара) ──
  const nameColor = m.boss ? '#fbbf24'
                  : m.champion ? '#fbbf24'
                  : '#cbd5e1';
  const nameY = p.sy - drawH - 4;

  drawNameplate(ctx, p.sx, nameY, m.name, nameColor);

  // ── Дебаффы над именем ──
  drawDebuffIcons(ctx, p.sx, nameY - 12, m);

  // ── Яд (DoT) — зелёные пузыри на теле ──
  if (m.dots && m.dots.length > 0) {
    drawPoisonPuff(ctx, p.sx, p.sy - drawH * 0.45, size);
  }
}
// ============================================================
// ТЕНЬ ГЕРОЯ (summon_shadow)
// ============================================================
function drawShadow(ctx, s) {
  const p = project(s.x, s.y);
  const levit = Math.sin((s._levitate || 0) * 2) * 6;
  const rx = TW * 0.28;
  const ry = TH * 0.28;

  // Тень на земле
  ctx.save();
  ctx.globalAlpha = 0.5;
  drawEllipseShadow(ctx, p.sx, p.sy, rx, ry);
  ctx.restore();

  // Сияние
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.translate(p.sx, p.sy - ry + levit);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.6);
  grad.addColorStop(0, 'rgba(168, 85, 247, 0.6)');
  grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, rx * 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Тело
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.font = `${Math.floor(TH * 1.2)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.emoji || '👤', p.sx, p.sy - ry + levit);
  ctx.restore();

  // Имя
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText('👤 ' + s.name, p.sx, p.sy - ry * 2 - 12 + levit);
  ctx.fillStyle = '#c084fc';
  ctx.fillText('👤 ' + s.name, p.sx, p.sy - ry * 2 - 12 + levit);
  ctx.restore();

  // Мини-HP-бар
  const sMaxHp = s.maxHp || s.hp || 1;
  const pct = Math.max(0, Math.min(1, (s.hp || 0) / sMaxHp));
  const bw = TW * 0.7;
  const bh = 3;
  const bx = p.sx - bw / 2;
  const by = p.sy - ry * 2 - 8 + levit;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(0,0,0,.8)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
  ctx.fillStyle = pct > 0.3 ? '#a855f7' : '#7f1d1d';
  ctx.fillRect(bx, by, bw * pct, bh);
  ctx.restore();
}

// ============================================================
// ГЕРОЙ
// ============================================================
function drawHero(ctx, hero, isEnemy) {
  if (!hero || hero.dead) return;
  const p = project(hero.x, hero.y);
  const scale = hero.attackAnim > 0 ? 1 + hero.attackAnim * 0.5 : 1;
  const drawH = TH * 0.6 * scale;
  const ringColor = hero.hitAnim > 0 ? '#ef4444'
                  : (isEnemy ? '#c084fc' : '#4ade80');

  // Тень
  ctx.save();
  drawEllipseShadow(ctx, p.sx, p.sy, TW * 0.32, TH * 0.32);
  ctx.restore();

  // Кольцо
  ctx.save();
  ctx.strokeStyle = ringColor;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = ringColor;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, TW * 0.32, TH * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Эмодзи / спрайт
  ctx.save();
  ctx.font = `${Math.floor(drawH * 0.85)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,.7)';
  ctx.shadowBlur = 0;
  ctx.fillText(hero.emoji, p.sx, p.sy - 2);
  ctx.restore();

  // Индикатор каста
  if (hero.casting) drawCastIndicator(ctx, hero, p);

  // ── ИМЯ над спрайтом ──
  const nameColor = isEnemy ? '#d4a5ff' : '#f4d477';
  const nameY = p.sy - drawH - 4;
  drawNameplate(ctx, p.sx, nameY, hero.name, nameColor);

  // ── Дебаффы над именем ──
  drawDebuffIcons(ctx, p.sx, nameY - 12, hero);

  // ── Яд (DoT) — зелёные пузыри ──
  if (hero.dots && hero.dots.length > 0) {
    drawPoisonPuff(ctx, p.sx, p.sy - drawH * 0.45, 1);
  }
}

function drawCastIndicator(ctx, hero, p) {
  const c = hero.casting;
  const progress = Math.min(1, c.elapsed / c.duration);
  const rX = TW * 0.55;
  const rY = TH * 0.55;
  const skill = SKILLS[c.skillId];

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  // Прогресс по эллипсу (параметрическая дуга)
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + progress * Math.PI * 2;
  ctx.ellipse(p.sx, p.sy, rX, rY, 0, startAngle, endAngle);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(100,100,100,.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy, rX, rY, 0, endAngle, startAngle + Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Иконка скилла
  if (skill) {
    ctx.save();
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(skill.icon, p.sx, p.sy - TH * 1.2);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(skill.name, p.sx, p.sy - TH * 1.8);
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(skill.name, p.sx, p.sy - TH * 1.8);
    ctx.restore();
  }
}

function drawBuffBadges(ctx, hero, p, drawH) {
  const now = Date.now();
  const badges = [];

  if (hero.skillBuffs?.dodge && hero.skillBuffs.dodge.until > now) {
    badges.push({ icon: '💨', color: '#80d4e0', left: (hero.skillBuffs.dodge.until - now) / 1000 });
  }
  if (hero.stunUntil && hero.stunUntil > now) {
    badges.push({ icon: '💫', color: '#fbbf24', left: (hero.stunUntil - now) / 1000, debuff: true });
  }
  if (hero.slowUntil && hero.slowUntil > now) {
    badges.push({ icon: '❄️', color: '#67e8f9', left: (hero.slowUntil - now) / 1000, debuff: true });
  }
  if (hero.silenceUntil && hero.silenceUntil > now) {
    badges.push({ icon: '🤐', color: '#3b82f6', left: (hero.silenceUntil - now) / 1000, debuff: true });
  }
  if (hero.attackSpeedDebuff && hero.attackSpeedDebuff.until > now) {
    badges.push({ icon: '🐢', color: '#67e8f9', left: (hero.attackSpeedDebuff.until - now) / 1000, debuff: true });
  }
  if (badges.length === 0) return;

  const badgeSize = 18;
  const gap = 4;
  const totalW = badges.length * badgeSize + (badges.length - 1) * gap;
  let bx = p.sx - totalW / 2;
  const by = p.sy - drawH - 20;

  for (const b of badges) {
    const blink = b.left < 2 && (Math.floor(now / 200) % 2 === 0);
    ctx.save();
    ctx.globalAlpha = blink ? 0.35 : 1;

    ctx.fillStyle = 'rgba(0,0,0,.85)';
    ctx.beginPath();
    ctx.arc(bx + badgeSize / 2, by + badgeSize / 2, badgeSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = b.debuff ? '#ef4444' : b.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 6;
    ctx.fillText(b.icon, bx + badgeSize / 2, by + badgeSize / 2);
    ctx.shadowBlur = 0;

    ctx.font = 'bold 9px monospace';
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

// ============================================================
// СНАРЯДЫ
// ============================================================
function drawProjectile(ctx, p) {
  const proj = project(p.x, p.y);
  // Снаряды «летят» — поднимаем их над землёй на пару пикселей
  const flyH = 14;
  const sx = proj.sx;
  const sy = proj.sy - flyH;

  const isMage = p.weaponType === 'staff';
  const isSkill = p.isSkill === true;

  // Трейл (жирнее для скиллов; особенно — метеор)
  const isMeteor = p.skillId === 'meteor';
  const isExecute = p.isExecute;
  if (p.trail) {
    const trailBoost = isMeteor ? 2.2 : (isSkill ? 1.6 : 1);
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const tp = project(t.x, t.y);
      const a = (i / p.trail.length) * (isMage || isSkill ? 0.65 : 0.35);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = isExecute ? '#7f1d1d' : p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isMeteor ? 18 : 0;
      ctx.beginPath();
      ctx.arc(tp.sx, tp.sy - flyH, (isMage ? 3.5 : 2) * trailBoost, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.shadowColor = p.color;
  ctx.shadowBlur = isSkill ? 22 : (isMage ? 14 : 6);
  ctx.fillStyle = p.color;

  if (p.bigProjectile) {
    const r1 = 12;
    ctx.beginPath(); ctx.arc(sx, sy, r1, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath(); ctx.arc(sx, sy, r1 * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, r1 * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (isSkill) {
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
  } else if (isMage) {
    ctx.beginPath(); ctx.arc(sx, sy, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
  } else {
    // Стрела — короткая линия вдоль вектора движения (в проекции)
    const ang = Math.atan2(p.vy + p.vx, p.vx - p.vy); // приближенно
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(ang);
    ctx.fillRect(-5, -1, 10, 2);
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
// AoE-МАРКЕРЫ (эллипсы в iso-плоскости)
// ============================================================
function drawAoe(ctx, aoe) {
  const a = aoe.life / aoe.maxLife;
  const progress = 1 - a;
  const p = project(aoe.x, aoe.y);
  const intensity = 0.3 + progress * 0.7;

  ctx.save();
  ctx.globalAlpha = intensity;

  if (aoe.type === 'circle' || aoe.type === 'marker') {
    const rX = aoe.radius * (TW / 2);
    const rY = aoe.radius * (TH / 2);
    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2;
    const shrink = 1 - progress;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX * shrink, rY * shrink, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (aoe.type === 'line') {
    // Линия — рисуем как наклонный параллелограмм вдоль оси Y
    const len = aoe.length * (TH / 2);
    const thick = aoe.thickness * (TW / 2);
    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath();
    ctx.moveTo(p.sx - thick, p.sy - len);
    ctx.lineTo(p.sx + thick, p.sy - len);
    ctx.lineTo(p.sx + thick, p.sy + len);
    ctx.lineTo(p.sx - thick, p.sy + len);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (aoe.type === 'ring') {
    const rInX = aoe.innerRadius * (TW / 2);
    const rInY = aoe.innerRadius * (TH / 2);
    const rOutX = aoe.outerRadius * (TW / 2);
    const rOutY = aoe.outerRadius * (TH / 2);
    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rInX, rInY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = aoe.color + '40';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rOutX, rOutY, 0, 0, Math.PI * 2);
    ctx.ellipse(p.sx, p.sy, rInX, rInY, 0, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rInX, rInY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = aoe.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rOutX, rOutY, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (aoe.type === 'fire') {
    for (const s of aoe.spots) {
      if (s.life <= 0) continue;
      const sp = project(s.x, s.y);
      const rX = s.radius * (TW / 2);
      const rY = s.radius * (TH / 2);
      const alpha = Math.min(1, s.life / 2);
      const grad = ctx.createRadialGradient(sp.sx, sp.sy, 0, sp.sx, sp.sy, rX);
      grad.addColorStop(0, 'rgba(251, 146, 60, ' + (alpha * 0.9) + ')');
      grad.addColorStop(0.5, 'rgba(234, 88, 12, ' + (alpha * 0.6) + ')');
      grad.addColorStop(1, 'rgba(120, 30, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.ellipse(sp.sx, sp.sy, rX, rY, 0, 0, Math.PI * 2); ctx.fill();
    }
  }

  ctx.restore();
}

// ============================================================
// ЭФФЕКТЫ (фоновые)
// ============================================================
function drawEffectBg(ctx, fx) {
  const a = fx.life / fx.maxLife;
  // Если эффект привязан к живому юниту — проецируем от текущей позиции,
  // а не от захваченной при касте (иначе кольцо отстаёт при движении)
  const anchor = (fx.owner && !fx.owner.dead) ? fx.owner : fx;
  const p = project(anchor.x, anchor.y);

  if (fx.kind === 'chain') {
    const p1 = project(fx.x1, fx.y1);
    const p2 = project(fx.x2, fx.y2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(p1.sx, p1.sy);
    const midX = (p1.sx + p2.sx) / 2;
    const midY = (p1.sy + p2.sy) / 2 + (Math.random() - 0.5) * 20;
    ctx.lineTo(midX, midY);
    ctx.lineTo(p2.sx, p2.sy);
    ctx.stroke();
    ctx.restore();
  } else if (fx.kind === 'flash') {
    const rX = (fx.radius || 0.8) * (TW / 2);
    const rY = (fx.radius || 0.8) * (TH / 2);
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, rX);
    grad.addColorStop(0, fx.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (fx.kind === 'spin') {
    const prog = 1 - a;
    const rX = TW * 0.5;
    const rY = TH * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 3;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 12;
    const angle = prog * Math.PI * 6;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, angle, angle + Math.PI * 0.9); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, angle + Math.PI, angle + Math.PI * 1.9); ctx.stroke();
    ctx.restore();
  } else if (fx.kind === 'stun_ring') {
    const prog = 1 - a;
    const rX = TW * 0.55;
    const rY = TH * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) {
      const ang = prog * Math.PI * 4 + k * Math.PI * 2 / 3;
      const sx = p.sx + Math.cos(ang) * rX;
      const sy = p.sy - TH * 1.2 + Math.sin(ang) * rY * 0.4;
      ctx.fillText('⭐', sx, sy);
    }
    ctx.restore();
  } else if (fx.kind === 'frost_ring') {
    const rX = TW * 0.55;
    const rY = TH * 0.55;
    ctx.save();
    ctx.globalAlpha = 0.55 * a;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a;
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❄️', p.sx, p.sy - TH * 1.2);
    ctx.restore();
  } else if (fx.kind === 'silence_ring') {
    const pulse = 0.9 + Math.sin(Date.now() / 200) * 0.15;
    const rX = TW * 0.6 * pulse;
    const rY = TH * 0.6 * pulse;
    ctx.save();
    ctx.globalAlpha = 0.55 * a;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a;
    ctx.font = '18px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🤐', p.sx, p.sy - TH * 1.3);
    ctx.restore();
  } else if (fx.kind === 'cleanse_ring') {
    const prog = 1 - a;
    const rX = TW * (0.3 + prog * 1.2);
    const rY = TH * (0.3 + prog * 1.2);
    ctx.save();
    ctx.globalAlpha = 0.7 * a;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (fx.kind === 'heal_ring') {
    const prog = 1 - a;
    ctx.save();
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 4; k++) {
      const ang = k * Math.PI * 2 / 4 + prog * 2;
      const rr = TW * 0.35;
      const sx = p.sx + Math.cos(ang) * rr;
      const sy = p.sy - TH * 0.5 + Math.sin(ang) * rr * 0.4 - prog * TH * 2;
      ctx.globalAlpha = a * (1 - prog);
      ctx.fillText('✚', sx, sy);
    }
    ctx.restore();

  } else if (fx.kind === 'shield_ring') {
    const owner = fx.owner || null;
    if (!owner || !owner.shield || owner.shield.until < Date.now()) return;
    const pulse = 1 + Math.sin(Date.now() / 200) * 0.08;
    const rX = TW * 0.72 * pulse;
    const rY = TH * 0.72 * pulse;
    const hpLeft = Math.max(0, Math.min(1, owner.shield.remaining / Math.max(1, owner.shield.max)));
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#60a5fa';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2 * hpLeft);
    ctx.fill();
    ctx.restore();

  } else if (fx.kind === 'arrow_rain_marker') {
    // AoE-метка дождя стрел (для arrow_rain)
    const prog = 1 - a;
    const rX = (fx.radius || 2) * (TW / 2);
    const rY = (fx.radius || 2) * (TH / 2);
    ctx.save();
    ctx.globalAlpha = a * 0.75;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    // Внутреннее кольцо-сжатие
    ctx.globalAlpha = a * 0.4;
    ctx.lineWidth = 2;
    const shrink = 1 - prog;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX * shrink, rY * shrink, 0, 0, Math.PI * 2); ctx.stroke();
    // Падающие стрелы
    ctx.globalAlpha = a;
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2 + prog * 4;
      const rr = rX * 0.75;
      const ax = p.sx + Math.cos(ang) * rr;
      const ay = p.sy + Math.sin(ang) * rr * 0.4 - prog * 40;
      ctx.globalAlpha = a * (1 - prog * 0.6);
      ctx.fillText('🏹', ax, ay);
    }
    ctx.restore();
  } else if (fx.kind === 'nova_wave') {
    // Расширяющееся кольцо от кастера (frost_nova)
    const prog = 1 - a;
    const rX = (fx.radius || 3) * (TW / 2) * prog;
    const rY = (fx.radius || 3) * (TH / 2) * prog;
    ctx.save();
    ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 5;
    ctx.shadowColor = fx.color;
    ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = a * 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX * 1.15, rY * 1.15, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (fx.kind === 'aoe_hit') {
    // Вспышка при AoE-попадании
    const prog = 1 - a;
    const rX = (fx.radius || 1.5) * (TW / 2) * (0.5 + prog * 0.8);
    const rY = (fx.radius || 1.5) * (TH / 2) * (0.5 + prog * 0.8);
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, rX);
    grad.addColorStop(0, fx.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.ellipse(p.sx, p.sy, rX, rY, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (fx.kind === 'aura_vampiric') {
    const owner = fx.owner;
    if (!owner || owner.dead) return;
    const op = project(owner.x, owner.y);
    const t = Date.now() / 400;
    ctx.save();
    ctx.globalAlpha = a * 0.5;
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let k = 0; k < 3; k++) {
      const ang = t + k * Math.PI * 2 / 3;
      const rx = Math.cos(ang) * TW * 0.3;
      const ry = Math.sin(ang) * TH * 0.3;
      ctx.fillStyle = '#e07878';
      ctx.fillText('❤', op.sx + rx, op.sy + ry - TH * 0.4);
    }
    ctx.restore();
  } else if (fx.kind === 'aura_reflect') {
    const owner = fx.owner;
    if (!owner || owner.dead) return;
    const op = project(owner.x, owner.y);
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.strokeStyle = fx.color || '#c084fc';
    ctx.lineWidth = 2;
    ctx.shadowColor = fx.color || '#c084fc';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(op.sx, op.sy - TH * 0.35, TW * 0.35, TH * 0.35, Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(op.sx, op.sy - TH * 0.35, TW * 0.35, TH * 0.35, -Math.PI / 4, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (fx.kind === 'aura_stone') {
    const owner = fx.owner;
    if (!owner || owner.dead) return;
    const op = project(owner.x, owner.y);
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.fillStyle = 'rgba(96, 165, 250, 0.35)';
    ctx.beginPath(); ctx.ellipse(op.sx, op.sy, TW * 0.38, TH * 0.38, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = fx.color || '#60a5fa';
    ctx.lineWidth = 3;
    ctx.shadowColor = fx.color || '#60a5fa';
    ctx.shadowBlur = 10;
    for (let k = 0; k < 4; k++) {
      const ang = k * Math.PI / 2 + Math.PI / 4;
      const rx = Math.cos(ang) * TW * 0.35;
      const ry = Math.sin(ang) * TH * 0.35;
      ctx.beginPath();
      ctx.moveTo(op.sx + rx - 4, op.sy + ry);
      ctx.lineTo(op.sx + rx, op.sy + ry - 8);
      ctx.lineTo(op.sx + rx + 4, op.sy + ry);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  } else if (fx.kind === 'aura_haste') {
    const owner = fx.owner;
    if (!owner || owner.dead) return;
    const op = project(owner.x, owner.y);
    ctx.save();
    ctx.globalAlpha = a * 0.3;
    ctx.font = `${Math.floor(TH * 0.6)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      ctx.fillStyle = fx.color || '#fde047';
      ctx.fillText(owner.emoji || '👤', op.sx + k * 7, op.sy - 2);
    }
    ctx.restore();
  } else if (fx.kind === 'aura_rage') {
    const owner = fx.owner;
    if (!owner || owner.dead) return;
    const op = project(owner.x, owner.y);
    const pulse = 1 + Math.sin(Date.now() / 100) * 0.15;
    ctx.save();
    ctx.globalAlpha = a * 0.55;
    ctx.font = `${Math.floor(TH * 0.7 * pulse)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', op.sx, op.sy - TH * 0.3);
    ctx.fillText('🔥', op.sx - TW * 0.22, op.sy - TH * 0.45);
    ctx.fillText('🔥', op.sx + TW * 0.22, op.sy - TH * 0.45);
    ctx.restore();
  }
}

// ============================================================
// ЭФФЕКТЫ — ТЕКСТ (всплывает над землёй)
// ============================================================
function drawEffectText(ctx, fx) {
  const noText = ['chain','flash','spin','stun_ring','frost_ring','silence_ring','cleanse_ring','heal_ring'];
  if (noText.includes(fx.kind)) return;
  if (!fx.text) return;

  const p = project(fx.x, fx.y);
  const a = fx.life / fx.maxLife;
  const size = fx.big ? 16 : 12;
  const rise = (1 - a) * 30;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(fx.text, p.sx, p.sy - 30 - rise);
  ctx.fillStyle = fx.color;
  ctx.fillText(fx.text, p.sx, p.sy - 30 - rise);
  ctx.restore();
}

// ============================================================
// КЭШ СПРАЙТОВ
// ============================================================
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
// ═══════════════════════════════════════════════════════════
// NAME + DEBUFFS над спрайтами
// ═══════════════════════════════════════════════════════════

function drawNameplate(ctx, sx, sy, name, color) {
  if (!name) return;
  ctx.save();
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(name, sx, sy);
  ctx.fillStyle = color || '#cbd5e1';
  ctx.fillText(name, sx, sy);
  ctx.restore();
}

function drawPoisonPuff(ctx, sx, sy, size) {
  const t = Date.now() / 300;
  const count = 4;
  ctx.save();
  for (let i = 0; i < count; i++) {
    const ang = t + i * Math.PI * 2 / count;
    const rx = Math.cos(ang) * 11 * size;
    const ry = Math.sin(ang * 1.3) * 7 * size - 6;
    ctx.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(t * 2 + i));
    ctx.fillStyle = '#84cc16';
    ctx.beginPath();
    ctx.arc(sx + rx, sy + ry, 2.8 * size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDebuffIcons(ctx, sx, sy, unit) {
  if (!unit) return;
  const now = Date.now();
  const icons = [];

  if (unit.stunUntil && unit.stunUntil > now) icons.push('💫');
  if (unit.slowUntil && unit.slowUntil > now) icons.push('❄️');
  if (unit.silenceUntil && unit.silenceUntil > now) icons.push('🤐');
  if (unit.attackSpeedDebuff && unit.attackSpeedDebuff.until > now) icons.push('🐢');
  if (unit.dots && unit.dots.length > 0) icons.push('🩸');

  if (icons.length === 0) return;

  const size = 14;
  const gap = 2;
  const totalW = icons.length * size + (icons.length - 1) * gap;
  let ix = sx - totalW / 2;

  ctx.save();
  ctx.font = `${size - 2}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const ico of icons) {
    // Тёмный фон-подложка
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(ix + size / 2, sy - size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Иконка
    ctx.fillStyle = '#fff';
    ctx.fillText(ico, ix + size / 2, sy - size / 2);
    ix += size + gap;
  }
  ctx.restore();
}
// ============================================================
// ДЕКОР ЛАИРОВ (костёр, трава, кости, камни)
// ============================================================
function drawLairs(ctx, lairs) {
  for (const lair of lairs) {
    const p = project(lair.cx, lair.cy);
    const seed = strHash(lair.id);

    // ── Центральный декор ──
    if (lair.decor === 'campfire') {
      // Тлеющие угли (круг под костром)
      ctx.save();
      ctx.globalAlpha = 0.4;
      const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 40);
      grad.addColorStop(0, 'rgba(255,120,30,0.5)');
      grad.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Костёр
      ctx.save();
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 12;
      ctx.fillText('🔥', p.sx, p.sy);
      ctx.restore();

    } else if (lair.decor === 'bones') {
      // Разбросанные кости
      for (let i = 0; i < 5; i++) {
        const a = (seed + i * 137) % 360 * Math.PI / 180;
        const r = ((seed * (i + 1)) % 100) / 100 * lair.radius * 0.7;
        const bx = p.sx + Math.cos(a) * r * (TW / 2);
        const by = p.sy + Math.sin(a) * r * (TH / 2);
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.font = '18px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(i % 2 === 0 ? '💀' : '🦴', bx, by);
        ctx.restore();
      }

    } else if (lair.decor === 'grass') {
      // Кластеры травы
      for (let i = 0; i < 8; i++) {
        const a = (seed + i * 91) % 360 * Math.PI / 180;
        const r = ((seed * (i + 3)) % 100) / 100 * lair.radius * 0.85;
        const gx = p.sx + Math.cos(a) * r * (TW / 2);
        const gy = p.sy + Math.sin(a) * r * (TH / 2);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.font = '14px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌿', gx, gy);
        ctx.restore();
      }

    } else if (lair.decor === 'rocks') {
      // Камни по кругу
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + (seed % 10) / 10;
        const r = lair.radius * 0.8;
        const rx = p.sx + Math.cos(a) * r * (TW / 2);
        const ry = p.sy + Math.sin(a) * r * (TH / 2);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.font = '16px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🪨', rx, ry);
        ctx.restore();
      }
    }
  }
}