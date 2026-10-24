import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemoReplay, linkIsVisible } from "../src/replay.js";
import { Store } from "../server/store.js";
import { seedDemo, DEMO_KEYS } from "../server/seed.js";
test("both seeded niches replay real relationships cumulatively to the complete graph", () => {
  const store = new Store();
  try {
    seedDemo(store);
    for (const key of Object.values(DEMO_KEYS)) {
      const graph = store.graph(store.authenticate(key)!.id);
      const steps = buildDemoReplay(graph.nodes);
      assert.equal(steps.length, 8);
      assert.deepEqual(steps[0].nodeIds, ["account:Morgan Lee"]);
      assert.equal(steps[1].nodeIds.includes("order:ORD-8201"), true);
      assert.equal(
        steps[2].nodeIds.filter((id) => id.startsWith("claim:")).length,
        1,
      );
      assert.equal(
        steps[5].nodeIds.filter((id) => id.startsWith("account:")).length,
        3,
      );
      assert.equal(steps[6].nodeIds.includes("device:device_7c2"), true);
      assert.equal(steps[7].nodeIds.length, graph.nodes.length);
      steps.forEach((s, i) => {
        if (i)
          for (const id of steps[i - 1].nodeIds)
            assert.equal(s.nodeIds.includes(id), true);
        const visible = new Set(s.nodeIds);
        for (const l of graph.links.filter((l) => linkIsVisible(l, visible))) {
          assert(visible.has(l.source));
          assert(visible.has(l.target));
        }
      });
    }
  } finally {
    store.close();
  }
});
test("replay accepts force-graph mutated endpoints and hides links with missing endpoints", () => {
  const visible = new Set(["a", "b"]);
  assert.equal(
    linkIsVisible({ source: { id: "a" }, target: { id: "b" } }, visible),
    true,
  );
  assert.equal(linkIsVisible({ source: "a", target: "c" }, visible), false);
  assert.deepEqual(buildDemoReplay([]), []);
});
