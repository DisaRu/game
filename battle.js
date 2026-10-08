// battle.js
// Единое ядро боя.
// В зоне:     heroes=[hero], enemies=mobs, allowMovement=true.
// На арене:   heroes=[hero], enemies=[bot],  allowMovement=false.
//
// Возвращает { killed, heroDied }:
//   killed   — массив врагов, которых убили в этом тике.
//              main.js их обработает (xp, drop, levelup, effects).
//   heroDied — true, если герой умер в этом тике.

import {
  updateHero, autoUsePotion, damageHero,
  mobDamageFor, bossDamageFor, bossAoeDamageFor,
  getChainTargets, calcHitChance, calcEffectiveDefense,
} from './hero.js';
import { updateMob, aggroGroup } from './mobs.js';
import { castBossAoe, checkAoeHit, GUARD_CALL, BOSS_AOE } from './bosses.js';
import { aiControl } from './ai.js';
import { sfxHit, sfxHeroHit, sfxDeath } from './audio.js';

export function updateBattle(dt, world) {
  const {
    heroes, enemies, projectiles, effects, aoeList,
    bounds = { cols: 24, rows: 36 },
    moveInput = { left: false, right: false, up: false, down: false },
    currentZone = null,
    autoBattle = false,
    allowMovement = true,

    // Колбэки — main.js их передаёт, чтобы battle.js не тащил за собой state
    addEffect = (fx) => { effects.push(fx); },
    applySkillEffect = null,
    noteOfflineEvent = () => {},
    toast = () => {},
    spawnBossGuard = null,
    logArena = null,
  } = world;

  const killed = [];
  if (!heroes || heroes.length === 0) return { killed, heroDied: false };

  // ===== AI: автоскиллы для героев и врагов-героев =====
  for (const h of heroes) {
    if (h.dead) continue;
    const shouldAI = h.isAI || autoBattle;
    if (shouldAI && applySkillEffect) {
      aiControl(h, dt, enemies, (hh, result) => applySkillEffect(hh, result));
    }
  }
  for (const e of enemies) {
    if (e.dead || !e.isAI) continue;
    if (applySkillEffect) {
      aiControl(e, dt, heroes, (ee, result) => applySkillEffect(ee, result));
    }
  }

  // ===== Враги (мобы) =====
  for (const m of enemies) {
    if (m.dead) continue;

     // Враг — тоже герой (арена). Автоатака через updateHero.
    if (m.isAI) {
      if (m.stunUntil && m.stunUntil > Date.now()) {
        m.hitAnim = 0.15;
        continue;
      }
      if (m.silenceUntil && m.silenceUntil > Date.now() && m.casting) {
        m.casting = null;
      }
      // Фикс залипания каста
      if (m.casting && m.casting.elapsed > m.casting.duration + 2) {
        m.casting = null;
      }
      // Фикс залипания кулдауна
      if (m.cooldown < -5) m.cooldown = 0;
      if (m.skillCooldowns) {
        for (const k in m.skillCooldowns) {
          if (m.skillCooldowns[k] < -5) m.skillCooldowns[k] = 0;
        }
      }
      // Враги тоже видят теней героя как цели
      const _extraTargets = (world.shadows || []).filter(s => s.ownerTeam !== 'enemy');
      const _targets = [...heroes, ..._extraTargets];
      updateHero(m, dt, _targets, projectiles,
        { left: false, right: false, up: false, down: false },
        bounds, effects);
      continue;
    }
    // Silence прерывает каст у врагов
    if (m.silenceUntil && m.silenceUntil > Date.now() && m.casting) {
      m.casting = null;
    }

    const action = updateMob(m, dt, heroes[0], heroes[0].x, heroes[0].y);
    m.x = Math.max(0.3, Math.min(bounds.cols - 0.3, m.x));
    m.y = Math.max(0.3, Math.min(bounds.rows - 0.3, m.y));

    // === Логика босса ===
    if (m.boss) {
      if (m.castGlow > 0) m.castGlow -= dt;

      m.aoeTimer -= dt;
      if (m.aoeTimer <= 0) {
        const grade = m.grade || 'ng';
        const aoeDef = BOSS_AOE[grade] || BOSS_AOE.ng;
        m.aoeTimer = aoeDef.interval[0] + Math.random() * (aoeDef.interval[1] - aoeDef.interval[0]);
        m.castGlow = 0.6;
        const aoe = castBossAoe(m, heroes[0]);
        if (aoe) aoeList.push(aoe);
      }

      const call = GUARD_CALL[m.grade || 'ng'] || GUARD_CALL.ng;
      m.guardTimer -= dt;
      if (m.guardTimer <= 0) {
        m.guardTimer = call.interval;
        const guardsAlive = enemies.filter(x => x.dungeonGuard && !x.dead).length;
        const canSpawn = Math.min(call.count, call.max - guardsAlive);
        if (spawnBossGuard && canSpawn > 0 && currentZone) {
          for (let g = 0; g < canSpawn; g++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 3 + Math.random() * 4;
            const gx = Math.max(1, Math.min(bounds.cols - 1, m.x + Math.cos(angle) * dist));
            const gy = Math.max(1, Math.min(bounds.rows - 1, m.y + Math.sin(angle) * dist));
            const guard = spawnBossGuard(currentZone, gx, gy, null);
            enemies.push(guard);
          }
          toast(`⚠️ Босс призвал ${canSpawn} охраны`, 'epic');
        }
      }
    }

    // === Атака героя мобом ===
    if (action === 'attack') {
      const hero = heroes[0];
      const diff = currentZone?.diff || 'easy';
      const mobDmg = m.boss ? bossDamageFor(hero) : mobDamageFor(hero, diff);

      // ── Дальний бой: стреляем снарядом вместо прямого удара ──
      if ((m.attackRange || 0) > 2) {
        const proj = m.attackProjectile || { type: 'bow', color: '#f97316', speed: 12 };
        const tx = hero.x - m.x, ty = hero.y - m.y;
        const dist = Math.hypot(tx, ty) || 1;
        projectiles.push({
          x: m.x, y: m.y,
          vx: tx/dist * (proj.speed || 12),
          vy: ty/dist * (proj.speed || 12),
          damage: mobDmg,
          aoe: 0,
          color: proj.color || '#f97316',
          weaponType: proj.type || 'bow',
          life: 3, trail: [],
          isCrit: false, isExecute: false, doubleStrike: false,
          isSkill: false,
          owner: m,
        });
        continue;   // урон нанесётся при попадании снаряда
      }

      const result = damageHero(hero, mobDmg, m);
      if (result === 'dodge') {
        noteOfflineEvent('dodge', { mob: m.name || m.id });
        addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a5f3fc', text: 'DODGE' });
      } else {
        if (hero.thornsPercent > 0) {
          const thorns = Math.floor(mobDmg * hero.thornsPercent);
          m.hp -= thorns;
          m.hitFlash = 0.15;
          addEffect({ x: m.x, y: m.y - 0.5, life: 0.7, maxLife: 0.7, color: '#a855f7', text: '🌵' + thorns, big: true });
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#a855f7', radius: 0.9 });
        }
        sfxHeroHit();
        noteOfflineEvent('hit', { mob: m.name || m.id, dmg: mobDmg });
        addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ef4444', text: '-' + mobDmg });
        if (logArena) logArena({
          kind: 'hit', side: 'opp',
          attacker: m.name || m.id,
          target: hero.name,
          damage: mobDmg, crit: false,
        });
      }
    }
  }

  // ===== Герой: движение + автоатака + мана + кулдауны =====
  for (const h of heroes) {
    if (h.dead) continue;
    if (h.silenceUntil && h.silenceUntil > Date.now() && h.casting) {
      h.casting = null;
    }
    if (h.casting && h.casting.elapsed > h.casting.duration + 2) {
      h.casting = null;
    }
    if (h.cooldown < -5) h.cooldown = 0;
    const _enemyShadows = (world.shadows || []).filter(s => s.ownerTeam === 'enemy');
    const _targets = [...enemies, ..._enemyShadows];
    const inp = allowMovement ? moveInput : { left: false, right: false, up: false, down: false };
    updateHero(h, dt, _targets, projectiles, inp, bounds, effects);
  }

  // ===== Зелья =====
  for (const h of heroes) {
    if (h.dead) continue;
    const potResult = autoUsePotion(h, dt);
    if (potResult) {
      addEffect({ x: h.x, y: h.y - 1, life: 1.0, maxLife: 1.0, color: potResult.color, text: '+' + potResult.healed, big: true });
      if (logArena) logArena({
        kind: 'potion',
        side: (h.team === 'enemy') ? 'opp' : 'me',
        attacker: h.name, heal: potResult.healed,
      });
    }
  }

  // ===== AoE боссов =====
  for (let i = aoeList.length - 1; i >= 0; i--) {
    const aoe = aoeList[i];
    aoe.life -= dt;
    const hero = heroes[0];

    if (aoe.type === 'fire') {
      if (aoe.life > aoe.life - 0.01 || aoe.life <= 5) {
        for (const s of aoe.spots) {
          if (s.life <= 0) continue;
          s.life -= dt;
          s.tickTimer -= dt;
          if (s.tickTimer <= 0) {
            s.tickTimer = 1.0;
            const d = Math.hypot(s.x - hero.x, s.y - hero.y);
            if (d <= s.radius) {
              const dmg = Math.max(1, s.damage - Math.floor(hero.defense * 0.5));
              hero.hp -= dmg;
              hero.hitAnim = 0.15;
              addEffect({ x: hero.x, y: hero.y - 0.5, life: 0.7, maxLife: 0.7, color: '#ea580c', text: '-' + Math.floor(dmg) });
              sfxHeroHit();
              if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; }
            }
          }
        }
      }
    } else if (aoe.life <= 0) {
      if (checkAoeHit(aoe, hero)) {
        const dmg = bossAoeDamageFor(hero);
        hero.hp -= dmg;
        hero.hitAnim = 0.2;
        addEffect({ x: hero.x, y: hero.y - 1, life: 1.0, maxLife: 1.0, color: '#dc2626', text: '-' + Math.floor(dmg), big: true });
        sfxHeroHit();
        if (hero.hp <= 0) { hero.hp = 0; hero.dead = true; }
      }
      aoeList.splice(i, 1);
      continue;
    }

    if (aoe.life <= -10) aoeList.splice(i, 1);
  }

  // ===== Снаряды =====
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    // Задержка снаряда (multishot — стрелы с интервалом)
    if (p.delay && p.delay > 0) {
      p.delay -= dt;
      continue;
    }

    p.trail.push({ x: p.x, y: p.y });
    if (p.trail.length > 5) p.trail.shift();
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;

     const attacker = p.owner || heroes[0];
    const baseTargets = (attacker && attacker.team === 'enemy') ? heroes : enemies;
    // Тени — тоже цели
    const _shadows = world.shadows || [];
    const _shadowTargets = _shadows.filter(s => {
      if (!s || s.hp <= 0) return false;
      if (attacker && attacker.team === 'enemy') return s.ownerTeam !== 'enemy';
      return s.ownerTeam === 'enemy';
    });
    const targets = [...baseTargets, ..._shadowTargets];
    const hero = attacker;
    const prevX = p.x - p.vx * dt;
    const prevY = p.y - p.vy * dt;
    let hit = false;

       for (const m of targets) {
      if (m.dead) continue;
      const hitRadius = (m.size || 0.8) * 0.6 + 0.3;
      // Расстояние от точки m до отрезка prev→p
      const sx = p.x - prevX, sy = p.y - prevY;
      const len2 = sx*sx + sy*sy;
      let t = 0;
      if (len2 > 0) {
        t = ((m.x - prevX) * sx + (m.y - prevY) * sy) / len2;
        t = Math.max(0, Math.min(1, t));
      }
      const closestX = prevX + sx * t;
      const closestY = prevY + sy * t;
      const dist = Math.hypot(m.x - closestX, m.y - closestY);
      if (dist < hitRadius) {
        // Используем атакующего (attacker), не героя
        const _acc = attacker.accuracy || 0;
        const _dodge = m.dodge || 0;
        const hitChance = Math.max(5, Math.min(100, 100 - _dodge + _acc));
        if (Math.random() * 100 > hitChance) {
          noteOfflineEvent('miss');
          addEffect({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a5f3fc', text: 'MISS' });
          if (logArena) logArena({
            kind: 'miss',
            side: (attacker.team === 'enemy') ? 'opp' : 'me',
            attacker: attacker.name, target: m.name,
          });
          hit = true;
          break;
        }

        // Пробитие: теней — 90% игнора, остальных — по armorPen
        let effDef;
        if (p.owner && p.owner.isShadow) {
          effDef = (m.defense || 0) * 0.1;
        } else {
          const _pen = (attacker.armorPen || 0) / 100;
          effDef = Math.max(0, (m.defense || 0) * (1 - _pen));
        }
        let finalDamage = Math.max(1, p.damage - Math.floor(effDef * 0.5));

        // Pierce от milestone 90
        if (p.pierce > 0) {
          finalDamage += Math.floor(effDef * (p.pierce / 100));
        }

        // Execute от lethal_shot (или milestone)
        if (p.executeBonus > 0 && m.hp / m.maxHp < 0.3) {
          finalDamage = Math.floor(finalDamage * (1 + p.executeBonus));
          addEffect({ x: m.x, y: m.y - 1.6, life: 0.9, maxLife: 0.9, color: '#dc2626', text: '💀 КАЗНЬ', big: true });
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#dc2626', radius: 1.2 });
        }

        // Crit bonus от milestone 30 (для скиллов)
        if (p.critBonus > 0 && !p.isCrit) {
          if (Math.random() * 100 < p.critBonus) {
            p.isCrit = true;
            finalDamage = Math.floor(finalDamage * (1 + (attacker.critDamage || 50) / 100));
          }
        }

        // Chain lightning — рикошет (chain_lightning)
        if (p.chain > 0) {
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#a855f7', radius: 1.0 });
          let prev = m;
          let chainDmg = finalDamage;
          for (let c = 0; c < p.chain; c++) {
            const cand = targets
              .filter(x => !x.dead && x !== prev && Math.hypot(x.x - prev.x, x.y - prev.y) <= 4)
              .sort((a, b) => Math.hypot(a.x - prev.x, a.y - prev.y) - Math.hypot(b.x - prev.x, b.y - prev.y));
            if (cand.length === 0) break;
            const next = cand[0];
            chainDmg = Math.floor(chainDmg * (p.chainDecay || 0.7));
            next.hp -= chainDmg;
            next.hitFlash = 0.12;
            next.aggro = true;
            if (next.groupId) aggroGroup(enemies, next.groupId);
            addEffect({ kind: 'chain', x1: prev.x, y1: prev.y, x2: next.x, y2: next.y, life: 0.35, maxLife: 0.35, color: '#a855f7' });
            addEffect({ kind: 'flash', x: next.x, y: next.y, life: 0.3, maxLife: 0.3, color: '#a855f7', radius: 0.8 });
            addEffect({ x: next.x, y: next.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a855f7', text: '⚡' + chainDmg, big: true });
            prev = next;
          }
        }

        if (p.doubleStrike && !p.doubleStrikeDone) {
          p.doubleStrikeDone = true;
          finalDamage *= 2;
          addEffect({ x: m.x, y: m.y - 1.2, life: 0.8, maxLife: 0.8, color: '#fbbf24', text: '👊 x2', big: true });
          addEffect({ kind: 'flash', x: m.x, y: m.y, life: 0.4, maxLife: 0.4, color: '#fbbf24', radius: 1.0 });
        }

        if (p.isExecute) {
          addEffect({ x: m.x, y: m.y - 1.6, life: 0.9, maxLife: 0.9, color: '#dc2626', text: '💀 КАЗНЬ', big: true });
        }

        m.hp -= finalDamage; m.hitFlash = 0.12; m.aggro = true;
        if (m.groupId) aggroGroup(enemies, m.groupId);
        sfxHit();

        // ── Встроенный дебафф от снаряда (ice_bolt: замедление) ──
        if (p.onHitDebuff && !m.dead) {
          const db = p.onHitDebuff;
          const nowDb = Date.now();
          if (db.stat === 'attackSpeed') {
            m.attackSpeedDebuff = {
              mult: Math.max(0.1, 1 + (db.value / 100)),
              until: nowDb + (db.duration || 3) * 1000,
            };
            addEffect({ kind: 'frost_ring', x: m.x, y: m.y, life: db.duration || 3, maxLife: db.duration || 3, color: '#67e8f9', owner: m });
            addEffect({ x: m.x, y: m.y - 1.2, life: 1.0, maxLife: 1.0, color: '#67e8f9', text: '❄️ замедл.', big: false });
          } else if (db.stat === 'stun') {
            m.stunUntil = nowDb + (db.duration || 2) * 1000;
            addEffect({ kind: 'stun_ring', x: m.x, y: m.y, life: db.duration || 2, maxLife: db.duration || 2, color: '#fbbf24', owner: m });
          } else if (db.stat === 'silence') {
            m.silenceUntil = nowDb + (db.duration || 3) * 1000;
            if (m.casting) m.casting = null;
            addEffect({ kind: 'silence_ring', x: m.x, y: m.y, life: db.duration || 3, maxLife: db.duration || 3, color: '#3b82f6', owner: m });
          }
        }

        noteOfflineEvent(p.isCrit ? 'crit' : 'deal', { mob: m.name || m.id, dmg: Math.floor(finalDamage) });
        if (logArena) logArena({
          kind: p.isSkill ? 'skill' : 'hit',
          side: (attacker.team === 'enemy') ? 'opp' : 'me',
          attacker: attacker.name, target: m.name,
          damage: Math.round(finalDamage), crit: p.isCrit,
        });
        const dmgColor = p.isCrit ? '#f97316' : '#facc15';
        const dmgText = (p.isCrit ? '💥' : '-') + Math.floor(finalDamage);
        addEffect({ x: m.x, y: m.y - 0.5, life: 0.6, maxLife: 0.6, color: dmgColor, text: dmgText, big: p.isCrit });

        if (p.aoe > 0) {
          addEffect({ kind: 'aoe_hit', x: m.x, y: m.y, life: 0.5, maxLife: 0.5, color: p.color, radius: p.aoe });
          for (const other of targets) {
            if (other === m || other.dead) continue;
            if (Math.hypot(other.x - m.x, other.y - m.y) <= p.aoe) {
              other.hp -= finalDamage * 0.6; other.hitFlash = 0.12; other.aggro = true;
              if (other.groupId) aggroGroup(enemies, other.groupId);
            }
          }
        }

        const chainCount = getChainTargets(attacker);
        if (chainCount > 0) {
          const candidates = targets
            .filter(x => !x.dead && x !== m && Math.hypot(x.x - m.x, x.y - m.y) <= 4)
            .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y))
            .slice(0, chainCount);

          let prev = m;
          for (const target of candidates) {
            target.hp -= finalDamage * 0.7;
            target.hitFlash = 0.12; target.aggro = true;
            if (target.groupId) aggroGroup(enemies, target.groupId);
            addEffect({ x: target.x, y: target.y - 0.5, life: 0.6, maxLife: 0.6, color: '#a855f7', text: '⚡' + Math.floor(finalDamage * 0.7), big: true });
            for (let k = 0; k < 2; k++) {
              addEffect({ kind: 'chain', x1: prev.x, y1: prev.y, x2: target.x, y2: target.y, life: 0.35, maxLife: 0.35, color: k === 0 ? '#a855f7' : '#d4a5ff' });
            }
            addEffect({ kind: 'flash', x: target.x, y: target.y, life: 0.3, maxLife: 0.3, color: '#a855f7', radius: 0.8 });
            prev = target;
          }
          if (candidates.length > 0) {
            addEffect({ x: m.x, y: m.y - 2.0, life: 0.7, maxLife: 0.7, color: '#d4a5ff', text: '⚡⚡⚡ x' + candidates.length, big: true });
          }
        }

        hit = true; break;
      }
    }

    if (hit || p.life <= 0 || p.y < -2 || p.y > bounds.rows + 2 || p.x < -2 || p.x > bounds.cols + 2) {
      projectiles.splice(i, 1);
    }
  }
    // ===== DoT (яд) =====
  const _now = Date.now();
  for (const target of [...heroes, ...enemies]) {
    if (!target || target.dead || !target.dots || target.dots.length === 0) continue;
    for (let d = target.dots.length - 1; d >= 0; d--) {
      const dot = target.dots[d];
      if (_now >= dot.nextTick) {
        target.hp -= dot.damage;
        target.hitFlash = 0.15;
        dot.ticksLeft--;
        dot.nextTick = _now + dot.tickInterval * 1000;
        addEffect({ x: target.x, y: target.y - 0.5, life: 0.7, maxLife: 0.7, color: '#22c55e', text: '-' + dot.damage });
        if (dot.ticksLeft <= 0) target.dots.splice(d, 1);
        if (target.hp <= 0) {
          target.hp = 0;
          if (!target.dead) {
            target.dead = true;
            if (killed.indexOf(target) < 0) killed.push(target);
          }
        }
      }
    }
  }

  // ===== Тени (summon) =====
  if (world.shadows && Array.isArray(world.shadows)) {
    for (let i = world.shadows.length - 1; i >= 0; i--) {
      const s = world.shadows[i];
      // Тень умирает от урона
      if (s.hp !== undefined && s.hp <= 0) {
        addEffect({ x: s.x, y: s.y - 0.5, life: 1.0, maxLife: 1.0, color: '#a855f7', text: '💀', big: true });
        world.shadows.splice(i, 1);
        continue;
      }
      if (_now >= s.expiresAt) { world.shadows.splice(i, 1); continue; }

      s.cooldown -= dt;
      s._levitate = (s._levitate || 0) + dt;

      // Ищем цель
      const targets = (s.ownerTeam === 'enemy') ? heroes : enemies;
      let best = null, bestD = Infinity;
      for (const t of targets) {
        if (!t || t.dead) continue;
        const d = Math.hypot(t.x - s.x, t.y - s.y);
        if (d < bestD) { best = t; bestD = d; }
      }

      const isPanther = s.petType === 'panther';
      const minDist = isPanther ? 1.0 : 1.5;
      if (best && bestD > minDist) {
        const tx = best.x - s.x, ty = best.y - s.y;
        const dist = Math.hypot(tx, ty) || 1;
        const spd = s.moveSpeed || 0.4;
        s.x += tx / dist * spd * dt;
        s.y += ty / dist * spd * dt;
      }

      // Атака
      const attackRange = isPanther ? 1.5 : 12;
      if (s.cooldown <= 0 && best && bestD < attackRange) {
        s.cooldown = 1 / Math.max(0.3, s.attackSpeed || 1);

        if (isPanther) {
          // Ближний бой — урон напрямую, без снаряда
          const finalDamage = Math.max(1, Math.floor(s.damage - (best.defense || 0) * 0.3));
          best.hp -= finalDamage;
          best.hitFlash = 0.12;
          best.aggro = true;
          if (best.groupId && typeof aggroGroup === 'function') aggroGroup(enemies, best.groupId);
          sfxHit();
          if (typeof logArena === 'function') logArena({
            kind: 'hit', side: (s.ownerTeam === 'enemy') ? 'opp' : 'me',
            attacker: s.name, target: best.name,
            damage: finalDamage, crit: false,
          });
          addEffect({ x: best.x, y: best.y - 0.5, life: 0.6, maxLife: 0.6, color: '#fbbf24', text: '🐆-' + finalDamage, big: false });
        } else {
          // Тень-маг — стреляет снарядом
          const tx = best.x - s.x, ty = best.y - s.y;
          const dist = Math.hypot(tx, ty) || 1;
          const spd = 12;
          projectiles.push({
            x: s.x, y: s.y,
            vx: tx / dist * spd,
            vy: ty / dist * spd,
            damage: s.damage,
            aoe: 0,
            color: '#a855f7',
            weaponType: 'staff',
            life: 2, trail: [],
            isCrit: false, isExecute: false, doubleStrike: false,
            isSkill: false,
            owner: { name: s.ownerName, team: s.ownerTeam, isShadow: true },
          });
        }
      }
    }
  }

  // ===== Применение завершённых кастов =====
  const _fighters = [...heroes, ...enemies];
  for (const f of _fighters) {
    if (f && f._pendingCastResult) {
      const res = f._pendingCastResult;
      f._pendingCastResult = null;
      if (applySkillEffect) applySkillEffect(f, res);
    }
  }

  // ===== Собираем убитых (удалить и обработать их будет main.js) =====
  // ===== Собираем убитых =====
  for (const m of enemies) {
    if (m.hp <= 0 && !m.dead) {
      m.dead = true;
      killed.push(m);
      sfxDeath();
      if (logArena) logArena({
        kind: 'death',
        side: (m.team === 'enemy') ? 'opp' : 'me',
        name: m.name,
      });
    }
  }

  const heroDied = heroes.some(h => h.dead);
  if (heroDied && logArena) {
    for (const h of heroes) {
      if (h.dead && !h._deathLogged) {
        h._deathLogged = true;
        logArena({ kind: 'death', side: 'me', name: h.name });
      }
    }
  }

  return { killed, heroDied };
}