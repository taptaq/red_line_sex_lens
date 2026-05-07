import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateSampleWeight,
  rankSamplesByWeight,
  withSampleWeight
} from "../src/sample-weight.js";
import { buildGenerationMessages } from "../src/generation-workbench.js";
import { getSuccessSampleWeight } from "../src/success-samples.js";

test("sample weights prefer stronger confirmed evidence over weaker samples", () => {
  const passed = calculateSampleWeight({ tier: "passed" }, "success");
  const featured = calculateSampleWeight({ tier: "featured" }, "success");
  const pendingSuccess = calculateSampleWeight({ tier: "featured", confidence: "pending" }, "success");
  const confirmedSuccess = calculateSampleWeight({ tier: "featured", confidence: "confirmed" }, "success");
  const pendingFalsePositive = calculateSampleWeight({ status: "platform_passed_pending" }, "false_positive");
  const confirmedFalsePositive = calculateSampleWeight({ status: "platform_passed_confirmed" }, "false_positive");
  const importedSuccess = calculateSampleWeight({ tier: "featured", confidence: "confirmed", sourceQuality: "imported" }, "success");
  const verifiedSuccess = calculateSampleWeight({ tier: "featured", confidence: "confirmed", sourceQuality: "manual_verified" }, "success");

  assert.ok(featured > passed);
  assert.ok(confirmedSuccess > pendingSuccess);
  assert.ok(confirmedFalsePositive > pendingFalsePositive);
  assert.ok(verifiedSuccess > importedSuccess);
  assert.equal(getSuccessSampleWeight({ tier: "featured" }), featured);
});

test("sample weights include lifecycle outcomes and engagement signals", () => {
  const onlyPublished = calculateSampleWeight({ status: "published_passed" }, "lifecycle");
  const performed = calculateSampleWeight(
    {
      status: "positive_performance",
      publishResult: {
        metrics: { likes: 120, favorites: 30, comments: 8 }
      }
    },
    "lifecycle"
  );
  const violation = calculateSampleWeight({ status: "violation" }, "lifecycle");

  assert.ok(performed > onlyPublished);
  assert.ok(onlyPublished > violation);
});

test("sample weights only use views as a small assist instead of the main driver", () => {
  const nearThresholdWithoutViews = calculateSampleWeight(
    {
      status: "published_passed",
      publishResult: {
        metrics: { likes: 18, favorites: 4, comments: 1, views: 0 }
      }
    },
    "lifecycle"
  );
  const nearThresholdWithViews = calculateSampleWeight(
    {
      status: "published_passed",
      publishResult: {
        metrics: { likes: 18, favorites: 4, comments: 1, views: 8200 }
      }
    },
    "lifecycle"
  );
  const clearlyEngaged = calculateSampleWeight(
    {
      status: "published_passed",
      publishResult: {
        metrics: { likes: 42, favorites: 9, comments: 3, views: 0 }
      }
    },
    "lifecycle"
  );

  assert.ok(nearThresholdWithViews > nearThresholdWithoutViews);
  assert.ok(clearlyEngaged > nearThresholdWithViews);
});

test("weighted ranking sorts samples and exposes sampleWeight", () => {
  const ranked = rankSamplesByWeight(
    [
      { id: "low", tier: "passed" },
      { id: "high", tier: "featured" }
    ],
    "success"
  );

  assert.equal(ranked[0].id, "high");
  assert.equal(ranked[0].sampleWeight, calculateSampleWeight({ tier: "featured" }, "success"));
  assert.equal(withSampleWeight({ id: "fp", status: "platform_passed_confirmed" }, "false_positive").sampleWeight > 1, true);
});

test("generation prompt uses higher weighted reference samples first", () => {
  const messages = buildGenerationMessages({
    referenceSamples: [
      { id: "passed", tier: "passed", title: "仅过审样本", body: "普通正文" },
      { id: "featured", tier: "featured", title: "精选样本", body: "高质量正文" }
    ]
  });
  const prompt = messages[1].content;

  assert.ok(prompt.indexOf("精选样本") < prompt.indexOf("仅过审样本"));
});
