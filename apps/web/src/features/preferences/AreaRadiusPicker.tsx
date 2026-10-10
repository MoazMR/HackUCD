import { useId, useState } from "react";
import { AREAS, MAX_RADIUS_KM, MIN_RADIUS_KM, areaName, locateApproximateArea } from "./areas";

type Props = {
  areaId: string;
  radiusKm: number;
  onAreaChange: (areaId: string) => void;
  onRadiusChange: (radiusKm: number) => void;
  error?: string;
};

/** Area + travel radius, with a drawing that shows how coarse the public location is. */
export function AreaRadiusPicker({ areaId, radiusKm, onAreaChange, onRadiusChange, error }: Props) {
  const areaField = useId();
  const radiusField = useId();
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "problem"; text: string }>();

  async function useMyLocation() {
    setLocating(true);
    setNotice(undefined);
    const result = await locateApproximateArea();
    setLocating(false);
    if (result.ok) {
      onAreaChange(result.areaId);
      setNotice({ tone: "ok", text: `Set to ${areaName(result.areaId)}. Your exact position was not kept.` });
    } else {
      setNotice({ tone: "problem", text: result.message });
    }
  }

  return (
    <div className="tp-area">
      <div className="tp-area-fields">
        <div className="tp-field">
          <label className="tp-label" htmlFor={areaField}>Your area</label>
          <div className="tp-inline">
            <select id={areaField} value={areaId} onChange={(event) => onAreaChange(event.target.value)} aria-invalid={Boolean(error)}>
              <option value="">Choose an area</option>
              {AREAS.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
            <button type="button" className="tp-button tp-button-quiet" onClick={useMyLocation} disabled={locating}>
              {locating ? "Finding your area…" : "Use my location"}
            </button>
          </div>
          {error && <p className="tp-error" role="alert">{error}</p>}
          {notice && <p className={notice.tone === "ok" ? "tp-hint" : "tp-error"} role="status">{notice.text}</p>}
        </div>
        <div className="tp-field">
          <label className="tp-label" htmlFor={radiusField}>How far you'll travel</label>
          <div className="tp-inline">
            <input id={radiusField} type="range" min={MIN_RADIUS_KM} max={MAX_RADIUS_KM} step={1} value={radiusKm}
              onChange={(event) => onRadiusChange(Number(event.target.value))} aria-valuetext={`${radiusKm} kilometres`} />
            <output className="tp-radius-value" htmlFor={radiusField}>{radiusKm} km</output>
          </div>
          <p className="tp-hint">Events further away than this are left out of your feed.</p>
        </div>
      </div>
      <AreaDrawing label={areaId ? areaName(areaId) : "No area yet"} radiusKm={radiusKm} />
    </div>
  );
}

function AreaDrawing({ label, radiusKm }: { label: string; radiusKm: number }) {
  const ring = 34 + ((radiusKm - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 76;
  return (
    <figure className="tp-area-drawing">
      <svg viewBox="0 0 240 240" role="img" aria-label={`Others see "${label}" as a wide area, not a pin. Travel radius ${radiusKm} kilometres.`}>
        <g className="tp-streets">
          <path d="M-10 70 C60 60 120 96 250 78" /><path d="M-10 168 C70 150 150 190 250 160" />
          <path d="M62 -10 C70 80 48 150 66 250" /><path d="M170 -10 C158 70 186 160 172 250" />
          <path d="M-10 118 L250 126" />
        </g>
        <circle className="tp-ring" cx="120" cy="120" r={ring} />
        <circle className="tp-blob" cx="120" cy="120" r="30" />
      </svg>
      <figcaption>
        <strong>{label}</strong>
        <span>What others see: the shaded area. Never a pin, street or address.</span>
      </figcaption>
    </figure>
  );
}
