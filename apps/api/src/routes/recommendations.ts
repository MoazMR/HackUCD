import { Router } from "express";
import { getProfile } from "../services/profiles.js";
import { recommendEvents } from "../services/recommendations.js";
export const recommendationsRouter = Router();
recommendationsRouter.get("/", (request, response) => {
  const userId = typeof request.query.userId === "string" ? request.query.userId : "me";
  const profile = getProfile(userId);
  if (!profile) return response.status(404).json({ error: "Profile not found" });
  return response.json({ recommendations: recommendEvents(profile, request.query.includeUnrelated === "true"), appliedRadiusKm: profile.travelRadiusKm });
});
