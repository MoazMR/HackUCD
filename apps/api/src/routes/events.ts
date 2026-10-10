import { Router } from "express";
import type { EventCategory } from "@social-outings/shared";
import { getEvent, joinEvent, listEvents } from "../services/events.js";
import { addPublicMessage, listPublicMessages } from "../services/messages.js";

export const eventsRouter = Router();
const categories: EventCategory[] = ["food", "sport", "music", "social", "other"];

function optionalNumber(value: unknown): number | undefined | "invalid" {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) return "invalid";
  const number = Number(value);
  return Number.isFinite(number) ? number : "invalid";
}

eventsRouter.get("/", (request, response) => {
  const category = typeof request.query.type === "string" ? request.query.type : undefined;
  const paid = request.query.paid === undefined ? undefined : request.query.paid === "true" ? true : request.query.paid === "false" ? false : "invalid";
  const latitude = optionalNumber(request.query.latitude);
  const longitude = optionalNumber(request.query.longitude);
  const distanceKm = optionalNumber(request.query.distanceKm);
  if ((category && !categories.includes(category as EventCategory)) || paid === "invalid" || latitude === "invalid" || longitude === "invalid" || distanceKm === "invalid" || (distanceKm !== undefined && (latitude === undefined || longitude === undefined || distanceKm < 0))) return response.status(400).json({ error: "Invalid event filters. distanceKm requires latitude and longitude." });
  return response.json({ events: listEvents({ category: category as EventCategory | undefined, location: typeof request.query.location === "string" ? request.query.location : undefined, latitude, longitude, distanceKm, paid }) });
});

eventsRouter.post("/:id/attendance", (request, response) => {
  const userId = (request.body as { userId?: unknown }).userId;
  if (typeof userId !== "string" || !userId.trim()) return response.status(400).json({ error: "userId is required" });
  const result = joinEvent(request.params.id, userId);
  return result ? response.status(result.joined ? 201 : 200).json(result) : response.status(404).json({ error: "Event not found" });
});

eventsRouter.get("/:id/messages", (request, response) => {
  if (!getEvent(request.params.id)) return response.status(404).json({ error: "Event not found" });
  return response.json({ messages: listPublicMessages(request.params.id), visibility: "public_event_group" });
});

eventsRouter.post("/:id/messages", (request, response) => {
  if (!getEvent(request.params.id)) return response.status(404).json({ error: "Event not found" });
  const { authorId, body } = request.body as Record<string, unknown>;
  if (typeof authorId !== "string" || !authorId.trim() || typeof body !== "string" || !body.trim() || body.length > 500) return response.status(400).json({ error: "authorId and a message body of up to 500 characters are required" });
  return response.status(201).json({ message: addPublicMessage(request.params.id, authorId, body.trim()), visibility: "public_event_group" });
});

eventsRouter.get("/:id", (request, response) => {
  const event = getEvent(request.params.id);
  if (!event) return response.status(404).json({ error: "Event not found" });
  return response.json({ event });
});
