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

  // ── 4) Дебаффы на цель — все, которых ещё нет ───────
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

  // ── 5) Урон — все damage-скиллы ─────────────────────
  if (nearest && manaPct >= MANA_FOR_DAMAGE) {
    if (nearest.hp / nearest.maxHp > HP_KILL_THRESHOLD) {
      for (const id of damageSkills) {
        if (_tryAndApply(hero, id, applyEffect)) return;
      }
    }
  }

  // ── 6) Баффы (dodge/attackSpeed/defense/attack/crit/lifesteal/range) ─
  if (manaPct > MANA_MIN) {
    for (const id of buffSkills) {
      const eff = SKILLS[id]?.effect || {};
      const stat = eff.stat;
      let active = false;
      if (stat && hero.skillBuffs?.[stat] && hero.skillBuffs[stat].until > now) {
        active = true;
      }
      if (active) continue;

      // Defensive — только при HP < 60%
      const defensive = stat === 'dodge' || stat === 'defense' || stat === 'reflect';
      if (defensive && hero.hp / hero.maxHp >= 0.6) continue;

      // Offensive (attack, attackSpeed, critChance, lifesteal, range) — кастуем сразу
      if (_tryAndApply(hero, id, applyEffect)) return;
    }
  }

  // ── 7) Summon (тень/пантера) — если нет ─────────────
  if (manaPct > MANA_MIN && summonSkills.length > 0) {
    const shadows = (typeof window !== 'undefined' && window.state?.shadows) || [];
    const myShadow = shadows.some(s => s.ownerName === hero.name && s.expiresAt > now);
    if (!myShadow) {
      for (const id of summonSkills) {
        if (_tryAndApply(hero, id, applyEffect)) return;
      }
    }
  }

  // ── 8) Бафф-свитки — если нет активного и не КД ─────
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

function _tryAndApply(hero, skillId, applyEffect) {
  const r = tryUseSkill(hero, skillId);
  if (!r || !r.ok) return false;
  if (r.casting) return true;
  if (applyEffect) applyEffect(hero, r);
  return true;
}