// js/auth.js
// Email auth using OTP code (register/login).
(function initBaziEmailAuth() {
  if (window.__BAZI_AUTH_READY) return;
  window.__BAZI_AUTH_READY = true;

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const OTP_COOLDOWN_MS = 60 * 1000;

  let client = null;
  let authUser = null;
  let statusEl = null;
  let actionBtn = null;
  let lastOtpSentAt = 0;

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

  async function refreshUser() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.auth.getSession();
    authUser = data?.session?.user || null;
    renderAuthState();
    dispatchAuthState();
    return authUser;
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
      title.textContent = '\u90ae\u7bb1\u9a8c\u8bc1\u7801\u767b\u5f55';
      title.style.cssText = 'margin:0 0 6px;color:#0A2540;font-size:19px;';

      const desc = document.createElement('p');
      desc.textContent = '\u9996\u6b21\u4f7f\u7528\u53ef\u9009\u62e9\u201c\u6ce8\u518c\u5e76\u53d1\u9001\u7801\u201d\uff0c\u7cfb\u7edf\u4f1a\u53d1\u90ae\u7bb1\u9a8c\u8bc1\u7801\u3002';
      desc.style.cssText = 'margin:0 0 12px;color:#64748B;font-size:13px;line-height:1.6;';

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
      loginBtn.textContent = '\u767b\u5f55\u5e76\u53d1\u9001\u7801';
      loginBtn.style.cssText =
        'padding:10px 8px;border-radius:10px;border:1px solid #BFDBFE;background:#EFF6FF;color:#1D4ED8;font-size:13px;font-weight:600;cursor:pointer;';

      const registerBtn = document.createElement('button');
      registerBtn.type = 'button';
      registerBtn.textContent = '\u6ce8\u518c\u5e76\u53d1\u9001\u7801';
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

  function openOtpCodePrompt(email) {
    const codeRaw = prompt(`\u9a8c\u8bc1\u7801\u5df2\u53d1\u9001\u5230 ${email}\n\u8bf7\u8f93\u51656\u4f4d\u6570\u5b57\u9a8c\u8bc1\u7801\uff1a`);
    const token = (codeRaw || '').trim();
    if (!token) return null;
    if (!/^\d{6}$/.test(token)) {
      alert('\u9a8c\u8bc1\u7801\u683c\u5f0f\u4e0d\u6b63\u786e\uff0c\u8bf7\u8f93\u51656\u4f4d\u6570\u5b57\u3002');
      return null;
    }
    return token;
  }

  async function verifyOtpCode(email, token, mode) {
    const supabaseClient = ensureClient();
    if (!supabaseClient) return null;

    const tryTypes = mode === 'register' ? ['signup', 'email'] : ['email', 'magiclink'];
    for (const type of tryTypes) {
      const { data, error } = await supabaseClient.auth.verifyOtp({
        email,
        token,
        type,
      });
      if (!error && (data?.user || data?.session?.user)) {
        authUser = data.user || data.session.user;
        renderAuthState();
        dispatchAuthState();
        return authUser;
      }
    }
    return null;
  }

  function parseAuthErrorMessage(error) {
    const message = error?.message || '\u672a\u77e5\u9519\u8bef';
    if (/429|rate limit|too many/i.test(message)) {
      return '\u9a8c\u8bc1\u7801\u53d1\u9001\u8fc7\u4e8e\u9891\u7e41\uff0c\u8bf7 1 \u5206\u949f\u540e\u518d\u8bd5\u3002';
    }
    if (/email_address_invalid/i.test(message)) {
      return '\u90ae\u7bb1\u683c\u5f0f\u65e0\u6548\uff0c\u8bf7\u4f7f\u7528\u5e38\u89c1\u90ae\u7bb1\u5730\u5740\uff08\u5148\u4e0d\u8981\u7528\u5e26 + \u522b\u540d\u7684\u5730\u5740\uff09\u3002';
    }
    if (/Database error saving new user|500/i.test(message)) {
      return '\u6ce8\u518c\u9636\u6bb5\u670d\u52a1\u7aef\u51fa\u9519\uff08500\uff09\uff0c\u5efa\u8bae\u5148\u7528\u201c\u767b\u5f55\u5e76\u53d1\u9001\u7801\u201d\u6216\u7a0d\u540e\u91cd\u8bd5\u3002';
    }
    return message;
  }

  async function sendOtpAndLogin() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) {
      alert('\u767b\u5f55\u7ec4\u4ef6\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u91cd\u8bd5');
      return null;
    }

    const authRequest = await openEmailAuthModal();
    if (!authRequest) return null;

    const now = Date.now();
    if (now - lastOtpSentAt < OTP_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_COOLDOWN_MS - (now - lastOtpSentAt)) / 1000);
      alert(`\u8bf7 ${waitSec} \u79d2\u540e\u518d\u53d1\u9001\u9a8c\u8bc1\u7801\u3002`);
      return null;
    }

    const shouldCreateUser = authRequest.mode === 'register';
    const { error } = await supabaseClient.auth.signInWithOtp({
      email: authRequest.email,
      options: {
        shouldCreateUser,
      },
    });

    if (error) {
      const msg = parseAuthErrorMessage(error);
      if (!shouldCreateUser) {
        alert(`\u767b\u5f55\u53d1\u9001\u9a8c\u8bc1\u7801\u5931\u8d25\uff1a${msg}\n\n\u82e5\u672a\u6ce8\u518c\uff0c\u8bf7\u9009\u62e9\u201c\u6ce8\u518c\u5e76\u53d1\u9001\u7801\u201d\u3002`);
      } else {
        alert(`\u6ce8\u518c\u53d1\u9001\u9a8c\u8bc1\u7801\u5931\u8d25\uff1a${msg}`);
      }
      return null;
    }

    lastOtpSentAt = Date.now();
    const token = openOtpCodePrompt(authRequest.email);
    if (!token) return null;

    const user = await verifyOtpCode(authRequest.email, token, authRequest.mode);
    if (!user) {
      alert('\u9a8c\u8bc1\u7801\u6821\u9a8c\u5931\u8d25\uff0c\u8bf7\u786e\u8ba4\u9a8c\u8bc1\u7801\u65e0\u8bef\u540e\u518d\u8bd5\u3002');
      return null;
    }

    alert('\u9a8c\u8bc1\u6210\u529f\uff0c\u5df2\u767b\u5f55\u3002');
    return user;
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
      'font-size:12px;color:#64748B;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

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
      await sendOtpAndLogin();
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
    return await sendOtpAndLogin();
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
