// ai.js
// Простой AI-контроллер для автобоя.
// Управляет скиллами: хил, дебафф, ударный, бафф.
// Вызывается из main.js каждый кадр, если state.autoBattle = true,
// либо для любого героя с isAI = true.

import { SKILLS } from './config.js';
import { tryUseSkill } from './hero.js';

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
  if (eff.type === 'multishot' || eff.type === 'damage') return { kind: 'damage', def };
  if (eff.type === 'debuff') return { kind: 'debuff', def };
  if (eff.type === 'buff') return { kind: 'buff', def };
  return { kind: 'other', def };
}

// Главная функция — вызывается каждый кадр.
// hero — объект героя (игрока или бота)
// dt   — прошедшее время
// enemies — массив врагов (мобы или другой герой)
// applyEffect — колбэк (hero, result) для применения эффекта
export function aiControl(hero, dt, enemies, applyEffect) {
  if (!hero || hero.dead) return;
  if (!hero.skills) return;
  if (!tryUseSkill) return;

  const nearest = findNearestEnemy(hero, enemies);

  const slots = hero.skillSlots || [];
  let healSkill = null, damageSkill = null, debuffSkill = null, buffSkill = null;

  for (let i = 0; i < slots.length; i++) {
    const id = slots[i];
    if (!id || !hero.skills[id]) continue;
    const cls = classifySkill(id);
    if (!cls) continue;
    if (cls.kind === 'heal'   && !healSkill)   healSkill = id;
    if (cls.kind === 'damage' && !damageSkill) damageSkill = id;
    if (cls.kind === 'debuff' && !debuffSkill) debuffSkill = id;
    if (cls.kind === 'buff'   && !buffSkill)   buffSkill = id;
  }

  const manaPct = hero.maxMana > 0 ? hero.mana / hero.maxMana : 0;

  // 1) Хил при низком HP
  if (healSkill && hero.hp / hero.maxHp < HP_HEAL_THRESHOLD && manaPct >= MANA_MIN) {
    if (_tryAndApply(hero, healSkill, applyEffect)) return;
  }

  // 2) Дебафф на цель
  if (debuffSkill && nearest && manaPct > MANA_MIN) {
    const eff = SKILLS[debuffSkill]?.effect || {};
    const already =
      (eff.stat === 'stun'  && nearest.stunUntil && nearest.stunUntil > Date.now()) ||
      (eff.stat === 'speed' && nearest.slowUntil && nearest.slowUntil > Date.now());
    if (!already) {
      if (_tryAndApply(hero, debuffSkill, applyEffect)) return;
    }
  }

  // 3) Ударный при высокой мане и живом враге
  if (damageSkill && nearest && manaPct >= MANA_FOR_DAMAGE) {
    if (nearest.hp / nearest.maxHp > HP_KILL_THRESHOLD) {
      if (_tryAndApply(hero, damageSkill, applyEffect)) return;
    }
  }

  // 4) Бафф (dodge) — при HP < 60% и без активного баффа
  if (buffSkill && manaPct > MANA_MIN) {
    const eff = SKILLS[buffSkill]?.effect || {};
    let active = false;
    if (eff.stat === 'dodge' && hero.skillBuffs?.dodge && hero.skillBuffs.dodge.until > Date.now()) {
      active = true;
    }
    if (!active && hero.hp / hero.maxHp < 0.6) {
      if (_tryAndApply(hero, buffSkill, applyEffect)) return;
    }
  }
}

function _tryAndApply(hero, skillId, applyEffect) {
  const r = tryUseSkill(hero, skillId);
  if (!r || !r.ok) return false;
  // Если пошёл каст — эффект применится при завершении (через battle.js)
  if (r.casting) return true;
  if (applyEffect) applyEffect(hero, r);
  return true;
}