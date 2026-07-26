(function () {
  const form = document.querySelector('[data-feng-shui-order]');
  if (!form) return;

  const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
  const intakeApi = `${SUPABASE_URL}/functions/v1/feng-shui-intake`;
  const paypalApi = `${SUPABASE_URL}/functions/v1/paypal`;
  const fileInput = form.elements.floor_plans;
  const fileTrigger = form.querySelector('[data-file-trigger]');
  const fileStatus = form.querySelector('[data-file-status]');
  const status = form.querySelector('[data-feng-shui-status]');
  const submit = form.querySelector('[type="submit"]');
  const allowedTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);
  const maxFileBytes = 8 * 1024 * 1024;
  const maxTotalBytes = 20 * 1024 * 1024;

  function setStatus(message, state) {
    status.textContent = message;
    status.dataset.state = state || '';
  }

  function validateFiles() {
    const files = Array.from(fileInput.files || []);
    if (!files.length) return 'Upload at least one complete floor-plan file.';
    if (files.length > 4) return 'Choose no more than four files.';
    if (files.some((file) => !allowedTypes.has(file.type))) return 'Use PDF, PNG, JPG, or WebP files only.';
    if (files.some((file) => file.size > maxFileBytes)) return 'Each file must be 8 MB or smaller.';
    if (files.reduce((sum, file) => sum + file.size, 0) > maxTotalBytes) return 'The selected files must total 20 MB or less.';
    return '';
  }

  function updateFileStatus() {
    const files = Array.from(fileInput.files || []);
    const error = validateFiles();
    fileStatus.textContent = error || files.map((file) => `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`).join(' | ');
    fileStatus.style.color = error ? '#a32921' : '';
  }

  function returnOrigin() {
    return /^(localhost|127\.0\.0\.1)$/i.test(location.hostname) ? 'https://www.tengyunzi.com' : location.origin;
  }

  fileTrigger.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', updateFileStatus);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fileError = validateFiles();
    const selectedGoals = form.querySelectorAll('input[name="goals"]:checked');
    if (fileError) {
      setStatus(fileError, 'error');
      fileInput.focus();
      return;
    }
    if (!selectedGoals.length) {
      setStatus('Choose at least one priority for the review.', 'error');
      form.querySelector('input[name="goals"]').focus();
      return;
    }
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Uploading your plan…';
    setStatus('Saving your private intake before checkout…');

    let intakeSaved = false;
    try {
      const intakeResponse = await fetch(intakeApi, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        body: new FormData(form),
      });
      const intake = await intakeResponse.json().catch(() => ({}));
      if (!intakeResponse.ok || !intake.ok) throw new Error(intake.error || 'intake_failed');
      intakeSaved = true;

      try {
        localStorage.setItem('tengyunzi_pending_trade_no', intake.order_reference || '');
        localStorage.setItem('tengyunzi_pending_intake_id', intake.intake_id || '');
        localStorage.setItem('tengyunzi_pending_product', 'Tengyunzi Manual Feng Shui Review');
      } catch {}

      submit.textContent = 'Opening PayPal…';
      setStatus('Plan saved privately. Opening secure PayPal checkout…', 'success');
      const paypalResponse = await fetch(paypalApi, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          action: 'create',
          trade_no: intake.order_reference,
          option_id: 'feng_shui',
          service: 'tengyunzi_manual',
          origin: returnOrigin(),
        }),
      });
      const paypal = await paypalResponse.json().catch(() => ({}));
      if (!paypalResponse.ok || !paypal.approve_url) throw new Error(paypal.error || 'paypal_checkout_failed');
      location.assign(paypal.approve_url);
    } catch (error) {
      setStatus(
        intakeSaved
          ? 'Your plan was saved, but PayPal could not be opened. Please contact support with the email you entered.'
          : 'The order could not be prepared. Nothing was charged. Check your files and try again.',
        'error',
      );
      submit.disabled = false;
      submit.textContent = 'Continue to PayPal · $149';
    }
  });
})();
