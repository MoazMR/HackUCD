import type { VerificationStatus } from "./types";

/**
 * Mock boundaries for the two things a server must own: the ID check and
 * endorsements/reports. Nothing here decides a ban or handles an ID document.
 * Swap the bodies for real requests once the API exposes these endpoints.
 */

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Add `?simulate=report-failure` or `?simulate=verification-failure` to the URL to test error states. */
function simulated(name: string): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("simulate") === name;
}

export type MockOutcome = Extract<VerificationStatus, "verified" | "failed" | "pending">;

/**
 * Stands in for an external identity provider. A real provider would collect the
 * document on its own pages and send back a status. This prototype sends and
 * receives no document, image or ID number: the outcome is whatever the tester picks.
 */
export async function requestVerificationResult(outcome: MockOutcome): Promise<VerificationStatus> {
  await wait(900);
  if (simulated("verification-failure") || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    throw new Error("The check service could not be reached.");
  }
  return outcome;
}

export type EndorsementSubmission =
  | { kind: "endorse"; eventId: string; personId: string }
  | { kind: "no_endorsement"; eventId: string; personId: string }
  | { kind: "report"; eventId: string; personId: string; reason: string; details: string };

/**
 * Sends an endorsement or a report. Reports are queued for a human moderator;
 * the client never changes anyone's account status.
 */
export async function submitEndorsement(_submission: EndorsementSubmission): Promise<{ queuedForReview: boolean }> {
  await wait(600);
  if (simulated("report-failure") || (typeof navigator !== "undefined" && navigator.onLine === false)) {
    throw new Error("Not sent. Check your connection and try again.");
  }
  return { queuedForReview: _submission.kind === "report" };
}
