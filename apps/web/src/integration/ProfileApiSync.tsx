import { useEffect, useRef, useState } from "react";
import { useProfile } from "../features/profile/ProfileStore";
import { api } from "../lib/api";

/** Bridges Sarah's browser profile to the synthetic API without changing her feature-owned files. */
export function ProfileApiSync() {
  const { profile } = useProfile();
  const [failed, setFailed] = useState(false);
  const lastPayload = useRef("");

  useEffect(() => {
    if (!profile.onboarded || profile.interests.length === 0) return;
    const payload = JSON.stringify([profile.interests, profile.radiusKm]);
    if (payload === lastPayload.current) return;
    const timeout = window.setTimeout(() => {
      api.updatePreferences(profile.interests, profile.radiusKm)
        .then(() => { lastPayload.current = payload; setFailed(false); })
        .catch(() => setFailed(true));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [profile.interests, profile.onboarded, profile.radiusKm]);

  return failed ? <p className="integration-status" role="status">Profile changes are saved in this browser. Start the API to sync recommendations.</p> : null;
}
