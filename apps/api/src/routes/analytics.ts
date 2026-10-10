import { Router } from "express";
import { businessAnalytics, eventAnalytics, recordMetric, type PromotionAction } from "../services/analytics.js";

export const analyticsRouter = Router();
const actions: PromotionAction[] = ["impression", "detail_view", "join", "directions"];

analyticsRouter.post("/events/:id", (request, response) => {
  const action = request.body?.action as PromotionAction;
  if (!actions.includes(action)) return response.status(400).json({ error: "Unknown analytics action." });
  const metric = recordMetric(request.params.id, action);
  return metric ? response.status(202).json({ recorded: true }) : response.status(404).json({ error: "Event not found." });
});

analyticsRouter.get("/events/:id", (request, response) => response.json({ analytics: eventAnalytics(request.params.id) }));
analyticsRouter.get("/business", (request, response) => {
  const businessName = typeof request.query.businessName === "string" ? request.query.businessName.trim() : "";
  if (!businessName) return response.status(400).json({ error: "businessName is required." });
  return response.json({ analytics: businessAnalytics(businessName) });
});
