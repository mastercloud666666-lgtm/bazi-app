(function () {
  'use strict';

  const REPORT_API = `${TengyunziAuth.SUPABASE_URL}/functions/v1/english-report`;
  const DELETE_API = `${TengyunziAuth.SUPABASE_URL}/functions/v1/account-delete`;
  const CONFIRM_PHRASE = 'DELETE';
  const gate = document.querySelector('[data-account-gate]');
  const panel = document.querySelector('[data-account-panel]');
  const list = document.querySelector('[data-reading-list]');
  let reports = [];
  let activeFilter = 'all';

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function birthLabel(report) {
    const birth = report.birth_input || {};
    if (!birth.year || !birth.month || !birth.day) return 'BaZi reading';
    const date = new Date(Date.UTC(Number(birth.year), Number(birth.month) - 1, Number(birth.day)));
    return `Birth chart: ${date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}`;
  }

  function statusText(value) {
    const labels = {
      ready: 'Ready',
      generating: 'Generating',
      failed: 'Needs attention',
      awaiting_payment: 'Awaiting payment',
    };
    return labels[value] || String(value || 'Pending').replace(/_/g, ' ');
  }

  function renderMetrics() {
    document.querySelector('[data-metric="all"]').textContent = String(reports.length);
    document.querySelector('[data-metric="free"]').textContent = String(reports.filter((item) => item.access_type === 'free').length);
    document.querySelector('[data-metric="paid"]').textContent = String(reports.filter((item) => item.access_type === 'paid').length);
  }

  function renderList() {
    const visible = activeFilter === 'all' ? reports : reports.filter((item) => item.access_type === activeFilter);
    list.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'account-empty';
      empty.textContent = activeFilter === 'all' ? 'No readings yet. Start with a free BaZi preview.' : 'No readings in this view.';
      list.appendChild(empty);
      return;
    }

    for (const report of visible) {
      const row = document.createElement('a');
      row.className = 'reading-row';
      row.href = `./tengyunzi-report.html?report=${encodeURIComponent(report.id)}`;

      const main = document.createElement('span');
      main.className = 'reading-row-main';
      const title = document.createElement('strong');
      title.textContent = report.access_type === 'paid' ? 'Complete Standard BaZi Reading' : 'Free BaZi Preview';
      const subtitle = document.createElement('span');
      subtitle.textContent = birthLabel(report);
      main.append(title, subtitle);

      const status = document.createElement('span');
      status.className = 'status-label';
      status.dataset.status = report.status;
      status.textContent = statusText(report.status);

      const time = document.createElement('time');
      time.dateTime = report.created_at || '';
      time.textContent = formatDate(report.created_at);
      row.append(main, status, time);
      list.appendChild(row);
    }
  }

  async function loadReports() {
    gate.hidden = true;
    panel.hidden = false;
    document.querySelector('[data-account-email]').textContent = TengyunziAuth.readSession()?.email || '';
    list.innerHTML = '<div class="account-empty">Loading your readings...</div>';
    try {
      const response = await TengyunziAuth.authorizedFetch(REPORT_API, {
        method: 'POST',
        body: JSON.stringify({ action: 'list', limit: 100 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(data.error || 'load_failed');
      reports = Array.isArray(data.reports) ? data.reports : [];
      renderMetrics();
      renderList();
    } catch (error) {
      list.innerHTML = '<div class="account-empty">Your readings could not be loaded. Sign in again or refresh the page.</div>';
    }
  }

  function showGate() {
    gate.hidden = false;
    panel.hidden = true;
  }

  // Account deletion. Required by App Store guideline 5.1.1(v) for any app with
  // accounts, and the same flow serves the web. Two gates before anything is
  // destroyed: reveal the form, then type the confirmation phrase.
  function setupAccountDeletion() {
    const openButton = document.querySelector('[data-delete-open]');
    const form = document.querySelector('[data-delete-form]');
    if (!openButton || !form) return;

    const input = form.querySelector('input[name="confirm"]');
    const submit = form.querySelector('[data-delete-submit]');
    const message = form.querySelector('[data-delete-message]');

    function setMessage(text, state) {
      message.textContent = text || '';
      message.dataset.state = state || '';
    }

    function matchesPhrase() {
      return input.value.trim().toUpperCase() === CONFIRM_PHRASE;
    }

    function closeForm() {
      form.hidden = true;
      openButton.hidden = false;
      input.value = '';
      submit.disabled = true;
      setMessage('');
    }

    submit.disabled = true;
    input.addEventListener('input', () => {
      submit.disabled = !matchesPhrase();
    });

    openButton.addEventListener('click', () => {
      openButton.hidden = true;
      form.hidden = false;
      input.focus();
    });
    form.querySelector('[data-delete-cancel]').addEventListener('click', closeForm);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!matchesPhrase()) {
        setMessage(`Type ${CONFIRM_PHRASE} to confirm.`, 'error');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Deleting...';
      setMessage('');
      try {
        const response = await TengyunziAuth.authorizedFetch(DELETE_API, {
          method: 'POST',
          body: JSON.stringify({ confirm: CONFIRM_PHRASE }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.deleted) throw new Error(data.error || 'account_deletion_failed');

        // The account is gone, so the stored session is already invalid. Clear it
        // locally before leaving rather than calling signOut, which would POST to
        // /auth/v1/logout with a token whose user no longer exists.
        setMessage('Your account has been deleted. Redirecting...', 'success');
        await TengyunziAuth.signOut().catch(() => {});
        window.setTimeout(() => { window.location.href = './index.html'; }, 1600);
      } catch (error) {
        const reason = error && error.message === 'authentication_required'
          ? 'Your session expired. Sign in again and retry.'
          : 'We could not delete your account. Please try again, or email hello@tengyunzi.com.';
        setMessage(reason, 'error');
        submit.disabled = false;
        submit.textContent = 'Permanently delete';
      }
    });
  }

  document.querySelector('[data-account-login]').addEventListener('click', () => TengyunziAuth.openLogin(loadReports));
  document.querySelector('[data-account-logout]').addEventListener('click', async () => {
    await TengyunziAuth.signOut();
    reports = [];
    showGate();
  });
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderList();
  }));

  setupAccountDeletion();

  if (TengyunziAuth.readSession()?.access_token) loadReports();
  else showGate();
})();
