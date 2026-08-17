import {
  GATES,
  SPIRITS,
  STARS,
  buildStarGateCombinationLibrary,
  calculateQimenChart,
} from './qimen-rules.mjs';
import { buildCalendarFacts } from './qimen-lunar-adapter.mjs';

const form = document.querySelector('[data-qimen-form]');
if (form) {
  const dateInput = form.querySelector('#qimen-date');
  const timeInput = form.querySelector('#qimen-time');
  const status = form.querySelector('[data-qimen-status]');
  const submitButton = form.querySelector('[data-qimen-submit]');
  const nowButton = form.querySelector('[data-qimen-now]');
  const calendar = form.querySelector('[data-qimen-calendar]');
  const calendarTrigger = form.querySelector('[data-qimen-date-trigger]');
  const calendarMonthLabel = form.querySelector('[data-qimen-calendar-month]');
  const calendarDays = form.querySelector('[data-qimen-calendar-days]');
  const calendarPrevious = form.querySelector('[data-qimen-calendar-prev]');
  const calendarNext = form.querySelector('[data-qimen-calendar-next]');
  const calendarToday = form.querySelector('[data-qimen-calendar-today]');
  const calendarClear = form.querySelector('[data-qimen-calendar-clear]');
  const results = document.querySelector('[data-qimen-results]');
  const emptyState = document.querySelector('[data-qimen-empty]');
  const summary = document.querySelector('[data-qimen-summary]');
  const grid = document.querySelector('[data-qimen-grid]');
  const detail = document.querySelector('[data-qimen-detail]');
  const symbolLibrary = document.querySelector('[data-qimen-symbol-library]');
  const combinationStar = document.querySelector('#qimen-combination-star');
  const combinationGate = document.querySelector('#qimen-combination-gate');
  const combinationResult = document.querySelector('[data-qimen-combination]');
  const combinationLibrary = buildStarGateCombinationLibrary();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  let activeChart = null;
  let calendarYear = new Date().getFullYear();
  let calendarMonth = new Date().getMonth();

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function formatDate(year, month, day) {
    return `${year}-${pad2(month + 1)}-${pad2(day)}`;
  }

  function parseDateValue(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (year < 1900 || year > 2100 || month < 0 || month > 11) return null;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    if (day < 1 || day > daysInMonth) return null;
    return { year, month, day };
  }

  function parseTimeValue(value) {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    return { hour: Number(match[1]), minute: Number(match[2]) };
  }

  function closeCalendar({ returnFocus = false } = {}) {
    calendar.hidden = true;
    calendarTrigger.setAttribute('aria-expanded', 'false');
    if (returnFocus) calendarTrigger.focus();
  }

  function chooseDate(year, month, day) {
    dateInput.value = formatDate(year, month, day);
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar();
    dateInput.focus();
  }

  function renderCalendar() {
    const selected = parseDateValue(dateInput.value);
    const today = new Date();
    const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay();
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const fragment = document.createDocumentFragment();

    calendarMonthLabel.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
    calendarPrevious.disabled = calendarYear === 1900 && calendarMonth === 0;
    calendarNext.disabled = calendarYear === 2100 && calendarMonth === 11;

    for (let index = 0; index < firstWeekday; index += 1) {
      const spacer = make('span');
      spacer.setAttribute('aria-hidden', 'true');
      fragment.append(spacer);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayButton = make('button', 'qimen-calendar-day', String(day));
      dayButton.type = 'button';
      dayButton.setAttribute('aria-label', `${monthNames[calendarMonth]} ${day}, ${calendarYear}`);
      const isToday = calendarYear === today.getFullYear()
        && calendarMonth === today.getMonth()
        && day === today.getDate();
      const isSelected = selected
        && calendarYear === selected.year
        && calendarMonth === selected.month
        && day === selected.day;
      dayButton.classList.toggle('is-today', isToday);
      dayButton.classList.toggle('is-selected', Boolean(isSelected));
      if (isSelected) dayButton.setAttribute('aria-current', 'date');
      dayButton.addEventListener('click', () => chooseDate(calendarYear, calendarMonth, day));
      fragment.append(dayButton);
    }

    while (fragment.childNodes.length < 42) {
      const spacer = make('span');
      spacer.setAttribute('aria-hidden', 'true');
      fragment.append(spacer);
    }
    calendarDays.replaceChildren(fragment);
  }

  function openCalendar() {
    const selected = parseDateValue(dateInput.value);
    const reference = selected || {
      year: new Date().getFullYear(),
      month: new Date().getMonth(),
    };
    calendarYear = reference.year;
    calendarMonth = reference.month;
    renderCalendar();
    calendar.hidden = false;
    calendarTrigger.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      const firstTarget = calendarDays.querySelector('.is-selected')
        || calendarDays.querySelector('.is-today')
        || calendarDays.querySelector('button');
      firstTarget?.focus();
    });
  }

  function changeCalendarMonth(offset) {
    const next = new Date(calendarYear, calendarMonth + offset, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth();
    if (nextYear < 1900 || nextYear > 2100) return;
    calendarYear = nextYear;
    calendarMonth = nextMonth;
    renderCalendar();
  }

  function setCurrentDateTime() {
    const now = new Date();
    dateInput.value = formatDate(now.getFullYear(), now.getMonth(), now.getDate());
    timeInput.value = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  }

  function summaryItem(label, value, emphasis = false) {
    const item = make('div', emphasis ? 'qimen-summary-item is-emphasis' : 'qimen-summary-item');
    item.append(make('span', '', label), make('strong', '', value));
    return item;
  }

  function renderSummary(chart) {
    summary.replaceChildren(
      summaryItem('Civil time', chart.input.civilDateTime),
      summaryItem('Solar term', `${chart.ju.termName} · ${chart.ju.yuanName}`),
      summaryItem('Chart', `${chart.ju.dunName} · Ju ${chart.ju.juNumber}`, true),
      summaryItem('Four Pillars', `${chart.input.pillars.year} · ${chart.input.pillars.month} · ${chart.input.pillars.day} · ${chart.input.pillars.time}`),
      summaryItem('Xun Head', `${chart.xun.head}, hidden in ${chart.xun.hiddenStem}`),
      summaryItem('Chief and Envoy', `${chart.chief.star.name} · ${chart.envoy.gate.name}`),
    );
  }

  function addLayer(row, label, value, modifier = '') {
    const layer = make('div', `qimen-palace-layer ${modifier}`.trim());
    layer.append(make('span', '', label), make('strong', '', value || 'None'));
    row.append(layer);
  }

  function renderGrid(chart) {
    const fragment = document.createDocumentFragment();
    chart.palaces.forEach((palace) => {
      const button = make('button', 'qimen-palace');
      button.type = 'button';
      button.dataset.palaceIndex = String(palace.index);
      button.setAttribute('aria-label', `${palace.direction}, ${palace.trigram} Palace`);
      const header = make('header', 'qimen-palace-head');
      header.append(
        make('span', '', `${palace.direction} · Palace ${palace.number}`),
        make('b', '', palace.trigram),
      );
      button.append(header);
      addLayer(button, 'Spirit', palace.spirit?.name, 'is-spirit');
      addLayer(button, 'Star', palace.star?.name, 'is-star');
      addLayer(button, 'Gate', palace.gate?.name, 'is-gate');
      addLayer(button, 'Heaven / Earth', `${palace.heavenStem} / ${palace.earthStem}`, 'is-stem');
      const flags = [...palace.warnings, ...palace.markers];
      if (flags.length) {
        const flagRow = make('div', 'qimen-palace-flags');
        flags.forEach((flag) => flagRow.append(make('span', flag.severity === 'critical' ? 'is-critical' : '', flag.label)));
        button.append(flagRow);
      }
      button.addEventListener('click', () => selectPalace(chart, palace.index));
      fragment.append(button);
    });
    grid.replaceChildren(fragment);
  }

  function factBlock(label, title, copy) {
    const block = make('article', 'qimen-detail-block');
    block.append(make('span', '', label), make('h4', '', title), make('p', '', copy));
    return block;
  }

  function selectPalace(chart, palaceIndex) {
    const palace = chart.palaces[palaceIndex];
    grid.querySelectorAll('.qimen-palace').forEach((node) => {
      const selected = Number(node.dataset.palaceIndex) === palaceIndex;
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const heading = make('header', 'qimen-detail-head');
    heading.append(
      make('span', '', `Palace ${palace.number} · ${palace.direction}`),
      make('h3', '', `${palace.trigram} Palace`),
      make('p', '', `Heaven stem ${palace.heavenStem}. Earth stem ${palace.earthStem}. Palace element ${palace.element}.`),
    );
    const content = make('div', 'qimen-detail-content');
    if (palace.gate && palace.star) {
      content.append(
        factBlock('Action channel', palace.gate.name, `${palace.gate.meaning} ${palace.gate.favorable}`),
        factBlock('Operating condition', `${palace.star.name} · ${palace.star.label}`, `${palace.star.meaning} ${palace.star.direct}`),
      );
    } else {
      content.append(factBlock('Center convention', palace.star.name, 'The center has no Eight Gate or directional Spirit. Tian Qin remains central and is referenced through Kun only when a directional palace is required.'));
    }
    if (palace.spirit) content.append(factBlock('Modifier', palace.spirit.name, palace.spirit.meaning));
    if (palace.combination) {
      content.append(
        factBlock('Star and Gate combination', palace.combination.title, `${palace.combination.summary} ${palace.combination.elementReading}`),
        factBlock('Direct use', 'What this combination supports', palace.combination.favorableUse),
        factBlock('Direct risk', 'What can go wrong', palace.combination.risk),
      );
    }
    [...palace.warnings, ...palace.markers].forEach((flag) => {
      content.append(factBlock(flag.severity === 'critical' ? 'Critical pattern' : 'Pattern marker', flag.label, flag.detail));
    });
    if (!palace.warnings.length && !palace.markers.length) {
      content.append(factBlock('Pattern check', 'No door pressure, instrument punishment, hour void, or Travel Horse', 'This statement applies only to the four pattern checks currently calculated by the framework.'));
    }
    detail.replaceChildren(heading, content);
  }

  function renderSymbolGroup(title, description, entries, fields) {
    const group = make('section', 'qimen-symbol-group');
    const header = make('header');
    header.append(make('span', '', description), make('h3', '', title));
    group.append(header);
    const list = make('div', 'qimen-symbol-list');
    entries.forEach((entry) => {
      const item = make('details', 'qimen-symbol-item');
      const summaryNode = make('summary');
      summaryNode.append(make('strong', '', entry.name), make('span', '', entry.label || entry.nature));
      item.append(summaryNode);
      const body = make('div');
      fields.forEach(([label, key]) => {
        if (entry[key]) body.append(factBlock(label, key === 'element' ? `${entry[key]} element` : label, entry[key]));
      });
      item.append(body);
      list.append(item);
    });
    group.append(list);
    return group;
  }

  function renderSymbolLibrary() {
    symbolLibrary.replaceChildren(
      renderSymbolGroup('Nine Stars', 'Conditions and operating environment', STARS, [['Element', 'element'], ['Meaning', 'meaning'], ['Direct use', 'direct'], ['Risk', 'risk']]),
      renderSymbolGroup('Eight Gates', 'Routes of action and practical outcomes', GATES, [['Element', 'element'], ['Meaning', 'meaning'], ['Direct use', 'favorable'], ['Risk', 'unfavorable']]),
      renderSymbolGroup('Eight Spirits', 'Modifiers acting on each directional palace', SPIRITS, [['Meaning', 'meaning']]),
    );
  }

  function populateCombinationSelectors() {
    STARS.forEach((star) => combinationStar.append(new Option(star.name, star.id)));
    GATES.forEach((gate) => combinationGate.append(new Option(gate.name, gate.id)));
    combinationStar.value = STARS[0].id;
    combinationGate.value = GATES[0].id;
  }

  function renderSelectedCombination() {
    const entry = combinationLibrary.find((item) => item.starId === combinationStar.value && item.gateId === combinationGate.value);
    if (!entry) return;
    combinationResult.replaceChildren(
      make('h3', '', entry.title),
      make('p', '', entry.summary),
      make('p', '', entry.elementReading),
      factBlock('Direct use', 'Supported use', entry.favorableUse),
      factBlock('Direct risk', 'Primary risk', entry.risk),
    );
  }

  function renderChart(chart) {
    activeChart = chart;
    renderSummary(chart);
    renderGrid(chart);
    results.hidden = false;
    emptyState.hidden = true;
    selectPalace(chart, chart.chief.palaceIndex);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    status.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Building chart...';
    try {
      if (!dateInput.value || !timeInput.value) throw new Error('Enter both the local date and local time.');
      const date = parseDateValue(dateInput.value);
      if (!date) throw new Error('Enter a valid date from 1900-01-01 to 2100-12-31 in YYYY-MM-DD format.');
      const time = parseTimeValue(timeInput.value);
      if (!time) throw new Error('Enter a valid 24-hour time in HH:MM format.');
      const facts = buildCalendarFacts(globalThis.Solar, {
        year: date.year,
        month: date.month + 1,
        day: date.day,
        hour: time.hour,
        minute: time.minute,
      });
      const chart = calculateQimenChart(facts);
      renderChart(chart);
      status.textContent = `${chart.ju.dunName}, Ju ${chart.ju.juNumber} chart built from the ${chart.ju.termName} boundary.`;
    } catch (error) {
      results.hidden = !activeChart;
      status.textContent = error instanceof Error ? error.message : 'The chart could not be built.';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Build Hour-School Chart';
    }
  });

  nowButton.addEventListener('click', () => {
    setCurrentDateTime();
    closeCalendar();
    form.requestSubmit();
  });
  calendarTrigger.addEventListener('click', () => {
    if (calendar.hidden) openCalendar();
    else closeCalendar({ returnFocus: true });
  });
  calendarPrevious.addEventListener('click', () => changeCalendarMonth(-1));
  calendarNext.addEventListener('click', () => changeCalendarMonth(1));
  calendarToday.addEventListener('click', () => {
    const today = new Date();
    chooseDate(today.getFullYear(), today.getMonth(), today.getDate());
  });
  calendarClear.addEventListener('click', () => {
    dateInput.value = '';
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar();
    dateInput.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!calendar.hidden && !event.target.closest('.qimen-date-field')) closeCalendar();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !calendar.hidden) closeCalendar({ returnFocus: true });
  });
  combinationStar.addEventListener('change', renderSelectedCombination);
  combinationGate.addEventListener('change', renderSelectedCombination);
  setCurrentDateTime();
  renderSymbolLibrary();
  populateCombinationSelectors();
  renderSelectedCombination();
}
