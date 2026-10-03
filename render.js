// render.js — вся отрисовка

import { CONFIG } from './config.js';

export class Renderer {
  constructor(canvas, world, camera, meId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = camera;
    this.meId = meId;
    this.waitingForRespawn = false;
    this.selectedBase = null;     // превью места базы до старта
    this.gameOverMsg = null;      // сообщение о конце игры

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // Canvas занимает область #game — нижняя панель не перекрывает карту
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  draw() {
    const ctx = this.ctx;
    const { world, camera } = this;
    const zoom = camera.zoom || 1;

    ctx.fillStyle = '#0d0d0f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const cell = CONFIG.CELL * zoom;
    const offsetX = this.canvas.width / 2 - camera.x;
    const offsetY = this.canvas.height / 2 - camera.y;

    const startCol = Math.floor((-offsetX) / cell) - 1;
    const endCol = Math.ceil((-offsetX + this.canvas.width) / cell) + 1;
    const startRow = Math.floor((-offsetY) / cell) - 1;
    const endRow = Math.ceil((-offsetY + this.canvas.height) / cell) + 1;

    // Сетка
    ctx.strokeStyle = '#151517';
    ctx.lineWidth = 1;
    for (let r = startRow; r <= endRow; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, r * cell + offsetY);
      ctx.lineTo(offsetX + this.canvas.width, r * cell + offsetY);
      ctx.stroke();
    }
    for (let c = startCol; c <= endCol; c++) {
      ctx.beginPath();
      ctx.moveTo(c * cell + offsetX, offsetY);
      ctx.lineTo(c * cell + offsetX, offsetY + this.canvas.height);
      ctx.stroke();
    }

    // Клетки
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const worldCell = world.get(r, c);
        if (!worldCell) continue;
        const x = c * cell + offsetX;
        const y = r * cell + offsetY;

        if (worldCell.owner === 'neutral') {
          ctx.fillStyle = CONFIG.NEUTRAL_COLOR;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
          continue;
        }

        const player = world.players.get(worldCell.owner);
        if (!player) continue;

        let color = player.color;
        if (player.isShielded && Math.floor(Date.now() / 200) % 2 === 0) color = '#ffffff';
        // Свои клетки — яркие; чужие — приглушённые (один fillRect — быстрее)
        if (worldCell.owner === this.meId) {
          ctx.fillStyle = color;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        } else {
          ctx.fillStyle = color + '55';
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }

        // HP-полоска
        if (worldCell.hp < worldCell.maxHp) {
          const ratio = Math.max(worldCell.hp / worldCell.maxHp, 0);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(x + 2, y + 2, cell - 4, 4);
          ctx.fillStyle = ratio > 0.5 ? '#34c759' : ratio > 0.25 ? '#ff9500' : '#ff3b30';
          ctx.fillRect(x + 2, y + 2, (cell - 4) * ratio, 4);
        }
      }
    }

    // Главная башня — сплошной блок 3x3 с именем владельца
    for (const p of world.players.values()) {
      if (!p.towerPos) continue;
      const { r, c } = p.towerPos;
      const bx = (c - 1) * cell + offsetX;
      const by = (r - 1) * cell + offsetY;
      const bw = 3 * cell;
      let color = p.color;
      if (p.isShielded && Math.floor(Date.now() / 200) % 2 === 0) color = '#ffffff';
      ctx.fillStyle = color;
      ctx.fillRect(bx + 1, by + 1, bw - 2, bw - 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bw - 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.max(7, cell * 0.28) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.name, bx + bw / 2, by + bw / 2);
    }

    // Превью выбора места базы
    if (this.selectedBase) {
      const { r, c } = this.selectedBase;
      const bx = (c - 1) * cell + offsetX;
      const by = (r - 1) * cell + offsetY;
      const bw = 3 * cell;
      ctx.fillStyle = 'rgba(77,163,255,0.35)';
      ctx.fillRect(bx, by, bw, bw);
      ctx.strokeStyle = '#4da3ff';
      ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bw);
    }

    // Полоса HP главной башни (над блоком 3x3)
    for (const p of world.players.values()) {
      if (!p.towerPos) continue;
      const maxHp = p.towerMaxHp();
      const { r, c } = p.towerPos;
      const bx = (c - 1) * cell + offsetX;
      const by = (r - 1) * cell + offsetY;
      const bw = 3 * cell;
      const ratio = Math.max(0, Math.min(1, p.towerHp / maxHp));
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, by - 7, bw, 5);
      ctx.fillStyle = ratio > 0.5 ? '#34c759' : ratio > 0.25 ? '#ff9500' : '#ff3b30';
      ctx.fillRect(bx, by - 7, bw * ratio, 5);
    }

    // Оверлей ожидания респавна
    if (this.waitingForRespawn) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Выбери место для новой базы', this.canvas.width / 2, this.canvas.height / 2);
    }

    // Конец игры — захват всей карты
    if (this.gameOverMsg) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(this.gameOverMsg, this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '16px system-ui';
      ctx.fillText('Перезагрузи страницу (F5), чтобы сыграть снова', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
  }
}