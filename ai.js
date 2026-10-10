// ai.js
// Простой AI-контроллер для автобоя.
// Управляет скиллами и бафф-свитками из слотов.
// Работает только когда state.autoBattle = true (или hero.isAI = true).

import { SKILLS, BUFF_SCROLLS } from './config.js';
import { tryUseSkill, useBuffScroll } from './hero.js';

const HP_HEAL_THRESHOLD = 0.40;    // хил при HP < 40%
const HP_KILL_THRESHOLD = 0.30;    // ударный, если у врага > 30% HP
const MANA_MIN          = 0.20;    // ниже 20% — скиллы не трогаем
const MANA_FOR_DAMAGE   = 0.50;    // ударный требует > 50% маны

// Найти ближайшего врага из другого team
export function findNearestEnemy(hero, enemies) {
  let best = null, bestD = Infinity;
  for (const e of enemies) {
    if (!e || e.dead) continue;
    if (e.team && hero.team && e.team === hero.team) continue;
    const d = Math.hypot(e.x - hero.x, e.y - hero.y);
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

function classifySkill(skillId) {
  const def = SKILLS[skillId];
  if (!def) return null;
  const eff = def.effect || {};
  if (eff.type === 'heal') return { kind: 'heal', def };
  if (eff.type === 'multishot' || eff.type === 'damage' || eff.type === 'dot') return { kind: 'damage', def };
  if (eff.type === 'debuff') return { kind: 'debuff', def };
  if (eff.type === 'buff') return { kind: 'buff', def };
  if (eff.type === 'cleanse') return { kind: 'cleanse', def };
  if (eff.type === 'summon') return { kind: 'summon', def };
  if (eff.type === 'shield') return { kind: 'shield', def };
  return { kind: 'other', def };
}

// Главная функция — вызывается каждый кадр.
export function aiControl(hero, dt, enemies, applyEffect) {
  if (!hero || hero.dead) return;
  if (!hero.skills) return;
  if (!tryUseSkill) return;

  // ═══════════════════════════════════════════════════════
  // ── БОСС: движение к цели + автоатака ──
  // ═══════════════════════════════════════════════════════
  if (hero.boss && enemies && enemies.length > 0) {
    // Ищем живую цель
    let target = null, bestD = Infinity;
    for (const e of enemies) {
      if (!e || e.dead) continue;
      const d = Math.hypot(e.x - hero.x, e.y - hero.y);
      if (d < bestD) { target = e; bestD = d; }
    }

    if (target) {
      const tx = target.x - hero.x;
      const ty = target.y - hero.y;
      const dist = Math.hypot(tx, ty) || 1;

      // Двигаемся к цели, если не в радиусе атаки
      const attackRange = hero.attackRange || 1.5;
      if (dist > attackRange) {
        const speed = (hero.speed || 0.6) * dt;
        hero.x += tx / dist * speed;
        hero.y += ty / dist * speed;
        hero.hitAnim = 0;
      }

      // ── Автоатака в радиусе ──
      hero.attackCd = (hero.attackCd || 0) - dt;
      if (dist <= attackRange + 0.3 && hero.attackCd <= 0) {
        hero.attackCd = hero.baseAttackCd || 1.5;
        hero.attackAnim = 0.15;

const mobDmg = Math.max(1, Math.floor(hero.attack || 10));
        // Промах или попадание
        const dodgePct = target.dodge || 0;
        const isDodge = Math.random() * 100 < dodgePct;

        const st = (typeof window !== 'undefined' && window.state) ? window.state : null;

        if (isDodge) {
          // Промах
          if (st) {
            st.effects.push({
              x: target.x, y: target.y - 0.5,
              life: 0.7, maxLife: 0.7,
              color: '#a5f3fc', text: 'DODGE',
            });
          }
        } else {
          // Урон с учётом defense
          const def = target.defense || 0;
          const finalDmg = Math.max(1, mobDmg - Math.floor(def * 0.5));
          target.hp -= finalDmg;
          target.hitFlash = 0.15;
          target.hitAnim = 0.15;

          // Всплывашка «-N»
          if (st) {
            st.effects.push({
              x: target.x, y: target.y - 0.5,
              life: 0.7, maxLife: 0.7,
              color: '#ef4444', text: '-' + finalDmg,
            });
          }

          // Смерть цели
          if (target.hp <= 0) {
            target.hp = 0;
            target.dead = true;
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // ── Дальше — обычная AI логика (скиллы, слоты) ──
  // ═══════════════════════════════════════════════════════
  const nearest = findNearestEnemy(hero, enemies);

  const slots = hero.skillSlots || [];
  const healSkills = [], damageSkills = [], debuffSkills = [], buffSkills = [];
  const cleanseSkills = [], summonSkills = [], shieldSkills = [];
  const buffScrolls = [];

  for (let i = 0; i < slots.length; i++) {
    const slotStr = slots[i];
    if (!slotStr || typeof slotStr !== 'string') continue;

    const idx = slotStr.indexOf(':');
    let kind, id;

    if (idx === -1) {
      kind = 'skill'; id = slotStr;
    } else {
      kind = slotStr.slice(0, idx);
      id = slotStr.slice(idx + 1);
    }

    if (kind === 'skill') {
      if (!hero.skills[id]) continue;
      const cls = classifySkill(id);
      if (!cls) continue;
      if (cls.kind === 'heal')    healSkills.push(id);
      if (cls.kind === 'damage')  damageSkills.push(id);
      if (cls.kind === 'debuff')  debuffSkills.push(id);
      if (cls.kind === 'buff')    buffSkills.push(id);
      if (cls.kind === 'cleanse') cleanseSkills.push(id);
      if (cls.kind === 'summon')  summonSkills.push(id);
      if (cls.kind === 'shield')  shieldSkills.push(id);
    } else if (kind === 'buff') {
      buffScrolls.push(id);
    }
  }

  const manaPct = hero.maxMana > 0 ? hero.mana / hero.maxMana : 0;
  const now = Date.now();

  // ── 1) Хил при низком HP ────────────────────────────
  if (hero.hp / hero.maxHp < HP_HEAL_THRESHOLD && manaPct >= MANA_MIN) {
    for (const id of healSkills) {
      if (_tryAndApply(hero, id, applyEffect)) return;
    }
  }

  // ── 2) Cleanse — если на герое дебафф ───────────────
  const hasDebuff =
    (hero.stunUntil && hero.stunUntil > now) ||
    (hero.slowUntil && hero.slowUntil > now) ||
    (hero.silenceUntil && hero.silenceUntil > now) ||
    (hero.attackSpeedDebuff && hero.attackSpeedDebuff.until > now) ||
    (hero.dots && hero.dots.length > 0);
  if (hasDebuff && manaPct >= MANA_MIN) {
    for (const id of cleanseSkills) {
      if (_tryAndApply(hero, id, applyEffect)) return;
    }
  }

  // ── 3) Щит — если активного нет ────────────────────
  if (manaPct > MANA_MIN && shieldSkills.length > 0) {
    const hasShield = hero.shield && hero.shield.until > now;
    if (!hasShield) {
      for (const id of shieldSkills) {
        if (_tryAndApply(hero, id, applyEffect)) return;
      }
    }
  }

  // ── 4) Дебаффы на цель ───────
  if (nearest && manaPct > MANA_MIN) {
    for (const id of debuffSkills) {
      const eff = SKILLS[id]?.effect || {};
      const already =
        (eff.stat === 'stun'    && nearest.stunUntil    && nearest.stunUntil > now) ||
        (eff.stat === 'speed'   && nearest.slowUntil    && nearest.slowUntil > now) ||
        (eff.stat === 'silence' && nearest.silenceUntil && nearest.silenceUntil > now);
      if (already) continue;
      if (_tryAndApply(hero, id, applyEffect)) return;
    }
  }

  // ── 5) Урон — damage-скиллы ─────────────────────
  if (nearest && manaPct >= MANA_FOR_DAMAGE) {
    if (nearest.hp / nearest.maxHp > HP_KILL_THRESHOLD) {
      for (const id of damageSkills) {
        if (_tryAndApply(hero, id, applyEffect)) return;
      }
    }
  }

  // ── 6) Баффы ─
  if (manaPct > MANA_MIN) {
    for (const id of buffSkills) {
      const eff = SKILLS[id]?.effect || {};
      const stat = eff.stat;
      let active = false;
      if (stat && hero.skillBuffs?.[stat] && hero.skillBuffs[stat].until > now) {
        active = true;
      }
      if (active) continue;

      const defensive = stat === 'dodge' || stat === 'defense' || stat === 'reflect';
      if (defensive && hero.hp / hero.maxHp >= 0.6) continue;

      if (_tryAndApply(hero, id, applyEffect)) return;
    }
  }

  // ── 7) Summon ─
  if (manaPct > MANA_MIN && summonSkills.length > 0) {
    const shadows = (typeof window !== 'undefined' && window.state?.shadows) || [];
    const myShadow = shadows.some(s => s.ownerName === hero.name && s.expiresAt > now);
    if (!myShadow) {
      for (const id of summonSkills) {
        if (_tryAndApply(hero, id, applyEffect)) return;
      }
    }
  }

  // ── 8) Бафф-свитки ─────
  for (const type of buffScrolls) {
    const def = BUFF_SCROLLS[type];
    if (!def) continue;
    const activeUntil = hero.activeBuffs?.[type];
    if (activeUntil && activeUntil > now) continue;
    const cdUntil = hero.buffScrollCooldowns?.[type];
    if (cdUntil && cdUntil > now) continue;
    let hasScroll = false;
    for (const it of hero.backpack || []) {
      if (it.kind === 'buff' && it.buffType === type) { hasScroll = true; break; }
    }
    if (!hasScroll) continue;
    const r = useBuffScroll(hero, type);
    if (r && r.ok) return;
  }
}

function _canCast(hero, skillId) {
  const meta = hero.skills?.[skillId];
  if (!meta) return false;
  const when = meta.when || 'always';
  if (when === 'always') return true;

  const hpPct = hero.hp / hero.maxHp;
  if (when === 'hp_below_30') return hpPct < 0.30;
  if (when === 'hp_below_40') return hpPct < 0.40;
  if (when === 'hp_below_50') return hpPct < 0.50;
  if (when === 'hp_below_60') return hpPct < 0.60;
  if (when === 'hp_below_70') return hpPct < 0.70;
  if (when === 'hp_below_80') return hpPct < 0.80;
  if (when === 'hp_above_50') return hpPct > 0.50;
  if (when === 'hp_above_60') return hpPct > 0.60;
  if (when === 'hp_above_70') return hpPct > 0.70;
  if (when === 'hp_above_80') return hpPct > 0.80;
  return true;
}

function _tryAndApply(hero, skillId, applyEffect) {
  // ─── Проверка when ───
  if (!_canCast(hero, skillId)) return false;

  const r = tryUseSkill(hero, skillId);
  if (!r || !r.ok) return false;
  if (r.casting) return true;
  if (applyEffect) applyEffect(hero, r);
  return true;
}