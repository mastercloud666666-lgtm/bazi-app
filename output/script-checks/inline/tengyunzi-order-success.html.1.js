
    (function () {
      const SUPABASE_URL = 'https://rcyssrsnalefzhzsvswm.supabase.co';
      const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';
      const params = new URLSearchParams(window.location.search);
      const tradeNo = params.get('trade_no') || localStorage.getItem('tengyunzi_pending_trade_no') || '';
      const paypalOrderId = params.get('token') || '';
      const cancelled = params.get('pp') === 'cancel';
      const product = localStorage.getItem('tengyunzi_pending_product') || 'your Tengyunzi order';
      const label = document.getElementById('status-label');
      const title = document.getElementById('status-title');
      const copy = document.getElementById('status-copy');
      const detail = document.getElementById('status-detail');
      const reference = document.getElementById('order-reference');

      function showReference() {
        if (!tradeNo) return;
        reference.hidden = false;
        reference.textContent = `Order reference: ${tradeNo}`;
      }

      function showSuccess(result) {
        label.textContent = 'Payment confirmed';
        title.textContent = 'Your order is in.';
        copy.textContent = `${result.product || product} is now in the Tengyunzi reading queue. Your report will be delivered to the email in your intake.`;
        detail.textContent = 'Delivery target: within 72 hours.';
        showReference();
        localStorage.removeItem('tengyunzi_pending_trade_no');
        localStorage.removeItem('tengyunzi_pending_intake_id');
        localStorage.removeItem('tengyunzi_pending_product');
      }

      function showProblem(message) {
        label.textContent = 'Payment needs attention';
        title.textContent = 'We could not confirm it yet.';
        copy.textContent = 'No second payment is needed. Keep your order reference and contact Tengyunzi so the payment can be checked manually.';
        detail.textContent = message || 'The confirmation service did not return a completed payment.';
        showReference();
      }

      async function existingPaidOrder() {
        if (!tradeNo) return false;
        const query = new URL(`${SUPABASE_URL}/rest/v1/orders`);
        query.searchParams.set('select', 'paid');
        query.searchParams.set('trade_no', `eq.${tradeNo}`);
        query.searchParams.set('limit', '1');
        const res = await fetch(query, {
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
        });
        if (!res.ok) return false;
        const rows = await res.json().catch(() => []);
        return Boolean(rows[0]?.paid);
      }

      async function confirmPayment() {
        if (cancelled) {
          label.textContent = 'Checkout cancelled';
          title.textContent = 'Your order is saved.';
          copy.textContent = 'You were not charged. Your intake remains available if you decide to complete payment later.';
          detail.textContent = 'Return to the product page when you are ready.';
          showReference();
          return;
        }

        if (!tradeNo) {
          showProblem('The order reference is missing.');
          return;
        }

        if (await existingPaidOrder()) {
          showSuccess({ product });
          return;
        }

        if (!paypalOrderId) {
          showProblem('The PayPal confirmation token is missing.');
          return;
        }

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/paypal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON,
              Authorization: `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({
              action: 'capture',
              paypal_order_id: paypalOrderId,
              trade_no: tradeNo,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok || !data.paid) {
            throw new Error(data.message || data.error || 'Payment was not completed.');
          }
          showSuccess(data);
        } catch (err) {
          showProblem(err instanceof Error ? err.message : String(err));
        }
      }

      confirmPayment();
    })();
  
