// hazards.js — проверка опасностей: шипы, пули, crusher

export function checkHazards(player, entities, level) {
  // шипы
  for (const e of entities) {
    if (e.type === 'spike' && e.deadly) {
      if (aabb(player, e)) return { dead: true, reason: 'spike' };
    }
  }

  // пули
  for (const e of entities) {
    if (e.type === 'turret' && e.bullets) {
      for (const b of e.bullets) {
        if (aabb(player, b)) return { dead: true, reason: 'bullet' };
      }
    }
  }

  // crusher — если игрок между crusher и платформой, он умирает
  // Простая проверка: если crusher пересекается с игроком
  for (const e of entities) {
    if (e.type === 'crusher' && aabb(player, e)) {
      return { dead: true, reason: 'crusher' };
    }
  }

  // упал ниже уровня
  if (player.y > level.height + 200) {
    return { dead: true, reason: 'fall' };
  }

  return { dead: false };
}

function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}