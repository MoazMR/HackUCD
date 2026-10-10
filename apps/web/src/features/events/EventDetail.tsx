import { distanceKm, USER_ORIGIN } from "./geo";
import { GroupChat } from "./GroupChat";
import { formatKm, formatPrice, formatWhen, spotsLeft } from "./format";
import { CATEGORY_LABELS, type ChatMessage, type DiscoveryEvent } from "./types";
import { useEffect } from "react";
import { trackEvent } from "./eventsClient";
import { trackEventOnce } from "./analytics";
import { PromotedBadge } from "../business/PromotedBadge";

type Props = {
  event: DiscoveryEvent | undefined;
  joined: boolean;
  messages: ChatMessage[];
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onPost: (id: string, text: string) => boolean;
  backHref: string;
};

export function EventDetail({ event, joined, messages, onJoin, onLeave, onPost, backHref }: Props) {
  useEffect(() => {
    if (event?.promotion) trackEventOnce(event.id, "detail_view");
  }, [event?.id, Boolean(event?.promotion)]);
  if (!event) {
    return (
      <section className="tp-state" role="alert">
        <h2>We couldn't find that event</h2>
        <p>It may have been removed, or the link is out of date.</p>
        <a className="tp-btn tp-btn--primary" href={backHref}>Back to events</a>
      </section>
    );
  }

  const left = spotsLeft(event);
  const full = left === 0 && !joined;
  const started = new Date(event.startsAt).getTime() <= Date.now();
  const km = distanceKm(USER_ORIGIN, event);

  return (
    <div className="tp-detail">
      <a className="tp-back" href={backHref}>← Back to events</a>
      <div className="tp-detail__grid">
        <article className="tp-detail__main" aria-labelledby="event-title">
          <p className="tp-tile__meta">
            {event.promotion && <PromotedBadge sponsorName={event.promotion.sponsorName || undefined} />}
            <span className="tp-tag">{CATEGORY_LABELS[event.category]}</span>
            <span className="tp-tag tp-tag--soft">{event.interest}</span>
            {event.synthetic && <span className="tp-tag tp-tag--sample">Sample event</span>}
          </p>
          <h2 id="event-title" className="tp-detail__title">{event.title}</h2>
          <p className="tp-detail__desc">{event.description}</p>

          <div className="tp-facts">
            <div><span>When</span><strong>{formatWhen(event.startsAt)}</strong></div>
            <div><span>Where</span><strong>{event.locationName}, {event.area}</strong><small>{formatKm(km)} from you</small></div>
            <div><span>Price</span><strong>{formatPrice(event.priceEur)}</strong></div>
            <div><span>Going</span><strong>{event.attendeeCount} of {event.capacity}</strong><small>{full ? "Full" : `${left} ${left === 1 ? "spot" : "spots"} left`}</small></div>
            <div><span>Host</span><strong>{event.hostName}</strong></div>
          </div>

          <div className="tp-detail__actions">
            {event.hosting ? (
              <p className="tp-going" role="status">You're hosting this event</p>
            ) : joined ? (
              <>
                <p className="tp-going" role="status">You're going 🎉</p>
                <button type="button" className="tp-btn tp-btn--ghost" onClick={() => onLeave(event.id)}>Leave event</button>
              </>
            ) : (
              <button
                type="button"
                className="tp-btn tp-btn--primary tp-btn--lg"
                disabled={full || started}
                onClick={() => onJoin(event.id)}
              >
                {started ? "Already started" : full ? "Event is full" : event.priceEur > 0 ? `Join · ${formatPrice(event.priceEur)} on the day` : "Join this event"}
              </button>
            )}
            <a className="tp-btn tp-btn--ghost" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationName}, ${event.area}, Dublin`)}`} target="_blank" rel="noreferrer" onClick={() => event.promotion && trackEvent(event.id, "directions")}>Directions</a>
          </div>
          <p className="tp-muted tp-detail__note">
            Only an approximate area is shown. The exact meeting point is shared in the group chat by the host.
          </p>
        </article>

        <GroupChat
          eventTitle={event.title}
          messages={messages}
          canPost={joined || Boolean(event.hosting)}
          onPost={(text) => onPost(event.id, text)}
        />
      </div>
    </div>
  );
}
