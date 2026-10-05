// offline.js
// Офлайн-фарм: НЕ симулируем. Просто помечаем героя как "занят",
// а обычный бой продолжает идти через update(dt).

export const OFFLINE_MAX_HOURS = 8;

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
  hero.offlineStartGold = state.gold;
  hero.offlineStartStats = { ...state.sessionStats };
  hero.offlineLog = [{ time: 0, text: `💤 Офлайн начат в ${zone.name}`, type: 'progress' }];
  hero.offlineLogTimer = 0;

  return { ok: true };
}

export function getOfflineStatus(state) {
  const hero = state.hero;
  if (!hero || !hero.offlineActive) return null;

  const elapsedMs = Date.now() - (hero.offlineStartTime || Date.now());
  const sec = Math.floor(elapsedMs / 1000);

  const s = state.sessionStats || {};
  const startS = hero.offlineStartStats || { gold: 0, xp: 0, kills: 0, items: 0, scrolls: 0, blessed: 0 };

  const weaponGrade = hero.equipment.weapon?.grade;
  const soulshotsLeft = weaponGrade ? (hero.soulshots[weaponGrade] || 0) : 0;
  const potionsLeft = Object.values(hero.potions || {}).reduce((a, b) => a + b, 0);

  return {
    zoneName: hero.offlineZoneName || '—',
    seconds: sec,
    maxSeconds: OFFLINE_MAX_HOURS * 3600,
    gold: (s.gold || 0) - (startS.gold || 0),
    xp: (s.xp || 0) - (startS.xp || 0),
    kills: (s.kills || 0) - (startS.kills || 0),
    items: (s.items || 0) - (startS.items || 0),
    scrolls: (s.scrolls || 0) - (startS.scrolls || 0),
    blessed: (s.blessed || 0) - (startS.blessed || 0),
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
  hero.offlineStartStats = null;
  hero.offlineStartGold = null;
  hero.offlineLog = null;
  hero.offlineLogTimer = 0;
}