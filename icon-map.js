// ============================================================
// icon-map.js — Единый источник всех иконок игры
// ============================================================
//
// Этот файл — единственный источник иконок для всей игры.
// Каждая иконка описана объектом с полями:
//
//   emoji  — текстовый эмодзи (fallback, всегда работает)
//   png    — путь к PNG-файлу в папке sprites/ (если есть)
//   size   — базовый размер в пикселях
//
// Правила:
// 1. Если png не null и файл существует — рендерится <img> (PNG)
// 2. Если png null или файл не найден — рендерится <span> с emoji
// 3. Размер можно переопределить при вызове getIcon(key, size)
// 4. Для добавления новой иконки — просто добавьте запись в ICON_MAP
// 5. Для замены emoji на PNG — укажите путь в png, emoji оставьте как fallback
//
// PNG-файлы кладите в папку sprites/ (или подпапки sprites/subdir/)
// ============================================================

export const ICON_MAP = {
  // ==========================================================
  // ГЕРОИ — классы персонажей
  // ==========================================================
  hero_archer: { emoji: '🏹', png: null, size: 32, cls: 'class_archer' },
  hero_mage: { emoji: '🔮', png: null, size: 32, cls: 'class_mage' },
  ui_class_archer: { emoji: '🏹', png: null, size: 32, cls: 'class_archer' },
  ui_class_mage: { emoji: '🔮', png: null, size: 32, cls: 'class_mage' },

  // ==========================================================
  // МОБЫ — спрайты врагов
  // ==========================================================
  mob_gremlin: { emoji: '👹', png: 'sprites/mobs/gremlin.png', size: 36, cls: 'mob' },
  mob_keltir: { emoji: '🐺', png: null, size: 36, cls: 'mob' },
  mob_werewolf: { emoji: '🐺', png: null, size: 36, cls: 'mob' },
  mob_orc: { emoji: '👺', png: null, size: 36, cls: 'mob' },
  mob_skeleton: { emoji: '💀', png: null, size: 36, cls: 'mob' },
  mob_spider: { emoji: '🕷️', png: null, size: 36, cls: 'mob' },
  mob_warg: { emoji: '🐕', png: null, size: 36, cls: 'mob' },
  mob_ghost: { emoji: '👻', png: null, size: 36, cls: 'mob' },
  mob_golem: { emoji: '🗿', png: null, size: 36, cls: 'mob' },
  mob_demon: { emoji: '😈', png: null, size: 36, cls: 'mob' },
  mob_dragon: { emoji: '🐉', png: null, size: 36, cls: 'mob' },
  mob_ice_golem: { emoji: '❄️', png: null, size: 36, cls: 'mob' },
  mob_archdemon: { emoji: '👿', png: null, size: 36, cls: 'mob' },

  // ==========================================================
  // БОССЫ — спрайты боссов
  // ==========================================================
  boss_ng: { emoji: '👑', png: null, size: 48, cls: 'mob' },
  boss_d: { emoji: '🧌', png: null, size: 48, cls: 'mob' },
  boss_c: { emoji: '🕸️', png: null, size: 48, cls: 'mob' },
  boss_b: { emoji: '☠️', png: null, size: 48, cls: 'mob' },
  boss_a: { emoji: '🐲', png: null, size: 48, cls: 'mob' },
  boss_s: { emoji: '👁️', png: null, size: 48, cls: 'mob' },

  // ==========================================================
  // СКИЛЛЫ — иконки способностей героя
  // ==========================================================
  skill_multishot: { emoji: '🏹', png: null, size: 42, cls: 'skill_multishot' },
  skill_fireball: { emoji: '🔥', png: null, size: 42, cls: 'skill_fireball' },
  skill_poison: { emoji: '☠️', png: null, size: 42, cls: 'skill_poison' },
  skill_stun: { emoji: '💫', png: null, size: 42, cls: 'skill_stun' },
  skill_frost: { emoji: '❄️', png: null, size: 42, cls: 'skill_frost' },
  skill_silence: { emoji: '🤐', png: null, size: 42, cls: 'skill_silence' },
  skill_heal: { emoji: '❤️', png: null, size: 42, cls: 'skill_heal' },
  skill_dodge: { emoji: '💨', png: null, size: 42, cls: 'skill_dodge' },
  skill_cleanse: { emoji: '✨', png: null, size: 42, cls: 'skill_cleanse' },
  skill_summon_shadow:{ emoji: '👤', png: null, size: 42 },

  // ==========================================================
  // БАФФЫ — иконки свитков баффов
  // ==========================================================
  buff_attack: { emoji: '🗡', png: null, size: 32, cls: 'buff_attack' },
  buff_crit: { emoji: '💥', png: null, size: 32, cls: 'buff_crit' },
  buff_speed: { emoji: '⚡', png: null, size: 32, cls: 'buff_speed' },
  buff_range: { emoji: '📏', png: null, size: 32, cls: 'buff_range' },

  // ==========================================================
  // ЭКИПИРОВКА — иконки слотов экипировки
  // ==========================================================
  equip_weapon: { emoji: '🗡', png: null, size: 32, cls: 'weapon' },
  equip_helmet: { emoji: '⛑️', png: null, size: 32, cls: 'helmet' },
  equip_armor: { emoji: '🥋', png: null, size: 32, cls: 'armor' },
  equip_gloves: { emoji: '🧤', png: null, size: 32, cls: 'gloves' },
  equip_boots: { emoji: '👢', png: null, size: 32, cls: 'boots' },
  equip_cloak: { emoji: '🧥', png: null, size: 32, cls: 'cloak' },
  equip_ring: { emoji: '💍', png: null, size: 32, cls: 'ring' },
  equip_amulet: { emoji: '📿', png: null, size: 32, cls: 'amulet' },

  // ==========================================================
  // РАСХОДНИКИ — зелья, свитки, соски и прочее
  // ==========================================================
  potion_small: { emoji: '🧪', png: null, size: 32, cls: 'potion' },
  potion_medium: { emoji: '⚗️', png: null, size: 32, cls: 'potion' },
  potion_large: { emoji: '🍷', png: null, size: 32, cls: 'potion' },
  potion_epic: { emoji: '🏺', png: null, size: 32, cls: 'potion' },
  buff_scroll: { emoji: '📜', png: null, size: 32, cls: 'scroll' },
  blessed_scroll:{ emoji: '✨', png: null, size: 32 },
  arena_pass: { emoji: '🎫', png: null, size: 32, cls: 'arenapass' },
  skill_book: { emoji: '📖', png: null, size: 32, cls: 'skillbook' },

  // ==========================================================
  // СУНДУКИ — награды за рейтинг арены
  // ==========================================================
  chest_bronze: { emoji: '🥉', png: null, size: 36, cls: 'tier_bronze' },
  chest_silver: { emoji: '🥈', png: null, size: 36, cls: 'tier_silver' },
  chest_gold: { emoji: '🥇', png: null, size: 36, cls: 'tier_gold' },
  chest_platinum:{ emoji: '💎', png: null, size: 36 },
  chest_legendary:{ emoji: '👑', png: null, size: 36 },
  chest_mythic: { emoji: '🌟', png: null, size: 36, cls: 'star' },

  // ==========================================================
  // РУЛЕТКА — награды рулетки
  // ==========================================================
  roulette_gold_500: { emoji: '💰', png: null, size: 32, cls: 'gold' },
  roulette_gold_2000: { emoji: '💰', png: null, size: 32, cls: 'gold' },
  roulette_scroll_3: { emoji: '📜', png: null, size: 32, cls: 'scroll' },
  roulette_blessed: { emoji: '✨', png: null, size: 32, cls: 'blessed' },
  roulette_item: { emoji: '⚔', png: null, size: 32, cls: 'weapon' },
  roulette_chest: { emoji: '🎁', png: null, size: 32, cls: 'chest' },
  roulette_pass: { emoji: '🎫', png: null, size: 32, cls: 'arenapass' },

  // ==========================================================
  // СТАРТОВЫЕ ПРЕДМЕТЫ
  // ==========================================================
  start_items: { emoji: '💤', png: null, size: 32, cls: 'offline' },

  // ==========================================================
  // РЕСУРСЫ — золото, опыт
  // ==========================================================
  gold: { emoji: '🪙', png: null, size: 24, cls: 'gold' },
  xp: { emoji: '⭐', png: null, size: 24, cls: 'xp' },
  adena: { emoji: '🪙', png: null, size: 24, cls: 'gold' },

  // ==========================================================
  // СТАТЫ — иконки характеристик
  // ==========================================================
  stat_attack: { emoji: '⚔', png: null, size: 20, cls: 'attack' },
  stat_defense: { emoji: '🛡', png: null, size: 20, cls: 'defense' },
  stat_hp: { emoji: '❤', png: null, size: 20, cls: 'hp' },
  stat_mana: { emoji: '🔷', png: null, size: 20, cls: 'mana' },
  stat_mana_regen: { emoji: '🔹', png: null, size: 20, cls: 'manaregen' },
  stat_crit_chance: { emoji: '💥', png: null, size: 20, cls: 'crit' },
  stat_crit_damage: { emoji: '💢', png: null, size: 20, cls: 'critdamage' },
  stat_dodge: { emoji: '💨', png: null, size: 20, cls: 'dodge' },
  stat_attack_speed:{ emoji: '⚡', png: null, size: 20 },
  stat_lifesteal: { emoji: '🩸', png: null, size: 20, cls: 'lifesteal' },
  stat_range: { emoji: '📏', png: null, size: 20, cls: 'range' },
  stat_accuracy: { emoji: '🎯', png: null, size: 20, cls: 'accuracy' },
  stat_crit_resist: { emoji: '🛡️', png: null, size: 20, cls: 'shield' },
  stat_armor_pen: { emoji: '🔨', png: null, size: 20, cls: 'armorpen' },
  stat_anti_heal: { emoji: '🚫', png: null, size: 20, cls: 'antiheal' },
  stat_berserk: { emoji: '😡', png: null, size: 20, cls: 'berserk' },
  stat_thorns: { emoji: '🌵', png: null, size: 20, cls: 'thorns' },
  stat_move_speed: { emoji: '👟', png: null, size: 20, cls: 'moveSpeed' },
  stat_cast_speed: { emoji: '⏱', png: null, size: 20, cls: 'cooldown' },
  stat_cast_stability: { emoji: '🎯', png: null, size: 20, cls: 'accuracy' },

  // ==========================================================
  // UI — иконки интерфейса
  // ==========================================================
  ui_close: { emoji: '✕', png: null, size: 20, cls: 'ui_close' },
  ui_inventory: { emoji: '🎒', png: null, size: 28, cls: 'ui_inventory' },
  ui_shop: { emoji: '🏪', png: null, size: 28, cls: 'ui_shop' },
  ui_auction: { emoji: '⚖', png: null, size: 28, cls: 'ui_auction' },
  ui_arena: { emoji: '🏟️', png: null, size: 28, cls: 'ui_arena' },
  ui_city: { emoji: '🏙', png: null, size: 28, cls: 'ui_city' },
  ui_enhance: { emoji: '⚒', png: null, size: 28, cls: 'ui_enhance' },
  ui_teleport: { emoji: '🌍', png: null, size: 28, cls: 'ui_teleport' },
  ui_logout: { emoji: '🚪', png: null, size: 28, cls: 'ui_logout' },
  ui_back: { emoji: '←', png: null, size: 28, cls: 'ui_back' },
  ui_loading: { emoji: '⏳', png: null, size: 36, cls: 'ui_loading' },
  ui_zone_easy: { emoji: '🟢', png: null, size: 18, cls: 'zone_easy' },
  ui_zone_medium: { emoji: '🟡', png: null, size: 18, cls: 'zone_medium' },
  ui_zone_hard: { emoji: '🔴', png: null, size: 18, cls: 'zone_hard' },
  ui_online: { emoji: '🟢', png: null, size: 16, cls: 'zone_easy' },
  ui_offline: { emoji: '💤', png: null, size: 20, cls: 'offline' },

  // ==========================================================
  // ЭФФЕКТЫ — визуальные эффекты на канвасе
  // ==========================================================
  fx_chain:      { emoji: '⛓', png: null, size: 24 },
  fx_flash:      { emoji: '⚡', png: null, size: 24 },
  fx_spin:       { emoji: '🌀', png: null, size: 24 },
  fx_stun_ring:  { emoji: '💫', png: null, size: 24 },
  fx_frost_ring: { emoji: '❄️', png: null, size: 24 },
  fx_silence_ring:{ emoji: '🤐', png: null, size: 24 },
  fx_cleanse_ring:{ emoji: '✨', png: null, size: 24 },
  fx_heal_ring:  { emoji: '❤️', png: null, size: 24 },
  fx_dodge:      { emoji: '💨', png: null, size: 24 },
  fx_fire:       { emoji: '🔥', png: null, size: 24 },
  fx_ring:       { emoji: '💍', png: null, size: 24 },
  fx_marker:     { emoji: '📍', png: null, size: 24 },
  fx_line:       { emoji: '—', png: null, size: 24 },

  // ==========================================================
  // ГРЕЙДЫ — бейджи грейдов для предметов
  // ==========================================================
  grade_ng: { emoji: 'NG',  png: null, size: 16, cls: 'grade_ng' },
  grade_d: { emoji: 'D',   png: null, size: 16, cls: 'grade_d' },
  grade_c: { emoji: 'C',   png: null, size: 16, cls: 'grade_c' },
  grade_b: { emoji: 'B',   png: null, size: 16, cls: 'grade_b' },
  grade_a: { emoji: 'A',   png: null, size: 16, cls: 'grade_a' },
  grade_s: { emoji: 'S',   png: null, size: 16, cls: 'grade_s' },

  // ==========================================================
  // АРЕНА — иконки тиров и наград арены
  // ==========================================================
  arena_tier_bronze: { emoji: '🥉', png: null, size: 32, cls: 'tier_bronze' },
  arena_tier_silver: { emoji: '🥈', png: null, size: 32, cls: 'tier_silver' },
  arena_tier_gold: { emoji: '🥇', png: null, size: 32, cls: 'tier_gold' },
  arena_tier_platinum: { emoji: '💎', png: null, size: 32, cls: 'tier_platinum' },
  arena_tier_legendary: { emoji: '👑', png: null, size: 32, cls: 'tier_legendary' },
  arena_reward_win:      { emoji: '✅', png: null, size: 32 },
  arena_reward_lose:     { emoji: '❌', png: null, size: 32 },

  // ==========================================================
  // ДОПОЛНИТЕЛЬНЫЕ UI-ИКОНКИ
  // ==========================================================
  icon_close: { emoji: '✕', png: null, size: 20, cls: 'ui_close' },
  icon_back: { emoji: '←', png: null, size: 24, cls: 'ui_back' },
  icon_forward: { emoji: '→', png: null, size: 24, cls: 'ui_back' },
  icon_compare: { emoji: '📊', png: null, size: 20, cls: 'accuracy' },
  icon_enchant: { emoji: '✨', png: null, size: 24, cls: 'blessed' },
  icon_equipped:   { emoji: '✅', png: null, size: 16 },
  icon_lock:       { emoji: '🔒', png: null, size: 20 },
  icon_shop: { emoji: '🏪', png: null, size: 24, cls: 'ui_shop' },
  icon_star: { emoji: '⭐', png: null, size: 20, cls: 'star' },
  icon_champion: { emoji: '⭐', png: null, size: 24, cls: 'star' },
  icon_offline: { emoji: '💤', png: null, size: 20, cls: 'offline' },
  icon_teleport: { emoji: '🌍', png: null, size: 24, cls: 'ui_teleport' },
  icon_reward: { emoji: '🎁', png: null, size: 24, cls: 'chest' },
  icon_dungeon: { emoji: '🏛', png: null, size: 24, cls: 'ui_city' },
};

/**
 * Получить определение иконки по ключу.
 *
 * @param {string} key — ключ иконки из ICON_MAP
 * @param {number} [size] — переопределить размер (по умолчанию из ICON_MAP)
 * @returns {{ emoji: string, png: string|null, size: number, cls: string|null }}
 */
export function getIcon(key, size = 32) {
  const def = ICON_MAP[key];
  if (!def) return { emoji: '?', png: null, size: size || 32, cls: null };
  return {
    emoji: def.emoji,
    png: def.png || null,
    size: size !== undefined ? size : def.size,
    cls: def.cls || null,
  };
}

/**
 * Готовый HTML иконки: SVG (если задан cls), иначе PNG, иначе emoji-fallback.
 *
 * @param {string} key — ключ иконки из ICON_MAP
 * @param {number} [size] — размер в пикселях
 * @returns {string} HTML-строка
 */
export function iconMarkup(key, size) {
  const { emoji, png, size: s, cls } = getIcon(key, size);
  if (cls) return `<span class="l2i l2i-${cls}" style="width:${s}px;height:${s}px;display:inline-block;vertical-align:middle;"></span>`;
  if (png) return `<img src="${png}" style="width:${s}px;height:${s}px;object-fit:contain;image-rendering:pixelated;vertical-align:middle;" alt="">`;
  return `<span style="font-size:${s}px;line-height:1;vertical-align:middle;">${emoji}</span>`;
}

/**
 * Проверить, существует ли PNG-файл для иконки.
 * Поскольку мы не можем проверить файловую систему из браузера,
 * этот метод возвращает true только если png задан и не пуст.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function hasPng(key) {
  const def = ICON_MAP[key];
  return def && def.png !== null && def.png !== '';
}
