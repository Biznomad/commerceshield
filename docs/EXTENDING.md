# Extend Commerce Shield

## Add a niche

1. Extend the niche enum in server/domain.ts and the UI type in src/api.ts.
2. Register a template: description, priority, evidence identifiers, workflow and typed numeric rules.
3. Extend strict event kinds/signals/evidence schemas and app.ts niche-kind validation for genuinely new data.
4. Add fictional seed cases and tests for evidence routing, threshold boundaries, policy snapshots and tenant isolation.
5. Document normalization/aggregation semantics and test the onboarding and review flow before adopting live data.

Rules support gte/lte/gt/lt over allowlisted numeric signals. Add operators explicitly; never accept arbitrary code or eval. Settings accepts a complete rules array (maximum 30) with unique IDs. Existing UI edits enabled state, thresholds and weights; the API can replace labels/operators/rules within the schema.

## Event adapter boundary

Implement adapters outside the core engine. A Shopify or SurePath adapter must authenticate the source, validate raw webhook signatures, map source events into this schema, tokenize identifiers within the merchant's boundary, calculate time-window aggregates, and call the event API with that merchant's key. Preserve stable external event IDs across retries. Do not accept unverified public input and label it a trusted signal.

Add event-time/version fields and separate order/claim events before building production aggregation. Define refundRatio denominator/window explicitly per merchant. Current device/account counts are supplied facts, not computed from this map. Add signed delivery, retry/backoff, durable queues, replay protection and reconciliation before claiming a real connector is ready. No live Shopify connector is installed.

## Rule-engine replacement

The current assess function is a pure deterministic seam. GoRules ZEN (MIT) is a candidate when decision tables require a visual editor or richer branching. Preserve output reason codes, policy versions, observation mode, historical snapshots and missing-evidence routing. Validate parity against existing fixtures. Do not introduce a heavy rule engine merely to evaluate a handful of numeric comparisons.

## Future machine learning

Use recorded, independently reviewed outcomes as potential labels. Inconclusive outcomes are not negative labels; suspected abuse is a reviewer hypothesis, not proven fraud. Establish labeling quality, sample selection, delay and appeal handling first.

XGBoost (Apache-2.0) is a candidate for later supervised scoring. A future adapter should expose modelVersion, training window, inputs, calibrated score, confidence/uncertainty and feature explanations separately from rule contributions. Keep observation mode; evaluate against adjudicated holdouts by tenant and segment. Use time-based splits to avoid leakage, and report precision/recall/false positives, PR-AUC, calibration and reviewer workload. Do not import a generic model and claim fraud detection accuracy.

River is an optional streaming research candidate, not installed; verify its upstream license and deployment compatibility before adoption. Fraud Detection Handbook supplies evaluation references, not merchant-specific training data. Neither ML service nor untrained placeholder output is included.

## Production storage seam

Replace Store with PostgreSQL migrations and row-level policies; retain tenant predicates as defense in depth. Test connection pool context cleanup and worker isolation. Add verified staff identity, RBAC, managed secrets/key rotation, encrypted storage/backups, retention/deletion and operational monitoring before using real merchant data. Graph projections must remain tenant-local unless separately authorized governance supports cross-merchant intelligence.
