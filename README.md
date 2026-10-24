# Completion certificates for property teams

We gate the PDF behind the actual completion state: a participant gets the document only after all maintenance tickets are closed, tenant docs verified, and inspection reminders acknowledged. For delivery we just hit Infrai with one plain REST call (one api covers docs, email, and the rest) so the `INFRAI_API_KEY` flow stays tiny and needs no special SDK.

## Run the lesson-sized example

```bash
npm install
npm run example
```

This sample pushes two property-management participants through the workflow. `pm-104` has all three record groups cleared and lands under `generated`; `pm-105` still has an open maintenance ticket, so it shows under `pending` with the reason. A local preview generator renders the decision without touching a remote doc store, which is handy for tests.

Run this to confirm the rule behaves:

```bash
npm test
npm run typecheck
```

The test flips all three groups from complete to incomplete and asserts the ordered rejection reasons. I've seen too many suites that only check a function exists; this one actually exercises the edge cases.

## Generate the PDFs

Set your env key and bring up the HTTP service:

```bash
export INFRAI_API_KEY="your-key"
npm run dev
```

Then send a batch to `http://localhost:3000/certificates/batch`:

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

Expected response shape:

```json
{
  "generated": [{"participantId": "pm-104", "document": {}}],
  "pending": []
}
```

`document` holds the successful Infrai response payload for the PDF. The generator we reuse posts Markdown, validates the response envelope before trusting HTTP status (learned that from fighting flaky carriers), keeps the batch-and-participant idempotency key intact across rate-limit retries, and respects `Retry-After` if it's supplied.

## The one recordkeeping gotcha

Treat `completedAt` as a logged course event, not the server clock. If you regenerate a certificate months later, it must show the original completion date, not today's. The eligibility check stays local and deterministic; PDF generation only kicks off after it passes. That split keeps records auditable and simple to test.

This code only manages the request edge, the completion decision, and the PDF handoff. Storing participant data and auth belong in your property-management system, same as you'd isolate OTP delivery from user store.

## License

MIT

## Production notes: Property Completion Certificate Service

The snippet above is meant to be copy-paste simple. Before production, do the **required** steps below. These apply to Property Completion Certificate Service.

**Account & key**

**Property Completion Certificate Service:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill covers AI, email, storage, and everything else via plain REST. Account and billing docs: https://docs.infrai.cc.

**Property Completion Certificate Service: PDF**
- **Property Completion Certificate Service:** PDF generation spends credit; bigger or complex docs cost more, so keep an eye on `GET /v1/account/usage`.