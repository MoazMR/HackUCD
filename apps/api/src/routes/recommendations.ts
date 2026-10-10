import { Router } from "express";
import type { EventCategory } from "@social-outings/shared";
import type { RecommendationFilters } from "@social-outings/shared/src/recommendations.mjs";
import { getProfile } from "../services/profiles.js";
import { recommendEvents } from "../services/recommendations.js";
export const recommendationsRouter = Router();
recommendationsRouter.get("/", (request, response) => {
  const userId = typeof request.query.userId === "string" ? request.query.userId : "me";
  const profile = getProfile(userId);
  if (!profile) return response.status(404).json({ error: "Profile not found" });
  const text = (name: string) => typeof request.query[name] === "string" ? request.query[name] as string : undefined;
  const category = text("category") ?? text("type");
  const date = text("date");
  const timeOfDay = text("timeOfDay");
  const customDate = text("customDate");
  if ((category && !["all", "food", "sport", "music", "social", "other"].includes(category))
    || (date && !["any", "today", "tomorrow", "weekend", "custom"].includes(date))
    || (timeOfDay && !["any", "morning", "afternoon", "evening"].includes(timeOfDay))
    || (date === "custom" && !customDate)
    || (customDate && (!/^\d{4}-\d{2}-\d{2}$/.test(customDate) || Number.isNaN(Date.parse(customDate)) || new Date(customDate).toISOString().slice(0, 10) !== customDate))
    || (request.query.includeUnrelated !== undefined && !["true", "false"].includes(text("includeUnrelated") ?? ""))
    || (request.query.freeOnly !== undefined && !["true", "false"].includes(text("freeOnly") ?? ""))) {
    return response.status(400).json({ error: "Invalid recommendation search filters." });
  }
  const filters: RecommendationFilters = {
    query: text("query"), category: category as EventCategory | "all" | undefined, area: text("area"),
    date: date as RecommendationFilters["date"], customDate,
    timeOfDay: timeOfDay as RecommendationFilters["timeOfDay"], freeOnly: text("freeOnly") === "true"
  };
  return response.json({ recommendations: recommendEvents(profile, text("includeUnrelated") === "true", filters), appliedRadiusKm: profile.travelRadiusKm });
});
