(function () {
  'use strict';

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const ORDERS_API = `${SUPABASE_URL}/functions/v1/admin-orders`;
  const NEWSLETTER_API = `${SUPABASE_URL}/functions/v1/admin-newsletter`;
  const REPORT_DELIVERY_API = `${SUPABASE_URL}/functions/v1/report-delivery`;
  const TOKEN_KEY = 'tengyunzi_admin_session_token';
  const ADMIN_KEY = 'tengyunzi_admin_profile';
  const tokenPanel = document.querySelector('[data-admin-token-panel]');
  const dashboard = document.querySelector('[data-admin-dashboard]');
  const navigation = document.querySelector('[data-admin-navigation]');
  const layout = document.querySelector('[data-admin-layout]');
  const periodControl = document.querySelector('[data-admin-days]');
  const refreshControl = document.querySelector('[data-admin-refresh]');
  const messageNodes = document.querySelectorAll('[data-admin-message]');
  let currentCampaignId = '';
  let newsletterProviderConfigured = false;
  let manualOrdersById = new Map();

  function getToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (error) { return ''; }
  }

  function setSession(token, admin) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(ADMIN_KEY, JSON.stringify(admin || {}));
    } catch (error) {}
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(ADMIN_KEY);
    } catch (error) {}
  }

  function readAdmin() {
    try { return JSON.parse(sessionStorage.getItem(ADMIN_KEY) || '{}'); } catch (error) { return {}; }
  }

  function setMessage(text, state) {
    messageNodes.forEach((node) => {
      node.textContent = text || '';
      node.dataset.state = state || '';
    });
  }

  function setCampaignMessage(text, state) {
    const node = document.querySelector('[data-campaign-message]');
    node.textContent = text || '';
    node.dataset.state = state || '';
  }

  function setPersonalMessage(text, state) {
    const node = document.querySelector('[data-personal-message]');
    node.textContent = text || '';
    node.dataset.state = state || '';
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function statusLabel(value) {
    return String(value || '-').replace(/_/g, ' ');
  }

  function friendlyError(error) {
    const messages = {
      invalid_admin_credentials: 'The username or password is incorrect.',
      admin_account_temporarily_locked: 'This account is locked for 15 minutes after repeated failed sign-in attempts.',
      unauthorized: 'Your administrator session has expired. Sign in again.',
      forbidden: 'This account does not have permission for that action.',
      newsletter_email_provider_not_configured: 'Newsletter sending is ready, but the Resend API key and sender address still need to be configured.',
      personal_delivery_email_not_configured: 'Email delivery is not available until Resend and the verified sender address are configured.',
      personal_reading_payment_not_completed: 'This personal reading has not completed payment yet.',
      delivery_url_required: 'Add the secure report URL before marking this order delivered.',
      delivery_url_must_use_https: 'Use a secure HTTPS report URL.',
      personal_reading_not_found: 'This personal reading could not be found.',
      manual_order_not_found: 'This manual order could not be found.',
      manual_order_payment_not_completed: 'This order has not completed payment yet.',
      report_email_provider_not_configured: 'PDF delivery is unavailable until Resend and the verified sender address are configured.',
      valid_pdf_attachment_required: 'Choose a valid PDF file.',
      pdf_attachment_too_large: 'Each PDF must be 6 MB or smaller.',
      pdf_attachments_too_large: 'The selected PDFs must total 10 MB or less.',
      incorrect_attachment_count: 'Choose the required number of PDF files for this product.',
      report_email_send_failed: 'The PDF email could not be sent. Check the Resend log and try again.',
      campaign_subject_and_body_required: 'Add a subject and at least 20 characters of letter content.',
      valid_test_email_subject_and_body_required: 'Add a valid test email, subject, and letter content.',
      current_password_incorrect: 'The current password is incorrect.',
      password_too_short: 'Use a new password with at least 10 characters.',
    };
    return messages[error.message] || 'The request could not be completed. Please try again.';
  }

  async function callApi(url, action, payload, authenticated = true) {
    const headers = {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    };
    if (authenticated) {
      const token = getToken();
      if (!token) throw new Error('unauthorized');
      headers['x-admin-token'] = token;
    }
    const response = await fetch(url, {
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

  function appendCells(row, values) {
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value === null || value === undefined || value === '' ? '-' : String(value);
      row.appendChild(cell);
    });
  }

  function emptyRow(body, columns, message) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = columns;
    cell.textContent = message;
    row.appendChild(cell);
    body.appendChild(row);
  }

  function renderMetrics(summary) {
    for (const [key, value] of Object.entries(summary || {})) {
      const node = document.querySelector(`[data-admin-metric="${key}"]`);
      if (node) node.textContent = key === 'revenue_usd' ? `$${Number(value || 0).toFixed(2)}` : Number(value || 0).toLocaleString('en-US');
    }
    document.querySelector('[data-admin-failures]').textContent = `${Number(summary?.reports_failed || 0)} failed`;
  }

  function renderReports(rows) {
    const body = document.querySelector('[data-admin-report-rows]');
    body.replaceChildren();
    document.querySelector('[data-report-count]').textContent = `${rows.length} rows`;
    if (!rows.length) return emptyRow(body, 9, 'No report activity in this period.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      appendCells(row, [
        item.email,
        item.is_test ? 'Admin test' : (item.access_type === 'paid' ? 'Complete report' : 'Free preview'),
        statusLabel(item.status),
        item.is_test ? 'No charge' : (item.access_type === 'paid' ? `$${Number(item.amount || 0).toFixed(2)}` : 'Free'),
        item.birth_date,
        item.birth_hour,
        item.gender,
        item.birthplace,
        formatDate(item.created_at),
      ]);
      body.appendChild(row);
    });
  }

  function renderManualOrders(rows) {
    const body = document.querySelector('[data-admin-manual-rows]');
    body.replaceChildren();
    manualOrdersById = new Map(rows.map((item) => [item.id, item]));
    document.querySelector('[data-manual-count]').textContent = `${rows.length} rows`;
    if (!rows.length) return emptyRow(body, 12, 'No manual product orders in this period.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      appendCells(row, [
        item.email || item.name,
        item.product,
        statusLabel(item.status),
        statusLabel(item.payment_status),
        `$${Number(item.amount || 0).toFixed(2)}`,
        item.focus_area,
        item.birth_date,
        item.birth_hour,
        item.gender,
        item.birthplace,
        formatDate(item.created_at),
      ]);
      const actionCell = document.createElement('td');
      const manageButton = document.createElement('button');
      manageButton.type = 'button';
      manageButton.className = 'admin-row-action';
      manageButton.textContent = 'Manage';
      manageButton.addEventListener('click', () => openPersonalEditor(item.id));
      actionCell.appendChild(manageButton);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
  }

  function closePersonalEditor() {
    const form = document.querySelector('[data-personal-form]');
    form.hidden = true;
    form.reset();
    setPersonalMessage('');
  }

  function openPersonalEditor(intakeId) {
    const item = manualOrdersById.get(intakeId);
    if (!item) return;
    const form = document.querySelector('[data-personal-form]');
    const delivery = item.manual_delivery || item.personal_delivery || {};
    form.elements.intake_id.value = item.id;
    form.elements.status.value = ['paid_ready', 'in_progress', 'delivered', 'closed'].includes(item.status) ? item.status : 'paid_ready';
    form.elements.delivery_url.value = delivery.delivery_url || '';
    form.elements.delivery_note.value = delivery.delivery_note || '';
    form.elements.internal_note.value = delivery.internal_note || '';
    form.elements.notify_customer.checked = false;
    form.elements.notify_customer.disabled = !newsletterProviderConfigured;
    document.querySelector('[data-personal-customer]').textContent = item.name || item.email || 'Manual order';
    document.querySelector('[data-personal-reference]').textContent = [item.email, item.trade_no].filter(Boolean).join(' | ');
    document.querySelector('[data-personal-product]').textContent = item.product || '-';
    document.querySelector('[data-personal-question]').textContent = item.question || '-';
    document.querySelector('[data-personal-events]').textContent = [item.event_one, item.event_two].filter(Boolean).join(' | ') || '-';
    const solar = item.true_solar_time || {};
    const solarText = solar.status === 'applied'
      ? `${solar.original_local_datetime || item.birth_date} -> ${solar.corrected_local_datetime} (${Number(solar.total_correction_minutes || 0).toFixed(1)} min, ${solar.resolved_place || item.birthplace})`
      : (solar.status ? `Local clock retained: ${statusLabel(solar.status)}` : 'Local clock retained; no correction record');
    document.querySelector('[data-personal-solar-time]').textContent = solarText;
    const fengShui = item.feng_shui || {};
    document.querySelector('[data-personal-property]').textContent = [
      fengShui.property_type,
      fengShui.address_region,
      fengShui.total_area ? `${fengShui.total_area} ${fengShui.area_unit || ''}`.trim() : '',
      fengShui.facing_direction,
    ].filter(Boolean).join(' | ') || '-';
    const attachments = document.querySelector('[data-personal-attachments]');
    attachments.replaceChildren();
    const floorPlans = Array.isArray(item.floor_plan_files) ? item.floor_plan_files : [];
    if (!floorPlans.length) {
      attachments.textContent = '-';
    } else {
      floorPlans.forEach((file, index) => {
        if (index) attachments.appendChild(document.createTextNode(' | '));
        const link = document.createElement('a');
        link.href = file.signed_url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = file.name || `Floor plan ${index + 1}`;
        attachments.appendChild(link);
      });
    }
    form.elements.pdf_files.value = '';
    const isBundle = item.product === 'Tengyunzi Reading + Annual Forecast Bundle';
    document.querySelector('[data-personal-file-note]').textContent = isBundle
      ? 'Bundle delivery requires exactly two finished PDF files.'
      : 'This product requires exactly one finished PDF file.';
    form.hidden = false;
    setPersonalMessage(newsletterProviderConfigured ? '' : 'Email notification will become available after Resend is configured.');
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderVisits(rows) {
    const body = document.querySelector('[data-admin-visit-rows]');
    body.replaceChildren();
    document.querySelector('[data-visit-count]').textContent = `${rows.length} rows`;
    if (!rows.length) return emptyRow(body, 7, 'No visits in this period.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      const location = [item.city, item.province, item.country].filter((value) => value && value !== 'unknown').join(', ') || 'Unknown';
      appendCells(row, [formatDate(item.created_at), item.ip_address, location, item.page_path, item.device, item.visit_type, item.referrer]);
      body.appendChild(row);
    });
  }

  function renderRegistrations(rows) {
    const body = document.querySelector('[data-admin-registration-rows]');
    body.replaceChildren();
    document.querySelector('[data-registration-count]').textContent = `${rows.length} rows`;
    if (!rows.length) return emptyRow(body, 4, 'No registrations in this period.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      appendCells(row, [item.email, formatDate(item.created_at), formatDate(item.email_confirmed_at), formatDate(item.last_sign_in_at)]);
      body.appendChild(row);
    });
  }

  function renderPages(pages) {
    const list = document.querySelector('[data-admin-pages]');
    list.replaceChildren();
    if (!pages.length) {
      const item = document.createElement('li');
      item.innerHTML = '<span>No tracked pages in this period.</span><strong>0</strong>';
      list.appendChild(item);
      return;
    }
    pages.forEach((page) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const count = document.createElement('strong');
      label.textContent = page.page_path || '/';
      count.textContent = Number(page.count || 0).toLocaleString('en-US');
      item.append(label, count);
      list.appendChild(item);
    });
  }

  function renderPriceExperiment(experiment) {
    const priceBody = document.querySelector('[data-price-summary-rows]');
    const cellBody = document.querySelector('[data-price-cell-rows]');
    const state = document.querySelector('[data-price-experiment-state]');
    const priceRows = Array.isArray(experiment?.by_price) ? experiment.by_price : [];
    const cellRows = Array.isArray(experiment?.by_variant) ? experiment.by_variant : [];
    priceBody.replaceChildren();
    cellBody.replaceChildren();

    if (!priceRows.length) {
      emptyRow(priceBody, 9, 'No price experiment activity in this period.');
    } else {
      priceRows.forEach((item) => {
        const row = document.createElement('tr');
        appendCells(row, [
          item.product === 'ai_report' ? 'AI report' : 'Personal reading',
          `$${Number(item.price || 0).toFixed(2)}`,
          Number(item.exposures || 0).toLocaleString('en-US'),
          Number(item.checkouts || 0).toLocaleString('en-US'),
          Number(item.orders || 0).toLocaleString('en-US'),
          Number(item.paid || 0).toLocaleString('en-US'),
          `${(Number(item.paid_conversion || 0) * 100).toFixed(2)}%`,
          `$${Number(item.revenue || 0).toFixed(2)}`,
          `$${Number(item.revenue_per_exposure || 0).toFixed(2)}`,
        ]);
        priceBody.appendChild(row);
      });
    }

    if (!cellRows.length) {
      emptyRow(cellBody, 5, 'No six-cell assignments in this period.');
    } else {
      cellRows.forEach((item) => {
        const row = document.createElement('tr');
        appendCells(row, [
          `AI $${Number(item.ai_price || 0).toFixed(2)} + personal $${Number(item.manual_price || 0).toFixed(2)}`,
          Number(item.exposures || 0).toLocaleString('en-US'),
          Number(item.orders || 0).toLocaleString('en-US'),
          Number(item.paid || 0).toLocaleString('en-US'),
          `$${Number(item.revenue || 0).toFixed(2)}`,
        ]);
        cellBody.appendChild(row);
      });
    }

    const minimum = Number(experiment?.minimum_exposure || 0);
    state.textContent = experiment?.recommended_sample_reached
      ? 'Minimum sample reached'
      : `Collecting data: ${minimum} / 100 minimum exposures`;
    state.dataset.state = experiment?.recommended_sample_reached ? 'ready' : 'collecting';
  }

  function renderCampaigns(rows) {
    const body = document.querySelector('[data-admin-campaign-rows]');
    body.replaceChildren();
    if (!rows.length) return emptyRow(body, 5, 'No newsletter campaigns yet.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      appendCells(row, [item.subject, statusLabel(item.status), `${Number(item.recipients_sent || 0)} / ${Number(item.recipients_total || 0)}`, Number(item.recipients_failed || 0), formatDate(item.created_at)]);
      body.appendChild(row);
    });
  }

  function renderNewsletterProvider(configured) {
    newsletterProviderConfigured = configured;
    const node = document.querySelector('[data-newsletter-provider]');
    node.dataset.state = configured ? 'ready' : 'setup';
    node.textContent = configured
      ? 'Delivery ready: Resend connected.'
      : 'Delivery setup required: add the Resend API key and verified sender address.';
    document.querySelector('[data-campaign-test]').disabled = !configured;
    document.querySelector('[data-campaign-send]').disabled = !configured;
    const personalNotify = document.querySelector('[data-personal-form] [name="notify_customer"]');
    if (personalNotify) personalNotify.disabled = !configured;
  }

  function renderAudit(rows) {
    const body = document.querySelector('[data-admin-audit-rows]');
    body.replaceChildren();
    document.querySelector('[data-audit-count]').textContent = `${rows.length} rows`;
    if (!rows.length) return emptyRow(body, 5, 'No administrator actions recorded.');
    rows.forEach((item) => {
      const row = document.createElement('tr');
      const target = [item.target_type, item.target_id].filter(Boolean).join(': ');
      appendCells(row, [item.username, statusLabel(item.action), target, item.ip_address, formatDate(item.created_at)]);
      body.appendChild(row);
    });
  }

  function showDashboard(admin) {
    layout.classList.remove('is-login');
    tokenPanel.hidden = true;
    dashboard.hidden = false;
    navigation.hidden = false;
    periodControl.hidden = false;
    refreshControl.hidden = false;
    document.querySelector('[data-admin-signout]').hidden = false;
    document.querySelector('[data-admin-account]').textContent = admin.display_name || admin.username || 'Administrator';
  }

  function showLogin(message) {
    layout.classList.add('is-login');
    tokenPanel.hidden = false;
    dashboard.hidden = true;
    navigation.hidden = true;
    periodControl.hidden = true;
    refreshControl.hidden = true;
    document.querySelector('[data-admin-signout]').hidden = true;
    document.querySelector('[data-admin-account]').textContent = '';
    document.querySelector('[data-admin-updated]').textContent = 'Not signed in';
    if (message) setMessage(message, 'error');
  }

  async function loadDashboard() {
    const refresh = document.querySelector('[data-admin-refresh]');
    refresh.disabled = true;
    refresh.textContent = 'Loading...';
    setMessage('Loading current operations data...');
    try {
      const days = Number(document.querySelector('[data-admin-days]').value || 30);
      const [overview, campaignData, auditData, profileData] = await Promise.all([
        callApi(ORDERS_API, 'tengyunzi_overview', { days }),
        callApi(NEWSLETTER_API, 'campaigns', { limit: 30 }),
        callApi(ORDERS_API, 'admin_audit_list', { limit: 100 }),
        callApi(ORDERS_API, 'admin_profile'),
      ]);
      const admin = profileData.admin || readAdmin();
      setSession(getToken(), admin);
      showDashboard(admin);
      renderMetrics(overview.summary || {});
      renderPriceExperiment(overview.price_experiment || {});
      renderReports(Array.isArray(overview.recent_reports) ? overview.recent_reports : []);
      renderManualOrders(Array.isArray(overview.recent_manual_orders) ? overview.recent_manual_orders : []);
      renderVisits(Array.isArray(overview.recent_visits) ? overview.recent_visits : []);
      renderRegistrations(Array.isArray(overview.recent_registrations) ? overview.recent_registrations : []);
      renderPages(Array.isArray(overview.top_pages) ? overview.top_pages : []);
      renderCampaigns(Array.isArray(campaignData.rows) ? campaignData.rows : []);
      renderNewsletterProvider(Boolean(campaignData.provider_configured));
      renderAudit(Array.isArray(auditData.rows) ? auditData.rows : []);
      document.querySelector('[data-admin-updated]').textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      setMessage('');
    } catch (error) {
      if (['unauthorized', 'forbidden'].includes(error.message)) {
        clearSession();
        showLogin(friendlyError(error));
      } else {
        setMessage(friendlyError(error), 'error');
      }
    } finally {
      refresh.disabled = false;
      refresh.textContent = 'Refresh';
    }
  }

  function campaignPayload() {
    const form = document.querySelector('[data-campaign-form]');
    const data = new FormData(form);
    return {
      subject: String(data.get('subject') || '').trim(),
      preheader: String(data.get('preheader') || '').trim(),
      body_text: String(data.get('body_text') || '').trim(),
      test_email: String(data.get('test_email') || '').trim(),
    };
  }

  async function saveCampaign() {
    const button = document.querySelector('[data-campaign-save]');
    button.disabled = true;
    setCampaignMessage('Saving draft...');
    try {
      const data = await callApi(NEWSLETTER_API, 'create_campaign', campaignPayload());
      currentCampaignId = data.campaign.id;
      document.querySelector('[data-campaign-state]').textContent = 'Draft saved';
      setCampaignMessage('Draft saved. You can send a test or send it to active subscribers.', 'success');
      const campaigns = await callApi(NEWSLETTER_API, 'campaigns', { limit: 30 });
      renderCampaigns(campaigns.rows || []);
      return currentCampaignId;
    } catch (error) {
      setCampaignMessage(friendlyError(error), 'error');
      throw error;
    } finally {
      button.disabled = false;
    }
  }

  async function sendTest() {
    const button = document.querySelector('[data-campaign-test]');
    button.disabled = true;
    setCampaignMessage('Sending test email...');
    try {
      await callApi(NEWSLETTER_API, 'send_test', campaignPayload());
      setCampaignMessage('Test email sent.', 'success');
    } catch (error) {
      setCampaignMessage(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function sendCampaign() {
    if (!window.confirm('Send this letter to every active subscriber? This action sends real email.')) return;
    const button = document.querySelector('[data-campaign-send]');
    button.disabled = true;
    setCampaignMessage('Preparing subscriber delivery...');
    try {
      const campaignId = currentCampaignId || await saveCampaign();
      let result = { done: false, sent: 0, remaining: 1 };
      for (let batch = 0; batch < 60 && !result.done; batch += 1) {
        result = await callApi(NEWSLETTER_API, 'send_campaign', { campaign_id: campaignId, batch_size: 100 });
        setCampaignMessage(`Sent ${Number(result.sent || 0)}. ${Number(result.remaining || 0)} remaining...`, 'success');
      }
      if (!result.done) throw new Error('campaign_batch_limit_reached');
      document.querySelector('[data-campaign-state]').textContent = 'Sent';
      setCampaignMessage(`Newsletter sent to ${Number(result.sent || 0)} subscribers.`, 'success');
      const campaigns = await callApi(NEWSLETTER_API, 'campaigns', { limit: 30 });
      renderCampaigns(campaigns.rows || []);
    } catch (error) {
      setCampaignMessage(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
    }
  }

  async function savePersonalReading(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[data-personal-save]');
    const status = String(form.elements.status.value || 'paid_ready');
    const notifyCustomer = form.elements.notify_customer.checked && !form.elements.notify_customer.disabled;
    if (status === 'delivered' && !String(form.elements.delivery_url.value || '').trim()) {
      setPersonalMessage('Add the secure report URL before marking this order delivered.', 'error');
      return;
    }
    if (notifyCustomer && status !== 'delivered') {
      setPersonalMessage('Choose Delivered before emailing the customer.', 'error');
      return;
    }
    button.disabled = true;
    button.textContent = notifyCustomer ? 'Updating and emailing...' : 'Updating...';
    setPersonalMessage('Saving order status...');
    try {
      const result = await callApi(ORDERS_API, 'personal_reading_update', {
        intake_id: String(form.elements.intake_id.value || ''),
        status,
        delivery_url: String(form.elements.delivery_url.value || '').trim(),
        delivery_note: String(form.elements.delivery_note.value || '').trim(),
        internal_note: String(form.elements.internal_note.value || '').trim(),
        notify_customer: notifyCustomer,
      });
      if (result.notification_error) {
        setPersonalMessage('Status saved, but the customer email failed. The delivery can be retried after email settings are checked.', 'error');
      } else {
        setPersonalMessage(result.customer_notified ? 'Status saved and the customer was emailed.' : 'Order status saved.', 'success');
      }
      await loadDashboard();
      closePersonalEditor();
    } catch (error) {
      setPersonalMessage(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Update order';
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        resolve(String(reader.result || '').replace(/^data:application\/pdf;base64,/i, ''));
      });
      reader.addEventListener('error', () => reject(new Error('valid_pdf_attachment_required')));
      reader.readAsDataURL(file);
    });
  }

  async function sendManualPdf() {
    const form = document.querySelector('[data-personal-form]');
    const intakeId = String(form.elements.intake_id.value || '');
    const item = manualOrdersById.get(intakeId);
    if (!item) {
      setPersonalMessage('Select an order before sending files.', 'error');
      return;
    }

    const files = Array.from(form.elements.pdf_files.files || []);
    const expectedCount = item.product === 'Tengyunzi Reading + Annual Forecast Bundle' ? 2 : 1;
    if (files.length !== expectedCount) {
      setPersonalMessage(expectedCount === 2
        ? 'Choose exactly two PDF files for this Bundle.'
        : 'Choose exactly one PDF file for this order.', 'error');
      return;
    }
    const maxFileBytes = 6 * 1024 * 1024;
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (files.some((file) => file.size > maxFileBytes)) {
      setPersonalMessage('Each PDF must be 6 MB or smaller.', 'error');
      return;
    }
    if (totalBytes > 10 * 1024 * 1024) {
      setPersonalMessage('The selected PDFs must total 10 MB or less.', 'error');
      return;
    }
    if (files.some((file) => !/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf'))) {
      setPersonalMessage('Only PDF files can be delivered.', 'error');
      return;
    }

    const button = form.querySelector('[data-personal-send-pdf]');
    button.disabled = true;
    button.textContent = files.length === 2 ? 'Sending two PDFs...' : 'Sending PDF...';
    setPersonalMessage('Uploading the finished report and preparing the customer email...');
    try {
      const attachments = await Promise.all(files.map(async (file) => ({
        filename: file.name,
        pdf_base64: await fileToBase64(file),
      })));
      if (attachments.some((attachment) => !/^JVBER/i.test(attachment.pdf_base64))) {
        throw new Error('valid_pdf_attachment_required');
      }
      await callApi(REPORT_DELIVERY_API, 'send_pdf', {
        intake_id: intakeId,
        attachments,
      });
      setPersonalMessage('PDF delivery sent and the order was marked Delivered.', 'success');
      await loadDashboard();
      closePersonalEditor();
    } catch (error) {
      setPersonalMessage(friendlyError(error), 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Send PDF to customer';
    }
  }

  document.querySelector('[data-admin-login-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const data = new FormData(form);
    button.disabled = true;
    button.textContent = 'Signing in...';
    setMessage('');
    try {
      const result = await callApi(ORDERS_API, 'admin_login', {
        username: String(data.get('username') || '').trim(),
        password: String(data.get('password') || ''),
      }, false);
      setSession(result.token, result.admin);
      form.reset();
      await loadDashboard();
    } catch (error) {
      showLogin(friendlyError(error));
    } finally {
      button.disabled = false;
      button.textContent = 'Sign in';
    }
  });

  document.querySelector('[data-admin-password-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get('new_password') || '');
    if (newPassword.length < 10) {
      setMessage('Use a new password with at least 10 characters.', 'error');
      return;
    }
    try {
      await callApi(ORDERS_API, 'admin_change_password', {
        current_password: String(data.get('current_password') || ''),
        new_password: newPassword,
      });
      clearSession();
      form.reset();
      showLogin('Password changed. Sign in again with the new password.');
    } catch (error) {
      setMessage(friendlyError(error), 'error');
    }
  });

  document.querySelector('[data-admin-refresh]').addEventListener('click', () => {
    if (getToken()) loadDashboard();
  });
  document.querySelector('[data-admin-days]').addEventListener('change', () => {
    if (getToken()) loadDashboard();
  });
  document.querySelector('[data-admin-signout]').addEventListener('click', () => {
    clearSession();
    showLogin();
  });
  document.querySelector('[data-campaign-save]').addEventListener('click', () => saveCampaign().catch(() => {}));
  document.querySelector('[data-campaign-test]').addEventListener('click', sendTest);
  document.querySelector('[data-campaign-send]').addEventListener('click', sendCampaign);
  document.querySelector('[data-personal-form]').addEventListener('submit', savePersonalReading);
  document.querySelector('[data-personal-send-pdf]').addEventListener('click', sendManualPdf);
  document.querySelector('[data-personal-close]').addEventListener('click', closePersonalEditor);
  navigation.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    navigation.querySelectorAll('a').forEach((item) => item.classList.toggle('is-active', item === link));
  });

  if (getToken()) loadDashboard();
  else showLogin();
})();
