const logEl = document.getElementById('log');
const errorEl = document.getElementById('error-message');
const summaryBox = document.getElementById('summary-box');
const summaryRows = document.getElementById('summary-rows');
const resetBtn = document.getElementById('reset-btn');

function setStep(n, state) {
  const el = document.getElementById(`step-${n}`);
  el.classList.remove('active', 'done');
  if (state) el.classList.add(state);
}

function log(kind, label, obj) {
  const entry = document.createElement('div');
  entry.className = `log-entry ${kind}`;
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `
    <div class="meta"><span class="label">${label}</span><span>${time}</span></div>
    <pre>${escapeHtml(JSON.stringify(obj, null, 2))}</pre>
  `;
  logEl.appendChild(entry);
  logEl.scrollTop = logEl.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function addSummaryRow(key, value) {
  const row = document.createElement('div');
  row.className = 'summary-row';
  row.innerHTML = `<span class="k">${key}</span><span class="v">${value ?? '—'}</span>`;
  summaryRows.appendChild(row);
}

function handleError(error) {
  errorEl.textContent = error.message;
  log('response', 'Error', error);
}

async function init() {
  const configRes = await fetch('/config');
  const { publishableKey } = await configRes.json();
  log('response', 'GET /config', { publishableKey });

  const stripe = Stripe(publishableKey);

  const elements = stripe.elements({
    mode: 'payment',
    amount: 1,
    currency: 'usd',
  });

  const expressCheckoutElement = elements.create('expressCheckout', {
    emailRequired: true,
    phoneNumberRequired: true,
    layout: { maxColumns: 1 },
  });
  expressCheckoutElement.mount('#express-checkout-element');

  expressCheckoutElement.on('confirm', async (event) => {
    setStep(1, 'done');
    setStep(2, 'active');

    // This is the synchronous data available the instant the customer approves
    // in the payment sheet, BEFORE the payment is confirmed with Stripe's
    // servers. For Apple Pay / Google Pay, billingDetails.email is reliably
    // populated here (that's what emailRequired guarantees). For Link, it
    // depends on whether Link already recognizes the customer's session —
    // a returning/authenticated Link session has it here already; a fresh
    // OTP authentication may not resolve it until after confirmPayment
    // (still sync either way, just a later step — see step 3).
    log('event', 'onConfirm event (sync, client-side)', {
      billingDetails: event.billingDetails,
      shippingAddress: event.shippingAddress,
      expressPaymentType: event.expressPaymentType,
    });

    addSummaryRow('Wallet used', event.expressPaymentType);
    addSummaryRow(
      'Email (from onConfirm, sync)',
      event.billingDetails?.email || 'not present yet — see step 3'
    );
    summaryBox.classList.add('visible');

    const { error: submitError } = await elements.submit();
    if (submitError) {
      handleError(submitError);
      return;
    }

    log('request', 'POST /create-intent', {});
    const res = await fetch('/create-intent', { method: 'POST' });
    const { client_secret: clientSecret, id, amount, currency, status } = await res.json();
    log('response', 'PaymentIntent created', { id, amount, currency, status });

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (error) {
      handleError(error);
      return;
    }

    setStep(2, 'done');
    setStep(3, 'active');
    log('response', 'stripe.confirmPayment result (sync, client-side)', paymentIntent);

    // Fetch the finalized PaymentIntent + expanded PaymentMethod to show the
    // full server-side record — still available without waiting on a webhook.
    // This is where Link's billing_details.email shows up, even though it
    // wasn't present in the onConfirm event above.
    const piRes = await fetch(`/payment-intent/${paymentIntent.id}`);
    const fullIntent = await piRes.json();
    log('response', `GET /payment-intent/${paymentIntent.id}`, fullIntent);

    setStep(3, 'done');

    const billing = fullIntent.payment_method?.billing_details;
    const wallet = fullIntent.payment_method?.card?.wallet;
    const emailWasSyncAtConfirm = Boolean(event.billingDetails?.email);
    addSummaryRow('PaymentIntent status', fullIntent.status);
    addSummaryRow(
      'billing_details.email (finalized PI)',
      billing?.email
        ? `${billing.email}${emailWasSyncAtConfirm ? '' : '  (only appeared here, not at onConfirm)'}`
        : undefined
    );
    addSummaryRow('billing_details.phone', billing?.phone);
    addSummaryRow('billing_details.name', billing?.name);
    addSummaryRow('payment_method.type', fullIntent.payment_method?.type);
    addSummaryRow('card.wallet.type', wallet?.type);

    resetBtn.style.display = 'inline-block';
  });

  expressCheckoutElement.on('cancel', () => {
    log('event', 'cancel event', {});
  });
}

resetBtn.addEventListener('click', () => window.location.reload());

init();
