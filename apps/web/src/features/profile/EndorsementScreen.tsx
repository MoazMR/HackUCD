import { useState } from "react";
import { interestLabel } from "../preferences/interests";
import { Avatar } from "./Avatar";
import { useProfile } from "./ProfileStore";
import { submitEndorsement, type EndorsementSubmission } from "./trustApi";
import type { Attendee, EndorsementDecision, MyEvent } from "./types";
import "./profile.css";

const REPORT_REASONS = [
  "Made me or someone else feel unsafe",
  "Harassment or abusive behaviour",
  "Didn't match their profile",
  "Asked for money or personal details",
  "Something else"
];

const DONE_COPY: Record<EndorsementDecision, string> = {
  endorsed: "Endorsed. This counts towards their trust score.",
  not_endorsed: "No endorsement given. They are not told and nothing else happens.",
  reported: "Report sent for review. A moderator will look at it. Nobody is banned automatically."
};

/** After an event: endorse the people you met, skip, or report a problem for review. */
export function EndorsementScreen({ event, onDone }: { event: MyEvent; onDone: () => void }) {
  return (
    <section className="pf pf-endorse" aria-labelledby="pf-endorse-heading">
      <header className="pf-page-head">
        <button type="button" className="pf-button pf-button-text" onClick={onDone}>Back to My Events</button>
        <h1 id="pf-endorse-heading" className="pf-title">Who made {event.title} better?</h1>
        <p className="pf-lede">Endorse the people you'd happily meet again. Endorsements are public as a count only, never as a list of names.</p>
      </header>
      <p className="pf-callout pf-callout-warn">
        Reports are reviewed by a moderator before anything happens. A report on its own never bans or removes anyone, and we may contact you for details.
        If someone is in immediate danger, call 999 or 112.
      </p>
      {event.attendees.length === 0
        ? <div className="pf-empty"><p>Nobody else is listed for this event, so there's no one to endorse.</p></div>
        : <ul className="pf-people">{event.attendees.map((person) => <PersonRow key={person.id} eventId={event.id} person={person} />)}</ul>}
      <div className="pf-actions"><button type="button" className="pf-button" onClick={onDone}>Done</button></div>
    </section>
  );
}

function PersonRow({ eventId, person }: { eventId: string; person: Attendee }) {
  const { profile, update } = useProfile();
  const key = `${eventId}:${person.id}`;
  const decision = profile.endorsementDecisions[key];
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function send(submission: EndorsementSubmission, result: EndorsementDecision) {
    setBusy(true);
    setError(undefined);
    try {
      await submitEndorsement(submission);
      update({ endorsementDecisions: { ...profile.endorsementDecisions, [key]: result } });
      setReporting(false);
    } catch {
      setError(result === "reported"
        ? "Your report wasn't sent. Check your connection and send it again. What you wrote is still here."
        : "That wasn't saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function sendReport() {
    if (!reason) { setError("Choose what happened so a moderator knows what to look at."); return; }
    void send({ kind: "report", eventId, personId: person.id, reason, details: details.trim() }, "reported");
  }

  return (
    <li className="pf-person" data-decision={decision}>
      <div className="pf-person-head">
        <Avatar name={person.name} size={48} />
        <div>
          <h2>{person.name}</h2>
          <p className="pf-muted">{person.verified ? "ID check passed" : "ID not checked"}, {person.interests.map(interestLabel).join(", ")}</p>
        </div>
      </div>

      {decision ? (
        <p className="pf-decision" role="status">{DONE_COPY[decision]}</p>
      ) : reporting ? (
        <div className="pf-report">
          <div className="pf-field">
            <label className="pf-label" htmlFor={`reason-${key}`}>What happened?</label>
            <select id={`reason-${key}`} value={reason} onChange={(event) => { setReason(event.target.value); setError(undefined); }}>
              <option value="">Choose a reason</option>
              {REPORT_REASONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor={`details-${key}`}>Anything a moderator should know <span className="pf-optional">optional</span></label>
            <textarea id={`details-${key}`} rows={3} maxLength={500} value={details} onChange={(event) => setDetails(event.target.value)} />
            <p className="pf-hint">{person.name} is not shown your report or told who sent it.</p>
          </div>
          <div className="pf-actions">
            <button type="button" className="pf-button pf-button-quiet" onClick={() => { setReporting(false); setError(undefined); }} disabled={busy}>Cancel</button>
            <button type="button" className="pf-button pf-button-danger" onClick={sendReport} disabled={busy}>{busy ? "Sending…" : "Send report for review"}</button>
          </div>
        </div>
      ) : (
        <div className="pf-person-actions">
          <button type="button" className="pf-button" disabled={busy}
            onClick={() => send({ kind: "endorse", eventId, personId: person.id }, "endorsed")}>Endorse {person.name}</button>
          <button type="button" className="pf-button pf-button-quiet" disabled={busy}
            onClick={() => send({ kind: "no_endorsement", eventId, personId: person.id }, "not_endorsed")}>Don't endorse</button>
          <button type="button" className="pf-button pf-button-text" disabled={busy} onClick={() => setReporting(true)}>Report a problem</button>
        </div>
      )}
      {error && <p className="pf-error" role="alert">{error}</p>}
    </li>
  );
}
