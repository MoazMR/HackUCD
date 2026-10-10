import { useState } from "react";
import { useProfile } from "./ProfileStore";
import { requestVerificationResult, type MockOutcome } from "./trustApi";
import type { VerificationStatus } from "./types";

const ID_TYPES = ["Irish passport", "Irish passport card", "Irish driving licence"];

const STATUS_COPY: Record<VerificationStatus, { title: string; body: string }> = {
  not_started: { title: "ID not checked", body: "Checking an Irish ID adds a mark to your public profile and raises your trust score. It's optional." },
  pending: { title: "Check in progress", body: "Your ID check has started. Most checks finish within a few minutes. You can keep using ThirdPlace while you wait." },
  verified: { title: "ID check passed", body: "Your public profile shows that your ID was checked. It shows nothing from the ID itself." },
  failed: { title: "ID check did not pass", body: "The check could not confirm the ID. This is often a blurry photo or an expired document. You can try again, and your account is not restricted." }
};

/**
 * Mock ID-check flow. The browser only ever holds a status: there is no file
 * input, no ID number field, and nothing about a document is stored or shown.
 */
export function VerificationFlow() {
  const { profile, update } = useProfile();
  const status = profile.verification.status;
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [idType, setIdType] = useState(ID_TYPES[0]);
  const [outcome, setOutcome] = useState<MockOutcome>("verified");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  function save(next: VerificationStatus) {
    update({ verification: { status: next, updatedAt: new Date().toISOString() } });
  }

  async function resolve() {
    setBusy(true);
    setError(undefined);
    try {
      save(await requestVerificationResult(outcome));
    } catch {
      setError("We couldn't reach the check service. Your status hasn't changed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    if (!consent) { setError("Tick the consent box to start the check."); return; }
    setOpen(false);
    setConsent(false);
    save("pending");
    await resolve();
  }

  const copy = STATUS_COPY[status];
  const canStart = status === "not_started" || status === "failed";

  return (
    <div className="pf-verify" data-status={status}>
      <div className="pf-status" role="status" aria-live="polite">
        <span className="pf-status-mark" aria-hidden="true" />
        <div>
          <h3>{copy.title}</h3>
          <p>{copy.body}</p>
        </div>
      </div>
      {error && <p className="pf-error" role="alert">{error}</p>}

      {status === "pending" && (
        <button type="button" className="pf-button pf-button-quiet" onClick={resolve} disabled={busy}>
          {busy ? "Checking…" : "Check for a result"}
        </button>
      )}

      {canStart && !open && (
        <button type="button" className="pf-button" onClick={() => { setOpen(true); setError(undefined); }}>
          {status === "failed" ? "Try the ID check again" : "Start ID check"}
        </button>
      )}

      {canStart && open && (
        <div className="pf-consent">
          <h4>Before you start</h4>
          <ul>
            <li>This is a prototype. <strong>It never asks for, stores or displays ID images or ID numbers.</strong> You will not be asked to upload anything.</li>
            <li>In a live version, a separate identity provider would check the document and tell ThirdPlace only whether it passed.</li>
            <li>The only thing saved is the result: passed, in progress or did not pass.</li>
            <li>The check is optional and you can keep using ThirdPlace without it.</li>
          </ul>
          <div className="pf-field">
            <label className="pf-label" htmlFor="pf-id-type">Which Irish ID would you use?</label>
            <select id="pf-id-type" value={idType} onChange={(event) => setIdType(event.target.value)}>
              {ID_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <p className="pf-hint">Used for this step only. It isn't saved.</p>
          </div>
          <label className="pf-check">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>I agree to a mock ID check and to ThirdPlace saving only its result.</span>
          </label>
          <div className="pf-actions">
            <button type="button" className="pf-button pf-button-quiet" onClick={() => { setOpen(false); setError(undefined); }}>Cancel</button>
            <button type="button" className="pf-button" onClick={start}>Agree and start check</button>
          </div>
        </div>
      )}

      {(canStart || status === "pending") && (
        <fieldset className="pf-prototype">
          <legend>Prototype control: result the mock provider returns</legend>
          {(["verified", "failed", "pending"] as MockOutcome[]).map((value) => (
            <label key={value} className="pf-check">
              <input type="radio" name="pf-mock-outcome" checked={outcome === value} onChange={() => setOutcome(value)} />
              <span>{value === "verified" ? "Passes" : value === "failed" ? "Does not pass" : "Stays in progress"}</span>
            </label>
          ))}
        </fieldset>
      )}

      {status === "verified" && (
        <button type="button" className="pf-button pf-button-text" onClick={() => save("not_started")}>Remove my ID check result</button>
      )}
    </div>
  );
}
