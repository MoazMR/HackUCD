# Deployment

Deploy `apps/web` as a static Vite site and `apps/api` as a Node service. The browser uses relative `/api` URLs, so route that path from the web origin to the API, or use the combined service below. The integration lead owns deployment settings and environment variables.

The prototype starts without external credentials. The API-backed catalogue includes synthetic neighbourhood events; profiles, created events, sandbox orders, promotions, and aggregate analytics use the git-ignored `apps/api/.data/runtime.json` file. `THIRDPLACE_DATA_FILE=:memory:` selects disposable storage. A database or maps vendor is not required for local development.

## Fastest route: one service on Render

`render.yaml` in the repository root describes one free web service that builds the web app and the API together. In production the API also serves the built web app, so the site and `/api` share one address and no proxy setting is needed.

1. Sign in at render.com with a GitHub account that can see this repository.
2. New > Blueprint, choose this repository, and accept the `thirdplace` service.
3. Set optional provider credentials in Render's secret settings: `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for the planner/OpenRouter guide, or a Stripe test-mode `STRIPE_SECRET_KEY` for hosted checkout. Leave unused settings blank. Set `WEB_BASE_URL` to the deployed public URL before testing a Stripe return.
4. Wait for the first build. The address is shown at the top of the service page, in the form `https://thirdplace-xxxx.onrender.com`.

The free service can sleep when idle, so open it shortly before a demo. The supplied free blueprint has no persistent disk: writing JSON on its ephemeral filesystem does not guarantee survival across deploys or instance replacement. For recoverable sandbox orders and promotions, mount durable storage and set `THIRDPLACE_DATA_FILE` to an absolute path on that mount. Use one API process for this prototype; multiple instances must use a transactional shared database. Each push to `main` redeploys.

## Business portal and Stripe (Cahal)

The web build has two pages: the app (`index.html`) and the business portal (`src/features/business/portal.html`, linked as "For businesses" in the top bar). Serve the whole `apps/web/dist` folder so both paths resolve; don't rewrite every path to `index.html`.

API environment variables for the deployed service (set them in the host's secret settings, never in the repo):

| Variable | Needed | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | for checkout | Stripe **test-mode** secret key (`sk_test_...`). Live keys are refused. |
| `STRIPE_WEBHOOK_SECRET` | for webhooks | Signing secret of a Stripe test-mode webhook endpoint pointing at `https://<api-host>/api/payments/webhook`, listening to `checkout.session.completed` and `checkout.session.expired`. A success return can instead verify the session server-side. |
| `WEB_BASE_URL` | yes, in production | Public URL of the web app, e.g. `https://thirdplace.example`. Stripe returns the buyer here after checkout. |
| `BUSINESS_PORTAL_PATH` | no | Defaults to `/src/features/business/portal.html`. |
| `THIRDPLACE_DATA_FILE` | for durable hosting | Absolute runtime JSON path on a persistent disk; `:memory:` for disposable runs. |

Without `STRIPE_SECRET_KEY` the portal still loads and shows that checkout is switched off. Browsing, joining, ordinary-user creation, and the synthetic assistant need no payment configuration. Business events remain drafts until a signed test webhook or server-retrieved Checkout Session verifies payment; cancellation does not publish them. Live Stripe credentials are refused. The JSON boundary and demo identity are appropriate for sandbox demonstrations only.

## OpenClaw outing guide

Run an OpenClaw Gateway with its OpenAI-compatible chat-completions endpoint enabled, then set `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` on the API service. For a local gateway the URL is `http://127.0.0.1:18789`; the API posts to `/v1/chat/completions` with model `openclaw/default`. Keep the Gateway on a private network; never expose its operator token to the browser. Configure the OpenClaw default model with OpenRouter if desired.

The guide tries OpenClaw, then configured OpenRouter, then a labelled rule-based fallback. It sends the current conversation and public-safe eligible catalogue context to a configured provider. ThirdPlace does not persist mood text, but the external provider's retention policy still applies. The guide has no publishing, checkout, identity-document, or private-message tools.

## Verification

Run `npm ci --include=dev`, `npm run typecheck`, `npm test`, and `npm run build` before deployment. Automated payment tests use locally signed webhook fixtures and mocked Stripe SDK calls; they do not contact Stripe or require credentials. They bind temporary localhost ports and run with disposable or isolated temporary storage. Hosted Stripe test Checkout and live OpenClaw/OpenRouter responses require separate manual verification when those integrations are configured.
