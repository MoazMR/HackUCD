import type { EventCategory, EventPlanRequest } from "@social-outings/shared";
import { Router } from "express";
import { generateEventPlan } from "../services/eventPlanner.js";

export const eventPlansRouter = Router();
const categories: EventCategory[] = ["food", "sport", "music", "social", "other"];

eventPlansRouter.post("/", async (request, response) => {
  const input = request.body as Partial<EventPlanRequest>;
  if (typeof input.goal !== "string" || !input.goal.trim() || input.goal.length > 160
    || typeof input.area !== "string" || !input.area.trim() || input.area.length > 100
    || typeof input.date !== "string" || !input.date.trim() || Number.isNaN(Date.parse(input.date))
    || typeof input.category !== "string" || !categories.includes(input.category as EventCategory)
    || (input.attendeeCount !== undefined && (!Number.isInteger(input.attendeeCount) || input.attendeeCount < 2 || input.attendeeCount > 100))
    || (input.budget !== undefined && (typeof input.budget !== "string" || input.budget.length > 80))) {
    return response.status(400).json({ error: "goal, area, valid date, category, and an optional attendeeCount from 2 to 100 are required" });
  }

  try {
    return response.json(await generateEventPlan({
      goal: input.goal.trim(), area: input.area.trim(), date: input.date,
      category: input.category as EventCategory, attendeeCount: input.attendeeCount,
      budget: input.budget?.trim()
    }));
  } catch {
    return response.status(502).json({ error: "The event planner is temporarily unavailable. Try again or continue without an AI-generated plan." });
  }
});
