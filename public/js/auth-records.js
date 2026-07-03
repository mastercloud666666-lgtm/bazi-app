// auth-records.js — 邮箱验证码登录 + 用户记录（占卜/付费报告）
// 纯 REST，无第三方依赖；会话存 localStorage。
(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const KEY = 'yz_auth_v1';
  const PKCE_KEY = 'yz_pkce_verifier';

  // ===== PKCE 工具（Google OAuth 跳转登录用）=====
  function b64url(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function randomVerifier() {
    const arr = new Uint8Array(64);
    (window.crypto || window.msCrypto).getRandomValues(arr);
    return b64url(arr);
  }
  async function challengeOf(verifier) {
    const data = new TextEncoder().encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return b64url(new Uint8Array(digest));
  }
  async function beginGoogleLogin() {
    const back = location.origin + location.pathname + location.search;
    try {
      const verifier = randomVerifier();
      const challenge = await challengeOf(verifier);
      localStorage.setItem(PKCE_KEY, verifier);
      location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google'
        + '&redirect_to=' + encodeURIComponent(back)
        + '&code_challenge=' + encodeURIComponent(challenge)
        + '&code_challenge_method=s256';
    } catch (e) {
      // crypto 不可用时退回隐式流
      location.href = SUPABASE_URL + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(back);
    }
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(KEY); }
  function isLoggedIn() { const s = getSession(); return !!(s && s.access_token); }
  function currentEmail() { const s = getSession(); return s ? s.email : ''; }

  async function api(path, opts) {
    return fetch(SUPABASE_URL + path, opts);
  }

  // 发送验证码
  async function sendCode(email) {
    const res = await api('/auth/v1/otp', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, create_user: true })
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(t || ('send failed ' + res.status));
    }
    return true;
  }

  // 校验验证码 -> 建立会话
  async function verifyCode(email, token) {
    const res = await api('/auth/v1/verify', {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email: email, token: token })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      throw new Error(data.error_description || data.msg || '验证码错误或已过期');
    }
    setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      email: (data.user && data.user.email) || email,
      user_id: data.user && data.user.id
    });
    return true;
  }

  async function refreshIfNeeded() {
    const s = getSession();
    if (!s || !s.access_token) return null;
    const now = Math.floor(Date.now() / 1000);
    if (s.expires_at && s.expires_at - now > 60) return s; // 仍有效
    if (!s.refresh_token) return s;
    try {
      const res = await api('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: s.refresh_token })
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.access_token) {
        setSession({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at, email: s.email, user_id: (d.user && d.user.id) || s.user_id });
        return getSession();
      }
    } catch (e) {}
    return s;
  }

  function signOut() { clearSession(); }

  // 保存一条记录
  async function saveRecord(rec) {
    const s = await refreshIfNeeded();
    if (!s || !s.access_token) throw new Error('未登录');
    const body = Object.assign({ email: s.email }, rec);
    const res = await api('/rest/v1/user_records', {
      method: 'POST',
      headers: {
        apikey: ANON, Authorization: 'Bearer ' + s.access_token,
        'Content-Type': 'application/json', Prefer: 'return=minimal'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const t = await res.text().catch(() => ''); throw new Error(t || ('save failed ' + res.status)); }
    return true;
  }

  // 读取自己的记录
  async function listRecords() {
    const s = await refreshIfNeeded();
    if (!s || !s.access_token) throw new Error('未登录');
    const res = await api('/rest/v1/user_records?select=*&order=created_at.desc', {
      headers: { apikey: ANON, Authorization: 'Bearer ' + s.access_token }
    });
    if (!res.ok) throw new Error('读取失败 ' + res.status);
    return res.json();
  }

  // ============ 登录弹窗 UI ============
  function injectStyle() {
    if (document.getElementById('yz-auth-style')) return;
    const st = document.createElement('style');
    st.id = 'yz-auth-style';
    st.textContent = `
      #yz-auth-mask{position:fixed;inset:0;background:rgba(10,37,64,.5);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}
      #yz-auth-card{width:min(94vw,380px);background:#fff;border-radius:16px;padding:26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.3);}
      #yz-auth-card h3{margin:0 0 6px;font-size:20px;color:#0A2540;}
      #yz-auth-card p.sub{margin:0 0 16px;font-size:13px;color:#64748b;}
      .yz-inp{width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;font-size:15px;outline:none;margin-bottom:12px;}
      .yz-inp:focus{border-color:#0066CC;}
      .yz-btn{width:100%;background:#0066CC;color:#fff;border:none;border-radius:10px;padding:13px;font-size:16px;font-weight:700;cursor:pointer;}
      .yz-btn:disabled{opacity:.55;cursor:default;}
      .yz-msg{font-size:12px;margin:10px 2px 0;min-height:16px;}
      .yz-msg.err{color:#dc2626;} .yz-msg.ok{color:#0a8a3a;}
      .yz-x{position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;}
      #yz-auth-card{position:relative;}
      .yz-link{display:block;text-align:center;margin-top:12px;font-size:12px;color:#0066CC;cursor:pointer;background:none;border:none;width:100%;}
    `;
    document.head.appendChild(st);
  }

  function openLogin(onSuccess) {
    injectStyle();
    if (document.getElementById('yz-auth-mask')) return;
    var en = false; try { en = (localStorage.getItem('site_lang_pref_v2') || 'zh-Hans') === 'en'; } catch (e) {}
    const L = en ? {
      title: 'Email Login', sub: 'Log in to save and revisit your readings and reports.',
      email: 'Enter your email', send: 'Get code',
      code: 'Enter the code from your email', login: 'Log in', back: '← Use another email',
      google: 'Continue with Google', or: '— or —',
      badEmail: 'Please enter a valid email', sending: 'Sending code…',
      sent: function (m) { return 'Code sent to ' + m + ' (check spam too)'; },
      sendFail: function (m) { return 'Failed to send: ' + m; }, retry: 'please try again',
      noCode: 'Please enter the code', loggingIn: 'Logging in…', codeErr: 'Invalid code'
    } : {
      title: '邮箱登录', sub: '登录后可保存并随时查看你的占卜与命理记录',
      email: '输入你的邮箱', send: '获取验证码',
      code: '输入邮箱收到的验证码', login: '登录', back: '← 换个邮箱',
      google: '使用 Google 账号登录', or: '— 或用邮箱验证码 —',
      badEmail: '请输入正确的邮箱', sending: '正在发送验证码…',
      sent: function (m) { return '验证码已发送到 ' + m + '，请查收（含垃圾箱）'; },
      sendFail: function (m) { return '发送失败：' + m; }, retry: '请稍后重试',
      noCode: '请输入验证码', loggingIn: '正在登录…', codeErr: '验证码错误'
    };
    const mask = document.createElement('div');
    mask.id = 'yz-auth-mask';
    mask.innerHTML = `
      <div id="yz-auth-card">
        <button class="yz-x" id="yz-x">×</button>
        <h3>${L.title}</h3>
        <p class="sub">${L.sub}</p>
        <div id="yz-step1">
          <button class="yz-btn" id="yz-google" style="background:#fff;color:#1f2937;border:1.5px solid #d1d5db;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>
            ${L.google}
          </button>
          <div style="font-size:12px;color:#94a3b8;margin:2px 0 10px;">${L.or}</div>
          <input class="yz-inp" id="yz-email" type="email" placeholder="${L.email}" autocomplete="email">
          <button class="yz-btn" id="yz-send">${L.send}</button>
        </div>
        <div id="yz-step2" style="display:none">
          <input class="yz-inp" id="yz-code" type="text" inputmode="numeric" placeholder="${L.code}" autocomplete="one-time-code">
          <button class="yz-btn" id="yz-verify">${L.login}</button>
          <button class="yz-link" id="yz-back">${L.back}</button>
        </div>
        <div class="yz-msg" id="yz-msg"></div>
      </div>`;
    document.body.appendChild(mask);
    const $ = (id) => document.getElementById(id);
    const msg = (t, ok) => { const m = $('yz-msg'); m.textContent = t || ''; m.className = 'yz-msg ' + (ok ? 'ok' : 'err'); };
    const close = () => mask.remove();
    $('yz-x').onclick = close;
    mask.addEventListener('click', (e) => { if (e.target === mask) close(); });

    let email = '';
    const doSend = async () => {
      $('yz-send').disabled = true; msg(L.sending, true);
      try {
        await sendCode(email);
        $('yz-step1').style.display = 'none';
        $('yz-step2').style.display = 'block';
        msg(L.sent(email), true);
        $('yz-code').focus();
      } catch (e) { msg(L.sendFail(e.message || L.retry)); }
      $('yz-send').disabled = false;
    };
    $('yz-google').onclick = () => { beginGoogleLogin(); };
    $('yz-send').onclick = () => {
      email = ($('yz-email').value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg(L.badEmail); return; }
      if (window.YZGate) window.YZGate.require(doSend); else doSend();
    };
    $('yz-back').onclick = () => { $('yz-step2').style.display = 'none'; $('yz-step1').style.display = 'block'; msg(''); };
    $('yz-verify').onclick = async () => {
      const code = ($('yz-code').value || '').trim();
      if (!code) { msg(L.noCode); return; }
      $('yz-verify').disabled = true; msg(L.loggingIn, true);
      try {
        await verifyCode(email, code);
        close();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (e) { msg(e.message || L.codeErr); $('yz-verify').disabled = false; }
    };
  }

  function finishSession(d, fallbackEmail) {
    setSession({
      access_token: d.access_token,
      refresh_token: d.refresh_token || '',
      expires_at: d.expires_at || (Math.floor(Date.now() / 1000) + Number(d.expires_in || 3600)),
      email: (d.user && d.user.email) || fallbackEmail || '',
      user_id: d.user && d.user.id,
    });
    localStorage.removeItem(PKCE_KEY);
    // 清掉 URL 上的 code/hash 再刷新
    history.replaceState(null, '', location.pathname);
    location.reload();
  }

  // Google OAuth 跳回：优先处理 PKCE 的 ?code=，其次隐式流的 #access_token=
  (function handleOAuthReturn() {
    try {
      const q = new URLSearchParams(location.search);
      const code = q.get('code');
      const verifier = localStorage.getItem(PKCE_KEY);
      if (code && verifier) {
        fetch(SUPABASE_URL + '/auth/v1/token?grant_type=pkce', {
          method: 'POST',
          headers: { apikey: ANON, 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
        })
          .then((r) => r.json())
          .then((d) => { if (d && d.access_token) finishSession(d); })
          .catch(() => {});
        return;
      }
      if (location.hash && location.hash.indexOf('access_token=') !== -1) {
        const h = new URLSearchParams(location.hash.slice(1));
        const at = h.get('access_token');
        if (!at) return;
        fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + at } })
          .then((r) => r.json())
          .then((u) => finishSession({
            access_token: at, refresh_token: h.get('refresh_token') || '',
            expires_in: Number(h.get('expires_in') || 3600), user: u,
          }));
      }
    } catch (e) {}
  })();

  // ============ 顶部导航登录入口 + "我的记录"按登录态显隐 ============
  function navIsEn() { try { return (localStorage.getItem('site_lang_pref_v2') || 'zh-Hans') === 'en'; } catch (e) { return false; } }

  function mountNavWidget() {
    const right = document.querySelector('.navbar-right');
    if (!right) return;
    const myRecLink = document.querySelector('.navbar-nav a[href="my-records.html"], .navbar-nav a[href="/my-records.html"]');
    const logged = isLoggedIn();
    if (myRecLink) myRecLink.style.display = logged ? '' : 'none';

    const en = navIsEn();
    let box = document.getElementById('yz-nav-auth');
    if (!box) {
      box = document.createElement('div');
      box.id = 'yz-nav-auth';
      box.style.cssText = 'display:flex;align-items:center;gap:8px;margin-left:8px;';
      right.appendChild(box);
    }
    if (logged) {
      const email = currentEmail() || '';
      const short = email.length > 14 ? email.slice(0, 12) + '…' : email;
      box.innerHTML = `<span style="font-size:12px;color:#0A2540;font-weight:600;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${email.replace(/"/g, '')}">${short}</span>`
        + `<button id="yz-nav-logout" style="font-size:12px;color:#64748b;background:none;border:1px solid #e2e8f0;border-radius:8px;padding:4px 10px;cursor:pointer;white-space:nowrap;">${en ? 'Log out' : '退出'}</button>`;
      const b = document.getElementById('yz-nav-logout');
      if (b) b.onclick = () => { signOut(); mountNavWidget(); };
    } else {
      box.innerHTML = `<button id="yz-nav-login" style="font-size:12px;color:#fff;background:#0066CC;border:none;border-radius:8px;padding:6px 14px;cursor:pointer;font-weight:600;white-space:nowrap;">${en ? 'Log in' : '登录'}</button>`;
      const b2 = document.getElementById('yz-nav-login');
      if (b2) b2.onclick = () => { openLogin(() => mountNavWidget()); };
    }
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountNavWidget);
    else mountNavWidget();
  } catch (e) {}

  window.YZAuth = {
    isLoggedIn, currentEmail, getSession, signOut, openLogin,
    sendCode, verifyCode, saveRecord, listRecords, refreshIfNeeded, mountNavWidget
  };
})();
