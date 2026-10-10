import { useEffect, useState } from "react";
import type { OutingEvent } from "@social-outings/shared";
import { EventCard } from "../../components/EventCard";

export function DiscoverEvents() {
  const [events, setEvents] = useState<OutingEvent[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetch("/api/events")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { events: OutingEvent[] }) => setEvents(data.events))
      .catch(() => setError("We could not load nearby outings. Is the API running?"));
  }, []);

  return (
    <section id="discover" aria-labelledby="discover-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Explore</p><h2 id="discover-heading">Happening nearby</h2></div>
        <button type="button">Use my location</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="event-grid">
        {events.map((event) => <EventCard event={event} key={event.id} />)}
      </div>
    </section>
  );
}
