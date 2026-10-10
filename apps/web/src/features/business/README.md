# Business portal, promotions, and Stripe sandbox

Browsing, joining, and ordinary-user event creation are free. Promotion is optional for user-owned events. Business events are saved as drafts and stay unpublished until verified Stripe sandbox payment publishes and boosts them.

| Plan | Buyer | One-time price | Result |
| --- | --- | --- | --- |
| Venue Boost | Business owning the venue event | €14.99 | Publish and promote for seven days |
| Community Boost | User owning a published event | €2.99 | Optional promotion for three days |

Both promotions end at the event start if that is sooner. The boost fee buys disclosed placement, not guaranteed attendees or an event admission ticket. Server-side plans define prices; the client sends a plan ID rather than a trusted amount.

Open <http://localhost:5173/src/features/business/portal.html> after `npm run dev`, or use **For businesses** in the main app. The portal is a separate Vite page included in `npm run build`; serve the whole `apps/web/dist` directory in production so Stripe returns reach the correct page.

## Optional Stripe sandbox setup

The portal loads without credentials and explains when checkout is unavailable. Never install live Stripe credentials; the API refuses live keys.

1. In Stripe **Test mode / Sandbox**, copy a test secret key (`sk_test_...`). Hosted Checkout runs server-side and needs no browser publishable key.
2. Copy `apps/api/.env.example` to git-ignored `apps/api/.env`. Set only the integrations you use:

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   # Required only for signed webhooks:
   STRIPE_WEBHOOK_SECRET=whsec_...
   WEB_BASE_URL=http://localhost:5173
   BUSINESS_PORTAL_PATH=/src/features/business/portal.html
   ```

   Leave unused provider settings blank. Never commit environment files or keys.
3. Restart the API. Confirm `GET /api/payments/status` reports test-mode configuration.
4. Use Stripe's test card `4242 4242 4242 4242`, a future expiry, and a test CVC/name/postcode. Never enter real payment-card data.

To exercise local webhooks:

```bash
stripe login
stripe listen --forward-to localhost:3001/api/payments/webhook
```

Set the signing secret shown by Stripe CLI in `STRIPE_WEBHOOK_SECRET` and restart the API. Hosted webhook endpoints should listen to `checkout.session.completed` and `checkout.session.expired`.

A webhook is optional for a success-return demonstration because the API can retrieve and verify the Checkout Session server-side. A browser redirect or `checkout=success` query parameter alone never proves payment.

## Publication and payment lifecycle

1. `POST /api/business/events` saves a draft in the unified catalogue. The management list includes it; public `GET /api/events`, details, and recommendations exclude it.
2. `POST /api/payments/checkout` validates the plan, buyer, ownership, event start, and existing promotion, records a pending sandbox order, and creates an attached Stripe Checkout Session.
3. Stripe hosts payment. The success return calls `GET /api/payments/confirm?session_id=...`; a signed webhook can independently confirm it.
4. The server checks paid status, session/order association, amount, and currency. Only a verified matching payment marks the order paid, publishes a business event, and activates its promotion.
5. The feed and map display **Promoted** and the sponsor name. User boosts use the same labelled promotion and scoring contract.

A cancelled checkout calls `POST /api/payments/cancel` and expires an unused pending session. Cancellation, expiry, or failure leaves a business event as a draft. An ordinary-user event stays published without that boost. Incorrect amount/currency or a mismatched session cannot activate promotion. Repeated webhooks and success returns are idempotent.

If a cancel return arrives after Stripe has already taken a verified sandbox payment, the API reconciles the paid order instead. If cancellation cannot be verified, the API returns a retryable error and keeps the order pending rather than claiming it was cancelled.

## Catalogue, ranking, and analytics

The website loads the published API catalogue. User and business events use the same relevance and ranking rules: future start, selected radius, relevant interest/category, then transparent interest/category/distance scoring plus a small sponsored score. Explicit search/filter choices can relax relevance within the other filters. Promotion never bypasses time, radius, or category eligibility.

Paid labels are backed by verified sandbox orders and active promotions. Unsupported paid flags on synthetic seeds are removed; sample events must not imply a real purchase. Public event responses and promotion snapshots omit attendee IDs and internal owner IDs and expose only approximate neighbourhood locations.

The analytics panel displays aggregate impressions, detail opens, joins, and direction taps. Impressions/detail opens are deduplicated per event per tab session, including React rerenders; direction taps count each action. The backend counts a promoted join only on a successful new attendance. It stores counters with optional paid-order attribution, never user identity, session IDs, or mood text. Cost-per-join uses corresponding paid campaign spending and joins during those campaigns; it is empty until an attributed join exists.

## Storage and prototype limits

Profiles, events, sandbox orders, promotions, and aggregate analytics use the git-ignored `apps/api/.data/runtime.json` file and recover across API restarts when that file remains available. Set `THIRDPLACE_DATA_FILE=:memory:` for disposable runs, or an absolute path on a durable disk when hosting. Never commit runtime data, secrets, real payment-card data, mood text, identity documents, or private information.

- Demo identity is synthetic (`demo-user`), not production authentication. Ownership checks operate within that demo boundary.
- The business-management and order lists have no production access control.
- Atomic JSON storage supports one API process; multiple instances require a transactional shared database.
- Stripe remains sandbox-only; there are no refunds and at most one active promotion per event.
- Aggregate counts do not prove unique people, reliable campaign attribution, or attendance.

## Verification

Run from the repository root with Node 24:

```bash
git diff --check
npm run typecheck
npm test
npm run build
```

`npm test` includes integration checks, persistence/restart checks, and the payment smoke test. The payment smoke uses mocked Stripe SDK checkout/create/retrieve/expire calls and real locally signed webhook fixtures; it is fully offline and needs no Stripe account or credentials. To run just that smoke test:

```bash
cd apps/api
THIRDPLACE_DATA_FILE=:memory: npx tsx scripts/payments-smoke.ts
```

Tests bind temporary localhost ports and use disposable or isolated temporary files. They cover business draft privacy, payment publication, owner-only user boosts, cancellation/expiry, amount mismatch, replay, session verification, and API restart recovery. Automated provider fixtures do not establish live provider availability.

For a configured manual sandbox demonstration:

1. Save a future business draft; confirm it is absent from For You/Map and public `GET /api/events`.
2. Cancel checkout; confirm the draft remains unpublished.
3. Complete Stripe test Checkout; confirm the return shows a paid order and the event is published with the **Promoted** label.
4. Create an ordinary-user event free from the main app; confirm it appears in My Events and can receive an optional Community Boost.
5. Open the promoted event, join it, and use directions; check aggregate analytics without promising unique reach.
6. Restart the API using the same durable file; confirm orders, publication, and active promotions recover.

Existing screenshots are under `screenshots/`; capture current UI states when preparing a PR.
