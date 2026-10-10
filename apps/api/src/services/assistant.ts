import type { AssistantMessage, AssistantResponse } from "@social-outings/shared";
import { getProfile } from "./profiles.js";
import { recommendEvents } from "./recommendations.js";

type CompletionBody = { choices?: Array<{ message?: { content?: string } }> };
export type AssistantOptions = { fetchImpl?: typeof fetch; openClawUrl?: string; openClawToken?: string; openRouterKey?: string; openRouterModel?: string };

function contextFor(userId: string) {
  const profile = getProfile(userId) ?? getProfile("me")!;
  const recommendations = recommendEvents(profile).slice(0, 8);
  return { profile, recommendations };
}

function systemPrompt(userId: string): string {
  const { profile, recommendations } = contextFor(userId);
  const catalogue = recommendations.map(({ event, distanceKm, explanation }) => ({
    id: event.id, title: event.title, category: event.category, interests: event.interests, startsAt: event.startsAt,
    area: event.area, distanceKm, priceEur: event.priceEur, promoted: event.isPaidPromotion, explanation
  }));
  return [
    "You are the ThirdPlace outing guide. Help the person find a suitable real event from the supplied catalogue or draft a safe public event.",
    "Ask at most one useful follow-up question. Never invent an event, venue, availability or price. Clearly disclose promoted events.",
    "Mood descriptions are temporary context, not diagnoses. Do not make medical claims. Never request exact home locations, contact details, ID documents or private messaging.",
    `The person's interests are ${profile.interests.join(", ")} and their maximum radius is ${profile.travelRadiusKm} km.`,
    `Eligible upcoming catalogue JSON: ${JSON.stringify(catalogue)}`
  ].join("\n");
}

function syntheticReply(userId: string): AssistantResponse {
  const suggestions = contextFor(userId).recommendations.slice(0, 3);
  if (!suggestions.length) return {
    reply: "I couldn't find a relevant upcoming event inside your travel radius. Tell me what you feel like doing and I can help draft a new public event instead.",
    provider: "synthetic", suggestedEventIds: [], notice: "OpenClaw and OpenRouter are not configured, so this is a rule-based response."
  };
  const lines = suggestions.map(({ event, explanation }) => `• ${event.title}: ${explanation}${event.isPaidPromotion ? " It is clearly labelled Promoted." : ""}`);
  return {
    reply: `These look like the best matches right now:\n${lines.join("\n")}\n\nTell me your mood, budget, or preferred time and I’ll narrow them down.`,
    provider: "synthetic", suggestedEventIds: suggestions.map(({ event }) => event.id),
    notice: "OpenClaw and OpenRouter are not configured, so this is a transparent rule-based response."
  };
}

async function completion(url: string, token: string, model: string, user: string, messages: AssistantMessage[], fetchImpl: typeof fetch): Promise<string> {
  const response = await fetchImpl(url, {
    method: "POST", signal: AbortSignal.timeout(20_000),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Title": "ThirdPlace outing guide" },
    body: JSON.stringify({ model, user, stream: false, temperature: 0.3, messages: [{ role: "system", content: systemPrompt("me") }, ...messages] })
  });
  if (!response.ok) throw new Error(`Assistant provider returned ${response.status}`);
  const body = await response.json() as CompletionBody;
  const reply = body.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Assistant provider returned no content");
  return reply;
}

export async function askAssistant(messages: AssistantMessage[], userId = "me", conversationId = "web", options: AssistantOptions = {}): Promise<AssistantResponse> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const suggestedEventIds = contextFor(userId).recommendations.slice(0, 3).map(({ event }) => event.id);
  const openClawUrl = (options.openClawUrl ?? process.env.OPENCLAW_GATEWAY_URL)?.replace(/\/$/, "");
  const openClawToken = options.openClawToken ?? process.env.OPENCLAW_GATEWAY_TOKEN;
  if (openClawUrl && openClawToken) {
    try {
      const reply = await completion(`${openClawUrl}/v1/chat/completions`, openClawToken, "openclaw/default", `thirdplace:${conversationId}`, messages, fetchImpl);
      return { reply, provider: "openclaw", suggestedEventIds };
    } catch (error) {
      console.warn("[assistant] OpenClaw unavailable; trying configured fallback:", error instanceof Error ? error.message : "unknown error");
    }
  }
  const openRouterKey = options.openRouterKey ?? process.env.OPENROUTER_API_KEY;
  const openRouterModel = options.openRouterModel ?? process.env.OPENROUTER_MODEL;
  if (openRouterKey && openRouterModel) {
    try {
      const reply = await completion("https://openrouter.ai/api/v1/chat/completions", openRouterKey, openRouterModel, `thirdplace:${conversationId}`, messages, fetchImpl);
      return { reply, provider: "openrouter", suggestedEventIds, notice: openClawUrl ? "OpenClaw was unavailable; OpenRouter handled this response." : undefined };
    } catch (error) {
      console.warn("[assistant] OpenRouter unavailable; using transparent fallback:", error instanceof Error ? error.message : "unknown error");
    }
  }
  return syntheticReply(userId);
}

export function assistantStatus() {
  return { openClawConfigured: Boolean(process.env.OPENCLAW_GATEWAY_URL && process.env.OPENCLAW_GATEWAY_TOKEN), openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_MODEL) };
}
