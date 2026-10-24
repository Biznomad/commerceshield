# Security and privacy baseline

**Design requirements, not claims of implemented controls.**

- Multi-tenant isolation: tenant_id on all records; enforce PostgreSQL row-level security and tenant-scoped authorization at API and worker boundaries. Test cross-tenant access.
- Identity: OAuth for Shopify; short-lived credentials, service-to-service authentication, MFA for staff, RBAC and privileged-action review.
- Secrets: managed secret storage, rotation, no credentials in Git, least-privilege service accounts.
- Transport/storage: TLS, encryption at rest, restricted database access, secure backups.
- Webhooks: verify Shopify HMAC using raw request body; timestamp/replay defenses where supported; deduplicate event IDs.
- Payments: do not store full card numbers, CVV or bank credentials. Use payment-provider tokens and dispute signals.
- Cross-merchant intelligence: do not expose one merchant's customers or raw events to another. Require clear contracts, permitted purposes, minimization, pseudonymous tokens, retention and deletion policies; obtain legal/privacy review before launch.
- Privacy: data inventory, notices, lawful basis, consumer-rights workflow, deletion and retention schedules, and Shopify privacy compliance webhooks as applicable.
- Risk fairness: avoid protected traits and unjustified proxies; require explanations, appeals, and human review for consequential decisions.
- Software supply chain: dependency scanning, secret scanning, SAST, signed releases, branch protection, code review and incident response runbooks.
- Logging: immutable security/decision audit trails, no sensitive data in logs, alerting and access reviews.
- Compliance: review applicable state privacy laws, payment contracts, and whether SurePath shipping protection is regulated insurance in each jurisdiction. Licensed partner is not a blanket compliance exemption.

## Release gates
Threat model approved; isolation penetration tests; webhook spoofing tests; privacy review; restore drill; incident response rehearsal; shadow-mode evaluation and false-positive thresholds.
