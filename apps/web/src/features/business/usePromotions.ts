import { useEffect, useMemo, useState } from "react";
import { businessApi } from "./api";
import type { Promotion } from "./types";

/**
 * Active paid promotions for the feed and map. Fails soft: if the endpoint is down,
 * the feed still renders normally with no promoted labels.
 */
export function usePromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    businessApi
      .promotions()
      .then((list) => !cancelled && setPromotions(list))
      .catch((err: Error) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const byEventId = useMemo(() => new Map(promotions.map((promotion) => [promotion.eventId, promotion])), [promotions]);
  return { promotions, byEventId, loading, error };
}
