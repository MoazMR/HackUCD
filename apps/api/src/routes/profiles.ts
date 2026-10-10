import { Router } from "express";
import { getProfile, updatePreferences } from "../services/profiles.js";
import { mockVerificationProvider } from "../services/verification.js";

export const profilesRouter = Router();
profilesRouter.get("/:id", (request, response) => {
  const profile = getProfile(request.params.id);
  return profile ? response.json({ profile }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.put("/:id/preferences", (request, response) => {
  const { interests, travelRadiusKm } = request.body as { interests?: unknown; travelRadiusKm?: unknown };
  if (!Array.isArray(interests) || !interests.every((interest) => typeof interest === "string") || typeof travelRadiusKm !== "number" || !Number.isFinite(travelRadiusKm) || travelRadiusKm <= 0 || travelRadiusKm > 100) return response.status(400).json({ error: "interests must be strings and travelRadiusKm must be between 0 and 100" });
  const profile = updatePreferences(request.params.id, { interests, travelRadiusKm });
  return profile ? response.json({ profile }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.get("/:id/verification", (request, response) => {
  const profile = getProfile(request.params.id);
  return profile ? response.json({ profileId: profile.id, status: profile.verificationStatus, provider: "mock" }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.post("/:id/verification", (request, response) => {
  const profile = getProfile(request.params.id);
  const desiredStatus = (request.body as { status?: unknown }).status;
  if (!profile) return response.status(404).json({ error: "Profile not found" });
  if (desiredStatus !== undefined && !["unverified", "pending", "verified", "failed"].includes(String(desiredStatus))) return response.status(400).json({ error: "status must be unverified, pending, verified, or failed" });
  profile.verificationStatus = mockVerificationProvider.requestStatus(profile.id, desiredStatus as typeof profile.verificationStatus | undefined);
  return response.json({ profileId: profile.id, status: profile.verificationStatus, provider: "mock" });
});
