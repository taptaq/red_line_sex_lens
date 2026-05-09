import test from "node:test";
import assert from "node:assert/strict";

import { createRuntimeCache } from "../src/runtime-cache.js";

test("runtime cache reuses in-flight loads and respects ttl invalidation", async () => {
  const cache = createRuntimeCache();
  let calls = 0;

  const loader = async () => {
    calls += 1;
    return { value: calls };
  };

  const [first, second] = await Promise.all([
    cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] }),
    cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] })
  ]);

  assert.equal(calls, 1);
  assert.deepEqual(first, second);

  cache.invalidateTag("summary");
  const third = await cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  assert.equal(calls, 2);
  assert.equal(third.value, 2);
});
