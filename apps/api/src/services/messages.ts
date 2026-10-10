import type { PublicEventMessage } from "../models/domain.js";

const messages: PublicEventMessage[] = [];
export const listPublicMessages = (eventId: string) => messages.filter((message) => message.eventId === eventId);
export function addPublicMessage(eventId: string, authorId: string, body: string): PublicEventMessage {
  const message = { id: `message-${messages.length + 1}`, eventId, authorId, body, createdAt: new Date().toISOString() };
  messages.push(message);
  return message;
}
