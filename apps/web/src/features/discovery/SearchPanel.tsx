import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { AREAS } from "../events/geo";
import { describeActiveFilters } from "../events/recommend";
import {
  CATEGORY_LABELS,
  DATE_LABELS,
  RADIUS_OPTIONS_KM,
  TIME_LABELS,
  type CategoryFilter,
  type DateFilter,
  type DiscoveryFilters,
  type TimeFilter
} from "../events/types";

type Props = {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  onClear: () => void;
  onClose: () => void;
  resultCount: number;
};

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All types" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value: value as CategoryFilter, label }))
];
const DATE_OPTIONS = Object.keys(DATE_LABELS) as DateFilter[];
const TIME_OPTIONS = Object.keys(TIME_LABELS) as TimeFilter[];

/** The search screen: keywords plus event type, date, time and location filters. */
export function SearchPanel({ filters, onChange, onClear, onClose, resultCount }: Props) {
  const uid = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const active = describeActiveFilters(filters);

  useEffect(() => inputRef.current?.focus(), []);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      // Browsers clear <input type="search"> on Escape; keep the keywords and just close.
      event.preventDefault();
      onClose();
    }
  }

  return (
    <section className="tp-searchpanel" aria-labelledby={`${uid}-title`} onKeyDown={onKeyDown}>
      <div className="tp-searchpanel__head">
        <h2 id={`${uid}-title`} className="tp-h2">Search events</h2>
        <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={onClose}>Done</button>
      </div>

      <div className="tp-search tp-search--large">
        <label htmlFor={`${uid}-q`} className="tp-visually-hidden">Keywords</label>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        <input
          id={`${uid}-q`}
          ref={inputRef}
          type="search"
          value={filters.query}
          onChange={(event) => set("query", event.target.value)}
          placeholder="Search by keyword, e.g. padel, brunch, Ranelagh"
          autoComplete="off"
        />
      </div>

      <div className="tp-filtergrid">
        <fieldset className="tp-fieldset">
          <legend>Event type</legend>
          <div className="tp-chiprow">
            {CATEGORY_OPTIONS.map((option) => (
              <button key={option.value} type="button" className="tp-chip" aria-pressed={filters.category === option.value} onClick={() => set("category", option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="tp-fieldset">
          <legend>Date</legend>
          <div className="tp-chiprow">
            {DATE_OPTIONS.map((option) => (
              <button key={option} type="button" className="tp-chip" aria-pressed={filters.date === option} onClick={() => set("date", option)}>
                {DATE_LABELS[option]}
              </button>
            ))}
          </div>
          {filters.date === "custom" && (
            <div className="tp-field tp-field--inline">
              <label htmlFor={`${uid}-date`}>Choose a day</label>
              <input id={`${uid}-date`} type="date" value={filters.customDate} onChange={(event) => set("customDate", event.target.value)} />
            </div>
          )}
        </fieldset>

        <fieldset className="tp-fieldset">
          <legend>Time</legend>
          <div className="tp-chiprow">
            {TIME_OPTIONS.map((option) => (
              <button key={option} type="button" className="tp-chip" aria-pressed={filters.timeOfDay === option} onClick={() => set("timeOfDay", option)}>
                {TIME_LABELS[option]}
              </button>
            ))}
          </div>
          <p className="tp-muted tp-hint">Morning is before 12:00, afternoon 12:00 to 17:00, evening after 17:00.</p>
        </fieldset>

        <fieldset className="tp-fieldset">
          <legend>Location</legend>
          <div className="tp-locrow">
            <div className="tp-field">
              <label htmlFor={`${uid}-area`}>Area</label>
              <select id={`${uid}-area`} value={filters.area} onChange={(event) => set("area", event.target.value)}>
                <option value="any">Anywhere</option>
                {AREAS.map((area) => <option key={area.name} value={area.name}>{area.name}</option>)}
              </select>
            </div>
            <div className="tp-field">
              <label htmlFor={`${uid}-radius`}>Travel radius</label>
              <select id={`${uid}-radius`} value={filters.radiusKm} onChange={(event) => set("radiusKm", Number(event.target.value))}>
                {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={km}>within {km} km</option>)}
              </select>
            </div>
            <button type="button" className="tp-chip tp-chip--toggle" aria-pressed={filters.freeOnly} onClick={() => set("freeOnly", !filters.freeOnly)}>
              Free only
            </button>
          </div>
        </fieldset>
      </div>

      <div className="tp-searchpanel__foot">
        <p role="status" className="tp-results">
          {resultCount} {resultCount === 1 ? "event matches" : "events match"}
          {active.length > 0 && <span className="tp-muted"> · {active.join(" · ")}</span>}
        </p>
        <button type="button" className="tp-btn tp-btn--ghost" onClick={onClear} disabled={active.length === 0 && filters.radiusKm === 10}>
          Clear all
        </button>
      </div>
    </section>
  );
}
