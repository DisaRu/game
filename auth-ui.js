// auth-ui.js
import { signUp, signIn, signOut, onAuthChange } from './auth.js';
import { setUserId, loadProgress } from './save.js';

let callbacks = {};
let currentUser = null;

export function getAuthUser() {
  return currentUser;
}

function loginToEmail(login) {
  const clean = login.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return clean + '@game.local';
}

async function handleUser(user) {
  currentUser = user;
  const loadingEl = document.getElementById('loading-screen');

  if (!user) {
    if (loadingEl) loadingEl.classList.add('hidden');
    renderAuthScreen();
    return;
  }

  setUserId(user.id);
  const result = await loadProgress();

  if (loadingEl) loadingEl.classList.add('hidden');

  if (result.ok) {
    if (callbacks.onLoadProgress) callbacks.onLoadProgress(result.save);
  } else if (result.reason === 'no_save') {
    if (callbacks.onNewPlayer) callbacks.onNewPlayer(user);
  } else {
    console.error('loadProgress error:', result);
    if (callbacks.onNewPlayer) callbacks.onNewPlayer(user);
  }

  updateAccountUI(user);
}

export function initAuth(cb = {}) {
  callbacks = cb;

  onAuthChange(async (event, user) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      await handleUser(user);
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      renderAuthScreen();
    }
  });
}

function renderAuthScreen() {
    function renderAuthScreen() {
  const el = document.getElementById('auth-screen');
  if (!el) return;

  const loadingEl = document.getElementById('loading-screen');
  if (loadingEl) loadingEl.classList.add('hidden');

  el.classList.remove('hidden');
  // ...
}
    const loadingEl = document.getElementById('loading-screen');
if (loadingEl) loadingEl.classList.add('hidden');
  const el = document.getElementById('auth-screen');
  if (!el) return;
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

  document.getElementById('auth-login-btn').onclick = async () => {
    const login = document.getElementById('auth-login').value.trim();
    const password = document.getElementById('auth-pass').value;
    if (!login || !password) { showAuthError('Заполни логин и пароль'); return; }
    const email = loginToEmail(login);
    const result = await signIn(email, password);
    if (!result.ok) showAuthError('Неверный логин или пароль');
  };

  document.getElementById('auth-signup-btn').onclick = async () => {
    const login = document.getElementById('auth-login').value.trim();
    const password = document.getElementById('auth-pass').value;
    if (!login) { showAuthError('Введи логин'); return; }
    if (login.length < 3) { showAuthError('Логин мин. 3 символа'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(login)) { showAuthError('Только буквы, цифры, _'); return; }
    if (password.length < 6) { showAuthError('Пароль мин. 6 символов'); return; }
    const email = loginToEmail(login);
    const result = await signUp(email, password);
    if (!result.ok) {
      if (result.error.includes('already registered')) showAuthError('Логин занят');
      else showAuthError(result.error);
    }
  };
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