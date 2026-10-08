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

  // ═════════════════════════════════════════════════════════════════════
  //  TALKING ISLAND — стартовый остров (NG-грейд, tier 1)
  // ═════════════════════════════════════════════════════════════════════
  //  Для героя 1–10 уровня. Мобы слабые, дроп базовый.
  //  Три зоны по сложности: easy → medium → hard.
  //  В easy-зоне один босс — Король гремлинов.
  // ═════════════════════════════════════════════════════════════════════
  talking_island: {
    id: 'talking_island',
    name: 'Talking Island',
    sub: 'Стартовый остров',
    grade: 'ng',                     // грейд магазина и дропа
    tier: 1,
    bg: '#1a2a10',                   // цвет фона
    bgImage: 'sprites/bg/ground.png',

    zones: [

      // ═══════════════════════════════════════════════════════════════
      //  ЗОНА 1 — Поля Гремлинов (ЛЁГКАЯ)
      // ═══════════════════════════════════════════════════════════════
      //  mult: 1 → мобы со стандартными статами.
      //  Для героя 1–5 уровня. Тут 6 секторов с разными мобами.
      // ═══════════════════════════════════════════════════════════════
      {
        id: 'ti_easy',
        name: 'Поля Гремлинов',
        diff: 'easy',
        mult: 1,                      // базовый множитель статов мобов
        teleportCost: 50,             // цена телепорта сюда

        lairs: [
          // ─── Сектор 1: лагерь гремлинов ─────────────────────────
          //  Плотный стартовый сектор: гремлины и кельтиры.
          //  Много мобов, быстрый респавн, низкий шанс чемпиона.
          { id: 'gremlin_camp',
            name: 'Лагерь гремлинов',
            cx: 8, cy: 8,                 // левый верхний угол карты
            radius: 5,                     // сектор 5 клеток радиусом

            mobs: ['gremlin', 'keltir'],   // кто спавнится (из MOBS)
            maxMobs: 18,                   // максимум одновременно
            interval: 1.8,                 // попытка спавна раз в 1.8 сек
            groupChance: 0.20,             // 20% шанс группы 3-5 мобов
            champChance: 0.05,             // 5% шанс чемпиона ⭐
            aggroRange: 7,                 // агрится с 7 клеток

            decor: 'campfire',             // 🔥 костёр в центре
          },

          // ─── Сектор 2: логово кельтиров ─────────────────────────
          //  Чуть опаснее: только кельтиры, повыше шанс чемпиона.
          { id: 'keltir_den',
            name: 'Логово кельтиров',
            cx: 22, cy: 10, radius: 5,

            mobs: ['keltir'],
            maxMobs: 15,
            interval: 2.2,
            groupChance: 0.30,             // чаще группы
            champChance: 0.06,
            aggroRange: 8,

            decor: 'grass',                // 🌿 трава
          },

          // ─── Сектор 3: волчья яма ───────────────────────────────
          //  Опасный сектор: оборотни + кельтиры. Много чемпионов.
          //  Также пример боссового сектора — тут сидит gremlin_king.
          { id: 'werewolf_lair',
            name: 'Волчья яма',
            cx: 40, cy: 12, radius: 6,

            mobs: ['werewolf', 'keltir'],
            maxMobs: 20,
            interval: 2.0,
            groupChance: 0.40,             // 40% групп
            champChance: 0.10,             // 10% чемпионов
            aggroRange: 9,

            decor: 'bones',                // 💀 кости

            // ── БОССОВЫЙ СЕКТОР ──
            //  Раз в 5 минут возрождается Король гремлинов.
            //  Охрана берётся из bosses.js → BOSSES.gremlin_king.guards.
            bosses: [
              { id: 'gremlin_king',        // ключ из bosses.js
                respawn: 5 },            // 5 минут = 300 сек
            ],
          },

          // ─── Сектор 4: поляна охотников ─────────────────────────
          //  Смешанный сектор: гремлины + оборотни, средние шансы.
          { id: 'center_glade',
            name: 'Поляна охотников',
            cx: 25, cy: 25, radius: 5,

            mobs: ['gremlin', 'werewolf'],
            maxMobs: 15,
            interval: 2.2,
            groupChance: 0.25,
            champChance: 0.08,
            aggroRange: 8,

            decor: 'grass',
          },

          // ─── Сектор 5: южный лагерь ────────────────────────────
          //  Оборотни + големы (потом пригодятся для medium зоны).
          //  Пример где большие интервалы — медленный респавн.
          { id: 'south_camp',
            name: 'Южный лагерь',
            cx: 15, cy: 40, radius: 5,

            mobs: ['werewolf', 'keltir'],
            maxMobs: 15,
            interval: 2.0,
            groupChance: 0.35,
            champChance: 0.10,
            aggroRange: 9,

            decor: 'rocks',                // 🪨 камни
          },

          // ─── Сектор 6: сектор с РЕЙНДЖ-мобом ────────────────────
          //  Пример: гоблины-лучники. Стреляют с 7 клеток, отходят.
          //  Отдельный сектор — чтобы протестировать дальний бой.
          { id: 'goblin_outpost',
            name: 'Аутпост гоблинов',
            cx: 42, cy: 25, radius: 5,

            mobs: ['goblin_archer', 'gremlin'],  // рейндж + мили вперемешку
            maxMobs: 12,
            interval: 2.5,
            groupChance: 0.40,                   // часто группами (опасно)
            champChance: 0.08,
            aggroRange: 9,

            decor: 'rocks',
          },
                    // ─── Сектор 7: лагерь лучников ──────────────────────────
          //  Рейндж-мобы: стреляют издалека, отходят при подходе.
          //  Опасен для мили-героя: подойти сложно.
          { id: 'archer_camp',
            name: 'Лагерь лучников',
            cx: 12, cy: 25, radius: 5,

            mobs: ['bandit_archer'],        // только лучники
            maxMobs: 10,                    // немного — они опасные
            interval: 3.0,                  // медленный респавн
            groupChance: 0.5,               // 50% — стреляют залпами
            champChance: 0.06,
            aggroRange: 10,                 // агрятся издалека (дальний бой)

            decor: 'rocks',                 // 🪨 камни
          },

          // ─── Сектор 8: лагерь магов ────────────────────────────
          //  Рейндж-мобы: стреляют магией, стоят на месте.
          //  Плотнее и опаснее — маги не отходят, держат позицию.
          { id: 'mage_camp',
            name: 'Лагерь магов',
            cx: 8, cy: 35, radius: 5,

            mobs: ['goblin_mage', 'gremlin'],  // маги + мелкие мили-помощники
            maxMobs: 12,
            interval: 2.5,
            groupChance: 0.4,                  // группы магов
            champChance: 0.08,
            aggroRange: 9,

            decor: 'campfire',                 // 🔥 магический костёр
          },
        ],
        
      },

      // ═══════════════════════════════════════════════════════════════
      //  ЗОНА 2 — Лес Кельтиров (СРЕДНЯЯ)
      // ═══════════════════════════════════════════════════════════════
      //  mult: 3 → мобы ×3 по статам. Для героя 5–10 уровня.
      //  Пока можешь оставить как было — заполним в следующий раз.
      // ═══════════════════════════════════════════════════════════════
      {
        id: 'ti_medium',
        name: 'Лес Кельтиров',
        diff: 'medium',
        mult: 3,
        teleportCost: 150,
        lairs: [
          // ... секторы заполним отдельно ...
        ],
      },

      // ═══════════════════════════════════════════════════════════════
      //  ЗОНА 3 — Пещера Оборотней (СЛОЖНАЯ)
      // ═══════════════════════════════════════════════════════════════
      //  mult: 8 → мобы ×8. Для героя 8–15 уровня.
      // ═══════════════════════════════════════════════════════════════
      {
        id: 'ti_hard',
        name: 'Пещера Оборотней',
        diff: 'hard',
        mult: 8,
        teleportCost: 400,
        lairs: [
          // ... секторы заполним отдельно ...
        ],
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ГЛАВА 2. GIRAN — портовый город, D-грейд, tier 2
  // ═════════════════════════════════════════════════════════════════════
  giran: {
    id:'giran', name:'Giran', sub:'Портовый город',
    grade:'d', tier:2,
    bg:'#0f1a2a', bgImage:'sprites/bg/grass.png',

    zones: [

      // ─── Зона 2.1 — Порт (лёгкая, mult:6) ─────────────────────────
      { id:'gi_easy', name:'Порт', diff:'easy', mult:6,
        teleportCost:100,
        lairs: [
          { id:'gi_port_1', name:'Доки',
            cx:10, cy:10, radius:5,
            mobs:['orc','skeleton'], maxMobs:18, interval:2.0,
            groupChance:0.20, champChance:0.05, aggroRange:7, decor:'campfire' },

          { id:'gi_port_2', name:'Склад',
            cx:38, cy:12, radius:5,
            mobs:['orc'], maxMobs:15, interval:2.2,
            groupChance:0.30, champChance:0.06, aggroRange:8, decor:'bones' },

          { id:'gi_port_3', name:'Причал',
            cx:12, cy:38, radius:5,
            mobs:['skeleton','orc'], maxMobs:15, interval:2.0,
            groupChance:0.25, champChance:0.08, aggroRange:8, decor:'grass' },

          { id:'gi_boss_1', name:'Капитанский мостик',
            cx:40, cy:42, radius:4,
            mobs:['orc'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'d', bossRespawn:300 },
        ] },

      // ─── Зона 2.2 — Болото (средняя, mult:18) ─────────────────────
      { id:'gi_medium', name:'Болото', diff:'medium', mult:18,
        teleportCost:300,
        lairs: [
          { id:'gi_sw_1', name:'Топи',
            cx:8, cy:15, radius:6,
            mobs:['skeleton','spider'], maxMobs:20, interval:1.8,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'bones' },

          { id:'gi_sw_2', name:'Гнилой пень',
            cx:25, cy:8, radius:5,
            mobs:['spider'], maxMobs:18, interval:2.0,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'grass' },

          { id:'gi_sw_3', name:'Затонувшая лодка',
            cx:42, cy:25, radius:6,
            mobs:['skeleton','spider'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'gi_sw_4', name:'Ведьмина яма',
            cx:15, cy:40, radius:5,
            mobs:['spider'], maxMobs:18, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'bones' },

          { id:'gi_boss_2', name:'Логово трясины',
            cx:40, cy:42, radius:5,
            mobs:['spider'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'bones',
            boss:'d', bossRespawn:360 },
        ] },

      // ─── Зона 2.3 — Руины (сложная, mult:45) ──────────────────────
      { id:'gi_hard', name:'Руины', diff:'hard', mult:45,
        teleportCost:800,
        lairs: [
          { id:'gi_ru_1', name:'Внешние стены',
            cx:10, cy:10, radius:6,
            mobs:['ghost','golem'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'rocks' },

          { id:'gi_ru_2', name:'Внутренний двор',
            cx:25, cy:25, radius:6,
            mobs:['ghost','golem'], maxMobs:25, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'gi_ru_3', name:'Подвал',
            cx:40, cy:15, radius:5,
            mobs:['golem'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'gi_ru_4', name:'Разрушенный алтарь',
            cx:15, cy:40, radius:5,
            mobs:['ghost','golem'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'bones' },

          { id:'gi_boss_3', name:'Тронный зал',
            cx:42, cy:42, radius:5,
            mobs:['golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'c', bossRespawn:420 },
        ] },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ГЛАВА 3. DION — поля и фермы, C-грейд, tier 3
  // ═════════════════════════════════════════════════════════════════════
  dion: {
    id:'dion', name:'Dion', sub:'Поля и фермы',
    grade:'c', tier:3,
    bg:'#2a1a10',

    zones: [

      // ─── Зона 3.1 — Фермы (лёгкая, mult:30) ───────────────────────
      { id:'di_easy', name:'Фермы', diff:'easy', mult:30,
        teleportCost:150,
        lairs: [
          { id:'di_fm_1', name:'Амбары',
            cx:10, cy:12, radius:5,
            mobs:['spider','warg'], maxMobs:18, interval:2.0,
            groupChance:0.25, champChance:0.06, aggroRange:7, decor:'grass' },

          { id:'di_fm_2', name:'Пастбище',
            cx:38, cy:15, radius:6,
            mobs:['warg'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.08, aggroRange:8, decor:'grass' },

          { id:'di_fm_3', name:'Овин',
            cx:15, cy:38, radius:5,
            mobs:['spider','warg'], maxMobs:18, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'bones' },

          { id:'di_boss_1', name:'Дом старосты',
            cx:40, cy:40, radius:4,
            mobs:['warg'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'c', bossRespawn:360 },
        ] },

      // ─── Зона 3.2 — Поля (средняя, mult:80) ───────────────────────
      { id:'di_medium', name:'Поля', diff:'medium', mult:80,
        teleportCost:450,
        lairs: [
          { id:'di_pf_1', name:'Пшеничные поля',
            cx:10, cy:10, radius:6,
            mobs:['warg','ghost'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'grass' },

          { id:'di_pf_2', name:'Перекрёсток',
            cx:25, cy:20, radius:5,
            mobs:['ghost','warg'], maxMobs:20, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:9, decor:'rocks' },

          { id:'di_pf_3', name:'Заброшенная мельница',
            cx:42, cy:12, radius:5,
            mobs:['ghost'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'bones' },

          { id:'di_pf_4', name:'Развалины',
            cx:15, cy:42, radius:6,
            mobs:['warg','ghost'], maxMobs:22, interval:1.6,
            groupChance:0.40, champChance:0.10, aggroRange:10, decor:'rocks' },

          { id:'di_boss_2', name:'Подземный ход',
            cx:42, cy:40, radius:5,
            mobs:['ghost'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'c', bossRespawn:420 },
        ] },

      // ─── Зона 3.3 — Паучье логово (сложная, mult:200) ─────────────
      { id:'di_hard', name:'Паучье логово', diff:'hard', mult:200,
        teleportCost:1200,
        lairs: [
          { id:'di_sp_1', name:'Вход в пещеру',
            cx:12, cy:10, radius:6,
            mobs:['ghost','golem'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'di_sp_2', name:'Коконы',
            cx:25, cy:25, radius:6,
            mobs:['golem','ghost'], maxMobs:25, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'di_sp_3', name:'Глубина',
            cx:40, cy:15, radius:5,
            mobs:['golem'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'di_sp_4', name:'Тёмный туннель',
            cx:15, cy:42, radius:5,
            mobs:['ghost','golem'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.10, aggroRange:10, decor:'rocks' },

          { id:'di_boss_3', name:'Логово матки',
            cx:42, cy:42, radius:5,
            mobs:['golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'bones',
            boss:'b', bossRespawn:480 },
        ] },
    ],
  },
    // ═════════════════════════════════════════════════════════════════════
  //  ГЛАВА 4. OREN — лес и руины, B-грейд, tier 4
  // ═════════════════════════════════════════════════════════════════════
  oren: {
    id:'oren', name:'Oren', sub:'Лес и руины',
    grade:'b', tier:4,
    bg:'#1a0f2a',

    zones: [

      // ─── Зона 4.1 — Тёмный лес (лёгкая, mult:150) ─────────────────
      { id:'or_easy', name:'Тёмный лес', diff:'easy', mult:150,
        teleportCost:200,
        lairs: [
          { id:'or_ts_1', name:'Поляна',
            cx:12, cy:12, radius:5,
            mobs:['golem','ghost'], maxMobs:18, interval:2.0,
            groupChance:0.25, champChance:0.06, aggroRange:8, decor:'grass' },

          { id:'or_ts_2', name:'Гуща',
            cx:38, cy:15, radius:6,
            mobs:['ghost','golem'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.08, aggroRange:9, decor:'grass' },

          { id:'or_ts_3', name:'Чаща',
            cx:15, cy:38, radius:5,
            mobs:['golem'], maxMobs:18, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'rocks' },

          { id:'or_boss_1', name:'Логово теней',
            cx:40, cy:40, radius:4,
            mobs:['golem'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'b', bossRespawn:420 },
        ] },

      // ─── Зона 4.2 — Древние руины (средняя, mult:400) ─────────────
      { id:'or_medium', name:'Древние руины', diff:'medium', mult:400,
        teleportCost:600,
        lairs: [
          { id:'or_ru_1', name:'Колоннада',
            cx:10, cy:10, radius:6,
            mobs:['ghost','demon'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'or_ru_2', name:'Внутренний храм',
            cx:25, cy:22, radius:6,
            mobs:['demon','ghost'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:9, decor:'bones' },

          { id:'or_ru_3', name:'Подземелье',
            cx:42, cy:12, radius:5,
            mobs:['demon'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'campfire' },

          { id:'or_ru_4', name:'Разбитый алтарь',
            cx:15, cy:42, radius:6,
            mobs:['ghost','demon'], maxMobs:22, interval:1.6,
            groupChance:0.40, champChance:0.10, aggroRange:10, decor:'bones' },

          { id:'or_boss_2', name:'Тёмный трон',
            cx:42, cy:40, radius:5,
            mobs:['demon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'a', bossRespawn:480 },
        ] },

      // ─── Зона 4.3 — Шахта големов (сложная, mult:1000) ────────────
      { id:'or_hard', name:'Шахта големов', diff:'hard', mult:1000,
        teleportCost:1500,
        lairs: [
          { id:'or_sh_1', name:'Штольня',
            cx:12, cy:12, radius:6,
            mobs:['golem','demon'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'rocks' },

          { id:'or_sh_2', name:'Кристальный зал',
            cx:25, cy:22, radius:6,
            mobs:['demon','golem'], maxMobs:25, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'or_sh_3', name:'Забой',
            cx:42, cy:15, radius:5,
            mobs:['golem'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'rocks' },

          { id:'or_sh_4', name:'Дно шахты',
            cx:15, cy:42, radius:5,
            mobs:['demon','golem'], maxMobs:22, interval:1.6,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'or_boss_3', name:'Сердце шахты',
            cx:42, cy:42, radius:5,
            mobs:['golem'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'a', bossRespawn:540 },
        ] },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ГЛАВА 5. ADEN — столица, A-грейд, tier 5
  // ═════════════════════════════════════════════════════════════════════
  aden: {
    id:'aden', name:'Aden', sub:'Столица',
    grade:'a', tier:5,
    bg:'#2a0a0a',

    zones: [

      // ─── Зона 5.1 — Предместья (лёгкая, mult:800) ─────────────────
      { id:'ad_easy', name:'Предместья', diff:'easy', mult:800,
        teleportCost:300,
        lairs: [
          { id:'ad_pm_1', name:'Дозорная башня',
            cx:10, cy:12, radius:5,
            mobs:['demon','dragon'], maxMobs:18, interval:2.0,
            groupChance:0.25, champChance:0.06, aggroRange:8, decor:'rocks' },

          { id:'ad_pm_2', name:'Караванный путь',
            cx:38, cy:12, radius:6,
            mobs:['demon','dragon'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.08, aggroRange:9, decor:'grass' },

          { id:'ad_pm_3', name:'Разрушенный мост',
            cx:15, cy:38, radius:5,
            mobs:['demon'], maxMobs:18, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'bones' },

          { id:'ad_boss_1', name:'Осадный лагерь',
            cx:40, cy:40, radius:4,
            mobs:['demon'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'a', bossRespawn:480 },
        ] },

      // ─── Зона 5.2 — Столичные поля (средняя, mult:2000) ───────────
      { id:'ad_medium', name:'Столичные поля', diff:'medium', mult:2000,
        teleportCost:800,
        lairs: [
          { id:'ad_sp_1', name:'Императорский тракт',
            cx:10, cy:10, radius:6,
            mobs:['dragon','demon'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'ad_sp_2', name:'Пшеничные поля',
            cx:25, cy:22, radius:6,
            mobs:['demon','dragon'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:9, decor:'grass' },

          { id:'ad_sp_3', name:'Крепость',
            cx:42, cy:12, radius:5,
            mobs:['dragon'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'ad_sp_4', name:'Забытый лагерь',
            cx:15, cy:42, radius:6,
            mobs:['demon','dragon'], maxMobs:22, interval:1.6,
            groupChance:0.40, champChance:0.10, aggroRange:10, decor:'bones' },

          { id:'ad_boss_2', name:'Главный лагерь',
            cx:42, cy:40, radius:5,
            mobs:['dragon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'s', bossRespawn:600 },
        ] },

      // ─── Зона 5.3 — Драконье логово (сложная, mult:5000) ──────────
      { id:'ad_hard', name:'Драконье логово', diff:'hard', mult:5000,
        teleportCost:2000,
        lairs: [
          { id:'ad_dl_1', name:'Пепелище',
            cx:12, cy:12, radius:6,
            mobs:['dragon'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'rocks' },

          { id:'ad_dl_2', name:'Кости драконов',
            cx:25, cy:25, radius:6,
            mobs:['dragon'], maxMobs:25, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'ad_dl_3', name:'Гнездо',
            cx:40, cy:15, radius:5,
            mobs:['dragon'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'ad_dl_4', name:'Сокровищница',
            cx:15, cy:42, radius:5,
            mobs:['dragon'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'ad_boss_3', name:'Логово тирана',
            cx:42, cy:42, radius:5,
            mobs:['dragon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'bones',
            boss:'s', bossRespawn:720 },
        ] },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  //  ГЛАВА 6. GODDARD — ледяные земли, S-грейд, tier 6
  // ═════════════════════════════════════════════════════════════════════
  goddard: {
    id:'goddard', name:'Goddard', sub:'Ледяные земли',
    grade:'s', tier:6,
    bg:'#0a1a2a',

    zones: [

      // ─── Зона 6.1 — Ледяные поля (лёгкая, mult:4000) ──────────────
      { id:'gd_easy', name:'Ледяные поля', diff:'easy', mult:4000,
        teleportCost:500,
        lairs: [
          { id:'gd_lp_1', name:'Замёрзшее озеро',
            cx:12, cy:12, radius:5,
            mobs:['ice_golem','archdemon'], maxMobs:18, interval:2.0,
            groupChance:0.25, champChance:0.06, aggroRange:8, decor:'rocks' },

          { id:'gd_lp_2', name:'Ледяной лес',
            cx:38, cy:15, radius:6,
            mobs:['ice_golem'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.08, aggroRange:9, decor:'rocks' },

          { id:'gd_lp_3', name:'Снежная буря',
            cx:15, cy:38, radius:5,
            mobs:['ice_golem','archdemon'], maxMobs:18, interval:2.0,
            groupChance:0.30, champChance:0.08, aggroRange:8, decor:'bones' },

          { id:'gd_boss_1', name:'Ледяной трон',
            cx:40, cy:40, radius:4,
            mobs:['ice_golem'], maxMobs:6, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'s', bossRespawn:600 },
        ] },

      // ─── Зона 6.2 — Замёрзшие руины (средняя, mult:10000) ─────────
      { id:'gd_medium', name:'Замёрзшие руины', diff:'medium', mult:10000,
        teleportCost:1500,
        lairs: [
          { id:'gd_zr_1', name:'Ледяной храм',
            cx:10, cy:10, radius:6,
            mobs:['archdemon','ice_golem'], maxMobs:22, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'gd_zr_2', name:'Проклятый зал',
            cx:25, cy:22, radius:6,
            mobs:['archdemon'], maxMobs:22, interval:1.8,
            groupChance:0.40, champChance:0.10, aggroRange:9, decor:'bones' },

          { id:'gd_zr_3', name:'Подлёдный туннель',
            cx:42, cy:12, radius:5,
            mobs:['ice_golem','archdemon'], maxMobs:20, interval:1.8,
            groupChance:0.35, champChance:0.10, aggroRange:9, decor:'rocks' },

          { id:'gd_zr_4', name:'Кристальный сад',
            cx:15, cy:42, radius:6,
            mobs:['archdemon','ice_golem'], maxMobs:22, interval:1.6,
            groupChance:0.40, champChance:0.10, aggroRange:10, decor:'rocks' },

          { id:'gd_boss_2', name:'Проклятый трон',
            cx:42, cy:40, radius:5,
            mobs:['archdemon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'s', bossRespawn:720 },
        ] },

      // ─── Зона 6.3 — Логово архидемонов (сложная, mult:25000) ──────
      { id:'gd_hard', name:'Логово архидемонов', diff:'hard', mult:25000,
        teleportCost:4000,
        lairs: [
          { id:'gd_la_1', name:'Врата ада',
            cx:12, cy:12, radius:6,
            mobs:['archdemon','dragon'], maxMobs:22, interval:1.5,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'campfire' },

          { id:'gd_la_2', name:'Тронный зал',
            cx:25, cy:25, radius:6,
            mobs:['archdemon'], maxMobs:25, interval:1.5,
            groupChance:0.40, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'gd_la_3', name:'Пыточная',
            cx:40, cy:15, radius:5,
            mobs:['archdemon','dragon'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'gd_la_4', name:'Костяной зал',
            cx:15, cy:42, radius:5,
            mobs:['archdemon'], maxMobs:20, interval:1.6,
            groupChance:0.35, champChance:0.12, aggroRange:10, decor:'bones' },

          { id:'gd_boss_3', name:'Сердце бездны',
            cx:42, cy:42, radius:5,
            mobs:['archdemon'], maxMobs:8, interval:5.0,
            groupChance:1.0, champChance:0, aggroRange:12, decor:'campfire',
            boss:'s', bossRespawn:900 },
        ] },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════
//  ХЕЛПЕРЫ И СЛУЖЕБНОЕ
// ═══════════════════════════════════════════════════════════════════════

// Порядок городов в UI (список телепорта, мир, сортировка).
export const CITY_ORDER = ['talking_island','giran','dion','oren','aden','goddard'];

// Стоимость телепорта между городами разных tier.
// Разница tier 0 (тот же город) = 0.
// Формула: [0, 200, 500, 1200, 3000, 7500][|tier1 - tier2|]
// Если больше — 10000.
export function cityTeleportCost(fromTier, toTier) {
  const diff = Math.abs(fromTier - toTier);
  if (diff === 0) return 0;
  return [0, 200, 500, 1200, 3000, 7500][diff] || 10000;
}

// Найти зону по id города и зоны.
export function findZone(cityId, zoneId) {
  const city = CITIES[cityId];
  if (!city) return null;
  return city.zones.find(z => z.id === zoneId);
}

// Отображаемая метка сложности зоны.
export function zoneDifficultyLabel(diff) {
  if (diff === 'easy')   return '🟢 Лёгкая';
  if (diff === 'medium') return '🟡 Средняя';
  return '🔴 Сложная';
}