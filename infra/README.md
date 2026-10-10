# Deployment

Deploy `apps/web` as a static Vite site and `apps/api` as a Node service. Set the web app's API proxy/base URL to the deployed API. The integration lead owns deployment settings and production environment variables.

Before choosing a database or maps provider, keep the product working with the current in-memory sample data. This prevents vendor configuration from blocking UI work.

## Fastest route: one service on Render

`render.yaml` in the repository root describes one free web service that builds the web app and the API together. In production the API also serves the built web app, so the site and `/api` share one address and no proxy setting is needed.

1. Sign in at render.com with a GitHub account that can see this repository.
2. New > Blueprint, choose this repository, and accept the `thirdplace` service.
3. When asked, paste `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` and (optionally) a Stripe test-mode `STRIPE_SECRET_KEY`. Leave any you don't have blank.
4. Wait for the first build. The address is shown at the top of the service page, in the form `https://thirdplace-xxxx.onrender.com`.

Things to know: the free plan sleeps after about 15 minutes without visitors and takes up to a minute to wake, so open the site shortly before a demo. Events, orders and promotions are held in memory and reset whenever the service restarts or wakes. Each push to `main` redeploys.

## Business portal and Stripe (Cahal)

The web build has two pages: the app (`index.html`) and the business portal (`src/features/business/portal.html`, linked as "For businesses" in the top bar). Serve the whole `apps/web/dist` folder so both paths resolve; don't rewrite every path to `index.html`.

API environment variables for the deployed service (set them in the host's secret settings, never in the repo):

| Variable | Needed | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | for checkout | Stripe **test-mode** secret key (`sk_test_...`). Live keys are refused. |
| `STRIPE_WEBHOOK_SECRET` | optional | Signing secret of a Stripe test-mode webhook endpoint pointing at `https://<api-host>/api/payments/webhook`, listening to `checkout.session.completed` and `checkout.session.expired`. |
| `WEB_BASE_URL` | yes, in production | Public URL of the web app, e.g. `https://thirdplace.example`. Stripe returns the buyer here after checkout. |
| `BUSINESS_PORTAL_PATH` | no | Defaults to `/src/features/business/portal.html`. |

Without `STRIPE_SECRET_KEY` the portal still loads and shows that checkout is switched off; everything else in ThirdPlace works without payments. Mount persistent storage for `apps/api/.data` or set `THIRDPLACE_DATA_FILE` to a durable path. The JSON boundary is appropriate for the demo only; use a transactional database before accepting live payments.

## OpenClaw outing guide

Run an OpenClaw Gateway with its OpenAI-compatible chat-completions endpoint enabled, then set `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN` on the API service. Keep the Gateway on a private network; never expose its operator token to the browser. Configure the OpenClaw default model with OpenRouter if desired. ThirdPlace sends only the current conversation plus a public-safe, radius-filtered event catalogue. It does not persist mood text.
