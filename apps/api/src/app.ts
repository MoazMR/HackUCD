import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { businessRouter } from "./routes/business.js";
import { eventPlansRouter } from "./routes/eventPlans.js";
import { eventsRouter } from "./routes/events.js";
import { endorsementsRouter, reportsRouter } from "./routes/moderation.js";
import { paymentsRouter, stripeWebhookHandler } from "./routes/payments.js";
import { profilesRouter } from "./routes/profiles.js";
import { promotionsRouter } from "./routes/promotions.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { analyticsRouter } from "./routes/analytics.js";
import { assistantRouter } from "./routes/assistant.js";

export function createApp() {
  const app = express();
  app.use(cors());
  // Stripe webhook needs the raw body for signature checks, so it is registered before express.json().
  app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "64kb" }), stripeWebhookHandler);
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.use("/api/events", eventsRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/recommendations", recommendationsRouter);
  app.use("/api/endorsements", endorsementsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/event-plans", eventPlansRouter);
  app.use("/api/business", businessRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/promotions", promotionsRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/assistant", assistantRouter);
  const requestError: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error?.status === 413) {
      response.status(413).json({ error: "Request body is too large." });
      return;
    }
    if (error?.status === 400) {
      response.status(400).json({ error: "Invalid request body." });
      return;
    }
    console.error("[api] Unexpected request failure");
    response.status(500).json({ error: "The request could not be completed." });
  };
  app.use(requestError);
  return app;
}
