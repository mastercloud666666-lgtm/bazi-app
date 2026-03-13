// js/auth.js
// Lightweight email auth powered by Supabase Auth (OTP / magic-link).
(function initBaziEmailAuth() {
  if (window.__BAZI_AUTH_READY) return;
  window.__BAZI_AUTH_READY = true;

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

  let client = null;
  let authUser = null;
  let statusEl = null;
  let actionBtn = null;

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

  function renderAuthState() {
    if (!statusEl || !actionBtn) return;
    if (authUser && authUser.email) {
      statusEl.textContent = authUser.email;
      actionBtn.textContent = '\u9000\u51fa';
      actionBtn.style.background = '#FEE2E2';
      actionBtn.style.color = '#991B1B';
      actionBtn.style.borderColor = '#FECACA';
    } else {
      statusEl.textContent = '\u672a\u767b\u5f55';
      actionBtn.textContent = '\u767b\u5f55/\u6ce8\u518c';
      actionBtn.style.background = '#EFF6FF';
      actionBtn.style.color = '#1D4ED8';
      actionBtn.style.borderColor = '#BFDBFE';
    }
  }

  function dispatchAuthState() {
    window.dispatchEvent(
      new CustomEvent('bazi-auth-state', {
        detail: { user: authUser || null },
      })
    );
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

  function normalizeEmailInput(raw) {
    return (raw || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/＠/g, '@')
      .replace(/[。｡]/g, '.')
      .toLowerCase();
  }

  function isLikelyEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function openEmailAuthModal() {
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
      title.textContent = '\u90ae\u7bb1\u8d26\u53f7';
      title.style.cssText = 'margin:0 0 6px;color:#0A2540;font-size:19px;';

      const desc = document.createElement('p');
      desc.textContent = '\u9996\u6b21\u4f7f\u7528\u8bf7\u5148\u6ce8\u518c\uff0c\u5df2\u6709\u8d26\u53f7\u9009\u62e9\u767b\u5f55\u3002';
      desc.style.cssText = 'margin:0 0 12px;color:#64748B;font-size:13px;';

      const input = document.createElement('input');
      input.type = 'email';
      input.placeholder = 'name@example.com';
      input.autocomplete = 'email';
      input.style.cssText = [
        'width:100%',
        'padding:10px 12px',
        'border:1px solid #CBD5E1',
        'border-radius:10px',
        'font-size:14px',
        'outline:none',
        'margin-bottom:10px',
      ].join(';');

      const errorText = document.createElement('div');
      errorText.style.cssText = 'min-height:18px;font-size:12px;color:#B91C1C;margin-bottom:8px;';

      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.textContent = '\u53d1\u9001\u767b\u5f55\u94fe\u63a5';
      loginBtn.style.cssText = 'padding:10px 8px;border-radius:10px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:600;cursor:pointer;';

      const registerBtn = document.createElement('button');
      registerBtn.type = 'button';
      registerBtn.textContent = '\u6ce8\u518c\u5e76\u767b\u5f55';
      registerBtn.style.cssText = 'padding:10px 8px;border-radius:10px;border:1px solid #BBF7D0;background:#F0FDF4;color:#15803D;font-size:13px;font-weight:600;cursor:pointer;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = '\u53d6\u6d88';
      cancelBtn.style.cssText = 'margin-top:10px;width:100%;padding:10px 8px;border-radius:10px;border:1px solid #E2E8F0;background:#fff;color:#64748B;font-size:13px;cursor:pointer;';

      const close = (result) => {
        document.removeEventListener('keydown', onEsc);
        overlay.remove();
        resolve(result || null);
      };

      const submit = (mode) => {
        const email = normalizeEmailInput(input.value);
        if (!email) {
          errorText.textContent = '\u8bf7\u5148\u8f93\u5165\u90ae\u7bb1';
          return;
        }
        if (!isLikelyEmail(email)) {
          errorText.textContent = '\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u793a\u4f8b\uff1aname@example.com';
          return;
        }
        close({ mode, email });
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
      card.appendChild(input);
      card.appendChild(errorText);
      card.appendChild(row);
      card.appendChild(cancelBtn);
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      input.focus();
    });
  }

  async function sendLoginEmail() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) {
      alert('\u767b\u5f55\u7ec4\u4ef6\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u91cd\u8bd5');
      return null;
    }

    const authRequest = await openEmailAuthModal();
    if (!authRequest) return null;

    const redirectTo = `${location.origin}${location.pathname}${location.search}`;
    const shouldCreateUser = authRequest.mode === 'register';
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: authRequest.email,
      options: {
        shouldCreateUser,
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      if (!shouldCreateUser) {
        alert(`\u767b\u5f55\u5931\u8d25\uff1a${error.message}\n\n\u82e5\u672a\u6ce8\u518c\uff0c\u8bf7\u9009\u62e9\u201c\u6ce8\u518c\u5e76\u767b\u5f55\u201d\u3002`);
      } else {
        alert(`\u6ce8\u518c\u5931\u8d25\uff1a${error.message}`);
      }
      return null;
    }

    const msg = shouldCreateUser
      ? '\u6ce8\u518c\u94fe\u63a5\u5df2\u53d1\u9001\uff0c\u8bf7\u5230\u90ae\u7bb1\u70b9\u51fb\u540e\u8fd4\u56de\u672c\u9875\u9762\u3002'
      : '\u767b\u5f55\u94fe\u63a5\u5df2\u53d1\u9001\uff0c\u8bf7\u5230\u90ae\u7bb1\u70b9\u51fb\u540e\u8fd4\u56de\u672c\u9875\u9762\u3002';
    alert(msg);
    return null;
  }

  async function signOut() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    authUser = null;
    renderAuthState();
    dispatchAuthState();
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
    statusEl.style.cssText = 'font-size:12px;color:#64748B;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

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
      await sendLoginEmail();
    });

    wrap.appendChild(statusEl);
    wrap.appendChild(actionBtn);
    navbarRight.prepend(wrap);
    renderAuthState();
  }

  window.getAuthUser = function getAuthUser() {
    return authUser;
  };

  window.requireEmailLogin = async function requireEmailLogin() {
    if (authUser) return authUser;
    await sendLoginEmail();
    return null;
  };

  document.addEventListener('DOMContentLoaded', async () => {
    mountAuthWidget();
    const supabaseClient = ensureClient();
    if (!supabaseClient) return;
    await refreshUser();
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      authUser = session?.user || null;
      renderAuthState();
      dispatchAuthState();
    });
  });
})();
