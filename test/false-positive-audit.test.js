import test from "node:test";
import assert from "node:assert/strict";

import { buildFalsePositiveAudit } from "../src/feedback.js";

test("marks confirmed manual-review sample as strict_confirmed", () => {
  const audit = buildFalsePositiveAudit({
    status: "platform_passed_confirmed",
    analysisSnapshot: {
      verdict: "manual_review",
      score: 48,
      categories: ["两性用品宣传与展示"],
      topHits: [{ category: "两性用品宣传与展示", riskLevel: "manual_review", reason: "示例" }]
    }
  });

  assert.equal(audit.signal, "strict_confirmed");
  assert.match(audit.notes, /观察期/);
});

test("keeps pending sample as strict_pending", () => {
  const audit = buildFalsePositiveAudit({
    status: "platform_passed_pending",
    analysisSnapshot: {
      verdict: "hard_block",
      score: 91,
      categories: ["导流与私域"],
      topHits: [{ category: "导流与私域", riskLevel: "hard_block", reason: "示例" }]
    }
  });

  assert.equal(audit.signal, "strict_pending");
  assert.match(audit.notes, /观察期/);
});

test("returns not_enough_evidence when snapshot is missing or too weak", () => {
  const missingSnapshotAudit = buildFalsePositiveAudit({
    status: "platform_passed_confirmed"
  });
  const weakSnapshotAudit = buildFalsePositiveAudit({
    status: "platform_passed_pending",
    analysisSnapshot: {
      verdict: "pass",
      score: 5
    }
  });

  assert.equal(missingSnapshotAudit.signal, "not_enough_evidence");
  assert.equal(weakSnapshotAudit.signal, "not_enough_evidence");
});

test("returns not_enough_evidence for unknown or malformed status values", () => {
  const unknownStatusAudit = buildFalsePositiveAudit({
    status: "something_else",
    analysisSnapshot: {
      verdict: "manual_review",
      score: 48,
      categories: ["两性用品宣传与展示"],
      topHits: [{ category: "两性用品宣传与展示", riskLevel: "manual_review", reason: "示例" }]
    }
  });
  const malformedStatusAudit = buildFalsePositiveAudit({
    status: "   ",
    analysisSnapshot: {
      verdict: "hard_block",
      score: 91,
      categories: ["导流与私域"],
      topHits: [{ category: "导流与私域", riskLevel: "hard_block", reason: "示例" }]
    }
  });

  assert.equal(unknownStatusAudit.signal, "not_enough_evidence");
  assert.equal(malformedStatusAudit.signal, "not_enough_evidence");
});
