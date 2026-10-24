# Delivery roadmap

## Implemented in the local foundation

Two-niche onboarding, authenticated tenant-scoped API, transactional SQLite, deterministic explainable rules, policy versions, case review, human outcomes/audit, fictional demo data, interactive 3D relationship graph and in-app walkthrough. Automated tests verify rules, isolation, retries, provisioning and review behavior.

## Next: production foundations

PostgreSQL/RLS and migrations; staff identity/RBAC; key rotation/revocation; signed Shopify/SurePath adapters; durable ingestion and event-time aggregates; pagination/graph bounds; retention/deletion; backups and restore drills; deployment threat model and monitoring. No production deployment is authorized by this implementation.

## Then: observation pilot

Use consented merchant data in observation mode. Measure precision/recall on independently adjudicated outcomes, false positives, appeal overturns, review workload, latency and segment fairness. Calibrate rules per niche/merchant. Scores remain decision support.

## Later: broader intelligence

New niche templates and adapters; optional ZEN visual decision tables; trained/calibrated ML with evaluation; relationship projections at scale; controlled experiments. No universal fraud coverage or accuracy claims before validation. SurePath remains an adapter, not a core dependency. Automated enforcement requires separate product, governance, security and user approval.
