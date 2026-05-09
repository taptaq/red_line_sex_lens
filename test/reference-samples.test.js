import test from "node:test";
import assert from "node:assert/strict";

import { evaluateReferenceSampleThreshold, meetsReferenceSampleThreshold } from "../src/reference-samples.js";

test("reference sample qualifies when engagement is near threshold and views are high", () => {
  const result = evaluateReferenceSampleThreshold({
    likes: 15,
    favorites: 0,
    comments: 0,
    views: 1000
  });

  assert.equal(result.qualified, true);
  assert.equal(meetsReferenceSampleThreshold({ likes: 15, favorites: 0, comments: 0, views: 1000 }), true);
});

test("reference sample does not qualify with high views alone", () => {
  const result = evaluateReferenceSampleThreshold({
    likes: 2,
    favorites: 0,
    comments: 0,
    views: 12000
  });

  assert.equal(result.qualified, false);
  assert.equal(result.reason, "");
});

test("reference sample explains whether it passed by direct engagement or by views assist", () => {
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 8, favorites: 10, comments: 1, views: 800 }).reason,
    "互动达标"
  );
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 15, favorites: 0, comments: 0, views: 1000 }).reason,
    "互动接近达标，已由高浏览数补足"
  );
});

test("reference sample direct qualification now needs higher favorites and comments", () => {
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 14, favorites: 4, comments: 4, views: 1200 }),
    false
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 30, favorites: 0, comments: 0, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 10, comments: 0, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 10, views: 0 }),
    true
  );
});
