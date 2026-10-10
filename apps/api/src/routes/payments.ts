import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import {
  activateFromPaidSession,
  attachCheckoutSession,
  closeOrder,
  createPendingOrder,
  findOrder,
  findOrderBySession,
  PromotionError,
  promotionForOrder
} from "../services/promotions.js";
import { getStripe, PaymentsConfigError, paymentsStatus, portalUrl, webhookSecret } from "../services/stripe.js";

export const paymentsRouter = Router();

function sendError(response: Response, error: unknown) {
  if (error instanceof PromotionError) {
    return response.status(error.status).json({ error: error.message, code: error.code });
  }
  if (error instanceof PaymentsConfigError) {
    return response.status(503).json({ error: error.message, code: "payments_not_configured" });
  }
  const stripeType = (error as { type?: string }).type;
  if (stripeType?.startsWith("Stripe")) {
    console.error("[payments] Stripe error:", stripeType, (error as Error).message);
    const message = stripeType === "StripeConnectionError"
      ? "Could not reach Stripe. Check your connection and try again."
      : "Stripe could not process this request. No payment was taken.";
    return response.status(502).json({ error: message, code: "stripe_error" });
  }
  console.error("[payments] Unexpected error:", error);
  return response.status(500).json({ error: "Something went wrong. No payment was taken.", code: "server_error" });
}

paymentsRouter.get("/status", (_request, response) => {
  response.json(paymentsStatus());
});

/**
 * Creates a Stripe-hosted Checkout Session (sandbox) for a promotion plan.
 * Body: { planId, eventId, buyer: { type: "business", name } | { type: "user" } }
 */
paymentsRouter.post("/checkout", async (request, response) => {
  let orderId: string | undefined;
  try {
    const stripe = getStripe(); // fail fast on missing config before recording an order
    const { order, plan, event } = createPendingOrder(request.body ?? {});
    orderId = order.id;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      metadata: { orderId: order.id, eventId: event.id, planId: plan.id },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.amountCents,
            product_data: {
              name: `ThirdPlace ${plan.name}: ${event.title}`,
              description: `${plan.durationDays}-day promotion (or until the event starts). One-time payment.`
            }
          }
        }
      ],
      success_url: portalUrl("checkout=success&session_id={CHECKOUT_SESSION_ID}"),
      cancel_url: portalUrl(`checkout=cancelled&order=${encodeURIComponent(order.id)}`),
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60
    });

    attachCheckoutSession(order.id, session.id);
    return response.status(201).json({ orderId: order.id, checkoutUrl: session.url });
  } catch (error) {
    if (orderId) closeOrder(orderId, "failed");
    return sendError(response, error);
  }
});

/** Called by the portal on the success return. Verifies with Stripe server-side before activating. */
paymentsRouter.get("/confirm", async (request, response) => {
  const sessionId = typeof request.query.session_id === "string" ? request.query.session_id : "";
  if (!/^cs_test_[A-Za-z0-9_]+$/.test(sessionId)) {
    return response.status(400).json({ error: "Missing or invalid test checkout session id.", code: "invalid_session" });
  }

  try {
    // If the webhook already activated this order, answer from our records.
    const known = findOrderBySession(sessionId);
    const knownPromotion = known && promotionForOrder(known.id);
    if (known?.status === "paid" && knownPromotion) {
      return response.json({ status: "active", order: known, promotion: knownPromotion });
    }

    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      const orderIdFromSession = session.metadata?.orderId;
      if (session.status === "expired" && orderIdFromSession) closeOrder(orderIdFromSession, "expired");
      return response.status(202).json({
        status: session.status === "expired" ? "expired" : "pending",
        order: orderIdFromSession ? findOrder(orderIdFromSession) : undefined
      });
    }

    const result = activateFromPaidSession(sessionFacts(session), "success-return");
    return response.json({ status: "active", order: result.order, promotion: result.promotion });
  } catch (error) {
    return sendError(response, error);
  }
});

/** Called by the portal on the cancel return. Closes the order and expires the unused session. */
paymentsRouter.post("/cancel", async (request, response) => {
  const orderId = typeof request.body?.orderId === "string" ? request.body.orderId : "";
  const order = findOrder(orderId);
  if (!order) return response.status(404).json({ error: "Order not found.", code: "order_not_found" });
  if (order.status !== "pending") return response.json({ order }); // already paid/closed: nothing to undo

  if (order.stripeCheckoutSessionId) {
    try {
      await getStripe().checkout.sessions.expire(order.stripeCheckoutSessionId);
    } catch (error) {
      // Not fatal: an unexpired session simply times out after 30 minutes.
      console.warn("[payments] Could not expire session", order.stripeCheckoutSessionId, (error as Error).message);
    }
  }
  return response.json({ order: closeOrder(order.id, "cancelled") });
});

function sessionFacts(session: Stripe.Checkout.Session) {
  return {
    sessionId: session.id,
    orderId: session.metadata?.orderId ?? session.client_reference_id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency
  };
}

/**
 * Stripe webhook. Mounted in server.ts BEFORE express.json() because signature
 * verification needs the raw request body.
 */
export async function stripeWebhookHandler(request: Request, response: Response) {
  const secret = webhookSecret();
  if (!secret) {
    return response.status(503).json({ error: "Webhook not configured (set STRIPE_WEBHOOK_SECRET).", code: "webhook_not_configured" });
  }
  const signature = request.header("stripe-signature");
  if (!signature || !Buffer.isBuffer(request.body)) {
    return response.status(400).json({ error: "Missing Stripe signature or raw body.", code: "bad_webhook" });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(request.body, signature, secret);
  } catch (error) {
    if (error instanceof PaymentsConfigError) return sendError(response, error);
    return response.status(400).json({ error: "Webhook signature verification failed.", code: "bad_signature" });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      if (session.payment_status === "paid") activateFromPaidSession(sessionFacts(session), "webhook");
    } else if (event.type === "checkout.session.expired") {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) closeOrder(orderId, "expired");
    }
  } catch (error) {
    // Acknowledge anyway for unknown orders (e.g. after an API restart) so Stripe stops retrying;
    // log it so the mismatch is visible.
    if (!(error instanceof PromotionError)) return sendError(response, error);
    console.warn("[payments] Webhook not applied:", error.code, error.message);
  }
  return response.json({ received: true });
}
