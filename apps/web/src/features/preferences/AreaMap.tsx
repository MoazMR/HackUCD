import { InterestBadge } from "./InterestIcon";
import { MAX_RADIUS_KM, MIN_RADIUS_KM } from "./areas";
import { interestLabel } from "./interests";

/** Fixed spots for decorative markers, as percentages of the map. */
const MARKER_SPOTS = [[55, 30], [86, 62], [46, 70], [80, 22], [64, 84], [93, 40]];

/** Minor streets: a loose, slightly irregular grid so the illustration reads as a city. */
const MINOR_STREETS = [
  "M-10 38 L810 52", "M-10 118 L810 104", "M-10 222 L400 232 L810 214", "M-10 318 L810 330",
  "M52 -10 L64 370", "M118 -10 L104 370", "M214 -10 L226 370", "M296 -10 L288 370",
  "M392 -10 L404 370", "M462 -10 L452 370", "M586 -10 L598 370", "M648 -10 L640 370", "M752 -10 L764 370",
  "M400 232 L520 300 L640 370", "M226 150 L330 60 L404 -10", "M598 150 L700 250 L810 290"
];
const MAIN_STREETS = ["M-10 76 C200 60 420 96 810 78", "M-10 266 C220 250 480 286 810 256", "M168 -10 C182 120 150 240 174 370", "M530 -10 C512 130 548 240 522 370", "M704 -10 C716 120 690 250 712 370"];
const AVENUES = ["M-10 170 C180 150 430 196 810 164", "M336 -10 C318 110 356 250 330 370"];

/**
 * A wide, stylised city map in the manner of a consumer maps app: pale land,
 * white streets, green parks, blue water, and bold round markers.
 * It is an illustration, not real geography. Markers stand for the kinds of
 * events the person follows. No marker ever stands for the person: their own
 * position is never drawn, only a soft shaded area.
 */
export function AreaMap({ label, radiusKm, interests = [] }: { label: string; radiusKm: number; interests?: string[] }) {
  const ring = 52 + ((radiusKm - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 150;
  return (
    <div className="pf-map">
      <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" role="img"
        aria-label={`Illustrated map. Others see "${label}" as a shaded area, never as a marker. Travel radius ${radiusKm} kilometres.`}>
        <rect width="800" height="360" className="pf-map-land" />
        <g className="pf-map-blocks">
          <rect x="236" y="62" width="48" height="34" rx="4" /><rect x="412" y="116" width="36" height="42" rx="4" />
          <rect x="606" y="226" width="30" height="24" rx="4" /><rect x="72" y="128" width="26" height="30" rx="4" />
          <rect x="468" y="298" width="44" height="22" rx="4" /><rect x="722" y="96" width="24" height="48" rx="4" />
        </g>
        <path className="pf-map-park" d="M608 10 q78 -22 122 32 q30 52 -22 94 q-64 30 -116 -12 q-30 -62 16 -114z" />
        <path className="pf-map-park" d="M62 236 q54 -30 104 2 q28 40 -2 78 q-60 28 -108 0 q-22 -48 6 -80z" />
        <path className="pf-map-park" d="M352 300 h84 q10 0 10 10 v40 h-104 v-40 q0 -10 10 -10z" />
        <path className="pf-map-water" d="M-20 312 C120 262 230 338 390 296 S650 238 820 286" />
        <g className="pf-map-minor">{MINOR_STREETS.map((d) => <path key={d} d={d} />)}</g>
        <g className="pf-map-main-casing">{MAIN_STREETS.map((d) => <path key={d} d={d} />)}</g>
        <g className="pf-map-main">{MAIN_STREETS.map((d) => <path key={d} d={d} />)}</g>
        <g className="pf-map-avenue-casing">{AVENUES.map((d) => <path key={d} d={d} />)}</g>
        <g className="pf-map-avenue">{AVENUES.map((d) => <path key={d} d={d} />)}</g>
        <circle className="pf-ring" cx="560" cy="170" r={ring} />
        <circle className="pf-blob" cx="560" cy="170" r="46" />
      </svg>
      <ul className="pf-pins" aria-label="Kinds of events you follow">
        {interests.slice(0, MARKER_SPOTS.length).map((id, index) => (
          <li key={id} className="pf-pin" style={{ left: `${MARKER_SPOTS[index][0]}%`, top: `${MARKER_SPOTS[index][1]}%` }}>
            <InterestBadge id={id} />
            <span className="pf-pin-label">{interestLabel(id)}</span>
          </li>
        ))}
      </ul>
      <p className="pf-map-note" aria-hidden="true">somewhere in here-ish
        <svg viewBox="0 0 50 44"><path d="M6 4c-2 16 8 30 34 32M40 36l-10-2M40 36l-5-9" /></svg>
      </p>
      <p className="pf-map-place" aria-hidden="true">{label.replace(/ area$/, "")}</p>
      <p className="pf-map-label"><strong>{label}</strong><span>{radiusKm} km travel radius</span></p>
    </div>
  );
}
