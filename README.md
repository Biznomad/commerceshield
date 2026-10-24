# CommerceShield AI

Standalone, API-first, multi-tenant e-commerce fraud intelligence platform. **Planning-stage; not production-ready.**

## Mission
Identify suspicious activity across orders, payments, shipping, delivery, returns, refunds, promotions, accounts and shipping-protection claims. Build independently, then integrate with SurePath through versioned APIs.

## Design
- Shopify-first ingestion and explainable rules-based risk scoring
- Tenant-isolated PostgreSQL event store and investigation dashboard
- Human review, evidence trails, appeals and feedback
- Privacy-preserving relationship analysis and optional anomaly models later
- Shadow-mode pilot before any automated enforcement

## Stack proposal
TypeScript, NestJS, Next.js, PostgreSQL, Redis/BullMQ, JSON rules engine, optional Python/PyOD.

## Documentation
- [Product brief](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Security and privacy](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md)

No production deployment or real merchant data is included. Fraud indicators are not proof of wrongdoing.
