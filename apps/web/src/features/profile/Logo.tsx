import logoUrl from "./brand/thirdplace-logo.png";

/** The ThirdPlace logo. Pass `decorative` when the name is already announced nearby. */
export function Logo({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  return <img className={`pf-logo ${className}`} src={logoUrl} alt={decorative ? "" : "ThirdPlace"} width={621} height={402} />;
}
