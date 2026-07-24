(function () {
  'use strict';

  const API = `${TengyunziAuth.SUPABASE_URL}/functions/v1/daily-almanac-profile`;
  const form = document.querySelector('[data-daily-form]');
  if (!form) return;

  const note = document.querySelector('[data-daily-note]');
  const submit = document.querySelector('[data-daily-submit]');
  const loginButton = document.querySelector('[data-daily-login]');
  const pauseButton = document.querySelector('[data-daily-pause]');
  const accountText = document.querySelector('[data-daily-account]');
  const membershipState = document.querySelector('[data-daily-membership-state]');
  const membershipText = document.querySelector('[data-daily-membership-text]');
  const planToggle = document.querySelector('[data-daily-plan-toggle]');
  const planButtons = Array.from(document.querySelectorAll('[data-daily-plan]'));
  const requestedPlan = new URLSearchParams(window.location.search).get('plan');
  let selectedPlan = requestedPlan === 'monthly' ? 'monthly' : 'yearly';
  let currentMembership = { active: false };

  planButtons.forEach((button) => {
    const isSelected = button.dataset.dailyPlan === selectedPlan;
    button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });

  function setNote(message, state) {
    note.textContent = message || '';
    note.dataset.state = state || '';
  }

  async function request(action, payload, authenticated) {
    const options = {
      method: 'POST',
      body: JSON.stringify({ action, ...(payload || {}) }),
    };
    const response = authenticated
      ? await TengyunziAuth.authorizedFetch(API, options)
      : await fetch(API, {
        ...options,
        headers: {
          apikey: TengyunziAuth.SUPABASE_ANON,
          Authorization: `Bearer ${TengyunziAuth.SUPABASE_ANON}`,
          'Content-Type': 'application/json',
        },
      });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(data.error || `request_failed_${response.status}`);
      error.code = data.error || '';
      throw error;
    }
    return data;
  }

  function formValue(name) {
    return String(new FormData(form).get(name) || '').trim();
  }

  function profilePayload() {
    const birthDate = formValue('birth_date');
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
    if (!match) throw new Error('Enter your date of birth.');
    return {
      birth_year: Number(match[1]),
      birth_month: Number(match[2]),
      birth_day: Number(match[3]),
      birth_hour: Number(formValue('birth_hour')),
      gender: formValue('gender') || 'unspecified',
      timezone: formValue('timezone') || 'Asia/Taipei',
      language: formValue('language') || 'en',
      delivery_hour: Number(formValue('delivery_hour') || 7),
      enabled: true,
    };
  }

  function fillProfile(profile) {
    if (!profile) return;
    const date = `${profile.birth_year}-${String(profile.birth_month).padStart(2, '0')}-${String(profile.birth_day).padStart(2, '0')}`;
    form.elements.birth_date.value = date;
    form.elements.birth_hour.value = String(profile.birth_hour ?? -1);
    form.elements.gender.value = profile.gender || 'unspecified';
    ensureTimezone(profile.timezone || 'Asia/Taipei');
    form.elements.timezone.value = profile.timezone || 'Asia/Taipei';
    form.elements.language.value = profile.language || 'en';
    form.elements.delivery_hour.value = String(profile.delivery_hour ?? 7);
  }

  function ensureTimezone(timezone) {
    const select = form.elements.timezone;
    if (!timezone || Array.from(select.options).some((option) => option.value === timezone)) return;
    const option = document.createElement('option');
    option.value = timezone;
    option.textContent = timezone.replace(/_/g, ' ');
    select.appendChild(option);
  }

  function setDetectedTimezone() {
    let timezone = 'Asia/Taipei';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || timezone; } catch (error) {}
    ensureTimezone(timezone);
    if (!form.elements.timezone.value || form.elements.timezone.value === 'Asia/Taipei') form.elements.timezone.value = timezone;
  }

  function renderAccount(data) {
    const session = TengyunziAuth.readSession();
    accountText.innerHTML = session?.email
      ? `<strong>${escapeHtml(session.email)}</strong><br>Secure account connected`
      : '<strong>Not signed in</strong><br>Sign in before checkout';
    loginButton.textContent = session?.email ? 'My account' : 'Sign in';

    currentMembership = data?.membership || { active: false };
    if (currentMembership.active) {
      const expiry = new Date(currentMembership.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      membershipState.hidden = false;
      membershipText.innerHTML = `<strong>Personal Monthly Forecast active</strong><br>${currentMembership.plan === 'yearly' ? 'Annual' : 'Monthly'} access through ${escapeHtml(expiry)}${currentMembership.auto_renew ? ' | Auto-renewing' : ''}`;
      planToggle.hidden = true;
      submit.textContent = 'Save Monthly Forecast Settings';
      pauseButton.hidden = data?.profile?.enabled === false;
    } else {
      membershipState.hidden = true;
      planToggle.hidden = false;
      submit.textContent = selectedPlan === 'yearly' ? 'Start Annual Membership | $69' : 'Start Monthly Membership | $9.90';
      pauseButton.hidden = true;
    }
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
  }

  function setList(selector, items) {
    const list = document.querySelector(selector);
    list.replaceChildren();
    (Array.isArray(items) ? items.slice(0, 4) : []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      list.appendChild(li);
    });
  }

  function renderPreview(data) {
    const forecast = data?.forecast || null;
    if (!forecast) return;
    document.querySelector('[data-preview-date]').textContent = forecast.confidence === 'reduced' ? 'Birth hour unknown' : 'Four pillars included';
    document.querySelector('[data-preview-period]').textContent = forecast.period_label || 'Current solar month';
    document.querySelector('[data-preview-theme]').textContent = `${forecast.posture || 'Build steadily'} | ${forecast.score || '--'}/100`;
    document.querySelector('[data-preview-personal]').textContent = forecast.headline || 'Your personal monthly posture';
    document.querySelector('[data-preview-guidance]').textContent = forecast.strategy || 'Your monthly strategy will appear here.';
    document.querySelector('[data-preview-supportive]').textContent = (forecast.supportive_elements || []).join(', ') || 'Calculated from your chart';
    document.querySelector('[data-preview-caution]').textContent = (forecast.caution_elements || []).join(', ') || 'Calculated from your chart';
    document.querySelector('[data-preview-interactions]').textContent = forecast.interactions?.length
      ? `${forecast.interactions.length} notable interaction${forecast.interactions.length === 1 ? '' : 's'}`
      : 'No dominant major interaction';
    setList('[data-preview-priorities]', forecast.priorities?.length ? forecast.priorities : ['Use the month posture as your planning baseline.']);
    setList('[data-preview-cautions]', forecast.cautions?.length ? forecast.cautions : ['Keep decisions evidence-based and proportionate.']);
  }

  async function loadPreview(useForm) {
    const payload = {
      language: form.elements.language.value || 'en',
      timezone: form.elements.timezone.value || 'Asia/Taipei',
    };
    if (useForm && form.elements.birth_date.value) Object.assign(payload, profilePayload());
    if (!useForm || !form.elements.birth_date.value) return;
    try { renderPreview(await request('preview', payload, false)); } catch (error) {}
  }

  async function loadAccount() {
    const session = TengyunziAuth.readSession();
    if (!session?.access_token) {
      renderAccount(null);
      return;
    }
    try {
      const data = await request('get', {}, true);
      fillProfile(data.profile);
      renderAccount(data);
      await loadPreview(Boolean(data.profile));
    } catch (error) {
      renderAccount(null);
      setNote('Your membership details could not be loaded. Please sign in again.', 'error');
    }
  }

  async function saveOrCheckout() {
    const consent = form.querySelector('[data-daily-consent]');
    if (!consent.checked) {
      setNote('Confirm the email and auto-renewal terms before continuing.', 'error');
      return;
    }
    let payload;
    try {
      payload = profilePayload();
    } catch (error) {
      setNote(error.message || 'Check your birth details.', 'error');
      return;
    }
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = currentMembership.active ? 'Saving...' : 'Preparing PayPal...';
    setNote('');
    try {
      const saved = await request('save', payload, true);
      currentMembership = saved.membership || currentMembership;
      await loadPreview(true);
      if (currentMembership.active) {
        setNote('Your monthly forecast settings are saved.', 'success');
        await loadAccount();
        return;
      }
      const checkout = await request('create_checkout', { plan: selectedPlan }, true);
      try {
        localStorage.setItem('tengyunzi_daily_trade', checkout.trade_no || '');
      } catch (error) {}
      if (!checkout.approve_url) throw new Error('PayPal checkout is unavailable.');
      window.location.href = checkout.approve_url;
    } catch (error) {
      const messages = {
        profile_required: 'Save your birth details before checkout.',
        subscription_create_failed: 'PayPal could not start the subscription. Please try again.',
        plan_not_configured: 'The PayPal membership plan is not configured yet.',
      };
      setNote(messages[error.code] || error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      submit.disabled = false;
      if (!window.location.href.includes('paypal.com')) submit.textContent = original;
    }
  }

  function requireAccountThen(callback) {
    if (TengyunziAuth.readSession()?.access_token) {
      callback();
      return;
    }
    TengyunziAuth.openLogin(async () => {
      await loadAccount();
      callback();
    });
  }

  async function handleSubscriptionReturn() {
    const query = new URLSearchParams(window.location.search);
    const state = query.get('pp_sub');
    if (!state) return;
    if (state === 'cancel') {
      setNote('PayPal checkout was cancelled. Your profile is saved and no charge was made.', 'error');
      history.replaceState(null, '', `${location.pathname}#monthly`);
      return;
    }
    const subscriptionId = query.get('subscription_id') || '';
    let tradeNo = query.get('trade_no') || '';
    try { tradeNo = tradeNo || localStorage.getItem('tengyunzi_daily_trade') || ''; } catch (error) {}
    if (!subscriptionId || !tradeNo) {
      setNote('The PayPal return details are incomplete. Contact support before retrying payment.', 'error');
      return;
    }
    const verify = async () => {
      submit.disabled = true;
      setNote('Confirming your Personal Monthly Forecast membership...', '');
      try {
        await request('verify_subscription', { subscription_id: subscriptionId, trade_no: tradeNo }, true);
        setNote('Membership active. Your personal monthly forecast is ready.', 'success');
        history.replaceState(null, '', `${location.pathname}#monthly`);
        await loadAccount();
      } catch (error) {
        setNote('Payment is still being confirmed. Refresh in a moment; PayPal will also confirm it by webhook.', 'error');
      } finally {
        submit.disabled = false;
      }
    };
    requireAccountThen(verify);
  }

  planButtons.forEach((button) => button.addEventListener('click', () => {
    selectedPlan = button.dataset.dailyPlan === 'monthly' ? 'monthly' : 'yearly';
    planButtons.forEach((item) => item.setAttribute('aria-pressed', item === button ? 'true' : 'false'));
    renderAccount({ membership: currentMembership, profile: { enabled: !pauseButton.hidden } });
  }));

  loginButton.addEventListener('click', () => {
    if (TengyunziAuth.readSession()?.access_token) window.location.href = './tengyunzi-account.html#top';
    else TengyunziAuth.openLogin(loadAccount);
  });

  pauseButton.addEventListener('click', async () => {
    pauseButton.disabled = true;
    try {
      await request('pause', {}, true);
      setNote('Monthly forecast emails are paused. Your paid access remains active.', 'success');
      pauseButton.hidden = true;
    } catch (error) {
      setNote('The reminder could not be paused. Please try again.', 'error');
    } finally {
      pauseButton.disabled = false;
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    requireAccountThen(saveOrCheckout);
  });

  form.addEventListener('change', () => loadPreview(Boolean(form.elements.birth_date.value)));
  window.addEventListener('tengyunzi:auth-change', loadAccount);
  setDetectedTimezone();
  loadPreview(false);
  loadAccount().then(handleSubscriptionReturn);
})();
