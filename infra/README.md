# Deployment

Deploy `apps/web` as a static Vite site and `apps/api` as a Node service. Set the web app's API proxy/base URL to the deployed API. The integration lead owns deployment settings and production environment variables.

Before choosing a database or maps provider, keep the product working with the current in-memory sample data. This prevents vendor configuration from blocking UI work.

## Business portal and Stripe (Cahal)

The web build has two pages: the app (`index.html`) and the business portal (`src/features/business/portal.html`, linked as "For businesses" in the top bar). Serve the whole `apps/web/dist` folder so both paths resolve; don't rewrite every path to `index.html`.

API environment variables for the deployed service (set them in the host's secret settings, never in the repo):

| Variable | Needed | Value |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | for checkout | Stripe **test-mode** secret key (`sk_test_...`). Live keys are refused. |
| `STRIPE_WEBHOOK_SECRET` | optional | Signing secret of a Stripe test-mode webhook endpoint pointing at `https://<api-host>/api/payments/webhook`, listening to `checkout.session.completed` and `checkout.session.expired`. |
| `WEB_BASE_URL` | yes, in production | Public URL of the web app, e.g. `https://thirdplace.example`. Stripe returns the buyer here after checkout. |
| `BUSINESS_PORTAL_PATH` | no | Defaults to `/src/features/business/portal.html`. |

Without `STRIPE_SECRET_KEY` the portal still loads and shows that checkout is switched off; everything else in ThirdPlace works without payments. Orders and promotions are in memory and reset when the API restarts.
