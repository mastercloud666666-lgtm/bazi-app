// human-verify.js — 轻量滑动人机验证，防机器人滥用 AI 接口
// 用法：YZVerify.require(function(){ /* 通过后执行 */ });
// 通过后本次会话内不再弹出（sessionStorage）。
(function () {
  const FLAG = 'yz_human_ok';
  function passed() { try { return sessionStorage.getItem(FLAG) === '1'; } catch (e) { return false; } }
  function markPass() { try { sessionStorage.setItem(FLAG, '1'); } catch (e) {} }

  function injectStyle() {
    if (document.getElementById('yz-verify-style')) return;
    const st = document.createElement('style');
    st.id = 'yz-verify-style';
    st.textContent = `
      #yz-vf-mask{position:fixed;inset:0;background:rgba(10,37,64,.5);z-index:100001;display:flex;align-items:center;justify-content:center;padding:18px;font-family:"PingFang SC","Microsoft YaHei",sans-serif;}
      #yz-vf-card{width:min(94vw,360px);background:#fff;border-radius:16px;padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.3);text-align:center;}
      #yz-vf-card h3{margin:0 0 6px;font-size:18px;color:#0A2540;}
      #yz-vf-card p{margin:0 0 18px;font-size:13px;color:#64748b;}
      .yz-vf-track{position:relative;height:46px;background:#eef2f7;border:1px solid #dbe3ee;border-radius:10px;overflow:hidden;user-select:none;touch-action:none;}
      .yz-vf-fill{position:absolute;left:0;top:0;bottom:0;width:46px;background:#cfe3ff;}
      .yz-vf-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;color:#64748b;pointer-events:none;}
      .yz-vf-handle{position:absolute;left:0;top:0;width:46px;height:46px;background:#0066CC;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;border-radius:10px;cursor:grab;}
      .yz-vf-handle.ok{background:#0a8a3a;}
      .yz-vf-track.ok{border-color:#0a8a3a;}
    `;
    document.head.appendChild(st);
  }

  function show(onPass) {
    injectStyle();
    if (document.getElementById('yz-vf-mask')) return;
    const mask = document.createElement('div');
    mask.id = 'yz-vf-mask';
    mask.innerHTML = `
      <div id="yz-vf-card">
        <h3>请完成人机验证</h3>
        <p>拖动滑块到最右侧，确认你不是机器人</p>
        <div class="yz-vf-track" id="yz-vf-track">
          <div class="yz-vf-fill" id="yz-vf-fill"></div>
          <div class="yz-vf-text" id="yz-vf-text">按住滑块，拖到最右边 →</div>
          <div class="yz-vf-handle" id="yz-vf-handle">›</div>
        </div>
      </div>`;
    document.body.appendChild(mask);

    const track = document.getElementById('yz-vf-track');
    const handle = document.getElementById('yz-vf-handle');
    const fill = document.getElementById('yz-vf-fill');
    const text = document.getElementById('yz-vf-text');
    let dragging = false, startX = 0, max = 0, done = false;

    function maxX() { return track.clientWidth - handle.clientWidth; }
    function setX(x) {
      x = Math.max(0, Math.min(maxX(), x));
      handle.style.left = x + 'px';
      fill.style.width = (x + handle.clientWidth) + 'px';
      return x;
    }
    function down(e) {
      if (done) return;
      dragging = true;
      startX = (e.touches ? e.touches[0].clientX : e.clientX) - (parseInt(handle.style.left || '0', 10));
      handle.style.cursor = 'grabbing';
    }
    function move(e) {
      if (!dragging || done) return;
      const cx = (e.touches ? e.touches[0].clientX : e.clientX);
      const x = setX(cx - startX);
      if (x >= maxX() - 2) success();
    }
    function up() {
      if (done) return;
      dragging = false;
      handle.style.cursor = 'grab';
      setX(0); // 未到底则回弹
    }
    function success() {
      done = true; dragging = false;
      setX(maxX());
      handle.classList.add('ok'); track.classList.add('ok');
      handle.textContent = '✓';
      text.textContent = '验证通过';
      markPass();
      setTimeout(function () { mask.remove(); if (typeof onPass === 'function') onPass(); }, 350);
    }

    handle.addEventListener('mousedown', down);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    handle.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('touchmove', move, { passive: true });
    document.addEventListener('touchend', up);
  }

  window.YZVerify = {
    passed: passed,
    require: function (onPass) {
      if (passed()) { if (typeof onPass === 'function') onPass(); return; }
      show(onPass);
    }
  };
})();
