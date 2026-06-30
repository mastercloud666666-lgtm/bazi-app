// auth-records.js — 邮箱验证码登录 + 用户记录（占卜/付费报告）
// 纯 REST，无第三方依赖；会话存 localStorage。
(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const KEY = 'yz_auth_v1';

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
    const mask = document.createElement('div');
    mask.id = 'yz-auth-mask';
    mask.innerHTML = `
      <div id="yz-auth-card">
        <button class="yz-x" id="yz-x">×</button>
        <h3>邮箱登录</h3>
        <p class="sub">登录后可保存并随时查看你的占卜与命理记录</p>
        <div id="yz-step1">
          <input class="yz-inp" id="yz-email" type="email" placeholder="输入你的邮箱" autocomplete="email">
          <button class="yz-btn" id="yz-send">获取验证码</button>
        </div>
        <div id="yz-step2" style="display:none">
          <input class="yz-inp" id="yz-code" type="text" inputmode="numeric" placeholder="输入邮箱收到的 6 位验证码" autocomplete="one-time-code">
          <button class="yz-btn" id="yz-verify">登录</button>
          <button class="yz-link" id="yz-back">← 换个邮箱</button>
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
    $('yz-send').onclick = async () => {
      email = ($('yz-email').value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('请输入正确的邮箱'); return; }
      $('yz-send').disabled = true; msg('正在发送验证码…', true);
      try {
        await sendCode(email);
        $('yz-step1').style.display = 'none';
        $('yz-step2').style.display = 'block';
        msg('验证码已发送到 ' + email + '，请查收（含垃圾箱）', true);
        $('yz-code').focus();
      } catch (e) { msg('发送失败：' + (e.message || '请稍后重试')); }
      $('yz-send').disabled = false;
    };
    $('yz-back').onclick = () => { $('yz-step2').style.display = 'none'; $('yz-step1').style.display = 'block'; msg(''); };
    $('yz-verify').onclick = async () => {
      const code = ($('yz-code').value || '').trim();
      if (!code) { msg('请输入验证码'); return; }
      $('yz-verify').disabled = true; msg('正在登录…', true);
      try {
        await verifyCode(email, code);
        close();
        if (typeof onSuccess === 'function') onSuccess();
      } catch (e) { msg(e.message || '验证码错误'); $('yz-verify').disabled = false; }
    };
  }

  window.YZAuth = {
    isLoggedIn, currentEmail, getSession, signOut, openLogin,
    sendCode, verifyCode, saveRecord, listRecords, refreshIfNeeded
  };
})();
