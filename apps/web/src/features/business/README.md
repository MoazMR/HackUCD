# Business portal, promotions and Stripe sandbox (Cahal)

A separate business experience for publishing and promoting venue events. Browsing, joining and ordinary-user event creation stay free; businesses pay the displayed one-time price to publish and boost a venue event.

- **Businesses** save a venue-event draft and buy a **Venue Boost** (€14.99 one-time, 7 days) to publish and promote it.
- **Ordinary users** can optionally buy a **Community Boost** (€2.99 one-time, 3 days) for one of their own events.
- Promoted events are labelled **Promoted** with the sponsor's name in the feed and on the map (`PromotedBadge`).
- Payment uses **Stripe-hosted Checkout in sandbox (test) mode** via a server-side route. Live keys are refused.

Open the portal at <http://localhost:5173/src/features/business/portal.html> after `npm run dev`.
It is a standalone page so it doesn't touch `App.tsx`; link or route it from the main app when the team integrates navigation.

## Stripe sandbox setup

1. Create or sign in to a Stripe account and switch to **Test mode / Sandbox**. In *Developers → API keys*, copy the **secret key** (`sk_test_...`).
   Hosted Checkout runs entirely server-side, so no publishable key is needed.
2. Create `apps/api/.env` (git-ignored; never commit it):

   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   # Optional: only needed to test the webhook (see below)
   STRIPE_WEBHOOK_SECRET=whsec_...
   # Optional overrides
   WEB_BASE_URL=http://localhost:5173
   BUSINESS_PORTAL_PATH=/src/features/business/portal.html
   ```

   `apps/api/.env.example` lists the same variables. The API loads `apps/api/.env` on start-up through `dotenv`.
3. Restart `npm run dev`. The portal shows a yellow notice if the key is missing or isn't a test key.
4. Pay with Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC, any name and postcode.

### Webhook (optional)

The success return already verifies payment by retrieving the Checkout Session server-side, so the demo works without a webhook. To also test the webhook:

```bash
stripe login
stripe listen --forward-to localhost:3001/api/payments/webhook
# copy the whsec_... it prints into STRIPE_WEBHOOK_SECRET, restart the API
```

Activation is idempotent: if the webhook and the success return both arrive, the promotion is activated once.

## How a payment flows

1. Portal → `POST /api/payments/checkout` with `{ planId, eventId, buyer }`. The server validates the plan, buyer and event ownership, records a **pending mock order**, and creates a Checkout Session with the server-side price. The client never sends an amount.
2. Browser goes to Stripe Checkout.
3. **Success** → Stripe redirects to `portal.html?checkout=success&session_id=...` → `GET /api/payments/confirm` retrieves the session from Stripe, checks `payment_status`, amount and currency, marks the order **paid**, and activates the promotion.
   **Cancel** → `portal.html?checkout=cancelled&order=...` → `POST /api/payments/cancel` marks the order **cancelled** and expires the unused session. Nothing is charged.
4. `GET /api/promotions` now returns the promotion; the feed and map show the **Promoted** label.

Events, mock orders, promotions and aggregate reach metrics use the API's durable prototype JSON boundary and survive an API restart. The file is git-ignored and contains no Stripe secret, payment-card details, mood text or identity documents.

## In the feed and map

Wired up in `features/business/promotedFeed.ts`, called from Kate's `events/eventsClient.ts`:

- A promoted event already in the feed gets a **Promoted** badge (`PromotedBadge`) on its card and on its map hotspot, with "Promoted by <sponsor> (paid placement)" in the card details.
- A promoted business venue event is added to the feed at its neighbourhood (the portal's Area list is the feed's `AREAS`), with its interest, price and capacity from the portal form.
- Ranking: interest matches first, then promoted, then nearest. Promotion never bypasses the radius, date, filter or interest rules, so a padel-only user never sees a promoted poker night.
- Fails soft: if `/api/promotions` is down, the feed renders normally without labels.

`usePromotions` is still exported for any other view that needs the active list.

## Known limits (prototype)

- The portal is a separate Vite page, so it is served by `npm run dev` but not yet included in `vite build`. For deployment, add it as a build input or route it from the app shell.
- A paid boost sets the shared event's `isPaidPromotion` flag (and clears it when the boost ends), so `/api/events?paid=true` includes both user and published business events.

- No production authentication: events now carry stable synthetic `hostId` ownership, while the browser still acts as demo user `demo-user`. Replace the demo identity boundary with real sessions before live payments.
- Prototype JSON storage is single-process and not a substitute for a production database; no refunds; one active promotion per event.

## Tests

```bash
npm run typecheck
cd apps/api && npx tsx scripts/payments-smoke.ts   # offline checks: normal, boundary and failure requests + signed webhook
```

Screenshots of each state are in `screenshots/`.
