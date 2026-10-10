import { useEffect, useState } from "react";

export type Route =
  | { name: "for-you" }
  | { name: "map" }
  | { name: "create" }
  | { name: "search" }
  | { name: "profile" }
  | { name: "event"; id: string };

export function parseHash(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, "").split("/");
  if (first === "map") return { name: "map" };
  if (first === "create") return { name: "create" };
  if (first === "search") return { name: "search" };
  if (first === "profile") return { name: "profile" };
  if (first === "event" && second) return { name: "event", id: decodeURIComponent(second) };
  return { name: "for-you" };
}

/** Tiny hash router, so the browser back button and shareable links work without touching App.tsx. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}
