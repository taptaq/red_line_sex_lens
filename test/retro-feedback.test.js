import test from "node:test";
import assert from "node:assert/strict";

import { buildRetroWeightHints } from "../src/retro-feedback.js";

test("buildRetroWeightHints summarizes validated and invalidated retro signals", () => {
  const hints = buildRetroWeightHints([
    {
      calibration: {
        retro: {
          validatedSignals: ["标题结构", "情绪共鸣"],
          invalidatedSignals: ["标签判断失准"],
          ruleImprovementCandidate: "同类标题结构可提权",
          shouldBecomeReference: true
        }
      }
    }
  ]);

  assert.deepEqual(hints.validatedSignals, ["标题结构", "情绪共鸣"]);
  assert.deepEqual(hints.invalidatedSignals, ["标签判断失准"]);
  assert.deepEqual(hints.ruleCandidates, ["同类标题结构可提权"]);
  assert.deepEqual(hints.styleHints, ["已验证：标题结构", "已验证：情绪共鸣", "被推翻：标签判断失准"]);
  assert.equal(hints.referenceBoostCount, 1);
});
