import Stripe from "stripe";

// apps/api/.env is loaded by `dotenv/config` in server.ts. Variables are read lazily so tests can set them.

export class PaymentsConfigError extends Error {}

const DEFAULT_WEB_BASE_URL = "http://localhost:5173";
// The business portal is a separate page inside the business feature folder.
// Override with BUSINESS_PORTAL_PATH once the portal is routed from the main app.
const DEFAULT_PORTAL_PATH = "/src/features/business/portal.html";

let client: Stripe | undefined;
let clientKey: string | undefined;
type CheckoutSessions = Pick<Stripe["checkout"]["sessions"], "create" | "retrieve" | "expire">;
let testCheckoutSessions: CheckoutSessions | undefined;

/** Inject only the network boundary in local tests; key validation and webhook signatures stay real. */
export function setCheckoutSessionsForTesting(sessions?: CheckoutSessions): void {
  testCheckoutSessions = sessions;
}

export function getCheckoutSessions(): CheckoutSessions {
  const stripe = getStripe();
  return testCheckoutSessions ?? stripe.checkout.sessions;
}

/** Hackathon rule: Stripe sandbox only. Live keys are refused, not just discouraged. */
function readTestSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new PaymentsConfigError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY=sk_test_... to apps/api/.env and restart the API."
    );
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("rk_test_")) {
    throw new PaymentsConfigError("ThirdPlace only accepts Stripe test-mode keys (sk_test_ or rk_test_). No live payments.");
  }
  return key;
}

export function getStripe(): Stripe {
  // Revalidate every use: a cached test client must not hide a later missing/live key.
  const key = readTestSecretKey();
  if (!client || clientKey !== key) {
    client = new Stripe(key, { timeout: 10_000, maxNetworkRetries: 1 });
    clientKey = key;
  }
  return client;
}

export function paymentsStatus() {
  try {
    readTestSecretKey();
    return { stripeConfigured: true, webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET), mode: "test" as const };
  } catch (error) {
    return {
      stripeConfigured: false,
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      mode: "test" as const,
      message: (error as Error).message
    };
  }
}

export function portalUrl(query: string): string {
  const base = (process.env.WEB_BASE_URL ?? DEFAULT_WEB_BASE_URL).replace(/\/$/, "");
  const path = process.env.BUSINESS_PORTAL_PATH ?? DEFAULT_PORTAL_PATH;
  return `${base}${path}?${query}`;
}

export function webhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}
