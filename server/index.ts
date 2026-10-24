import { Store } from "./store.js";
import { createApp } from "./app.js";
const store = new Store(
  process.env.DATABASE_PATH ?? "./data/commerceshield.db",
);
const demo = process.env.DEMO_MODE === "true";
const app = await createApp(store, {
  demo,
  adminToken: process.env.ADMIN_TOKEN,
  serveStatic: true,
});
await app.listen({ port: Number(process.env.PORT ?? 3001), host: "127.0.0.1" });
console.log(
  `Commerce Shield API: http://127.0.0.1:${process.env.PORT ?? 3001} | observation mode | demo ${demo ? "enabled" : "disabled"}`,
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await app.close();
    store.close();
    process.exit(0);
  });
