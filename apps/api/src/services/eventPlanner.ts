import type { EventPlan, EventPlanRequest, EventPlanResponse } from "@social-outings/shared";

type OpenRouterMessage = { choices?: Array<{ message?: { content?: string } }> };

export type EventPlannerOptions = {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
};

function syntheticPlan(input: EventPlanRequest): EventPlan {
  const category = input.category === "other" ? "social" : input.category;
  return {
    title: `${input.goal.trim()} in ${input.area.trim()}`,
    description: `A welcoming ${category} outing for ${input.attendeeCount ?? 8} people in ${input.area.trim()} on ${input.date}.`,
    suggestedDurationMinutes: 90,
    checklist: [
      "Confirm an accessible public meeting point",
      "Add a clear start time and what attendees should bring",
      "Post safety and public group-chat expectations",
      ...(input.budget?.trim() ? [`Keep the advertised budget ${input.budget.trim()}`] : [])
    ],
    rationale: `Keeps the plan local to ${input.area.trim()}, specific to ${category}, and easy for a small group to understand.`
  };
}

function validPlan(value: unknown): value is EventPlan {
  if (!value || typeof value !== "object") return false;
  const plan = value as Record<string, unknown>;
  return typeof plan.title === "string" && plan.title.length > 0
    && typeof plan.description === "string" && plan.description.length > 0
    && typeof plan.suggestedDurationMinutes === "number" && Number.isFinite(plan.suggestedDurationMinutes)
    && Array.isArray(plan.checklist) && plan.checklist.length > 0 && plan.checklist.every((item) => typeof item === "string")
    && typeof plan.rationale === "string" && plan.rationale.length > 0;
}

export async function generateEventPlan(input: EventPlanRequest, options: EventPlannerOptions = {}): Promise<EventPlanResponse> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  const model = options.model ?? process.env.OPENROUTER_MODEL;
  if (!apiKey || !model) {
    return {
      plan: syntheticPlan(input),
      provider: "synthetic",
      notice: "Synthetic demo plan. Configure OPENROUTER_API_KEY and OPENROUTER_MODEL to generate plans with OpenRouter."
    };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "ThirdPlace event planner"
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You plan safe, inclusive public social outings. Return JSON only with title, description, suggestedDurationMinutes, checklist (string array), and rationale. Never request private contact details, exact home locations, identity documents, or private messaging."
        },
        { role: "user", content: JSON.stringify(input) }
      ]
    }),
    signal: AbortSignal.timeout(15_000)
  });

  if (!response.ok) throw new Error(`OpenRouter request failed with status ${response.status}`);
  const body = await response.json() as OpenRouterMessage;
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned no plan content");
  let plan: unknown;
  try {
    plan = JSON.parse(content);
  } catch {
    throw new Error("OpenRouter returned invalid JSON");
  }
  if (!validPlan(plan)) throw new Error("OpenRouter returned an invalid event plan");
  return { plan, provider: "openrouter", model };
}
