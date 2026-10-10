import { useMemo } from "react";
import { InterestBadge } from "../preferences/InterestIcon";
import { interestCategory } from "../preferences/interests";
import { useProfile } from "./ProfileStore";
import { Ribbon } from "./Ribbon";
import { sampleMyEvents } from "./sampleData";
import type { MyEvent } from "./types";
import "./profile.css";

type Props = {
  /** Supply real events once the API has them. Defaults to labelled sample data. */
  events?: MyEvent[];
  /** Opens the event's public group chat (owned by the events feature). */
  onOpenChat: (eventId: string) => void;
  onOpenEvent: (eventId: string) => void;
  onEndorse: (eventId: string) => void;
  onFindEvents?: () => void;
};

const when = new Intl.DateTimeFormat("en-IE", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** The My Events destination: what's coming up, and what you've been to. */
export function MyEventsView({ events, onOpenChat, onOpenEvent, onEndorse, onFindEvents }: Props) {
  const { profile, update } = useProfile();
  const all = useMemo(() => events ?? sampleMyEvents(), [events]);
  const now = Date.now();
  const upcoming = all.filter((event) => new Date(event.startsAt).getTime() >= now).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = all.filter((event) => new Date(event.startsAt).getTime() < now).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  const historyPublic = profile.privacy.showAttendanceHistory;

  function pendingCount(event: MyEvent) {
    return event.attendees.filter((person) => !profile.endorsementDecisions[`${event.id}:${person.id}`]).length;
  }

  return (
    <section className="tp tp-myevents" aria-labelledby="tp-myevents-heading">
      <header className="tp-page-head">
        <Ribbon />
        <h1 id="tp-myevents-heading" className="tp-title tp-title-big">{headline(upcoming.length)[0]} <span className="tp-script">{headline(upcoming.length)[1]}</span></h1>
        <p className="tp-lede">My Events keeps what you've joined or are hosting, and what you've already been to.</p>
        {!events && <p className="tp-sample">Sample events, until the events API is connected.</p>}
      </header>

      <section aria-labelledby="tp-upcoming">
        <h2 id="tp-upcoming">Upcoming <span className="tp-count">{upcoming.length}</span></h2>
        {upcoming.length === 0 ? (
          <div className="tp-empty">
            <p>Nothing coming up. Join an event or create one and it appears here.</p>
            {onFindEvents && <button type="button" className="tp-button" onClick={onFindEvents}>Find events near you</button>}
          </div>
        ) : (
          <ul className="tp-event-list">
            {upcoming.map((event) => (
              <li key={event.id} className="tp-event">
                <EventSummary event={event} />
                <div className="tp-event-actions">
                  <button type="button" className="tp-button" onClick={() => onOpenChat(event.id)}>Open group chat</button>
                  <button type="button" className="tp-button tp-button-link" onClick={() => onOpenEvent(event.id)}>View event <span aria-hidden="true">↗</span></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tp-past">
        <div className="tp-past-head">
          <h2 id="tp-past">Past <span className="tp-count">{past.length}</span></h2>
          <label className="tp-toggle">
            <input type="checkbox" role="switch" checked={historyPublic}
              onChange={(event) => update({ privacy: { ...profile.privacy, showAttendanceHistory: event.target.checked } })} />
            <span className="tp-toggle-track" aria-hidden="true" />
            <span className="tp-toggle-text"><span>Show past events on my public profile</span></span>
          </label>
        </div>
        <p className="tp-visibility" data-public={historyPublic || undefined} role="status">
          {historyPublic
            ? "Public: people who view your profile can see the events below."
            : "Private: only you can see the events below. Your public profile shows no attendance history."}
        </p>
        {past.length === 0 ? (
          <div className="tp-empty"><p>Events you've been to appear here afterwards, so you can endorse the people you met.</p></div>
        ) : (
          <ul className="tp-event-list">
            {past.map((event) => {
              const pending = pendingCount(event);
              return (
                <li key={event.id} className="tp-event tp-event-past">
                  <EventSummary event={event} />
                  <div className="tp-event-actions">
                    {event.attendees.length > 0 && (
                      <button type="button" className={pending ? "tp-button" : "tp-button tp-button-quiet"} onClick={() => onEndorse(event.id)}>
                        {pending ? `Endorse people you met (${pending})` : "Review your endorsements"}
                      </button>
                    )}
                    <button type="button" className="tp-button tp-button-quiet" onClick={() => onOpenChat(event.id)}>Open group chat</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

/** Headline in two parts: the plain half, then the handwritten half. */
function headline(count: number): [string, string] {
  if (count === 0) return ["Nothing planned.", "Yet."];
  if (count === 1) return ["One plan", "on the way."];
  return [`${count} plans`, "on the way."];
}

/** "Tomorrow", "In 5 days", "3 days ago". */
function relativeDay(date: Date): string {
  const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const days = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 0 ? `In ${days} days` : `${-days} days ago`;
}

function EventSummary({ event }: { event: MyEvent }) {
  const date = new Date(event.startsAt);
  return (
    <div className="tp-event-summary">
      <time className="tp-date" data-category={event.interestId ? interestCategory(event.interestId) : "other"} dateTime={event.startsAt}>
        <span>{date.toLocaleDateString("en-IE", { month: "short" })}</span>
        <strong>{date.getDate()}</strong>
      </time>
      <div>
        <p className="tp-when">{relativeDay(date)}</p>
        <h3>{event.interestId && <InterestBadge id={event.interestId} />}{event.title}</h3>
        <p className="tp-muted">{when.format(date)}, {event.locationName}</p>
        <p className="tp-event-meta">
          <span className="tp-role" data-role={event.role}>{date.getTime() < Date.now()
            ? (event.role === "hosting" ? "You hosted" : "You went")
            : (event.role === "hosting" ? "You're hosting" : "You're going")}</span>
          <span>{event.attendeeCount} people</span>
        </p>
      </div>
    </div>
  );
}
