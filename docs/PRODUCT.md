# Product brief

## Customer
E-commerce merchants, shipping-protection providers, returns and claims operators, and fraud analysts.

## Problem
Fraud and policy abuse are fragmented across checkout, fulfillment, claims, refunds and customer accounts. Merchants need contextual, explainable signals and defensible review workflows.

## Coverage
1. Orders: velocity, mismatched attributes, unusual baskets and behavior.
2. Payments: processor-provided risk and dispute events (never ingest PAN/CVV).
3. Shipping: reroutes, address changes, delivery exceptions, suspicious claim patterns.
4. Returns/refunds: repeat claims, inconsistent evidence, refund abuse.
5. Promotions/accounts: coupon abuse, synthetic account clusters, referral manipulation.
6. Shipping protection: enrollment, eligibility, claim evidence, adjudication support.

## Personas
Merchant admin, risk analyst, claims reviewer, platform operator, integration developer.

## Initial workflow
Merchant connects store -> verified webhook ingestion -> event normalization -> rules score -> reason codes -> case queue -> human disposition -> outcome feedback.

## Success metrics
Review precision, recall on adjudicated outcomes, false-positive rate, manual review time, chargeback/claims loss per order, latency, merchant retention, appeal overturn rate. Track by tenant and segment; do not promise detection accuracy before validation.

## Business model hypotheses
Merchant SaaS subscription, usage-based event scoring, analyst seats, and enterprise API. Pricing and data-sharing terms require validation.

## Boundaries
CommerceShield is a fraud decision-support product, not an insurer, payments processor, identity bureau, or legal determination of fraud. SurePath integration is future scope, not a dependency.
