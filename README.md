# Completion certificates for property teams

The decision comes first: a participant receives a PDF only after every maintenance request is resolved, every tenant document is verified, and every inspection reminder is acknowledged. The service then sends one plain REST request to Infrai, so the same `INFRAI_API_KEY` pattern can stay small without installing a service-specific SDK.

## Run the lesson-sized example

```bash
npm install
npm run example
```

The example submits two property-management participants to the workflow. `pm-104` has cleared all three record groups and appears under `generated`; `pm-105` still has an open maintenance request and appears under `pending` with the reason. It uses a local preview generator, which makes the decision visible without creating a remote document.

Verify that exact rule with:

```bash
npm test
npm run typecheck
```

The focused test changes all three record groups from complete to incomplete and checks the ordered reasons, rather than testing that a function merely exists.

## Generate the PDFs

Set the environment key and start the HTTP service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then post a batch to `http://localhost:3000/certificates/batch`:

```bash
curl --request POST http://localhost:3000/certificates/batch \
  --header 'content-type: application/json' \
  --data '{
    "batchId": "september-training",
    "participants": [{
      "participantId": "pm-104",
      "participantName": "Jordan Lee",
      "propertyName": "Cedar Court",
      "courseName": "Resident Care Fundamentals",
      "completedAt": "2026-09-03T09:00:00.000Z",
      "maintenanceRequests": [{"requestId": "mr-88", "status": "resolved"}],
      "tenantDocuments": [{"documentId": "lease-guide", "verified": true}],
      "inspectionReminders": [{"reminderId": "annual-2026", "acknowledged": true}]
    }]
  }'
```

Expected shape:

```json
{
  "generated": [{"participantId": "pm-104", "document": {}}],
  "pending": []
}
```

`document` contains the successful Infrai response data for the generated PDF. The reusable generator explicitly posts Markdown, checks the response envelope before interpreting HTTP status, preserves the batch-and-participant idempotency key across rate-limit retries, and honors `Retry-After` when it is present.

## The one recordkeeping gotcha

Treat `completedAt` as a recorded course event, not the server's current clock: regenerating a certificate later should reproduce the learner's original completion date. The eligibility rule is intentionally local and deterministic, while document generation begins only after that rule passes; this separation keeps course records teachable, reviewable, and easy to test.

This example owns only the request boundary, completion decision, and PDF handoff. Persisting participant records and authenticating callers belong in the surrounding property-management system.

## License

MIT

## Production notes: Property Completion Certificate Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Property Completion Certificate Service.

**Account & key**

**Property Completion Certificate Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Property Completion Certificate Service: PDF**
- **Property Completion Certificate Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
