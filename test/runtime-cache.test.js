import test from "node:test";
import assert from "node:assert/strict";

import { createRuntimeCache } from "../src/runtime-cache.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

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

test("invalidateTag during an in-flight load causes next access to reload", async () => {
  const cache = createRuntimeCache();
  const firstLoad = createDeferred();
  let calls = 0;

  const loader = async () => {
    calls += 1;
    if (calls === 1) return firstLoad.promise;
    return { value: calls };
  };

  const pending = cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  cache.invalidateTag("summary");
  firstLoad.resolve({ value: "stale" });

  assert.deepEqual(await pending, { value: "stale" });

  const next = await cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  assert.equal(calls, 2);
  assert.deepEqual(next, { value: 2 });
});

test("invalidateKey during an in-flight load causes next access to reload", async () => {
  const cache = createRuntimeCache();
  const firstLoad = createDeferred();
  let calls = 0;

  const loader = async () => {
    calls += 1;
    if (calls === 1) return firstLoad.promise;
    return { value: calls };
  };

  const pending = cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  cache.invalidateKey("summary");
  firstLoad.resolve({ value: "stale" });

  assert.deepEqual(await pending, { value: "stale" });

  const next = await cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  assert.equal(calls, 2);
  assert.deepEqual(next, { value: 2 });
});

test("clear during an in-flight load does not let old result repopulate cache", async () => {
  const cache = createRuntimeCache();
  const firstLoad = createDeferred();
  let calls = 0;

  const loader = async () => {
    calls += 1;
    if (calls === 1) return firstLoad.promise;
    return { value: calls };
  };

  const pending = cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  cache.clear();
  firstLoad.resolve({ value: "stale" });

  assert.deepEqual(await pending, { value: "stale" });

  const next = await cache.getOrLoad("summary", loader, { ttlMs: 1000, tags: ["summary"] });
  assert.equal(calls, 2);
  assert.deepEqual(next, { value: 2 });
});
