import type { Profile } from "../models/domain.js";
export type MockVerificationProvider = { requestStatus(profileId: string, desiredStatus?: Profile["verificationStatus"]): Profile["verificationStatus"] };
// No ID image, number, scan, or document field is accepted, logged, or persisted.
export const mockVerificationProvider: MockVerificationProvider = { requestStatus: (_profileId, desiredStatus = "pending") => desiredStatus };
