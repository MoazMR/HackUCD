import { Router } from "express";
import { businessAnalytics, eventAnalytics, isPromotionAction, recordMetric } from "../services/analytics.js";
import { getEvent } from "../services/events.js";

export const analyticsRouter = Router();

analyticsRouter.post("/events/:id", (request, response) => {
  const action = request.body?.action;
  if (!isPromotionAction(action)) return response.status(400).json({ error: "Unknown analytics action." });
  const metric = recordMetric(request.params.id, action);
  return metric ? response.status(202).json({ recorded: true }) : response.status(404).json({ error: "Event not found." });
});

analyticsRouter.get("/events/:id", (request, response) => {
  if (!getEvent(request.params.id)) return response.status(404).json({ error: "Event not found." });
  return response.json({ analytics: eventAnalytics(request.params.id) });
});
analyticsRouter.get("/business", (request, response) => {
  const businessName = typeof request.query.businessName === "string" ? request.query.businessName.trim() : "";
  if (!businessName) return response.status(400).json({ error: "businessName is required." });
  return response.json({ analytics: businessAnalytics(businessName) });
});
