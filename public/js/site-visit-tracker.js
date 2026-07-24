// Global lightweight visit tracker for all public pages.
// Sends page-visit events to Supabase admin-orders endpoint (site_visit_track).
(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const SESSION_FLAG_PREFIX = 'site_visit_sent_';
  const VISITOR_ID_KEY = 'site_visitor_id_v1';
  const TESTER_ID_KEY = 'site_tester_id_v1';
  const TRACK_ENDPOINT = SUPABASE_URL + '/functions/v1/admin-orders';

  function safeGetStorage(key, type) {
    try {
      return (type === 'session' ? sessionStorage : localStorage).getItem(key) || '';
    } catch {
      return '';
    }
  }

  function safeSetStorage(key, value, type) {
    try {
      (type === 'session' ? sessionStorage : localStorage).setItem(key, value);
    } catch {}
  }

  function getVisitorId() {
    const existing = safeGetStorage(VISITOR_ID_KEY, 'local');
    if (existing) return existing;
    const next = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
    safeSetStorage(VISITOR_ID_KEY, next, 'local');
    return next;
  }

  function sanitizeTesterId(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  }

  function resolveTesterId() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const fromUrl = sanitizeTesterId(
        params.get('tester') || params.get('tester_id') || params.get('debug_tester') || ''
      );
      if (fromUrl) {
        safeSetStorage(TESTER_ID_KEY, fromUrl, 'local');
        return fromUrl;
      }
    } catch {}
    return sanitizeTesterId(safeGetStorage(TESTER_ID_KEY, 'local'));
  }

  // English-only site. Kept tolerant of a stray lang attribute, but 'en' is the default
  // so a missing/malformed lang never mislabels a visit as Chinese.
  function guessLang() {
    const lang = String(document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (lang.includes('zh-hant') || lang.includes('zh-tw') || lang.includes('zh-hk')) return 'zh-Hant';
    if (lang.startsWith('zh')) return 'zh-Hans';
    return 'en';
  }

  function buildPayload() {
    const path = String(window.location.pathname || '/');
    const testerId = resolveTesterId();
    const params = new URLSearchParams(window.location.search || '');
    return {
      action: 'site_visit_track',
      page_path: path,
      page_title: String(document.title || '').slice(0, 120),
      lang: guessLang(),
      referrer: String(document.referrer || '').slice(0, 260),
      visitor_id: getVisitorId(),
      user_agent: String(navigator.userAgent || '').slice(0, 240),
      tester_id: testerId,
      is_tester: !!testerId,
      entry_url: String(window.location.href || '').slice(0, 320),
      utm_source: String(params.get('utm_source') || '').slice(0, 64),
      utm_medium: String(params.get('utm_medium') || '').slice(0, 64),
      utm_campaign: String(params.get('utm_campaign') || '').slice(0, 100),
      utm_content: String(params.get('utm_content') || '').slice(0, 100),
    };
  }

  function shouldSkip() {
    const protocol = String(window.location.protocol || '').toLowerCase();
    if (protocol !== 'https:' && protocol !== 'http:') return true;
    const host = String(window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1';
  }

  function trackOncePerPath() {
    if (shouldSkip()) return;
    const path = String(window.location.pathname || '/');
    const key = SESSION_FLAG_PREFIX + path;
    if (safeGetStorage(key, 'session') === '1') return;
    safeSetStorage(key, '1', 'session');

    const payload = buildPayload();
    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + SUPABASE_ANON,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  }

  trackOncePerPath();
})();
