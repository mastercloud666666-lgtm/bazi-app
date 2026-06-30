// turnstile-verify.js — Cloudflare Turnstile 人机验证（带滑块降级）
// 配置：把下面 SITEKEY 换成你 Cloudflare Turnstile 的 Site Key 即启用。
// 未配置（仍为占位符）时，自动降级为本地滑块验证(YZVerify)。
(function () {
  const SITEKEY = '0x4AAAAAADtPotu7LEYsxLGt'; // Cloudflare Turnstile Site Key（公开）
  const configured = SITEKEY && SITEKEY.indexOf('__') !== 0;
  let token = '';
  let scriptLoaded = false;

  function loadScript() {
    if (scriptLoaded || window.turnstile) return;
    scriptLoaded = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  if (configured) loadScript();

  function waitTurnstile(cb, tries) {
    tries = tries || 0;
    if (window.turnstile) return cb();
    if (tries > 50) return cb(); // ~5s 仍未加载，放弃（走降级）
    setTimeout(function () { waitTurnstile(cb, tries + 1); }, 100);
  }

  function injectStyle() {
    if (document.getElementById('yz-ts-style')) return;
    const st = document.createElement('style');
    st.id = 'yz-ts-style';
    st.textContent = `
      #yz-ts-mask{position:fixed;inset:0;background:rgba(10,37,64,.5);z-index:100001;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}
      #yz-ts-card{width:min(94vw,360px);background:#fff;border-radius:16px;padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;}
      #yz-ts-card h3{margin:0 0 6px;font-size:18px;color:#0A2540;}
      #yz-ts-card p{margin:0 0 16px;font-size:13px;color:#64748b;}
      #yz-ts-box{display:flex;justify-content:center;min-height:70px;}
      .yz-ts-x{position:absolute;top:12px;right:14px;background:none;border:none;font-size:22px;color:#94a3b8;cursor:pointer;}
      #yz-ts-card{position:relative;}
    `;
    document.head.appendChild(st);
  }

  function isEn() { try { return (localStorage.getItem('site_lang_pref_v2') || 'zh-Hans') === 'en'; } catch (e) { return false; } }

  function showTurnstile(onPass) {
    injectStyle();
    if (document.getElementById('yz-ts-mask')) return;
    const en = isEn();
    const t1 = en ? 'Quick verification' : '请完成人机验证';
    const t2 = en ? 'Confirm you are human' : '确认你不是机器人';
    const mask = document.createElement('div');
    mask.id = 'yz-ts-mask';
    mask.innerHTML = '<div id="yz-ts-card"><button class="yz-ts-x" id="yz-ts-x">×</button><h3>' + t1 + '</h3><p>' + t2 + '</p><div id="yz-ts-box"></div></div>';
    document.body.appendChild(mask);
    document.getElementById('yz-ts-x').onclick = function () { mask.remove(); };
    var done = false;
    waitTurnstile(function () {
      if (!window.turnstile) { mask.remove(); fallback(onPass); return; }
      window.turnstile.render('#yz-ts-box', {
        sitekey: SITEKEY,
        language: en ? 'en' : 'zh-cn',
        appearance: 'interaction-only',
        callback: function (t) {
          if (done) return; done = true;
          token = t;
          try { localStorage.setItem('yz_verified_until', String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) {}
          setTimeout(function () { mask.remove(); if (typeof onPass === 'function') onPass(); }, 200);
        },
        'error-callback': function () {},
        'expired-callback': function () { token = ''; }
      });
    });
  }

  function fallback(onPass) {
    if (window.YZVerify) window.YZVerify.require(onPass);
    else if (typeof onPass === 'function') onPass();
  }

  // 24 小时内验证过一次就不再弹（每天每浏览器/IP 一次）
  function verifiedRecently() {
    try { return Number(localStorage.getItem('yz_verified_until') || 0) > Date.now(); } catch (e) { return false; }
  }
  function markVerifiedDay() {
    try { localStorage.setItem('yz_verified_until', String(Date.now() + 24 * 60 * 60 * 1000)); } catch (e) {}
  }

  window.YZGate = {
    getToken: function () { return token; },
    require: function (onPass) {
      if (verifiedRecently()) { if (typeof onPass === 'function') onPass(); return; }
      if (configured) showTurnstile(onPass);
      else fallback(onPass);
    },
    passed: function () {
      if (verifiedRecently()) return true;
      return configured ? !!token : (window.YZVerify ? window.YZVerify.passed() : true);
    }
  };
  window.__yzMarkVerifiedDay = markVerifiedDay;
})();
