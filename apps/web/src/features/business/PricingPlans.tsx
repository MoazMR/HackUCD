import { formatPrice } from "./api";
import type { BuyerType, PromotionPlan } from "./types";

export function PricingPlans({ plans, highlight }: { plans: PromotionPlan[]; highlight?: BuyerType }) {
  return (
    <section className="biz-pricing" aria-labelledby="pricing-heading">
      <div className="biz-pricing__intro">
        <h2 id="pricing-heading">Pricing</h2>
        <p>
          One-time payments in euro. No subscription, nothing renews. Promotion moves an event up for people
          whose interests and travel radius already match it; it never shows your event to people it isn't relevant to.
        </p>
      </div>
      <div className="biz-pricing__plans">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`biz-plan${highlight === plan.buyerType ? " biz-plan--current" : ""}`}
            aria-labelledby={`${plan.id}-name`}
          >
            <p className="biz-plan__audience">{plan.buyerType === "business" ? "For venues and businesses" : "For people hosting their own event"}</p>
            <h3 id={`${plan.id}-name`}>{plan.name}</h3>
            <p className="biz-plan__price">
              <strong>{formatPrice(plan.amountCents, plan.currency)}</strong>
              <span>
                one-time, {plan.currency.toUpperCase()}, {plan.durationDays} days
              </span>
            </p>
            <p className="biz-plan__what">What you get</p>
            <ul>
              {plan.includes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="biz-fineprint">
        Why one-time: events are one-off and time-boxed, so you pay per event and stop when it ends. A promotion
        finishes early if the event starts first. Checkout runs in Stripe's sandbox; no real money moves.
      </p>
    </section>
  );
}
