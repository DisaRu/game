import { CONFIG, SLOTS, GRADES, START_ITEMS, POTIONS, POTION_AUTO_HP_PERCENT, POTION_COOLDOWN } from './config.js';
import { itemStats } from './items.js';

export function createHero(classType) {
  const base = CONFIG.hero[classType];
  const hero = {
    classType, name: base.name, emoji: base.emoji,
    level: 1, xp: 0, xpToNext: CONFIG.level.baseXp,
    baseMaxHp: base.hp, hp: base.hp, maxHp: base.hp,
    baseAttack: base.attack, attack: base.attack, defense: 0,
    attackSpeed: base.attackSpeed, range: base.range, moveSpeed: base.moveSpeed,
    cooldown: 0, hitAnim: 0, attackAnim: 0, dead: false,
    x: 0, y: 0, facing: 1,
    equipment: { weapon:null, helmet:null, armor:null, gloves:null, boots:null, cloak:null, ring:null, amulet:null },
    backpack: [],
    scrolls: {
      ng: { weapon: 3, armor: 3 },
      d:  { weapon: 1, armor: 1 },
      c:  { weapon: 0, armor: 0 },
      b:  { weapon: 0, armor: 0 },
      a:  { weapon: 0, armor: 0 },
      s:  { weapon: 0, armor: 0 },
    },
    potions: { small: 5, medium: 0, large: 0, epic: 0 },
    soulshots: { ng: 20, d: 0, c: 0, b: 0, a: 0, s: 0 },
    potionCooldown: 0,
    totalGold: 0, totalKills: 0,
  };
  recalcStats(hero);
  return hero;
}

export function recalcStats(hero) {
  let bonusHp = 0, bonusAtk = 0, bonusDef = 0;
  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    bonusHp  += s.hp || 0;
    bonusAtk += s.attack || 0;
    bonusDef += s.defense || 0;
  }
  const oldMax = hero.maxHp;
  hero.maxHp = hero.baseMaxHp + bonusHp;
  hero.attack = hero.baseAttack + bonusAtk;
  hero.defense = bonusDef;
  if (oldMax > 0 && hero.maxHp !== oldMax) {
    const ratio = hero.hp / oldMax;
    hero.hp = Math.min(hero.maxHp, Math.round(hero.maxHp * ratio));
  }
  if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;
}

export function canEquip(hero, item) {
  return hero.level >= GRADES[item.grade].levelReq;
}

export function equipItem(hero, item) {
  if (!canEquip(hero, item)) return { ok:false, reason:'level' };
  const idx = hero.backpack.indexOf(item);
  if (idx < 0) return { ok:false, reason:'not_in_backpack' };
  hero.backpack.splice(idx, 1);
  const prev = hero.equipment[item.slot];
  if (prev) hero.backpack.push(prev);
  hero.equipment[item.slot] = item;
  recalcStats(hero);
  return { ok:true, replaced: prev || null };
}

export function unequipItem(hero, slot) {
  const item = hero.equipment[slot];
  if (!item) return { ok:false };
  hero.equipment[slot] = null;
  hero.backpack.push(item);
  recalcStats(hero);
  return { ok:true };
}

export function applyLevelUp(hero) {
  while (hero.xp >= hero.xpToNext && hero.level < CONFIG.level.maxLevel) {
    hero.xp -= hero.xpToNext;
    hero.level++;
    hero.baseMaxHp += CONFIG.level.hpPerLevel;
    hero.baseAttack += CONFIG.level.attackPerLevel;
    hero.xpToNext = Math.floor(CONFIG.level.baseXp * Math.pow(CONFIG.level.xpGrowth, hero.level - 1));
  }
  recalcStats(hero);
}

export function addXp(hero, amount) { hero.xp += amount; applyLevelUp(hero); }

export function damageHero(hero, amount) {
  const reduced = Math.max(1, amount - Math.floor(hero.defense * 0.5));
  hero.hp -= reduced;
  hero.hitAnim = 0.15;
  if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; return true; }
  return false;
}

export const ENHANCE_CHANCE = [
  1.0, 1.0, 1.0, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4,
  0.3, 0.25, 0.2, 0.15, 0.1, 0.05,
];
export const MAX_ENHANCE = 15;

export function tryEnhance(hero, item) {
  if (item.enhance >= MAX_ENHANCE) return { ok:false, reason:'max' };
  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const have = hero.scrolls[item.grade]?.[stype] || 0;
  if (have <= 0) return { ok:false, reason:'no_scroll' };
  hero.scrolls[item.grade][stype]--;
  const chance = ENHANCE_CHANCE[item.enhance];
  const roll = Math.random();
  if (roll < chance) {
    item.enhance++;
    recalcStats(hero);
    return { ok:true, result:'success', newEnhance: item.enhance };
  }
  if (item.enhance >= 10 && Math.random() < 0.4) {
    hero.equipment[item.slot] = null;
    recalcStats(hero);
    return { ok:true, result:'destroyed' };
  }
  return { ok:true, result:'fail' };
}

// === ЗЕЛЬЯ ===
export function useHpPotion(hero, type) {
  if (!type) {
    for (const t of ['small', 'medium', 'large', 'epic']) {
      if ((hero.potions[t] || 0) > 0) { type = t; break; }
    }
  }
  if (!type) return { ok:false, reason:'no_potion' };
  if ((hero.potions[type] || 0) <= 0) return { ok:false, reason:'no_potion' };
  if (hero.hp >= hero.maxHp) return { ok:false, reason:'full_hp' };
  hero.potions[type]--;
  const heal = POTIONS[type].heal;
  const healed = Math.min(heal, hero.maxHp - hero.hp);
  hero.hp += healed;
  return { ok:true, healed, type, color: POTIONS[type].color };
}

// Автоматическое использование зелья при HP < 50%
export function autoUsePotion(hero, dt) {
  if (hero.potionCooldown > 0) hero.potionCooldown -= dt;
  if (hero.potionCooldown > 0) return null;
  if (hero.hp >= hero.maxHp) return null;
  if (hero.hp / hero.maxHp > POTION_AUTO_HP_PERCENT) return null;

  const needed = hero.maxHp - hero.hp;
  const order = ['small', 'medium', 'large', 'epic'];
  for (const type of order) {
    if ((hero.potions[type] || 0) <= 0) continue;
    const p = POTIONS[type];
    if (p.heal >= needed * 0.5 || type === 'epic') {
      hero.potions[type]--;
      const healed = Math.min(p.heal, hero.maxHp - hero.hp);
      hero.hp += healed;
      hero.potionCooldown = POTION_COOLDOWN;
      return { type, healed, color: p.color };
    }
  }
  return null;
}

// === СОСКИ ===
export function canUseSoulshot(hero) {
  const weapon = hero.equipment.weapon;
  if (!weapon) return false;
  return (hero.soulshots[weapon.grade] || 0) > 0;
}

export function consumeSoulshot(hero) {
  const weapon = hero.equipment.weapon;
  if (!weapon) return false;
  const grade = weapon.grade;
  if ((hero.soulshots[grade] || 0) <= 0) return false;
  hero.soulshots[grade]--;
  return true;
}

export function updateHero(hero, dt, mobs, projectiles, input, bounds, effects) {
  if (hero.dead) return;
  if (hero.hitAnim > 0) hero.hitAnim -= dt;
  if (hero.attackAnim > 0) hero.attackAnim -= dt;
  hero.cooldown -= dt;

  let dx = 0, dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy) || 1;
    hero.x += (dx / len) * hero.moveSpeed * dt;
    hero.y += (dy / len) * hero.moveSpeed * dt;
    if (dx !== 0) hero.facing = dx > 0 ? 1 : -1;
  }
  hero.x = Math.max(0.5, Math.min(bounds.cols - 0.5, hero.x));
  hero.y = Math.max(0.5, Math.min(bounds.rows - 0.5, hero.y));

  if (hero.cooldown > 0) return;
  const base = CONFIG.hero[hero.classType];

  let target = null, bestDist = Infinity;
  for (const m of mobs) {
    if (m.dead) continue;
    const dist = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (dist <= hero.range && dist < bestDist) { target = m; bestDist = dist; }
  }
  if (!target) return;

  hero.cooldown = 1 / hero.attackSpeed;
  hero.attackAnim = 0.2;

  let damage = hero.attack;
  if (canUseSoulshot(hero)) {
    if (consumeSoulshot(hero)) {
      damage *= 2;
      if (effects) {
        effects.push({
          x: hero.x, y: hero.y - 0.9,
          life: 0.45, maxLife: 0.45,
          color: '#fbbf24', text: '⚡', big: true,
        });
      }
    }
  }

  const tx = target.x - hero.x, ty = target.y - hero.y;
  const d = Math.hypot(tx, ty) || 1;
  projectiles.push({
    x: hero.x, y: hero.y,
    vx: (tx/d) * base.projectileSpeed, vy: (ty/d) * base.projectileSpeed,
    damage, aoe: base.aoe,
    color: base.projectileColor, life: 2, trail: [],
  });
}