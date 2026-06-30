// turnstile-verify.js — Cloudflare Turnstile 人机验证（带滑块降级）
// 配置：把下面 SITEKEY 换成你 Cloudflare Turnstile 的 Site Key 即启用。
// 未配置（仍为占位符）时，自动降级为本地滑块验证(YZVerify)。
(function () {
  const SITEKEY = '__TURNSTILE_SITEKEY__'; // ← 替换为真实 Site Key
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

  function showTurnstile(onPass) {
    injectStyle();
    if (document.getElementById('yz-ts-mask')) return;
    const mask = document.createElement('div');
    mask.id = 'yz-ts-mask';
    mask.innerHTML = '<div id="yz-ts-card"><button class="yz-ts-x" id="yz-ts-x">×</button><h3>请完成人机验证</h3><p>确认你不是机器人</p><div id="yz-ts-box"></div></div>';
    document.body.appendChild(mask);
    document.getElementById('yz-ts-x').onclick = function () { mask.remove(); };
    waitTurnstile(function () {
      if (!window.turnstile) { mask.remove(); fallback(onPass); return; }
      window.turnstile.render('#yz-ts-box', {
        sitekey: SITEKEY,
        callback: function (t) {
          token = t;
          setTimeout(function () { mask.remove(); if (typeof onPass === 'function') onPass(); }, 250);
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

  window.YZGate = {
    getToken: function () { return token; },
    // 需要验证：已配置走 Turnstile，否则走滑块降级
    require: function (onPass) {
      if (configured) showTurnstile(onPass);
      else fallback(onPass);
    },
    passed: function () { return configured ? !!token : (window.YZVerify ? window.YZVerify.passed() : true); }
  };
})();
