import cors from "cors";
import express from "express";
import { businessRouter } from "./routes/business.js";
import { eventsRouter } from "./routes/events.js";
import { paymentsRouter, stripeWebhookHandler } from "./routes/payments.js";
import { promotionsRouter } from "./routes/promotions.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(cors());
// Stripe webhook needs the raw body for signature checks, so it is registered before express.json().
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.use(express.json());
app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
app.use("/api/events", eventsRouter);
app.use("/api/business", businessRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/promotions", promotionsRouter);

app.listen(port, () => console.log(`API listening at http://localhost:${port}`));
