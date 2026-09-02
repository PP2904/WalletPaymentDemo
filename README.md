  Apple Pay / Google Pay — Express Checkout Element Demo

  Live, run-on-a-call demo of an Express Checkout Element. Built to make one thing
  visible on screen: what data comes back after a wallet payment is finalized,
  and exactly when it becomes available.

  Layout: 2/3 of the screen is the actual checkout flow (a real Apple Pay /
  Google Pay button); 1/3 on the right is a live log of every API request,
  response, and event as it happens, in order.

  Why this demo exists
  
  Built to answer a recurring question: "Do we get the payer's email from
  Apple Pay / Google Pay, and when is it actually available?"

  The demo proves it live, in two steps:
  - Step 2 (onConfirm event) shows billing_details.email, wallet type, etc.
  arriving in the browser, before the payment intent is even confirmed with
  the payment provider.
  - Step 3 shows the finalized payment intent + expanded payment method — the
  full server-side record, fetched right after confirmPayment resolves. 

  Everything shown here is synchronous and client-driven — no webhook involved
  at any point in this demo.

  Setup — local (Google Pay + Link only)

  Chrome treats http://localhost as a secure context, so Google Pay and Link
  work locally with no domain registration or public tunnel. Apple Pay will
  not render locally — see the deploy section below for that; avoid
  ngrok/cloudflared or any other local tunnel on a locked-down corporate
  machine, as that class of inbound tunnel is often against security policy.

  1. Install dependencies:
  npm install
  2. Fill in .env with sandbox/test API keys (SECRET_KEY,
  PUBLISHABLE_KEY) from your payment provider's test dashboard.
  3. Start the demo:
  npm start
  3. Open http://localhost:4242 and test with Google Pay (Chrome) or Link.

  Setup — Apple Pay (requires a real deployed HTTPS domain)

  Apple's domain verification requires a real publicly-reachable HTTPS domain —
  there's no local/tunnel workaround, and tunneling a corp laptop is against
  most security policies anyway. This repo deploys to Vercel as a serverless
  function (api/index.js wraps the Express app; vercel.json routes every
  request to it and bundles public/ alongside it).

  1. Run vercel login yourself in a terminal (interactive browser auth).
  2. From this folder, run npx vercel to link/deploy a preview, then
  npx vercel --prod for the production URL. Set the env vars
  SECRET_KEY and PUBLISHABLE_KEY (test/sandbox keys) on the Vercel
  project — either via npx vercel env add or the dashboard's Settings >
  Environment Variables — and redeploy after adding them.
  3. Register the resulting domain (https://<your-project>.vercel.app) as a
  payment method domain in your provider's test-mode dashboard — this can
  usually be done via API instead of the dashboard UI.
  4. Open the Vercel URL in Safari on a Mac/iPhone with a card in Apple Wallet.

  ---

   Files

  - server.js — Express app: payment intent creation, finalized payment
  intent lookup. Exports the app (module.exports = app) so it can run
  standalone locally (npm start) or be wrapped as a Vercel serverless
  function.
  - api/index.js — Vercel entry point; re-exports server.js.
  - vercel.json — routes all requests to api/index.js and bundles public/
  into the function so express.static('public') still works when deployed.
  - public/index.html / public/app.js / public/styles.css — the 2/3 + 1/3
  demo UI, Express Checkout Element mount, and the live log panel.
