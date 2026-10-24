import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { createApp } from "../server/app.js";
import { eventSchema, assess, templates } from "../server/domain.js";
const event = () => ({
  externalId: "CLM-001",
  kind: "shipping_claim",
  account: "Synthetic A",
  order: "ORD-A",
  addressToken: "addr_shared",
  deviceToken: "device_shared",
  amount: 500,
  signals: {
    claims30d: 4,
    accountAgeDays: 5,
    daysSinceDelivery: -1,
    refundRatio: 0.75,
    linkedAccounts: 4,
    orderValue: 500,
  },
  evidence: ["customer_statement"],
});
async function fixture(t: any, options = {}) {
  const store = new Store();
  const app = await createApp(store, options);
  t.after(async () => {
    await app.close();
    store.close();
  });
  const a = store.createTenant("Workspace A", "shipping");
  const b = store.createTenant("Workspace B", "shipping");
  const headers = { authorization: "Bearer " + a.token };
  return { store, app, a, b, headers };
}
test("rules are explainable, bounded, and always observe", () => {
  const e = eventSchema.parse(event());
  const r = assess(
    e,
    templates.shipping.rules,
    60,
    templates.shipping.evidence,
  );
  assert.equal(r.score, 100);
  assert.equal(r.reasons.length, 5);
  assert.deepEqual(r.missingEvidence, ["delivery_scan", "proof_of_loss"]);
  assert.equal(r.mode, "observe");
  assert.equal(r.enforced, false);
  assert.equal(r.recommendation, "review");
});
test("missing evidence routes a low-scoring case to review", () => {
  const e = eventSchema.parse({
    ...event(),
    signals: {
      claims30d: 0,
      accountAgeDays: 300,
      daysSinceDelivery: 5,
      refundRatio: 0,
      linkedAccounts: 1,
      orderValue: 50,
    },
  });
  const r = assess(
    e,
    templates.shipping.rules,
    60,
    templates.shipping.evidence,
  );
  assert.equal(r.score, 0);
  assert.equal(r.recommendation, "review");
});
test("threshold boundary is inclusive and full evidence permits observe", () => {
  const e = eventSchema.parse({
    ...event(),
    evidence: templates.shipping.evidence,
  });
  const rules = [{ ...templates.shipping.rules[0], weight: 60 }];
  assert.equal(assess(e, rules, 60, []).band, "high");
  assert.equal(
    assess(e, [], 60, templates.shipping.evidence).recommendation,
    "observe",
  );
});
test("unauthenticated and invalid keys cannot access any workspace endpoint", async (t) => {
  const { app } = await fixture(t);
  for (const url of [
    "/api/workspace",
    "/api/cases",
    "/api/graph",
    "/api/audit",
  ]) {
    assert.equal((await app.inject({ url })).statusCode, 401);
    assert.equal(
      (await app.inject({ url, headers: { authorization: "Bearer invalid" } }))
        .statusCode,
      401,
    );
  }
});
test("case reads, graph, audit, outcomes and settings remain tenant isolated", async (t) => {
  const { app, headers, b, store } = await fixture(t);
  const created = await app.inject({
    method: "POST",
    url: "/api/events",
    headers,
    payload: event(),
  });
  assert.equal(created.statusCode, 201);
  const c = created.json();
  const other = { authorization: "Bearer " + b.token };
  assert.deepEqual(
    (await app.inject({ url: "/api/cases", headers: other })).json(),
    [],
  );
  assert.equal(
    (await app.inject({ url: "/api/cases/" + c.id, headers: other }))
      .statusCode,
    404,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/cases/" + c.id + "/outcomes",
        headers: other,
        payload: {
          decision: "legitimate",
          note: "Verified sufficient evidence.",
          reviewer: "Analyst",
        },
      })
    ).statusCode,
    404,
  );
  assert.deepEqual(
    (await app.inject({ url: "/api/graph", headers: other })).json(),
    { nodes: [], links: [] },
  );
  assert.equal(
    (await app.inject({ url: "/api/audit", headers: other }))
      .json()
      .some((a: any) => a.case_id === c.id),
    false,
  );
  await app.inject({
    method: "PUT",
    url: "/api/settings",
    headers,
    payload: { reviewThreshold: 80, rules: [], dashboard: "queue" },
  });
  assert.equal(store.tenant(b.tenant.id)?.threshold, 60);
});
test("event IDs are tenant-scoped and retries are idempotent, conflicts rejected", async (t) => {
  const { app, headers, b } = await fixture(t);
  const first = await app.inject({
    method: "POST",
    url: "/api/events",
    headers,
    payload: event(),
  });
  const repeat = await app.inject({
    method: "POST",
    url: "/api/events",
    headers,
    payload: event(),
  });
  assert.equal(repeat.statusCode, 200);
  assert.equal(repeat.json().id, first.json().id);
  assert.equal(repeat.json().replayed, true);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/events",
        headers,
        payload: { ...event(), amount: 600 },
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/events",
        headers: { authorization: "Bearer " + b.token },
        payload: event(),
      })
    ).statusCode,
    201,
  );
  assert.equal(
    (await app.inject({ url: "/api/cases", headers })).json().length,
    1,
  );
});
test("policy updates are versioned and old assessment snapshots stay unchanged", async (t) => {
  const { app, headers, a, store } = await fixture(t);
  const old = await app.inject({
    method: "POST",
    url: "/api/events",
    headers,
    payload: event(),
  });
  const policy = {
    reviewThreshold: 70,
    rules: a.tenant.rules.map((r) => ({ ...r, enabled: false })),
    dashboard: "queue",
  };
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: "/api/settings",
        headers,
        payload: policy,
      })
    ).statusCode,
    200,
  );
  const fresh = await app.inject({
    method: "POST",
    url: "/api/events",
    headers,
    payload: { ...event(), externalId: "CLM-002" },
  });
  assert.equal(fresh.json().assessment.score, 0);
  assert.equal(fresh.json().assessment.policyVersion, 2);
  assert.equal(store.case(a.tenant.id, old.json().id)!.assessment.score, 100);
  assert.equal(
    store.case(a.tenant.id, old.json().id)!.assessment.policyVersion,
    1,
  );
  assert.equal(
    store.trail(a.tenant.id).some((a) => a.action === "policy.updated"),
    true,
  );
});
test("human outcomes require reasoning, persist, audit, and cannot silently overwrite", async (t) => {
  const { app, headers, a, store } = await fixture(t);
  const c = (
    await app.inject({
      method: "POST",
      url: "/api/events",
      headers,
      payload: event(),
    })
  ).json();
  const url = "/api/cases/" + c.id + "/outcomes";
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url,
        headers,
        payload: { decision: "legitimate", note: "no", reviewer: "A" },
      })
    ).statusCode,
    400,
  );
  const body = {
    decision: "inconclusive",
    note: "Requested carrier evidence; awaiting response.",
    reviewer: "Test analyst",
  };
  assert.equal(
    (await app.inject({ method: "POST", url, headers, payload: body }))
      .statusCode,
    200,
  );
  assert.equal(store.case(a.tenant.id, c.id)!.status, "resolved");
  assert.equal(store.trail(a.tenant.id)[0].action, "case.resolved");
  assert.equal(
    (await app.inject({ method: "POST", url, headers, payload: body }))
      .statusCode,
    409,
  );
});
test("validation rejects unsafe fields, excessive values, mismatched niches, duplicate rules", async (t) => {
  const { app, headers, a } = await fixture(t);
  for (const payload of [
    { ...event(), tenant_id: "other" },
    { ...event(), amount: -1 },
    { ...event(), kind: "refund_request" },
    { ...event(), evidence: ["arbitrary"] },
    { ...event(), deviceToken: "<script>" },
  ])
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/events",
          headers,
          payload,
        })
      ).statusCode,
      400,
    );
  assert.equal(
    (
      await app.inject({
        method: "PUT",
        url: "/api/settings",
        headers,
        payload: {
          reviewThreshold: 60,
          rules: [a.tenant.rules[0], a.tenant.rules[0]],
          dashboard: "queue",
        },
      })
    ).statusCode,
    400,
  );
});
test("demo and provisioning are disabled without explicit configuration", async (t) => {
  const { app } = await fixture(t);
  assert.equal((await app.inject({ url: "/api/demo" })).statusCode, 404);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/workspaces",
        payload: { name: "New team", niche: "shipping" },
      })
    ).statusCode,
    403,
  );
});
test("provisioning with admin key returns only the new workspace key", async (t) => {
  const { app } = await fixture(t, { adminToken: "test-admin-secret" });
  const r = await app.inject({
    method: "POST",
    url: "/api/workspaces",
    headers: { authorization: "Bearer test-admin-secret" },
    payload: { name: "New team", niche: "refunds" },
  });
  assert.equal(r.statusCode, 201);
  assert.match(r.json().token, /^cs_[0-9a-f]{64}$/);
  assert.equal(r.json().tenant.niche, "refunds");
  assert.equal("key_hash" in r.json().tenant, false);
});
test("demo seeds both niches and graph connections without cross-workspace identifiers", async (t) => {
  const { app } = await fixture(t, { demo: true });
  const demos = (await app.inject({ url: "/api/demo" })).json().workspaces;
  assert.equal(demos.length, 2);
  for (const d of demos) {
    const headers = { authorization: "Bearer " + d.token };
    const cases = (await app.inject({ url: "/api/cases", headers })).json();
    assert.equal(cases.length, 8);
    assert.equal(cases.filter((c: any) => c.status === "resolved").length, 2);
    const graph = (await app.inject({ url: "/api/graph", headers })).json();
    assert.equal(
      graph.nodes.find((n: any) => n.id === "device:device_7c2").caseIds.length,
      3,
    );
  }
});
test("cross-origin browser mutations are rejected", async (t) => {
  const { app, headers } = await fixture(t);
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/events",
        headers: { ...headers, origin: "https://untrusted.example" },
        payload: event(),
      })
    ).statusCode,
    403,
  );
});

test("cases, key hashes, policies and outcomes survive database reopen", () => {
  const dir = mkdtempSync(join(tmpdir(), "commerceshield-test-"));
  try {
    const path = join(dir, "db.sqlite");
    let store = new Store(path);
    const { tenant, token } = store.createTenant("Persistent team", "shipping");
    const c = store.ingest(tenant, eventSchema.parse(event()));
    store.outcome(tenant.id, c.id, {
      decision: "legitimate",
      reviewer: "Persistence analyst",
      note: "Synthetic evidence verified for persistence test.",
    });
    store.updateSettings(tenant, {
      reviewThreshold: 75,
      rules: tenant.rules,
      dashboard: "outcomes",
    });
    store.close();
    store = new Store(path);
    try {
      assert.equal(store.authenticate(token)?.id, tenant.id);
      assert.equal(store.tenant(tenant.id)?.threshold, 75);
      assert.equal(store.case(tenant.id, c.id)?.outcome.decision, "legitimate");
      assert.equal(store.trail(tenant.id).length, 4);
      const row = store.db
        .prepare("SELECT key_hash FROM tenants WHERE id=?")
        .get(tenant.id) as { key_hash: string };
      assert.notEqual(row.key_hash, token);
      assert.equal(row.key_hash.length, 64);
    } finally {
      store.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
