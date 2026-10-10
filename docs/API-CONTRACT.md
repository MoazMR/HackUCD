# API contract v0

The web app calls `/api`. In local development Vite forwards that path to the API server.

## Event

```ts
type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string; // ISO timestamp
  locationName: string;
  category: "food" | "sport" | "music" | "social" | "other";
  attendeeCount: number;
};
```

| Method and path | Purpose | Owner |
| --- | --- | --- |
| `GET /api/health` | deployment health check | integration |
| `GET /api/events` | list events near the user | API/events |
| `POST /api/events` | create an event | API/events |
| `GET /api/events/:id` | event details | API/events |
| `POST /api/events/:id/attendance` | join or leave | API/events |
| `GET /api/users/me` | current profile | API/users |
| `PUT /api/users/me/preferences` | update interests | API/users |

Changes to this document need agreement from both the related UI and API owners.

## Business, promotions and payments (proposed by Cahal; needs Moaz's agreement)

Additive only: these routes do **not** change the `Event` type or the core `/api/events` routes. Business venue events and promotions live in separate services. Full flow and setup: `apps/web/src/features/business/README.md`.

| Method and path | Purpose | Owner |
| --- | --- | --- |
| `GET /api/business/plans` | promotion plans: what each buys, price in cents, currency (`eur`), duration | business |
| `GET /api/business/events` | venue-based events created by businesses | business |
| `POST /api/business/events` | create a venue event; `422` with `fieldErrors` on invalid input | business |
| `GET /api/business/my-events` | the demo user's own events (until `Event` has a host id) | business |
| `GET /api/business/orders` | mock order log | business |
| `GET /api/promotions` | active promotions for feed/map labels | business |
| `GET /api/payments/status` | whether Stripe test mode is configured | payments |
| `POST /api/payments/checkout` | `{ planId, eventId, buyer }` → `{ orderId, checkoutUrl }` (Stripe Checkout, sandbox) | payments |
| `GET /api/payments/confirm?session_id=` | verify the session server-side, activate the promotion | payments |
| `POST /api/payments/cancel` | `{ orderId }` → mark order cancelled, nothing charged | payments |
| `POST /api/payments/webhook` | Stripe webhook (raw body, signature verified) | payments |

```ts
type BusinessEvent = Event & { hostType: "business"; businessName: string; venueAddressArea: string; createdAt: string };

type Promotion = {
  id: string;
  eventId: string;
  tier: "business" | "user";
  label: "Promoted";
  sponsorName: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO; plan length or event start, whichever is sooner
  event: Event | BusinessEvent; // snapshot so the feed can render it
};
```

Errors use `{ error: string, code: string }`, e.g. `unknown_plan`, `plan_buyer_mismatch`, `not_event_host`, `event_started`, `already_promoted`, `payments_not_configured` (503), `stripe_error` (502).

**Proposed later change (not made):** add optional `hostId` and `promoted?: { sponsorName: string; endsAt: string }` to `Event`, so `/api/events` can return the label directly and ownership checks use real ids.
