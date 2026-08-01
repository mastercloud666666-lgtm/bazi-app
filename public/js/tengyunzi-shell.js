(function () {
  const shellScript = document.currentScript;
  const scriptBase = shellScript?.src ? new URL('.', shellScript.src) : new URL('./js/', window.location.href);

  function loadCompanionScript(filename, marker) {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.src = new URL(filename, scriptBase).href;
    script.defer = true;
    script.setAttribute(`data-${marker}`, '');
    document.head.appendChild(script);
  }

  loadCompanionScript('tengyunzi-auth.js', 'tengyunzi-auth');
  loadCompanionScript('site-visit-tracker.js', 'tengyunzi-tracker');

  const header = document.querySelector('.nav');
  const nav = header?.querySelector('.nav-links');
  if (!header || !nav || header.querySelector('.nav-menu-toggle')) return;

  const aboutLink = nav.querySelector('a[href*="tengyunzi-about.html"]');
  const pathwayLinks = [
    { href: 'tengyunzi-feng-shui.html#top', label: 'Feng Shui' },
    { href: 'tengyunzi-decision.html#top', label: 'I Ching' }
  ];
  pathwayLinks.forEach(({ href, label }) => {
    if (nav.querySelector(`a[href*="${href.split('#')[0]}"]`)) return;
    const link = document.createElement('a');
    link.href = new URL(`../${href}`, scriptBase).href;
    link.textContent = label;
    if (aboutLink) nav.insertBefore(link, aboutLink);
    else nav.appendChild(link);
  });

  const iChingLink = nav.querySelector('a[href*="tengyunzi-decision.html"]');
  if (iChingLink) iChingLink.textContent = 'I Ching';

  const primaryCta = nav.querySelector('.nav-cta');
  if (primaryCta) {
    if (!primaryCta.hasAttribute('data-preserve-cta')) {
      primaryCta.href = new URL('../tengyunzi-report.html#reading-form', scriptBase).href;
      primaryCta.textContent = 'Start Reading';
    }
    const mobileCta = primaryCta.cloneNode(true);
    mobileCta.classList.remove('nav-cta');
    mobileCta.classList.add('nav-mobile-cta');
    mobileCta.removeAttribute('aria-current');
    nav.before(mobileCta);
  }

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-menu-toggle';
  toggle.setAttribute('aria-label', 'Menu');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = 'Menu';
  nav.before(toggle);

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menu');
    toggle.textContent = 'Menu';
  };

  const openMenu = () => {
    nav.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    toggle.textContent = 'Close';
  };

  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });

  nav.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) closeMenu();
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      toggle.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 980) closeMenu();
  });

  const footerInner = document.querySelector('.footer .shell');
  if (footerInner && !footerInner.querySelector('.footer-legal')) {
    const legal = document.createElement('nav');
    legal.className = 'footer-legal';
    legal.setAttribute('aria-label', 'Legal and account links');
    legal.innerHTML = [
      '<a href="./privacy-policy.html">Privacy</a>',
      '<a href="./terms-of-service.html">Terms</a>',
      '<a href="./refund-policy.html">Refunds</a>',
      '<a href="./delivery-policy.html">Delivery</a>',
      '<a href="./merchant-info.html">Merchant</a>',
      '<a href="./tengyunzi-account.html">My Readings</a>'
    ].join('');
    footerInner.appendChild(legal);
  }
})();
