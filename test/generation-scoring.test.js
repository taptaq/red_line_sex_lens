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

test("scoreGenerationCandidates repairs an unsafe candidate at most once before final ranking", async () => {
  let repairCalls = 0;
  const analyzedBodies = [];

  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-risk",
        variant: "safe",
        title: "全网最低立刻私信",
        body: "私信我领取。".repeat(20),
        coverText: "私信领取",
        tags: ["促销"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) => {
      analyzedBodies.push(candidate.body);
      return candidate.body.includes("温和沟通")
        ? { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }
        : { verdict: "hard_block", finalVerdict: "hard_block", score: 100, suggestions: ["删除导流"] };
    },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    }),
    repairCandidate: async () => {
      repairCalls += 1;
      return {
        title: "温和沟通建议",
        body: "温和沟通的完整科普建议。".repeat(12),
        coverText: "沟通提醒",
        tags: ["沟通", "关系"],
        rewriteNotes: "删除导流表达，改成科普沟通语境"
      };
    }
  });

  assert.equal(repairCalls, 1);
  assert.equal(result.recommendedCandidateId, "candidate-risk");
  assert.equal(result.scoredCandidates[0].repair.attempted, true);
  assert.equal(result.scoredCandidates[0].repair.applied, true);
  assert.equal(result.scoredCandidates[0].finalDraft.title, "温和沟通建议");
  assert.equal(result.scoredCandidates[0].analysis.finalVerdict, "pass");
  assert.deepEqual(analyzedBodies, ["私信我领取。".repeat(20), "温和沟通的完整科普建议。".repeat(12)]);
});
