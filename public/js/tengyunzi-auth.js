(function () {
  'use strict';

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const SESSION_KEY = 'tengyunzi_auth_v1';
  const LEGACY_KEY = 'yz_auth_v1';
  let successCallback = null;

  function readSession() {
    try {
      const current = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (current && current.access_token) return current;
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
      if (legacy && legacy.access_token) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(legacy));
        return legacy;
      }
    } catch (error) {}
    return null;
  }

  function writeSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }

  async function sendCode(email) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error_description || data.msg || 'We could not send the code. Please try again.');
    }
  }

  async function verifyCode(email, token) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email, token }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || data.msg || 'That code is invalid or has expired.');
    }
    writeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token || '',
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      email: data.user?.email || email,
      user_id: data.user?.id || '',
    });
    return readSession();
  }

  async function refreshSession() {
    const session = readSession();
    if (!session?.access_token) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!session.expires_at || Number(session.expires_at) - now > 90) return session;
    if (!session.refresh_token) return session;

    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.access_token) {
      clearSession();
      mountNavigation();
      return null;
    }
    writeSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token || session.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      email: data.user?.email || session.email,
      user_id: data.user?.id || session.user_id,
    });
    return readSession();
  }

  async function authorizedFetch(path, options) {
    const session = await refreshSession();
    if (!session?.access_token) throw new Error('authentication_required');
    const request = options || {};
    const headers = new Headers(request.headers || {});
    headers.set('apikey', SUPABASE_ANON);
    headers.set('Authorization', `Bearer ${session.access_token}`);
    if (!headers.has('Content-Type') && request.body) headers.set('Content-Type', 'application/json');
    return fetch(path.startsWith('http') ? path : `${SUPABASE_URL}${path}`, { ...request, headers });
  }

  function setMessage(text, state) {
    const node = document.querySelector('[data-auth-message]');
    if (!node) return;
    node.textContent = text || '';
    node.dataset.state = state || '';
  }

  function setStep(step) {
    const emailStep = document.querySelector('[data-auth-step="email"]');
    const codeStep = document.querySelector('[data-auth-step="code"]');
    if (emailStep) emailStep.hidden = step !== 'email';
    if (codeStep) codeStep.hidden = step !== 'code';
  }

  function closeLogin() {
    document.querySelector('[data-auth-dialog]')?.remove();
    successCallback = null;
  }

  function openLogin(callback) {
    const existing = document.querySelector('[data-auth-dialog]');
    if (existing) return;
    successCallback = typeof callback === 'function' ? callback : null;

    const layer = document.createElement('div');
    layer.className = 'auth-layer';
    layer.dataset.authDialog = '';
    layer.innerHTML = `
      <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button class="auth-close" type="button" aria-label="Close" data-auth-close>&times;</button>
        <span class="kicker">Your Tengyunzi account</span>
        <h2 id="auth-title">Sign in with email</h2>
        <p class="auth-intro">Your readings stay connected to your email so you can return to them anytime.</p>
        <form data-auth-step="email">
          <label class="field"><span>Email address</span><input type="email" name="email" autocomplete="email" placeholder="you@example.com" required></label>
          <button class="button primary auth-submit" type="submit">Send secure code</button>
        </form>
        <form data-auth-step="code" hidden>
          <p class="auth-code-sent">Enter the six-digit code sent to <strong data-auth-email></strong>.</p>
          <label class="field"><span>Verification code</span><input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required></label>
          <button class="button primary auth-submit" type="submit">Sign in</button>
          <button class="auth-back" type="button" data-auth-back>Use another email</button>
        </form>
        <p class="auth-message" data-auth-message aria-live="polite"></p>
      </section>`;
    document.body.appendChild(layer);

    const emailForm = layer.querySelector('[data-auth-step="email"]');
    const codeForm = layer.querySelector('[data-auth-step="code"]');
    let email = '';

    layer.querySelector('[data-auth-close]')?.addEventListener('click', closeLogin);
    layer.querySelector('[data-auth-back]')?.addEventListener('click', () => {
      setStep('email');
      setMessage('');
      emailForm?.querySelector('input')?.focus();
    });
    layer.addEventListener('click', (event) => {
      if (event.target === layer) closeLogin();
    });
    document.addEventListener('keydown', function escapeListener(event) {
      if (event.key !== 'Escape' || !document.querySelector('[data-auth-dialog]')) return;
      closeLogin();
      document.removeEventListener('keydown', escapeListener);
    });

    emailForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      email = String(new FormData(emailForm).get('email') || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setMessage('Enter a valid email address.', 'error');
        return;
      }
      const button = emailForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending...';
      setMessage('');
      try {
        await sendCode(email);
        layer.querySelector('[data-auth-email]').textContent = email;
        setStep('code');
        codeForm?.querySelector('input')?.focus();
        setMessage('Code sent. Check your inbox and spam folder.', 'success');
      } catch (error) {
        setMessage(error.message || 'We could not send the code.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Send secure code';
      }
    });

    codeForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const code = String(new FormData(codeForm).get('code') || '').trim();
      if (!code) {
        setMessage('Enter the code from your email.', 'error');
        return;
      }
      const button = codeForm.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Signing in...';
      setMessage('');
      try {
        await verifyCode(email, code);
        const callbackAfterLogin = successCallback;
        document.querySelector('[data-auth-dialog]')?.remove();
        successCallback = null;
        mountNavigation();
        if (callbackAfterLogin) callbackAfterLogin(readSession());
      } catch (error) {
        setMessage(error.message || 'That code could not be verified.', 'error');
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    });

    emailForm?.querySelector('input')?.focus();
  }

  async function signOut() {
    const session = readSession();
    clearSession();
    if (session?.access_token) {
      fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {});
    }
    mountNavigation();
    window.dispatchEvent(new CustomEvent('tengyunzi:auth-change'));
  }

  function requireAuth(callback) {
    if (readSession()?.access_token) {
      Promise.resolve(refreshSession()).then((session) => {
        if (session?.access_token) callback?.(session);
        else openLogin(callback);
      });
      return;
    }
    openLogin(callback);
  }

  function mountNavigation() {
    const nav = document.querySelector('.nav-links');
    if (!nav) return;
    let account = nav.querySelector('[data-nav-account]');
    if (!account) {
      account = document.createElement('a');
      account.dataset.navAccount = '';
      const cta = nav.querySelector('.nav-cta');
      if (cta) nav.insertBefore(account, cta);
      else nav.appendChild(account);
    }

    const session = readSession();
    if (session?.access_token) {
      account.href = './tengyunzi-account.html#top';
      account.textContent = 'My Readings';
      account.title = session.email || 'My account';
      account.onclick = null;
    } else {
      account.href = '#sign-in';
      account.textContent = 'Sign In';
      account.title = 'Sign in with email';
      account.onclick = (event) => {
        event.preventDefault();
        openLogin();
      };
    }
  }

  window.TengyunziAuth = {
    SUPABASE_URL,
    SUPABASE_ANON,
    readSession,
    refreshSession,
    authorizedFetch,
    openLogin,
    closeLogin,
    requireAuth,
    signOut,
    mountNavigation,
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNavigation);
  else mountNavigation();
})();
