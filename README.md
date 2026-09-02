# Apple Pay / Google Pay — Express Checkout Element Demo

Live, run-on-a-call demo of the Express Checkout Element. Built to make one thing
visible on screen: **what data comes back after a wallet payment is finalized,
and exactly when it becomes available.**

Layout: 2/3 of the screen is the actual checkout flow (a real Apple Pay /
Google Pay button); 1/3 on the right is a live log of every API request,
response, and event as it happens, in order.

## Why this demo exists

Built to answer a recurring customer question: *"Do we get the payer's email
from Apple Pay / Google Pay, and when is it actually available?"*

The demo proves it live, in two steps:
- Step 2 (`onConfirm` event) shows `billing_details.email`, wallet type, etc.
  arriving in the browser, before the PaymentIntent is even confirmed with
  Stripe.
- Step 3 shows the finalized PaymentIntent + expanded PaymentMethod — the full
  server-side record, fetched right after `confirmPayment` resolves.

Everything shown here is synchronous and client-driven — no webhook involved
at any point in this demo.

## Setup — local (Google Pay + Link only)

Chrome treats `http://localhost` as a secure context, so Google Pay and Link
work locally with no domain registration or public tunnel. **Apple Pay will
not render locally** — see the deploy section below for that; do not use
ngrok/cloudflared or any other local tunnel on a Stripe corp machine, that
class of inbound tunnel is against sec policy.

1. Install dependencies:
   ```
   npm install
   ```

2. Fill in `.env` with **sandbox/test** keys (`STRIPE_SECRET_KEY`,
   `STRIPE_PUBLISHABLE_KEY`) from https://dashboard.stripe.com/test/apikeys

3. Start the demo:
   ```
   npm start
   ```
   Open http://localhost:4242 and test with Google Pay (Chrome) or Link.

## Setup — Apple Pay (requires a real deployed HTTPS domain)

Apple's domain verification requires a real publicly-reachable HTTPS domain —
there's no local/tunnel workaround, and tunneling a corp laptop is against sec
policy anyway. This repo deploys to Vercel as a serverless function
(`api/index.js` wraps the Express app; `vercel.json` routes every request to
it and bundles `public/` alongside it).

1. Run `vercel login` yourself in a terminal (interactive browser auth).
2. From this folder, run `npx vercel` to link/deploy a preview, then
   `npx vercel --prod` for the production URL. Set the env vars
   `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` (test/sandbox keys) on the
   Vercel project — either via `npx vercel env add` or the dashboard's
   Settings > Environment Variables — and redeploy after adding them.
3. Register the resulting domain (`https://<your-project>.vercel.app`) in
   Stripe's Payment method domains (test mode):
   https://dashboard.stripe.com/test/settings/payment_method_domains — this
   can be done via the API with the existing `STRIPE_SECRET_KEY`
   (`POST /v1/payment_method_domains`) instead of the Dashboard.
4. Open the Vercel URL in Safari on a Mac/iPhone with a card in Apple Wallet.

## Running it on a call

- Apple Pay only renders in Safari on macOS/iOS with a card already in Wallet.
  Google Pay renders in Chrome with a card saved to the Google account.
- Test cards work directly through the wallet in test mode — no real card
  needed, Stripe recognizes the test keys and returns a test token.
- Talk track, matched to the step indicator:
  1. **Pay** — customer taps the wallet button, approves in the native sheet.
  2. **Confirm (sync)** — point at the right-hand panel: the `onConfirm` event
     just logged billing details/wallet type, before anything touched Stripe's
     servers for confirmation. **For Apple Pay / Google Pay**, email is already
     here. **For Link**, watch the summary box instead — it'll say "not present
     yet" at this step (see caveat below).
  3. **Finalized (sync)** — the PaymentIntent confirms, and the summary box
     fills in from the finalized PaymentIntent + expanded PaymentMethod — still
     synchronous, client-driven, no webhook anywhere in this flow. **This is
     where Link's email actually shows up** — the summary box flags it as
     "only appeared here, not at onConfirm" so the distinction is visible
     live, not just asserted.

## Notes on the email field specifically

`emailRequired: true` (and `phoneNumberRequired: true`) is what makes Apple Pay
/ Google Pay expose those fields at all — wallets don't share them by default.
The email lands in `billing_details.email` at the top level of the
PaymentMethod, not nested under `card.wallet.apple_pay` / `card.wallet.google_pay`
(those sub-objects don't carry contact fields). See
[internal reference removed] area of the vault for
the related Connect fund-flow research this demo grew out of, and the [customer name removed]
account (`[internal reference removed]`) for the customer question that prompted it.

**Caveat found through live testing (not documented on Stripe's confirm-event
reference page):** the "email is synchronous" claim holds cleanly for Apple Pay
and Google Pay — `billingDetails.email` is reliably populated in the
`onConfirm` event itself. For **Link**, it's session-dependent: if Link
already recognizes the customer (a returning/authenticated Link session),
email showed up in `onConfirm` just like the wallets. If Link needs a fresh
OTP authentication, email may not resolve until after `stripe.confirmPayment`
and the finalized PaymentIntent/PaymentMethod is fetched. Either way it's
still synchronous — just potentially a later step for Link than for the
wallets. Worth calling out on a call rather than implying every payment method
behaves identically at `onConfirm`.

## Files

- `server.js` — Express app: PaymentIntent creation, finalized-PaymentIntent
  lookup. Exports the app (`module.exports = app`) so it can run standalone
  locally (`npm start`) or be wrapped as a Vercel serverless function.
- `api/index.js` — Vercel entry point; re-exports `server.js`.
- `vercel.json` — routes all requests to `api/index.js` and bundles `public/`
  into the function so `express.static('public')` still works when deployed.
- `public/index.html` / `public/app.js` / `public/styles.css` — the 2/3 + 1/3
  demo UI, Express Checkout Element mount, and the live log panel.
