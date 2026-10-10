import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Profile } from "./types";

const STORAGE_KEY = "thirdplace.profile.v1";

export const EMPTY_PROFILE: Profile = {
  onboarded: false,
  displayName: "",
  ageConfirmed: false,
  gender: "",
  areaId: "",
  radiusKm: 5,
  interests: [],
  privacy: { showAttendanceHistory: false, showAgeRange: false, showGender: false },
  verification: { status: "not_started" },
  endorsementDecisions: {}
};

function readStored(): Profile {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...EMPTY_PROFILE, ...parsed, privacy: { ...EMPTY_PROFILE.privacy, ...parsed.privacy },
      verification: { ...EMPTY_PROFILE.verification, ...parsed.verification },
      endorsementDecisions: { ...parsed.endorsementDecisions } };
  } catch {
    return EMPTY_PROFILE;
  }
}

type ProfileContextValue = {
  profile: Profile;
  update: (changes: Partial<Profile>) => void;
  reset: () => void;
  /** Set when the browser refuses to store the profile. */
  storageProblem: boolean;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

/** Holds the profile in this browser only. Stand-in for `GET /api/users/me` until the API is ready. */
export function ProfileProvider({ children, initial }: { children: ReactNode; initial?: Profile }) {
  const [profile, setProfile] = useState<Profile>(() => initial ?? readStored());
  const [storageProblem, setStorageProblem] = useState(false);

  const persist = useCallback((next: Profile) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStorageProblem(false);
    } catch {
      setStorageProblem(true);
    }
  }, []);

  const update = useCallback((changes: Partial<Profile>) => {
    setProfile((current) => {
      const next = { ...current, ...changes };
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* nothing stored */ }
    setProfile(EMPTY_PROFILE);
  }, []);

  const value = useMemo(() => ({ profile, update, reset, storageProblem }), [profile, update, reset, storageProblem]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfile must be used inside <ProfileProvider>");
  return value;
}
