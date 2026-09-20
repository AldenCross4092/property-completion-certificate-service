import { processCertificateBatch } from "./certificate_service.js";
import type { CertificateGenerator } from "./certificate_generator.js";

const previewGenerator: CertificateGenerator = async (participant, idempotencyKey) => ({
  participantId: participant.participantId,
  document: { status: "generated", idempotencyKey }
});

const result = await processCertificateBatch({
  batchId: "september-training",
  participants: [
    {
      participantId: "pm-104",
      participantName: "Jordan Lee",
      propertyName: "Cedar Court",
      courseName: "Resident Care Fundamentals",
      completedAt: "2026-09-03T09:00:00.000Z",
      maintenanceRequests: [{ requestId: "mr-88", status: "resolved" }],
      tenantDocuments: [{ documentId: "lease-guide", verified: true }],
      inspectionReminders: [{ reminderId: "annual-2026", acknowledged: true }]
    },
    {
      participantId: "pm-105",
      participantName: "Morgan Chen",
      propertyName: "Cedar Court",
      courseName: "Resident Care Fundamentals",
      completedAt: "2026-09-03T09:00:00.000Z",
      maintenanceRequests: [{ requestId: "mr-91", status: "open" }],
      tenantDocuments: [{ documentId: "lease-guide", verified: true }],
      inspectionReminders: [{ reminderId: "annual-2026", acknowledged: true }]
    }
  ]
}, previewGenerator);

console.log(JSON.stringify(result, null, 2));
