/** The same transparent recommendation contract is used by the browser and API. */
const aliases = {
  "coding meetups": "coding", "live music": "music", "run clubs": "running",
  "arts and crafts": "craft", "food markets": "food", "trad sessions": "music"
};
const categoryTerms = {
  food: ["food", "coffee", "dining", "cooking classes"],
  sport: ["sport", "football", "padel", "tennis", "running", "hikes", "sea swims", "cycling", "climbing", "yoga"],
  music: ["music", "concert"],
  social: ["social", "coffee", "coding", "craft", "knitting", "poker", "board games", "pub quiz", "books", "film nights"],
  other: ["other"]
};

export function normalizeInterest(value) {
  const normalized = value.trim().toLowerCase();
  return aliases[normalized] ?? normalized;
}

export function distanceBetweenKm(first, second) {
  const radians = (value) => value * Math.PI / 180;
  const a = Math.sin(radians(second.latitude - first.latitude) / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude))
    * Math.sin(radians(second.longitude - first.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function rankEligibleEvents(events, profile, { includeUnrelated = false, now = Date.now() } = {}) {
  const userInterests = new Set(profile.interests.map(normalizeInterest));
  if (!Number.isFinite(profile.travelRadiusKm) || profile.travelRadiusKm < 0) return [];
  return events.filter((event) => event.publicationStatus !== "draft" && new Date(event.startsAt).getTime() > now)
    .map((event) => {
      const distance = distanceBetweenKm(profile.approximateLocation, event.coordinates);
      const matchingInterests = [...new Set(event.interests.map(normalizeInterest))].filter((interest) => userInterests.has(interest));
      // Category affinity adds context to an interest match; it does not make every
      // event in a broad category relevant (coffee must not recommend knitting).
      const categoryMatch = (categoryTerms[event.category] ?? []).some((term) => userInterests.has(term));
      const related = matchingInterests.length > 0 || userInterests.has(event.category);
      return { event, distance, matchingInterests, categoryMatch, related };
    })
    .filter((item) => Number.isFinite(item.distance) && item.distance <= profile.travelRadiusKm && (includeUnrelated || item.related))
    .map(({ event, distance, matchingInterests, categoryMatch }) => {
      const scoreBreakdown = {
        interest: matchingInterests.length * 100,
        category: categoryMatch ? 25 : 0,
        distance: Math.max(0, Math.round((profile.travelRadiusKm - distance) * 10)),
        sponsored: event.isPaidPromotion ? 15 : 0
      };
      const match = matchingInterests[0] ?? (userInterests.has(event.category) ? event.category : undefined);
      const location = `${distance.toFixed(1)} km away`;
      const explanation = `${match ? `Matches ${match} and is` : "Matches your search filters and is"} ${location}.${event.isPaidPromotion ? " Sponsored placement; relevance and radius still apply." : ""}`;
      return { event, score: Object.values(scoreBreakdown).reduce((total, value) => total + value, 0), distanceKm: Number(distance.toFixed(2)), explanation, scoreBreakdown, distance };
    })
    .sort((a, b) => b.score - a.score || a.distance - b.distance || a.event.startsAt.localeCompare(b.event.startsAt) || a.event.id.localeCompare(b.event.id))
    .map(({ distance: _distance, ...item }) => item);
}

// The prototype catalogue is Dublin-based; compare calendar filters in Dublin on
// both browser and server, including days when UTC and local dates differ.
export function localDay(date) {
  const parts = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (name) => parts.find((part) => part.type === name)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function isExplicitSearch(filters) {
  return Boolean(filters.query?.trim() || (filters.category && filters.category !== "all")
    || (filters.date && filters.date !== "any" && (filters.date !== "custom" || Boolean(filters.customDate))) || (filters.timeOfDay && filters.timeOfDay !== "any")
    || (filters.area && filters.area !== "any"));
}

export function matchesDate(iso, filters, now) {
  if (!filters.date || filters.date === "any") return true;
  const when = new Date(iso);
  if (filters.date === "today") return localDay(when) === localDay(now);
  if (filters.date === "tomorrow") {
    const nextDay = new Date(`${localDay(now)}T12:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return localDay(when) === localDay(nextDay);
  }
  if (filters.date === "weekend") {
    const saturday = new Date(`${localDay(now)}T12:00:00Z`);
    const day = saturday.getUTCDay();
    saturday.setUTCDate(saturday.getUTCDate() + (day === 0 ? -1 : (6 - day + 7) % 7));
    const sunday = new Date(saturday);
    sunday.setUTCDate(sunday.getUTCDate() + 1);
    return [localDay(saturday), localDay(sunday)].includes(localDay(when));
  }
  return !filters.customDate || localDay(when) === filters.customDate;
}

export function matchesTimeOfDay(iso, timeOfDay) {
  if (!timeOfDay || timeOfDay === "any") return true;
  const hour = Number(new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", hour: "numeric", hourCycle: "h23" }).format(new Date(iso)));
  if (timeOfDay === "morning") return hour >= 5 && hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17 || hour < 5;
}

export function matchesDiscoveryFilters(event, filters, now = new Date()) {
  if (filters.category && filters.category !== "all" && event.category !== filters.category) return false;
  if (filters.area && filters.area !== "any" && event.area?.toLowerCase() !== filters.area.toLowerCase()) return false;
  if (filters.freeOnly && event.priceEur > 0) return false;
  if (!matchesDate(event.startsAt, filters, now) || !matchesTimeOfDay(event.startsAt, filters.timeOfDay)) return false;
  const haystack = [event.title, event.description, event.category, ...(event.interests ?? []), event.area, event.locationName].join(" ").toLowerCase();
  return (filters.query ?? "").toLowerCase().split(/\s+/).filter(Boolean).every((term) => haystack.includes(term));
}
