// main.js — игровой цикл, ввод, камера, звук

import { LEVELS } from './levels.js';
import { createPlayer, updatePlayer, PHYS } from './physics.js';
import { createEntity, updateEntity, getAllBullets } from './entities.js';
import { checkHazards } from './hazards.js';
import { render } from './render.js';
import {
  initAudio, sfxJump, sfxDoubleJump, sfxLand, sfxDeath, sfxWin, sfxShoot, sfxBreak,
  startMusic, stopMusic
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let levelIndex = 0;
let level, entities, player;
let input = { left: false, right: false };
let jumpPressed = false;
let wasOnGround = false;
let startTime = 0;
let deaths = 0;
let won = false;

// --- загрузка уровня ---
function loadLevel(index) {
  levelIndex = index;
  level = LEVELS[index];
  entities = level.entities.map(createEntity);
  player = createPlayer(level.spawn);
  player.jumpHeld = false;
  input = { left: false, right: false };
  jumpPressed = false;
  wasOnGround = false;
  startTime = performance.now();
  won = false;
  document.getElementById('level').textContent = level.id;
  document.getElementById('win').classList.add('hidden');
  document.getElementById('level-name').textContent = level.name || '';
  // сброс камеры
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
}

// --- ввод ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (!jumpPressed) {
      player.jumpBufferTimer = PHYS.jumpBuffer;
      player.jumpHeld = true;
      jumpPressed = true;
    }
  }
  if (e.code === 'KeyR') loadLevel(levelIndex);
  if (e.code === 'KeyN' && won) loadLevel((levelIndex + 1) % LEVELS.length);
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    jumpPressed = false;
    player.jumpHeld = false;
  }
});

// --- тач ---
function bindTouchButton(id, onPress, onRelease) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
  el.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
  el.addEventListener('mousedown', onPress);
  el.addEventListener('mouseup', onRelease);
}
bindTouchButton('btn-left',
  () => { input.left = true; },
  () => { input.left = false; });
bindTouchButton('btn-right',
  () => { input.right = true; },
  () => { input.right = false; });
bindTouchButton('btn-jump',
  () => {
    player.jumpBufferTimer = PHYS.jumpBuffer;
    player.jumpHeld = true;
    jumpPressed = true;
  },
  () => {
    player.jumpHeld = false;
    jumpPressed = false;
  });

// --- камера ---
const camera = { x: 0, y: 0 };

function updateCamera(dt) {
  const targetX = player.x + player.w / 2 - canvas.width / 2;
  const targetY = player.y + player.h / 2 - canvas.height / 2;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 8);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 8);
}

// --- рестарт ---
function respawn() {
  sfxDeath();
  deaths++;
  document.getElementById('deaths').textContent = deaths;
  player = createPlayer(level.spawn);
  startTime = performance.now();
  wasOnGround = false;
}

// --- победа ---
function checkWin() {
  for (const e of entities) {
    if (!e.isGoal) continue;
    if (player.x < e.x + e.w && player.x + player.w > e.x &&
        player.y < e.y + e.h && player.y + player.h > e.y) {
      if (!won) {
        won = true;
        sfxWin();
        document.getElementById('win').classList.remove('hidden');
      }
    }
  }
}

// --- цикл ---
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!won) {
    // сохраняем предыдущие позиции для движущихся платформ
    for (const e of entities) {
      e.prevX = e.x;
      e.prevY = e.y;
    }

    // обновляем объекты
    for (const e of entities) {
      const wasSolid = e.solid;
      updateEntity(e, dt, level);

      // звук ломающейся платформы
      if (e.type === 'breakable' && !e.broken && !e.solid && wasSolid) {
        sfxBreak();
      }
      // звук выстрела турели (по факту появления новой пули)
      if (e.type === 'turret') {
        const before = e.bullets.length;
        // пули создаются в updateEntity, поэтому проверяем после
      }
    }

    // звук выстрела: считаем пули до/после
    // (упрощённо: играем sfxShoot при появлении новой пули — уже сделано внутри updateEntity,
    //  но чтобы не тащить audio в entities.js, проверим здесь)
    for (const e of entities) {
      if (e.type === 'turret' && e.bullets.length > 0) {
        // новая пуля: если последняя пуля "молодая"
        const last = e.bullets[e.bullets.length - 1];
        if (last.life > 3.9) sfxShoot();
      }
    }

    // движение игрока
    updatePlayer(player, input, dt, level, entities);

    // звук приземления
    if (player.onGround && !wasOnGround) sfxLand();
    // звук прыжка
    if (player.vy < 0 && !wasOnGround && player.jumpsLeft === 1 && !player._jumpSoundPlayed) {
      // определить, обычный это прыжок или двойной — сложно, упростим:
    }
    wasOnGround = player.onGround;

    // едем вместе с движущимися платформами
    if (player.onGround) {
      for (const e of entities) {
        if (e.type !== 'moving') continue;
        if (Math.abs((player.y + player.h) - e.y) < 3 &&
            player.x + player.w > e.x && player.x < e.x + e.w) {
          player.x += (e.x - (e.prevX || e.x));
          player.y += (e.y - (e.prevY || e.y));
        }
      }
    }

    // проверка победы
    checkWin();

    // проверка смерти
    const hazard = checkHazards(player, entities, level);
    if (hazard.dead) {
      respawn();
    }

    updateCamera(dt);

    document.getElementById('time').textContent =
      ((now - startTime) / 1000).toFixed(2);
  }

  render(ctx, canvas, level, player, camera, entities);
  requestAnimationFrame(loop);
}

// --- ресайз ---
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- старт ---
initAudio();
startMusic();
loadLevel(0);
requestAnimationFrame(loop);