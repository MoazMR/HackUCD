import type {
  BusinessEventDraft,
  FieldErrors,
  HostedEvent,
  MockOrder,
  PaymentsStatus,
  Promotion,
  PromotionPlan
} from "./types";

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string, readonly fieldErrors?: FieldErrors) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers
    });
  } catch {
    throw new ApiError("Can't reach the ThirdPlace API. Check that `npm run dev` is running.", 0, "network");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok && response.status !== 202) {
    throw new ApiError(data.error ?? `Request failed (${response.status}).`, response.status, data.code, data.fieldErrors);
  }
  return data as T;
}

export const businessApi = {
  plans: () => request<{ plans: PromotionPlan[] }>("/api/business/plans").then((d) => d.plans),
  paymentsStatus: () => request<PaymentsStatus>("/api/payments/status"),
  businessEvents: () => request<{ events: HostedEvent[] }>("/api/business/events").then((d) => d.events),
  myEvents: () => request<{ events: HostedEvent[] }>("/api/business/my-events").then((d) => d.events),
  orders: () => request<{ orders: MockOrder[] }>("/api/business/orders").then((d) => d.orders),
  promotions: () => request<{ promotions: Promotion[] }>("/api/promotions").then((d) => d.promotions),

  createBusinessEvent: (draft: BusinessEventDraft) =>
    request<{ event: HostedEvent }>("/api/business/events", {
      method: "POST",
      body: JSON.stringify({ ...draft, startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : "" })
    }).then((d) => d.event),

  startCheckout: (body: { planId: PromotionPlan["id"]; eventId: string; buyer: { type: "business"; name: string } | { type: "user" } }) =>
    request<{ orderId: string; checkoutUrl: string }>("/api/payments/checkout", { method: "POST", body: JSON.stringify(body) }),

  confirm: (sessionId: string) =>
    request<{ status: "active" | "pending" | "expired"; order?: MockOrder; promotion?: Promotion }>(
      `/api/payments/confirm?session_id=${encodeURIComponent(sessionId)}`
    ),

  cancel: (orderId: string) =>
    request<{ order: MockOrder }>("/api/payments/cancel", { method: "POST", body: JSON.stringify({ orderId }) })
};

export function formatPrice(amountCents: number, currency = "eur") {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: currency.toUpperCase() }).format(amountCents / 100);
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-IE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
