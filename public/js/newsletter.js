(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const STORAGE_KEY = 'tengyunzi_newsletter_email_v1';

  // English-only site. The zh-Hans / zh-Hant variants were removed along with the
  // language switcher (site-lang.js); currentLang() had already been pinned to 'en'.
  const COPY = {
    eyebrow: 'Free Daily Almanac',
    title: 'Start each day with the Chinese calendar',
    body: 'A free daily email with the lunar date, daily pillars, solar term, supportive activities, cautions, clash, and traditional directions.',
    bullet1: 'General calendar, no birth date needed',
    bullet2: 'Delivered free each morning',
    bullet3: 'Stop from any email',
    placeholder: 'Enter your email',
    button: 'Get Daily Almanac',
    consent: 'I agree to receive the free Tengyunzi Daily Almanac and can stop it anytime.',
    success: 'Your free Daily Almanac is set for the next morning delivery.',
    duplicate: 'Your Daily Almanac subscription is already active.',
    invalid: 'Please enter a valid email address.',
    error: 'Signup failed. Please try again in a moment.',
    saved: 'Saved',
  };

  function text() {
    return COPY;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function ensureStyles() {
    if (document.getElementById('newsletter-style')) return;
    const style = document.createElement('style');
    style.id = 'newsletter-style';
    style.textContent = `
      .newsletter-section {
        padding: 64px 20px;
        background: #fbfcfd;
        border-top: 1px solid #e5e7eb;
        border-bottom: 1px solid #e5e7eb;
      }
      .newsletter-section.result {
        padding: 22px 0 0;
        background: transparent;
        border: 0;
      }
      .newsletter-inner {
        max-width: 1080px;
        margin: 0 auto;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
        gap: 28px;
        align-items: center;
      }
      .newsletter-section.result .newsletter-inner {
        max-width: none;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      .newsletter-copy {
        min-width: 0;
      }
      .newsletter-eyebrow {
        display: inline-flex;
        align-items: center;
        height: 26px;
        padding: 0 10px;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        color: #1d4ed8;
        background: #eff6ff;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
      }
      .newsletter-title {
        margin: 14px 0 10px;
        color: #0A2540;
        font-size: 30px;
        line-height: 1.25;
        letter-spacing: 0;
      }
      .newsletter-section.result .newsletter-title {
        font-size: 22px;
      }
      .newsletter-body {
        margin: 0;
        color: #475569;
        font-size: 15px;
        line-height: 1.75;
      }
      .newsletter-points {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 18px;
      }
      .newsletter-point {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #dbeafe;
        color: #334155;
        font-size: 13px;
        font-weight: 700;
      }
      .newsletter-form {
        border: 1px solid #d8e1ec;
        border-radius: 8px;
        padding: 18px;
        background: #fff;
        box-shadow: 0 10px 28px rgba(15, 59, 130, 0.08);
      }
      .newsletter-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
      }
      .newsletter-input {
        width: 100%;
        min-height: 44px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 12px;
        font-size: 15px;
        color: #102033;
        background: #fff;
      }
      .newsletter-input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
      }
      .newsletter-button {
        min-height: 44px;
        border: 0;
        border-radius: 8px;
        padding: 0 18px;
        background: #0066CC;
        color: #fff;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        white-space: nowrap;
      }
      .newsletter-button:hover {
        background: #0052A3;
      }
      .newsletter-button:disabled {
        opacity: .6;
        cursor: default;
      }
      .newsletter-consent {
        display: flex;
        gap: 8px;
        align-items: flex-start;
        margin-top: 10px;
        color: #64748b;
        font-size: 12px;
        line-height: 1.5;
      }
      .newsletter-consent input {
        margin-top: 2px;
      }
      .newsletter-status {
        min-height: 20px;
        margin-top: 10px;
        color: #0f766e;
        font-size: 13px;
        font-weight: 700;
      }
      .newsletter-status.error {
        color: #dc2626;
      }
      .newsletter-honeypot {
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      }
      @media (max-width: 760px) {
        .newsletter-section {
          padding: 44px 16px;
        }
        .newsletter-inner,
        .newsletter-section.result .newsletter-inner {
          grid-template-columns: 1fr;
        }
        .newsletter-title {
          font-size: 24px;
        }
        .newsletter-row {
          grid-template-columns: 1fr;
        }
        .newsletter-button {
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function emailIsValid(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
  }

  function getUrlParam(name) {
    try {
      return new URLSearchParams(window.location.search || '').get(name) || '';
    } catch (err) {
      return '';
    }
  }

  function basePayload(source) {
    return {
      source: source || 'website',
      language: 'en',
      page_path: window.location.pathname || '/',
      landing_url: String(window.location.href || '').slice(0, 500),
      referrer: String(document.referrer || '').slice(0, 500),
      utm_source: getUrlParam('utm_source'),
      utm_medium: getUrlParam('utm_medium'),
      utm_campaign: getUrlParam('utm_campaign'),
      tags: ['newsletter', 'free-daily-almanac', source || 'website'],
      metadata: {
        product: 'free-daily-almanac',
      },
    };
  }

  async function subscribe(options) {
    const payloadOptions = options || {};
    const email = String(payloadOptions.email || '').trim();

    if (!emailIsValid(email)) {
      const err = new Error('invalid_email');
      err.code = 'invalid_email';
      throw err;
    }

    const source = payloadOptions.source || 'website';
    const base = basePayload(source);
    const tags = Array.from(new Set([
      ...(base.tags || []),
      ...((Array.isArray(payloadOptions.tags) ? payloadOptions.tags : []).filter(Boolean)),
    ]));
    const metadata = {
      ...(base.metadata || {}),
      ...((payloadOptions.metadata && typeof payloadOptions.metadata === 'object') ? payloadOptions.metadata : {}),
    };

    const body = {
      ...base,
      email,
      tags,
      metadata,
    };

    if (payloadOptions.name) body.name = String(payloadOptions.name).trim();
    if (payloadOptions.website) body.website = String(payloadOptions.website);
    if (Number.isFinite(payloadOptions.form_elapsed_ms)) body.form_elapsed_ms = payloadOptions.form_elapsed_ms;
    if (payloadOptions.language) body.language = String(payloadOptions.language);
    if (payloadOptions.timezone) body.timezone = String(payloadOptions.timezone);
    if (Number.isInteger(payloadOptions.delivery_hour)) body.delivery_hour = payloadOptions.delivery_hour;
    if (typeof payloadOptions.free_daily_enabled === 'boolean') body.free_daily_enabled = payloadOptions.free_daily_enabled;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      const err = new Error(data?.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    try { localStorage.setItem(STORAGE_KEY, email); } catch (err) {}
    return data;
  }

  async function unsubscribe(token) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/newsletter-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ action: 'unsubscribe', token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  async function handleUnsubscribeLink() {
    const token = getUrlParam('unsubscribe');
    if (!token) return;
    history.replaceState(null, '', `${window.location.pathname}#unsubscribed`);
    const host = document.createElement('section');
    host.style.cssText = 'padding:18px 20px;background:#eaf3fa;border-bottom:1px solid #c9d8e6;color:#17324d;text-align:center;font-weight:700;';
    host.setAttribute('role', 'status');
    host.textContent = 'Updating your email preference...';
    const main = document.querySelector('main');
    if (main) main.prepend(host);
    else document.body.prepend(host);
    try {
      await unsubscribe(token);
      host.textContent = 'Your Tengyunzi email preference has been updated.';
    } catch (error) {
      host.textContent = 'This unsubscribe link is invalid or has already expired.';
    }
  }

  function setStatus(form, message, isError) {
    const status = form.querySelector('.newsletter-status');
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('error', Boolean(isError));
  }

  async function submitForm(form) {
    const t = text();
    const input = form.querySelector('input[name="email"]');
    const email = input ? input.value.trim() : '';
    const consent = form.querySelector('input[name="consent"]');
    const button = form.querySelector('button[type="submit"]');
    const source = form.getAttribute('data-source') || 'website';
    const website = form.querySelector('input[name="website"]')?.value || '';
    let timezone = 'Asia/Taipei';
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone;
    } catch (err) {}

    if (!emailIsValid(email)) {
      setStatus(form, t.invalid, true);
      return;
    }

    if (consent && !consent.checked) {
      setStatus(form, t.consent, true);
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = '...';
    }
    setStatus(form, '', false);

    try {
      const readyAt = Number(form.dataset.readyAt);
      const formElapsedMs = Number.isFinite(readyAt) ? Date.now() - readyAt : undefined;
      await subscribe({ email, source, website, timezone, form_elapsed_ms: formElapsedMs, delivery_hour: 7, free_daily_enabled: true });
      setStatus(form, t.success, false);
      if (input) input.value = '';
    } catch (err) {
      setStatus(form, t.error, true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = t.button;
      }
    }
  }

  function renderHost(host) {
    const t = text();
    const source = host.getAttribute('data-newsletter-section') || 'website';
    const variant = source === 'result' ? 'result' : '';
    const savedEmail = (() => {
      try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (err) { return ''; }
    })();

    host.className = `newsletter-section ${variant}`.trim();
    host.innerHTML = `
      <div class="newsletter-inner">
        <div class="newsletter-copy">
          <span class="newsletter-eyebrow">${escapeHtml(t.eyebrow)}</span>
          <h2 class="newsletter-title">${escapeHtml(t.title)}</h2>
          <p class="newsletter-body">${escapeHtml(t.body)}</p>
          <div class="newsletter-points" aria-label="Newsletter themes">
            <span class="newsletter-point">${escapeHtml(t.bullet1)}</span>
            <span class="newsletter-point">${escapeHtml(t.bullet2)}</span>
            <span class="newsletter-point">${escapeHtml(t.bullet3)}</span>
          </div>
        </div>
        <form class="newsletter-form" data-source="${escapeHtml(source)}" novalidate>
          <div class="newsletter-row">
            <input class="newsletter-input" type="email" name="email" placeholder="${escapeHtml(t.placeholder)}" autocomplete="email" value="${escapeHtml(savedEmail)}" required>
            <button class="newsletter-button" type="submit">${escapeHtml(savedEmail ? t.saved : t.button)}</button>
          </div>
          <label class="newsletter-consent">
            <input type="checkbox" name="consent" checked required>
            <span>${escapeHtml(t.consent)}</span>
          </label>
          <input class="newsletter-honeypot" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="newsletter-status" role="status" aria-live="polite"></div>
        </form>
      </div>
    `;

    const form = host.querySelector('.newsletter-form');
    if (form) {
      // Paired with the hidden honeypot input: how long the form was on screen before
      // it was submitted. A human takes a moment to type; a script posts immediately.
      form.dataset.readyAt = String(Date.now());
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        submitForm(form);
      });
    }
  }

  function renderAll() {
    ensureStyles();
    document.querySelectorAll('[data-newsletter-section]').forEach(renderHost);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      renderAll();
      handleUnsubscribeLink();
    });
  } else {
    renderAll();
    handleUnsubscribeLink();
  }

  window.YZNewsletter = { renderAll, subscribe, unsubscribe, isValidEmail: emailIsValid };
})();
