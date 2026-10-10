import { Router, type Request, type Response } from "express";
import type Stripe from "stripe";
import {
  activateFromPaidSession,
  attachCheckoutSession,
  closeOrder,
  createPendingOrder,
  findOrder,
  findOrderBySession,
  findPendingOrderForEvent,
  isActive,
  PromotionError,
  promotionForOrder,
  toPublicPromotion
} from "../services/promotions.js";
import { getCheckoutSessions, getStripe, PaymentsConfigError, paymentsStatus, portalUrl, webhookSecret } from "../services/stripe.js";

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
    console.error("[payments] Stripe error:", stripeType);
    const message = stripeType === "StripeConnectionError"
      ? "Could not reach Stripe. Check your connection and try again."
      : "Stripe could not process this request. Check payment status before trying again.";
    return response.status(502).json({ error: message, code: "stripe_error" });
  }
  console.error("[payments] Unexpected payment failure");
  return response.status(500).json({ error: "Something went wrong. Check payment status before trying again.", code: "server_error" });
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
    const sessions = getCheckoutSessions(); // fail fast on missing config before recording an order
    const userId = request.header("x-user-id")?.trim().slice(0, 80) || undefined;
    const input = request.body ?? {};
    let pending;
    try {
      pending = createPendingOrder(input, new Date(), userId);
    } catch (error) {
      if (!(error instanceof PromotionError) || error.code !== "checkout_pending") throw error;
      const previous = findPendingOrderForEvent(input.eventId);
      const deadline = previous && new Date(previous.checkoutExpiresAt ?? new Date(Date.parse(previous.createdAt) + 30 * 60 * 1000)).getTime();
      if (!previous || !deadline || deadline > Date.now()) throw error;
      // A deadline alone does not prove an old checkout was unpaid: reconcile it before
      // issuing a second chargeable session, including delayed webhook delivery.
      if (previous.stripeCheckoutSessionId) {
        let priorSession = await sessions.retrieve(previous.stripeCheckoutSessionId);
        sessionOrder(priorSession);
        if (priorSession.payment_status !== "paid" && priorSession.status !== "expired") {
          try {
            priorSession = await sessions.expire(previous.stripeCheckoutSessionId);
          } catch {
            priorSession = await sessions.retrieve(previous.stripeCheckoutSessionId);
          }
          sessionOrder(priorSession);
        }
        if (priorSession.payment_status === "paid") {
          activateFromPaidSession(sessionFacts(priorSession), "success-return");
        } else if (priorSession.status === "expired") {
          closeOrder(previous.id, "expired");
        } else throw error;
      } else closeOrder(previous.id, "expired");
      pending = createPendingOrder(input, new Date(), userId);
    }
    const { order, plan, event } = pending;
    orderId = order.id;

    const session = await sessions.create({
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

    if (session.livemode || !/^cs_test_[A-Za-z0-9_]+$/.test(session.id)) {
      throw new PromotionError("Only Stripe sandbox checkout sessions are supported.", 400, "live_payment_refused");
    }
    attachCheckoutSession(order.id, session.id, session.expires_at);
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
      return response.json({ status: isActive(knownPromotion) ? "active" : "expired", order: known, promotion: toPublicPromotion(knownPromotion) });
    }

    const session = await getCheckoutSessions().retrieve(sessionId);
    const order = sessionOrder(session);
    if (session.livemode) throw new PromotionError("Only Stripe sandbox checkout sessions are supported.", 400, "live_payment_refused");
    if (session.payment_status !== "paid") {
      if (session.status === "expired") closeOrder(order.id, "expired");
      return response.status(202).json({
        status: session.status === "expired" ? "expired" : "pending",
        order
      });
    }

    const result = activateFromPaidSession(sessionFacts(session), "success-return");
    return response.json({ status: "active", order: result.order, promotion: toPublicPromotion(result.promotion) });
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
      const sessions = getCheckoutSessions();
      try {
        await sessions.expire(order.stripeCheckoutSessionId);
      } catch (error) {
        // A completed session cannot be expired. Reconcile an already-paid checkout instead
        // of claiming it was cancelled or leaving a verified payment without its promotion.
        const session = await sessions.retrieve(order.stripeCheckoutSessionId);
        sessionOrder(session);
        if (session.payment_status === "paid") {
          return response.json({ order: activateFromPaidSession(sessionFacts(session), "success-return").order });
        }
        if (session.status !== "expired") throw error;
      }
    } catch (error) {
      // Keep a retryable pending order if cancellation could not be verified with Stripe.
      return sendError(response, error);
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
    currency: session.currency,
    sessionStatus: session.status,
    livemode: session.livemode
  };
}

/** Bind every retrieved or webhook session to the persisted checkout before changing its state. */
function sessionOrder(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  const order = orderId ? findOrder(orderId) : findOrderBySession(session.id);
  if (!order) throw new PromotionError("No order matches this checkout session.", 404, "order_not_found");
  if (order.stripeCheckoutSessionId !== session.id) {
    throw new PromotionError("Checkout session does not belong to this order.", 409, "session_mismatch");
  }
  return order;
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

  if (event.livemode) {
    return response.status(400).json({ error: "Only Stripe sandbox webhooks are supported.", code: "live_payment_refused" });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      if (session.payment_status === "paid") activateFromPaidSession(sessionFacts(session), "webhook");
    } else if (event.type === "checkout.session.expired") {
      closeOrder(sessionOrder(event.data.object).id, "expired");
    }
  } catch (error) {
    // Acknowledge anyway for unknown orders (e.g. after an API restart) so Stripe stops retrying;
    // log it so the mismatch is visible.
    if (!(error instanceof PromotionError)) return sendError(response, error);
    console.warn("[payments] Webhook not applied:", error.code, error.message);
  }
  return response.json({ received: true });
}
