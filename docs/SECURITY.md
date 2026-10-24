# Security and release gates

This is a local, observation-only foundation. It is not certified or ready for real merchant/customer data.

## Implemented controls

- Server binds loopback. Non-demo provisioning requires an administrator bearer token. Workspace keys are random 256-bit tokens stored only as SHA-256 hashes; API responses never expose stored hashes.
- Authentication resolves tenant server-side. All case, graph, audit and mutation queries are scoped to that tenant; strict schemas reject caller tenant IDs. Automated isolation tests cover foreign reads and writes.
- Strict allowlisted event/rule schemas, bounded payloads and numbers, prepared SQL, no executable expressions, IP rate limit, origin restrictions, no CORS, no sensitive request logging.
- Transactions atomically persist assessment/case/audit and outcome/audit. Idempotency is tenant-scoped. Existing outcomes cannot be overwritten through the API; historical policies stay attached to assessments.
- Only reported evidence identifiers and pseudonymous address/device tokens are expected. No document upload, raw payment fields or external enforcement endpoints exist. Human reasoning is required for outcomes.

## Demo boundary

`npm run dev` enables fictional demo mode. It exposes known demo credentials and permits local workspace creation. Use only fictional data, keep loopback binding, and never publish the development port. `npm start` defaults to demo disabled, but previously seeded keys remain valid in the same database. Use a fresh database for non-demo evaluation. Existing-demo revocation and key rotation are not implemented.

Browser keys live in session storage and are accessible to same-origin scripts; sign out clears the tab's key. They are workspace operator credentials, not per-person identities. Reviewer names are self-declared. The Google Fonts stylesheet is an optional external typography request; self-host it before privacy-sensitive deployments. Local audit rows are append-only through the API but not tamper-proof against database owners.

## Required before real data or deployment

| Area       | Missing release gate                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Identity   | Staff authentication, MFA, RBAC, key rotation/revocation, admin separation                                  |
| Database   | PostgreSQL RLS, migrations, least privilege, encryption, backups/restore drill                              |
| Ingestion  | Signed source webhooks/OAuth, durable queues, replay defenses, time-window aggregates                       |
| Privacy    | Data inventory, consent/purpose, retention/deletion, consumer-rights workflow, evidence access controls     |
| Operations | TLS/reverse proxy, deployment host allowlist, monitoring, incident response, load limits and pagination     |
| Decisions  | Human label quality, fairness/false-positive calibration, appeals, outcome amendments and review governance |

Cross-merchant graphs are not implemented and must never be inferred from shared demo labels. Production deployment needs a threat model and security/privacy review, as well as domain-specific coverage/compliance review. These are release gates, not implemented claims.
