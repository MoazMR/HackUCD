import { Router } from "express";
import { addEndorsement, addReport, moderationFor } from "../services/moderation.js";
export const endorsementsRouter = Router();
export const reportsRouter = Router();
endorsementsRouter.post("/", (request, response) => {
  const { authorId, subjectId, eventId } = request.body as Record<string, unknown>;
  if (![authorId, subjectId, eventId].every((value) => typeof value === "string" && value.trim())) return response.status(400).json({ error: "authorId, subjectId, and eventId are required" });
  if (authorId === subjectId) return response.status(400).json({ error: "You cannot endorse yourself" });
  return response.status(201).json({ endorsement: addEndorsement(authorId as string, subjectId as string, eventId as string) });
});
reportsRouter.post("/", (request, response) => {
  const { reporterId, subjectId, reason, eventId } = request.body as Record<string, unknown>;
  if (![reporterId, subjectId, reason].every((value) => typeof value === "string" && value.trim())) return response.status(400).json({ error: "reporterId, subjectId, and reason are required" });
  if (reporterId === subjectId) return response.status(400).json({ error: "You cannot report yourself" });
  return response.status(201).json(addReport(reporterId as string, subjectId as string, reason as string, typeof eventId === "string" ? eventId : undefined));
});
reportsRouter.get("/:subjectId/status", (request, response) => response.json({ moderation: moderationFor(request.params.subjectId) }));
