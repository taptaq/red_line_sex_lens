import test from "node:test";
import assert from "node:assert/strict";

import { scoreGenerationCandidates } from "../src/generation-workbench.js";

test("scoreGenerationCandidates recommends the safest on-style candidate", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      { id: "candidate-safe", variant: "safe", title: "温和沟通", body: "这是一段完整的科普沟通建议正文。".repeat(8), tags: ["沟通"] },
      { id: "candidate-risk", variant: "expressive", title: "全网最低立刻私信", body: "私信我领取。", tags: ["促销"] }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.id === "candidate-risk"
        ? { verdict: "hard_block", finalVerdict: "hard_block", score: 100, suggestions: ["删除导流"] }
        : { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async () => ({ status: "skipped", reviews: [] })
  });

  assert.equal(result.recommendedCandidateId, "candidate-safe");
  assert.equal(result.scoredCandidates[0].id, "candidate-safe");
  assert.ok(result.scoredCandidates[0].scores.total > result.scoredCandidates[1].scores.total);
  assert.match(result.recommendationReason, /合规风险更低/);
});
