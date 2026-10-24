import { spawn } from "node:child_process";
const children = [
  ["tsx", "watch", "server/index.ts"],
  ["vite", "--host", "127.0.0.1"],
].map((args) =>
  spawn(
    process.execPath,
    [
      "node_modules/" +
        (args[0] === "tsx" ? "tsx/dist/cli.mjs" : "vite/bin/vite.js"),
      ...args.slice(1),
    ],
    {
      stdio: "inherit",
      env: { ...process.env, DEMO_MODE: process.env.DEMO_MODE ?? "true" },
    },
  ),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
children.forEach((c) => c.on("exit", (code) => stop(code ?? 0)));
