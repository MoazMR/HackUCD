import { useState, type FormEvent } from "react";
import type { EventCategory, EventPlanResponse } from "@social-outings/shared";
import { useProfile } from "../profile/ProfileStore";
import { areaName } from "../preferences/areas";
import { api } from "../../lib/api";

const categories: Array<{ value: EventCategory; label: string }> = [
  { value: "social", label: "Social" }, { value: "sport", label: "Sport" },
  { value: "food", label: "Food" }, { value: "music", label: "Music" }, { value: "other", label: "Other" }
];

export function EventPlanner({ onBack }: { onBack: () => void }) {
  const { profile } = useProfile();
  const [goal, setGoal] = useState("");
  const [area, setArea] = useState(areaName(profile.areaId));
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<EventCategory>("social");
  const [attendeeCount, setAttendeeCount] = useState(8);
  const [budget, setBudget] = useState("");
  const [result, setResult] = useState<EventPlanResponse>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(undefined); setResult(undefined);
    try {
      setResult(await api.planEvent({ goal, area, date, category, attendeeCount, budget: budget || undefined }));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "The event planner is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="planner" aria-labelledby="planner-heading">
      <header className="section-heading planner-heading">
        <div><p className="eyebrow">Create event</p><h1 id="planner-heading">Plan a clear, welcoming outing.</h1></div>
        <button className="button-secondary" type="button" onClick={onBack}>Back to For You</button>
      </header>
      <div className="planner-grid">
        <form className="planner-form" onSubmit={submit}>
          <label>What do you want to do?<input required maxLength={160} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Beginner-friendly five-a-side" /></label>
          <label>Approximate area<input required maxLength={100} value={area} onChange={(event) => setArea(event.target.value)} /></label>
          <div className="field-row">
            <label>Date and time<input required type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} /></label>
            <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as EventCategory)}>{categories.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          </div>
          <div className="field-row">
            <label>Group size<input min={2} max={100} type="number" value={attendeeCount} onChange={(event) => setAttendeeCount(Number(event.target.value))} /></label>
            <label>Budget <span>(optional)</span><input maxLength={80} value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="Free or about €10 each" /></label>
          </div>
          <p className="form-note">Only these event details are sent to the server. No profile, ID, exact location, or private contact information is included.</p>
          <button disabled={busy} type="submit">{busy ? "Planning…" : "Generate event plan"}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
        </form>
        <aside className="plan-result" aria-live="polite">
          {!result ? <><p className="eyebrow">Plan preview</p><h2>Your draft will appear here</h2><p>ThirdPlace creates a concise description and host checklist. You stay in control of what is published.</p></> : <>
            <p className="eyebrow">{result.provider === "openrouter" ? "Generated with OpenRouter" : "Synthetic demo plan"}</p>
            <h2>{result.plan.title}</h2><p>{result.plan.description}</p>
            <p><strong>Suggested length:</strong> {result.plan.suggestedDurationMinutes} minutes</p>
            <h3>Host checklist</h3><ul>{result.plan.checklist.map((item) => <li key={item}>{item}</li>)}</ul>
            <p><strong>Why this works:</strong> {result.plan.rationale}</p>
            {result.notice && <p className="form-note">{result.notice}</p>}
          </>}
        </aside>
      </div>
    </section>
  );
}
