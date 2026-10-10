import { Router } from "express";
import { getProfile, updatePreferences, updateVerificationStatus } from "../services/profiles.js";
import { mockVerificationProvider } from "../services/verification.js";
import { coordinatesForArea } from "../services/events.js";

export const profilesRouter = Router();
profilesRouter.get("/:id", (request, response) => {
  const profile = getProfile(request.params.id);
  return profile ? response.json({ profile }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.put("/:id/preferences", (request, response) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const { interests, travelRadiusKm, area } = body;
  if (["coordinates", "latitude", "longitude", "approximateLocation", "address", "exactAddress"].some((field) => field in body)) return response.status(400).json({ error: "Use a supported neighbourhood area name; exact coordinates and addresses are not accepted." });
  if (area !== undefined && (typeof area !== "string" || !coordinatesForArea(area))) return response.status(400).json({ error: "area must be a supported approximate neighbourhood name." });
  if (!Array.isArray(interests) || !interests.every((interest) => typeof interest === "string") || typeof travelRadiusKm !== "number" || !Number.isFinite(travelRadiusKm) || travelRadiusKm <= 0 || travelRadiusKm > 100) return response.status(400).json({ error: "interests must be strings and travelRadiusKm must be between 0 and 100" });
  const profile = updatePreferences(request.params.id, { interests, travelRadiusKm, area: area as string | undefined });
  return profile ? response.json({ profile }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.get("/:id/verification", (request, response) => {
  const profile = getProfile(request.params.id);
  return profile ? response.json({ profileId: profile.id, status: profile.verificationStatus, provider: "mock" }) : response.status(404).json({ error: "Profile not found" });
});
profilesRouter.post("/:id/verification", (request, response) => {
  const profile = getProfile(request.params.id);
  const body = (request.body ?? {}) as Record<string, unknown>;
  const desiredStatus = body.status;
  if (!profile) return response.status(404).json({ error: "Profile not found" });
  if (Array.isArray(body) || Object.keys(body).some((field) => field !== "status")) return response.status(400).json({ error: "Mock verification accepts a status only; identity documents are not accepted." });
  if (desiredStatus !== undefined && (typeof desiredStatus !== "string" || !["unverified", "pending", "verified", "failed"].includes(desiredStatus))) return response.status(400).json({ error: "status must be unverified, pending, verified, or failed" });
  updateVerificationStatus(profile.id, mockVerificationProvider.requestStatus(profile.id, desiredStatus as typeof profile.verificationStatus | undefined));
  return response.json({ profileId: profile.id, status: profile.verificationStatus, provider: "mock" });
});
