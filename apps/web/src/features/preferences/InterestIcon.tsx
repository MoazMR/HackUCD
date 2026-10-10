import type { ReactNode } from "react";
import { interestCategory } from "./interests";

/** Original 24px line icons, one per interest. Drawn for ThirdPlace; no icon library. */
const PATHS: Record<string, ReactNode> = {
  football: <><circle cx="12" cy="12" r="9" /><path d="M12 8l3.6 2.6-1.4 4.2H9.8l-1.4-4.2z" /><path d="M12 3v5M15.6 10.6l4.7-1.5M14.2 14.8l2.9 4M9.8 14.8l-2.9 4M8.4 10.6L3.7 9.1" /></>,
  padel: <><path d="M12 3c3 0 5 2.6 5 5.8S15 14.5 12 14.5 7 12 7 8.8 9 3 12 3z" /><path d="M12 14.5V21" /><path d="M10.4 7.6h.01M13.6 7.6h.01M12 10.4h.01" /></>,
  tennis: <><circle cx="12" cy="12" r="9" /><path d="M5.6 5.7c3.2 3 3.2 9.6 0 12.6M18.4 5.7c-3.2 3-3.2 9.6 0 12.6" /></>,
  running: <><path d="M3 16.5V10l3.5 1 3-3.5 3.5 5.5 5.5 1.5c1.5.4 2.5 1.3 2.5 2.5v.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5z" /><path d="M3 15.5h18M11.5 10.3l-1.8 1.4" /></>,
  "sea-swimming": <><path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>,
  climbing: <><path d="M3 19l6.5-12 3.5 6 2-3 6 9z" /><path d="M7.4 11l2.1 1.6L11.2 10" /></>,
  hiking: <><circle cx="12" cy="12" r="9" /><path d="M15.8 8.2l-2.2 5.4-5.4 2.2 2.2-5.4z" /></>,
  yoga: <><circle cx="12" cy="5" r="2" /><path d="M12 8.5v5M5.5 11.5l6.5 2 6.5-2M6.5 19.5l5.5-4.5 5.5 4.5" /></>,
  poker: <><path d="M12 3c4 4 7 6.4 7 9.8a3.4 3.4 0 01-6.2 1.9L12 13.6l-.8 1.1A3.4 3.4 0 015 12.8C5 9.4 8 7 12 3z" /><path d="M12 14v7M9 21h6" /></>,
  "board-games": <><rect x="4" y="4" width="16" height="16" rx="3.5" /><path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" /></>,
  "book-club": <><path d="M12 6.5c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" /></>,
  knitting: <><circle cx="12" cy="12" r="8.5" /><path d="M5.5 7.5c4.5 0 9.5 3 11.5 8.5M4 13c3 0 7 2 9.3 7M10 3.8c3.5 1 7 4.2 9.2 8" /></>,
  coding: <><path d="M8 8l-4.5 4L8 16M16 8l4.5 4L16 16M13.6 5l-3.2 14" /></>,
  "live-music": <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6" /></>,
  "trad-sessions": <><path d="M9 18V6.5l10-2V16" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="16" r="2.5" /><path d="M9 10.5l10-2" /></>,
  coffee: <><path d="M4 9.5h13V14a5 5 0 01-5 5H9a5 5 0 01-5-5z" /><path d="M17 10.5h1.2a2.4 2.4 0 010 4.8H17M8 3.5v2.8M12 3.5v2.8" /></>,
  "food-markets": <><path d="M4 10l1.6-5.5h12.8L20 10" /><path d="M4 10a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0 2.7 2.7 0 005.3 0" /><path d="M5.5 13.5V20h13v-6.5" /></>,
  film: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 9l5.2 3-5.2 3z" /></>
};

const FALLBACK = <circle cx="12" cy="12" r="4" />;

/** The bare icon. Decorative: always pair it with a visible or screen-reader label. */
export function InterestIcon({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[id] ?? FALLBACK}
    </svg>
  );
}

/** The icon on a round badge in its category colour. */
export function InterestBadge({ id }: { id: string }) {
  return <span className="tp-ico" data-category={interestCategory(id)}><InterestIcon id={id} /></span>;
}
