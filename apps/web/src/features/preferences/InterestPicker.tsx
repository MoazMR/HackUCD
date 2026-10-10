import { InterestBadge } from "./InterestIcon";
import { INTERESTS } from "./interests";

type Props = { selected: string[]; onChange: (next: string[]) => void; legend?: string; error?: string };

export function InterestPicker({ selected, onChange, legend = "Interests", error }: Props) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }
  return (
    <fieldset className="pf-fieldset" aria-describedby={error ? "pf-interest-error" : undefined}>
      <legend className="pf-label">{legend}</legend>
      <div className="pf-chips">
        {INTERESTS.map((interest) => (
          <label className="pf-chip" key={interest.id}>
            <input type="checkbox" checked={selected.includes(interest.id)} onChange={() => toggle(interest.id)} />
            <span><InterestBadge id={interest.id} />{interest.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="pf-error" id="pf-interest-error" role="alert">{error}</p>}
    </fieldset>
  );
}
