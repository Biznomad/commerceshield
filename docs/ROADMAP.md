# Delivery roadmap

## Phase 0 — Discovery and governance
Confirm SurePath data interfaces, merchant consent, compliance model, target segments, historical labeled outcomes, and ownership of existing systems. Threat model and data inventory.

## Phase 1 — Foundation
Monorepo scaffold; tenant/auth model; PostgreSQL/RLS; API contracts; Shopify OAuth/webhook connector; event schema; audit logging; CI/security scans.

## Phase 2 — Explainable MVP
JSON rules engine; risk score with reasons; merchant dashboard; case queue; manual analyst outcomes; sample fixtures; integration and isolation tests.

## Phase 3 — Shadow pilot
Run on consented real events without blocking or denying. Measure precision, recall, false positives, latency, drift, and appeal impact. Calibrate per merchant.

## Phase 4 — Intelligence expansion
Relationship graph, optional anomaly detection, new connectors, consented cross-merchant intelligence, controlled experiments and feedback loops.

## Phase 5 — SurePath integration
Versioned API adapter, event mapping, gradual rollout, kill switch, reconciliation, and operations handoff. No automatic claim decisions until validated and legally approved.

## First backlog
1. Agree on normalized event schema and API contract.
2. Define tenant-isolation tests and security threat model.
3. Identify Shopify scopes/webhook topics and privacy obligations.
4. Define top 20 fraud rules and reason-code taxonomy.
5. Create realistic synthetic test data and analyst case workflows.
6. Establish measurable pilot acceptance criteria.
