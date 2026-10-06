// auth.js
import { supabase } from './supabase.js';

// Человекочитаемая ошибка по ответу Supabase Auth
function friendlyError(err) {
  const msg = (err && err.message) || 'unknown error';
  const status = err && (err.status || err.code);

  // Сетевые/таймаутные сбои
  if (/abort/i.test(msg)) return 'timeout: сервер не ответил за 15 секунд';

  // Текстовые коды GoTrue — проверяем раньше HTTP-статусов,
  // т.к. 401/400 может приходить и по неверным кредлам, и по истёкшей сессии
  if (/already registered|user_already_exists/i.test(msg)) return 'already: Такой логин уже занят — просто войди';
  if (/at least 6 characters|weak_password/i.test(msg)) return 'weak: Пароль минимум 6 символов';
  if (/invalid login credentials|invalid_credentials/i.test(msg)) return 'badcreds: Неверный логин или пароль';
  if (/email not confirmed|not confirmed/i.test(msg)) return 'confirm: Нужно подтвердить email';
  if (/signups not allowed|signup disabled|anonymous sign-ins are disabled/i.test(msg)) return 'PROJ: Регистрация отключена в настройках проекта';
  if (/rate limit|too many requests|over.*capacity/i.test(msg)) return 'limit: Слишком много попыток, подожди минуту';

  // Ключ проекта не подходит
  if (status === 401 || status === 403) return `AUTH_KEY: ${msg}`;
  if (status === 422) return `PROJ_422: ${msg}`;

  return msg;
}

export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    // 422 user_already_exists при autoconfirm: аккаунт уже есть — пробуем войти
    if (error && /already registered|user_already_exists/i.test(error.message || '')) {
      const retry = await supabase.auth.signInWithPassword({ email, password });
      if (!retry.error && retry.data.session) return { ok: true, user: retry.data.user, session: retry.data.session };
      if (retry.error) return { ok: false, error: friendlyError(retry.error), raw: retry.error.message };
      return { ok: false, error: 'confirm: Аккаунт существует, но вход не выполнен (проверь подтверждение email)', raw: 'no session' };
    }
    if (error) return { ok: false, error: friendlyError(error), raw: error.message };
    // При mailer_autoconfirm сессия приходит сразу в ответе signUp
    if (!data.user) return { ok: false, error: 'PROJ: сервер вернул пустой ответ на регистрацию', raw: 'empty user' };
    return { ok: true, user: data.user, session: data.session || null };
  } catch (e) {
    return { ok: false, error: friendlyError(e), raw: e && e.message };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: friendlyError(error), raw: error.message };
    return { ok: true, user: data.user };
  } catch (e) {
    return { ok: false, error: friendlyError(e), raw: e && e.message };
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

export function onAuthChange(cb) {
  supabase.auth.onAuthStateChange((event, session) => {
    cb(event, session?.user || null);
  });
}