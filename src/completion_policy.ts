import { z } from "zod";

export const participantSchema = z.object({
  participantId: z.string().min(1),
  participantName: z.string().min(1),
  propertyName: z.string().min(1),
  courseName: z.string().min(1),
  completedAt: z.string().datetime(),
  maintenanceRequests: z.array(z.object({
    requestId: z.string().min(1),
    status: z.enum(["resolved", "open"])
  })),
  tenantDocuments: z.array(z.object({
    documentId: z.string().min(1),
    verified: z.boolean()
  })).min(1),
  inspectionReminders: z.array(z.object({
    reminderId: z.string().min(1),
    acknowledged: z.boolean()
  })).min(1)
});

export type Participant = z.infer<typeof participantSchema>;

export type CompletionDecision =
  | { eligible: true }
  | { eligible: false; reasons: string[] };

export function decideCompletion(participant: Participant): CompletionDecision {
  const reasons: string[] = [];
  const openRequests = participant.maintenanceRequests.filter((item) => item.status === "open");
  const unverifiedDocuments = participant.tenantDocuments.filter((item) => !item.verified);
  const unacknowledgedReminders = participant.inspectionReminders.filter((item) => !item.acknowledged);

  if (openRequests.length > 0) {
    reasons.push(`${openRequests.length} maintenance request(s) remain open`);
  }
  if (unverifiedDocuments.length > 0) {
    reasons.push(`${unverifiedDocuments.length} tenant document(s) remain unverified`);
  }
  if (unacknowledgedReminders.length > 0) {
    reasons.push(`${unacknowledgedReminders.length} inspection reminder(s) remain unacknowledged`);
  }

  return reasons.length === 0 ? { eligible: true } : { eligible: false, reasons };
}
