import { useId } from "react";

/**
 * The ThirdPlace ribbon: one looping line that strings together the places
 * people meet (home, town, a coffee, a drink, the park, the sun, the sea, the woods).
 * Original artwork, purely decorative.
 */
export function Ribbon({ className = "" }: { className?: string }) {
  const gradient = useId();
  return (
    <svg className={`tp-ribbon ${className}`} viewBox="0 0 440 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#8fbf8f" /><stop offset="0.24" stopColor="#f2785c" /><stop offset="0.44" stopColor="#f7c948" />
          <stop offset="0.6" stopColor="#e58fa6" /><stop offset="0.8" stopColor="#8fbf8f" /><stop offset="1" stopColor="#7fb3e6" />
        </linearGradient>
      </defs>
      <path d="M8 84 C50 58 84 100 124 76 S160 34 184 58 S160 100 204 82 S262 50 292 72 S296 102 332 80 S388 58 432 78"
        fill="none" stroke={`url(#${gradient})`} strokeWidth="6" strokeLinecap="round" />
      {/* house and cypress */}
      <path d="M22 60l24-20 24 20z" fill="#f2785c" /><rect x="28" y="59" width="36" height="21" rx="2" fill="#fff1dd" />
      <rect x="41" y="66" width="9" height="14" rx="4.5" fill="#4f8a5b" /><ellipse cx="82" cy="52" rx="6.5" ry="19" fill="#1e3a2b" />
      {/* town */}
      <rect x="116" y="34" width="19" height="40" rx="2" fill="#8fbf8f" /><rect x="138" y="20" width="24" height="54" rx="2" fill="#4f8a5b" />
      <path d="M143 28h5v6h-5zM152 28h5v6h-5zM143 40h5v6h-5zM152 40h5v6h-5zM143 52h5v6h-5zM152 52h5v6h-5zM121 42h4v5h-4zM127 42h4v5h-4zM121 52h4v5h-4z" fill="#fff1dd" />
      {/* coffee */}
      <path d="M200 30h30v7a15 15 0 01-30 0z" fill="#f7c948" /><path d="M230 32h3a5 5 0 010 10h-4" fill="none" stroke="#f7c948" strokeWidth="3.5" />
      <ellipse cx="215" cy="56" rx="19" ry="3.5" fill="#f2a93b" />
      {/* glass */}
      <path d="M254 22h22l-2 13a9 9 0 01-18 0z" fill="#e58fa6" /><path d="M265 44v14M257 59h16" fill="none" stroke="#e58fa6" strokeWidth="3.5" strokeLinecap="round" />
      {/* sprig */}
      <path d="M300 64c2-16 8-28 18-38" fill="none" stroke="#4f8a5b" strokeWidth="3" strokeLinecap="round" />
      <g fill="#4f8a5b"><ellipse cx="301" cy="48" rx="4" ry="8" transform="rotate(-28 301 48)" /><ellipse cx="313" cy="52" rx="4" ry="8" transform="rotate(48 313 52)" />
        <ellipse cx="306" cy="35" rx="3.6" ry="7.5" transform="rotate(-20 306 35)" /><ellipse cx="319" cy="40" rx="3.6" ry="7.5" transform="rotate(52 319 40)" /></g>
      {/* sun */}
      <circle cx="356" cy="32" r="11" fill="#f7c948" />
      <path d="M356 12v-6M356 58v-6M336 32h-6M382 32h-6M342 18l-4-4M374 50l-4-4M370 18l4-4M338 50l4-4" fill="none" stroke="#f2a93b" strokeWidth="3" strokeLinecap="round" />
      {/* sea */}
      <path d="M378 60q5-6 10 0t10 0M382 70q5-6 10 0t10 0" fill="none" stroke="#7fb3e6" strokeWidth="3.5" strokeLinecap="round" />
      {/* pine */}
      <path d="M420 26l11 16h-6l9 14h-28l9-14h-6z" fill="#1e3a2b" /><rect x="418" y="56" width="4" height="10" fill="#1e3a2b" />
    </svg>
  );
}
