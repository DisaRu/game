// supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// URL/ключ можно переопределить без правки кода:
// localStorage.setItem('supabase_url', 'https://<новая-проек>.supabase.co')
// localStorage.setItem('supabase_key', '<publishable-ключ>')
function readLS(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

const SUPABASE_URL = readLS('supabase_url') || 'https://gmsanrysorhxzaeurjqg.supabase.co';
export const SUPABASE_ANON_KEY = readLS('supabase_key') || 'sb_publishable_5WzcM1D9aJOXTdBsMUJoAA_H03L67KL';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  // supabase-js v2 берёт реализацию fetch ТОЛЬКО из global.fetch
  // Таймаут запросов — чтобы "вечное ожидание" превращалось в понятную ошибку
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      return fetch(url, { ...options, signal: options.signal || controller.signal })
        .finally(() => clearTimeout(timer));
    },
  },
});