import { useId, useState } from "react";
import { USER_ORIGIN } from "../events/geo";
import { describeActiveFilters } from "../events/recommend";
import { INTERESTS, type DiscoveryFilters } from "../events/types";

type Props = {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  onClear: () => void;
};

/**
 * Slim strip under the page heading: where you are, which filters are active (edit them
 * from the search icon), and the interests that drive "For You" recommendations.
 */
export function InterestBar({ filters, onChange, onClear }: Props) {
  const active = describeActiveFilters(filters);
  const [open, setOpen] = useState(false);
  const panelId = useId();

  function toggleInterest(interest: string) {
    const has = filters.interests.includes(interest);
    onChange({
      ...filters,
      interests: has ? filters.interests.filter((i) => i !== interest) : [...filters.interests, interest]
    });
  }

  return (
    <div className="tp-filters">
      <p className="tp-locationline">
        <span className="tp-pin" aria-hidden="true" />
        Near {USER_ORIGIN.name} <small>(approximate)</small> · within {filters.radiusKm} km
      </p>

      {active.length > 0 && (
        <p className="tp-activefilters">
          <span className="tp-chiprow__label">Filtering by</span>
          {active.map((label) => <span className="tp-tag tp-tag--soft" key={label}>{label}</span>)}
          <a href="#/search">Edit</a>
          <button type="button" className="tp-linkbtn" onClick={onClear}>Clear</button>
        </p>
      )}

      <div>
        <button
          type="button"
          className="tp-disclosure"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          Your interests <span className="tp-disclosure__count">{filters.interests.length}</span>
          <svg aria-hidden="true" viewBox="0 0 12 12" width="12" height="12"><path d="m2 4 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        {open && (
          <div id={panelId} className="tp-chiprow tp-chiprow--panel" role="group" aria-label="Your interests">
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
    </div>
  );
}
