import { useMemo, useState } from "react";
import { checkDisplayName } from "../auth/ageValidation";
import { AreaMap } from "../preferences/AreaMap";
import { AreaRadiusPicker } from "../preferences/AreaRadiusPicker";
import { areaName } from "../preferences/areas";
import { InterestPicker } from "../preferences/InterestPicker";
import { PhotoEditor } from "./Avatar";
import { useProfile } from "./ProfileStore";
import { PublicProfileCard } from "./PublicProfileCard";
import { Logo } from "./Logo";
import { VerificationFlow } from "./VerificationFlow";
import { sampleMyEvents } from "./sampleData";
import { toPublicProfile, trustBreakdown } from "./trust";
import { AGE_RANGES, type AgeRange, type PrivacySettings } from "./types";
import "./profile.css";

/** The Profile destination: edit what you share, see exactly what others see. */
export function ProfileView({ onOpenMyEvents }: { onOpenMyEvents?: () => void } = {}) {
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
    <section className="pf pf-profile" aria-labelledby="pf-profile-heading">
      <header className="pf-hero">
        <AreaMap label={profile.areaId ? `${areaName(profile.areaId)} area` : "No area yet"} radiusKm={profile.radiusKm} interests={profile.interests} />
        <div className="pf-hero-copy">
          <Logo />
          <h1 id="pf-profile-heading" className="pf-title pf-title-big">Seen around, <span className="pf-accent">never pinned down.</span></h1>
          <p className="pf-motto">Your area <span aria-hidden="true">·</span> Your interests <span aria-hidden="true">·</span> Your trust</p>
          <p className="pf-lede">This is your profile. People see your area, your interests and how trusted you are. Nothing more.</p>
          {onOpenMyEvents && <button type="button" className="pf-button" onClick={onOpenMyEvents}>My Events</button>}
        </div>
        <div className="pf-hero-card">
          <p className="pf-scribble">this is all anyone sees
            <svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 6c18-4 38 4 44 26M48 32l-9-5M48 32l4-10" /></svg>
          </p>
          <PublicProfileCard profile={publicProfile} />
        </div>
      </header>
      {storageProblem && (
        <p className="pf-banner" role="alert">This browser is blocking storage, so changes last only until you close this tab.</p>
      )}

      <div className="pf-profile-grid">
        <div className="pf-stack">
          <section className="pf-panel" data-tint="peach" aria-labelledby="pf-you">
            <h2 id="pf-you">Photo and name</h2>
            <PhotoEditor name={profile.displayName} photo={profile.photoDataUrl} onChange={(photoDataUrl) => update({ photoDataUrl })} />
            <div className="pf-field">
              <label className="pf-label" htmlFor="pf-edit-name">Name shown to others</label>
              <div className="pf-inline">
                <input id="pf-edit-name" value={nameDraft} maxLength={40} aria-invalid={Boolean(nameError)}
                  onChange={(event) => { setNameDraft(event.target.value); setNameSaved(false); }} />
                <button type="button" className="pf-button" onClick={saveName} disabled={nameDraft.trim() === profile.displayName}>Save name</button>
              </div>
              {nameError && <p className="pf-error" role="alert">{nameError}</p>}
              {nameSaved && <p className="pf-hint" role="status">Name saved.</p>}
            </div>
            <div className="pf-two">
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-edit-age">Age range</label>
                <select id="pf-edit-age" value={profile.ageRange ?? ""} onChange={(event) => update({ ageRange: event.target.value as AgeRange })}>
                  {AGE_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
                </select>
                <p className="pf-hint">You confirmed you are 18 or over. No birth date is held.</p>
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-edit-gender">Gender <span className="pf-optional">optional</span></label>
                <input id="pf-edit-gender" value={profile.gender} maxLength={40} placeholder="Describe it in your own words"
                  onChange={(event) => update({ gender: event.target.value })} />
              </div>
            </div>
          </section>

          <section className="pf-panel" data-tint="mint" aria-labelledby="pf-where">
            <h2 id="pf-where">Area and travel radius</h2>
            <p className="pf-callout">Only your approximate area is public. Your exact location is never stored or shown.</p>
            <AreaRadiusPicker areaId={profile.areaId} radiusKm={profile.radiusKm}
              showDrawing={false}
              onAreaChange={(areaId) => { if (areaId) update({ areaId }); }} onRadiusChange={(radiusKm) => update({ radiusKm })} />
          </section>

          <section className="pf-panel" data-tint="blue" aria-labelledby="pf-likes">
            <h2 id="pf-likes">Interests</h2>
            <InterestPicker selected={profile.interests} onChange={(interests) => update({ interests })} legend="Events are recommended from these"
              error={profile.interests.length === 0 ? "With no interests picked, your feed has nothing to recommend." : undefined} />
          </section>

          <section className="pf-panel" data-tint="amber" aria-labelledby="pf-privacy">
            <h2 id="pf-privacy">Privacy</h2>
            <Toggle label="Show past events I attended" hint="Off: only you see your past events, in My Events."
              checked={profile.privacy.showAttendanceHistory} onChange={(value) => setPrivacy({ showAttendanceHistory: value })} />
            <Toggle label="Show my age range" checked={profile.privacy.showAgeRange} onChange={(value) => setPrivacy({ showAgeRange: value })} />
            <Toggle label="Show my gender" hint={profile.gender.trim() ? undefined : "You haven't added one, so nothing shows."}
              checked={profile.privacy.showGender} onChange={(value) => setPrivacy({ showGender: value })} />
            <div className="pf-never">
              <h3>Never shown to anyone</h3>
              <p>Exact location, address, birth date, phone number, email and anything from an ID. ThirdPlace has no private messages: people talk only in each event's public group chat.</p>
            </div>
          </section>

          <section className="pf-panel" data-tint="pink" aria-labelledby="pf-verification">
            <h2 id="pf-verification">ID check</h2>
            <VerificationFlow />
          </section>
        </div>

        <aside className="pf-stack pf-sticky" aria-label="Trust">
          <section className="pf-panel" data-tint="blue" aria-labelledby="pf-trust">
            <h2 id="pf-trust">Trust score</h2>
            <div className="pf-sun" role="img" aria-label={`Trust score ${trust.score} out of 100`}>
              <svg viewBox="0 0 140 140" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => (
                  <path key={index} d="M70 14v-10" transform={`rotate(${index * 30} 70 70)`} />
                ))}
                <circle cx="70" cy="70" r="46" />
              </svg>
              <p><strong>{trust.score}</strong><span>of 100</span></p>
            </div>
            <ul className="pf-breakdown">
              {trust.parts.map((part) => (
                <li key={part.label}><span>{part.label}</span><span>{part.points} of {part.max}</span></li>
              ))}
            </ul>
            <p className="pf-hint">Reports don't lower a score on their own. A moderator reviews each one first. Endorsement figures here are sample data.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="pf-toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="pf-toggle-track" aria-hidden="true" />
      <span className="pf-toggle-text"><span>{label}</span>{hint && <small>{hint}</small>}</span>
    </label>
  );
}
