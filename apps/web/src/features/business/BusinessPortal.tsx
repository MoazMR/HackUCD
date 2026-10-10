import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, businessApi, formatDateTime, formatPrice } from "./api";
import { BusinessEventForm, EMPTY_DRAFT, sampleDraft, validateDraft } from "./BusinessEventForm";
import { OrdersList } from "./OrdersList";
import { PricingPlans } from "./PricingPlans";
import { PromotionPreview } from "./PromotionPreview";
import type {
  BusinessEventDraft,
  BuyerType,
  EventAnalytics,
  FieldErrors,
  HostedEvent,
  MockOrder,
  PaymentsStatus,
  Promotion,
  PromotionPlan
} from "./types";
import { Logo } from "../profile/Logo";
import "./business.css";

type ReturnState =
  | { kind: "verifying"; cancellation?: boolean }
  | { kind: "active"; order: MockOrder; promotion: Promotion }
  | { kind: "pending" }
  | { kind: "ended"; order: MockOrder }
  | { kind: "cancelled"; order?: MockOrder }
  | { kind: "error"; message: string };

function readStoredMode(): BuyerType {
  try {
    return sessionStorage.getItem("tp-business-mode") === "user" ? "user" : "business";
  } catch {
    return "business";
  }
}

function storeMode(mode: BuyerType) {
  try {
    sessionStorage.setItem("tp-business-mode", mode);
  } catch {
    /* storage unavailable: mode simply resets on reload */
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clearCheckoutReturn() {
  const url = new URL(window.location.href);
  for (const key of ["checkout", "session_id", "order"]) url.searchParams.delete(key);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function BusinessPortal({ homeHref = "/" }: { homeHref?: string }) {
  const [mode, setMode] = useState<BuyerType>(readStoredMode);
  const [plans, setPlans] = useState<PromotionPlan[]>([]);
  const [payments, setPayments] = useState<PaymentsStatus>();
  const [loadError, setLoadError] = useState<string>();

  const [orders, setOrders] = useState<MockOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string>();

  const [businessEvents, setBusinessEvents] = useState<HostedEvent[]>([]);
  const [myEvents, setMyEvents] = useState<HostedEvent[]>([]);

  const [draft, setDraft] = useState<BusinessEventDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const [selectedEventId, setSelectedEventId] = useState<string>();

  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>();
  const [returnState, setReturnState] = useState<ReturnState>();
  const [analytics, setAnalytics] = useState<EventAnalytics>();

  const refreshOrders = useCallback(() => {
    setOrdersLoading(true);
    return businessApi
      .orders()
      .then((list) => {
        setOrders(list);
        setOrdersError(undefined);
      })
      .catch((error: Error) => setOrdersError(error.message))
      .finally(() => setOrdersLoading(false));
  }, []);

  const refreshEvents = useCallback(
    () => Promise.all([businessApi.businessEvents().then(setBusinessEvents), businessApi.myEvents().then(setMyEvents)]),
    []
  );

  // Initial load.
  useEffect(() => {
    Promise.all([businessApi.plans(), businessApi.paymentsStatus()])
      .then(([planList, status]) => {
        setPlans(planList);
        setPayments(status);
      })
      .catch((error: Error) => setLoadError(error.message));
    refreshEvents().catch((error: Error) => setLoadError(error.message));
    refreshOrders();
  }, [refreshEvents, refreshOrders]);

  // Handle the return from Stripe Checkout (success or cancel).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("checkout");
    if (!outcome) return;

    if (outcome === "cancelled") {
      const orderId = params.get("order");
      if (orderId) {
        setReturnState({ kind: "verifying", cancellation: true });
        businessApi
          .cancel(orderId)
          .then(async ({ order }) => {
            if (order.buyer.type !== readStoredMode()) changeMode(order.buyer.type);
            setSelectedEventId(order.eventId);
            // Payment can win a race with the cancel return. Use the verified order,
            // rather than claiming that a completed sandbox payment was cancelled.
            if (order.status === "paid" && order.stripeCheckoutSessionId) {
              const result = await businessApi.confirm(order.stripeCheckoutSessionId);
              if (result.status === "active" && result.order && result.promotion) {
                clearCheckoutReturn();
                setReturnState({ kind: "active", order: result.order, promotion: result.promotion });
                return;
              }
              if (result.status === "expired" && result.order?.status === "paid") {
                clearCheckoutReturn();
                setReturnState({ kind: "ended", order: result.order });
                return;
              }
            }
            if (order.status === "cancelled" || order.status === "expired") {
              clearCheckoutReturn();
              setReturnState({ kind: "cancelled", order });
            }
            else setReturnState({ kind: "error", message: "Cancellation could not be confirmed. Check the order status before trying another checkout." });
          })
          .catch((error: Error) => setReturnState({ kind: "error", message: error.message }))
          .finally(() => Promise.all([refreshOrders(), refreshEvents()]));
      } else {
        clearCheckoutReturn();
        setReturnState({ kind: "cancelled" });
      }
      return;
    }

    if (outcome === "success") {
      const sessionId = params.get("session_id") ?? "";
      setReturnState({ kind: "verifying" });
      (async () => {
        // Stripe can take a moment to mark the session paid; poll briefly.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          try {
            const result = await businessApi.confirm(sessionId);
            if (result.status === "active" && result.order && result.promotion) {
              clearCheckoutReturn();
              setReturnState({ kind: "active", order: result.order, promotion: result.promotion });
              if (result.order.buyer.type !== readStoredMode()) changeMode(result.order.buyer.type);
              setSelectedEventId(result.order.eventId);
              await Promise.all([refreshOrders(), refreshEvents()]);
              return;
            }
            if (result.status === "expired") {
              clearCheckoutReturn();
              if (result.order?.status === "paid") {
                setReturnState({ kind: "ended", order: result.order });
                if (result.order.buyer.type !== readStoredMode()) changeMode(result.order.buyer.type);
                setSelectedEventId(result.order.eventId);
                await Promise.all([refreshOrders(), refreshEvents()]);
                return;
              }
              setReturnState({ kind: "error", message: "This checkout expired before payment completed. You were not charged. No new boost was activated. Saved drafts stay unpublished; existing published events stay published." });
              return;
            }
          } catch (error) {
            setReturnState({ kind: "error", message: (error as Error).message });
            return;
          }
          if (attempt < 5) await wait(1500);
        }
        // Keep the session in the return URL so a refresh can retry confirmation.
        setReturnState({ kind: "pending" });
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeMode(next: BuyerType) {
    setMode(next);
    storeMode(next);
    setSelectedEventId(undefined);
    setCheckoutError(undefined);
  }

  const plan = plans.find((p) => p.buyerType === mode);
  const businessName = draft.businessName.trim();

  const ownBusinessEvents = useMemo(
    () => businessEvents.filter((event) => businessName && event.businessName?.toLowerCase() === businessName.toLowerCase()),
    [businessEvents, businessName]
  );
  const promotedIds = useMemo(() => new Set([...businessEvents, ...myEvents].filter((event) => event.isPaidPromotion || event.promoted).map((event) => event.id)), [businessEvents, myEvents]);

  const selectedEvent: HostedEvent | undefined =
    mode === "business"
      ? businessEvents.find((event) => event.id === selectedEventId)
      : myEvents.find((event) => event.id === selectedEventId);
  const selectedIsPromoted = selectedEvent ? promotedIds.has(selectedEvent.id) || Boolean(selectedEvent.promoted) : false;

  useEffect(() => {
    if (!selectedEventId) { setAnalytics(undefined); return; }
    businessApi.analytics(selectedEventId).then(setAnalytics).catch(() => setAnalytics(undefined));
  }, [selectedEventId, returnState]);

  async function saveBusinessDraft() {
    setFormError(undefined);
    const errors = validateDraft(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const event = await businessApi.createBusinessEvent(draft);
      setBusinessEvents((list) => [event, ...list]);
      setSelectedEventId(event.id);
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) setFieldErrors(error.fieldErrors);
      setFormError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function startCheckout() {
    if (!plan || !selectedEvent) return;
    setCheckoutError(undefined);
    setCheckoutBusy(true);
    try {
      const buyer = mode === "business" ? { type: "business" as const, name: selectedEvent.businessName ?? businessName } : { type: "user" as const };
      const { checkoutUrl } = await businessApi.startCheckout({ planId: plan.id, eventId: selectedEvent.id, buyer });
      storeMode(mode);
      window.location.assign(checkoutUrl);
    } catch (error) {
      setCheckoutError((error as Error).message);
      setCheckoutBusy(false);
      refreshOrders();
    }
  }

  const previewEvent = selectedEvent
    ? { ...selectedEvent }
    : mode === "business"
      ? { title: draft.title, description: draft.description, locationName: draft.venueName, category: draft.category, startsAt: draft.startsAt }
      : { title: "", description: "", locationName: "", category: "" };
  const sponsorName = mode === "business" ? selectedEvent?.businessName ?? businessName : "Dara L. (demo user)";

  return (
    <div className="biz-shell">
      <header className="biz-topbar">
        <a className="brand" href={homeHref}><Logo /></a>
        <span className="biz-topbar__section">Promote an event</span>
        <a className="biz-topbar__back" href={homeHref}>Back to For You</a>
      </header>

      <ReturnBanner state={returnState} mode={mode} publicationStatus={selectedEvent?.publicationStatus} onDismiss={() => setReturnState(undefined)} />

      <section className="biz-hero">
        <h1>Get your event in front of the right people nearby.</h1>
        <p>
          Browsing, joining and creating ordinary-user events are free; Community Boost is optional.
          Business events stay drafts until payment publishes and boosts them.
        </p>
        <div className="biz-mode" role="radiogroup" aria-label="Who is promoting">
          <button type="button" role="radio" aria-checked={mode === "business"} className="biz-mode__option" onClick={() => changeMode("business")}>
            <strong>I run a venue or business</strong>
            <span>Create a venue event and boost it</span>
          </button>
          <button type="button" role="radio" aria-checked={mode === "user"} className="biz-mode__option" onClick={() => changeMode("user")}>
            <strong>I'm hosting my own event</strong>
            <span>Optionally boost one of your events</span>
          </button>
        </div>
      </section>

      {loadError && <p role="alert" className="biz-inline-error">{loadError}</p>}
      {payments && !payments.stripeConfigured && (
        <p role="status" className="biz-notice">
          Checkout is switched off on this machine: {payments.message} See the business feature README for setup.
        </p>
      )}

      <div className="biz-layout">
        <ol className="biz-steps">
          <li className="biz-step">
            <h2>{mode === "business" ? "Your venue event" : "Choose your event"}</h2>
            {mode === "business" ? (
              <>
                {selectedEvent ? (
                  <div className="biz-selected">
                    <p><strong>{selectedEvent.title}</strong> at {selectedEvent.locationName}, {formatDateTime(selectedEvent.startsAt)}</p>
                    <p className="biz-fineprint">{selectedEvent.publicationStatus === "draft" ? "Draft saved. It is hidden from public discovery until payment publishes it and adds the clearly labelled boost." : "This business event is published. A paid boost helps nearby people with matching interests find it."}</p>
                    <button type="button" className="biz-button--quiet" onClick={() => setSelectedEventId(undefined)}>Create a different event</button>
                  </div>
                ) : (
                  <>
                    <BusinessEventForm
                      draft={draft}
                      errors={fieldErrors}
                      saving={saving}
                      onChange={setDraft}
                      onSubmit={saveBusinessDraft}
                      onFillSample={() => {
                        setDraft(sampleDraft());
                        setFieldErrors({});
                      }}
                    />
                    {formError && <p role="alert" className="biz-inline-error">{formError}</p>}
                    {ownBusinessEvents.length > 0 && (
                      <div className="biz-existing">
                        <p>Or choose one of {businessName}'s saved drafts or published events:</p>
                        <EventChoices events={ownBusinessEvents} promotedIds={promotedIds} selectedId={selectedEventId} onSelect={setSelectedEventId} />
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                <p className="biz-fineprint">Signed in as Dara L. (demo user). You can only promote events you created.</p>
                {myEvents.length === 0 ? (
                  <p className="biz-empty">You haven't created any events yet. Create one from For You first; it's free.</p>
                ) : (
                  <EventChoices events={myEvents} promotedIds={promotedIds} selectedId={selectedEventId} onSelect={setSelectedEventId} />
                )}
              </>
            )}
          </li>

          <li className={`biz-step${selectedEvent ? "" : " biz-step--waiting"}`}>
            <h2>{mode === "business" && selectedEvent?.publicationStatus !== "published" ? "Publish and boost it" : "Boost it"}</h2>
            {plan ? (
              <div className="biz-boost">
                <div>
                  <p className="biz-boost__name">{plan.name}</p>
                  <p className="biz-boost__price">{formatPrice(plan.amountCents, plan.currency)} <span>one-time, {plan.durationDays} days</span></p>
                </div>
                <p className="biz-fineprint">{plan.includes[0]}. Full details in Pricing below.</p>
              </div>
            ) : (
              <p>Loading price…</p>
            )}
            {!selectedEvent && <p className="biz-fineprint">{mode === "business" ? "Save your event draft first." : "Choose an event first."}</p>}
          </li>

          <li className={`biz-step${selectedEvent ? "" : " biz-step--waiting"}`}>
            <h2>Pay securely with Stripe</h2>
            <p className="biz-fineprint">
              You'll go to Stripe's checkout page and come straight back here. Sandbox mode: use test card 4242 4242 4242 4242, any future date and any CVC.
            </p>
            <div className="biz-actions">
              <button
                type="button"
                onClick={startCheckout}
                disabled={!selectedEvent || !plan || checkoutBusy || selectedIsPromoted || payments?.stripeConfigured === false}
              >
                {checkoutBusy ? "Opening checkout…" : plan ? `Pay ${formatPrice(plan.amountCents, plan.currency)} and ${mode === "business" ? "publish + boost" : "boost"}` : "Pay and continue"}
              </button>
              {selectedIsPromoted && <span className="biz-fineprint">This event is already promoted.</span>}
            </div>
            {checkoutError && <p role="alert" className="biz-inline-error">{checkoutError}</p>}
          </li>
        </ol>

        <aside className="biz-aside">
          <PromotionPreview event={previewEvent} sponsorName={sponsorName} promoted />
          {selectedEvent && <section className="biz-metrics" aria-label="Promotion results">
            <h2>Promotion results</h2>
            <p className="biz-fineprint">Anonymous aggregate actions. Event impressions and opens count once per browser tab session.</p>
            <div><span><strong>{analytics?.impressions ?? 0}</strong> impressions</span><span><strong>{analytics?.detailViews ?? 0}</strong> event opens</span><span><strong>{analytics?.joins ?? 0}</strong> joins</span><span><strong>{analytics?.directions ?? 0}</strong> direction taps</span></div>
            <p className="biz-fineprint">{analytics?.costPerJoinCents != null ? `${formatPrice(analytics.costPerJoinCents, analytics.currency)} per join during paid boosts (${formatPrice(analytics.paidAmountCents, analytics.currency)} sandbox spend, ${analytics.paidJoins} joins).` : "Cost per join appears after a join during a paid boost."}</p>
          </section>}
        </aside>
      </div>

      {plans.length > 0 && <PricingPlans plans={plans} highlight={mode} />}
      <OrdersList orders={orders} loading={ordersLoading} error={ordersError} />
    </div>
  );
}

function EventChoices({
  events,
  promotedIds,
  selectedId,
  onSelect
}: {
  events: HostedEvent[];
  promotedIds: Set<string>;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="biz-choices" role="radiogroup" aria-label="Your events">
      {events.map((event) => {
        const promoted = promotedIds.has(event.id) || Boolean(event.promoted);
        return (
          <button
            key={event.id}
            type="button"
            role="radio"
            aria-checked={selectedId === event.id}
            className="biz-choice"
            onClick={() => onSelect(event.id)}
          >
            <strong>{event.title}</strong>
            <span>{event.locationName}, {formatDateTime(event.startsAt)}</span>
            <span className="biz-fineprint">{event.publicationStatus === "draft" ? "Draft · hidden until payment" : "Published"}</span>
            {promoted && <span className="biz-choice__flag">Already promoted</span>}
          </button>
        );
      })}
    </div>
  );
}

function ReturnBanner({ state, mode, publicationStatus, onDismiss }: { state?: ReturnState; mode: BuyerType; publicationStatus?: HostedEvent["publicationStatus"]; onDismiss: () => void }) {
  if (!state) return null;
  if (state.kind === "verifying") {
    return <div className="biz-banner" role="status">{state.cancellation ? "Checking cancellation with Stripe…" : "Confirming your payment with Stripe…"}</div>;
  }
  if (state.kind === "pending") {
    return (
      <div className="biz-banner biz-banner--warn" role="status">
        Stripe hasn't confirmed the payment yet. Refresh in a minute; {mode === "business" ? publicationStatus === "published" ? "your business event remains published while waiting for this new boost." : publicationStatus === "draft" ? "your business event remains a draft until payment publishes and boosts it." : "business drafts stay unpublished until payment; previously published events stay published while waiting for a boost." : "your optional boost starts as soon as payment is confirmed."}
        <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
      </div>
    );
  }
  if (state.kind === "cancelled") {
    return (
      <div className="biz-banner biz-banner--neutral" role="status">
        <strong>Checkout cancelled. You weren't charged.</strong>{" "}
        {state.order?.buyer.type === "business" ? `“${state.order.eventTitle}” ${publicationStatus === "published" ? "remains published without this new boost" : "remains a draft until payment"}. You can try again below.` : state.order ? `“${state.order.eventTitle}” remains published without this optional boost. You can try again below.` : mode === "business" ? "Your business event remains a draft until payment. No promotion was activated." : "Your event remains published. No optional boost was activated."}
        <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="biz-banner biz-banner--warn" role="alert">
        {state.message}
        <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
      </div>
    );
  }
  if (state.kind === "ended") {
    return (
      <div className="biz-banner biz-banner--neutral" role="status">
        Payment was confirmed for “{state.order.eventTitle}”. The boost has ended; the event remains published.
        Paid {formatPrice(state.order.amountCents, state.order.currency)} in Stripe sandbox.
        <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
      </div>
    );
  }
  return (
    <div className="biz-banner biz-banner--success" role="status">
      <strong>Payment confirmed. “{state.promotion.event.title}” is now {state.order.buyer.type === "business" ? "published and promoted" : "promoted"}.</strong>{" "}
      It shows as Promoted in For You and on the Map until {formatDateTime(state.promotion.endsAt)}.
      Paid {formatPrice(state.order.amountCents, state.order.currency)} (order <code>{state.order.id}</code>).
      <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
