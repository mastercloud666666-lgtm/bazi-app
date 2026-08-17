(() => {
  'use strict';

  if (!window.TengyunziAuth) return;

  const API = `${window.TengyunziAuth.SUPABASE_URL}/functions/v1/fengshui-audit`;
  const PAYPAL_API = `${window.TengyunziAuth.SUPABASE_URL}/functions/v1/paypal`;
  const TRADE_KEY = 'tengyunzi_fengshui_ai_trade_no';
  const OPTION_ID = 'feng_shui_ai';
  const SERVICE = 'fengshui_ai';
  const PRICE = '$49.90';
  const form = document.getElementById('fengshui-audit-form');
  const fileInput = document.getElementById('floor-plan');
  const dropzone = document.getElementById('floor-plan-dropzone');
  const preview = document.querySelector('[data-floor-plan-preview]');
  const previewImage = preview?.querySelector('img');
  const fileName = document.querySelector('[data-file-name]');
  const removePlan = document.querySelector('[data-remove-plan]');
  const submitButton = document.querySelector('[data-audit-submit]');
  const status = document.querySelector('[data-audit-status]');
  const results = document.querySelector('[data-audit-results]');
  let compressedImage = '';
  let activeTradeNo = '';

  function setStatus(message, state = '') {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function setBusy(busy, busyText = 'Working…') {
    if (!submitButton) return;
    if (!submitButton.dataset.defaultText) submitButton.dataset.defaultText = submitButton.textContent;
    submitButton.disabled = busy;
    submitButton.textContent = busy ? busyText : submitButton.dataset.defaultText;
  }

  function headers() {
    return {
      'Content-Type': 'application/json',
      apikey: window.TengyunziAuth.SUPABASE_ANON,
      Authorization: `Bearer ${window.TengyunziAuth.SUPABASE_ANON}`,
    };
  }

  async function post(url, payload) {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      const error = new Error(data.message || data.error || 'request_failed');
      error.code = data.error || 'request_failed';
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

  function numberValue(name) {
    const value = Number(form.elements[name]?.value);
    return Number.isInteger(value) && value >= 0 ? value : 0;
  }

  function imageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The selected image could not be read.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error('The selected image is not valid.'));
        image.onload = () => resolve(image);
        image.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  async function compressFloorPlan(file) {
    if (!file || !/^image\/(?:png|jpe?g|webp)$/i.test(file.type)) {
      throw new Error('Choose a JPG, PNG, or WebP floor plan.');
    }
    if (file.size > 14 * 1024 * 1024) {
      throw new Error('Choose an image smaller than 14 MB.');
    }
    const image = await imageFromFile(file);
    const maximumSide = 1800;
    const scale = Math.min(1, maximumSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.84);
  }

  async function useFile(file) {
    try {
      setStatus('Preparing the floor plan…');
      compressedImage = await compressFloorPlan(file);
      if (previewImage) previewImage.src = compressedImage;
      if (fileName) fileName.textContent = file.name;
      if (preview) preview.hidden = false;
      dropzone.hidden = true;
      setStatus('Floor plan ready.', 'success');
    } catch (error) {
      compressedImage = '';
      fileInput.value = '';
      setStatus(error.message || 'The floor plan could not be prepared.', 'error');
    }
  }

  function clearFile() {
    compressedImage = '';
    fileInput.value = '';
    if (previewImage) previewImage.removeAttribute('src');
    if (preview) preview.hidden = true;
    dropzone.hidden = false;
    setStatus('');
  }

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', () => {
    if (fileInput.files?.[0]) useFile(fileInput.files[0]);
  });
  removePlan?.addEventListener('click', clearFile);
  document.querySelector('[data-print-audit]')?.addEventListener('click', () => window.print());
  for (const eventName of ['dragenter', 'dragover']) {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropzone?.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  }
  dropzone?.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) useFile(file);
  });

  function titleCase(value) {
    return String(value || '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function replaceChildren(node, children) {
    if (!node) return;
    node.replaceChildren(...children);
  }

  function paragraph(text, className = '') {
    const node = document.createElement('p');
    node.textContent = String(text || '');
    if (className) node.className = className;
    return node;
  }

  function resultCard(label, headline, lines = [], adjustment = '') {
    const card = document.createElement('article');
    card.className = 'feng-result-card';
    const lead = document.createElement('div');
    const labelNode = document.createElement('span');
    const heading = document.createElement('h4');
    labelNode.textContent = label;
    heading.textContent = headline;
    lead.append(labelNode, heading);
    const copy = document.createElement('div');
    for (const line of lines.filter(Boolean)) copy.appendChild(paragraph(line));
    if (adjustment) copy.appendChild(paragraph(adjustment, 'feng-adjustment'));
    card.append(lead, copy);
    return card;
  }

  function renderWholeHouse(audit) {
    const target = document.querySelector('[data-whole-house]');
    const whole = audit.wholeHouse || {};
    const items = [
      ['Sitting', whole.resolved ? titleCase(whole.sitting) : 'Unresolved'],
      ['Facing', whole.resolved ? titleCase(whole.facing) : 'Unresolved'],
      ['Five-Element role', whole.relation?.label || 'Verification required'],
      ['Scope', 'Interior residential'],
    ];
    replaceChildren(target, items.map(([label, value]) => {
      const card = document.createElement('article');
      card.className = 'feng-summary-card';
      const small = document.createElement('span');
      const strong = document.createElement('strong');
      small.textContent = label;
      strong.textContent = value;
      card.append(small, strong);
      return card;
    }));
  }

  function renderPriorities(audit) {
    const target = document.querySelector('[data-priorities]');
    const priorityNodes = (audit.priorities || []).map((item, index) => resultCard(
      `Priority ${String(index + 1).padStart(2, '0')} · ${titleCase(item.type)}`,
      item.headline || titleCase(item.code),
      [],
      item.adjustment?.conclusion || '',
    ));
    if (!priorityNodes.length) {
      priorityNodes.push(resultCard('Status', 'No automatic priority was triggered', [
        'Review the room findings and any facts marked for manual verification.',
      ]));
    }
    replaceChildren(target, priorityNodes);
  }

  function renderStructural(audit) {
    const target = document.querySelector('[data-structural-findings]');
    const nodes = [];
    for (const item of audit.structuralIssues || []) {
      nodes.push(resultCard(
        `${titleCase(item.sector)} · ${titleCase(item.status || 'structural')}`,
        item.headline || titleCase(item.code),
        item.conclusions || [],
        item.adjustment?.conclusion || '',
      ));
    }
    for (const item of audit.favorableStructuralFindings || []) {
      nodes.push(resultCard(
        `${titleCase(item.sector)} · Retain`,
        titleCase(item.facility),
        [item.conclusion],
      ));
    }
    for (const item of audit.functionalSpaceFindings || []) {
      if (item.reportable === false) continue;
      nodes.push(resultCard(
        `${titleCase(item.sector)} · ${titleCase(item.status || 'space function')}`,
        `${item.label} · ${titleCase(item.palaceRole || 'palace role')}`,
        item.conclusions || [],
      ));
    }
    if (!nodes.length) nodes.push(resultCard('Status', 'No structural conclusion was resolved', [
      'The uploaded plan did not contain enough verified palace or facility facts.',
    ]));
    replaceChildren(target, nodes);
  }

  function renderRooms(audit) {
    const target = document.querySelector('[data-room-patterns]');
    const nodes = (audit.roomMicroPatterns || []).map((room) => {
      const card = document.createElement('article');
      card.className = 'feng-room-card';
      const header = document.createElement('header');
      const left = document.createElement('div');
      const label = document.createElement('span');
      const heading = document.createElement('h4');
      label.textContent = room.resolved ? titleCase(room.orientation?.basis) : 'Verification required';
      heading.textContent = room.name || 'Room';
      left.append(label, heading);
      header.append(left);
      card.append(header);
      const facts = document.createElement('div');
      facts.className = 'feng-room-facts';
      const factItems = [
        ['Sitting', room.resolved ? `${titleCase(room.sitting?.direction)} · ${titleCase(room.sitting?.element)}` : 'Unresolved'],
        ['Facing', room.resolved ? `${titleCase(room.facing?.direction)} · ${titleCase(room.facing?.element)}` : 'Unresolved'],
        ['Pattern', room.relation?.label || 'Unresolved'],
        ['Adjustment', titleCase(room.adjustment?.type || 'manual verification')],
      ];
      for (const [factLabel, value] of factItems) {
        const fact = document.createElement('div');
        const small = document.createElement('span');
        const strong = document.createElement('strong');
        small.textContent = factLabel;
        strong.textContent = value;
        fact.append(small, strong);
        facts.appendChild(fact);
      }
      card.appendChild(facts);
      for (const issue of room.bedPlacement?.physicalIssues || []) {
        card.appendChild(paragraph(issue.conclusion || '', 'feng-adjustment'));
      }
      card.appendChild(paragraph(room.adjustment?.conclusion || room.conclusion || ''));
      return card;
    });
    if (!nodes.length) {
      const card = document.createElement('article');
      card.className = 'feng-room-card';
      const heading = document.createElement('h4');
      heading.textContent = 'No room orientation was resolved';
      card.append(heading, paragraph('Confirm bedheads, largest windows, and door directions.'));
      nodes.push(card);
    }
    replaceChildren(target, nodes);
  }

  function renderResidence(audit) {
    const target = document.querySelector('[data-residence-hexagrams]');
    const framework = audit.destinyTimingGeography || {};
    const mechanism = Array.isArray(framework.mechanism) ? framework.mechanism : [];
    const nodes = [];
    if (mechanism.length) {
      const judgmentSequence = Array.isArray(framework.judgmentSequence)
        ? framework.judgmentSequence
        : [];
      nodes.push(resultCard(
        'Method · Destiny, Timing, and Geography',
        'Residence can strengthen or weaken an existing tendency',
        [
          mechanism.join(' → '),
          judgmentSequence.length ? `Judgment order: ${judgmentSequence.join(' → ')}` : '',
          framework.boundary || '',
        ],
      ));
    }
    const hasResolvedBed = (audit.roomMicroPatterns || [])
      .some((room) => room.bedPlacement?.applicable === true);
    const bedMethod = audit.personalBedPlacementMethod || {};
    if (hasResolvedBed && Array.isArray(bedMethod.sequence)) {
      nodes.push(resultCard(
        'Bed-placement method',
        'Choose the room before choosing the bed-foot direction',
        [
          ...bedMethod.sequence,
          Array.isArray(bedMethod.physicalChecks)
            ? `Physical checks: ${bedMethod.physicalChecks.join('; ')}.`
            : '',
        ],
        bedMethod.requirement || '',
      ));
    }
    for (const item of audit.residenceHexagrams || []) {
      const rolePosition = item.rolePosition || {};
      const specificConclusions = item.verdict?.conclusions || [];
      const conclusions = [
        ...(rolePosition.conclusions || []),
        ...specificConclusions,
      ];
      const labels = [rolePosition.label, item.verdict?.label].filter(Boolean);
      const adjustment = rolePosition.adjustment?.type === 'manual_service'
        ? rolePosition.adjustment.conclusion
        : item.verdict?.adjustmentType === 'manual_service'
          ? 'Seek a manual adjustment for long-term room assignment.'
          : rolePosition.adjustment?.conclusion || '';
      nodes.push(resultCard(
        `${rolePosition.personLabel || titleCase(item.personRole)} · ${titleCase(item.palaceDirection)} · ${item.roomName || 'Room'}`,
        labels.join(' · ') || 'Person-to-palace position',
        conclusions.length ? conclusions : ['The person-to-palace position has been recorded.'],
        adjustment,
      ));
    }
    if (!nodes.length) nodes.push(resultCard('Status', 'No occupant-to-room assignment was resolved', [
      'Add room-assignment notes and ensure bedroom labels are readable.',
    ]));
    replaceChildren(target, nodes);
  }

  function renderVerification(data) {
    const section = document.querySelector('[data-verification-section]');
    const copy = document.querySelector('[data-verification-copy]');
    const badge = document.querySelector('[data-review-badge]');
    const unresolved = data.layout_facts?.unresolved || [];
    const needsReview = data.requires_manual_verification === true;
    badge.textContent = needsReview ? 'Manual verification needed' : 'Rule check complete';
    badge.classList.toggle('is-review', needsReview);
    section.hidden = !needsReview;
    if (needsReview) {
      copy.textContent = unresolved.length
        ? unresolved.join(' ')
        : 'At least one direction, room boundary, opening, bedhead, facility, or missing-corner fact was not resolved with enough confidence.';
    }
  }

  function renderAudit(data) {
    const audit = data.audit || {};
    renderWholeHouse(audit);
    renderPriorities(audit);
    renderStructural(audit);
    renderRooms(audit);
    renderResidence(audit);
    renderVerification(data);
    document.querySelector('[data-external-note]').textContent = audit.externalScopeNote || '';
    document.querySelector('[data-safety-note]').textContent = audit.safetyNote || '';
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function auditContext() {
    const data = new FormData(form);
    return {
      northEdge: String(data.get('north_edge') || ''),
      wholeHouseFacing: String(data.get('whole_facing') || ''),
      floor: numberValue('floor') || 1,
      household: {
        marriedMen: numberValue('married_men'),
        marriedWomen: numberValue('married_women'),
        sons: numberValue('sons'),
        daughters: numberValue('daughters'),
      },
      assignmentNotes: String(data.get('assignment_notes') || '').trim(),
    };
  }

  function rememberTrade(orderReference) {
    activeTradeNo = orderReference || '';
    if (activeTradeNo) localStorage.setItem(TRADE_KEY, activeTradeNo);
  }

  function markResumeCheckout(orderReference, message) {
    rememberTrade(orderReference);
    setBusy(false);
    submitButton.dataset.mode = 'resume';
    submitButton.dataset.defaultText = `Resume PayPal · ${PRICE}`;
    submitButton.textContent = submitButton.dataset.defaultText;
    setStatus(message || 'Your floor plan is saved. Resume PayPal when you are ready.', 'error');
  }

  async function openPayPal(orderReference) {
    setBusy(true, 'Opening secure PayPal…');
    setStatus(`Opening the secure one-time ${PRICE} checkout…`);
    try {
      const checkout = await post(PAYPAL_API, {
        action: 'create',
        trade_no: orderReference,
        option_id: OPTION_ID,
        service: SERVICE,
        origin: checkoutOrigin(),
      });
      if (!checkout.approve_url) throw new Error('PayPal did not return a checkout link.');
      location.assign(checkout.approve_url);
    } catch (error) {
      markResumeCheckout(
        orderReference,
        error.message || 'PayPal checkout could not be opened. You have not been charged.',
      );
    }
  }

  async function generatePaidAudit(orderReference) {
    setBusy(true, 'Generating your paid audit…');
    setStatus('Payment confirmed. GPT-5.1 is reading the plan, then the fixed rule engine will produce your English report.');
    try {
      const report = await post(API, {
        action: 'analyze',
        trade_no: orderReference,
      });
      renderAudit(report);
      submitButton.dataset.defaultText = 'Audit purchased';
      submitButton.textContent = 'Audit purchased';
      submitButton.disabled = true;
      submitButton.dataset.mode = 'complete';
      setStatus('Paid audit complete. Print or save the report as a PDF.', 'success');
      return true;
    } catch (error) {
      setBusy(false);
      submitButton.dataset.defaultText = 'Retry paid audit';
      submitButton.textContent = submitButton.dataset.defaultText;
      submitButton.dataset.mode = 'generate';
      setStatus(
        error.code === 'audit_in_progress'
          ? 'Your paid audit is still being generated. Select “Retry paid audit” shortly.'
          : (error.message || 'Your payment is preserved. Retry the audit without paying again.'),
        'error',
      );
      return false;
    }
  }

  async function restoreOrder(orderReference, generateWhenPaid = true) {
    if (!orderReference) return false;
    try {
      const state = await post(API, {
        action: 'status',
        trade_no: orderReference,
      });
      rememberTrade(orderReference);
      if (!state.paid) return false;
      history.replaceState(null, '', `${location.pathname}?trade_no=${encodeURIComponent(orderReference)}#audit`);
      if (state.report_ready && state.report) {
        renderAudit(state.report);
        submitButton.dataset.defaultText = 'Audit purchased';
        submitButton.textContent = 'Audit purchased';
        submitButton.disabled = true;
        submitButton.dataset.mode = 'complete';
        setStatus('Paid audit restored. Print or save the report as a PDF.', 'success');
        return true;
      }
      if (generateWhenPaid) return generatePaidAudit(orderReference);
      return true;
    } catch {
      return false;
    }
  }

  async function handlePaymentReturn() {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get('pp');
    const orderReference = params.get('trade_no') || localStorage.getItem(TRADE_KEY) || '';
    if (!orderReference) return;
    rememberTrade(orderReference);

    if (paymentState === 'cancel') {
      history.replaceState(null, '', `${location.pathname}?trade_no=${encodeURIComponent(orderReference)}#audit`);
      markResumeCheckout(orderReference, 'PayPal checkout was cancelled. You have not been charged.');
      return;
    }

    if (paymentState === '1') {
      const paypalOrderId = params.get('token');
      if (!paypalOrderId) {
        setStatus('The PayPal return could not be matched to this audit.', 'error');
        return;
      }
      setBusy(true, 'Confirming payment…');
      setStatus('Confirming your PayPal payment…');
      if (await restoreOrder(orderReference)) return;
      try {
        await post(PAYPAL_API, {
          action: 'capture',
          paypal_order_id: paypalOrderId,
          trade_no: orderReference,
          origin: checkoutOrigin(),
        });
        history.replaceState(null, '', `${location.pathname}?trade_no=${encodeURIComponent(orderReference)}#audit`);
        await generatePaidAudit(orderReference);
      } catch (error) {
        setBusy(false);
        submitButton.dataset.defaultText = 'Confirm payment again';
        submitButton.textContent = submitButton.dataset.defaultText;
        submitButton.dataset.mode = 'restore';
        setStatus(
          'Payment could not be confirmed. If PayPal charged you, retry confirmation or contact support with your order reference.',
          'error',
        );
      }
      return;
    }

    setBusy(true, 'Checking saved audit…');
    setStatus('Checking your saved Feng Shui audit…');
    const restored = await restoreOrder(orderReference);
    if (!restored) {
      markResumeCheckout(orderReference, 'Your saved audit is awaiting payment.');
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    const mode = submitButton.dataset.mode || 'checkout';
    if (mode === 'complete') return;
    if (mode === 'resume' && activeTradeNo) {
      await openPayPal(activeTradeNo);
      return;
    }
    if ((mode === 'generate' || mode === 'restore') && activeTradeNo) {
      if (!(await restoreOrder(activeTradeNo))) {
        setStatus('Payment has not been confirmed for this audit.', 'error');
        setBusy(false);
      }
      return;
    }
    if (!form.reportValidity()) return;
    if (!compressedImage) {
      setStatus('Upload a residential floor plan.', 'error');
      return;
    }

    setBusy(true, 'Saving audit securely…');
    setStatus('Saving the compressed floor plan before secure checkout…');
    try {
      const order = await post(API, {
        action: 'create',
        image_base64: compressedImage,
        context: auditContext(),
      });
      rememberTrade(order.trade_no);
      await openPayPal(order.trade_no);
    } catch (error) {
      setBusy(false);
      setStatus(error.message || 'The secure audit checkout could not be prepared.', 'error');
    }
  });

  submitButton.dataset.mode = 'checkout';
  submitButton.dataset.defaultText = submitButton.textContent;
  handlePaymentReturn();
})();
