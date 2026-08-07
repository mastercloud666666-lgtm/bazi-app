(function () {
  'use strict';

  const REPORT_API = `${TengyunziAuth.SUPABASE_URL}/functions/v1/english-report`;
  const PAYPAL_API = `${TengyunziAuth.SUPABASE_URL}/functions/v1/paypal`;
  const DRAFT_KEY = 'tengyunzi_report_draft_v1';
  const PENDING_TRADE_KEY = 'tengyunzi_pending_report_trade_v1';
  const ADMIN_TOKEN_KEY = 'tengyunzi_admin_session_token';
  const elementNames = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
  const reportConfidence = {
    1: ['SUPPORTED', 'Four Pillars plus governing chart verdict'],
    2: ['SUPPORTED', 'Pattern and explicit favorable-element judgment'],
    3: ['CALCULATED', 'Weighted Five-Element and Ten-God structure'],
    4: ['CALCULATED', 'Canonical contacts, repetition, Fu Yin, and Void'],
    5: ['SUPPORTED', 'Capability derived from the governing pattern'],
    6: ['CONTEXTUAL', 'Kinship symbols are not verified biography'],
    7: ['CONTEXTUAL', 'Career modes follow the element verdict'],
    8: ['CONTEXTUAL', 'Wealth structure is not a financial guarantee'],
    9: ['CONTEXTUAL', 'Relationship symbols are not guaranteed events'],
    10: ['CONTEXTUAL', 'Traditional Five-Element body correspondence'],
    11: ['SUPPORTED', 'Calculated Luck Cycles and structural ratings'],
    12: ['SUPPORTED', 'Calculated annual contacts and explicit ratings'],
    13: ['SUPPORTED', 'Synthesis of the same governing pattern'],
  };

  const form = document.querySelector('[data-report-form]');
  const statusNode = document.querySelector('[data-report-status]');
  const chartPreview = document.querySelector('[data-chart-preview]');
  const reportStage = document.querySelector('[data-report-stage]');
  const reportBody = document.querySelector('[data-report-body]');
  const reportSummary = document.querySelector('[data-mobile-report-summary]');
  const reportSectionNav = document.querySelector('[data-report-section-nav]');
  const freeButton = document.querySelector('[data-create-free]');
  const paidButton = document.querySelector('[data-create-paid]');
  let currentPayload = null;
  let aiAvailable = null;
  const adminTestMode = new URLSearchParams(window.location.search).get('admin_test') === '1'
    && Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY));

  const unavailableMessage = 'AI reports are temporarily paused while generation capacity is restored. No payment can be started. The personal reading remains available.';

  async function pricingPayload() {
    if (!window.TengyunziPricing) return {};
    const pricing = await window.TengyunziPricing.ready;
    return { price_experiment: pricing };
  }

  function setStatus(message, state) {
    statusNode.textContent = message || '';
    statusNode.dataset.state = state || '';
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.defaultText;
  }

  function applyAiAvailability() {
    if (aiAvailable !== false) return;
    freeButton.disabled = true;
    paidButton.disabled = true;
  }

  async function refreshAiAvailability() {
    try {
      const response = await fetch(REPORT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: TengyunziAuth.SUPABASE_ANON,
          Authorization: `Bearer ${TengyunziAuth.SUPABASE_ANON}`,
        },
        body: JSON.stringify({ action: 'status' }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.ok !== true) return;
      aiAvailable = data.ai_available === true;
      if (!aiAvailable) {
        applyAiAvailability();
        setStatus(unavailableMessage, 'error');
      }
    } catch (error) {}
  }

  function validDate(year, month, day) {
    const value = new Date(year, month - 1, day);
    return value.getFullYear() === year && value.getMonth() === month - 1 && value.getDate() === day;
  }

  function buildPayload() {
    const data = new FormData(form);
    const year = Number(data.get('year'));
    const month = Number(data.get('month'));
    const day = Number(data.get('day'));
    const hourValue = String(data.get('hour') || 'unknown');
    const hourKnown = hourValue !== 'unknown';
    const hour = hourKnown ? Number(hourValue) : 12;
    const gender = String(data.get('gender') || '').toLowerCase();
    const birthplace = String(data.get('birthplace') || '').trim();

    if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || !validDate(year, month, day)) {
      throw new Error('Enter a valid birth date.');
    }
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error('Select a valid birth hour.');
    if (!['male', 'female'].includes(gender)) throw new Error('Select a gender.');
    if (!window.BaziCalc?.calculateBazi) throw new Error('The chart engine did not load. Refresh and try again.');

    const chart = window.BaziCalc.calculateBazi(year, month, day, hour);
    const calcGender = gender === 'male' ? '\u7537' : '\u5973';
    const luck = window.BaziCalc.calculateDaYun(chart.year, chart.month, calcGender, year, month, day, hour);
    const finalLuck = luck.dayuns[luck.dayuns.length - 1];
    const specialYears = window.BaziCalc.calcSpecialYears(
      chart,
      luck.dayuns,
      year,
      year + luck.startAge,
      year + finalLuck.ageStart + 10,
    );
    const visiblePillars = hourKnown ? ['year', 'month', 'day', 'hour'] : ['year', 'month', 'day'];
    const baziString = visiblePillars
      .map((key) => `${chart[key].tg}${chart[key].dz}`)
      .join(' / ') + (hourKnown ? '' : ' / Hour unknown');
    const luckText = luck.dayuns
      .map((period) => `${period.gz} from age ${period.ageStart} (${period.yearStart})`)
      .join(' | ');
    const specialText = specialYears.length
      ? specialYears.map((item) => {
          const descriptions = item.reasons.map((reason) => {
            if (String(reason).includes('天克地冲')) return 'stem-and-branch structural clash';
            if (String(reason).includes('岁运并临')) return 'annual and Luck-Pillar pattern repetition';
            return 'notable structural emphasis';
          });
          return `${item.year} ${item.gz}: ${descriptions.join('; ')}`;
        }).join('\n')
      : 'No major structural markers detected in the calculated range.';

    const visibleElements = { ...chart.wuxing };
    if (!hourKnown) {
      for (const symbol of [chart.hour.tg, chart.hour.dz]) {
        const element = window.BaziCalc.WUXING[symbol];
        if (element && visibleElements[element] > 0) visibleElements[element] -= 1;
      }
    }
    const chartData = {
      pillars: Object.fromEntries(['year', 'month', 'day', 'hour'].map((key) => [key, {
        stem: key === 'hour' && !hourKnown ? '' : chart[key].tg,
        branch: key === 'hour' && !hourKnown ? '' : chart[key].dz,
      }])),
      elements: Object.fromEntries(Object.entries(visibleElements).map(([key, value]) => [elementNames[key], Number(value)])),
    };
    const birthInput = {
      year,
      month,
      day,
      hour,
      hour_known: hourKnown,
      gender,
      birthplace,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      bazi_str: baziString,
      dayun_text: luckText,
      special_years_text: specialText,
      start_age: luck.startAge,
    };
    return { birth_input: birthInput, chart_data: chartData };
  }

  function fillForm(payload) {
    const input = payload?.birth_input || {};
    for (const name of ['year', 'month', 'day', 'gender', 'birthplace']) {
      const field = form.elements[name];
      if (field && input[name] !== undefined && input[name] !== null) field.value = String(input[name]);
    }
    if (form.elements.hour) form.elements.hour.value = input.hour_known === false ? 'unknown' : String(input.hour ?? 12);
  }

  function showChart(payload, scroll) {
    const pillars = payload.chart_data?.pillars || {};
    for (const name of ['year', 'month', 'day', 'hour']) {
      const node = document.querySelector(`[data-pillar="${name}"]`);
      if (node) {
        const hourIsUnknown = name === 'hour' && payload.birth_input?.hour_known === false;
        const stem = pillars[name]?.stem || '';
        const branch = pillars[name]?.branch || '';
        window.BaziCalc.renderColoredPillar(node, stem, branch, hourIsUnknown ? 'Unknown' : '');
        if (!hourIsUnknown && !stem && !branch) node.textContent = '--';
      }
    }
    for (const name of ['wood', 'fire', 'earth', 'metal', 'water']) {
      const node = document.querySelector(`[data-element="${name}"]`);
      if (node) node.textContent = String(payload.chart_data?.elements?.[name] || 0);
    }
    const birth = payload.birth_input;
    document.querySelector('[data-chart-date]').textContent = new Date(Date.UTC(birth.year, birth.month - 1, birth.day))
      .toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    chartPreview.classList.add('is-visible');
    if (scroll) chartPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderReport(report) {
    const text = String(report?.result_text || '').trim();
    if (!text) return;
    reportBody.replaceChildren();
    reportSectionNav.replaceChildren();
    const chunks = text.split(/(?=^Section\s+\d+\s*:)/gim).map((part) => part.trim()).filter(Boolean);
    const sections = chunks.length ? chunks : [text];

    const pillars = report.chart_data?.pillars || {};
    const dayMaster = pillars.day?.stem || '--';
    const chart = ['year', 'month', 'day', 'hour']
      .map((name) => `${pillars[name]?.stem || '?'}${pillars[name]?.branch || '?'}`)
      .join(' / ');
    reportSummary.replaceChildren();
    const summaryTitle = document.createElement('div');
    summaryTitle.className = 'mobile-report-summary-title';
    summaryTitle.innerHTML = '<span>EXECUTIVE VIEW</span><strong>Your chart at a glance</strong>';
    const summaryGrid = document.createElement('div');
    summaryGrid.className = 'mobile-report-summary-grid';
    const summaryItems = [
      ['Day Master', dayMaster],
      ['Four Pillars', chart],
      ['Reading depth', `${sections.length} chapter${sections.length === 1 ? '' : 's'}`],
    ];
    for (const [label, value] of summaryItems) {
      const item = document.createElement('div');
      const small = document.createElement('span');
      const strong = document.createElement('strong');
      small.textContent = label;
      strong.textContent = value;
      item.append(small, strong);
      summaryGrid.appendChild(item);
    }
    const summaryNote = document.createElement('p');
    summaryNote.textContent = 'Confidence labels distinguish calculated facts, structurally supported readings, and context-dependent interpretation.';
    reportSummary.append(summaryTitle, summaryGrid, summaryNote);

    for (const chunk of sections) {
      const lines = chunk.split(/\n+/).map((line) => line.trim()).filter(Boolean);
      const section = document.createElement('section');
      section.className = 'report-section';
      const first = lines[0] || 'Your reading';
      const numberMatch = first.match(/^Section\s+(\d+)\s*:/i);
      const sectionNumber = Number(numberMatch?.[1] || 0);
      if (sectionNumber) section.id = `mobile-report-section-${sectionNumber}`;
      const heading = document.createElement('h3');
      const isHeading = /^Section\s+\d+\s*:/i.test(first);
      heading.textContent = isHeading ? first : 'Your reading';
      const paragraph = document.createElement('p');
      paragraph.textContent = (isHeading ? lines.slice(1) : lines).join('\n\n');
      const confidence = reportConfidence[sectionNumber] || ['CONTEXTUAL', 'Compare with lived circumstances'];
      const confidenceNode = document.createElement('div');
      confidenceNode.className = `report-confidence is-${confidence[0].toLowerCase()}`;
      const confidenceLabel = document.createElement('strong');
      const confidenceText = document.createElement('span');
      confidenceLabel.textContent = confidence[0];
      confidenceText.textContent = confidence[1];
      confidenceNode.append(confidenceLabel, confidenceText);
      section.append(heading, confidenceNode, paragraph);
      reportBody.appendChild(section);
      if (sectionNumber) {
        const link = document.createElement('a');
        link.href = `#mobile-report-section-${sectionNumber}`;
        link.textContent = String(sectionNumber).padStart(2, '0');
        link.setAttribute('aria-label', `Go to ${first}`);
        reportSectionNav.appendChild(link);
      }
    }

    const label = report.access_type === 'paid' ? 'BaZi Reading' : 'Free BaZi preview';
    document.querySelector('[data-report-label]').textContent = label;
    document.querySelector('[data-report-title]').textContent = report.access_type === 'paid' ? 'Your Complete BaZi Reading' : 'Your BaZi Preview';
    reportStage.classList.add('is-visible');
    reportStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function clearReport() {
    reportStage.classList.remove('is-visible');
    reportBody.replaceChildren();
    reportSummary.replaceChildren();
    reportSectionNav.replaceChildren();
  }

  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    window.__renderTengyunziReportPreview = renderReport;
  }

  async function reportApi(action, payload) {
    const headers = {};
    if (action === 'create_admin_test' && adminTestMode) {
      headers['x-admin-token'] = sessionStorage.getItem(ADMIN_TOKEN_KEY) || '';
      headers.apikey = TengyunziAuth.SUPABASE_ANON;
      headers.Authorization = `Bearer ${TengyunziAuth.readSession()?.access_token || TengyunziAuth.SUPABASE_ANON}`;
      headers['Content-Type'] = 'application/json';
      const response = await fetch(REPORT_API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, ...(payload || {}) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) {
        const error = new Error(data.error || `request_failed_${response.status}`);
        error.details = data.details || '';
        throw error;
      }
      return data;
    }
    const response = await TengyunziAuth.authorizedFetch(REPORT_API, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, ...(payload || {}) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(data.error || `request_failed_${response.status}`);
      error.details = data.details || '';
      throw error;
    }
    return data;
  }

  function friendlyError(error) {
    if (error.message === 'free_daily_limit_reached') return 'You have reached today\'s free preview limit. Your earlier readings remain in My Readings.';
    if (error.message === 'authentication_required') return 'Sign in to continue.';
    if (error.message === 'report_service_temporarily_unavailable') return unavailableMessage;
    if (error.message === 'report_generation_failed') return 'The reading could not be completed just now. Please try again shortly.';
    return 'Something went wrong. Please try again.';
  }

  async function createFreeReport() {
    if (!currentPayload) return;
    if (aiAvailable === false) {
      setStatus(unavailableMessage, 'error');
      return;
    }
    clearReport();
    setBusy(freeButton, true, 'Generating your preview...');
    setBusy(paidButton, true, 'BaZi Reading');
    setStatus('Reading your chart. This can take about a minute.', 'success');
    try {
      const data = await reportApi('create_free', currentPayload);
      renderReport(data.report);
      setStatus('Your free preview is ready and saved to My Readings.', 'success');
    } catch (error) {
      if (error.message === 'report_service_temporarily_unavailable') aiAvailable = false;
      setStatus(friendlyError(error), 'error');
    } finally {
      setBusy(freeButton, false);
      setBusy(paidButton, false);
      applyAiAvailability();
    }
  }

  function checkoutOrigin() {
    const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return local || !/^https?:$/.test(window.location.protocol) ? 'https://tengyunzi.com' : window.location.origin;
  }

  async function createPayPalOrder(report) {
    const response = await fetch(PAYPAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: TengyunziAuth.SUPABASE_ANON,
        Authorization: `Bearer ${TengyunziAuth.SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        action: 'create',
        trade_no: report.trade_no,
        option_id: 'english_report',
        service: 'bazi',
        origin: checkoutOrigin(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.approve_url) throw new Error(data.error || 'paypal_checkout_failed');
    return data.approve_url;
  }

  async function createPaidReport() {
    if (!currentPayload) return;
    if (aiAvailable === false) {
      setStatus(unavailableMessage, 'error');
      return;
    }
    clearReport();
    setBusy(paidButton, true, adminTestMode ? 'Generating test report...' : 'Opening PayPal...');
    setBusy(freeButton, true, 'Free preview');
    const pricing = adminTestMode ? {} : await pricingPayload();
    const displayPrice = pricing.price_experiment?.ai_price || '9.99';
    setStatus(adminTestMode ? 'Generating the administrator test report. No payment will be created.' : `Creating your secure $${displayPrice} order...`, 'success');
    try {
      const data = await reportApi(adminTestMode ? 'create_admin_test' : 'create_paid', { ...currentPayload, ...pricing });
      if (adminTestMode) {
        renderReport(data.report);
        setStatus('Administrator test complete. No payment was created, and the result is saved in the admin Reports view.', 'success');
        setBusy(paidButton, false);
        setBusy(freeButton, false);
        return;
      }
      localStorage.setItem(PENDING_TRADE_KEY, data.report.trade_no);
      const approvalUrl = await createPayPalOrder(data.report);
      window.location.assign(approvalUrl);
    } catch (error) {
      if (error.message === 'report_service_temporarily_unavailable') aiAvailable = false;
      const validationFailed = error.message === 'report_generation_failed'
        && String(error.details || '').includes('report_ground_truth_validation_failed');
      const message = error.message === 'report_service_temporarily_unavailable'
        ? unavailableMessage
        : (adminTestMode
          ? (validationFailed
            ? 'The draft failed the factual consistency check and was not saved as a deliverable. Retry once; persistent failures appear in the admin Reports view.'
            : 'The administrator test could not be generated. No payment was created.')
          : 'PayPal checkout could not be opened. You have not been charged.');
      setStatus(message, 'error');
      setBusy(paidButton, false);
      setBusy(freeButton, false);
      applyAiAvailability();
    }
  }

  async function capturePayPalOrder(paypalOrderId, tradeNo) {
    const response = await fetch(PAYPAL_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: TengyunziAuth.SUPABASE_ANON,
        Authorization: `Bearer ${TengyunziAuth.SUPABASE_ANON}`,
      },
      body: JSON.stringify({
        action: 'capture',
        paypal_order_id: paypalOrderId,
        trade_no: tradeNo,
        origin: checkoutOrigin(),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || 'capture_failed');
    return data;
  }

  async function waitForPaidReport(tradeNo) {
    const started = Date.now();
    while (Date.now() - started < 4 * 60 * 1000) {
      const data = await reportApi('get', { trade_no: tradeNo });
      const report = data.report;
      if (report.status === 'ready' && report.result_text) return report;
      if (report.status === 'failed') throw new Error('report_generation_failed');
      setStatus('Payment confirmed. Your complete reading is being written...', 'success');
      await new Promise((resolve) => window.setTimeout(resolve, 4000));
    }
    throw new Error('report_timeout');
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get('pp');
    const requestedReport = params.get('report');
    if (requestedReport) {
      TengyunziAuth.requireAuth(async () => {
        try {
          const data = await reportApi('get', { id: requestedReport });
          if (data.report.birth_input && data.report.chart_data) {
            currentPayload = { birth_input: data.report.birth_input, chart_data: data.report.chart_data };
            fillForm(currentPayload);
            showChart(currentPayload, false);
          }
          if (data.report.status === 'ready') renderReport(data.report);
          else setStatus(`This report is currently ${String(data.report.status).replace(/_/g, ' ')}.`, data.report.status === 'failed' ? 'error' : 'success');
        } catch (error) {
          setStatus('This reading could not be opened.', 'error');
        }
      });
      return;
    }
    if (!paymentState) return;
    if (paymentState === 'cancel') {
      setStatus('PayPal checkout was cancelled. You have not been charged.', 'error');
      return;
    }

    const paypalOrderId = params.get('token');
    const tradeNo = params.get('trade_no') || localStorage.getItem(PENDING_TRADE_KEY) || '';
    if (!paypalOrderId || !tradeNo) {
      setStatus('We could not match this PayPal return to a report.', 'error');
      return;
    }

    TengyunziAuth.requireAuth(async () => {
      setStatus('Confirming your PayPal payment...', 'success');
      try {
        await capturePayPalOrder(paypalOrderId, tradeNo);
        const report = await waitForPaidReport(tradeNo);
        localStorage.removeItem(PENDING_TRADE_KEY);
        currentPayload = { birth_input: report.birth_input, chart_data: report.chart_data };
        fillForm(currentPayload);
        showChart(currentPayload, false);
        renderReport(report);
        setStatus('Your payment is confirmed and the complete reading is saved to My Readings.', 'success');
        history.replaceState(null, '', `${window.location.pathname}?report=${encodeURIComponent(report.id)}`);
      } catch (error) {
        const message = error.message === 'report_timeout'
          ? 'Payment is confirmed. The report is still generating and will appear in My Readings shortly.'
          : friendlyError(error);
        setStatus(message, error.message === 'report_timeout' ? 'success' : 'error');
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      currentPayload = buildPayload();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(currentPayload));
      showChart(currentPayload, true);
      clearReport();
      setStatus(aiAvailable === false ? unavailableMessage : 'Your Four Pillars are ready. Choose a reading below.', aiAvailable === false ? 'error' : 'success');
      applyAiAvailability();
    } catch (error) {
      setStatus(error.message || 'Check your birth details and try again.', 'error');
    }
  });

  freeButton.addEventListener('click', () => TengyunziAuth.requireAuth(createFreeReport));
  paidButton.addEventListener('click', () => {
    if (adminTestMode) createPaidReport();
    else TengyunziAuth.requireAuth(createPaidReport);
  });
  document.querySelector('[data-print-report]').addEventListener('click', () => window.print());

  const initialParams = new URLSearchParams(window.location.search);
  if (adminTestMode) {
    paidButton.textContent = 'Generate administrator test report';
    paidButton.dataset.defaultText = paidButton.textContent;
    setStatus('Administrator test mode is active. The complete BaZi Reading can be generated without PayPal.', 'success');
  }
  const hasBirthParams = ['year', 'month', 'day'].every((name) => initialParams.get(name));
  if (hasBirthParams) {
    for (const name of ['year', 'month', 'day', 'hour', 'gender', 'birthplace']) {
      const value = initialParams.get(name);
      if (value !== null && form.elements[name]) form.elements[name].value = value;
    }
    try {
      currentPayload = buildPayload();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(currentPayload));
      showChart(currentPayload, false);
      setStatus(aiAvailable === false ? unavailableMessage : 'Your Four Pillars are ready. Choose a reading below.', aiAvailable === false ? 'error' : 'success');
      applyAiAvailability();
    } catch (error) {
      setStatus(error.message || 'Check your birth details and try again.', 'error');
    }
  } else {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (draft?.birth_input && draft?.chart_data) {
        currentPayload = draft;
        fillForm(draft);
        showChart(draft, false);
      }
    } catch (error) {}
  }

  handlePaymentReturn();
  refreshAiAvailability();
})();
