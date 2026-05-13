import test from "node:test";
import assert from "node:assert/strict";

import { mergeRuleAndSemanticAnalysis } from "../src/semantic-review.js";

test("memory safety signals can soften a merged manual-review verdict to observe", () => {
  const result = mergeRuleAndSemanticAnalysis(
    {
      verdict: "manual_review",
      categories: ["两性用品宣传与展示"],
      hits: [],
      suggestions: [],
      memoryContext: {
        riskFeedback: [],
        falsePositiveHints: [
          {
            id: "fp-1",
            retrievalWeight: 3.1,
            confidence: 0.9,
            payload: { title: "平台已放行案例" }
          }
        ],
        referenceSamples: [],
        memoryCards: []
      }
    },
    null
  );

  assert.equal(result.finalVerdict, "observe");
  assert.equal(result.memoryCalibration?.applied, true);
  assert.equal(result.memoryCalibration?.direction, "safety_soften");
  assert.equal(result.memoryCalibration?.fromVerdict, "manual_review");
  assert.equal(result.memoryCalibration?.toVerdict, "observe");
});

test("memory risk signals can raise a merged pass verdict to observe", () => {
  const result = mergeRuleAndSemanticAnalysis(
    {
      verdict: "pass",
      categories: [],
      hits: [],
      suggestions: [],
      memoryContext: {
        riskFeedback: [
          {
            id: "feedback-1",
            retrievalWeight: 2.2,
            confidence: 0.94,
            riskCategories: ["导流与私域"],
            payload: { platformReason: "导流与私域" }
          }
        ],
        falsePositiveHints: [],
        referenceSamples: [],
        memoryCards: []
      }
    },
    {
      status: "ok",
      review: {
        verdict: "pass",
        categories: [],
        reasons: [],
        summary: "",
        suggestion: ""
      }
    }
  );

  assert.equal(result.finalVerdict, "observe");
  assert.equal(result.memoryCalibration?.applied, true);
  assert.equal(result.memoryCalibration?.direction, "risk_raise");
  assert.equal(result.memoryCalibration?.fromVerdict, "pass");
  assert.equal(result.memoryCalibration?.toVerdict, "observe");
});
