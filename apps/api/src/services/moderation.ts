import type { AccountModeration, Endorsement, Report } from "../models/domain.js";

const endorsements: Endorsement[] = [];
const reports: Report[] = [];
export function addEndorsement(authorId: string, subjectId: string, eventId: string): Endorsement {
  const endorsement = { id: `endorsement-${endorsements.length + 1}`, authorId, subjectId, eventId, createdAt: new Date().toISOString() };
  endorsements.push(endorsement);
  return endorsement;
}
export function moderationFor(subjectId: string): AccountModeration {
  const credibleReportCount = reports.filter((item) => item.subjectId === subjectId && item.credible).length;
  return { subjectId, credibleReportCount, status: credibleReportCount >= 3 ? "flagged_for_review" : "clear" };
}
export function addReport(reporterId: string, subjectId: string, reason: string, eventId?: string): { report: Report; moderation: AccountModeration } {
  // This prototype treats submitted reports as credible test reports. Production needs reviewer evidence rules.
  const report = { id: `report-${reports.length + 1}`, reporterId, subjectId, reason, eventId, credible: true, createdAt: new Date().toISOString() };
  reports.push(report);
  return { report, moderation: moderationFor(subjectId) };
}
