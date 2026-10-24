import type { Store } from "./store.js";
import type { EventInput } from "./domain.js";
export const DEMO_KEYS = {
  shipping: "cs_demo_shipping_local_only",
  refunds: "cs_demo_refunds_local_only",
};
export function seedDemo(store: Store) {
  for (const niche of ["shipping", "refunds"] as const) {
    if (store.authenticate(DEMO_KEYS[niche])) continue;
    const { tenant } = store.createTenant(
      niche === "shipping" ? "Northstar Protection" : "Fieldwork Goods",
      niche,
      60,
      "exposure",
      DEMO_KEYS[niche],
    );
    const accounts = [
      "Morgan Lee",
      "Alex Rivera",
      "Sam Chen",
      "Jordan Ellis",
      "Taylor Park",
      "Casey Reed",
      "Riley Quinn",
      "Avery Brooks",
    ];
    accounts.forEach((account, i) => {
      const suspicious = i < 3;
      const event: EventInput = {
        externalId: (niche === "shipping" ? "CLM" : "RFD") + "-" + (1048 + i),
        kind: niche === "shipping" ? "shipping_claim" : "refund_request",
        account,
        order: "ORD-" + (8201 + i),
        addressToken: suspicious ? "addr_shared_018" : "addr_" + i,
        deviceToken: suspicious ? "device_7c2" : "device_" + i,
        amount: [640, 215, 380, 89, 124, 72, 159, 46][i],
        signals: {
          claims30d: suspicious ? 4 : 1,
          accountAgeDays: suspicious ? 6 : 200,
          daysSinceDelivery: i === 0 ? -1 : 5,
          refundRatio: suspicious ? 0.75 : 0.05,
          linkedAccounts: suspicious ? 3 : 1,
          orderValue: [640, 215, 380, 89, 124, 72, 159, 46][i],
        },
        evidence: suspicious
          ? ["customer_statement"]
          : niche === "shipping"
            ? ["delivery_scan", "proof_of_loss", "customer_statement"]
            : ["return_tracking", "item_inspection", "customer_statement"],
      };
      const c = store.ingest(tenant, event);
      if (i === 6)
        store.outcome(tenant.id, c.id, {
          decision: "legitimate",
          note: "Synthetic demo: supporting documentation verified.",
          reviewer: "Demo analyst",
        });
      if (i === 7)
        store.outcome(tenant.id, c.id, {
          decision: "inconclusive",
          note: "Synthetic demo: insufficient evidence to determine abuse.",
          reviewer: "Demo analyst",
        });
    });
  }
}
