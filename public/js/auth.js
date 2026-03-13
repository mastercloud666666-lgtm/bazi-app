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
      actionBtn.textContent = '\u90ae\u7bb1\u767b\u5f55';
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

  async function sendLoginEmail() {
    const supabaseClient = ensureClient();
    if (!supabaseClient) {
      alert('\u767b\u5f55\u7ec4\u4ef6\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u5237\u65b0\u91cd\u8bd5');
      return null;
    }

    const rawEmail = prompt('\u8bf7\u8f93\u5165\u767b\u5f55\u90ae\u7bb1\uff1a');
    const email = (rawEmail || '').trim().toLowerCase();
    if (!email) return null;

    const emailPattern = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailPattern.test(email)) {
      alert('\u90ae\u7bb1\u683c\u5f0f\u4e0d\u6b63\u786e');
      return null;
    }

    const redirectTo = `${location.origin}${location.pathname}${location.search}`;
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });
    if (error) {
      alert(`\u53d1\u9001\u767b\u5f55\u90ae\u4ef6\u5931\u8d25\uff1a${error.message}`);
      return null;
    }

    alert('\u767b\u5f55\u94fe\u63a5\u5df2\u53d1\u9001\uff0c\u8bf7\u5230\u90ae\u7bb1\u70b9\u51fb\u540e\u8fd4\u56de\u672c\u9875\u9762\u3002');
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
