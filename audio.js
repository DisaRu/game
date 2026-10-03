// audio.js — звук через Web Audio API, без внешних файлов

let ctx = null;
let musicGain = null;
let musicPlaying = false;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function initAudio() {
  getCtx();
}

function beep(freq, duration, type = 'square', volume = 0.08) {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.stop(ac.currentTime + duration);
}

export function sfxJump()     { beep(520, 0.08, 'square'); }
export function sfxDoubleJump() { beep(700, 0.08, 'square'); }
export function sfxLand()     { beep(180, 0.06, 'sine'); }
export function sfxDeath() {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.3);
  gain.gain.value = 0.1;
  osc.connect(gain); gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  osc.stop(ac.currentTime + 0.3);
}
export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => beep(f, 0.12, 'square'), i * 90);
  });
}
export function sfxShoot() {
  const ac = getCtx();
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = 0.05;
  src.connect(gain); gain.connect(ac.destination);
  src.start();
}
export function sfxBreak() {
  const ac = getCtx();
  const buffer = ac.createBuffer(1, ac.sampleRate * 0.08, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.value = 0.08;
  src.connect(gain); gain.connect(ac.destination);
  src.start();
}

// простая фоновая музыка: зацикленный арпеджио
export function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  const notes = [220, 277, 330, 277, 220, 277, 330, 415];
  let i = 0;
  const ac = getCtx();
  musicGain = ac.createGain();
  musicGain.gain.value = 0.02;
  musicGain.connect(ac.destination);
  setInterval(() => {
    if (!musicPlaying) return;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[i % notes.length];
    g.gain.value = 0.03;
    osc.connect(g); g.connect(ac.destination);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
    osc.stop(ac.currentTime + 0.4);
    i++;
  }, 300);
}
export function stopMusic() { musicPlaying = false; }