import test from "node:test";
import assert from "node:assert/strict";

import { evaluateReferenceSampleThreshold, meetsReferenceSampleThreshold } from "../src/reference-samples.js";

test("reference sample qualifies when engagement is near threshold and views are high", () => {
  const result = evaluateReferenceSampleThreshold({
    likes: 18,
    favorites: 4,
    comments: 1,
    views: 5200
  });

  assert.equal(result.qualified, true);
  assert.equal(meetsReferenceSampleThreshold({ likes: 18, favorites: 4, comments: 1, views: 5200 }), true);
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
    evaluateReferenceSampleThreshold({ likes: 36, favorites: 8, comments: 2, views: 1800 }).reason,
    "互动达标"
  );
  assert.equal(
    evaluateReferenceSampleThreshold({ likes: 18, favorites: 4, comments: 1, views: 5200 }).reason,
    "互动接近达标，已由高浏览数补足"
  );
});
