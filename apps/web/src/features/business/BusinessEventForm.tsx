import type { EventCategory } from "@social-outings/shared";
import { AREAS } from "../events/geo";
import { INTERESTS } from "../events/types";
import type { BusinessEventDraft, FieldErrors } from "./types";

const CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "sport", label: "Sport" },
  { value: "food", label: "Food and drink" },
  { value: "music", label: "Music" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" }
];

export const EMPTY_DRAFT: BusinessEventDraft = {
  businessName: "",
  title: "",
  description: "",
  startsAt: "",
  venueName: "",
  venueAddressArea: "",
  category: "",
  interest: "",
  priceEur: "0",
  capacity: "20"
};

/** Synthetic sample so a demo can be filled in one click. */
export function sampleDraft(): BusinessEventDraft {
  const start = new Date(Date.now() + 5 * 24 * 3600 * 1000);
  start.setHours(19, 0, 0, 0);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return {
    businessName: "Smithfield Games Café",
    title: "Thursday poker and board games night",
    description: "Friendly no-money poker tables and new board games. Beginners welcome; staff teach the rules.",
    startsAt: local,
    venueName: "Smithfield Games Café",
    venueAddressArea: "Smithfield",
    category: "social",
    interest: "poker",
    priceEur: "5",
    capacity: "24"
  };
}

export function validateDraft(draft: BusinessEventDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.businessName.trim().length < 2) errors.businessName = "Enter your business name.";
  if (draft.title.trim().length < 3) errors.title = "Give the event a title (at least 3 characters).";
  if (draft.title.trim().length > 80) errors.title = "Keep the title under 80 characters.";
  if (draft.venueName.trim().length < 2) errors.venueName = "Business events must happen at a named venue.";
  if (!draft.venueAddressArea) errors.venueAddressArea = "Choose the neighbourhood.";
  if (!draft.category) errors.category = "Choose a category.";
  if (!draft.interest) errors.interest = "Choose what the event is about.";
  const price = Number(draft.priceEur || 0);
  if (!Number.isFinite(price) || price < 0 || price > 500) errors.priceEur = "Enter a price from €0 (free) to €500.";
  const capacity = Number(draft.capacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 500) errors.capacity = "Enter a whole number from 2 to 500.";
  if (draft.description.length > 500) errors.description = "Keep the description under 500 characters.";
  if (!draft.startsAt) errors.startsAt = "Choose a start date and time.";
  else if (new Date(draft.startsAt).getTime() <= Date.now()) errors.startsAt = "The event must start in the future.";
  return errors;
}

type Props = {
  draft: BusinessEventDraft;
  errors: FieldErrors;
  saving: boolean;
  onChange: (draft: BusinessEventDraft) => void;
  onSubmit: () => void;
  onFillSample: () => void;
};

export function BusinessEventForm({ draft, errors, saving, onChange, onSubmit, onFillSample }: Props) {
  const set = (key: keyof BusinessEventDraft) => (event: { target: { value: string } }) =>
    onChange({ ...draft, [key]: event.target.value });

  const field = (key: keyof BusinessEventDraft, label: string, input: JSX.Element, hint?: string) => (
    <div className={`biz-field${errors[key] ? " biz-field--error" : ""}`}>
      <label htmlFor={`biz-${key}`}>{label}</label>
      {input}
      {errors[key] ? (
        <p className="biz-field__error" id={`biz-${key}-error`}>{errors[key]}</p>
      ) : hint ? (
        <p className="biz-field__hint" id={`biz-${key}-hint`}>{hint}</p>
      ) : null}
    </div>
  );

  const describedBy = (key: keyof BusinessEventDraft) => (errors[key] ? `biz-${key}-error` : `biz-${key}-hint`);

  return (
    <form
      className="biz-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="biz-form__grid">
        {field("businessName", "Business name",
          <input id="biz-businessName" value={draft.businessName} onChange={set("businessName")} aria-invalid={Boolean(errors.businessName)} aria-describedby={describedBy("businessName")} autoComplete="organization" />,
          "Shown on the Promoted label so people know who paid.")}
        {field("title", "Event title",
          <input id="biz-title" value={draft.title} onChange={set("title")} maxLength={80} aria-invalid={Boolean(errors.title)} aria-describedby={describedBy("title")} />)}
        {field("venueName", "Venue",
          <input id="biz-venueName" value={draft.venueName} onChange={set("venueName")} aria-invalid={Boolean(errors.venueName)} aria-describedby={describedBy("venueName")} />)}
        {field("venueAddressArea", "Area",
          <select id="biz-venueAddressArea" value={draft.venueAddressArea} onChange={set("venueAddressArea")} aria-invalid={Boolean(errors.venueAddressArea)} aria-describedby={describedBy("venueAddressArea")}>
            <option value="">Choose…</option>
            {AREAS.map((area) => <option key={area.name} value={area.name}>{area.name}</option>)}
          </select>,
          "Only the neighbourhood is shown publicly.")}
        {field("startsAt", "Starts",
          <input id="biz-startsAt" type="datetime-local" value={draft.startsAt} onChange={set("startsAt")} aria-invalid={Boolean(errors.startsAt)} aria-describedby={describedBy("startsAt")} />)}
        {field("category", "Category",
          <select id="biz-category" value={draft.category} onChange={set("category")} aria-invalid={Boolean(errors.category)} aria-describedby={describedBy("category")}>
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>)}
        {field("interest", "What it's about",
          <select id="biz-interest" value={draft.interest} onChange={set("interest")} aria-invalid={Boolean(errors.interest)} aria-describedby={describedBy("interest")}>
            <option value="">Choose…</option>
            {INTERESTS.map((interest) => <option key={interest} value={interest}>{interest[0].toUpperCase() + interest.slice(1)}</option>)}
          </select>,
          "Promotion reaches people who chose this interest.")}
        <div className="biz-form__pair">
          {field("priceEur", "Price (€)",
            <input id="biz-priceEur" type="number" min={0} max={500} step="0.5" inputMode="decimal" value={draft.priceEur} onChange={set("priceEur")} aria-invalid={Boolean(errors.priceEur)} aria-describedby={describedBy("priceEur")} />,
            "0 means free.")}
          {field("capacity", "Spaces",
            <input id="biz-capacity" type="number" min={2} max={500} step={1} inputMode="numeric" value={draft.capacity} onChange={set("capacity")} aria-invalid={Boolean(errors.capacity)} aria-describedby={describedBy("capacity")} />)}
        </div>
      </div>
      {field("description", "Description",
        <textarea id="biz-description" rows={3} value={draft.description} onChange={set("description")} maxLength={500} aria-invalid={Boolean(errors.description)} aria-describedby={describedBy("description")} />,
        `${draft.description.length}/500`)}
      <div className="biz-actions">
        <button type="submit" disabled={saving}>{saving ? "Saving draft…" : "Save event draft"}</button>
        <button type="button" className="biz-button--quiet" onClick={onFillSample}>Fill with sample venue event</button>
      </div>
      <p className="biz-fineprint">Your business event stays an unpublished draft until payment is confirmed. Payment publishes it and adds the boost.</p>
    </form>
  );
}
