# Commercial and AI verification

This records the commercial/assistant checks and browser evidence for the handoff branch. Automated checks and browser fixtures exercise application behavior; they do not establish live Stripe, OpenClaw, or OpenRouter availability.

## Automated coverage

Run with Node 24 from the repository root:

```bash
git diff --check
npm ci --include=dev
npm run typecheck
npm test
npm run build
```

The test suites cover:

- Public-safe event responses and promotion snapshots, draft privacy, API creation, ownership, membership, approximate coordinates, and matching frontend/backend ranking/filter boundaries.
- Stripe checkout/session verification, signed raw-body webhooks, wrong amount/currency/session, replay, cancellation/expiry, paid-session reconciliation, and restart recovery.
- Anonymous aggregate analytics, tab-session impression/detail deduplication, idempotent promoted joins, directions, paid-order cost-per-join, migration, and restart persistence.
- OpenClaw success, OpenClaw failure with OpenRouter fallback, both providers unavailable, deadlines, actual-profile grounding, invalid messages, secret-safe output, and restricted requests.
- Persistent preferences/mock verification, default JSON location, disposable mode, malformed/oversized requests, and business UI state handling.

The final run with current main integrated passed type checking, 103 tests, 43 offline payment smoke checks, and the production build. The build includes the main website, business portal, and Demo assets.

Payment smoke mocks Stripe SDK create/retrieve/expire operations and verifies locally signed webhook fixtures through the real route. Provider tests use controlled responses. Tests bind temporary localhost ports; storage tests use disposable state or isolated temporary files. No integration credentials or outbound payment/provider requests are needed.

## Observed browser journeys

The browser run verified adult onboarding and neighbourhood/preferences, free user-event creation and hosted My Events recovery, hidden business drafts, verified sandbox-fixture publication, cancellation, an owner's optional Community Boost, and paid success-return recovery after an API restart.

A pending success return kept its checkout/session query after repeated unpaid confirmations while the business event stayed hidden. After a delayed signed fixture payment, refresh confirmed and published it; cleanup removed only checkout parameters and preserved unrelated query/hash state. An owned event detail showed the hosting notice, offered no ineffective Leave action, and kept its public group-chat composer enabled.

It also checked matching feed/API recommendation order, radius/relevance exclusions and explicit search, promoted feed/map disclosure, tab-session impression deduplication after rerenders/reload, detail/join/direction counts, and business cost-per-join. Restart snapshots preserved catalogue, memberships, orders, promotions, profiles, and aggregate counters; tested mood/conversation text was absent from runtime data.

Ask ThirdPlace handled mood, grounded sponsored suggestions, and creation guidance through its labelled rule-based fallback, and refused publishing/payment, diagnosis, exact-address, identity-document, and private-message requests. The mobile feed had no horizontal overflow, and the functional run reported no uncaught browser exceptions.

The illustrative map matched its accessible event list, including City Centre, Docklands, and distinct coarse points in an unknown neighbourhood. Nearby targets appear as clusters whose preview lists every included event; clustering retains the original approximate points. Normal pointer clicks reached every rendered hotspot on desktop and mobile; their previews covered all nine eligible listed events.

After integrating current main, the Demo iframe loaded its local HTML, scripts, styles, logo and fonts, and slide controls worked. The branded assistant retained grounded follow-up guidance and restrictions; the final mobile feed and assistant had no horizontal overflow or uncaught exceptions.

The newer pinned header stayed visible while scrolling on desktop and mobile. The desktop map preview and Close control remained below the header, and mobile navigation scrolled within its single row to reach Ask ThirdPlace without page overflow.

| Journey | Screenshots |
| --- | --- |
| Onboarding and free hosted event | [Onboarding](screenshots/commercial-ai/01-onboarding.png), [My Events hosting](screenshots/commercial-ai/02-my-events-hosting.png), [Owned event controls](screenshots/commercial-ai/20-owned-event-hosting.png) |
| Business draft and payment outcomes | [Hidden draft](screenshots/commercial-ai/03-business-draft-hidden.png), [Paid success](screenshots/commercial-ai/04-business-payment-success.png), [Cancelled draft](screenshots/commercial-ai/05-business-payment-cancelled.png) |
| Promoted disclosure and attendance | [Feed](screenshots/commercial-ai/06-promoted-feed.png), [Map](screenshots/commercial-ai/07-promoted-map.png), [Joined detail](screenshots/commercial-ai/08-promoted-detail-joined.png) |
| Aggregate analytics and optional user promotion | [Business analytics](screenshots/commercial-ai/09-business-analytics.png), [Community Boost](screenshots/commercial-ai/10-community-boost-success.png) |
| Grounded assistant and restrictions | [Follow-up](screenshots/commercial-ai/11-assistant-grounded-followup.png), [Public-chat restriction](screenshots/commercial-ai/12-assistant-public-chat-restriction.png) |
| Responsive feed | [Mobile](screenshots/commercial-ai/13-mobile-feed.png) |
| Restart recovery | [Recovered checkout](screenshots/commercial-ai/14-restart-recovered-checkout.png), [Recovered My Events](screenshots/commercial-ai/15-restart-my-events.png) |
| Accessible map catalogue coverage; nearby targets are clustered | [Complete catalogue](screenshots/commercial-ai/16-complete-catalogue-map.png), [Unknown neighbourhood](screenshots/commercial-ai/17-unknown-neighbourhood-map.png) |
| Pending payment and later confirmation | [Pending retry](screenshots/commercial-ai/18-pending-payment-retry.png), [Confirmed after payment](screenshots/commercial-ai/19-pending-payment-confirmed.png) |
| Mobile map, preserved Demo and assistant | [Clustered mobile map](screenshots/commercial-ai/21-mobile-clustered-map.png), [Demo iframe](screenshots/commercial-ai/22-demo-iframe.png), [Mobile assistant](screenshots/commercial-ai/23-mobile-assistant.png) |
| Pinned header and reachable controls | [Desktop header](screenshots/commercial-ai/24-desktop-pinned-header.png), [Map preview](screenshots/commercial-ai/25-pinned-map-preview.png), [Mobile assistant](screenshots/commercial-ai/26-mobile-pinned-assistant.png) |

## Fixture limits

The browser used injected Stripe SDK/hosted-Checkout fixtures with real application checkout, confirm, and signed-webhook routes. It did not contact Stripe or move money. No live Stripe or AI-provider credentials were used; configured provider success/failover belongs to automated fixtures, while the browser assistant exercised the synthetic fallback.

Directions verified the intended external target and analytics through a fixture that blocked external navigation. The map is illustrative; no route, travel-time, or third-party maps-service accuracy was verified. Aggregate counts are prototype event actions, not unique-person reach or guaranteed attendance. The public group-chat UI remains a browser prototype.

## Configuration for a separate live-provider/sandbox check

- Default storage is git-ignored `apps/api/.data/runtime.json`. `THIRDPLACE_DATA_FILE=:memory:` discards state; hosting needs a durable disk and a stable data path for restart recovery. Atomic JSON supports one API process.
- Ownership uses synthetic demo identities, not production authentication. Business-management/order endpoints need real access control before production use.
- Hosted sandbox Checkout needs only server-side `STRIPE_SECRET_KEY=sk_test_...`. Signed webhooks additionally need `STRIPE_WEBHOOK_SECRET`; use the public web URL for `WEB_BASE_URL` and the existing portal path for `BUSINESS_PORTAL_PATH`. Live keys are refused.
- OpenClaw is optional: set server-only `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN`; the API calls `/v1/chat/completions` with `openclaw/default`.
- OpenRouter is optional: set server-only `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Provider order remains OpenClaw → OpenRouter → labelled synthetic fallback.
- Keep credentials in ignored local environment files or host secret settings. ThirdPlace does not persist assistant mood/conversation text; configured external providers receive supported request context under their own retention policies.

See [API contract](API-CONTRACT.md), [business setup](../apps/web/src/features/business/README.md), and [deployment notes](../infra/README.md) for the full contracts and setup.
