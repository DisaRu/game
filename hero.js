import { CONFIG, SLOTS, GRADES, POTIONS, POTION_AUTO_HP_PERCENT, POTION_COOLDOWN, ENHANCE_CHANCE, MAX_ENHANCE, willBreakAt, MOB_DAMAGE_PERCENT, BOSS_DAMAGE_PERCENT, BOSS_AOE_PERCENT, getEnhanceBonus, BUFF_SCROLLS, SKILLS, MAX_SKILL_LEVEL, SKILL_LEVEL_EFFECT, SKILL_LEVEL_DURATION, SKILL_LEVEL_COST, SKILL_LEVEL_CAST } from './config.js';
import { itemStats } from './items.js';
export { ENHANCE_CHANCE, MAX_ENHANCE, willBreakAt };

// ===== СОЗДАНИЕ ГЕРОЯ =====

export function createHero(classType) {
  const base = CONFIG.hero[classType];
  const hero = {
    classType, name: base.name, emoji: base.emoji,
    weaponType: base.weapon,
    level: 1, xp: 0, xpToNext: CONFIG.level.baseXp,
    baseMaxHp: base.hp, hp: base.hp, maxHp: base.hp,
    baseMaxMana: base.maxMana, mana: base.maxMana, maxMana: base.maxMana,
    baseManaRegen: base.manaRegen, manaRegen: base.manaRegen,
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
    size: 0.8,

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
        soulshotGrade: null,
    buffScrollCooldowns: {},
    activeBuffs: {},

     // ===== СКИЛЛЫ =====
    skills: {},
    skillSlots: [],
    skillCooldowns: {},
    skillBuffs: {},

    // ===== КАСТ =====
    casting: null,
    _pendingCastResult: null,
    castSpeed: 0,
    castStability: 0,

    // ===== ДЕБАФФЫ =====
    stunUntil: 0,
    slowUntil: 0,
    silenceUntil: 0,
    attackSpeedDebuff: null,
    dots: [],

    // ===== АРЕНА =====
    arena: {
      rating: 1000,
      wins: 0,
      losses: 0,
      history: [],
      claimedChests: [],
    },
  };
  recalcStats(hero);
  return hero;
}

// ===== БОНУСЫ +15 =====

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

// ===== ПЕРЕСЧЁТ СТАТОВ =====

export function recalcStats(hero) {
  // Миграция старых сейвов без маны + пересчёт по уровню
  const _cls = CONFIG.hero[hero.classType];
  if (hero.baseMaxMana === undefined) hero.baseMaxMana = _cls?.maxMana || 80;
  if (hero.baseManaRegen === undefined) hero.baseManaRegen = _cls?.manaRegen || 4;

  // Синхронизация с уровнем: если сейчас baseMaxMana меньше, чем должно быть
  // по формуле (класс + уровни), — догоняем
  if (hero.level && hero.level > 1) {
    const expectedMana = (_cls?.maxMana || 80) + (hero.level - 1) * (CONFIG.level.manaPerLevel || 0);
    const expectedRegen = (_cls?.manaRegen || 4) + (hero.level - 1) * (CONFIG.level.manaRegenPerLevel || 0);
    if (hero.baseMaxMana < expectedMana) hero.baseMaxMana = expectedMana;
    if (hero.baseManaRegen < expectedRegen) hero.baseManaRegen = expectedRegen;
  }

  // Миграция арены (старые сейвы без полей)
  if (!hero.arena || typeof hero.arena !== 'object') {
    hero.arena = { rating: 1000, wins: 0, losses: 0, history: [], claimedChests: [] };
  }
  if (!Array.isArray(hero.arena.history)) hero.arena.history = [];
  if (!Array.isArray(hero.arena.claimedChests)) hero.arena.claimedChests = [];
  if (typeof hero.arena.rating !== 'number') hero.arena.rating = 1000;
  if (typeof hero.arena.wins !== 'number') hero.arena.wins = 0;
  if (typeof hero.arena.losses !== 'number') hero.arena.losses = 0;

  // Миграция старых сейвов без скиллов
  if (!hero.skills || typeof hero.skills !== 'object') hero.skills = {};
  if (!Array.isArray(hero.skillSlots)) hero.skillSlots = [];
  if (!hero.skillCooldowns || typeof hero.skillCooldowns !== 'object') hero.skillCooldowns = {};
  if (!hero.skillBuffs || typeof hero.skillBuffs !== 'object') hero.skillBuffs = {};

  // Слоты: 8, изначально пустые (null)
  while (hero.skillSlots.length < 8) hero.skillSlots.push(null);
  if (hero.skillSlots.length > 8) hero.skillSlots.length = 8;

  // ═══ Миграция скиллов v1 → v2 ═══
  // Старые ID → новые
  const _OLD_SKILL_MAP = {
    stun: 'stun_shot',
    poison: 'poison_arrow',
    frost: 'slow_arrow',
    summon_shadow: hero.classType === 'mage' ? 'shadow' : 'panther',
  };

  // 1) Переименование ключей в hero.skills + чистка мусора
  if (hero.skills && typeof hero.skills === 'object') {
    const newSkills = {};
    for (const oldId in hero.skills) {
      const newId = _OLD_SKILL_MAP[oldId] || oldId;
      // Отбрасываем ключи, которых нет в SKILLS — иначе UI падает
      if (!SKILLS[newId]) continue;
      const oldEntry = hero.skills[oldId];
      const existing = newSkills[newId];
      // Если и старый, и новый уже есть — берём тот, где больше уровень
      if (existing && (existing.level || 0) >= (oldEntry.level || 0)) continue;
      newSkills[newId] = oldEntry;
    }
    hero.skills = newSkills;
  }

  // 2) Слоты — переименовать старые id на новые
  for (let i = 0; i < 8; i++) {
    let id = hero.skillSlots[i];
    if (!id) continue;

    if (id.indexOf(':') !== -1) {
      // "skill:stun" → "skill:stun_shot"
      const parts = id.split(':');
      const kind = parts[0], sid = parts[1];
      const newSid = _OLD_SKILL_MAP[sid] || sid;
      if (kind === 'skill') {
        hero.skillSlots[i] = hero.skills[newSid] ? 'skill:' + newSid : null;
      } else {
        hero.skillSlots[i] = kind + ':' + newSid;
      }
    } else {
      // "stun" → "skill:stun_shot"
      const newId = _OLD_SKILL_MAP[id] || id;
      if (hero.skills[newId]) hero.skillSlots[i] = 'skill:' + newId;
      else hero.skillSlots[i] = null;
    }
  }

  // 3) Книги в рюкзаке — старый skillId → новый
  if (Array.isArray(hero.backpack)) {
    for (const it of hero.backpack) {
      if (it.kind === 'book' && it.skillId && _OLD_SKILL_MAP[it.skillId]) {
        it.skillId = _OLD_SKILL_MAP[it.skillId];
      }
    }
  }

  // КД бафф-свитков (миграция)
  if (!hero.buffScrollCooldowns || typeof hero.buffScrollCooldowns !== 'object') {
    hero.buffScrollCooldowns = {};
  }
  // Грейд активной соски (миграция)
  if (hero.soulshotGrade === undefined) hero.soulshotGrade = null;

   let bHp=0,bAtk=0,bDef=0,bCrit=0,bCritDmg=0,bDodge=0,bLs=0,bAtkSpd=0,bRange=0;
  let bAcc=0,bCritRes=0,bArmorPen=0,bAntiHeal=0,bBerserk=0,bThorns=0,bMoveSpd=0;
  let bMana=0,bManaRegen=0;
  let bCastSpeed=0,bCastStability=0;

  for (const slot of SLOTS) {
    const item = hero.equipment[slot];
    if (!item) continue;
    const s = itemStats(item);
    bHp += (s.hp||0);
    bAtk += (s.attack||0);
    bDef += (s.defense||0);
    bCrit += (s.critChance||0);
    bCritDmg += (s.critDamage||0);
    bDodge += (s.dodge||0);
    bLs += (s.lifesteal||0);
    bAtkSpd += (s.attackSpeed||0);
    bRange += (s.range||0);
    bAcc += (s.accuracy||0);
    bCritRes += (s.critResist||0);
    bArmorPen += (s.armorPen||0);
    bAntiHeal += (s.antiHeal||0);
    bBerserk += (s.berserk||0);
    bThorns += (s.thorns||0);
     bMoveSpd += (s.moveSpeed||0);
    bMana += (s.mana||0);
    bManaRegen += (s.manaRegen||0);
    bCastSpeed += (s.castSpeed||0);
    bCastStability += (s.castStability||0);
  }

  const oldMax = hero.maxHp;
  const oldMaxMana = hero.maxMana;

  applyEnhanceBonuses(hero);

  hero.maxHp = hero.baseMaxHp + bHp;
  if (hero.hpBonus > 0) hero.maxHp = Math.floor(hero.maxHp * (1 + hero.hpBonus));

  hero.maxMana = hero.baseMaxMana + bMana;
  hero.manaRegen = hero.baseManaRegen + bManaRegen;

  hero.attack = hero.baseAttack + bAtk;
  hero.defense = bDef;
  hero.critChance = Math.min(75, 5 + bCrit);
  hero.critDamage = Math.min(300, 50 + bCritDmg);
  hero.dodge = Math.min(60, bDodge + hero.cloakDodge);
  hero.lifesteal = Math.min(30, bLs);
  hero.attackSpeedBonus = bAtkSpd;
  hero.attackSpeed = hero.baseAttackSpeed * (1 + bAtkSpd / 100);
  // Защита от битого сейва: baseRange всегда из config
  const _baseCfg = CONFIG.hero[hero.classType];
  if (_baseCfg && _baseCfg.range) {
    hero.baseRange = _baseCfg.range;
  }
  hero.range = hero.baseRange + bRange;
  // Санитарный кап: range не может быть больше baseRange + 20
  const _maxRange = hero.baseRange + 20;
  if (hero.range > _maxRange) hero.range = _maxRange;
  hero.moveSpeed = hero.baseMoveSpeed * (1 + hero.speedBonus);

  hero.accuracy = bAcc;
  hero.critResist = Math.min(60, bCritRes);
  hero.armorPen = Math.min(80, bArmorPen);
  hero.antiHeal = Math.min(60, bAntiHeal);
  hero.berserk = bBerserk;
  hero.thorns = bThorns;

  // Каст: кап 70% на ускорение, 80% на устойчивость
  hero.castSpeed = Math.min(70, bCastSpeed);
  hero.castStability = Math.min(80, bCastStability);

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

  if (typeof hero.mana !== 'number') hero.mana = hero.maxMana;
  if (oldMaxMana === undefined) hero.mana = hero.maxMana;
  if (hero.mana > hero.maxMana) hero.mana = hero.maxMana;
  if (hero.mana < 0) hero.mana = 0;

  // ═══ Скилловые баффы (skillBuffs) ═══
  if (hero.skillBuffs) {
    const now = Date.now();
    const sb = hero.skillBuffs;

    // Dodge (+%)
    if (sb.dodge && sb.dodge.until > now) {
      hero.dodge = Math.min(95, hero.dodge + sb.dodge.value);
    }
    // Attack Speed (+%)
    if (sb.attackSpeed && sb.attackSpeed.until > now) {
      hero.attackSpeed = hero.attackSpeed * (1 + sb.attackSpeed.value / 100);
    }
    // Defense (+ flat)
    if (sb.defense && sb.defense.until > now) {
      hero.defense = hero.defense + sb.defense.value;
    }
    // Attack (+%)
    if (sb.attack && sb.attack.until > now) {
      hero.attack = hero.attack * (1 + sb.attack.value / 100);
    }
    // Crit Chance (+%)
    if (sb.critChance && sb.critChance.until > now) {
      hero.critChance = Math.min(75, hero.critChance + sb.critChance.value);
    }
    // Lifesteal (+%)
    if (sb.lifesteal && sb.lifesteal.until > now) {
      hero.lifesteal = Math.min(30, hero.lifesteal + sb.lifesteal.value);
    }
    // Reflect (+%) — читается в damageHero
    if (sb.reflect && sb.reflect.until > now) {
      hero.reflectPercent = (hero.reflectPercent || 0) + sb.reflect.value;
    } else {
      hero.reflectPercent = 0;
    }
    // Range (+%)
    if (sb.range && sb.range.until > now) {
      hero.range = hero.range * (1 + sb.range.value / 100);
    }
  }
    syncSoulshotFromSlots(hero);

}

// ===== МАНА =====

export function regenMana(hero, dt) {
  if (hero.dead) return;
  if (!hero.maxMana || hero.maxMana <= 0) return;
  if (hero.mana >= hero.maxMana) return;
  hero.mana = Math.min(hero.maxMana, hero.mana + (hero.manaRegen || 0) * dt);
}

export function gainManaOnKill(hero) {
  if (!hero || hero.dead) return;
  if (!hero.maxMana) return;
  hero.mana = Math.min(hero.maxMana, hero.mana + hero.maxMana * 0.10);
}

// ===== ЭКИПИРОВКА =====

export function canEquip(hero, item) {
  if (!item) return false;
  if (item.kind === 'buff' || item.kind === 'blessed' || item.kind === 'pass' || item.kind === 'book') return false;
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

// ===== УРОВЕНЬ =====

export function applyLevelUp(hero) {
  let leveledUp = false;
  while (hero.xp >= hero.xpToNext && hero.level < CONFIG.level.maxLevel) {
    hero.xp -= hero.xpToNext;
    hero.level++;
    hero.baseMaxHp += CONFIG.level.hpPerLevel;
    hero.baseAttack += CONFIG.level.attackPerLevel;
    hero.baseMaxMana += CONFIG.level.manaPerLevel;
    hero.baseManaRegen += CONFIG.level.manaRegenPerLevel;
    hero.xpToNext = Math.floor(CONFIG.level.baseXp * Math.pow(CONFIG.level.xpGrowth, hero.level - 1));
    leveledUp = true;
  }
  recalcStats(hero);
  if (leveledUp) hero.mana = hero.maxMana;
}
export function addXp(hero, amount) { hero.xp += amount; applyLevelUp(hero); }

// ===== УРОН =====

export function damageHero(hero, amount, attacker = null) {
  if (Math.random() * 100 < hero.dodge) { hero.hitAnim = 0.15; return 'dodge'; }

  // Reflect — отражаем часть урона атакующему
  if (attacker && hero.reflectPercent > 0) {
    const reflected = Math.floor(amount * hero.reflectPercent / 100);
    if (reflected > 0 && !attacker.dead) {
      attacker.hp -= reflected;
      attacker.hitFlash = 0.15;
    }
  }

  // Щит поглощает урон
  if (hero.shield && hero.shield.until > Date.now() && hero.shield.remaining > 0) {
    const absorbed = Math.min(hero.shield.remaining, amount);
    hero.shield.remaining -= absorbed;
    amount -= absorbed;
    if (hero.shield.remaining <= 0) hero.shield = null;
    if (amount <= 0) {
      hero.hitAnim = 0.1;
      return 'shielded';
    }
  }

  // Прерывание каста: база 30%, снижается castStability
  if (hero.casting) {
    const stability = Math.min(80, hero.castStability || 0);
    const interruptChance = 0.30 * (1 - stability / 100);
    if (Math.random() < interruptChance) {
      hero.casting = null;
      hero.hitAnim = 0.15;
      // Урон всё равно проходит
      const reduced = Math.max(1, amount - Math.floor(hero.defense * 0.5));
      hero.hp -= reduced;
      if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; return 'dead'; }
      return 'interrupted';
    }
  }

  const reduced = Math.max(1, amount - Math.floor(hero.defense * 0.5));
  hero.hp -= reduced;
  hero.hitAnim = 0.15;
  if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; return 'dead'; }
  return 'hit';
}

// ===== ЗАТОЧКА =====

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

// ===== ЗЕЛЬЯ =====

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

// ===== СОСКИ =====

export function canUseSoulshot(hero) {
  if (!hero.soulshotActive) return false;
  const grade = hero.soulshotGrade || hero.equipment?.weapon?.grade;
  if (!grade) return false;
  return (hero.soulshots[grade] || 0) > 0;
}

export function consumeSoulshot(hero) {
  const grade = hero.soulshotGrade || hero.equipment?.weapon?.grade;
  if (!grade) return false;
  if ((hero.soulshots[grade] || 0) <= 0) return false;
  hero.soulshots[grade]--;
  return true;
}

// ===== КОНТР-СТАТЫ =====

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

// ===== БОЙ =====

export function updateHero(hero, dt, mobs, projectiles, input, bounds, effects) {
  if (hero.dead) return;

  // Стан — герой не двигается, не бьёт, не кастует
  if (hero.stunUntil && hero.stunUntil > Date.now()) {
    hero.hitAnim = 0.15;
    return;
  }

  regenMana(hero, dt);
  tickSkillCooldowns(hero, dt);

  // ===== ТИК КАСТА =====
  // Во время каста герой МОЖЕТ двигаться (input отрабатывается ниже),
  // но НЕ может автоатаковать и начинать новый каст.
  let isCasting = false;
  if (hero.casting) {
    isCasting = true;
    hero.casting.elapsed += dt;

    if (hero.skillBuffs?.dodge) {
      const b = hero.skillBuffs.dodge;
      if (b.until <= Date.now() && !b._expired) {
        b._expired = true;
        recalcStats(hero);
      }
    }

    if (!hero.casting) {
      // Каст прерван уроном — выходим из состояния
      isCasting = false;
    } else if (hero.casting.elapsed >= hero.casting.duration) {
      // Завершение каста
      const c = hero.casting;
      hero.casting = null;
      isCasting = false;

      if (hero.mana >= c.cost) {
        hero.mana -= c.cost;
        hero._pendingCastResult = {
          skill: SKILLS[c.skillId],
          skillId: c.skillId,
          level: c.level,
          cost: c.cost,
          cooldown: c.cooldown,
          effect: c.effect,
        };
      }
    }
  }

  // Тик скилловых баффов
  if (!isCasting && hero.skillBuffs?.dodge) {
    const b = hero.skillBuffs.dodge;
    if (b.until <= Date.now() && !b._expired) {
      b._expired = true;
      recalcStats(hero);
    }
  }

  if (hero.hitAnim > 0) hero.hitAnim -= dt;
  if (hero.attackAnim > 0) hero.attackAnim -= dt;
  hero.cooldown -= dt;

  // ── ДВИЖЕНИЕ (работает и во время каста) ──
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

  // ── Автоатака и новый каст запрещены во время каста ──
  if (isCasting) return;
  if (hero.cooldown > 0) return;
  const base = CONFIG.hero[hero.classType];

  let target = null, bd = Infinity;
  for (const m of mobs) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - hero.x, m.y - hero.y);
    if (d <= hero.range && d < bd) { target = m; bd = d; }
  }
  if (!target) return;

  let _atkMult = 1;
  if (hero.attackSpeedDebuff && hero.attackSpeedDebuff.until > Date.now()) {
    _atkMult = hero.attackSpeedDebuff.mult || 1;
  }
  hero.cooldown = 1 / (hero.attackSpeed * _atkMult);

  let damage = hero.attack;
  let isCrit = false;
  let isExecute = false;

  if (canUseSoulshot(hero) && consumeSoulshot(hero)) {
    damage *= 1.3;
    effects.push({ x: hero.x, y: hero.y - 0.9, life: 0.45, maxLife: 0.45, color: '#fbbf24', text: '⚡', big: true });
  }

  const effCrit = calcCritChance(hero, target);
  if (Math.random() * 100 < effCrit) {
    isCrit = true;
    damage *= (1 + hero.critDamage / 100);
  }

  if (hero.executeBonus > 0 && target.hp / target.maxHp < 0.3) {
    damage *= (1 + hero.executeBonus);
    isExecute = true;
  }

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
    owner: hero,
  });
}

// ===== РЮКЗАК =====

export function addToBackpack(hero, item) {
  if (item.kind === 'buff' || item.kind === 'blessed' || item.kind === 'pass' || item.kind === 'book') {
    const existing = hero.backpack.find(
      x => x.kind === item.kind &&
           (item.kind !== 'buff' || x.buffType === item.buffType) &&
           (item.kind !== 'book' || x.skillId === item.skillId)
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

// ===== УРОН МОБОВ =====

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

// ===== СКИЛЛЫ: ЛОГИКА =====

// Возвращает true, если на уровне включён milestone с данным id
export function hasSkillMilestone(level, milestoneId) {
  // Каждые 10 уровней — milestone
  // lvl 10 → cd10, lvl 20 → mana10, ..., lvl 100 → legend
  const msByLvl = {
    10: 'cd10', 20: 'mana10', 30: 'crit5', 40: 'cd20',
    50: 'aoe1', 60: 'mana25', 70: 'critdmg', 80: 'cd35',
    90: 'pierce', 100: 'legend',
  };
  // Проходим все milestones ≤ level
  for (const lvlStr in msByLvl) {
    const lvl = parseInt(lvlStr, 10);
    if (lvl <= level && msByLvl[lvl] === milestoneId) return true;
  }
  return false;
}

// Список активных milestone'ов для уровня (для UI)
export function getSkillMilestones(level) {
  const milestones = [
    { lvl: 10,  id: 'cd10',    desc: '−10% КД' },
    { lvl: 20,  id: 'mana10',  desc: '−10% маны' },
    { lvl: 30,  id: 'crit5',   desc: '+5% шанс крита' },
    { lvl: 40,  id: 'cd20',    desc: '−10% КД (итого −20%)' },
    { lvl: 50,  id: 'aoe1',    desc: '+1 цель / +15% урона' },
    { lvl: 60,  id: 'mana25',  desc: '−15% маны (итого −25%)' },
    { lvl: 70,  id: 'critdmg', desc: '+50% крит-урона' },
    { lvl: 80,  id: 'cd35',    desc: '−15% КД (итого −35%)' },
    { lvl: 90,  id: 'pierce',  desc: 'Pierce 20%' },
    { lvl: 100, id: 'legend',  desc: 'Уникальный эффект' },
  ];
  return milestones.map(ms => ({ ...ms, active: level >= ms.lvl }));
}

// Итоговый множитель КД от milestones (только активные)
export function getCooldownMultiplier(level) {
  let mult = 1.0;
  if (hasSkillMilestone(level, 'cd10'))  mult *= 0.90;   // −10%
  if (hasSkillMilestone(level, 'cd20'))  mult *= 0.90;   // ещё −10%
  if (hasSkillMilestone(level, 'cd35'))  mult *= 0.85;   // ещё −15%
  return mult;
}

// Итоговый множитель маны от milestones
export function getManaMultiplier(level) {
  let mult = 1.0;
  if (hasSkillMilestone(level, 'mana10')) mult *= 0.90;   // −10%
  if (hasSkillMilestone(level, 'mana25')) mult *= 0.85;   // ещё −15%
  return mult;
}

// Бонус к криту от milestones
export function getSkillCritBonus(level) {
  let bonus = 0;
  if (hasSkillMilestone(level, 'crit5'))   bonus += 5;   // +5% крит-шанса
  if (hasSkillMilestone(level, 'critdmg')) bonus += 50;  // +50% крит-урона (учтём отдельно)
  return bonus;
}

// Pierce от milestones
export function getSkillPierce(level) {
  return hasSkillMilestone(level, 'pierce') ? 20 : 0;
}

// Уровневая формула: мана
export function getSkillManaCost(hero, skillId) {
  const def = SKILLS[skillId];
  if (!def) return 0;
  const lvl = hero.skills?.[skillId]?.level || 1;
  const lvlMult = 1 + SKILL_LEVEL_COST * (lvl - 1);   // +0.1%/ур → +10% на 100
  const msMult = getManaMultiplier(lvl);              // −25% от milestones
  return Math.floor(def.manaCost * lvlMult * msMult);
}

// КД с уровнями и milestones
export function getSkillCooldown(hero, skillId) {
  const def = SKILLS[skillId];
  if (!def) return 0;
  const lvl = hero.skills?.[skillId]?.level || 1;
  return def.cooldown * getCooldownMultiplier(lvl);
}
// Каст-тайм с уровнями скилла + скорость каста героя.
// Уровень скилла снижает каст до 41% на 100-м уровне.
// castSpeed от экипировки (0..70%) уменьшает остаток.
export function getSkillCastTime(hero, skillId) {
  const def = SKILLS[skillId];
  if (!def || !def.castTime) return 0;
  const lvl = hero.skills?.[skillId]?.level || 1;
  const lvlMult = Math.max(0.25, 1 - SKILL_LEVEL_CAST * (lvl - 1));
  const speedMult = 1 - Math.min(70, hero.castSpeed || 0) / 100;
  return Math.max(0.15, def.castTime * lvlMult * speedMult);
}
// Эффект с уровнями и milestones
export function getSkillEffect(hero, skillId) {
  const def = SKILLS[skillId];
  if (!def) return null;
  const lvl = hero.skills?.[skillId]?.level || 1;

  // Разные множители для урона и длительности
  const valMult = 1 + SKILL_LEVEL_EFFECT * (lvl - 1);      // ×2.98 на 100
  let durMult  = 1 + SKILL_LEVEL_DURATION * (lvl - 1);     // ×5.46 на 100

  // Milestone 100: легендарный — +50% к длительности
  if (hasSkillMilestone(lvl, 'legend')) durMult *= 1.5;

  const out = { ...def.effect };

  // value × valMult
  if (typeof def.effect.value === 'number') {
    out.value = def.effect.value * valMult;
  }
  // duration × durMult
  if (typeof def.effect.duration === 'number') {
    out.duration = def.effect.duration * durMult;
  }
  // Встроенный дебафф (ice_bolt → slow)
  if (def.effect.debuff && typeof def.effect.debuff.duration === 'number') {
    out.debuff = { ...def.effect.debuff, duration: def.effect.debuff.duration * durMult };
  }
  // dotDuration (arrow_rain — поле дождя) — растёт как duration
  if (typeof def.effect.dotDuration === 'number') {
    out.dotDuration = def.effect.dotDuration * durMult;
  }
  // dotValue (урон тика дождя) — растёт как урон
  if (typeof def.effect.dotValue === 'number') {
    out.dotValue = def.effect.dotValue * valMult;
  }
  // AoE +1 от milestone 50
  if (hasSkillMilestone(lvl, 'aoe1') && def.effect.aoe) {
    out.aoe = def.effect.aoe + 1;
  } else if (hasSkillMilestone(lvl, 'aoe1') && typeof def.effect.value === 'number') {
    out.value = out.value * 1.15;
  }
  // Chain +1 от milestone 50
  if (hasSkillMilestone(lvl, 'aoe1') && def.effect.chain) {
    out.chain = def.effect.chain + 1;
  }
  out.pierce = getSkillPierce(lvl);
  out.critBonus = getSkillCritBonus(lvl);

  return out;
}

export function getSkillLevel(hero, skillId) {
  return hero.skills?.[skillId]?.level || 0;
}

export function getSkillRemainingCooldown(hero, skillId) {
  return hero.skillCooldowns?.[skillId] || 0;
}

export function isSkillReady(hero, skillId) {
  if (!hero.skills?.[skillId]) return false;
  return (hero.skillCooldowns?.[skillId] || 0) <= 0;
}

export function tickSkillCooldowns(hero, dt) {
  if (!hero.skillCooldowns) return;
  for (const id in hero.skillCooldowns) {
    if (hero.skillCooldowns[id] > 0) {
      hero.skillCooldowns[id] = Math.max(0, hero.skillCooldowns[id] - dt);
    }
  }
}

export function tryUseSkill(hero, skillId) {
  if (!hero || hero.dead) return { ok: false, reason: 'dead' };
  if (hero.casting) return { ok: false, reason: 'already_casting' };
  if (hero.silenceUntil && hero.silenceUntil > Date.now()) return { ok: false, reason: 'silenced' };
  const def = SKILLS[skillId];
  if (!def) return { ok: false, reason: 'unknown_skill' };
  if (!hero.skills?.[skillId]) return { ok: false, reason: 'not_learned' };

  // Класс-лок (кроме тренировочного манекена)
  if (!hero.ignoreClassLock) {
    const cls = def.class || 'common';
    if (cls !== 'common' && cls !== hero.classType) {
      return { ok: false, reason: 'wrong_class' };
    }
  }
  if ((hero.skillCooldowns?.[skillId] || 0) > 0) {
    return { ok: false, reason: 'cooldown', remaining: hero.skillCooldowns[skillId] };
  }
  const cost = getSkillManaCost(hero, skillId);
  if (hero.mana < cost) {
    return { ok: false, reason: 'no_mana', need: cost, have: Math.floor(hero.mana) };
  }

  const effect = getSkillEffect(hero, skillId);
  const level = hero.skills[skillId].level;

  // КД ставим сразу — при прерывании игрок всё равно теряет КД
  // КД ставим сразу — с учётом уровня и milestones
  hero.skillCooldowns[skillId] = getSkillCooldown(hero, skillId);
  // Есть время каста?
  const castTime = def.castTime || 0;
  if (castTime > 0) {
    const realTime = getSkillCastTime(hero, skillId);
    hero.casting = {
      skillId,
      elapsed: 0,
      duration: realTime,
      cost,
      cooldown: def.cooldown,
      effect,
      level,
    };
    // Ману спишем при завершении каста (при прерывании — не тратится)
    return { ok: true, casting: true, castTime: realTime, skillId, skill: def };
  }

  // Мгновенный — как было
  hero.mana -= cost;
  return {
    ok: true,
    skillId,
    skill: def,
    level,
    cost,
    cooldown: def.cooldown,
    effect,
  };
}

export function learnSkill(hero, skillId) {
  const def = SKILLS[skillId];
  if (!def) return { ok: false, reason: 'unknown_skill' };

  // Класс-лок
  const cls = def.class || 'common';
  if (cls !== 'common' && cls !== hero.classType) {
    return { ok: false, reason: 'wrong_class', requiredClass: cls };
  }

  if (!hero.skills) hero.skills = {};
  const cur = hero.skills[skillId]?.level || 0;
  if (cur >= MAX_SKILL_LEVEL) return { ok: false, reason: 'max_level' };
  hero.skills[skillId] = { level: cur + 1 };
  return { ok: true, level: cur + 1, learned: cur === 0 };
}

// Универсальный формат: "skill:fireball", "potion:small", "soulshot:ng", "buff:attack"
export function parseSlotAction(slotStr) {
  if (!slotStr || typeof slotStr !== 'string') return null;
  const idx = slotStr.indexOf(':');
  if (idx < 0) return { kind: 'skill', id: slotStr };
  return { kind: slotStr.slice(0, idx), id: slotStr.slice(idx + 1) };
}

// Универсальный сеттер слота
export function setSlotAction(hero, slotIndex, kind, id) {
  if (slotIndex < 0 || slotIndex > 7) return { ok: false, reason: 'bad_slot' };
  if (!hero.skillSlots) hero.skillSlots = [null, null, null, null, null, null, null, null];
  while (hero.skillSlots.length < 8) hero.skillSlots.push(null);

  let slotStr = null;
  if (kind && id) {
    // Валидация
    if (kind === 'skill' && !hero.skills?.[id]) return { ok: false, reason: 'not_learned' };
    if (kind === 'potion' && !['small','medium','large','epic'].includes(id)) return { ok: false, reason: 'bad_potion' };
    if (kind === 'soulshot' && !['ng','d','c','b','a','s'].includes(id)) return { ok: false, reason: 'bad_grade' };
    if (kind === 'buff' && !['attack','crit','speed','range'].includes(id)) return { ok: false, reason: 'bad_buff' };
    slotStr = kind + ':' + id;
  }

  // Убрать дубль из других слотов
  if (slotStr) {
    for (let i = 0; i < 8; i++) {
      if (i !== slotIndex && hero.skillSlots[i] === slotStr) hero.skillSlots[i] = null;
    }
  }

  hero.skillSlots[slotIndex] = slotStr;
  syncSoulshotFromSlots(hero);
  return { ok: true };
}

// Обратная совместимость
export function setSkillSlot(hero, slotIndex, skillId) {
  return setSlotAction(hero, slotIndex, skillId ? 'skill' : null, skillId || null);
}

// Авто-соски: если соска в слоте — включаем; если нет — выключаем.
export function syncSoulshotFromSlots(hero) {
  let grade = null;
  for (const s of hero.skillSlots || []) {
    if (!s) continue;
    const p = parseSlotAction(s);
    if (p && p.kind === 'soulshot') { grade = p.id; break; }
  }
  if (grade) {
    hero.soulshotActive = true;
    hero.soulshotGrade = grade;
  } else {
    hero.soulshotActive = false;
    hero.soulshotGrade = null;
  }
}
// Использовать бафф-свиток (в т.ч. из слота). КД 5 минут.
export function useBuffScroll(hero, buffType) {
  const def = BUFF_SCROLLS[buffType];
  if (!def) return { ok: false, reason: 'bad_buff' };
  const now = Date.now();

  if (hero.activeBuffs?.[buffType] && hero.activeBuffs[buffType] > now) {
    return { ok: false, reason: 'already_active' };
  }
  if (hero.buffScrollCooldowns?.[buffType] && hero.buffScrollCooldowns[buffType] > now) {
    return { ok: false, reason: 'cooldown', remain: hero.buffScrollCooldowns[buffType] - now };
  }

  const idx = hero.backpack.findIndex(x => x.kind === 'buff' && x.buffType === buffType);
  if (idx < 0) return { ok: false, reason: 'no_scroll' };

  const stack = hero.backpack[idx];
  if ((stack.count || 1) > 1) stack.count -= 1;
  else hero.backpack.splice(idx, 1);

  hero.activeBuffs[buffType] = now + def.duration * 1000;
  hero.buffScrollCooldowns[buffType] = now + 5 * 60 * 1000;
  recalcStats(hero);
  return { ok: true, buffType };
}