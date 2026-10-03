import { LEVELS } from './levels.js';
import { createPlayer, updatePlayer, PHYS } from './physics.js';
import { createEntity, updateEntity } from './entities.js';
import { checkHazards } from './hazards.js';
import { render } from './render.js';
import {
  initAudio, sfxLand, sfxDeath, sfxWin, sfxShoot, sfxBreak,
  startMusic
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const camera = { x: 0, y: 0 };

let levelIndex = 0;
let level, entities, player;
let input = { left: false, right: false };
let jumpPressed = false;
let wasOnGround = false;
let startTime = 0;
let deaths = 0;
let won = false;

function loadLevel(index) {
  levelIndex = index;
  level = LEVELS[index];
  entities = level.entities.map(createEntity);
  player = createPlayer(level.spawn);
  input = { left: false, right: false };
  jumpPressed = false;
  wasOnGround = false;
  startTime = performance.now();
  won = false;

  document.getElementById('level').textContent = level.id;
  document.getElementById('level-name').textContent = level.name || '';
  document.getElementById('deaths').textContent = deaths;
  document.getElementById('result').classList.add('hidden');

  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;
}

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
  if (e.code === 'KeyR') { deaths = 0; loadLevel(levelIndex); }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    jumpPressed = false;
    player.jumpHeld = false;
  }
});

function bindTouchButton(id, onPress, onRelease) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', (e) => { e.preventDefault(); onPress(); });
  el.addEventListener('touchend', (e) => { e.preventDefault(); onRelease(); });
  el.addEventListener('mousedown', onPress);
  el.addEventListener('mouseup', onRelease);
}
bindTouchButton('btn-left', () => { input.left = true; }, () => { input.left = false; });
bindTouchButton('btn-right', () => { input.right = true; }, () => { input.right = false; });
bindTouchButton('btn-jump',
  () => { player.jumpBufferTimer = PHYS.jumpBuffer; player.jumpHeld = true; jumpPressed = true; },
  () => { player.jumpHeld = false; jumpPressed = false; });

function updateCamera(dt) {
  const targetX = player.x + player.w / 2 - canvas.width / 2;
  const targetY = player.y + player.h / 2 - canvas.height / 2;
  camera.x += (targetX - camera.x) * Math.min(1, dt * 8);
  camera.y += (targetY - camera.y) * Math.min(1, dt * 8);
}

function respawn() {
  sfxDeath();
  deaths++;
  document.getElementById('deaths').textContent = deaths;
  player = createPlayer(level.spawn);
  startTime = performance.now();
  wasOnGround = false;
}

function checkWin() {
  for (const e of entities) {
    if (!e.isGoal) continue;
    if (player.x < e.x + e.w && player.x + player.w > e.x &&
        player.y < e.y + e.h && player.y + player.h > e.y) {
      if (!won) {
        won = true;
        sfxWin();
        showResult();
      }
    }
  }
}

function showResult() {
  const timeSec = ((performance.now() - startTime) / 1000).toFixed(2);
  document.getElementById('result-time').textContent = timeSec;
  document.getElementById('result-deaths').textContent = deaths;
  document.getElementById('result-players').textContent = '—';

  const nextBtn = document.getElementById('btn-next');
  if (levelIndex + 1 >= LEVELS.length) {
    nextBtn.disabled = true;
    nextBtn.textContent = 'Финал';
  } else {
    nextBtn.disabled = false;
    nextBtn.textContent = 'Следующий';
  }

  document.getElementById('result').classList.remove('hidden');
}

document.getElementById('btn-retry').addEventListener('click', () => {
  document.getElementById('result').classList.add('hidden');
  deaths = 0;
  loadLevel(levelIndex);
});

document.getElementById('btn-next').addEventListener('click', () => {
  document.getElementById('result').classList.add('hidden');
  deaths = 0;
  const next = levelIndex + 1;
  if (next < LEVELS.length) {
    localStorage.setItem('jump_tower_progress', String(next));
    loadLevel(next);
  }
});

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!won) {
    for (const e of entities) {
      e.prevX = e.x;
      e.prevY = e.y;
    }

    for (const e of entities) {
      const wasSolid = e.solid;
      updateEntity(e, dt, level);
      if (e.type === 'breakable' && !e.broken && !e.solid && wasSolid) sfxBreak();
    }

    for (const e of entities) {
      if (e.type === 'turret' && e.bullets.length > 0) {
        const last = e.bullets[e.bullets.length - 1];
        if (last.life > 3.9) sfxShoot();
      }
    }

    updatePlayer(player, input, dt, level, entities);

    if (player.onGround && !wasOnGround) sfxLand();
    wasOnGround = player.onGround;

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

    checkWin();

    const hazard = checkHazards(player, entities, level);
    if (hazard.dead) respawn();

    updateCamera(dt);

    document.getElementById('time').textContent =
      ((now - startTime) / 1000).toFixed(2);
  }

  render(ctx, canvas, level, player, camera, entities);
  requestAnimationFrame(loop);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

initAudio();
startMusic();

const saved = localStorage.getItem('jump_tower_progress');
let startIndex = 0;
if (saved !== null && saved !== 'done') {
  const n = parseInt(saved, 10);
  if (!isNaN(n) && n >= 0 && n < LEVELS.length) startIndex = n;
}
loadLevel(startIndex);
requestAnimationFrame(loop);