import type { AssistantMessage } from "@social-outings/shared";
import { Router } from "express";
import { askAssistant, assistantStatus } from "../services/assistant.js";

export const assistantRouter = Router();
assistantRouter.get("/status", (_request, response) => response.json(assistantStatus()));
assistantRouter.post("/", async (request, response) => {
  const raw = request.body?.messages;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) return response.status(400).json({ error: "Send between 1 and 12 conversation messages." });
  const messages: AssistantMessage[] = raw.map((message: unknown) => {
    const item = message as Record<string, unknown>;
    return { role: item.role as AssistantMessage["role"], content: typeof item.content === "string" ? item.content.trim() : "" };
  });
  if (messages.some((message) => !["user", "assistant"].includes(message.role) || !message.content || message.content.length > 800)) {
    return response.status(400).json({ error: "Each message needs a valid role and 1–800 characters." });
  }
  const userId = typeof request.body?.userId === "string" ? request.body.userId : "me";
  const conversationId = typeof request.body?.conversationId === "string" ? request.body.conversationId.slice(0, 100) : "web";
  return response.json(await askAssistant(messages, userId, conversationId));
});
