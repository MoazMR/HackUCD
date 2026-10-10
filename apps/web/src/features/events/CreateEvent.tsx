import { useId, useState, type FormEvent } from "react";
import { AREAS } from "./geo";
import { CATEGORY_LABELS, INTERESTS, type DiscoveryEvent, type NewEventDraft } from "./types";

type Props = {
  onCreate: (draft: NewEventDraft) => Promise<DiscoveryEvent>;
  onCreated: (event: DiscoveryEvent) => void;
  backHref: string;
};

type Errors = Partial<Record<keyof NewEventDraft, string>>;

function defaultStart(): string {
  const date = new Date(Date.now() + 48 * 3_600_000);
  date.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00`;
}

export function validateDraft(draft: NewEventDraft, now: Date = new Date()): Errors {
  const errors: Errors = {};
  if (draft.title.trim().length < 3) errors.title = "Give your event a title (at least 3 characters).";
  if (draft.title.trim().length > 80) errors.title = "Keep the title under 80 characters.";
  if (draft.description.trim().length < 10) errors.description = "Add a short description (at least 10 characters).";
  if (!draft.locationName.trim()) errors.locationName = "Add a venue name, like “Herbert Park Courts”.";
  const start = new Date(draft.startsAt);
  if (!draft.startsAt || Number.isNaN(start.getTime())) errors.startsAt = "Choose a date and time.";
  else if (start.getTime() <= now.getTime()) errors.startsAt = "Choose a time in the future.";
  if (!Number.isInteger(draft.capacity) || draft.capacity < 2 || draft.capacity > 200) {
    errors.capacity = "Capacity must be a whole number from 2 to 200.";
  }
  if (!Number.isFinite(draft.priceEur) || draft.priceEur < 0 || draft.priceEur > 500) {
    errors.priceEur = "Price must be between €0 and €500.";
  }
  return errors;
}

export function CreateEvent({ onCreate, onCreated, backHref }: Props) {
  const uid = useId();
  const [draft, setDraft] = useState<NewEventDraft>({
    title: "",
    description: "",
    category: "sport",
    interest: INTERESTS[0],
    area: AREAS[0].name,
    locationName: "",
    startsAt: defaultStart(),
    capacity: 8,
    priceEur: 0
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const set = <K extends keyof NewEventDraft>(key: K, value: NewEventDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }
    setSaving(true);
    setSubmitError(undefined);
    try {
      onCreated(await onCreate(draft));
    } catch (problem) {
      setSubmitError(problem instanceof Error ? problem.message : "Could not publish the event.");
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof NewEventDraft) => ({
    id: `${uid}-${key}`,
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${uid}-${key}-error` : undefined
  });
  const fieldError = (key: keyof NewEventDraft) =>
    errors[key] ? <p className="tp-error" id={`${uid}-${key}-error`} role="alert">{errors[key]}</p> : null;

  return (
    <div className="tp-create">
      <a className="tp-back" href={backHref}>← Back to events</a>
      <h2 className="tp-detail__title">Create an event</h2>
      <p className="tp-muted">Share a plan and let people nearby join. You'll be added as the host and can chat with everyone who joins.</p>

      <form className="tp-form" onSubmit={submit} noValidate>
        <div className="tp-field">
          <label htmlFor={`${uid}-title`}>Title</label>
          <input {...field("title")} value={draft.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Saturday padel doubles" />
          {fieldError("title")}
        </div>
        <div className="tp-field">
          <label htmlFor={`${uid}-description`}>What's the plan?</label>
          <textarea {...field("description")} rows={3} value={draft.description} onChange={(e) => set("description", e.target.value)} placeholder="Level, what to bring, what to expect" />
          {fieldError("description")}
        </div>
        <div className="tp-form__row">
          <div className="tp-field">
            <label htmlFor={`${uid}-category`}>Category</label>
            <select {...field("category")} value={draft.category} onChange={(e) => set("category", e.target.value as NewEventDraft["category"])}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="tp-field">
            <label htmlFor={`${uid}-interest`}>Interest</label>
            <select {...field("interest")} value={draft.interest} onChange={(e) => set("interest", e.target.value)}>
              {INTERESTS.map((interest) => <option key={interest}>{interest}</option>)}
            </select>
          </div>
        </div>
        <div className="tp-form__row">
          <div className="tp-field">
            <label htmlFor={`${uid}-area`}>Area</label>
            <select {...field("area")} value={draft.area} onChange={(e) => set("area", e.target.value)}>
              {AREAS.map((area) => <option key={area.name}>{area.name}</option>)}
            </select>
          </div>
          <div className="tp-field">
            <label htmlFor={`${uid}-locationName`}>Venue</label>
            <input {...field("locationName")} value={draft.locationName} onChange={(e) => set("locationName", e.target.value)} placeholder="Public venue name" />
            {fieldError("locationName")}
          </div>
        </div>
        <div className="tp-form__row tp-form__row--3">
          <div className="tp-field">
            <label htmlFor={`${uid}-startsAt`}>Starts</label>
            <input {...field("startsAt")} type="datetime-local" value={draft.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            {fieldError("startsAt")}
          </div>
          <div className="tp-field">
            <label htmlFor={`${uid}-capacity`}>Capacity</label>
            <input {...field("capacity")} type="number" min={2} max={200} value={draft.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
            {fieldError("capacity")}
          </div>
          <div className="tp-field">
            <label htmlFor={`${uid}-priceEur`}>Price (€, 0 = free)</label>
            <input {...field("priceEur")} type="number" min={0} max={500} step="0.5" value={draft.priceEur} onChange={(e) => set("priceEur", Number(e.target.value))} />
            {fieldError("priceEur")}
          </div>
        </div>
        <p className="tp-muted">Only the area is shown publicly. Don't put your home address or phone number in the description.</p>
        <div className="tp-form__actions">
          <button type="submit" disabled={saving} className="tp-btn tp-btn--primary tp-btn--lg">{saving ? "Publishing…" : "Publish event"}</button>
          <a className="tp-btn tp-btn--ghost" href={backHref}>Cancel</a>
        </div>
        {submitError && <p className="tp-error" role="alert">{submitError}</p>}
      </form>
    </div>
  );
}
