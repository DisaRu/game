import { CONFIG, SLOTS, GRADES, POTIONS, POTION_AUTO_HP_PERCENT, POTION_COOLDOWN, ENHANCE_CHANCE, MAX_ENHANCE, willBreakAt, MOB_DAMAGE_PERCENT, BOSS_DAMAGE_PERCENT, BOSS_AOE_PERCENT, getEnhanceBonus } from './config.js';
import { itemStats } from './items.js';
export { ENHANCE_CHANCE, MAX_ENHANCE, willBreakAt };

export function createHero(classType) {
  const base = CONFIG.hero[classType];
  const hero = {
    classType, name: base.name, emoji: base.emoji,
    weaponType: base.weapon,
    level: 1, xp: 0, xpToNext: CONFIG.level.baseXp,
    baseMaxHp: base.hp, hp: base.hp, maxHp: base.hp,
    baseAttack: base.attack, attack: base.attack, defense: 0,
    baseAttackSpeed: base.attackSpeed, attackSpeed: base.attackSpeed,
    baseRange: base.range, range: base.range,
    baseMoveSpeed: base.moveSpeed, moveSpeed: base.moveSpeed,
    critChance: 5, critDamage: 50, dodge: 0, lifesteal: 0,
    accuracy: 0, critResist: 0, armorPen: 0, antiHeal: 0,
    berserk: 0, thorns: 0,
    attackSpeedBonus: 0,

    chainTargets: 0,
    hpBonus: 0,
    thornsPercent: 0,
    doubleStrikeChance: 0,
    speedBonus: 0,
    cloakDodge: 0,
    executeBonus: 0,
    shieldPercent: 0,

    cooldown: 0, hitAnim: 0, attackAnim: 0, dead: false,
    x: 0, y: 0, facing: 1,
    equipment: { weapon:null, helmet:null, armor:null, gloves:null, boots:null, cloak:null, ring:null, amulet:null },
    backpack: [],
    scrolls: {
      ng:{weapon:3,armor:3}, d:{weapon:1,armor:1},
      c:{weapon:0,armor:0}, b:{weapon:0,armor:0},
      a:{weapon:0,armor:0}, s:{weapon:0,armor:0},
    },
    potions: { small:5, medium:0, large:0, epic:0 },
    soulshots: { ng:20, d:0, c:0, b:0, a:0, s:0 },
    potionCooldown: 0,
    activePotion: null,
    soulshotActive: false,
    activeBuffs: {},
  };
  recalcStats(hero);
  return hero;
}

export function applyEnhanceBonuses(hero) {
  hero.chainTargets = 0;
  hero.hpBonus = 0;
  hero.thornsPercent = 0;
  hero.doubleStrikeChance = 0;
  hero.speedBonus = 0;
  hero.cloakDodge = 0;
  hero.executeBonus = 0;
  hero.shieldPercent = 0;

  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const bonus = getEnhanceBonus(item);
    if (bonus && bonus.apply) bonus.apply(hero, bonus.value);
  }
}

export function recalcStats(hero) {
  let bHp=0,bAtk=0,bDef=0,bCrit=0,bCritDmg=0,bDodge=0,bLs=0,bAtkSpd=0,bRange=0;
  let bAcc=0,bCritRes=0,bArmorPen=0,bAntiHeal=0,bBerserk=0,bThorns=0,bMoveSpd=0;

  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    bHp += s.hp||0; bAtk += s.attack||0; bDef += s.defense||0;
    bCrit += s.critChance||0; bCritDmg += s.critDamage||0;
    bDodge += s.dodge||0; bLs += s.lifesteal||0; bAtkSpd += s.attackSpeed||0;
    bRange += s.range||0;
    bAcc += s.accuracy||0; bCritRes += s.critResist||0;
    bArmorPen += s.armorPen||0; bAntiHeal += s.antiHeal||0;
    bBerserk += s.berserk||0; bThorns += s.thorns||0; bMoveSpd += s.moveSpeed||0;
  }

  const oldMax = hero.maxHp;

  applyEnhanceBonuses(hero);

  hero.maxHp = hero.baseMaxHp + bHp;
  if (hero.hpBonus > 0) hero.maxHp = Math.floor(hero.maxHp * (1 + hero.hpBonus));

  hero.attack = hero.baseAttack + bAtk;
  hero.defense = bDef;
  hero.critChance = Math.min(75, 5 + bCrit);
  hero.critDamage = 50 + bCritDmg;
  hero.dodge = Math.min(60, bDodge + hero.cloakDodge);
  hero.lifesteal = Math.min(30, bLs);
  hero.attackSpeedBonus = bAtkSpd;
  hero.attackSpeed = hero.baseAttackSpeed * (1 + bAtkSpd / 100);
  hero.range = hero.baseRange + bRange;
  hero.moveSpeed = hero.baseMoveSpeed * (1 + hero.speedBonus);

  hero.accuracy = bAcc;
  hero.critResist = Math.min(60, bCritRes);
  hero.armorPen = Math.min(80, bArmorPen);
  hero.antiHeal = Math.min(60, bAntiHeal);
  hero.berserk = bBerserk;
  hero.thorns = bThorns;

  if (hero.activeBuffs) {
    const now = Date.now();
    if (hero.activeBuffs.attack && hero.activeBuffs.attack > now) hero.attack *= 1.20;
    if (hero.activeBuffs.crit && hero.activeBuffs.crit > now) hero.critChance = Math.min(75, hero.critChance + 15);
    if (hero.activeBuffs.speed && hero.activeBuffs.speed > now) hero.attackSpeed *= 1.50;
    if (hero.activeBuffs.range && hero.activeBuffs.range > now) hero.range *= 1.50;
  }

  if (oldMax > 0 && hero.maxHp !== oldMax) {
    hero.hp = Math.min(hero.maxHp, Math.round(hero.hp / oldMax * hero.maxHp));
  }
  if (hero.hp > hero.maxHp) hero.hp = hero.maxHp;
}

export function canEquip(hero, item) {
  if (!item) return false;
  if (item.kind === 'buff' || item.kind === 'blessed') return false;
  const g = GRADES[item.grade];
  if (!g) return false;
  if (item.slot === 'weapon' && item.weaponType && item.weaponType !== hero.weaponType) return false;
  if (hero.level < g.levelReq) return false;
  return true;
}

export function equipItem(hero, item) {
  if (!canEquip(hero, item)) {
    if (item.slot === 'weapon' && item.weaponType !== hero.weaponType) return { ok:false, reason:'class' };
    return { ok:false, reason:'level' };
  }
  const idx = hero.backpack.indexOf(item);
  if (idx < 0) return { ok:false, reason:'not_in_backpack' };
  hero.backpack.splice(idx, 1);
  const prev = hero.equipment[item.slot];
  if (prev) hero.backpack.push(prev);
  hero.equipment[item.slot] = item;
  recalcStats(hero);
  return { ok:true, replaced: prev };
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
  if (Math.random() * 100 < hero.dodge) { hero.hitAnim = 0.15; return 'dodge'; }
  const reduced = Math.max(1, amount - Math.floor(hero.defense * 0.5));
  hero.hp -= reduced;
  hero.hitAnim = 0.15;
  if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; return 'dead'; }
  return 'hit';
}

export function tryEnhance(hero, item, useBlessed = false) {
  if (item.enhance >= MAX_ENHANCE) return { ok:false, reason:'max' };

  const stype = item.slot === 'weapon' ? 'weapon' : 'armor';
  const scrollsHave = hero.scrolls[item.grade]?.[stype] || 0;
  if (scrollsHave <= 0) return { ok:false, reason:'no_scroll' };

  const blessedIdx = hero.backpack.findIndex(x => x.kind === 'blessed');
  const blessedUsed = useBlessed && blessedIdx >= 0;
  if (useBlessed && blessedIdx < 0) return { ok:false, reason:'no_blessed' };

  hero.scrolls[item.grade][stype]--;
  if (blessedUsed) {
    const stack = hero.backpack[blessedIdx];
    if (stack.count && stack.count > 1) stack.count -= 1;
    else hero.backpack.splice(blessedIdx, 1);
  }

  const chance = ENHANCE_CHANCE[item.enhance] ?? 0.35;
  const willBreak = willBreakAt(item.enhance);
  const roll = Math.random();

  if (roll < chance) {
    item.enhance++;
    recalcStats(hero);
    return { ok:true, result:'success', newEnhance: item.enhance, blessedUsed };
  }

  if (willBreak && !blessedUsed) {
    const wasInSlot = hero.equipment[item.slot] === item;
    if (wasInSlot) hero.equipment[item.slot] = null;
    const idx = hero.backpack.indexOf(item);
    if (idx >= 0) hero.backpack.splice(idx, 1);
    recalcStats(hero);
    return { ok:true, result:'destroyed', slot: item.slot, blessedUsed };
  }

  return { ok:true, result:'fail', blessedUsed };
}

export function autoUsePotion(hero, dt) {
  if (hero.potionCooldown > 0) hero.potionCooldown -= dt;
  if (hero.potionCooldown > 0) return null;
  if (!hero.activePotion) return null;
  if (hero.hp >= hero.maxHp) return null;
  if (hero.hp / hero.maxHp > POTION_AUTO_HP_PERCENT) return null;
  const type = hero.activePotion;
  if ((hero.potions[type] || 0) <= 0) {
    hero.activePotion = null;
    return null;
  }
  const p = POTIONS[type];
  hero.potions[type]--;
  const healed = Math.min(p.heal, hero.maxHp - hero.hp);
  hero.hp += healed;
  hero.potionCooldown = POTION_COOLDOWN;
  if (hero.potions[type] <= 0) hero.activePotion = null;
  return { type, healed, color: p.color };
}

export function canUseSoulshot(hero) {
  if (!hero.soulshotActive) return false;
  const w = hero.equipment.weapon;
  if (!w) return false;
  return (hero.soulshots[w.grade] || 0) > 0;
}

export function consumeSoulshot(hero) {
  const w = hero.equipment.weapon;
  if (!w) return false;
  if ((hero.soulshots[w.grade]||0) <= 0) return false;
  hero.soulshots[w.grade]--;
  if (hero.soulshots[w.grade] === 0) hero.soulshotActive = false;
  return true;
}

export function calcHitChance(attacker, defender) {
  const dodge = defender.dodge || 0;
  const acc = attacker.accuracy || 0;
  return Math.max(5, Math.min(100, 100 - dodge + acc));
}

export function calcCritChance(attacker, defender) {
  const crit = attacker.critChance || 0;
  const resist = defender.critResist || 0;
  return Math.max(0, crit - resist);
}

export function calcEffectiveDefense(defender, attacker) {
  const def = defender.defense || 0;
  const pen = (attacker.armorPen || 0) / 100;
  return Math.max(0, def * (1 - pen));
}

export function updateHero(hero, dt, mobs, projectiles, input, bounds, effects) {
  if (hero.dead) return;
  if (hero.hitAnim > 0) hero.hitAnim -= dt;
  if (hero.attackAnim > 0) hero.attackAnim -= dt;
  hero.cooldown -= dt;

  let dx=0, dy=0;
  if (input.left) dx-=1;
  if (input.right) dx+=1;
  if (input.up) dy-=1;
  if (input.down) dy+=1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    hero.x += dx/len * hero.moveSpeed * dt;
    hero.y += dy/len * hero.moveSpeed * dt;
    if (dx) hero.facing = dx > 0 ? 1 : -1;
  }
  hero.x = Math.max(0.5, Math.min(bounds.cols - 0.5, hero.x));
  hero.y = Math.max(0.5, Math.min(bounds.rows - 0.5, hero.y));

  if (hero.cooldown > 0) return;
  const base = CONFIG.hero[hero.classType];

  let target = null, bd = Infinity;
  for (const m of mobs) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (d <= hero.range && d < bd) { target = m; bd = d; }
  }
  if (!target) return;

  hero.cooldown = 1 / hero.attackSpeed;
  hero.attackAnim = 0.2;

  let damage = hero.attack;
  let isCrit = false;
  let isExecute = false;

  if (canUseSoulshot(hero) && consumeSoulshot(hero)) {
    damage *= 2;
    effects.push({ x: hero.x, y: hero.y - 0.9, life: 0.45, maxLife: 0.45, color: '#fbbf24', text: '⚡', big: true });
  }

  const effCrit = calcCritChance(hero, target);
  if (Math.random() * 100 < effCrit) {
    isCrit = true;
    damage *= (1 + hero.critDamage / 100);
  }

  // Казнь
  if (hero.executeBonus > 0 && target.hp / target.maxHp < 0.3) {
    damage *= (1 + hero.executeBonus);
    isExecute = true;
  }

  // Берсерк
  if (hero.berserk > 0 && hero.hp / hero.maxHp < 0.5) {
    damage *= (1 + hero.berserk / 100);
  }

  if (hero.lifesteal > 0) {
    const heal = Math.min(damage * hero.lifesteal / 100, hero.maxHp * 0.02);
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
  }

  const tx = target.x - hero.x, ty = target.y - hero.y;
  const dist = Math.hypot(tx, ty) || 1;
  projectiles.push({
    x: hero.x, y: hero.y,
    vx: tx/dist * base.projectileSpeed, vy: ty/dist * base.projectileSpeed,
    damage, aoe: base.aoe,
    color: base.projectileColor,
    weaponType: hero.weaponType,
    life: 2, trail: [],
    isCrit,
    isExecute,
    doubleStrike: hero.doubleStrikeChance > 0 && Math.random() < hero.doubleStrikeChance,
  });
}

export function addToBackpack(hero, item) {
  if (item.kind === 'buff' || item.kind === 'blessed') {
    const existing = hero.backpack.find(
      x => x.kind === item.kind &&
           (item.kind === 'blessed' || x.buffType === item.buffType)
    );
    if (existing) {
      existing.count = (existing.count || 1) + (item.count || 1);
      return existing;
    }
  }
  item.count = item.count || 1;
  hero.backpack.push(item);
  return item;
}

export function mobDamageFor(hero, zoneDiff) {
  const pct = MOB_DAMAGE_PERCENT[zoneDiff] || 0.015;
  return Math.floor(hero.maxHp * pct);
}
export function bossDamageFor(hero) {
  return Math.floor(hero.maxHp * BOSS_DAMAGE_PERCENT);
}
export function bossAoeDamageFor(hero) {
  return Math.floor(hero.maxHp * BOSS_AOE_PERCENT);
}

export function getChainTargets(hero) {
  return hero.chainTargets || 0;
}