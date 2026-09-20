import assert from "node:assert/strict";
import test from "node:test";
import { decideCompletion, type Participant } from "../src/completion_policy.js";

const completedParticipant: Participant = {
  participantId: "pm-104",
  participantName: "Jordan Lee",
  propertyName: "Cedar Court",
  courseName: "Resident Care Fundamentals",
  completedAt: "2026-09-03T09:00:00.000Z",
  maintenanceRequests: [{ requestId: "mr-88", status: "resolved" }],
  tenantDocuments: [{ documentId: "lease-guide", verified: true }],
  inspectionReminders: [{ reminderId: "annual-2026", acknowledged: true }]
};

test("issues a completion decision only when every property record is clear", () => {
  assert.deepEqual(decideCompletion(completedParticipant), { eligible: true });

  const pending = {
    ...completedParticipant,
    maintenanceRequests: [{ requestId: "mr-91", status: "open" as const }],
    tenantDocuments: [{ documentId: "lease-guide", verified: false }],
    inspectionReminders: [{ reminderId: "annual-2026", acknowledged: false }]
  };
  assert.deepEqual(decideCompletion(pending), {
    eligible: false,
    reasons: [
      "1 maintenance request(s) remain open",
      "1 tenant document(s) remain unverified",
      "1 inspection reminder(s) remain unacknowledged"
    ]
  });
});
