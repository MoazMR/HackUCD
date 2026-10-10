import type { OutingEvent } from "@social-outings/shared";

export function EventCard({ event }: { event: OutingEvent }) {
  return (
    <article className="event-card">
      <p className="event-category">{event.category}</p>
      <h3>{event.title}</h3>
      <p>{event.description}</p>
      <dl>
        <div><dt>Where</dt><dd>{event.locationName}</dd></div>
        <div><dt>Going</dt><dd>{event.attendeeCount} people</dd></div>
      </dl>
    </article>
  );
}
