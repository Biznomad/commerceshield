# API contract · foundation v0.1

Base URL: http://127.0.0.1:3001/api. JSON requests; Authorization: Bearer WORKSPACE_KEY. Contract applies to this package version; URL versioning and compatibility guarantees remain future work.

| Method | Path                | Behavior                                                          |
| ------ | ------------------- | ----------------------------------------------------------------- |
| GET    | /health, /templates | Public local metadata                                             |
| GET    | /demo               | Fictional keys, only in demo mode                                 |
| POST   | /workspaces         | Open in local demo; otherwise admin token required                |
| GET    | /workspace          | Authenticated workspace and policy                                |
| PUT    | /settings           | Full rules, reviewThreshold, dashboard; increments policy version |
| POST   | /events             | Validate, score, persist                                          |
| GET    | /cases, /cases/:id  | Scoped data; foreign/unknown IDs return 404                       |
| POST   | /cases/:id/outcomes | Human feedback only                                               |
| GET    | /graph, /audit      | Scoped graph / latest 100 audit records                           |

## Send a sample with Node.js

```js
// WORKSPACE_KEY must be set securely in the calling process environment.
import { readFile } from "node:fs/promises";
const event = JSON.parse(
  await readFile("examples/shipping-event.json", "utf8"),
);
const response = await fetch("http://127.0.0.1:3001/api/events", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.WORKSPACE_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(event),
});
console.log(response.status, await response.json());
```

Refund workspaces require kind=refund_request. All six numeric signals are required. claims30d means niche-specific requests in 30 days; refundRatio is 0–1; daysSinceDelivery is negative before delivery. Aggregates come from a trusted adapter. Amount/orderValue use USD. Address/device tokens accept ASCII letters, numbers, underscores and hyphens. Tokenize upstream; never submit card data, raw addresses or documents.

Evidence values: delivery_scan, proof_of_loss, customer_statement, return_tracking, item_inspection. They assert presence, not verification. Unknown fields are rejected.

201 creates, 200 replays the same externalId/payload, 409 rejects different content for an existing ID. IDs are unique per tenant. Retry returns the original case without rescoring or adding audit. Response includes id, event, status, assessment (score, reasons/values, missingEvidence, policyVersion, mode, enforced), and replayed.

Validation: 400 with field paths. Invalid keys: 401. Origin/provisioning rejection: 403. Limit: 64 KiB body, 120 requests/minute per remote IP.

## Human outcome

POST /cases/CASE_ID/outcomes with JSON:

```json
{
  "decision": "inconclusive",
  "reviewer": "Example analyst",
  "note": "Carrier evidence requested; outcome remains uncertain."
}
```

Decisions: legitimate, suspected_abuse, inconclusive. Note: 10–2,000 characters. Reviewer: 2–80. One outcome per case; duplicate returns 409. This resolves the local review and appends audit, without approving/denying a claim or issuing money. Production needs authenticated staff identity instead of self-declared names.

## Provision without demo mode

Set a random ADMIN_TOKEN securely in your shell; start the built app with DATABASE_PATH=./data/local-evaluation.db. Use a fresh database: disabling demo does not revoke previously seeded keys.

POST /workspaces with Authorization: Bearer ADMIN_TOKEN and body:

```json
{
  "name": "Example local team",
  "niche": "shipping",
  "reviewThreshold": 60,
  "dashboard": "exposure"
}
```

Securely save the returned random token once; the UI accepts it under Open an existing workspace. Never commit keys. Niches: shipping/refunds; dashboards: exposure/queue/outcomes.
