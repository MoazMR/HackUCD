import type { ApiProfile, EventPlanRequest, EventPlanResponse, EventRecommendation, EventRecord } from "@social-outings/shared";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => undefined) as { error?: string } | undefined;
  if (!response.ok) throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  return body as T;
}

export const api = {
  listEvents: () => requestJson<{ events: EventRecord[] }>("/api/events"),
  recommendations: (userId = "me") => requestJson<{ recommendations: EventRecommendation[]; appliedRadiusKm: number }>(`/api/recommendations?userId=${encodeURIComponent(userId)}`),
  profile: (userId = "me") => requestJson<{ profile: ApiProfile }>(`/api/profiles/${encodeURIComponent(userId)}`),
  updatePreferences: (interests: string[], travelRadiusKm: number, userId = "me") => requestJson<{ profile: ApiProfile }>(`/api/profiles/${encodeURIComponent(userId)}/preferences`, { method: "PUT", body: JSON.stringify({ interests, travelRadiusKm }) }),
  planEvent: (input: EventPlanRequest) => requestJson<EventPlanResponse>("/api/event-plans", { method: "POST", body: JSON.stringify(input) })
};
