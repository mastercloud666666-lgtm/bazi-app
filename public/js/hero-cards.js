/* 首页两块长内容改成可滑动卡片：
   - 完整版24大维度 → Swiper「cards」叠卡效果(左右划/自动轮播)，页面立刻变短
   - 适合你/卡点 → 滑动卡(手机划、电脑并排)
   用 Swiper.js(动态加载)，不改数据源，直接把已渲染的卡片转成轮播。 */
(function () {
  var SW_CSS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
  var SW_JS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';

  function loadSwiper(cb) {
    if (window.Swiper) return cb();
    if (!document.querySelector('link[data-swiper]')) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = SW_CSS; l.setAttribute('data-swiper', '1');
      document.head.appendChild(l);
    }
    var s = document.createElement('script');
    s.src = SW_JS; s.onload = cb; s.onerror = function () { /* 加载失败则维持原样 */ };
    document.head.appendChild(s);
  }

  // 把容器内已有的卡片元素，包成 swiper 结构并初始化
  function toSwiper(container, opts) {
    if (!container || container.dataset.swiperized) return null;
    var items = Array.prototype.filter.call(container.children, function (c) {
      return !c.classList.contains('swiper');
    });
    if (!items.length) return null;
    container.dataset.swiperized = '1';

    var sw = document.createElement('div');
    sw.className = 'swiper hero-card-swiper ' + (opts._cls || '');
    var wrap = document.createElement('div'); wrap.className = 'swiper-wrapper';
    items.forEach(function (it) {
      var sl = document.createElement('div'); sl.className = 'swiper-slide';
      sl.appendChild(it); wrap.appendChild(sl);
    });
    sw.appendChild(wrap);
    var pag = document.createElement('div'); pag.className = 'swiper-pagination';
    sw.appendChild(pag);
    container.innerHTML = '';
    container.appendChild(sw);

    var base = {
      grabCursor: true,
      pagination: { el: pag, clickable: true },
      keyboard: { enabled: true },
      a11y: { enabled: true },
    };
    for (var k in opts) if (k.charAt(0) !== '_') base[k] = opts[k];
    return new window.Swiper(sw, base);
  }

  function build() {
    // 24 大维度：叠卡效果 + 自动轮播
    toSwiper(document.getElementById('hero-dimensions-grid'), {
      _cls: 'sw-dims',
      effect: 'cards',
      cardsEffect: { slideShadows: false, perSlideOffset: 9, perSlideRotate: 2.5 },
      autoplay: { delay: 3800, disableOnInteraction: true },
      loop: false,
    });
    // 适合你 / 卡点：手机划、电脑并排
    toSwiper(document.querySelector('.hero-sales-grid'), {
      _cls: 'sw-sales',
      slidesPerView: 1.06,
      spaceBetween: 14,
      breakpoints: { 760: { slidesPerView: 2, allowTouchMove: false, pagination: false } },
    });
  }

  function waitAndBuild(tries) {
    var grid = document.getElementById('hero-dimensions-grid');
    if (grid && grid.children.length) { loadSwiper(build); return; }
    if (tries > 0) setTimeout(function () { waitAndBuild(tries - 1); }, 150);
    else loadSwiper(build); // 维度没填上也先把适合你/卡点做了
  }

  if (document.readyState !== 'loading') waitAndBuild(40);
  else document.addEventListener('DOMContentLoaded', function () { waitAndBuild(40); });
})();
