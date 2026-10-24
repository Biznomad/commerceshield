import Database from "better-sqlite3";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  assess,
  templates,
  type EventInput,
  type Niche,
  type Rule,
} from "./domain.js";
export type Tenant = {
  id: string;
  name: string;
  niche: Niche;
  threshold: number;
  dashboard: string;
  version: number;
  rules: Rule[];
};
export const hashKey = (key: string) =>
  createHash("sha256").update(key).digest("hex");
export class Store {
  db: Database.Database;
  constructor(path = ":memory:") {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, niche TEXT NOT NULL, threshold INTEGER NOT NULL, dashboard TEXT NOT NULL, version INTEGER NOT NULL, rules TEXT NOT NULL, key_hash TEXT UNIQUE NOT NULL);
  CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), external_id TEXT NOT NULL, payload TEXT NOT NULL, assessment TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', outcome TEXT, created_at TEXT NOT NULL, UNIQUE(tenant_id, external_id));
  CREATE TABLE IF NOT EXISTS audit (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT NOT NULL REFERENCES tenants(id), case_id TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  audit(
    tenant: string,
    action: string,
    detail: unknown,
    caseId: string | null = null,
  ) {
    this.db
      .prepare(
        "INSERT INTO audit (tenant_id,case_id,action,detail,created_at) VALUES (?,?,?,?,?)",
      )
      .run(
        tenant,
        caseId,
        action,
        JSON.stringify(detail),
        new Date().toISOString(),
      );
  }
  createTenant(
    name: string,
    niche: Niche,
    threshold = 60,
    dashboard = "exposure",
    key?: string,
  ) {
    const token = key ?? "cs_" + randomBytes(32).toString("hex");
    const id = randomUUID();
    this.db.transaction(() => {
      this.db
        .prepare("INSERT INTO tenants VALUES (?,?,?,?,?,?,?,?)")
        .run(
          id,
          name,
          niche,
          threshold,
          dashboard,
          1,
          JSON.stringify(templates[niche].rules),
          hashKey(token),
        );
      this.audit(id, "workspace.created", { niche, mode: "observe" });
    })();
    return { tenant: this.tenant(id)!, token };
  }
  tenant(id: string): Tenant | undefined {
    const row = this.db
      .prepare(
        "SELECT id,name,niche,threshold,dashboard,version,rules FROM tenants WHERE id=?",
      )
      .get(id) as (Omit<Tenant, "rules"> & { rules: string }) | undefined;
    return row ? { ...row, rules: JSON.parse(row.rules) } : undefined;
  }
  authenticate(token: string) {
    const row = this.db
      .prepare("SELECT id FROM tenants WHERE key_hash=?")
      .get(hashKey(token)) as { id: string } | undefined;
    return row ? this.tenant(row.id) : undefined;
  }
  cases(tenant: string) {
    return (
      this.db
        .prepare(
          "SELECT * FROM cases WHERE tenant_id=? ORDER BY created_at DESC, id",
        )
        .all(tenant) as any[]
    ).map(this.decode);
  }
  case(tenant: string, id: string) {
    const row = this.db
      .prepare("SELECT * FROM cases WHERE tenant_id=? AND id=?")
      .get(tenant, id);
    return row ? this.decode(row) : undefined;
  }
  decode(row: any) {
    return {
      id: row.id,
      externalId: row.external_id,
      event: JSON.parse(row.payload),
      assessment: JSON.parse(row.assessment),
      status: row.status,
      outcome: row.outcome ? JSON.parse(row.outcome) : null,
      createdAt: row.created_at,
    };
  }
  ingest(tenant: Tenant, event: EventInput) {
    return this.db.transaction(() => {
      const existing = this.db
        .prepare("SELECT * FROM cases WHERE tenant_id=? AND external_id=?")
        .get(tenant.id, event.externalId) as any;
      if (existing) {
        if (existing.payload !== JSON.stringify(event))
          throw Object.assign(
            new Error("externalId already exists with a different payload"),
            { statusCode: 409 },
          );
        return { ...this.decode(existing), replayed: true };
      }
      const id = randomUUID();
      const assessment = {
        ...assess(
          event,
          tenant.rules,
          tenant.threshold,
          templates[tenant.niche].evidence,
        ),
        policyVersion: tenant.version,
        niche: tenant.niche,
        workflow: templates[tenant.niche].workflow,
        requiredEvidence: templates[tenant.niche].evidence,
      };
      this.db
        .prepare(
          "INSERT INTO cases (id,tenant_id,external_id,payload,assessment,created_at) VALUES (?,?,?,?,?,?)",
        )
        .run(
          id,
          tenant.id,
          event.externalId,
          JSON.stringify(event),
          JSON.stringify(assessment),
          new Date().toISOString(),
        );
      this.audit(
        tenant.id,
        "event.assessed",
        {
          externalId: event.externalId,
          score: assessment.score,
          policyVersion: tenant.version,
        },
        id,
      );
      return { ...this.case(tenant.id, id)!, replayed: false };
    })();
  }
  updateSettings(
    tenant: Tenant,
    settings: { reviewThreshold: number; rules: Rule[]; dashboard: string },
  ) {
    this.db.transaction(() => {
      this.db
        .prepare(
          "UPDATE tenants SET threshold=?,rules=?,dashboard=?,version=version+1 WHERE id=?",
        )
        .run(
          settings.reviewThreshold,
          JSON.stringify(settings.rules),
          settings.dashboard,
          tenant.id,
        );
      this.audit(tenant.id, "policy.updated", {
        previousVersion: tenant.version,
        ...settings,
      });
    })();
    return this.tenant(tenant.id)!;
  }
  outcome(
    tenant: string,
    id: string,
    input: { decision: string; note: string; reviewer: string },
  ) {
    return this.db.transaction(() => {
      const c = this.case(tenant, id);
      if (!c)
        throw Object.assign(new Error("Case not found"), { statusCode: 404 });
      if (c.status !== "open")
        throw Object.assign(new Error("Case already resolved"), {
          statusCode: 409,
        });
      const outcome = {
        ...input,
        recordedAt: new Date().toISOString(),
        source: "human_review",
      };
      this.db
        .prepare(
          "UPDATE cases SET status='resolved',outcome=? WHERE tenant_id=? AND id=?",
        )
        .run(JSON.stringify(outcome), tenant, id);
      this.audit(tenant, "case.resolved", outcome, id);
      return this.case(tenant, id)!;
    })();
  }
  trail(tenant: string) {
    return (
      this.db
        .prepare(
          "SELECT id,case_id,action,detail,created_at FROM audit WHERE tenant_id=? ORDER BY id DESC LIMIT 100",
        )
        .all(tenant) as any[]
    ).map((r) => ({ ...r, detail: JSON.parse(r.detail) }));
  }
  graph(tenant: string) {
    const nodes = new Map<string, any>();
    const links = new Map<string, any>();
    const add = (
      type: string,
      value: string,
      caseId: string,
      score: number,
    ) => {
      const id = type + ":" + value;
      const n = nodes.get(id) ?? {
        id,
        label: value,
        type,
        score: 0,
        caseIds: [],
      };
      n.score = Math.max(n.score, score);
      if (!n.caseIds.includes(caseId)) n.caseIds.push(caseId);
      nodes.set(id, n);
      return id;
    };
    const link = (source: string, target: string, relationship: string) =>
      links.set(source + ">" + target, { source, target, relationship });
    for (const c of this.cases(tenant)) {
      const e = c.event;
      const s = c.assessment.score;
      const a = add("account", e.account, c.id, s);
      const o = add("order", e.order, c.id, s);
      const claim = add("claim", e.externalId, c.id, s);
      const address = add("address", e.addressToken, c.id, s);
      const device = add("device", e.deviceToken, c.id, s);
      link(a, o, "placed");
      link(o, claim, "requested");
      link(o, address, "ships to");
      link(a, device, "uses");
    }
    return { nodes: [...nodes.values()], links: [...links.values()] };
  }
  close() {
    this.db.close();
  }
}
