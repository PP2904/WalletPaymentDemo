require('dotenv').config();
const path = require('path');
const express = require('express');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();
const PORT = process.env.PORT || 4242;

// Demo line item — fixed on purpose so the amount shown in the wallet sheet
// always matches what's charged (Stripe requires this to match server-side).
const DEMO_AMOUNT = 1999; // $19.99
const DEMO_CURRENCY = 'usd';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/config', (req, res) => {
  res.json({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

app.post('/create-intent', async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.create({
      amount: DEMO_AMOUNT,
      currency: DEMO_CURRENCY,
      automatic_payment_methods: { enabled: true },
    });
    res.json({
      client_secret: intent.client_secret,
      id: intent.id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (err) {
    console.error('create-intent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Lets the client show the finalized PaymentIntent (billing_details, wallet
// type, etc.) alongside the raw onConfirm event — everything here is sync,
// client-driven data, no webhook involved.
app.get('/payment-intent/:id', async (req, res) => {
  try {
    const intent = await stripe.paymentIntents.retrieve(req.params.id, {
      expand: ['payment_method'],
    });
    res.json(intent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Demo running at http://localhost:${PORT}`);
  });
}

module.exports = app;
