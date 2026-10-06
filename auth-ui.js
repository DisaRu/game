// auth-ui.js
import { signUp, signIn, signOut, getCurrentUser, onAuthChange } from './auth.js';
import { setUserId, loadProgress } from './save.js';

let callbacks = {};
let currentUser = null;
let handlingUser = false; // защита от параллельных INITIAL_SESSION + SIGNED_IN

export function getAuthUser() {
  return currentUser;
}

function loginToEmail(login) {
  const clean = login.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return clean + '@game.local';
}

async function handleUser(user) {
  // Уже инициализированы этим пользователем — пропускаем повторные события
  if (handlingUser && currentUser && user && currentUser.id === user.id) return;
  handlingUser = true;
  currentUser = user;
  const loadingEl = document.getElementById('loading-screen');

  if (!user) {
    handlingUser = false;
    if (loadingEl) loadingEl.classList.add('hidden');
    renderAuthScreen();
    return;
  }

  // Показываем плашку с таймером
  if (loadingEl) {
    loadingEl.classList.remove('hidden');
    const box = loadingEl.querySelector('.loading-box');
    if (box) {
      box.innerHTML = `
        <div class="loading-icon">⏳</div>
        <div class="loading-text">Загрузка героя...</div>
        <div class="loading-timer" id="load-timer" style="font-size:11px;color:#94a3b8;margin-top:6px;">0.0 сек</div>
      `;
    }
  }

  const t0 = Date.now();
  const timerInt = setInterval(() => {
    const el = document.getElementById('load-timer');
    if (el) el.textContent = ((Date.now() - t0) / 1000).toFixed(1) + ' сек';
  }, 100);

  setUserId(user.id, user.email);
  const result = await loadProgress();
  clearInterval(timerInt);

  if (loadingEl) loadingEl.classList.add('hidden');
  updateAccountUI(user);

  try {
    if (result.ok && result.save && result.save.hero) {
      if (callbacks.onLoadProgress) callbacks.onLoadProgress(result.save);
    } else {
      // Нет сейва (или ошибка загрузки без бэкапа) — новый игрок
      if (callbacks.onNewPlayer) callbacks.onNewPlayer(user);
    }
  } finally {
    handlingUser = false;
  }
}

export function initAuth(cb = {}) {
  callbacks = cb;

  onAuthChange(async (event, user) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      await handleUser(user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      handlingUser = false;
      renderAuthScreen();
    }
  });
}

function renderAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (!el) return;

  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) loadingEl.classList.add('hidden');

  el.classList.remove('hidden');

  const classSel = document.getElementById('class-select');
  if (classSel) classSel.classList.add('hidden');
  const cityScr = document.getElementById('city-screen');
  if (cityScr) cityScr.classList.add('hidden');
  const bottomPanel = document.getElementById('bottom-panel');
  if (bottomPanel) bottomPanel.classList.add('hidden');

  el.innerHTML = `
    <div class="auth-box">
      <h1 class="auth-title">Auto L2</h1>
      <p class="auth-sub">Вход или регистрация</p>
      <input type="text" id="auth-login" placeholder="Логин (a-z, 0-9, _)" autocomplete="username" maxlength="16">
      <input type="password" id="auth-pass" placeholder="Пароль (мин. 6)" autocomplete="current-password">
      <div class="auth-buttons">
        <button class="auth-btn auth-btn-primary" id="auth-login-btn">Войти</button>
        <button class="auth-btn" id="auth-signup-btn">Регистрация</button>
      </div>
      <div class="auth-error" id="auth-error"></div>
    </div>
  `;

  const loginBtn = document.getElementById('auth-login-btn');
  const signupBtn = document.getElementById('auth-signup-btn');
  const errEl = document.getElementById('auth-error');
  const loginInput = document.getElementById('auth-login');
  const passInput = document.getElementById('auth-pass');

  function setStatus(btn, text) {
    btn.textContent = text;
    loginBtn.disabled = true;
    signupBtn.disabled = true;
  }
  function resetStatus() {
    loginBtn.textContent = 'Войти';
    signupBtn.textContent = 'Регистрация';
    loginBtn.disabled = false;
    signupBtn.disabled = false;
  }
  function showErr(msg) {
    errEl.textContent = msg;
    errEl.style.color = '#dc2626';
  }

  // Ошибки Supabase -> понятный текст (префиксы ставит friendlyError в auth.js)
  function showError(result) {
    const code = (result.error || '').split(':')[0];
    const raw = (result.raw || result.error || '').toString();
    if (code === 'already') showErr('Такой логин уже занят — просто нажми «Войти»');
    else if (code === 'weak') showErr('Пароль минимум 6 символов');
    else if (code === 'badcreds') showErr('Неверный логин или пароль');
    else if (code === 'confirm') showErr('Нужно подтвердить email (или отключи Confirm email в дашборде)');
    else if (code === 'PROJ' || code === 'PROJ_422') showErr('Проект Supabase отклоняет запрос: ' + raw.replace(/^PROJ(_422)?:\s*/, ''));
    else if (code === 'AUTH_KEY') showErr('Ключ API не подходит к проекту (401/403)');
    else if (code === 'limit') showErr('Слишком много попыток, подожди минуту');
    else if (code === 'timeout') showErr('Сервер не отвечает (15 сек)');
    else if (/network|fetch|Failed to fetch/i.test(raw)) showErr('Ошибка сети (проверь интернет/VPN)');
    else showErr(raw || 'Неизвестная ошибка');
  }

  loginBtn.onclick = async () => {
    const login = loginInput.value.trim();
    const password = passInput.value;
    if (!login || !password) { showErr('Заполни логин и пароль'); return; }
    showErr('');
    setStatus(loginBtn, '⏳ Вход...');
    const email = loginToEmail(login);
    const result = await signIn(email, password);
    if (!result.ok) {
      resetStatus();
      showError(result);
    } else {
      setStatus(loginBtn, '✅ Вошёл');
    }
  };

  signupBtn.onclick = async () => {
    const login = loginInput.value.trim();
    const password = passInput.value;
    if (!login) { showErr('Введи логин'); return; }
    if (login.length < 3) { showErr('Логин мин. 3 символа'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(login)) { showErr('Только буквы, цифры, _'); return; }
    if (password.length < 6) { showErr('Пароль мин. 6 символов'); return; }
    showErr('');
    setStatus(signupBtn, '⏳ Регистрация...');
    const email = loginToEmail(login);
    const result = await signUp(email, password);
    if (!result.ok) {
      resetStatus();
      showError(result);
    } else {
      setStatus(signupBtn, '✅ Готово');
      // При включённом autoconfirm signUp/signIn сразу возвращают сессию,
      // вход произойдёт автоматически через onAuthChange.
      if (!result.session) {
        showErr('Аккаунт создан, но нужно подтвердить email (или отключи Confirm email в дашборде)');
      }
    }
  };

  // Enter
  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
  });
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) el.textContent = msg;
}

function updateAccountUI(user) {
  const el = document.getElementById('account-info');
  if (!el) return;
  if (!user) {
    el.classList.remove('visible');
    el.innerHTML = '';
    return;
  }
  const login = user.email.replace('@game.local', '');
  el.innerHTML = `
    <div class="acc-email">👤 ${login}</div>
    <button class="acc-logout" id="acc-logout">Выйти</button>
  `;
  el.classList.add('visible');
  document.getElementById('acc-logout').onclick = async () => {
    await signOut();
    location.reload();
  };
}