(function () {
  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());
  }

  function isValidDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
  }

  function formValue(form, name) {
    const field = form.elements[name];
    return field ? String(field.value || '').trim() : '';
  }

  function getUtm(name) {
    try {
      return new URLSearchParams(window.location.search).get(name) || '';
    } catch (err) {
      return '';
    }
  }

  function buttonText(button, text) {
    if (!button) return;
    if (!button.dataset.originalText) button.dataset.originalText = button.textContent;
    button.textContent = text || button.dataset.originalText;
  }

  function paymentReturnOrigin() {
    const isWebOrigin = /^https?:\/\//i.test(window.location.origin);
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    return isWebOrigin && !isLocal ? window.location.origin : 'https://tengyunzi.com';
  }

  async function openPayPalCheckout(order) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/paypal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        action: 'create',
        trade_no: order.order_reference,
        option_id: order.payment_option_id,
        service: 'tengyunzi_manual',
        origin: paymentReturnOrigin(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.approve_url) {
      throw new Error(data.message || data.error || 'paypal_checkout_failed');
    }
    return data.approve_url;
  }

  async function submitOrderIntake(form) {
    const submit = form.querySelector('[type="submit"]');
    const note = form.querySelector('[data-order-note]');
    const question = formValue(form, 'question');
    const product = formValue(form, 'product');
    const eventOne = formValue(form, 'event_one');
    const eventTwo = formValue(form, 'event_two');
    const birthTimeUnknown = Boolean(form.elements.birth_time_unknown?.checked);
    const birthHour = birthTimeUnknown ? 'unknown' : formValue(form, 'birth_hour');
    const email = formValue(form, 'email');
    const birthYear = Number(formValue(form, 'birth_year'));
    const birthMonth = Number(formValue(form, 'birth_month'));
    const birthDay = Number(formValue(form, 'birth_day'));

    if (!isValidEmail(email)) {
      note.textContent = 'Please enter a valid email address.';
      return;
    }

    if (
      !Number.isInteger(birthYear)
      || !Number.isInteger(birthMonth)
      || !Number.isInteger(birthDay)
      || !isValidDate(birthYear, birthMonth, birthDay)
    ) {
      note.textContent = 'Please enter a valid birth date.';
      return;
    }

    if (question.length < 10) {
      note.textContent = 'Please write at least one clear question or focus area.';
      return;
    }

    const requiresTwoEvents = product === 'Tengyunzi 12-Month Forecast'
      || product === 'Tengyunzi Reading + Annual Forecast Bundle';
    if (requiresTwoEvents && (!eventOne || !eventTwo)) {
      note.textContent = 'Choose two events for the annual forecast.';
      return;
    }
    if (requiresTwoEvents && eventOne === eventTwo) {
      note.textContent = 'Choose two different events so the forecast can compare both clearly.';
      return;
    }
    if (form.elements.birth_time_unknown && !birthTimeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(birthHour)) {
      note.textContent = 'Enter the exact birth time, or choose Birth time unknown.';
      return;
    }

    const pricing = window.TengyunziPricing ? await window.TengyunziPricing.ready : null;
    const payload = {
      product,
      name: formValue(form, 'name'),
      email,
      birth_year: birthYear,
      birth_month: birthMonth,
      birth_day: birthDay,
      birth_hour: birthHour,
      birth_place: formValue(form, 'birth_place'),
      gender: formValue(form, 'gender'),
      calendar_type: formValue(form, 'calendar_type') || 'solar',
      focus_area: formValue(form, 'focus_area'),
      question,
      event_one: eventOne,
      event_two: eventTwo,
      website: formValue(form, 'website'),
      form_elapsed_ms: Number.isFinite(Number(form.dataset.readyAt))
        ? Date.now() - Number(form.dataset.readyAt)
        : undefined,
      source: form.dataset.source || 'paid-offer',
      language: form.dataset.language || 'en',
      page_path: window.location.pathname,
      landing_url: window.location.href,
      referrer: document.referrer || '',
      utm_source: getUtm('utm_source'),
      utm_medium: getUtm('utm_medium'),
      utm_campaign: getUtm('utm_campaign'),
      metadata: {
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        product_page: document.title,
        how_found: formValue(form, 'how_found'),
      },
      price_experiment: pricing,
    };

    submit.disabled = true;
    buttonText(submit, 'Preparing checkout...');
    note.textContent = 'Creating your secure order...';

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/order-intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'order_intake_failed');
      }
      form.dataset.submitted = 'true';
      try {
        localStorage.setItem('tengyunzi_pending_trade_no', data.order_reference || '');
        localStorage.setItem('tengyunzi_pending_intake_id', data.intake_id || '');
        localStorage.setItem('tengyunzi_pending_product', payload.product || '');
      } catch (storageErr) {
        // Checkout still works when private browsing blocks local storage.
      }
      note.textContent = 'Order saved. Opening secure PayPal checkout...';
      buttonText(submit, 'Opening PayPal...');
      const approveUrl = await openPayPalCheckout(data);
      window.location.assign(approveUrl);
      return;
    } catch (err) {
      note.textContent = 'Checkout could not be opened. Your details were not charged. Please try again or contact support.';
    } finally {
      submit.disabled = false;
      buttonText(submit);
    }
  }

  function initCheckout(root) {
    const scope = root || document;
    const layer = scope.querySelector('[data-checkout-layer]');
    const productInput = scope.querySelector('[data-product-input]');
    const form = scope.querySelector('[data-checkout-form]');
    const note = scope.querySelector('[data-order-note]');
    let previousBodyOverflow = '';
    if (!form) return;

    // Paired with the hidden honeypot input: how long the form was on screen before it
    // was submitted. Filling in birth details and a question takes a human seconds.
    form.dataset.readyAt = String(Date.now());

    const unknownTime = form.elements.birth_time_unknown;
    const exactTime = form.elements.birth_hour;
    if (unknownTime && exactTime) {
      const syncBirthTime = () => {
        exactTime.disabled = Boolean(unknownTime.checked);
        exactTime.toggleAttribute('required', !unknownTime.checked);
      };
      unknownTime.addEventListener('change', syncBirthTime);
      syncBirthTime();
    }

    if (!layer || !productInput) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        submitOrderIntake(form);
      });
      return;
    }

    function openCheckout(product) {
      productInput.value = product || productInput.value;
      if (note) note.textContent = '';
      layer.classList.add('is-open');
      layer.setAttribute('aria-hidden', 'false');
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const first = form.querySelector('input:not([readonly]):not(.visually-hidden):not([aria-hidden="true"]), select, textarea');
      if (first) window.setTimeout(() => first.focus(), 60);
    }

    function closeCheckout() {
      layer.classList.remove('is-open');
      layer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousBodyOverflow;
      if (note && form.dataset.submitted !== 'true') note.textContent = '';
    }

    scope.querySelectorAll('[data-checkout]').forEach((button) => {
      button.addEventListener('click', () => openCheckout(button.dataset.checkout));
    });

    const closeButton = scope.querySelector('[data-close-checkout]');
    if (closeButton) closeButton.addEventListener('click', closeCheckout);
    layer.addEventListener('click', (event) => {
      if (event.target === layer) closeCheckout();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && layer.classList.contains('is-open')) closeCheckout();
    });

    try {
      const requestedProduct = new URLSearchParams(window.location.search).get('checkout');
      if (requestedProduct) openCheckout(requestedProduct);
    } catch (err) {
      // Query-driven preview is optional; normal button interactions still work.
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitOrderIntake(form);
    });
  }

  window.TengyunziOrderIntake = { initCheckout, submitOrderIntake };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCheckout(document));
  } else {
    initCheckout(document);
  }
})();
