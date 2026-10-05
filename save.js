// save.js
import { supabase } from './supabase.js';

let currentUserId = null;

export function setUserId(id) {
  currentUserId = id;
}

export function getUserId() {
  return currentUserId;
}

export async function saveProgress(state) {
  if (!currentUserId) return { ok: false, reason: 'not_logged_in' };
  if (!state.hero) return { ok: false, reason: 'no_hero' };

  const { error } = await supabase
    .from('players')
    .upsert({
      id: currentUserId,
      email: (await supabase.auth.getUser()).data?.user?.email || '',
      gold: state.gold,
      current_city: state.currentCity,
      current_zone_id: state.currentZone?.id || null,
      in_battle: state.inBattle && !state.hero.dead,
      hero_data: { hero: state.hero },
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}

export async function loadProgress() {
  if (!currentUserId) return { ok: false, reason: 'not_logged_in' };

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', currentUserId)
    .maybeSingle();

  if (error) return { ok: false, reason: 'error', error: error.message };
  if (!data) return { ok: false, reason: 'no_save' };

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
}