let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function initAudio() { getCtx(); }

function beep(freq, duration, type = 'square', volume = 0.04) {
  try {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
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
  } catch (e) {}
}

export function sfxShoot()    { beep(650, 0.03, 'square', 0.02); }
export function sfxHit()      { beep(320, 0.04, 'sawtooth', 0.025); }
export function sfxDeath()    { beep(160, 0.1, 'triangle', 0.05); }
export function sfxHeroHit()  { beep(120, 0.1, 'sawtooth', 0.06); }
export function sfxLevelUp()  { [400, 600, 900, 1200].forEach((f, i) => setTimeout(() => beep(f, 0.1, 'square', 0.05), i * 80)); }
export function sfxHeroDie()  {
  const ac = getCtx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.8);
  gain.gain.value = 0.08;
  osc.connect(gain); gain.connect(ac.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.8);
  osc.stop(ac.currentTime + 0.8);
}