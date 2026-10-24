# Architecture (proposed)

Shopify/webhook/API connectors -> signature verification and durable ingestion -> normalized event store -> rule evaluation -> risk score + reason codes -> case management -> merchant dashboard/API/webhooks.

## Services
- API gateway: authentication, tenant routing, versioned REST endpoints, rate limits.
- Connector workers: Shopify OAuth, minimum scopes, HMAC verification, retries, idempotency and replay handling.
- Events: append-only canonical schema, provenance and schema versions.
- Risk engine: deterministic rules first, per-merchant policies, explainability, versioned decisions.
- Intelligence: optional graph and anomaly services after consent, legal review and sufficient data.
- Cases: investigator notes, evidence references, outcomes, appeals, immutable audit records.
- Admin: tenant provisioning, RBAC, billing metadata and feature flags.

## Core entities
Tenant, Integration, SubjectToken, Order, PaymentSignal, Shipment, Claim, Return, Refund, Event, Rule, RiskAssessment, Case, CaseAction, AuditLog.

## APIs (draft)
POST /v1/events (idempotency key required)
POST /v1/assessments
GET /v1/assessments/{id}
GET /v1/cases
POST /v1/cases/{id}/decisions

## Integration design
SurePath calls CommerceShield with tenant-scoped credentials; CommerceShield responds with score, reason codes, rule/model versions, assessment ID and recommended review action. Do not embed SurePath-specific assumptions in the core schema.

## Operational guarantees to implement
Queue backpressure, dead-letter handling, at-least-once delivery with idempotent consumers, per-tenant quotas, observability, backups, restore tests, and degraded-mode responses. Define SLAs only after load testing.
