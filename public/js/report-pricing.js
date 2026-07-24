(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const ENDPOINT = SUPABASE_URL + '/functions/v1/price-experiment';
  const VISITOR_KEY = 'site_visitor_id_v1';
  const EXPERIMENT_KEY = 'report_pricing_v1';
  const AI_PRICES = ['9.99', '19.99', '49.00'];
  const MANUAL_PRICES = ['99.00', '149.00'];

  function visitorId() {
    try {
      const existing = localStorage.getItem(VISITOR_KEY);
      if (existing) return existing;
      const next = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(VISITOR_KEY, next);
      return next;
    } catch {
      return 'session-' + Math.random().toString(36).slice(2, 14);
    }
  }

  function hash(value) {
    let result = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
      result ^= value.charCodeAt(index);
      result = Math.imul(result, 0x01000193);
    }
    return result >>> 0;
  }

  function localPricing(id) {
    const cell = hash(EXPERIMENT_KEY + ':' + id.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80)) % 6;
    const ai = AI_PRICES[cell % 3];
    const manual = MANUAL_PRICES[Math.floor(cell / 3) % 2];
    return { experiment_key: EXPERIMENT_KEY, visitor_id: id, variant_id: 'ai_' + ai.replace('.', '') + '__manual_' + manual.replace('.', ''), ai_price: ai, manual_price: manual };
  }

  async function request(payload) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON },
      body: JSON.stringify(payload),
      keepalive: payload.action === 'event',
    });
    if (!response.ok) throw new Error('pricing_request_failed');
    return response.json();
  }

  function apply(pricing) {
    document.querySelectorAll('[data-ai-price]').forEach((node) => { node.textContent = '$' + pricing.ai_price; });
    document.querySelectorAll('[data-ai-price-usd]').forEach((node) => { node.textContent = '$' + pricing.ai_price + ' USD'; });
    document.querySelectorAll('[data-manual-price]').forEach((node) => { node.textContent = '$' + pricing.manual_price.replace('.00', ''); });
    document.querySelectorAll('[data-manual-price-label]').forEach((node) => { node.textContent = '$' + pricing.manual_price.replace('.00', '') + ' Personal Reading'; });
  }

  const id = visitorId();
  const api = {
    current: localPricing(id),
    ready: null,
    track: async function (eventType, product) {
      try {
        await request({ action: 'event', visitor_id: id, event_type: eventType, product, page_path: location.pathname, referrer: document.referrer });
      } catch {}
    },
  };
  api.ready = request({ action: 'resolve', visitor_id: id })
    .then((data) => data.pricing || api.current)
    .catch(() => api.current)
    .then((pricing) => {
      api.current = pricing;
      apply(pricing);
      const products = new Set(Array.from(document.querySelectorAll('[data-price-product]')).map((node) => node.getAttribute('data-price-product')).filter(Boolean));
      products.forEach((product) => api.track('exposure', product));
      return pricing;
    });
  window.TengyunziPricing = api;

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-price-checkout]');
    if (target) api.track('checkout', target.getAttribute('data-price-checkout'));
  });
})();
