import { CONFIG, SLOTS, GRADES, START_ITEMS, POTION_HP_HEAL } from './config.js';
import { itemStats } from './items.js';
import { scrollType } from './config.js';

export function createHero(classType) {
  const base = CONFIG.hero[classType];
  const hero = {
        potions: { hp: START_ITEMS.potions.hp },
    soulshots: { ...START_ITEMS.soulshots },
    soulshotActive: false,
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
    },    totalGold: 0, totalKills: 0,
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
  const stype = scrollType(item.slot);
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

export function updateHero(hero, dt, mobs, projectiles, input, bounds) {
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
  const tx = target.x - hero.x, ty = target.y - hero.y;
  const d = Math.hypot(tx, ty) || 1;
  projectiles.push({
    x: hero.x, y: hero.y,
    vx: (tx/d) * base.projectileSpeed, vy: (ty/d) * base.projectileSpeed,
    damage: hero.attack, aoe: base.aoe,
    color: base.projectileColor, life: 2, trail: [],
  });
}
export function useHpPotion(hero) {
  if (hero.potions.hp <= 0) return { ok:false, reason:'no_potion' };
  if (hero.hp >= hero.maxHp) return { ok:false, reason:'full_hp' };
  hero.potions.hp--;
  const healed = Math.min(POTION_HP_HEAL, hero.maxHp - hero.hp);
  hero.hp += healed;
  return { ok:true, healed };
}

export function canUseSoulshot(hero) {
  if (!hero.soulshotActive) return false;
  const weapon = hero.equipment.weapon;
  if (!weapon) return false;
  const grade = weapon.grade;
  if ((hero.soulshots[grade] || 0) <= 0) return false;
  return true;
}

export function consumeSoulshot(hero) {
  const weapon = hero.equipment.weapon;
  if (!weapon) return false;
  const grade = weapon.grade;
  if ((hero.soulshots[grade] || 0) <= 0) return false;
  hero.soulshots[grade]--;
  if (hero.soulshots[grade] === 0) hero.soulshotActive = false;
  return true;
}