// offline.js
export const OFFLINE_MAX_HOURS = 8;

// Ключ офлайн-состояния привязан к игроку: чужой offline_state из этого
// браузера не должен примениться к другому аккаунту
let _offlineUid = '_anon';
export function setOfflineUid(id) { _offlineUid = id || '_anon'; }
function offlineKey() { return 'offline_state_' + _offlineUid; }

export function startOfflineFarm(state) {
  const hero = state.hero;
  const zone = state.currentZone;
  if (!zone) return { ok: false, reason: 'no_zone' };
  if (!hero || hero.dead) return { ok: false, reason: 'dead' };

  hero.offlineActive = true;
  hero.offlineZoneId = zone.id;
  hero.offlineCityId = state.currentCity;
  hero.offlineZoneName = zone.name;
  hero.offlineStartTime = Date.now();
  hero.offlineElapsedTotal = 0;
  hero.offlineCounters = { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };
  hero.offlineLog = [{ time: 0, text: `💤 Офлайн начат в ${zone.name}`, type: 'progress' }];
  hero.offlineLogTimer = 0;

  saveOfflineLocal(state);
  return { ok: true };
}

export function getOfflineStatus(state) {
  const hero = state.hero;
  if (!hero || !hero.offlineActive) return null;

  const sec = Math.floor((Date.now() - (hero.offlineStartTime || Date.now())) / 1000);
  const c = hero.offlineCounters || { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };
  const weaponGrade = hero.equipment.weapon?.grade;
  const soulshotsLeft = weaponGrade ? (hero.soulshots[weaponGrade] || 0) : 0;
  const potionsLeft = Object.values(hero.potions || {}).reduce((a, b) => a + b, 0);
  const elapsed = Math.max(1, Math.floor((Date.now() - (hero.offlineStartTime || Date.now())) / 1000) + (hero.offlineElapsedTotal || 0));

  return {
    zoneName: hero.offlineZoneName || '—',
    seconds: sec,
    maxSeconds: OFFLINE_MAX_HOURS * 3600,
    gold: c.gold,
    xp: c.xp,
    kills: c.kills,
    items: c.items,
    scrolls: c.scrolls,
    blessed: c.blessed,
    // Скоростные метрики для плашки: усреднённые за весь офлайн
    goldPerHour: (c.gold / elapsed) * 3600,
    killsPerHour: (c.kills / elapsed) * 3600,
    soulshotsLeft,
    potionsLeft,
    hp: Math.floor(hero.hp),
    maxHp: hero.maxHp,
    dead: hero.dead,
    log: hero.offlineLog || [],
  };
}

export function stopOffline(state) {
  const hero = state.hero;
  if (!hero) return;
  hero.offlineActive = false;
  hero.offlineZoneId = null;
  hero.offlineCityId = null;
  hero.offlineZoneName = null;
  hero.offlineStartTime = null;
  hero.offlineElapsedTotal = null;
  hero.offlineCounters = null;
  hero.offlineLog = null;
  hero.offlineLogTimer = 0;
  // Сбрасываем накопители дисплея, чтобы следующая сессия начиналась с нуля
  try {
    if (state) {
      state._offlineTimerShown = 0;
    }
    if (window._offlineResetCounters) window._offlineResetCounters();
  } catch (e) {}
  try { localStorage.removeItem(offlineKey()); } catch (e) {}
}

export function saveOfflineLocal(state) {
  const hero = state.hero;
  if (!hero || !hero.offlineActive) {
    try { localStorage.removeItem(offlineKey()); } catch (e) {}
    return;
  }
  try {
    localStorage.setItem(offlineKey(), JSON.stringify({
      active: true,
      zoneId: hero.offlineZoneId,
      cityId: hero.offlineCityId,
      zoneName: hero.offlineZoneName,
      startTime: hero.offlineStartTime,
      elapsedTotal: hero.offlineElapsedTotal || 0,
      counters: hero.offlineCounters || {},
      hp: hero.hp,
      maxHp: hero.maxHp,
      dead: hero.dead,
      log: hero.offlineLog || [],
    }));
  } catch (e) {}
}