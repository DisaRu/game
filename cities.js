// ═══════════════════════════════════════════════════════════════════════
//  cities.js — ГОРОДА, ЗОНЫ И ЛАИРЫ
// ═══════════════════════════════════════════════════════════════════════
//
//  ГДЕ ЧТО ЛЕЖИТ:
//    • Статы и дроп мобов → config.js → MOBS
//    • Статы и дроп боссов → bosses.js → BOSSES
//    • А ЗДЕСЬ: в каком городе какие зоны, в каких секторах
//      какие мобы, сколько их, как часто спавн, кто чемпион.
//
//  СТРУКТУРА:
//    CITIES[cityId].zones[zoneId].lairs[lairId]
//
//  СТАТЫ МОБА = MOBS[id] × mult зоны.
//    Пример: gremlin (hp:40) в зоне mult:1 → 40 HP.
//             gremlin (hp:40) в зоне mult:8 → 320 HP.
//
// ═══════════════════════════════════════════════════════════════════════
//
//  ПОЛЯ ГОРОДА:
//    id / name / sub  — ключ и отображение.
//    grade            — грейд дропа и магазина (ng/d/c/b/a/s).
//    tier             — 1..6, для цены телепорта.
//    bg               — цвет фона канваса.
//
//  ПОЛЯ ЗОНЫ:
//    id / name        — ключ и отображение.
//    diff             — 'easy' | 'medium' | 'hard'. Влияет на % урона моба.
//    mult             — МНОЖИТЕЛЬ всех статов мобов.
//    teleportCost     — цена телепорта в золоте.
//    lairs[]          — секторы зоны (см. ниже).
//
//  ПОЛЯ ЛАИРА (сектора):
//    id / name        — ключ и отображение.
//    cx, cy           — координаты центра на карте (клетки, 0..49).
//    radius           — радиус сектора в клетках.
//    mobs[]           — id мобов из config.js → MOBS.
//                       Может быть пусто [] — тогда лаир только под босса.
//    maxMobs          — сколько мобов одновременно (0 = не спавнить).
//    interval         — секунд между попытками спавна (меньше = чаще).
//    groupChance      — шанс группы 3–5 мобов (0..1).
//    champChance      — шанс чемпиона ⭐ (0..1).
//    aggroRange       — радиус агра (0=пассив, 99=агрится далеко).
//    decor            — визуал в центре: 'campfire'|'bones'|'grass'|'rocks'.
//    bosses[]         — список боссов в этом лаире (опционально):
//                         { id, respawn, offset?, x?, y? }
//                       id      — ключ из bosses.js → BOSSES
//                       respawn — секунд до респавна после смерти
//                       offset  — { x, y } сдвиг от центра (клетки)
//                       x, y    — точные координаты (если offset не задан)
//
// ═══════════════════════════════════════════════════════════════════════

export const CITIES = {

  // ═══════════════════════════════════════════════════════════════════
  //  TALKING ISLAND — стартовый остров (NG, tier 1)
  // ═══════════════════════════════════════════════════════════════════
  talking_island: {
    id:'talking_island', name:'Talking Island', sub:'Стартовый остров',
    grade:'ng', tier:1,
    bg:'#1a2a10', bgImage:'sprites/bg/ground.png',

    zones: [
      // ─── ZONE 1 — Поля Гремлинов (EASY) ─────────────────────────
      { id:'ti_easy', name:'Поля Гремлинов', diff:'easy', mult:1, teleportCost:0,
        lairs: [
          // 1. ПАССИВНЫЙ — для 1-3 уровня
          { id:'ti1_passive', name:'Лужайка гремлинов',
            cx:6, cy:6, radius:5,
            mobs:['gremlin'], maxMobs:30, interval:1.5,
            groupChance:0.15, champChance:0.03, aggroRange:0,
            decor:'grass' },

          // 2. ПАССИВНЫЙ — для 3-6
          { id:'ti1_passive2', name:'Логово кельтиров',
            cx:36, cy:6, radius:5,
            mobs:['keltir'], maxMobs:25, interval:1.8,
            groupChance:0.20, champChance:0.04, aggroRange:0,
            decor:'bones' },

          // 3. НИЗКОЕ АГРО — 4-7
          { id:'ti1_low', name:'Лагерь разбойников',
            cx:6, cy:36, radius:5,
            mobs:['bandit_archer','gremlin'], maxMobs:22, interval:2.0,
            groupChance:0.30, champChance:0.05, aggroRange:4,
            decor:'campfire' },

          // 4. СРЕДНЕЕ АГРО — 6-9
          { id:'ti1_mid', name:'Аутпост гоблинов',
            cx:24, cy:20, radius:6,
            mobs:['goblin_archer','goblin_mage','keltir'], maxMobs:25, interval:1.8,
            groupChance:0.35, champChance:0.06, aggroRange:6,
            decor:'rocks' },

          // 5. СРЕДНЕЕ АГРО — 7-10
          { id:'ti1_mid2', name:'Лагерь магов',
            cx:36, cy:36, radius:5,
            mobs:['goblin_mage'], maxMobs:20, interval:2.2,
            groupChance:0.40, champChance:0.08, aggroRange:7,
            decor:'campfire' },

          // 6. ВЫСОКОЕ АГРО — 9-12 (элита)
          { id:'ti1_high', name:'Волчья яма',
            cx:24, cy:38, radius:5,
            mobs:['direwolf','werewolf'], maxMobs:18, interval:1.8,
            groupChance:0.40, champChance:0.12, aggroRange:10,
            decor:'bones' },

          // 7. БОСС — Король гремлинов
          { id:'ti1_boss', name:'Трон Короля гремлинов',
            cx:24, cy:6, radius:4,
            mobs:['goblin_mage'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99,
            decor:'campfire',
            bosses:[{ id:'gremlin_king', respawn:300 }] },  // 5 мин
        ] },

      // ─── ZONE 2 — Лес Кельтиров (MEDIUM) ────────────────────────
      { id:'ti_medium', name:'Лес Кельтиров', diff:'medium', mult:3, teleportCost:150,
        lairs: [
          // Пассивный
          { id:'ti2_passive', name:'Лесная опушка',
            cx:8, cy:8, radius:5,
            mobs:['direwolf'], maxMobs:22, interval:2.0,
            groupChance:0.20, champChance:0.05, aggroRange:0,
            decor:'grass' },

          // Средние
          { id:'ti2_mid1', name:'Паучье гнездо',
            cx:36, cy:10, radius:5,
            mobs:['forest_spider','direwolf'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.08, aggroRange:6,
            decor:'bones' },

          { id:'ti2_mid2', name:'Лесная чаща',
            cx:22, cy:22, radius:6,
            mobs:['forest_spider','werewolf'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7,
            decor:'grass' },

          { id:'ti2_mid3', name:'Волчья тропа',
            cx:10, cy:38, radius:5,
            mobs:['werewolf','direwolf'], maxMobs:20, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:8,
            decor:'bones' },

          // Высокое агро
          { id:'ti2_high', name:'Проклятая поляна',
            cx:38, cy:38, radius:5,
            mobs:['werewolf'], maxMobs:18, interval:1.6,
            groupChance:0.45, champChance:0.14, aggroRange:11,
            decor:'rocks' },

          // Элита
          { id:'ti2_elite', name:'Логово вожака',
            cx:38, cy:22, radius:4,
            mobs:['werewolf','stone_golem'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.20, aggroRange:99,
            decor:'bones' },

          // 2 БОССА
          { id:'ti2_boss1', name:'Алтарь кельтиров',
            cx:6, cy:22, radius:4,
            mobs:['direwolf'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99,
            decor:'campfire',
            bosses:[{ id:'keltir_alpha', respawn:480 }] },  // 8 мин

          { id:'ti2_boss2', name:'Забытый храм',
            cx:22, cy:6, radius:4,
            mobs:['stone_golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99,
            decor:'rocks',
            bosses:[{ id:'stone_golem_king', respawn:720 }] },  // 12 мин
        ] },

      // ─── ZONE 3 — Пещера Оборотней (HARD) ────────────────────────
      { id:'ti_hard', name:'Пещера Оборотней', diff:'hard', mult:8, teleportCost:400,
        lairs: [
          // Пассивный — летучие мыши
          { id:'ti3_passive', name:'Вход в пещеру',
            cx:8, cy:8, radius:5,
            mobs:['cave_bat'], maxMobs:22, interval:1.5,
            groupChance:0.20, champChance:0.06, aggroRange:0,
            decor:'rocks' },

          // Средние
          { id:'ti3_mid1', name:'Костяной зал',
            cx:36, cy:10, radius:6,
            mobs:['cave_bat','stone_golem'], maxMobs:22, interval:1.5,
            groupChance:0.40, champChance:0.10, aggroRange:7,
            decor:'bones' },

          { id:'ti3_mid2', name:'Тёмный туннель',
            cx:22, cy:22, radius:5,
            mobs:['werewolf','stone_golem'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.12, aggroRange:8,
            decor:'rocks' },

          // Высокое агро
          { id:'ti3_high1', name:'Подземное озеро',
            cx:8, cy:38, radius:6,
            mobs:['cave_bat','stone_golem'], maxMobs:20, interval:1.5,
            groupChance:0.45, champChance:0.14, aggroRange:11,
            decor:'rocks' },

          { id:'ti3_high2', name:'Кровавый зал',
            cx:38, cy:38, radius:5,
            mobs:['werewolf','stone_golem'], maxMobs:18, interval:1.5,
            groupChance:0.45, champChance:0.16, aggroRange:12,
            decor:'bones' },

          // Элита — очень опасно
          { id:'ti3_elite', name:'Алтарь оборотней',
            cx:38, cy:22, radius:4,
            mobs:['stone_golem'], maxMobs:12, interval:1.8,
            groupChance:0.30, champChance:0.25, aggroRange:99,
            decor:'campfire' },

          // 2 БОССА
          { id:'ti3_boss1', name:'Логово тролля',
            cx:8, cy:22, radius:4,
            mobs:['werewolf'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99,
            decor:'campfire',
            bosses:[{ id:'troll_chief', respawn:900 }] },  // 15 мин

          { id:'ti3_boss2', name:'Сердце пещеры',
            cx:22, cy:38, radius:5,
            mobs:['stone_golem'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99,
            decor:'bones',
            bosses:[{ id:'cave_lord', respawn:1200 }] },  // 20 мин
        ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  GIRAN — портовый город (D, tier 2)
  // ═══════════════════════════════════════════════════════════════════
  giran: {
    id:'giran', name:'Giran', sub:'Портовый город',
    grade:'d', tier:2,
    bg:'#0f1a2a', bgImage:'sprites/bg/grass.png',

    zones: [
      { id:'gi_easy', name:'Порт', diff:'easy', mult:6, teleportCost:100,
        lairs: [
          { id:'gi1_passive', name:'Пустой склад',
            cx:8, cy:8, radius:5,
            mobs:['orc'], maxMobs:25, interval:1.8,
            groupChance:0.15, champChance:0.05, aggroRange:0, decor:'campfire' },

          { id:'gi1_low', name:'Доки',
            cx:36, cy:10, radius:5,
            mobs:['orc','skeleton'], maxMobs:22, interval:2.0,
            groupChance:0.25, champChance:0.06, aggroRange:4, decor:'rocks' },

          { id:'gi1_mid', name:'Причал',
            cx:10, cy:36, radius:5,
            mobs:['skeleton','orc_archer'], maxMobs:20, interval:1.8,
            groupChance:0.30, champChance:0.08, aggroRange:6, decor:'grass' },

          { id:'gi1_high', name:'Заброшенный корабль',
            cx:38, cy:36, radius:5,
            mobs:['skeleton_archer','skeleton'], maxMobs:18, interval:1.8,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'gi1_elite', name:'Капитанский мостик',
            cx:24, cy:22, radius:4,
            mobs:['orc'], maxMobs:10, interval:2.5,
            groupChance:0.30, champChance:0.20, aggroRange:99, decor:'campfire' },

          { id:'gi1_boss', name:'Логово капитана',
            cx:24, cy:6, radius:4,
            mobs:['orc'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'pirate_captain', respawn:600 }] },
        ] },

      { id:'gi_medium', name:'Болото', diff:'medium', mult:18, teleportCost:300,
        lairs: [
          { id:'gi2_passive', name:'Тихие топи',
            cx:8, cy:8, radius:5,
            mobs:['spider'], maxMobs:22, interval:2.0,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'grass' },

          { id:'gi2_mid1', name:'Гнилой пень',
            cx:36, cy:10, radius:5,
            mobs:['spider','skeleton'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7, decor:'grass' },

          { id:'gi2_mid2', name:'Затонувшая лодка',
            cx:22, cy:22, radius:6,
            mobs:['skeleton_archer','spider'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:8, decor:'rocks' },

          { id:'gi2_high', name:'Ведьмина яма',
            cx:10, cy:36, radius:5,
            mobs:['orc_shaman','spider'], maxMobs:18, interval:1.8,
            groupChance:0.40, champChance:0.14, aggroRange:11, decor:'bones' },

          { id:'gi2_elite', name:'Алтарь трясины',
            cx:36, cy:36, radius:4,
            mobs:['orc_shaman'], maxMobs:10, interval:2.5,
            groupChance:0.30, champChance:0.22, aggroRange:99, decor:'campfire' },

          { id:'gi2_boss1', name:'Логово ведьмы',
            cx:24, cy:6, radius:4,
            mobs:['spider'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'swamp_witch', respawn:720 }] },

          { id:'gi2_boss2', name:'Тёмный пруд',
            cx:24, cy:38, radius:4,
            mobs:['orc_shaman'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'orc_warlord', respawn:1080 }] },
        ] },

      { id:'gi_hard', name:'Руины', diff:'hard', mult:45, teleportCost:800,
        lairs: [
          { id:'gi3_passive', name:'Внешние стены',
            cx:8, cy:8, radius:5,
            mobs:['skeleton'], maxMobs:22, interval:1.6,
            groupChance:0.20, champChance:0.08, aggroRange:0, decor:'rocks' },

          { id:'gi3_mid1', name:'Внутренний двор',
            cx:36, cy:10, radius:6,
            mobs:['ghost','golem'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:7, decor:'bones' },

          { id:'gi3_mid2', name:'Подвал',
            cx:22, cy:22, radius:5,
            mobs:['golem'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:8, decor:'rocks' },

          { id:'gi3_high1', name:'Разрушенный алтарь',
            cx:8, cy:36, radius:5,
            mobs:['ghost','golem'], maxMobs:18, interval:1.5,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'bones' },

          { id:'gi3_high2', name:'Тронный зал',
            cx:36, cy:36, radius:5,
            mobs:['ghost','golem'], maxMobs:20, interval:1.5,
            groupChance:0.40, champChance:0.16, aggroRange:12, decor:'campfire' },

          { id:'gi3_elite', name:'Катакомбы',
            cx:22, cy:6, radius:4,
            mobs:['ghost'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.25, aggroRange:99, decor:'bones' },

          { id:'gi3_boss1', name:'Проклятый склеп',
            cx:22, cy:38, radius:4,
            mobs:['skeleton_lord'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'skeleton_lord_boss', respawn:900 }] },

          { id:'gi3_boss2', name:'Сердце руин',
            cx:8, cy:22, radius:5,
            mobs:['golem'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'stone_colossus', respawn:1500 }] },
        ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  DION — поля и фермы (C, tier 3)
  // ═══════════════════════════════════════════════════════════════════
  dion: {
    id:'dion', name:'Dion', sub:'Поля и фермы',
    grade:'c', tier:3,
    bg:'#2a1a10',

    zones: [
      { id:'di_easy', name:'Фермы', diff:'easy', mult:30, teleportCost:150,
        lairs: [
          { id:'di1_passive', name:'Пастбище',
            cx:8, cy:8, radius:5,
            mobs:['warg'], maxMobs:25, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'grass' },
          { id:'di1_mid', name:'Амбары',
            cx:36, cy:10, radius:5,
            mobs:['spider','warg'], maxMobs:22, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:6, decor:'grass' },
          { id:'di1_high', name:'Овин',
            cx:10, cy:36, radius:5,
            mobs:['wraith','spider'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.12, aggroRange:9, decor:'bones' },
          { id:'di1_elite', name:'Мельница',
            cx:36, cy:36, radius:4,
            mobs:['wraith'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.22, aggroRange:99, decor:'rocks' },
          { id:'di1_boss', name:'Дом старосты',
            cx:22, cy:22, radius:4,
            mobs:['warg'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'farm_lord', respawn:600 }] },
        ] },

      { id:'di_medium', name:'Поля', diff:'medium', mult:80, teleportCost:450,
        lairs: [
          { id:'di2_passive', name:'Тихие поля',
            cx:8, cy:8, radius:5,
            mobs:['warg'], maxMobs:22, interval:2.0,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'grass' },
          { id:'di2_mid', name:'Перекрёсток',
            cx:36, cy:10, radius:5,
            mobs:['ghost','warg'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7, decor:'rocks' },
          { id:'di2_high', name:'Заброшенная мельница',
            cx:8, cy:36, radius:5,
            mobs:['wraith','ghost'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.14, aggroRange:10, decor:'bones' },
          { id:'di2_elite', name:'Развалины',
            cx:36, cy:36, radius:4,
            mobs:['wraith'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.24, aggroRange:99, decor:'rocks' },
          { id:'di2_boss1', name:'Подземный ход',
            cx:22, cy:6, radius:4,
            mobs:['ghost'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'ghost_king', respawn:720 }] },
          { id:'di2_boss2', name:'Древний курган',
            cx:22, cy:38, radius:4,
            mobs:['wraith'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'wraith_lord', respawn:1080 }] },
        ] },

      { id:'di_hard', name:'Паучье логово', diff:'hard', mult:200, teleportCost:1200,
        lairs: [
          { id:'di3_passive', name:'Вход',
            cx:8, cy:8, radius:5,
            mobs:['spider'], maxMobs:22, interval:1.6,
            groupChance:0.25, champChance:0.08, aggroRange:0, decor:'rocks' },
          { id:'di3_mid', name:'Коконы',
            cx:36, cy:10, radius:6,
            mobs:['spider','treant'], maxMobs:22, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:7, decor:'bones' },
          { id:'di3_high1', name:'Глубина',
            cx:22, cy:22, radius:5,
            mobs:['treant','spider'], maxMobs:20, interval:1.5,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'rocks' },
          { id:'di3_high2', name:'Тёмный туннель',
            cx:8, cy:36, radius:5,
            mobs:['treant','ghost'], maxMobs:18, interval:1.6,
            groupChance:0.45, champChance:0.16, aggroRange:12, decor:'bones' },
          { id:'di3_elite', name:'Кристальный зал',
            cx:36, cy:36, radius:4,
            mobs:['treant'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.26, aggroRange:99, decor:'campfire' },
          { id:'di3_boss1', name:'Логово матки',
            cx:22, cy:6, radius:4,
            mobs:['spider'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'spider_queen', respawn:1200 }] },
          { id:'di3_boss2', name:'Корни мирового древа',
            cx:22, cy:38, radius:5,
            mobs:['treant'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'elder_treant', respawn:1500 }] },
        ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  OREN — лес и руины (B, tier 4)
  // ═══════════════════════════════════════════════════════════════════
  oren: {
    id:'oren', name:'Oren', sub:'Лес и руины',
    grade:'b', tier:4,
    bg:'#1a0f2a',

    zones: [
      { id:'or_easy', name:'Тёмный лес', diff:'easy', mult:150, teleportCost:200,
        lairs: [
          { id:'or1_passive', name:'Поляна',
            cx:8, cy:8, radius:5,
            mobs:['ghost'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'grass' },
          { id:'or1_mid', name:'Гуща',
            cx:36, cy:10, radius:6,
            mobs:['ghost','golem'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7, decor:'grass' },
          { id:'or1_high', name:'Чаща',
            cx:8, cy:36, radius:5,
            mobs:['nightshade','golem'], maxMobs:18, interval:1.6,
            groupChance:0.40, champChance:0.14, aggroRange:10, decor:'rocks' },
          { id:'or1_elite', name:'Логово тени',
            cx:36, cy:36, radius:4,
            mobs:['nightshade'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.24, aggroRange:99, decor:'bones' },
          { id:'or1_boss', name:'Тёмный трон',
            cx:22, cy:22, radius:4,
            mobs:['ghost'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'forest_shade', respawn:720 }] },
        ] },

      { id:'or_medium', name:'Древние руины', diff:'medium', mult:400, teleportCost:600,
        lairs: [
          { id:'or2_passive', name:'Колоннада',
            cx:8, cy:8, radius:5,
            mobs:['ghost'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'rocks' },
          { id:'or2_mid', name:'Внутренний храм',
            cx:36, cy:10, radius:6,
            mobs:['demon','ghost'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:7, decor:'bones' },
          { id:'or2_high', name:'Подземелье',
            cx:8, cy:36, radius:5,
            mobs:['demon','nightshade'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'campfire' },
          { id:'or2_elite', name:'Разбитый алтарь',
            cx:36, cy:36, radius:4,
            mobs:['demon'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.26, aggroRange:99, decor:'bones' },
          { id:'or2_boss1', name:'Забытый склеп',
            cx:22, cy:6, radius:4,
            mobs:['demon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'fallen_priest', respawn:900 }] },
          { id:'or2_boss2', name:'Проклятый трон',
            cx:22, cy:38, radius:5,
            mobs:['demon'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'demon_general', respawn:1200 }] },
        ] },

      { id:'or_hard', name:'Шахта големов', diff:'hard', mult:1000, teleportCost:1500,
        lairs: [
          { id:'or3_passive', name:'Штольня',
            cx:8, cy:8, radius:5,
            mobs:['golem'], maxMobs:22, interval:1.6,
            groupChance:0.25, champChance:0.08, aggroRange:0, decor:'rocks' },
          { id:'or3_mid', name:'Кристальный зал',
            cx:36, cy:10, radius:6,
            mobs:['golem','medusa'], maxMobs:22, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:7, decor:'campfire' },
          { id:'or3_high1', name:'Забой',
            cx:22, cy:22, radius:5,
            mobs:['medusa','golem'], maxMobs:20, interval:1.5,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'rocks' },
          { id:'or3_high2', name:'Дно шахты',
            cx:8, cy:36, radius:5,
            mobs:['medusa','demon'], maxMobs:20, interval:1.6,
            groupChance:0.45, champChance:0.16, aggroRange:12, decor:'bones' },
          { id:'or3_elite', name:'Сокровищница',
            cx:36, cy:36, radius:4,
            mobs:['medusa'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.28, aggroRange:99, decor:'campfire' },
          { id:'or3_boss1', name:'Сердце шахты',
            cx:22, cy:6, radius:4,
            mobs:['golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'rocks',
            bosses:[{ id:'iron_colossus', respawn:1200 }] },
          { id:'or3_boss2', name:'Логово медузы',
            cx:22, cy:38, radius:5,
            mobs:['medusa'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'medusa_queen', respawn:1500 }] },
        ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  ADEN — столица (A, tier 5)
  // ═══════════════════════════════════════════════════════════════════
  aden: {
    id:'aden', name:'Aden', sub:'Столица',
    grade:'a', tier:5,
    bg:'#2a0a0a',

    zones: [
      { id:'ad_easy', name:'Предместья', diff:'easy', mult:800, teleportCost:300,
        lairs: [
          { id:'ad1_passive', name:'Дозорная башня',
            cx:8, cy:8, radius:5,
            mobs:['demon'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'rocks' },
          { id:'ad1_mid', name:'Караванный путь',
            cx:36, cy:10, radius:6,
            mobs:['demon','drake_rider'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7, decor:'grass' },
          { id:'ad1_high', name:'Разрушенный мост',
            cx:8, cy:36, radius:5,
            mobs:['drake_rider','wyvern'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.14, aggroRange:10, decor:'bones' },
          { id:'ad1_elite', name:'Осадный лагерь',
            cx:36, cy:36, radius:4,
            mobs:['wyvern'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.24, aggroRange:99, decor:'campfire' },
          { id:'ad1_boss', name:'Командный пункт',
            cx:22, cy:22, radius:4,
            mobs:['demon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'siege_captain', respawn:900 }] },
        ] },

      { id:'ad_medium', name:'Столичные поля', diff:'medium', mult:2000, teleportCost:800,
        lairs: [
          { id:'ad2_passive', name:'Императорский тракт',
            cx:8, cy:8, radius:5,
            mobs:['drake_rider'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'rocks' },
          { id:'ad2_mid', name:'Пшеничные поля',
            cx:36, cy:10, radius:6,
            mobs:['wyvern','drake_rider'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:7, decor:'grass' },
          { id:'ad2_high', name:'Крепость',
            cx:8, cy:36, radius:5,
            mobs:['wyvern','fire_djinn'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'rocks' },
          { id:'ad2_elite', name:'Забытый лагерь',
            cx:36, cy:36, radius:4,
            mobs:['fire_djinn'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.26, aggroRange:99, decor:'bones' },
          { id:'ad2_boss1', name:'Главный лагерь',
            cx:22, cy:6, radius:4,
            mobs:['wyvern'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'wyvern_king', respawn:1080 }] },
          { id:'ad2_boss2', name:'Дворец джинна',
            cx:22, cy:38, radius:5,
            mobs:['fire_djinn'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'djinn_sultan', respawn:1500 }] },
        ] },

      { id:'ad_hard', name:'Драконье логово', diff:'hard', mult:5000, teleportCost:2000,
        lairs: [
          { id:'ad3_passive', name:'Пепелище',
            cx:8, cy:8, radius:5,
            mobs:['dragon'], maxMobs:22, interval:1.6,
            groupChance:0.25, champChance:0.08, aggroRange:0, decor:'rocks' },
          { id:'ad3_mid', name:'Кости драконов',
            cx:36, cy:10, radius:6,
            mobs:['dragon','dark_angel'], maxMobs:22, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:7, decor:'bones' },
          { id:'ad3_high1', name:'Гнездо',
            cx:22, cy:22, radius:5,
            mobs:['dark_angel','dragon'], maxMobs:20, interval:1.5,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'campfire' },
          { id:'ad3_high2', name:'Сокровищница',
            cx:8, cy:36, radius:5,
            mobs:['dark_angel','titan'], maxMobs:20, interval:1.6,
            groupChance:0.45, champChance:0.16, aggroRange:12, decor:'campfire' },
          { id:'ad3_elite', name:'Титанический зал',
            cx:36, cy:36, radius:4,
            mobs:['titan'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.28, aggroRange:99, decor:'rocks' },
          { id:'ad3_boss1', name:'Логово тирана',
            cx:22, cy:6, radius:4,
            mobs:['dragon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'dragon_tyrant', respawn:1500 }] },
          { id:'ad3_boss2', name:'Тёмный трон',
            cx:22, cy:38, radius:5,
            mobs:['dark_angel'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'dark_archangel', respawn:1800 }] },
        ] },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  //  GODDARD — ледяные земли (S, tier 6)
  // ═══════════════════════════════════════════════════════════════════
  goddard: {
    id:'goddard', name:'Goddard', sub:'Ледяные земли',
    grade:'s', tier:6,
    bg:'#0a1a2a',

    zones: [
      { id:'gd_easy', name:'Ледяные поля', diff:'easy', mult:4000, teleportCost:500,
        lairs: [
          { id:'gd1_passive', name:'Замёрзшее озеро',
            cx:8, cy:8, radius:5,
            mobs:['ice_golem'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'rocks' },
          { id:'gd1_mid', name:'Ледяной лес',
            cx:36, cy:10, radius:6,
            mobs:['ice_golem','frost_wolf'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:7, decor:'rocks' },
          { id:'gd1_high', name:'Снежная буря',
            cx:8, cy:36, radius:5,
            mobs:['frost_wolf','archdemon'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.14, aggroRange:10, decor:'bones' },
          { id:'gd1_elite', name:'Ледяной трон',
            cx:36, cy:36, radius:4,
            mobs:['archdemon'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.24, aggroRange:99, decor:'campfire' },
          { id:'gd1_boss', name:'Замок зимы',
            cx:22, cy:22, radius:4,
            mobs:['ice_golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'frost_titan', respawn:1200 }] },
        ] },

      { id:'gd_medium', name:'Замёрзшие руины', diff:'medium', mult:10000, teleportCost:1500,
        lairs: [
          { id:'gd2_passive', name:'Ледяной храм',
            cx:8, cy:8, radius:5,
            mobs:['ice_golem'], maxMobs:22, interval:1.8,
            groupChance:0.20, champChance:0.06, aggroRange:0, decor:'rocks' },
          { id:'gd2_mid', name:'Проклятый зал',
            cx:36, cy:10, radius:6,
            mobs:['archdemon','fallen_angel'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:7, decor:'bones' },
          { id:'gd2_high', name:'Подлёдный туннель',
            cx:8, cy:36, radius:5,
            mobs:['fallen_angel','archdemon'], maxMobs:20, interval:1.6,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'rocks' },
          { id:'gd2_elite', name:'Кристальный сад',
            cx:36, cy:36, radius:4,
            mobs:['fallen_angel'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.26, aggroRange:99, decor:'rocks' },
          { id:'gd2_boss1', name:'Проклятый трон',
            cx:22, cy:6, radius:4,
            mobs:['archdemon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'fallen_archangel', respawn:1500 }] },
          { id:'gd2_boss2', name:'Сердце зимы',
            cx:22, cy:38, radius:5,
            mobs:['fallen_angel'], maxMobs:10, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'winter_queen', respawn:1800 }] },
        ] },

      { id:'gd_hard', name:'Логово архидемонов', diff:'hard', mult:25000, teleportCost:4000,
        lairs: [
          { id:'gd3_passive', name:'Врата ада',
            cx:8, cy:8, radius:5,
            mobs:['archdemon'], maxMobs:22, interval:1.6,
            groupChance:0.25, champChance:0.08, aggroRange:0, decor:'campfire' },
          { id:'gd3_mid', name:'Тронный зал',
            cx:36, cy:10, radius:6,
            mobs:['archdemon','void_walker'], maxMobs:22, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:7, decor:'bones' },
          { id:'gd3_high1', name:'Пыточная',
            cx:22, cy:22, radius:5,
            mobs:['void_walker','archdemon'], maxMobs:20, interval:1.5,
            groupChance:0.40, champChance:0.15, aggroRange:10, decor:'bones' },
          { id:'gd3_high2', name:'Костяной зал',
            cx:8, cy:36, radius:5,
            mobs:['void_walker','frost_dragon'], maxMobs:20, interval:1.6,
            groupChance:0.45, champChance:0.16, aggroRange:12, decor:'bones' },
          { id:'gd3_elite', name:'Зал бездны',
            cx:36, cy:36, radius:4,
            mobs:['void_walker'], maxMobs:12, interval:2.0,
            groupChance:0.30, champChance:0.28, aggroRange:99, decor:'campfire' },
          { id:'gd3_boss1', name:'Сердце бездны',
            cx:22, cy:6, radius:4,
            mobs:['frost_dragon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'bones',
            bosses:[{ id:'frost_dragon_boss', respawn:1800 }] },
          { id:'gd3_boss2', name:'Тёмная бездна',
            cx:22, cy:38, radius:5,
            mobs:['void_walker'], maxMobs:12, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:99, decor:'campfire',
            bosses:[{ id:'void_lord', respawn:2400 }] },
        ] },
    ],
  },
};

// ─── Вспомогательные (не трогаем) ────────────────────────────────
export const CITY_ORDER = ['talking_island','giran','dion','oren','aden','goddard'];

export function cityTeleportCost(fromTier, toTier) {
  const diff = Math.abs(fromTier - toTier);
  if (diff === 0) return 0;
  return [0, 200, 500, 1200, 3000, 7500][diff] || 10000;
}

export function findZone(cityId, zoneId) {
  const city = CITIES[cityId];
  if (!city) return null;
  return city.zones.find(z => z.id === zoneId);
}

export function zoneDifficultyLabel(diff) {
  if (diff === 'easy')   return '🟢 Лёгкая';
  if (diff === 'medium') return '🟡 Средняя';
  return '🔴 Сложная';
}