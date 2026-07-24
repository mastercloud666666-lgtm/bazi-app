// js/auth.js
// Username + email + password auth with lightweight points system.
(function initBaziAccountAuth() {
  if (window.__BAZI_AUTH_READY) return;
  window.__BAZI_AUTH_READY = true;

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const WELCOME_POINTS = 50;
  const LOCAL_POINTS_PREFIX = 'bazi_points_local_';
  const LOCAL_WELCOME_FLAG_PREFIX = 'bazi_points_welcome_flag_';

  let client = null;
  let authUser = null;
  let statusEl = null;
  let actionBtn = null;
  let pointsSyncing = false;

  function ensureClient() {
    if (client) return client;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.error('Supabase JS not loaded.');
      return null;
    }
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      },
    });
    return client;
  }

  function normalizeEmailInput(raw) {
    return (raw || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[＠﹫]/g, '@')
      .replace(/[。．｡]/g, '.')
      .toLowerCase();
  }

  function isLikelyEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function toSafeInt(value, fallback = 0) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
  }

  function getUserStorageKey(user) {
    if (!user) return '';
    return user.id || user.email || '';
  }

  function getLocalPointsKey(user) {
    const key = getUserStorageKey(user);
    if (!key) return '';
    return `${LOCAL_POINTS_PREFIX}${key}`;
  }

  function getLocalWelcomeFlagKey(user) {
    const key = getUserStorageKey(user);
    if (!key) return '';
    return `${LOCAL_WELCOME_FLAG_PREFIX}${key}`;
  }

  function readLocalPoints(user) {
    const key = getLocalPointsKey(user);
    if (!key) return 0;
    try {
      return toSafeInt(localStorage.getItem(key), 0);
    } catch {
      return 0;
    }
  }

  function writeLocalPoints(user, points) {
    const key = getLocalPointsKey(user);
    if (!key) return;
    try {
      localStorage.setItem(key, String(toSafeInt(points, 0)));
    } catch {}
  }

  function getPointsFromMetadata(user) {
    if (!user) return null;
    const raw = user.user_metadata?.points;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  }

  function getCurrentPoints(user = authUser) {
    const fromMeta = getPointsFromMetadata(user);
    if (fromMeta !== null) {
      writeLocalPoints(user, fromMeta);
      return fromMeta;
    }
    return readLocalPoints(user);
  }

  function dispatchAuthState() {
    window.dispatchEvent(
      new CustomEvent('bazi-auth-state', {
        detail: {
          user: authUser || null,
          points: getCurrentPoints(authUser),
        },
      })
    );
  }

  function getUserDisplayText() {
    if (!authUser) return '未登录';
    const name =
      authUser.user_metadata?.username ||
      authUser.user_metadata?.display_name ||
      '';
    const base = name ? `${name} (${authUser.email || ''})` : authUser.email || '已登录';
    return `${base} · 积分 ${getCurrentPoints(authUser)}`;
  }

  function renderAuthState() {
    if (!statusEl || !actionBtn) return;
    if (authUser && authUser.email) {
      statusEl.textContent = getUserDisplayText();
      actionBtn.textContent = '退出';
      actionBtn.style.background = '#FEE2E2';
      actionBtn.style.color = '#991B1B';
      actionBtn.style.borderColor = '#FECACA';
    } else {
      statusEl.textContent = '未登录';
      actionBtn.textContent = '登录/注册';
      actionBtn.style.background = '#EFF6FF';
      actionBtn.style.color = '#1D4ED8';
      actionBtn.style.borderColor = '#BFDBFE';
    }
  }

  async function refreshUser() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    authUser = data?.session?.user || null;
    renderAuthState();
    dispatchAuthState();
    return authUser;
  }

  async function ensureWelcomePoints() {
    const supabaseClient = ensureClient();
    if (!supabaseClient || !authUser) return authUser;
    if (pointsSyncing) return authUser;

    const metadata = authUser.user_metadata || {};
    const initialized = metadata.points_initialized === true;
    const currentMetaPoints = getPointsFromMetadata(authUser);
    if (initialized && currentMetaPoints !== null) {
      writeLocalPoints(authUser, currentMetaPoints);
      return authUser;
    }

    pointsSyncing = true;
    try {
      const localPoints = readLocalPoints(authUser);
      const safeCurrent = currentMetaPoints !== null ? currentMetaPoints : localPoints;
      const nextPoints = safeCurrent > 0 ? safeCurrent : WELCOME_POINTS;
      const nextMeta = {
        ...metadata,
        points: nextPoints,
        points_initialized: true,
      };
      if (!initialized) {
        nextMeta.points_welcome_awarded_at = new Date().toISOString();
      }

      const { data, error } = await supabaseClient.auth.updateUser({ data: nextMeta });
      if (!error && data?.user) {
        authUser = data.user;
        writeLocalPoints(authUser, nextPoints);
        renderAuthState();
        dispatchAuthState();
        return authUser;
      }

      // Fallback to local points when metadata update is unavailable.
      const welcomeKey = getLocalWelcomeFlagKey(authUser);
      if (welcomeKey && !localStorage.getItem(welcomeKey)) {
        writeLocalPoints(authUser, nextPoints);
        localStorage.setItem(welcomeKey, '1');
        renderAuthState();
        dispatchAuthState();
      }
      return authUser;
    } finally {
      pointsSyncing = false;
    }
  }

  function parseAuthErrorMessage(error) {
    const msg = error?.message || '未知错误';
    if (/Invalid login credentials/i.test(msg)) {
      return '邮箱或密码错误';
    }
    if (/User already registered/i.test(msg)) {
      return '该邮箱已注册，请直接登录';
    }
    if (/Email not confirmed/i.test(msg)) {
      return '当前 Supabase 仍开启邮箱确认，请在后台关闭后再试。';
    }
    if (/Password should be at least 6 characters/i.test(msg)) {
      return '密码至少 6 位';
    }
    if (/429|rate limit|too many/i.test(msg)) {
      return '请求过于频繁，请稍后再试';
    }
    return msg;
  }

  function openAccountAuthModal() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(15,23,42,0.55)',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'z-index:10000',
        'padding:16px',
      ].join(';');

      const card = document.createElement('div');
      card.style.cssText = [
        'width:min(92vw,420px)',
        'background:#fff',
        'border-radius:14px',
        'border:1px solid #E2E8F0',
        'padding:18px',
        'box-shadow:0 20px 45px rgba(0,0,0,0.25)',
      ].join(';');

      const title = document.createElement('h3');
      title.textContent = '账号登录/注册';
      title.style.cssText = 'margin:0 0 6px;color:#0A2540;font-size:19px;';

      const desc = document.createElement('p');
      desc.textContent = '使用用户名、邮箱、密码完成登录或注册（无需邮箱验证码）。';
      desc.style.cssText = 'margin:0 0 12px;color:#64748B;font-size:13px;line-height:1.6;';

      const usernameInput = document.createElement('input');
      usernameInput.type = 'text';
      usernameInput.placeholder = '用户名（注册必填）';
      usernameInput.autocomplete = 'username';
      usernameInput.style.cssText =
        'width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px;';

      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = 'name@example.com';
      emailInput.autocomplete = 'email';
      emailInput.style.cssText =
        'width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px;';

      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.placeholder = '密码（至少 6 位）';
      passwordInput.autocomplete = 'current-password';
      passwordInput.style.cssText =
        'width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px;';

      const errorText = document.createElement('div');
      errorText.style.cssText = 'min-height:18px;font-size:12px;color:#B91C1C;margin-bottom:8px;';

      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.textContent = '登录';
      loginBtn.style.cssText =
        'padding:10px 8px;border-radius:10px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:600;cursor:pointer;';

      const registerBtn = document.createElement('button');
      registerBtn.type = 'button';
      registerBtn.textContent = '注册';
      registerBtn.style.cssText =
        'padding:10px 8px;border-radius:10px;border:1px solid #BBF7D0;background:#F0FDF4;color:#15803D;font-size:13px;font-weight:600;cursor:pointer;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = '取消';
      cancelBtn.style.cssText =
        'margin-top:10px;width:100%;padding:10px 8px;border-radius:10px;border:1px solid #E2E8F0;background:#fff;color:#64748B;font-size:13px;cursor:pointer;';

      const close = (result) => {
        document.removeEventListener('keydown', onEsc);
        overlay.remove();
        resolve(result || null);
      };

      const submit = (mode) => {
        const username = (usernameInput.value || '').trim();
        const email = normalizeEmailInput(emailInput.value);
        const password = (passwordInput.value || '').trim();

        if (mode === 'register' && username.length < 2) {
          errorText.textContent = '用户名至少 2 位';
          return;
        }
        if (!isLikelyEmail(email)) {
          errorText.textContent = '邮箱格式不正确';
          return;
        }
        if (password.length < 6) {
          errorText.textContent = '密码至少 6 位';
          return;
        }
        close({ mode, username, email, password });
      };

      const onEsc = (evt) => {
        if (evt.key === 'Escape') close(null);
      };

      loginBtn.addEventListener('click', () => submit('login'));
      registerBtn.addEventListener('click', () => submit('register'));
      cancelBtn.addEventListener('click', () => close(null));
      overlay.addEventListener('click', (evt) => {
        if (evt.target === overlay) close(null);
      });

      document.addEventListener('keydown', onEsc);
      row.appendChild(loginBtn);
      row.appendChild(registerBtn);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(usernameInput);
      card.appendChild(emailInput);
      card.appendChild(passwordInput);
      card.appendChild(errorText);
      card.appendChild(row);
      card.appendChild(cancelBtn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      emailInput.focus();
    });
  }

  async function signInWithPassword(email, password) {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      alert(`登录失败：${parseAuthErrorMessage(error)}`);
      return null;
    }
    authUser = data?.user || data?.session?.user || null;
    await ensureWelcomePoints();
    renderAuthState();
    dispatchAuthState();
    return authUser;
  }

  async function registerWithPassword(username, email, password) {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          display_name: username,
        },
      },
    });

    if (error) {
      alert(`注册失败：${parseAuthErrorMessage(error)}`);
      return null;
    }

    if (data?.session?.user || data?.user) {
      authUser = data.session?.user || data.user;
      await ensureWelcomePoints();
      renderAuthState();
      dispatchAuthState();
      alert('注册成功，已登录。');
      return authUser;
    }

    // Some projects keep "Confirm email" enabled. Try password login once.
    const user = await signInWithPassword(email, password);
    if (user) {
      alert('注册成功，已登录。');
      return user;
    }
    alert('注册完成，但当前项目可能开启了邮箱确认，请在 Supabase 关闭后再试。');
    return null;
  }

  async function promptAccountAuth() {
    const req = await openAccountAuthModal();
    if (!req) return null;
    if (req.mode === 'register') {
      return await registerWithPassword(req.username, req.email, req.password);
    }
    return await signInWithPassword(req.email, req.password);
  }

  async function signOut() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    authUser = null;
    renderAuthState();
    dispatchAuthState();
  }

  async function consumePoints(amount, reason = '') {
    const supabaseClient = ensureClient();
    if (!supabaseClient) {
      return { ok: false, reason: 'client_unavailable', message: '登录服务未就绪' };
    }
    if (!authUser) {
      return { ok: false, reason: 'not_logged_in', message: '请先登录账号' };
    }

    const need = toSafeInt(amount, 0);
    if (need <= 0) {
      return { ok: true, points: getCurrentPoints(authUser) };
    }

    await refreshUser();
    await ensureWelcomePoints();

    const points = getCurrentPoints(authUser);
    if (points < need) {
      return {
        ok: false,
        reason: 'insufficient',
        points,
        message: `积分不足，当前仅 ${points} 积分`,
      };
    }

    const nextPoints = points - need;
    const currentMeta = authUser.user_metadata || {};
    const nextMeta = {
      ...currentMeta,
      points: nextPoints,
      points_initialized: true,
      points_last_consume_at: new Date().toISOString(),
    };
    if (reason) nextMeta.points_last_consume_reason = String(reason);

    const { data, error } = await supabaseClient.auth.updateUser({ data: nextMeta });
    if (error || !data?.user) {
      return {
        ok: false,
        reason: 'update_failed',
        points,
        message: parseAuthErrorMessage(error),
      };
    }

    authUser = data.user;
    writeLocalPoints(authUser, nextPoints);
    renderAuthState();
    dispatchAuthState();
    return { ok: true, points: nextPoints };
  }

  function mountAuthWidget() {
    const navbarRight = document.querySelector('.navbar-right');
    if (!navbarRight || document.getElementById('auth-action-btn')) return;

    const wrap = document.createElement('div');
    wrap.style.cssText = [
      'display:flex',
      'align-items:center',
      'gap:8px',
      'margin-right:8px',
    ].join(';');

    statusEl = document.createElement('span');
    statusEl.id = 'auth-status-text';
    statusEl.style.cssText =
      'font-size:12px;color:#64748B;max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    actionBtn = document.createElement('button');
    actionBtn.id = 'auth-action-btn';
    actionBtn.type = 'button';
    actionBtn.style.cssText = [
      'padding:6px 10px',
      'border-radius:8px',
      'border:1px solid #BFDBFE',
      'font-size:12px',
      'font-weight:600',
      'cursor:pointer',
    ].join(';');

    actionBtn.addEventListener('click', async () => {
      if (authUser) {
        await signOut();
        return;
      }
      await promptAccountAuth();
    });

    wrap.appendChild(statusEl);
    wrap.appendChild(actionBtn);
    navbarRight.prepend(wrap);
    renderAuthState();
  }

  // Keep compatibility with existing payment flow.
  window.getAuthUser = function getAuthUser() {
    return authUser;
  };

  window.requireEmailLogin = async function requireEmailLogin() {
    if (authUser) return authUser;
    return await promptAccountAuth();
  };

  window.getUserPoints = function getUserPoints() {
    return getCurrentPoints(authUser);
  };

  window.getUserPointsAsync = async function getUserPointsAsync() {
    if (!authUser) {
      await refreshUser();
    }
    if (!authUser) return 0;
    await ensureWelcomePoints();
    return getCurrentPoints(authUser);
  };

  window.consumeUserPoints = async function consumeUserPoints(amount, reason) {
    return await consumePoints(amount, reason);
  };

  window.ensureWelcomePoints = async function ensureWelcomePointsPublic() {
    if (!authUser) {
      await refreshUser();
    }
    if (!authUser) return null;
    return await ensureWelcomePoints();
  };

  window.BAZI_WELCOME_POINTS = WELCOME_POINTS;

  document.addEventListener('DOMContentLoaded', async () => {
    mountAuthWidget();
    const supabaseClient = ensureClient();
    if (!supabaseClient) return;
    await refreshUser();
    await ensureWelcomePoints();
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      authUser = session?.user || null;
      renderAuthState();
      dispatchAuthState();
      if (authUser) {
        await ensureWelcomePoints();
      }
      renderAuthState();
      dispatchAuthState();
    });
  });
})();
