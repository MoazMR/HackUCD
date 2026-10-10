# Business portal, promotions and Stripe sandbox (Cahal)

A separate business experience for promoting events. Promotion is optional: browsing, joining and creating events stay free.

- **Businesses** create a venue-based event and can buy a **Venue Boost** (€14.99 one-time, 7 days).
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

Orders and promotions are kept in memory (mock orders) and reset when the API restarts.

## For the feed and map (Kate)

```tsx
import { PromotedBadge, usePromotions } from "../business";

const { byEventId } = usePromotions();
const promotion = byEventId.get(event.id);
{promotion && <PromotedBadge sponsorName={promotion.sponsorName} />}          // event card
{promotion && <PromotedBadge variant="pin" sponsorName={promotion.sponsorName} />} // map hotspot
```

`usePromotions` fails soft: if the endpoint is down the feed renders normally without labels.
Promotion changes position, not audience. Apply the user's interest and radius filters first, then lift matching promoted events.
Business venue events live in `GET /api/business/events` (and each promotion includes an `event` snapshot) until they are merged into the core event store.

## Known limits (prototype)

- The portal is a separate Vite page, so it is served by `npm run dev` but not yet included in `vite build`. For deployment, add it as a build input or route it from the app shell.
- Core events carry Moaz's static `isPaidPromotion` flag; paid boosts bought here live in `/api/promotions` and are not yet reflected in that flag or in `/api/events?paid=true`.

- No authentication: the "own event" check uses a synthetic demo user (`Aoife`, owns `coffee-and-code`) and the business name typed in the form. Replace with the real host id once `Event` carries one.
- In-memory storage; no refunds; one active promotion per event.

## Tests

```bash
npm run typecheck
cd apps/api && npx tsx scripts/payments-smoke.ts   # 35 offline checks: normal, boundary and failure requests + signed webhook
```

Screenshots of each state are in `screenshots/`.
