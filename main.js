import { LEVELS } from './levels.js';
import { createPlayer, updatePlayer } from './physics.js';
import { render } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let level = LEVELS[0];
let player = createPlayer(level.spawn);
let input = { left: false, right: false };
let jumpPressed = false;
let startTime = performance.now();
let deaths = 0;
let won = false;

// --- ввод ---
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = true;
  if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !jumpPressed) {
    player.jumpBufferTimer = 0.12;
    jumpPressed = true;
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') input.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') input.right = false;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jumpPressed = false;
});
// клик мышью тоже прыжок
canvas.addEventListener('mousedown', () => { player.jumpBufferTimer = 0.12; });

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
  player = createPlayer(level.spawn);
  startTime = performance.now();
  deaths++;
  document.getElementById('deaths').textContent = deaths;
}

// --- победа ---
function checkWin() {
  const g = level.goal;
  if (player.x < g.x + g.w && player.x + player.w > g.x &&
      player.y < g.y + g.h && player.y + player.h > g.y) {
    if (!won) {
      won = true;
      document.getElementById('win').classList.remove('hidden');
    }
  }
}

// --- цикл ---
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;

  if (!won) {
    updatePlayer(player, input, dt, level);
    updateCamera(dt);
    checkWin();

    // смерть: упал ниже уровня
    if (player.y > level.height + 200) respawn();

    document.getElementById('time').textContent =
      ((now - startTime) / 1000).toFixed(2);
  }

  render(ctx, canvas, level, player, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ресайз канваса
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();