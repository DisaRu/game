// ui.js — HUD, тосты, переключатель режимов

export class UI {
  constructor() {
    this.hudCells = document.getElementById('hudCells');
    this.energyFill = document.getElementById('energyFill');
    this.energyText = document.getElementById('energyText');
    this.hpFill = document.getElementById('hpFill');
    this.hpText = document.getElementById('hpText');
    this.ratingEl = document.getElementById('rating');
    this.currentMode = 'focus';
  }

  update(player) {
    this.hudCells.textContent = player.cells.size;

    // Единая энергия: шкала ориентирована на 50 очков
    const pct = Math.min((player.energy / 50) * 100, 100);
    this.energyFill.style.width = pct + '%';
    this.energyText.textContent = `⚡ ${Math.floor(player.energy)}`;

    const maxHp = player.towerMaxHp();
    const hpPct = Math.max(0, Math.min(100, (player.towerHp / maxHp) * 100));
    this.hpFill.style.width = hpPct + '%';
    this.hpText.textContent = `🏰 ${Math.floor(Math.max(0, player.towerHp))} / ${maxHp}`;
  }

  // Рейтинг: сколько клеток у каждого игрока (не кликабельный)
  updateRating(players) {
    const list = [...players.values()].sort((a, b) => b.cellCount - a.cellCount);
    this.ratingEl.innerHTML = list.map(p =>
      `<div class="r-row"><span class="r-dot" style="background:${p.color}"></span>` +
      `<span class="r-name">${p.name}</span>` +
      `<span class="r-cells">${p.cellCount}</span></div>`
    ).join('');
  }

  bindModeSwitch(callback) {
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        this.currentMode = b.dataset.mode;
        if (callback) callback(this.currentMode);
      });
    });
  }

  toast(text, color) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    el.style.background = color;
    el.style.color = '#fff';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1600);
  }

  setRespawnMode(on) {
    document.body.classList.toggle('respawn-mode', on);
  }
}