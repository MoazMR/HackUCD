import type { AssistantMessage } from "@social-outings/shared";
import { Router } from "express";
import { askAssistant, assistantStatus } from "../services/assistant.js";
import { getProfile } from "../services/profiles.js";

export const assistantRouter = Router();
assistantRouter.get("/status", (_request, response) => response.json(assistantStatus()));
assistantRouter.post("/", async (request, response) => {
  const raw = request.body?.messages;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) return response.status(400).json({ error: "Send between 1 and 12 conversation messages." });
  const messages: AssistantMessage[] = [];
  for (const message of raw) {
    if (!message || typeof message !== "object" || Array.isArray(message)) return response.status(400).json({ error: "Each message needs a valid role and 1–800 characters." });
    const item = message as Record<string, unknown>;
    const content = typeof item.content === "string" ? item.content.trim() : "";
    if ((item.role !== "user" && item.role !== "assistant") || !content || content.length > 800) return response.status(400).json({ error: "Each message needs a valid role and 1–800 characters." });
    messages.push({ role: item.role, content });
  }
  if (messages.at(-1)?.role !== "user") return response.status(400).json({ error: "The final message must be a user request." });
  const rawUserId = request.body?.userId;
  if (rawUserId !== undefined && (typeof rawUserId !== "string" || !rawUserId.trim() || rawUserId.length > 80)) return response.status(400).json({ error: "userId must contain 1–80 characters." });
  const userId = typeof rawUserId === "string" ? rawUserId.trim() : "me";
  if (!getProfile(userId)) return response.status(404).json({ error: "Assistant profile not found." });
  const rawConversationId = request.body?.conversationId;
  if (rawConversationId !== undefined && (typeof rawConversationId !== "string" || !rawConversationId.trim() || rawConversationId.length > 100)) return response.status(400).json({ error: "conversationId must contain 1–100 characters." });
  const conversationId = typeof rawConversationId === "string" ? rawConversationId.trim() : "web";
  try {
    return response.json(await askAssistant(messages, userId, conversationId));
  } catch {
    return response.status(503).json({ error: "The outing guide is temporarily unavailable." });
  }
});
