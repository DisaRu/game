// config.js — все числа баланса в одном месте

export const CONFIG = {
  // Сетка
  CELL: 24,
  CHUNK: 32,

  // Рост: единая энергия. 1 энергия = 1 клетка
  GROW_ENERGY_PER_CELL: 1,
  SPEND_RATE: 12,          // скорость «сползания» энергии вниз при отпускании (энергии/сек)
  BASE_GROW_RATE: 10,      // скорость накопления при зажатом РОСТ
  GROW_RATE_PER_CELL: 0.8,

  // HP клеток
  BASE_HP: 20,

  // Атака — тратит ту же единую энергию
  BASE_ATTACK_COST: 15,
  BASE_ATTACK_DAMAGE: 14,

  // Модификаторы режимов
  BORDER_COST_PER_TARGET: 8,   // «Граница»: стоимость = 8 × число задетых клеток
  BORDER_DAMAGE_MULT: 0.25,
  FOCUS_COST_MULT: 1.0,
  FOCUS_DAMAGE_MULT: 1.0,
  DEEP_COST_MULT: 6.0,
  DEEP_DAMAGE_MULT: 0.4,

  // Главная башня (3x3)
  TOWER_HP_BASE: 100,
  TOWER_HP_PER_CELL: 3,
  HEAL_ATTACK_RATE: 40,   // энергии/сек при зажатом ЛЕЧИТЬ
  HEAL_HP_RATE: 20,       // HP/сек — 2 энергии за 1 HP

  // Награды за убийство
  KILL_REWARD_ENERGY: 1.0,
  CONQUEROR_DURATION: 60,
  CONQUEROR_GROW_BONUS: 0.2,

  // Возрождение
  RESPAWN_SHIELD_TIME: 10,

  // Боты
  BOT_VISION: 25,      // радиус обзора бота (в клетках)
  BOT_COUNT: 7,
  BOT_NAMES: ['Гроза', 'Викинг', 'Барс', 'Кобра', 'Титан', 'Люцерн', 'Феникс'],

  // Цвета
  COLORS: ['#4da3ff', '#ff3b30', '#34c759', '#ffcc00', '#a855f7', '#ff9500', '#5ac8fa', '#ff2d55'],

  // Нейтральные клетки
  NEUTRAL_COLOR: '#2a2a2c',
  NEUTRAL_HP: 5,

  // Размер мира: квадрат от -MAP_RADIUS до +MAP_RADIUS
  MAP_RADIUS: 80,

  // Зум
  ZOOM_MIN: 0.4,
  ZOOM_MAX: 3.0,
  ZOOM_STEP: 0.15,
};