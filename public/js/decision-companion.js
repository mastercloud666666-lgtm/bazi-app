(function () {
  const form = document.querySelector('[data-decision-form]');
  if (!form) return;

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const DECISION_API = `${SUPABASE_URL}/functions/v1/decision-intake`;
  const PAYPAL_API = `${SUPABASE_URL}/functions/v1/paypal`;
  const ANALYZE_API = `${SUPABASE_URL}/functions/v1/analyze`;
  const TURNSTILE_SITEKEY = '0x4AAAAAADtPotu7LEYsxLGt';
  const TRADE_KEY = 'tengyunzi_decision_trade_no';
  const DRAFT_KEY = 'tengyunzi_decision_draft';

  const trigrams = {
    1: ['Qian', '乾', [1, 1, 1]],
    2: ['Dui', '兑', [1, 1, 0]],
    3: ['Li', '离', [1, 0, 1]],
    4: ['Zhen', '震', [1, 0, 0]],
    5: ['Xun', '巽', [0, 1, 1]],
    6: ['Kan', '坎', [0, 1, 0]],
    7: ['Gen', '艮', [0, 0, 1]],
    8: ['Kun', '坤', [0, 0, 0]],
  };
  const names = {
    乾: { 乾: 'The Creative', 兑: 'Treading', 离: 'Fellowship', 震: 'Innocence', 巽: 'Coming to Meet', 坎: 'Conflict', 艮: 'Retreat', 坤: 'Standstill' },
    兑: { 乾: 'Breakthrough', 兑: 'The Joyous', 离: 'Revolution', 震: 'Following', 巽: 'Great Exceeding', 坎: 'Oppression', 艮: 'Influence', 坤: 'Gathering' },
    离: { 乾: 'Great Possession', 兑: 'Opposition', 离: 'The Clinging', 震: 'Biting Through', 巽: 'The Cauldron', 坎: 'Before Completion', 艮: 'The Wanderer', 坤: 'Progress' },
    震: { 乾: 'Great Power', 兑: 'The Marrying Maiden', 离: 'Abundance', 震: 'The Arousing', 巽: 'Duration', 坎: 'Deliverance', 艮: 'Small Exceeding', 坤: 'Enthusiasm' },
    巽: { 乾: 'Small Taming', 兑: 'Inner Truth', 离: 'The Family', 震: 'Increase', 巽: 'The Gentle', 坎: 'Dispersion', 艮: 'Development', 坤: 'Contemplation' },
    坎: { 乾: 'Waiting', 兑: 'Limitation', 离: 'After Completion', 震: 'Difficulty at the Beginning', 巽: 'The Well', 坎: 'The Abysmal', 艮: 'Obstruction', 坤: 'Holding Together' },
    艮: { 乾: 'Great Taming', 兑: 'Decrease', 离: 'Grace', 震: 'Nourishment', 巽: 'Repairing Decay', 坎: 'Youthful Folly', 艮: 'Keeping Still', 坤: 'Splitting Apart' },
    坤: { 乾: 'Peace', 兑: 'Approach', 离: 'Darkening of the Light', 震: 'Return', 巽: 'Pushing Upward', 坎: 'The Army', 艮: 'Modesty', 坤: 'The Receptive' },
  };

  const stage = form.querySelector('[data-cast-stage]');
  const status = form.querySelector('[data-cast-status]');
  const castButton = form.querySelector('[data-cast-button]');
  const paymentNote = form.querySelector('.cast-payment-note');
  const slots = [...form.querySelectorAll('[data-cast-slot]')];
  const preview = document.querySelector('[data-hexagram-preview]');
  const result = document.querySelector('[data-reading-result]');
  const readingState = document.querySelector('[data-reading-state]');
  const readingText = document.querySelector('[data-reading-text]');
  const verificationBox = form.querySelector('[data-turnstile-box]');
  const values = [];
  let tradeNo = '';
  let busy = false;
  let turnstileToken = '';
  let pendingInterpretation = false;

  function headers(json = true) {
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    };
  }

  async function post(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false || data.error) {
      const error = new Error(data.error || 'request_failed');
      error.details = data;
      throw error;
    }
    return data;
  }

  function checkoutOrigin() {
    return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname)
      ? 'https://www.tengyunzi.com'
      : location.origin;
  }

  function trigramFromBits(bits) {
    const value = bits[0] * 4 + bits[1] * 2 + bits[2];
    return ({ 7: '乾', 6: '兑', 5: '离', 4: '震', 3: '巽', 2: '坎', 1: '艮', 0: '坤' })[value];
  }

  function renderLines(container, lines) {
    container.innerHTML = lines.map((line) => `<span class="hex-line ${line ? 'yang' : 'yin'}"></span>`).join('');
  }

  function showHexagrams() {
    if (values.length !== 3) return;
    const upper = trigrams[values[0]];
    const lower = trigrams[values[1]];
    const original = [...lower[2], ...upper[2]];
    const transformed = [...original];
    transformed[values[2] - 1] = transformed[values[2] - 1] ? 0 : 1;
    const resultLower = trigramFromBits(transformed.slice(0, 3));
    const resultUpper = trigramFromBits(transformed.slice(3, 6));

    renderLines(document.querySelector('[data-original-lines]'), original);
    renderLines(document.querySelector('[data-result-lines]'), transformed);
    document.querySelector('[data-original-name]').textContent = names[upper[1]][lower[1]];
    document.querySelector('[data-result-name]').textContent = names[resultUpper][resultLower];
    preview.hidden = false;
  }

  function setQuestionLocked(locked) {
    form.elements.category.disabled = locked;
    form.elements.question.readOnly = locked;
    form.querySelectorAll('[data-question-example]').forEach((button) => {
      button.disabled = locked;
    });
  }

  function renderValues(nextValues) {
    values.length = 0;
    nextValues.slice(0, 3).forEach((value) => values.push(Number(value)));
    const emptyLabels = ['1 · Upper', '2 · Lower', '3 · Moving line'];
    const filledLabels = ['Upper', 'Lower', 'Moving line'];
    slots.forEach((slot, index) => {
      if (Number.isInteger(values[index])) {
        slot.textContent = `${filledLabels[index]} · ${values[index]}`;
        slot.classList.add('is-filled');
      } else {
        slot.textContent = emptyLabels[index];
        slot.classList.remove('is-filled');
      }
    });
  }

  function applyPaidState(data) {
    tradeNo = data.trade_no || tradeNo;
    if (tradeNo) localStorage.setItem(TRADE_KEY, tradeNo);
    if (data.category) form.elements.category.value = data.category;
    if (data.question) form.elements.question.value = data.question;
    setQuestionLocked(true);
    stage.classList.add('is-unlocked');
    paymentNote.textContent = 'Payment confirmed. Each click now records one permanent number for this question.';
    renderValues(Array.isArray(data.values) ? data.values : []);
    preview.hidden = true;
    result.hidden = true;
    readingText.textContent = '';
    castButton.dataset.mode = values.length === 3 ? 'interpret' : 'cast';
    castButton.disabled = false;
    if (values.length === 3) {
      showHexagrams();
      status.textContent = `Cast complete. Moving line: ${values[2]}.`;
      if (data.analysis) {
        result.hidden = false;
        readingState.textContent = 'Interpretation complete.';
        readingText.textContent = data.analysis;
        castButton.dataset.mode = 'reset';
        castButton.textContent = 'Start a new question';
      } else {
        castButton.textContent = 'Interpret this cast';
      }
    } else {
      const prompts = [
        'Cast 1 of 3: generate the upper trigram number (1–8).',
        'Cast 2 of 3: generate the lower trigram number (1–8).',
        'Cast 3 of 3: generate the moving line (1–6).',
      ];
      status.textContent = prompts[values.length];
      castButton.textContent = `Cast ${values.length + 1} of 3`;
    }
  }

  function beginNewQuestion() {
    tradeNo = '';
    values.length = 0;
    localStorage.removeItem(TRADE_KEY);
    localStorage.removeItem(DRAFT_KEY);
    history.replaceState(null, '', `${location.pathname}#ask`);
    setQuestionLocked(false);
    form.reset();
    renderValues([]);
    stage.classList.remove('is-unlocked');
    preview.hidden = true;
    result.hidden = true;
    readingText.textContent = '';
    status.textContent = 'Write one clear question, then unlock one complete cast.';
    paymentNote.textContent = 'Secure one-time payment through PayPal. Your question is locked after payment.';
    castButton.dataset.mode = 'checkout';
    castButton.textContent = 'Unlock 3 Casts · $9.99';
    castButton.disabled = false;
    form.elements.question.focus();
  }

  async function startCheckout() {
    const question = String(form.elements.question.value || '').trim();
    if (!form.checkValidity() || question.length < 20) {
      form.reportValidity();
      status.textContent = 'Write one clear question of at least 20 characters before checkout.';
      form.elements.question.focus();
      return;
    }

    busy = true;
    castButton.disabled = true;
    castButton.textContent = 'Opening PayPal…';
    status.textContent = 'Saving this question before secure checkout…';
    try {
      const order = await post(DECISION_API, {
        action: 'create',
        category: form.elements.category.value,
        question,
        website: form.elements.website.value,
      });
      tradeNo = order.trade_no;
      localStorage.setItem(TRADE_KEY, tradeNo);
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        category: form.elements.category.value,
        question,
      }));
      const checkout = await post(PAYPAL_API, {
        action: 'create',
        trade_no: tradeNo,
        option_id: 'zhanbu',
        service: 'zhanbu',
        origin: checkoutOrigin(),
      });
      if (!checkout.approve_url) throw new Error('paypal_checkout_failed');
      location.assign(checkout.approve_url);
    } catch (error) {
      status.textContent = 'PayPal checkout could not be opened. You have not been charged.';
      castButton.disabled = false;
      castButton.textContent = 'Unlock 3 Casts · $9.99';
    } finally {
      busy = false;
    }
  }

  async function castNextNumber() {
    if (!tradeNo || busy || values.length >= 3) return;
    busy = true;
    stage.classList.add('is-casting');
    castButton.disabled = true;
    castButton.textContent = 'Generating securely…';
    try {
      const cast = await post(DECISION_API, {
        action: 'cast',
        trade_no: tradeNo,
      });
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      applyPaidState({ ...cast, trade_no: tradeNo });
    } catch (error) {
      status.textContent = error.message === 'payment_required'
        ? 'Payment must be confirmed before casting.'
        : 'This number could not be recorded. Please try again.';
      castButton.disabled = false;
      castButton.textContent = `Cast ${values.length + 1} of 3`;
    } finally {
      stage.classList.remove('is-casting');
      busy = false;
    }
  }

  function loadTurnstile() {
    if (window.turnstile) {
      renderTurnstile();
      return;
    }
    if (document.querySelector('script[data-decision-turnstile]')) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.decisionTurnstile = '';
    script.addEventListener('load', renderTurnstile);
    document.head.appendChild(script);
  }

  function renderTurnstile() {
    if (!window.turnstile || verificationBox.dataset.rendered) return;
    verificationBox.dataset.rendered = 'true';
    window.turnstile.render(verificationBox, {
      sitekey: TURNSTILE_SITEKEY,
      theme: 'light',
      callback(token) {
        turnstileToken = token;
        if (pendingInterpretation) requestReading();
      },
      'expired-callback'() { turnstileToken = ''; },
      'error-callback'() {
        status.textContent = 'Verification could not load. Please refresh and try again.';
      },
    });
  }

  async function requestReading() {
    if (!tradeNo || values.length !== 3 || busy) return;
    if (!turnstileToken) {
      pendingInterpretation = true;
      status.textContent = 'Complete the quick human verification to request the interpretation.';
      loadTurnstile();
      return;
    }

    pendingInterpretation = false;
    busy = true;
    castButton.disabled = true;
    result.hidden = false;
    readingState.textContent = 'Reading the original hexagram, moving line, and resulting hexagram…';
    readingText.textContent = '';
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });

    try {
      const response = await fetch(ANALYZE_API, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          trade_no: tradeNo,
          service: 'zhanbu',
          method: 'gaodao',
          lang: 'en',
          stream: true,
          turnstile_token: turnstileToken,
        }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.message || failure.error || 'The interpretation service is unavailable.');
      }

      const type = response.headers.get('Content-Type') || '';
      if (response.body && type.includes('text/event-stream')) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let full = '';
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const value = line.slice(6).trim();
            if (!value || value === '[DONE]') continue;
            try {
              full += JSON.parse(value).choices?.[0]?.delta?.content || '';
              readingText.textContent = full;
            } catch {}
          }
        }
        if (!full.trim()) throw new Error('The interpretation returned no text.');
      } else {
        const body = await response.json();
        readingText.textContent = body.analysis || body.result || '';
        if (!readingText.textContent.trim()) throw new Error('The interpretation returned no text.');
      }
      readingState.textContent = 'Interpretation complete.';
      castButton.textContent = 'Start a new question';
      castButton.disabled = false;
      castButton.dataset.mode = 'reset';
    } catch (error) {
      readingState.textContent = error instanceof Error ? error.message : 'The interpretation could not be completed.';
      readingText.textContent = 'Your paid cast is preserved. You can retry the interpretation without generating new numbers.';
      castButton.textContent = 'Try interpretation again';
      castButton.disabled = false;
      castButton.dataset.mode = 'interpret';
    } finally {
      busy = false;
      turnstileToken = '';
      if (window.turnstile && verificationBox.dataset.rendered) {
        try { window.turnstile.reset(verificationBox); } catch {}
      }
    }
  }

  async function restoreOrder(orderReference) {
    if (!orderReference) return false;
    try {
      const data = await post(DECISION_API, {
        action: 'status',
        trade_no: orderReference,
      });
      if (!data.paid) return false;
      applyPaidState({ ...data, trade_no: orderReference });
      return true;
    } catch {
      return false;
    }
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get('pp');
    const orderReference = params.get('trade_no') || localStorage.getItem(TRADE_KEY) || '';
    if (paymentState === 'cancel') {
      status.textContent = 'PayPal checkout was cancelled. You have not been charged.';
      return;
    }
    if (paymentState === '1') {
      const paypalOrderId = params.get('token');
      if (!paypalOrderId || !orderReference) {
        status.textContent = 'We could not match this PayPal return to your question.';
        return;
      }
      castButton.disabled = true;
      castButton.textContent = 'Confirming payment…';
      status.textContent = 'Confirming your PayPal payment…';
      try {
        if (await restoreOrder(orderReference)) {
          history.replaceState(null, '', `${location.pathname}?trade_no=${encodeURIComponent(orderReference)}#ask`);
          status.textContent = 'Payment confirmed. Take a breath, hold the question in mind, and continue your cast.';
          return;
        }
        await post(PAYPAL_API, {
          action: 'capture',
          paypal_order_id: paypalOrderId,
          trade_no: orderReference,
          origin: checkoutOrigin(),
        });
        history.replaceState(null, '', `${location.pathname}?trade_no=${encodeURIComponent(orderReference)}#ask`);
        await restoreOrder(orderReference);
        status.textContent = 'Payment confirmed. Take a breath, hold the question in mind, and begin the first cast.';
      } catch {
        status.textContent = 'Payment could not be confirmed. If PayPal charged you, contact support with your order reference.';
        castButton.disabled = false;
        castButton.textContent = 'Try checkout again · $9.99';
      }
      return;
    }
    if (orderReference) {
      castButton.disabled = true;
      status.textContent = 'Checking this saved cast…';
      const restored = await restoreOrder(orderReference);
      if (!restored) {
        castButton.disabled = false;
        castButton.textContent = 'Unlock 3 Casts · $9.99';
        status.textContent = 'Write one clear question, then unlock one complete cast.';
      }
    }
  }

  form.querySelectorAll('[data-question-example]').forEach((button) => {
    button.addEventListener('click', () => {
      form.elements.question.value = button.dataset.questionExample || '';
      form.elements.question.focus();
    });
  });

  castButton.dataset.mode = 'checkout';
  castButton.addEventListener('click', () => {
    if (busy) return;
    const mode = castButton.dataset.mode || 'checkout';
    if (mode === 'reset') beginNewQuestion();
    else if (mode === 'cast') castNextNumber();
    else if (mode === 'interpret') requestReading();
    else startCheckout();
  });

  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    if (draft.category) form.elements.category.value = draft.category;
    if (draft.question) form.elements.question.value = draft.question;
  } catch {}
  handlePaymentReturn();
})();
