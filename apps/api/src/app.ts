import cors from "cors";
import express from "express";
import { eventPlansRouter } from "./routes/eventPlans.js";
import { eventsRouter } from "./routes/events.js";
import { endorsementsRouter, reportsRouter } from "./routes/moderation.js";
import { profilesRouter } from "./routes/profiles.js";
import { recommendationsRouter } from "./routes/recommendations.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));
  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.use("/api/events", eventsRouter);
  app.use("/api/profiles", profilesRouter);
  app.use("/api/recommendations", recommendationsRouter);
  app.use("/api/endorsements", endorsementsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/event-plans", eventPlansRouter);
  return app;
}
