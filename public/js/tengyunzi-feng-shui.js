(() => {
  'use strict';

  if (!window.TengyunziAuth) return;

  const API = `${window.TengyunziAuth.SUPABASE_URL}/functions/v1/fengshui-audit`;
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

  function setStatus(message, state = '') {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state;
  }

  function setBusy(busy) {
    if (!submitButton) return;
    if (!submitButton.dataset.defaultText) submitButton.dataset.defaultText = submitButton.textContent;
    submitButton.disabled = busy;
    submitButton.textContent = busy ? 'Reading the floor plan…' : submitButton.dataset.defaultText;
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
    const nodes = (audit.residenceHexagrams || []).map((item) => resultCard(
      `${titleCase(item.personRole)} · ${titleCase(item.palaceDirection)}`,
      item.verdict?.label || 'Manual traditional review',
      item.verdict?.conclusions?.length
        ? item.verdict.conclusions
        : ['This person-over-palace combination is recorded, but no automatic verdict has been approved for publication.'],
      item.verdict?.adjustmentType === 'manual_service' ? 'Seek a manual adjustment for long-term room assignment.' : '',
    ));
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

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');
    if (!form.reportValidity()) return;
    if (!compressedImage) {
      setStatus('Upload a residential floor plan.', 'error');
      return;
    }

    const data = new FormData(form);
    const context = {
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

    setBusy(true);
    setStatus('Extracting visible layout facts, then applying the fixed rule engine…');
    try {
      const response = await fetch(API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: window.TengyunziAuth.SUPABASE_ANON,
          Authorization: `Bearer ${window.TengyunziAuth.SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          image_base64: compressedImage,
          context,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.message || 'The residential audit could not be completed.');
      }
      renderAudit(result);
      setStatus('Audit complete.', 'success');
    } catch (error) {
      setStatus(error.message || 'The residential audit could not be completed.', 'error');
    } finally {
      setBusy(false);
    }
  });
})();
