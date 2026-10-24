# Foundation validation

Validated locally on 2026-10-24 with Node.js 22.22.3.

## Automated

`npm run check`: 14 passing API/domain tests, TypeScript check and Vite production build. Coverage includes explainable/capped scores, review thresholds, missing evidence, authentication, foreign tenant reads/writes, graph/audit isolation, idempotent retries/conflicts, policy snapshots, immutable outcomes, strict validation, admin provisioning, demo boundaries, origin rejection and database-reopen persistence.

`npm audit --audit-level=high`: zero reported vulnerabilities at validation time. This is dependency advisory evidence, not a security certification. GitHub Actions runs installation, tests, typecheck, build and the audit for pushes/PRs.

## Browser checks

Playwright CLI exercised the application with desktop and 390 × 844 mobile viewports. Verified niche onboarding, creating an empty refund workspace, sending a sample event, score 75 with distinct refund evidence requirements, recording an inconclusive human outcome, workspace switching and seeded metrics. The seeded shipping graph search found device_7c2, showed three linked cases and maximum score 100, and opened Morgan's CLM-1048 case with the expected score breakdown.

The built app was started separately on loopback port 3002 with a fresh fictional demo database. Page, API health and favicon returned 200; shipping demo and relationship map loaded in the built browser app. A screenshot in docs/media/graph-demo.png captures the fictional device cluster. No production deploy or real merchant ingestion occurred.

## Limits of this evidence

This does not establish detection accuracy, scalability, penetration resistance or regulatory compliance. WebGL behavior and accessibility need broader browser/assistive-technology coverage. See SECURITY.md and ROADMAP.md for real-data release gates. Existing source-provided aggregate signals and evidence-presence flags are not independently verified by this foundation.
