// save.js
import { supabase } from './supabase.js';

let currentUserId = null;
let currentUserEmail = '';
let saveInProgress = false;

export function setUserId(id, email) {
  currentUserId = id;
  if (email) currentUserEmail = email;
}

export function getUserId() {
  return currentUserId;
}

function backupKey() {
  return 'hero_backup_' + currentUserId;
}

export function saveLocalBackup(state) {
  if (!currentUserId) return;
  try {
    localStorage.setItem(backupKey(), JSON.stringify({
      hero: state.hero,
      gold: state.gold,
      currentCity: state.currentCity,
      currentZoneId: state.currentZone?.id || null,
      inBattle: state.inBattle && !state.hero?.dead,
      savedAt: Date.now(),
    }));
  } catch (e) {}
}

export function loadLocalBackup() {
  if (!currentUserId) return null;
  try {
    const raw = localStorage.getItem(backupKey());
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}
export async function saveProgress(state) {
  if (!currentUserId) return { ok: false, reason: 'not_logged_in' };
  if (!state.hero) return { ok: false, reason: 'no_hero' };

  saveLocalBackup(state);

  if (saveInProgress) return { ok: false, reason: 'in_progress' };
  saveInProgress = true;

  try {
    // supabase-js сам подставит apikey и Authorization из текущей сессии
    const { error } = await supabase
      .from('players')
      .upsert({
        id: currentUserId,
        email: currentUserEmail,
        gold: state.gold,
        current_city: state.currentCity,
        current_zone_id: state.currentZone?.id || null,
        in_battle: state.inBattle && !state.hero.dead,
        hero_data: { hero: state.hero },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message || 'network_error' };
  } finally {
    saveInProgress = false;
  }
}

export async function loadProgress() {
  if (!currentUserId) return { ok: false, reason: 'not_logged_in' };

  try {
    // supabase-js сам подставит apikey и Authorization из текущей сессии
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', currentUserId)
      .maybeSingle();

    if (error) {
      const backup = loadLocalBackup();
      if (backup) return { ok: true, save: backup, fromLocal: true };
      return { ok: false, reason: 'error', error: error.message };
    }

    if (!data) {
      const backup = loadLocalBackup();
      if (backup) return { ok: true, save: backup, fromLocal: true };
      return { ok: false, reason: 'no_save' };
    }

    currentUserEmail = data.email || currentUserEmail;

    return {
      ok: true,
      save: {
        gold: data.gold,
        currentCity: data.current_city,
        currentZoneId: data.current_zone_id,
        inBattle: data.in_battle,
        hero: data.hero_data?.hero || null,
      },
    };
  } catch (e) {
    const backup = loadLocalBackup();
    if (backup) return { ok: true, save: backup, fromLocal: true };
    return { ok: false, reason: 'error', error: e.message };
  }
}