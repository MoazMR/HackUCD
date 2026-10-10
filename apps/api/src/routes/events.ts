import { Router } from "express";
import { getEvent, listEvents } from "../services/events.js";

export const eventsRouter = Router();

eventsRouter.get("/", (_request, response) => {
  response.json({ events: listEvents() });
});

eventsRouter.get("/:id", (request, response) => {
  const event = getEvent(request.params.id);
  if (!event) return response.status(404).json({ error: "Event not found" });
  return response.json({ event });
});
