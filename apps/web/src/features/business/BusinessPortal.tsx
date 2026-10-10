import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, businessApi, formatDateTime, formatPrice } from "./api";
import { BusinessEventForm, EMPTY_DRAFT, sampleDraft, validateDraft } from "./BusinessEventForm";
import { OrdersList } from "./OrdersList";
import { PricingPlans } from "./PricingPlans";
import { PromotionPreview } from "./PromotionPreview";
import type {
  BusinessEventDraft,
  BuyerType,
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
  | { kind: "verifying" }
  | { kind: "active"; order: MockOrder; promotion: Promotion }
  | { kind: "pending" }
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
    window.history.replaceState(null, "", window.location.pathname);

    if (outcome === "cancelled") {
      const orderId = params.get("order");
      setReturnState({ kind: "cancelled" });
      if (orderId) {
        businessApi
          .cancel(orderId)
          .then(({ order }) => {
            setReturnState({ kind: "cancelled", order });
            if (order.buyer.type !== readStoredMode()) changeMode(order.buyer.type);
            setSelectedEventId(order.eventId);
          })
          .catch(() => setReturnState({ kind: "cancelled" }))
          .finally(refreshOrders);
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
              setReturnState({ kind: "active", order: result.order, promotion: result.promotion });
              if (result.order.buyer.type !== readStoredMode()) changeMode(result.order.buyer.type);
              await Promise.all([refreshOrders(), refreshEvents()]);
              return;
            }
            if (result.status === "expired") {
              setReturnState({ kind: "error", message: "This checkout expired before payment completed. You were not charged." });
              return;
            }
          } catch (error) {
            setReturnState({ kind: "error", message: (error as Error).message });
            return;
          }
          await wait(1500);
        }
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
  const promotedIds = useMemo(() => new Set(orders.filter((o) => o.status === "paid").map((o) => o.eventId)), [orders]);

  const selectedEvent: HostedEvent | undefined =
    mode === "business"
      ? businessEvents.find((event) => event.id === selectedEventId)
      : myEvents.find((event) => event.id === selectedEventId);
  const selectedIsPromoted = selectedEvent ? promotedIds.has(selectedEvent.id) || Boolean(selectedEvent.promoted) : false;

  async function publishEvent() {
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

      <ReturnBanner state={returnState} onDismiss={() => setReturnState(undefined)} />

      <section className="biz-hero">
        <h1>Get your event in front of the right people nearby.</h1>
        <p>
          Promotion is optional. Browsing, joining and creating events on ThirdPlace stay free for everyone.
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
                    <p className="biz-fineprint">Published. It's live without a boost; boosting is the optional next step.</p>
                    <button type="button" className="biz-button--quiet" onClick={() => setSelectedEventId(undefined)}>Create a different event</button>
                  </div>
                ) : (
                  <>
                    <BusinessEventForm
                      draft={draft}
                      errors={fieldErrors}
                      saving={saving}
                      onChange={setDraft}
                      onSubmit={publishEvent}
                      onFillSample={() => {
                        setDraft(sampleDraft());
                        setFieldErrors({});
                      }}
                    />
                    {formError && <p role="alert" className="biz-inline-error">{formError}</p>}
                    {ownBusinessEvents.length > 0 && (
                      <div className="biz-existing">
                        <p>Or boost one of {businessName}'s existing events:</p>
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
            <h2>Boost it</h2>
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
            {!selectedEvent && <p className="biz-fineprint">{mode === "business" ? "Publish your event first." : "Choose an event first."}</p>}
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
                {checkoutBusy ? "Opening checkout…" : plan ? `Pay ${formatPrice(plan.amountCents, plan.currency)} and boost` : "Pay and boost"}
              </button>
              {selectedIsPromoted && <span className="biz-fineprint">This event is already promoted.</span>}
            </div>
            {checkoutError && <p role="alert" className="biz-inline-error">{checkoutError}</p>}
          </li>
        </ol>

        <aside className="biz-aside">
          <PromotionPreview event={previewEvent} sponsorName={sponsorName} promoted />
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
            {promoted && <span className="biz-choice__flag">Already promoted</span>}
          </button>
        );
      })}
    </div>
  );
}

function ReturnBanner({ state, onDismiss }: { state?: ReturnState; onDismiss: () => void }) {
  if (!state) return null;
  if (state.kind === "verifying") {
    return <div className="biz-banner" role="status">Confirming your payment with Stripe…</div>;
  }
  if (state.kind === "pending") {
    return (
      <div className="biz-banner biz-banner--warn" role="status">
        Stripe hasn't confirmed the payment yet. Refresh in a minute; your boost starts as soon as it's confirmed.
        <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
      </div>
    );
  }
  if (state.kind === "cancelled") {
    return (
      <div className="biz-banner biz-banner--neutral" role="status">
        <strong>Checkout cancelled. You weren't charged.</strong>{" "}
        {state.order ? `“${state.order.eventTitle}” is still live without a boost. You can try again below.` : "Your event is still live without a boost."}
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
  return (
    <div className="biz-banner biz-banner--success" role="status">
      <strong>Payment confirmed. “{state.promotion.event.title}” is now promoted.</strong>{" "}
      It shows as Promoted in For You and on the Map until {formatDateTime(state.promotion.endsAt)}.
      Paid {formatPrice(state.order.amountCents, state.order.currency)} (order <code>{state.order.id}</code>).
      <button type="button" className="biz-button--quiet" onClick={onDismiss}>Dismiss</button>
    </div>
  );
}
