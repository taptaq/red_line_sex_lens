import test from "node:test";
import assert from "node:assert/strict";

import { analyzePost } from "../src/analyzer.js";
import { buildAnalysisSnapshot, deriveFailureReasonTags } from "../src/feedback.js";
import { scoreGenerationCandidates } from "../src/generation-workbench.js";

test("deriveFailureReasonTags normalizes repeated reason phrases into stable tags", () => {
  const tags = deriveFailureReasonTags({
    texts: [
      "去掉导流、联系方式、二维码和站外转化表达",
      "弱化功效承诺与绝对化表达",
      "标题还是有轻微挑逗感",
      "避免步骤化教程感",
      "两性用品这类敏感词不要直给"
    ],
    categories: ["导流与私域", "绝对化与功效承诺", "步骤化敏感内容"]
  });

  assert.deepEqual(tags, ["导流感", "功效承诺", "标题挑逗感", "步骤化敏感内容", "敏感词直给"]);
});

test("buildAnalysisSnapshot preserves normalized failure reason tags", () => {
  const snapshot = buildAnalysisSnapshot({
    verdict: "manual_review",
    score: 42,
    categories: ["导流与私域"],
    suggestions: ["去掉导流和站外联系表达"],
    failureReasonTags: ["导流感", "导流感"]
  });

  assert.deepEqual(snapshot.failureReasonTags, ["导流感"]);
});

test("analyzePost exposes failure reason tags for risky content", async () => {
  const result = await analyzePost({
    title: "完整版私信领",
    body: "想看教程完整版可以私信我领取，也不要直接写两性用品。",
    tags: ["关系沟通"]
  });

  assert.equal(Array.isArray(result.failureReasonTags), true);
  assert.ok(result.failureReasonTags.includes("导流感"));
  assert.ok(result.failureReasonTags.includes("步骤化敏感内容"));
});

test("scoreGenerationCandidates emits normalized repair reason tags from analysis and reviews", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-risk",
        variant: "expressive",
        title: "刺激标题",
        body: "完整版教程可以私信我领取。".repeat(10),
        coverText: "刺激封面",
        tags: ["沟通"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async () => ({
      verdict: "manual_review",
      finalVerdict: "manual_review",
      score: 44,
      categories: ["导流与私域"],
      suggestions: ["去掉导流和站外联系表达"]
    }),
    semanticReviewCandidate: async () => ({
      status: "ok",
      review: {
        reasons: ["标题还是有轻微挑逗感"]
      }
    }),
    crossReviewCandidate: async () => ({
      aggregate: {
        recommendedVerdict: "manual_review",
        analysisVerdict: "manual_review",
        reasons: ["避免步骤化教程感"]
      }
    }),
    repairCandidate: async () => ({
      title: "温和标题",
      body: "温和沟通建议。".repeat(12),
      coverText: "沟通提醒",
      tags: ["沟通", "关系"]
    })
  });

  assert.deepEqual(result.scoredCandidates[0].repair.reasonTags, ["导流感", "标题挑逗感", "步骤化敏感内容"]);
});
