import { useEffect, useRef, useState } from "react";
import "./topbar.css";

/**
 * Profile photo contract (for the Profile feature to use):
 * save an image to localStorage under PROFILE_PHOTO_KEY (a `data:image/...;base64,` or
 * `https://` URL), then dispatch `window.dispatchEvent(new Event(PROFILE_PHOTO_EVENT))`.
 * The top bar shows that picture; with nothing saved it shows the standard profile icon.
 */
export const PROFILE_PHOTO_KEY = "thirdplace.profilePhoto";
export const PROFILE_PHOTO_EVENT = "thirdplace:profile-photo";

const SAFE_PHOTO = /^(data:image\/(png|jpe?g|webp|gif);base64,|https:\/\/)/i;

function readProfilePhoto(): string | null {
  try {
    const value = window.localStorage.getItem(PROFILE_PHOTO_KEY);
    return value && SAFE_PHOTO.test(value) ? value : null;
  } catch {
    return null; // storage unavailable: fall back to the default icon
  }
}

function useProfilePhoto(): string | null {
  const [photo, setPhoto] = useState<string | null>(readProfilePhoto);
  useEffect(() => {
    const update = () => setPhoto(readProfilePhoto());
    window.addEventListener("storage", update);
    window.addEventListener(PROFILE_PHOTO_EVENT, update);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(PROFILE_PHOTO_EVENT, update);
    };
  }, []);
  return photo;
}

function useHash(): string {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8.5" r="4" fill="currentColor" />
      <path d="M4.5 21c.6-4.2 3.6-6.5 7.5-6.5s6.9 2.3 7.5 6.5" fill="currentColor" />
    </svg>
  );
}

/** True while the given element is on screen; false once the user has scrolled past it. */
function useInView(ref: { current: Element | null }): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const onScroll = () => setInView(element.getBoundingClientRect().bottom > 0);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

/**
 * Icon-only primary actions: search (opens filters), create event, and profile.
 * The bar scrolls away with the page; once it is off-screen a floating
 * "+ Create event" button appears bottom right so creating is always one tap away.
 */
export function TopBar() {
  const hash = useHash();
  const photo = useProfilePhoto();
  const barRef = useRef<HTMLElement | null>(null);
  const barVisible = useInView(barRef);
  const onSearch = hash.startsWith("#/search");
  const onCreate = hash.startsWith("#/create");
  const onProfile = hash.startsWith("#/profile");

  return (
    <>
    <header className="tp-topbar" ref={barRef}>
      <a className="tp-topbar__brand" href="#/for-you">ThirdPlace</a>
      <nav className="tp-topbar__actions" aria-label="Primary actions">
        <a
          className="tp-iconbtn"
          href="#/search"
          aria-label="Search and filter events"
          aria-current={onSearch ? "page" : undefined}
          title="Search"
        >
          <SearchIcon />
        </a>
        <a
          className="tp-iconbtn tp-iconbtn--create"
          href="#/create"
          aria-label="Create an event"
          aria-current={onCreate ? "page" : undefined}
          title="Create an event"
        >
          <PlusIcon />
        </a>
        <a
          className={`tp-iconbtn tp-iconbtn--profile${photo ? " tp-iconbtn--photo" : ""}`}
          href="#/profile"
          aria-label="Your profile"
          aria-current={onProfile ? "page" : undefined}
          title="Profile"
        >
          {photo ? <img src={photo} alt="" /> : <ProfileIcon />}
        </a>
      </nav>
    </header>
    {!barVisible && !onCreate && (
      <a className="tp-fab" href="#/create">
        <PlusIcon />
        <span>Create event</span>
      </a>
    )}
    </>
  );
}
