import { z } from "zod";
export const nicheSchema = z.enum(["shipping", "refunds"]);
export type Niche = z.infer<typeof nicheSchema>;
export const signalNames = [
  "claims30d",
  "accountAgeDays",
  "daysSinceDelivery",
  "refundRatio",
  "linkedAccounts",
  "orderValue",
] as const;
export const eventSchema = z
  .object({
    externalId: z.string().trim().min(1).max(100),
    kind: z.enum(["shipping_claim", "refund_request"]),
    account: z.string().trim().min(1).max(80),
    order: z.string().trim().min(1).max(80),
    addressToken: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    deviceToken: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    amount: z.number().finite().min(0).max(1000000),
    signals: z
      .object({
        claims30d: z.number().int().min(0).max(10000),
        accountAgeDays: z.number().int().min(0).max(36500),
        daysSinceDelivery: z.number().int().min(-3650).max(3650),
        refundRatio: z.number().min(0).max(1),
        linkedAccounts: z.number().int().min(1).max(10000),
        orderValue: z.number().min(0).max(1000000),
      })
      .strict(),
    evidence: z
      .array(
        z.enum([
          "delivery_scan",
          "proof_of_loss",
          "customer_statement",
          "return_tracking",
          "item_inspection",
        ]),
      )
      .max(5)
      .default([]),
  })
  .strict();
export type EventInput = z.infer<typeof eventSchema>;
export const ruleSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9_-]{1,50}$/),
    label: z.string().trim().min(1).max(120),
    signal: z.enum(signalNames),
    operator: z.enum(["gte", "lte", "gt", "lt"]),
    threshold: z.number().finite().min(-3650).max(1000000),
    weight: z.number().int().min(1).max(100),
    enabled: z.boolean(),
  })
  .strict();
export type Rule = z.infer<typeof ruleSchema>;
export type Template = {
  id: Niche;
  name: string;
  description: string;
  priority: string;
  workflow: string[];
  evidence: string[];
  rules: Rule[];
};
const rule = (
  id: string,
  label: string,
  signal: Rule["signal"],
  operator: Rule["operator"],
  threshold: number,
  weight: number,
): Rule => ({ id, label, signal, operator, threshold, weight, enabled: true });
export const templates: Record<Niche, Template> = {
  shipping: {
    id: "shipping",
    name: "Shipping protection",
    description: "Review loss, damage, and delivery claims in context.",
    priority: "Claim exposure",
    workflow: [
      "Check coverage and delivery",
      "Request loss evidence",
      "Record claim outcome",
    ],
    evidence: ["delivery_scan", "proof_of_loss", "customer_statement"],
    rules: [
      rule(
        "repeat_claims",
        "Claim frequency in 30 days",
        "claims30d",
        "gte",
        3,
        30,
      ),
      rule(
        "new_account",
        "Recently created account",
        "accountAgeDays",
        "lt",
        14,
        15,
      ),
      rule(
        "early_claim",
        "Claim timing relative to delivery",
        "daysSinceDelivery",
        "lt",
        0,
        20,
      ),
      rule(
        "shared_identity",
        "Linked account count",
        "linkedAccounts",
        "gte",
        3,
        25,
      ),
      rule("high_value", "Order value", "orderValue", "gte", 500, 10),
    ],
  },
  refunds: {
    id: "refunds",
    name: "Ecommerce refunds",
    description: "Investigate repeat refunds and inconsistent return evidence.",
    priority: "Refund exposure",
    workflow: [
      "Check return eligibility",
      "Verify return and inspection",
      "Record refund outcome",
    ],
    evidence: ["return_tracking", "item_inspection", "customer_statement"],
    rules: [
      rule(
        "refund_ratio",
        "Refund-to-order ratio",
        "refundRatio",
        "gte",
        0.5,
        35,
      ),
      rule(
        "repeat_requests",
        "Request frequency in 30 days",
        "claims30d",
        "gte",
        3,
        25,
      ),
      rule(
        "shared_identity",
        "Linked account count",
        "linkedAccounts",
        "gte",
        3,
        25,
      ),
      rule(
        "new_account",
        "Recently created account",
        "accountAgeDays",
        "lt",
        14,
        15,
      ),
    ],
  },
};
export function assess(
  event: EventInput,
  rules: Rule[],
  reviewThreshold: number,
  requiredEvidence: string[],
) {
  const reasons = rules
    .filter(
      (r) =>
        r.enabled &&
        {
          gte: (a: number, b: number) => a >= b,
          lte: (a: number, b: number) => a <= b,
          gt: (a: number, b: number) => a > b,
          lt: (a: number, b: number) => a < b,
        }[r.operator](event.signals[r.signal], r.threshold),
    )
    .map((r) => ({
      code: r.id,
      label: r.label,
      signal: r.signal,
      observed: event.signals[r.signal],
      operator: r.operator,
      threshold: r.threshold,
      points: r.weight,
    }));
  const score = Math.min(
    100,
    reasons.reduce((n, r) => n + r.points, 0),
  );
  const missingEvidence = requiredEvidence.filter(
    (e) => !event.evidence.includes(e as EventInput["evidence"][number]),
  );
  return {
    score,
    band:
      score >= reviewThreshold
        ? "high"
        : score >= Math.min(30, reviewThreshold)
          ? "medium"
          : "low",
    recommendation:
      score >= reviewThreshold || missingEvidence.length ? "review" : "observe",
    reasons,
    missingEvidence,
    mode: "observe" as const,
    enforced: false,
    engineVersion: "rules-1",
  };
}
export const settingsSchema = z
  .object({
    reviewThreshold: z.number().int().min(1).max(100),
    rules: z
      .array(ruleSchema)
      .min(1)
      .max(30)
      .refine(
        (r) => new Set(r.map((x) => x.id)).size === r.length,
        "Rule IDs must be unique",
      ),
    dashboard: z.enum(["exposure", "queue", "outcomes"]),
  })
  .strict();
export const onboardingSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    niche: nicheSchema,
    reviewThreshold: z.number().int().min(1).max(100).default(60),
    dashboard: z.enum(["exposure", "queue", "outcomes"]).default("exposure"),
  })
  .strict();
