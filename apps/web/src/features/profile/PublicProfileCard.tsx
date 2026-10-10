import { InterestBadge } from "../preferences/InterestIcon";
import { interestLabel } from "../preferences/interests";
import { Avatar } from "./Avatar";
import type { PublicProfile } from "./types";

/** Exactly what another person sees. Takes a PublicProfile so private fields cannot reach it. */
export function PublicProfileCard({ profile }: { profile: PublicProfile }) {
  return (
    <article className="pf-public" aria-label={`Public profile of ${profile.displayName}`}>
      <header className="pf-public-head">
        <Avatar name={profile.displayName} photo={profile.photoDataUrl} size={64} />
        <div>
          <h3>{profile.displayName}</h3>
          <p className="pf-muted">{profile.areaLabel}</p>
        </div>
      </header>
      <ul className="pf-signals">
        <li data-tone={profile.verified ? "good" : "neutral"}>{profile.verified ? "ID check passed" : "ID not checked"}</li>
        <li>Trust score {profile.trustScore} of 100</li>
        <li>{profile.endorsementCount} endorsements</li>
      </ul>
      {(profile.ageRange || profile.gender) && (
        <p className="pf-muted">{[profile.ageRange && `Age ${profile.ageRange}`, profile.gender].filter(Boolean).join(", ")}</p>
      )}
      {profile.interests.length > 0
        ? <ul className="pf-tags">{profile.interests.map((id) => <li key={id}><InterestBadge id={id} />{interestLabel(id)}</li>)}</ul>
        : <p className="pf-muted">No interests added yet.</p>}
      {profile.pastEvents && (
        <div className="pf-public-history">
          <h4>Recently attended</h4>
          {profile.pastEvents.length
            ? <ul>{profile.pastEvents.map((event) => <li key={event.title}>{event.title} <span className="pf-muted">{event.when}</span></li>)}</ul>
            : <p className="pf-muted">No past events yet.</p>}
        </div>
      )}
    </article>
  );
}
