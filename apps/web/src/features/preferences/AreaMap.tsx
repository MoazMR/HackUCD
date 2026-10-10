import { MAX_RADIUS_KM, MIN_RADIUS_KM } from "./areas";

/**
 * A wide, stylised map band. It is an illustration, not a real map: the shaded
 * patch stands for the public area and the dashed ring grows with the travel radius.
 * There is deliberately no pin.
 */
export function AreaMap({ label, radiusKm }: { label: string; radiusKm: number }) {
  const ring = 52 + ((radiusKm - MIN_RADIUS_KM) / (MAX_RADIUS_KM - MIN_RADIUS_KM)) * 150;
  return (
    <div className="tp-map">
      <svg viewBox="0 0 800 360" preserveAspectRatio="xMidYMid slice" role="img"
        aria-label={`Illustrated map. Others see "${label}" as a shaded area, never a pin. Travel radius ${radiusKm} kilometres.`}>
        <rect width="800" height="360" className="tp-map-land" />
        <path className="tp-map-park" d="M610 30 q70 -20 110 30 q30 50 -20 90 q-60 30 -110 -10 q-30 -60 20 -110z" />
        <path className="tp-map-park" d="M70 230 q50 -30 100 0 q30 40 0 80 q-60 30 -110 0 q-20 -50 10 -80z" />
        <path className="tp-map-water" d="M-20 300 C120 250 220 330 380 290 S640 230 820 280" />
        <g className="tp-map-streets">
          <path d="M-20 90 C160 70 320 130 820 96" /><path d="M-20 190 C200 170 420 220 820 180" />
          <path d="M150 -20 C170 120 130 240 160 380" /><path d="M330 -20 C310 110 350 250 320 380" />
          <path d="M520 -20 C500 120 540 240 510 380" /><path d="M690 -20 C700 140 670 250 700 380" />
        </g>
        <g className="tp-map-lanes">
          <path d="M-20 140 L820 150" /><path d="M-20 250 L820 236" /><path d="M240 -20 L250 380" /><path d="M430 -20 L420 380" /><path d="M610 -20 L600 380" />
        </g>
        <circle className="tp-ring" cx="560" cy="170" r={ring} />
        <circle className="tp-blob" cx="560" cy="170" r="46" />
      </svg>
      <p className="tp-map-label"><strong>{label}</strong><span>{radiusKm} km travel radius</span></p>
    </div>
  );
}
