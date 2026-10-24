import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import staticFiles from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { timingSafeEqual } from "node:crypto";
import { z, ZodError } from "zod";
import { Store, type Tenant } from "./store.js";
import { DEMO_KEYS, seedDemo } from "./seed.js";
import {
  eventSchema,
  onboardingSchema,
  settingsSchema,
  templates,
} from "./domain.js";
declare module "fastify" {
  interface FastifyRequest {
    tenant: Tenant;
  }
}
export async function createApp(
  store: Store,
  options: { demo?: boolean; adminToken?: string; serveStatic?: boolean } = {},
) {
  const app = Fastify({ logger: false, bodyLimit: 64 * 1024 });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  if (options.demo) seedDemo(store);
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "no-referrer")
      .header("Cache-Control", "no-store");
    // No CORS. Reject browser requests from origins other than this local app.
    const origin = req.headers.origin;
    if (
      origin &&
      ![
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        `http://${req.headers.host}`,
      ].includes(origin)
    )
      return reply.code(403).send({ error: "Origin not allowed" });
    const path = req.url.split("?")[0];
    if (
      !path.startsWith("/api/") ||
      [
        "/api/health",
        "/api/templates",
        "/api/demo",
        "/api/workspaces",
      ].includes(path)
    )
      return;
    const auth = req.headers.authorization;
    const tenant = auth?.startsWith("Bearer ")
      ? store.authenticate(auth.slice(7))
      : undefined;
    if (!tenant)
      return reply
        .code(401)
        .send({ error: "A valid workspace API key is required" });
    req.tenant = tenant;
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({
          error: "Invalid input",
          issues: error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        });
    const code = (error as { statusCode?: number }).statusCode ?? 500;
    return reply
      .code(code >= 400 && code < 500 ? code : 500)
      .send({
        error: code < 500 ? (error as Error).message : "Internal server error",
      });
  });
  app.get("/api/health", async () => ({
    status: "ok",
    mode: "observe",
    version: "0.1.0",
  }));
  app.get("/api/templates", async () => Object.values(templates));
  app.get("/api/demo", async (req, reply) =>
    options.demo
      ? {
          workspaces: Object.entries(DEMO_KEYS).map(([niche, token]) => ({
            niche,
            token,
            name: store.authenticate(token)!.name,
          })),
        }
      : reply.code(404).send({ error: "Demo mode is disabled" }),
  );
  app.post("/api/workspaces", async (req, reply) => {
    if (!options.demo) {
      const supplied = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      const expected = options.adminToken ?? "";
      if (
        !expected ||
        Buffer.byteLength(supplied) !== Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
      )
        return reply
          .code(403)
          .send({ error: "Provisioning requires an administrator token" });
    }
    const body = onboardingSchema.parse(req.body);
    return reply
      .code(201)
      .send(
        store.createTenant(
          body.name,
          body.niche,
          body.reviewThreshold,
          body.dashboard,
        ),
      );
  });
  app.get("/api/workspace", async (req) => ({
    ...req.tenant,
    mode: "observe",
    enforced: false,
    template: templates[req.tenant.niche],
  }));
  app.put("/api/settings", async (req) =>
    store.updateSettings(req.tenant, settingsSchema.parse(req.body)),
  );
  app.get("/api/cases", async (req) => store.cases(req.tenant.id));
  app.get<{ Params: { id: string } }>(
    "/api/cases/:id",
    async (req, reply) =>
      store.case(req.tenant.id, req.params.id) ??
      reply.code(404).send({ error: "Case not found" }),
  );
  app.post("/api/events", async (req, reply) => {
    const body = eventSchema.parse(req.body);
    if (
      (req.tenant.niche === "shipping" && body.kind !== "shipping_claim") ||
      (req.tenant.niche === "refunds" && body.kind !== "refund_request")
    )
      return reply
        .code(400)
        .send({ error: "Event kind must match the workspace niche" });
    const result = store.ingest(req.tenant, body);
    return reply.code(result.replayed ? 200 : 201).send(result);
  });
  app.post<{ Params: { id: string } }>("/api/cases/:id/outcomes", async (req) =>
    store.outcome(
      req.tenant.id,
      req.params.id,
      z
        .object({
          decision: z.enum(["legitimate", "suspected_abuse", "inconclusive"]),
          note: z.string().trim().min(10).max(2000),
          reviewer: z.string().trim().min(2).max(80),
        })
        .strict()
        .parse(req.body),
    ),
  );
  app.get("/api/graph", async (req) => store.graph(req.tenant.id));
  app.get("/api/audit", async (req) => store.trail(req.tenant.id));
  if (options.serveStatic && existsSync(resolve("dist/index.html"))) {
    await app.register(staticFiles, { root: resolve("dist") });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/")
        ? reply.code(404).send({ error: "Not found" })
        : reply.sendFile("index.html"),
    );
  }
  return app;
}
