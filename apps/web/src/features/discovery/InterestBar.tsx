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
    </div>
  );
}
