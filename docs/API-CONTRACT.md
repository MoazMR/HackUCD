# API contract

The web app calls `/api`. Vite forwards that path to the API server in development. Import shared shapes from `@social-outings/shared`; internal storage records are not the public wire contract.

## Public events and ownership

User and business events share one API catalogue. Ordinary-user creation publishes an event free of charge. Business creation saves a draft; verified Stripe sandbox payment publishes and promotes it. Drafts are absent from public lists, details, recommendations, and promotion snapshots until publication.

Public events expose title, description, start time, public venue/area, category, interests, attendee count, neighbourhood coordinates, host display name/type, price, capacity, creation time, publication status, and paid-promotion status. They omit `attendeeIds` and internal `hostId`. Recommendation events and promotion snapshots follow the same privacy boundary. Known Dublin areas use their neighbourhood centre; other coordinates are coarsened. Exact home addresses must never be supplied.

The browser acts as synthetic `demo-user`. The optional `x-user-id` header is demo attribution, not authentication. Internal records carry ownership, so users can boost only their own events. Production requires authenticated sessions.

| Method and path | Purpose |
| --- | --- |
| `GET /api/health` | deployment health check |
| `GET /api/events` | published catalogue; `type`, `location`, `paid`, and latitude/longitude/`distanceKm` filters |
| `POST /api/events` | publish an ordinary-user event; invalid input returns `422` |
| `GET /api/events/mine` | public-safe hosted/joined events with `hosting` or `going` role |
| `GET /api/events/:id` | published event details |
| `POST /api/events/:id/attendance` | join idempotently for the demo identity |
| `DELETE /api/events/:id/attendance` | leave a joined event for the demo identity |
| `GET /api/events/:id/messages` | list public event-group messages |
| `POST /api/events/:id/messages` | post to the public event group |
| `GET /api/profiles/:id` | profile and discovery preferences |
| `PUT /api/profiles/:id/preferences` | persist interests, travel radius, and optional supported neighbourhood area |
| `GET /api/profiles/:id/verification` | read mock verification status |
| `POST /api/profiles/:id/verification` | advance mock status; accepts no documents |
| `GET /api/recommendations?userId=:id` | transparent nearby recommendations |
| `POST /api/endorsements` | record a post-event endorsement |
| `POST /api/reports` | create a separate moderation report |
| `GET /api/reports/:subjectId/status` | read moderator-review status |

Event creation accepts `title`, `description`, `startsAt`, `locationName`, `category`, `interest`, `area`, `latitude`, `longitude`, optional `priceEur`, optional `capacity`, and optional public `hostName`. Category is `food | sport | music | social | other`; the start must be in the future. The server determines demo ownership rather than trusting a submitted owner.

Attendance accepts `x-user-id` or a legacy `{ userId }` body, returns `{ event, joined }`, and is idempotent. A new join to a full or started event returns `409`; drafts return `404`. Leaving uses the header identity (default `demo-user`) and returns `{ event, left }`; hosts do not leave their own events. My Events returns `{ memberships: [{ event, role }] }` and recovers hosted/joined membership after a browser refresh.

Profile preferences accept `{ interests, travelRadiusKm, area? }`. Omitted `area` preserves the approximate location; a supported neighbourhood name derives its centre. Unknown areas, exact address fields, and submitted coordinates return `400`. Mock verification accepts only `{ status? }`, with `unverified`, `pending`, `verified`, or `failed`; identity/document fields are rejected. Preferences and verification status persist across API restarts. Public group-chat UI remains a browser prototype; this persistence contract does not cover chat messages.

## Recommendations

Frontend and backend share eligibility and scoring for user and published business events. Recommendations exclude past events and events outside the radius, then require matching interests or category. Explicit search/filter choices can relax relevance; past and radius exclusions still apply. Promotion never makes an ineligible event eligible. The feed uses the API catalogue only; an unavailable API shows an error/retry state instead of silently substituting synthetic browser events.

`GET /api/recommendations` accepts the following optional filters. Radius always comes from the selected profile. Calendar filters use Europe/Dublin time.

| Parameter | Values |
| --- | --- |
| `userId` | profile ID, default `me` |
| `includeUnrelated` | `true` for deliberate broad browsing within time/radius |
| `query` | keyword search, all terms must match |
| `category` or `type` | `all`, `food`, `sport`, `music`, `social`, `other` |
| `area` | exact neighbourhood name, case-insensitive |
| `freeOnly` | `true` or `false` |
| `date` | `any`, `today`, `tomorrow`, `weekend` (current/coming Saturday and Sunday), `custom` |
| `customDate` | valid calendar `YYYY-MM-DD`, required for custom date |
| `timeOfDay` | `any`, `morning`, `afternoon`, `evening` |

Each result returns a public-safe `event`, total `score`, `distanceKm`, human-readable `explanation`, and `scoreBreakdown`:

| Component | Score |
| --- | --- |
| `interest` | 100 per matching normalized interest tag |
| `category` | 25 for a matching category |
| `distance` | `max(0, round((radiusKm - distanceKm) * 10))` |
| `sponsored` | 15 for an active promotion after eligibility |

Sponsored explanations disclose placement. Seeded events are synthetic; unsupported seeded paid flags are removed rather than represented as real purchases. Paid labels come from active promotions backed by verified sandbox orders.

## Event planner

`POST /api/event-plans` accepts:

```ts
type EventPlanRequest = {
  goal: string;
  area: string; // approximate public area only
  category: EventCategory;
  date: string; // parseable date/time
  attendeeCount?: number; // 2..100
  budget?: string;
};
```

It returns `{ plan, provider, model?, notice? }`. `provider` is `openrouter` only when both `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are configured; otherwise it is `synthetic`. OpenRouter requests time out after 15 seconds. Invalid provider JSON or plan fields produce an error. Plans remain drafts for host review and do not publish events. Never send private contact details, exact home locations, identity documents, or private messages.

## Ask ThirdPlace

- `GET /api/assistant/status` reports configuration presence, not provider availability.
- `POST /api/assistant` accepts `{ messages, conversationId?, userId? }`, with 1–12 `{ role: "user" | "assistant", content }` messages of 1–800 trimmed characters. The last role must be `user`; optional `userId` is 1–80 characters and `conversationId` is 1–100. An unknown profile returns `404`.
- The response is `{ reply, provider, suggestedEventIds, notice? }`; provider is `openclaw`, `openrouter`, or `synthetic`.

Provider order is OpenClaw → configured OpenRouter → transparent rule-based fallback. OpenClaw uses `POST {OPENCLAW_GATEWAY_URL}/v1/chat/completions`, model `openclaw/default`, and a server-side Gateway token. OpenRouter uses the configured model and server-side key. Each provider has a 20-second deadline covering the request and response body. Failures return a safe fallback without provider tokens or raw exception text; logs use static failure messages.

The guide uses the requested profile's eligible upcoming catalogue, can suggest events based on mood, and can help draft a public event. Providers select a recommendation/creation intent and at most three eligible event IDs; the server renders catalogue facts and sponsored disclosures instead of forwarding provider prose. Legacy replies may identify an eligible event title, but their prose is not returned. Invalid selections fall through to the next provider or synthetic response.

The rule-based fallback considers relaxed requests for food/social events and active requests for sport, within the same eligibility rules. Creation guidance explains free user creation, optional user boosts, and business draft/payment publication. Restricted requests stay local: the guide cannot publish, pay, diagnose mood, request exact addresses or identity documents, access identity data, or create private messages. Conversations and mood text are not written to profiles, analytics, or runtime storage; the browser offers conversation clearing. A configured provider receives the current conversation for supported requests under its separate retention policy.

## Business, promotions, and payments

Full setup and manual sandbox checks: [business guide](../apps/web/src/features/business/README.md).

| Method and path | Purpose |
| --- | --- |
| `GET /api/business/plans` | server-side EUR prices, duration, and what each plan buys |
| `GET /api/business/events` | business-management list, including drafts |
| `POST /api/business/events` | save a venue-event draft; `422` with `fieldErrors` on invalid input |
| `GET /api/business/my-events` | events owned by the synthetic demo user |
| `GET /api/business/orders` | persistent sandbox order log; no production authentication |
| `GET /api/promotions` | active promotions with public-safe event snapshots |
| `GET /api/payments/status` | Stripe test-mode configuration presence |
| `POST /api/payments/checkout` | `{ planId, eventId, buyer }` → `{ orderId, checkoutUrl }` |
| `GET /api/payments/confirm?session_id=` | retrieve and verify a Checkout Session server-side |
| `POST /api/payments/cancel` | `{ orderId }` → cancel pending order and expire unused checkout |
| `POST /api/payments/webhook` | raw-body Stripe webhook with verified signature |

`venue-boost-7d` costs €14.99 once and publishes/boosts a business event for seven days. `community-boost-3d` costs €2.99 once and optionally boosts an already-published user-owned event for three days. Both end earlier if the event starts.

The client sends a plan ID, never a trusted amount. Activation requires a signed webhook or server-retrieved paid Checkout Session whose attached session, order, amount, and currency agree. Success-return query parameters alone cannot publish or promote. Cancelled, expired, or failed checkout leaves a business event as a draft and a user event published without that boost. Duplicate confirmations are idempotent; amount/currency/session mismatches do not activate a promotion. Live Stripe keys are refused.

Cancellation of an already-paid session reconciles its verified payment instead of claiming an unpaid cancellation. If the API cannot verify cancellation with Stripe, it returns a retryable `502` and keeps the order pending. Closed cancelled/expired/failed orders cannot activate later; create a new checkout.

Payment errors use `{ error, code }`, including `unknown_plan`, `plan_buyer_mismatch`, `not_event_host`, `event_started`, `already_promoted`, `payments_not_configured` (503), and `stripe_error` (502).

## Aggregate analytics

- `POST /api/analytics/events/:id` accepts `{ action }`: `impression`, `detail_view`, `join`, or `directions`. Unknown action returns `400`; unknown event returns `404`.
- `GET /api/analytics/events/:id` returns `{ analytics }` with impressions, detail views, joins, directions, detail/join rates, and paid-order cost-per-join.
- `GET /api/analytics/business?businessName=...` returns aggregate metrics for a business's events.

The browser deduplicates impressions and detail opens per event per tab session, with a page-memory fallback. Direction taps count each action. Successful new attendance on a promoted event counts one backend join; rerenders and repeated attendance do not create extra joins. Stored metrics are aggregate event/action counters with optional paid-order attribution, not user/session records. They contain no user identity or mood text.

Cost-per-join uses paid campaign orders and joins during those campaigns: `paidAmountCents`, `paidJoins`, `currency: "eur"`, and `costPerJoinCents` (`null` before any attributed join). It is a demo metric, not a guarantee of unique reach, attribution accuracy, or attendance.

## Persistence and validation

Profiles, events, orders, promotions, and aggregate metrics persist to git-ignored `apps/api/.data/runtime.json` by default. `THIRDPLACE_DATA_FILE=:memory:` is disposable mode. Restarts reload pending and paid orders and active promotions when the same durable file is available. Atomic JSON replacement is a single-process prototype; multiple instances or production payments require a shared transactional database.

Use Node 24 and run `npm ci --include=dev`, `npm run typecheck`, `npm test`, and `npm run build` from the repository root. Automated integration/provider/payment tests use disposable or isolated temporary storage and temporary localhost ports. Payment smoke mocks Stripe SDK operations and uses locally signed webhook fixtures, so tests do not contact Stripe. Hosted sandbox checkout and live provider responses are separate optional checks.

Coordinate contract changes with the related UI and API owners.
