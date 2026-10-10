import { useMemo, useState } from "react";
import { checkDisplayName } from "../auth/ageValidation";
import { AreaMap } from "../preferences/AreaMap";
import { AreaRadiusPicker } from "../preferences/AreaRadiusPicker";
import { areaName } from "../preferences/areas";
import { InterestPicker } from "../preferences/InterestPicker";
import { PhotoEditor } from "./Avatar";
import { useProfile } from "./ProfileStore";
import { PublicProfileCard } from "./PublicProfileCard";
import { VerificationFlow } from "./VerificationFlow";
import { sampleMyEvents } from "./sampleData";
import { toPublicProfile, trustBreakdown } from "./trust";
import { AGE_RANGES, type AgeRange, type PrivacySettings } from "./types";
import "./profile.css";

/** The Profile destination: edit what you share, see exactly what others see. */
export function ProfileView() {
  const { profile, update, storageProblem } = useProfile();
  const [nameDraft, setNameDraft] = useState(profile.displayName);
  const [nameError, setNameError] = useState<string>();
  const [nameSaved, setNameSaved] = useState(false);

  const pastEvents = useMemo(() => sampleMyEvents().filter((event) => new Date(event.startsAt) < new Date()), []);
  const publicProfile = toPublicProfile(profile, pastEvents);
  const trust = trustBreakdown(profile);

  function saveName() {
    const problem = checkDisplayName(nameDraft);
    setNameError(problem);
    setNameSaved(false);
    if (problem) return;
    update({ displayName: nameDraft.trim() });
    setNameSaved(true);
  }

  function setPrivacy(changes: Partial<PrivacySettings>) {
    update({ privacy: { ...profile.privacy, ...changes } });
  }

  return (
    <section className="tp tp-profile" aria-labelledby="tp-profile-heading">
      <header className="tp-hero">
        <AreaMap label={profile.areaId ? `${areaName(profile.areaId)} area` : "No area yet"} radiusKm={profile.radiusKm} />
        <div className="tp-hero-copy">
          <h1 id="tp-profile-heading" className="tp-title tp-title-big">Seen around, never pinned down.</h1>
          <p className="tp-lede">This is your profile. People see your area, your interests and how trusted you are. Nothing more.</p>
        </div>
        <div className="tp-hero-card">
          <p className="tp-tagline">What others see</p>
          <PublicProfileCard profile={publicProfile} />
        </div>
      </header>
      {storageProblem && (
        <p className="tp-banner" role="alert">This browser is blocking storage, so changes last only until you close this tab.</p>
      )}

      <div className="tp-profile-grid">
        <div className="tp-stack">
          <section className="tp-panel" aria-labelledby="tp-you">
            <h2 id="tp-you">Photo and name</h2>
            <PhotoEditor name={profile.displayName} photo={profile.photoDataUrl} onChange={(photoDataUrl) => update({ photoDataUrl })} />
            <div className="tp-field">
              <label className="tp-label" htmlFor="tp-edit-name">Name shown to others</label>
              <div className="tp-inline">
                <input id="tp-edit-name" value={nameDraft} maxLength={40} aria-invalid={Boolean(nameError)}
                  onChange={(event) => { setNameDraft(event.target.value); setNameSaved(false); }} />
                <button type="button" className="tp-button" onClick={saveName} disabled={nameDraft.trim() === profile.displayName}>Save name</button>
              </div>
              {nameError && <p className="tp-error" role="alert">{nameError}</p>}
              {nameSaved && <p className="tp-hint" role="status">Name saved.</p>}
            </div>
            <div className="tp-two">
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-edit-age">Age range</label>
                <select id="tp-edit-age" value={profile.ageRange ?? ""} onChange={(event) => update({ ageRange: event.target.value as AgeRange })}>
                  {AGE_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
                </select>
                <p className="tp-hint">You confirmed you are 18 or over. No birth date is held.</p>
              </div>
              <div className="tp-field">
                <label className="tp-label" htmlFor="tp-edit-gender">Gender <span className="tp-optional">optional</span></label>
                <input id="tp-edit-gender" value={profile.gender} maxLength={40} placeholder="Describe it in your own words"
                  onChange={(event) => update({ gender: event.target.value })} />
              </div>
            </div>
          </section>

          <section className="tp-panel" aria-labelledby="tp-where">
            <h2 id="tp-where">Area and travel radius</h2>
            <p className="tp-callout">Only your approximate area is public. Your exact location is never stored or shown.</p>
            <AreaRadiusPicker areaId={profile.areaId} radiusKm={profile.radiusKm}
              showDrawing={false}
              onAreaChange={(areaId) => { if (areaId) update({ areaId }); }} onRadiusChange={(radiusKm) => update({ radiusKm })} />
          </section>

          <section className="tp-panel" aria-labelledby="tp-likes">
            <h2 id="tp-likes">Interests</h2>
            <InterestPicker selected={profile.interests} onChange={(interests) => update({ interests })} legend="Events are recommended from these"
              error={profile.interests.length === 0 ? "With no interests picked, your feed has nothing to recommend." : undefined} />
          </section>

          <section className="tp-panel" aria-labelledby="tp-privacy">
            <h2 id="tp-privacy">Privacy</h2>
            <Toggle label="Show past events I attended" hint="Off: only you see your past events, in My Events."
              checked={profile.privacy.showAttendanceHistory} onChange={(value) => setPrivacy({ showAttendanceHistory: value })} />
            <Toggle label="Show my age range" checked={profile.privacy.showAgeRange} onChange={(value) => setPrivacy({ showAgeRange: value })} />
            <Toggle label="Show my gender" hint={profile.gender.trim() ? undefined : "You haven't added one, so nothing shows."}
              checked={profile.privacy.showGender} onChange={(value) => setPrivacy({ showGender: value })} />
            <div className="tp-never">
              <h3>Never shown to anyone</h3>
              <p>Exact location, address, birth date, phone number, email and anything from an ID. ThirdPlace has no private messages: people talk only in each event's public group chat.</p>
            </div>
          </section>

          <section className="tp-panel" aria-labelledby="tp-verification">
            <h2 id="tp-verification">ID check</h2>
            <VerificationFlow />
          </section>
        </div>

        <aside className="tp-stack tp-sticky" aria-label="Trust">
          <section className="tp-panel" aria-labelledby="tp-trust">
            <h2 id="tp-trust">Trust score</h2>
            <div className="tp-score">
              <strong>{trust.score}</strong><span>of 100</span>
            </div>
            <div className="tp-meter" role="img" aria-label={`Trust score ${trust.score} out of 100`}><span style={{ width: `${trust.score}%` }} /></div>
            <ul className="tp-breakdown">
              {trust.parts.map((part) => (
                <li key={part.label}><span>{part.label}</span><span>{part.points} of {part.max}</span></li>
              ))}
            </ul>
            <p className="tp-hint">Reports don't lower a score on their own. A moderator reviews each one first. Endorsement figures here are sample data.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="tp-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="tp-toggle-track" aria-hidden="true" />
      <span className="tp-toggle-text"><span>{label}</span>{hint && <small>{hint}</small>}</span>
    </label>
  );
}
