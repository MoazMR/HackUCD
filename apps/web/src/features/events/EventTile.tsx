import { formatDay, formatPrice, formatWhen, spotsLeft } from "./format";
import { CATEGORY_LABELS, type RankedEvent } from "./types";

type Props = { ranked: RankedEvent; joined: boolean; compact?: boolean };

/** Public-safe event card: no contact details, no exact address, host first name only. */
export function EventTile({ ranked, joined, compact = false }: Props) {
  const { event, reason } = ranked;
  const day = formatDay(event.startsAt);
  const left = spotsLeft(event);
  const full = left === 0;

  return (
    <article className={`tp-tile tp-tile--${event.category}${compact ? " tp-tile--compact" : ""}`}>
      <div className="tp-tile__date" aria-hidden="true">
        <span>{day.weekday}</span>
        <strong>{day.day}</strong>
        <span>{day.month}</span>
      </div>
      <div className="tp-tile__body">
        <p className="tp-tile__meta">
          <span className="tp-tag">{CATEGORY_LABELS[event.category]}</span>
          <span className="tp-tag tp-tag--soft">{event.interest}</span>
          {joined && <span className="tp-tag tp-tag--joined">You're going</span>}
        </p>
        <h3 className="tp-tile__title">
          <a className="tp-tile__link" href={`#/event/${encodeURIComponent(event.id)}`}>
            {event.title}
          </a>
        </h3>
        <p className="tp-tile__reason">{reason}</p>
        <p className="tp-tile__where">
          {formatWhen(event.startsAt)} · {event.locationName}, {event.area}
        </p>
        <p className="tp-tile__foot">
          <span className="tp-price">{formatPrice(event.priceEur)}</span>
          <span className={full ? "tp-full" : ""}>
            {full ? "Full" : `${left} ${left === 1 ? "spot" : "spots"} left`}
          </span>
          <span>Hosted by {event.hostName}</span>
        </p>
      </div>
    </article>
  );
}
