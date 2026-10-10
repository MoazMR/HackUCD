import { useId } from "react";
import { USER_ORIGIN } from "../events/geo";
import {
  CATEGORY_LABELS,
  INTERESTS,
  RADIUS_OPTIONS_KM,
  type CategoryFilter,
  type DiscoveryFilters
} from "../events/types";

type Props = {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  /** Hide the interests row, e.g. when it isn't relevant. */
  showInterests?: boolean;
};

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All" },
  ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value: value as CategoryFilter, label }))
];

export function FilterBar({ filters, onChange, showInterests = true }: Props) {
  const searchId = useId();
  const radiusId = useId();
  const set = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) =>
    onChange({ ...filters, [key]: value });

  function toggleInterest(interest: string) {
    const has = filters.interests.includes(interest);
    set("interests", has ? filters.interests.filter((i) => i !== interest) : [...filters.interests, interest]);
  }

  return (
    <div className="tp-filters">
      <div className="tp-searchrow">
        <div className="tp-search">
          <label htmlFor={searchId} className="tp-visually-hidden">Search events, categories and areas</label>
          <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <input
            id={searchId}
            type="search"
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Search events, categories or areas"
            autoComplete="off"
          />
        </div>
        <div className="tp-location">
          <span className="tp-pin" aria-hidden="true" />
          <span>Near {USER_ORIGIN.name} <small>(approximate)</small></span>
          <label htmlFor={radiusId} className="tp-visually-hidden">Travel radius</label>
          <select id={radiusId} value={filters.radiusKm} onChange={(event) => set("radiusKm", Number(event.target.value))}>
            {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={km}>within {km} km</option>)}
          </select>
        </div>
      </div>

      <div className="tp-chiprow" role="group" aria-label="Filter by category">
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className="tp-chip"
            aria-pressed={filters.category === option.value}
            onClick={() => set("category", option.value)}
          >
            {option.label}
          </button>
        ))}
        <button type="button" className="tp-chip tp-chip--toggle" aria-pressed={filters.freeOnly} onClick={() => set("freeOnly", !filters.freeOnly)}>
          Free only
        </button>
      </div>

      {showInterests && (
        <div className="tp-chiprow" role="group" aria-label="Your interests">
          <span className="tp-chiprow__label">Your interests</span>
          {INTERESTS.map((interest) => (
            <button
              key={interest}
              type="button"
              className="tp-chip tp-chip--interest"
              aria-pressed={filters.interests.includes(interest)}
              onClick={() => toggleInterest(interest)}
            >
              {interest}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
