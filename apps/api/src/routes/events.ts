import { Router } from "express";
import type { EventCategory } from "@social-outings/shared";
import { createEvent, getEvent, joinEvent, leaveEvent, listEventMemberships, listEvents, toPublicEvent } from "../services/events.js";
import { addPublicMessage, listPublicMessages } from "../services/messages.js";
import { recordMetric } from "../services/analytics.js";
import { syncExpiredPaidFlags } from "../services/promotions.js";

export const eventsRouter = Router();
// x-user-id is prototype attribution, not an authentication boundary.
const viewerId = (request: { header(name: string): string | undefined }) => request.header("x-user-id")?.trim().slice(0, 80) || "demo-user";
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
  if ((latitude !== undefined && latitude !== "invalid" && (latitude < -90 || latitude > 90)) || (longitude !== undefined && longitude !== "invalid" && (longitude < -180 || longitude > 180)) || (category && !categories.includes(category as EventCategory)) || paid === "invalid" || latitude === "invalid" || longitude === "invalid" || distanceKm === "invalid" || (distanceKm !== undefined && (latitude === undefined || longitude === undefined || distanceKm < 0))) return response.status(400).json({ error: "Invalid event filters. distanceKm requires latitude and longitude." });
  syncExpiredPaidFlags();
  return response.json({ events: listEvents({ category: category as EventCategory | undefined, location: typeof request.query.location === "string" ? request.query.location : undefined, latitude, longitude, distanceKm, paid }).map(toPublicEvent) });
});

eventsRouter.get("/mine", (request, response) => {
  syncExpiredPaidFlags();
  return response.json({ memberships: listEventMemberships(viewerId(request)) });
});

eventsRouter.post("/", (request, response) => {
  const body = (request.body ?? {}) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  const locationName = typeof body.locationName === "string" ? body.locationName.trim() : "";
  const interest = typeof body.interest === "string" ? body.interest.trim() : "";
  const area = typeof body.area === "string" ? body.area.trim() : "";
  const category = body.category as EventCategory;
  const latitude = typeof body.latitude === "number" ? body.latitude : NaN;
  const longitude = typeof body.longitude === "number" ? body.longitude : NaN;
  const capacity = body.capacity === undefined ? 20 : typeof body.capacity === "number" ? body.capacity : NaN;
  const priceEur = body.priceEur === undefined ? 0 : typeof body.priceEur === "number" ? body.priceEur : NaN;
  const start = new Date(startsAt);
  if (title.length < 3 || title.length > 80 || description.length < 10 || description.length > 500 || !locationName
    || !interest || interest.length > 40 || !area || !categories.includes(category) || Number.isNaN(start.getTime()) || start <= new Date()
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !Number.isInteger(capacity) || capacity < 2 || capacity > 500 || !Number.isFinite(priceEur) || priceEur < 0 || priceEur > 500) {
    return response.status(422).json({ error: "Provide a valid future event, public area, approximate coordinates, capacity and price." });
  }
  const hostId = viewerId(request);
  const hostName = typeof body.hostName === "string" && body.hostName.trim() ? body.hostName.trim().slice(0, 80) : "Dara L. (demo user)";
  return response.status(201).json({ event: toPublicEvent(createEvent({ title, description, startsAt, locationName, category, interest, area, latitude, longitude, capacity, priceEur, hostId, hostName })) });
});

eventsRouter.post("/:id/attendance", (request, response) => {
  syncExpiredPaidFlags();
  const userId = request.header("x-user-id") ? viewerId(request) : (request.body ?? {}).userId;
  if (typeof userId !== "string" || !userId.trim() || userId.length > 80) return response.status(400).json({ error: "userId is required (up to 80 characters)" });
  const normalizedUserId = userId.trim();
  const event = getEvent(request.params.id);
  if (!event || event.publicationStatus === "draft") return response.status(404).json({ error: "Event not found" });
  if (!event.attendeeIds.includes(normalizedUserId) && (new Date(event.startsAt).getTime() <= Date.now() || event.attendeeCount >= event.capacity)) return response.status(409).json({ error: "This event has started or is full." });
  const result = joinEvent(request.params.id, normalizedUserId);
  if (result?.joined && result.event.isPaidPromotion) recordMetric(request.params.id, "join");
  return result ? response.status(result.joined ? 201 : 200).json({ event: toPublicEvent(result.event), joined: result.joined }) : response.status(404).json({ error: "Event not found" });
});

eventsRouter.delete("/:id/attendance", (request, response) => {
  const result = leaveEvent(request.params.id, viewerId(request));
  return result ? response.json({ event: toPublicEvent(result.event), left: result.left }) : response.status(404).json({ error: "Event not found" });
});

eventsRouter.get("/:id/messages", (request, response) => {
  const event = getEvent(request.params.id);
  if (!event || event.publicationStatus === "draft") return response.status(404).json({ error: "Event not found" });
  return response.json({ messages: listPublicMessages(request.params.id), visibility: "public_event_group" });
});

eventsRouter.post("/:id/messages", (request, response) => {
  const event = getEvent(request.params.id);
  if (!event || event.publicationStatus === "draft") return response.status(404).json({ error: "Event not found" });
  const { authorId, body } = request.body as Record<string, unknown>;
  if (typeof authorId !== "string" || !authorId.trim() || typeof body !== "string" || !body.trim() || body.length > 500) return response.status(400).json({ error: "authorId and a message body of up to 500 characters are required" });
  return response.status(201).json({ message: addPublicMessage(request.params.id, authorId, body.trim()), visibility: "public_event_group" });
});

eventsRouter.get("/:id", (request, response) => {
  syncExpiredPaidFlags();
  const event = getEvent(request.params.id);
  if (!event || event.publicationStatus === "draft") return response.status(404).json({ error: "Event not found" });
  return response.json({ event: toPublicEvent(event) });
});
