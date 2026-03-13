// js/auth.js
// Username + email + password auth (no email OTP flow).
(function initBaziAccountAuth() {
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

  function dispatchAuthState() {
    window.dispatchEvent(
      new CustomEvent('bazi-auth-state', {
        detail: { user: authUser || null },
      })
    );
  }

  function getUserDisplayText() {
    if (!authUser) return '\u672a\u767b\u5f55';
    const name =
      authUser.user_metadata?.username ||
      authUser.user_metadata?.display_name ||
      '';
    return name ? `${name} (${authUser.email || ''})` : authUser.email || '\u5df2\u767b\u5f55';
  }

  function renderAuthState() {
    if (!statusEl || !actionBtn) return;
    if (authUser && authUser.email) {
      statusEl.textContent = getUserDisplayText();
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

  async function refreshUser() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    authUser = data?.session?.user || null;
    renderAuthState();
    dispatchAuthState();
    return authUser;
  }

  function parseAuthErrorMessage(error) {
    const msg = error?.message || '\u672a\u77e5\u9519\u8bef';
    if (/Invalid login credentials/i.test(msg)) {
      return '\u90ae\u7bb1\u6216\u5bc6\u7801\u9519\u8bef';
    }
    if (/User already registered/i.test(msg)) {
      return '\u8be5\u90ae\u7bb1\u5df2\u6ce8\u518c\uff0c\u8bf7\u76f4\u63a5\u767b\u5f55';
    }
    if (/Email not confirmed/i.test(msg)) {
      return '\u5f53\u524d Supabase \u5f00\u542f\u4e86\u90ae\u7bb1\u786e\u8ba4\uff0c\u8bf7\u5728\u540e\u53f0\u5173\u95ed\u786e\u8ba4\u540e\u518d\u8bd5\u3002';
    }
    if (/Password should be at least 6 characters/i.test(msg)) {
      return '\u5bc6\u7801\u81f3\u5c11 6 \u4f4d';
    }
    if (/429|rate limit|too many/i.test(msg)) {
      return '\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5';
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
      title.textContent = '\u8d26\u53f7\u767b\u5f55/\u6ce8\u518c';
      title.style.cssText = 'margin:0 0 6px;color:#0A2540;font-size:19px;';

      const desc = document.createElement('p');
      desc.textContent = '\u4f7f\u7528\u7528\u6237\u540d\u3001\u90ae\u7bb1\u3001\u5bc6\u7801\u5b8c\u6210\u767b\u5f55\u6216\u6ce8\u518c\u3002';
      desc.style.cssText = 'margin:0 0 12px;color:#64748B;font-size:13px;line-height:1.6;';

      const usernameInput = document.createElement('input');
      usernameInput.type = 'text';
      usernameInput.placeholder = '\u7528\u6237\u540d\uff08\u6ce8\u518c\u5fc5\u586b\uff09';
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
      passwordInput.placeholder = '\u5bc6\u7801\uff08\u81f3\u5c11 6 \u4f4d\uff09';
      passwordInput.autocomplete = 'current-password';
      passwordInput.style.cssText =
        'width:100%;padding:10px 12px;border:1px solid #CBD5E1;border-radius:10px;font-size:14px;outline:none;margin-bottom:8px;';

      const errorText = document.createElement('div');
      errorText.style.cssText = 'min-height:18px;font-size:12px;color:#B91C1C;margin-bottom:8px;';

      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;';

      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.textContent = '\u767b\u5f55';
      loginBtn.style.cssText =
        'padding:10px 8px;border-radius:10px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:600;cursor:pointer;';

      const registerBtn = document.createElement('button');
      registerBtn.type = 'button';
      registerBtn.textContent = '\u6ce8\u518c';
      registerBtn.style.cssText =
        'padding:10px 8px;border-radius:10px;border:1px solid #BBF7D0;background:#F0FDF4;color:#15803D;font-size:13px;font-weight:600;cursor:pointer;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = '\u53d6\u6d88';
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
          errorText.textContent = '\u7528\u6237\u540d\u81f3\u5c11 2 \u4f4d';
          return;
        }
        if (!isLikelyEmail(email)) {
          errorText.textContent = '\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e';
          return;
        }
        if (password.length < 6) {
          errorText.textContent = '\u5bc6\u7801\u81f3\u5c11 6 \u4f4d';
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
      alert(`\u767b\u5f55\u5931\u8d25\uff1a${parseAuthErrorMessage(error)}`);
      return null;
    }
    authUser = data?.user || data?.session?.user || null;
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
      alert(`\u6ce8\u518c\u5931\u8d25\uff1a${parseAuthErrorMessage(error)}`);
      return null;
    }

    if (data?.session?.user || data?.user) {
      authUser = data.session?.user || data.user;
      renderAuthState();
      dispatchAuthState();
      alert('\u6ce8\u518c\u6210\u529f\uff0c\u5df2\u767b\u5f55\u3002');
      return authUser;
    }

    // Some projects keep "Confirm email" enabled. Try password login once.
    const user = await signInWithPassword(email, password);
    if (user) {
      alert('\u6ce8\u518c\u6210\u529f\uff0c\u5df2\u767b\u5f55\u3002');
      return user;
    }
    alert('\u6ce8\u518c\u5b8c\u6210\uff0c\u4f46\u5f53\u524d\u9879\u76ee\u53ef\u80fd\u5f00\u542f\u4e86\u90ae\u7bb1\u786e\u8ba4\uff0c\u8bf7\u5728 Supabase \u5173\u95ed\u540e\u518d\u8bd5\u3002');
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
      'font-size:12px;color:#64748B;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

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
