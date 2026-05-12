import test from "node:test";
import assert from "node:assert/strict";

import { evaluateReferenceSampleThreshold, meetsReferenceSampleThreshold } from "../src/reference-samples.js";

test("reference sample qualifies when engagement is near threshold and views are high", () => {
  const result = evaluateReferenceSampleThreshold({
    likes: 15,
    favorites: 0,
    comments: 0,
    shares: 0,
    views: 1000
  });

  assert.equal(result.qualified, true);
  assert.equal(meetsReferenceSampleThreshold({ likes: 15, favorites: 0, comments: 0, shares: 0, views: 1000 }), true);
});

test("reference sample does not qualify with high views alone", () => {
  const result = evaluateReferenceSampleThreshold({
    likes: 2,
    favorites: 0,
    comments: 0,
    shares: 0,
    views: 1200
  });

  assert.equal(result.qualified, false);
  assert.equal(result.reason, "");
});

test("reference sample explains whether it passed by direct engagement or by views assist", () => {
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 8, favorites: 20, comments: 1, shares: 0, views: 800 }).reason,
    "互动直达达标"
  );
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 15, favorites: 0, comments: 0, shares: 0, views: 1000 }).reason,
    "互动接近达标，已由高浏览补足"
  );
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 0, views: 2000 }).reason,
    "浏览直达达标"
  );
});

test("reference sample direct qualification now also accepts shares", () => {
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 14, favorites: 9, comments: 4, shares: 9, views: 1200 }),
    false
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 30, favorites: 0, comments: 0, shares: 0, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 20, comments: 0, shares: 0, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 10, shares: 0, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 20, views: 0 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 0, views: 2000 }),
    true
  );
});

test("reference sample views-assist qualification now also accepts near shares", () => {
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 10, views: 1000 }),
    true
  );
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 10, views: 1000 }).reason,
    "互动接近达标，已由高浏览补足"
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 10, comments: 0, shares: 0, views: 1000 }),
    true
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 9, comments: 0, shares: 0, views: 1000 }),
    false
  );
  assert.equal(
    meetsReferenceSampleThreshold({ likes: 0, favorites: 0, comments: 0, shares: 9, views: 999 }),
    false
  );
});
