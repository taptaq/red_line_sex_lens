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

test("scoreGenerationCandidates repairs an unsafe candidate across multiple rounds until it reaches the accepted range", async () => {
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

      if (repairCalls === 1) {
        return {
          title: "先降风险的版本",
          body: "先把导流感压下来，但风险还没完全消失。".repeat(12),
          coverText: "先收一点",
          tags: ["沟通", "关系"],
          rewriteNotes: "第一轮先删除导流表达"
        };
      }

      return {
        title: "温和沟通建议",
        body: "温和沟通的完整科普建议。".repeat(12),
        coverText: "沟通提醒",
        tags: ["沟通", "关系"],
        rewriteNotes: "第二轮进一步改成稳定的科普沟通语境"
      };
    }
  });

  assert.equal(repairCalls, 2);
  assert.equal(result.recommendedCandidateId, "candidate-risk");
  assert.equal(result.scoredCandidates[0].repair.attempted, true);
  assert.equal(result.scoredCandidates[0].repair.applied, true);
  assert.equal(result.scoredCandidates[0].repair.attempts, 2);
  assert.equal(result.scoredCandidates[0].finalDraft.title, "温和沟通建议");
  assert.equal(result.scoredCandidates[0].analysis.finalVerdict, "pass");
  assert.equal(analyzedBodies[0], "私信我领取。".repeat(20));
  assert.equal(analyzedBodies.length, 3);
  for (const body of analyzedBodies.slice(1)) {
    const emojiMatches = body.match(/\p{Extended_Pictographic}/gu) || [];
    assert.ok(emojiMatches.length >= 3);
    assert.doesNotMatch(body, /🙂✨🫶|🙂✨|✨🫶/);
  }
});

test("scoreGenerationCandidates prefers safe or natural variants over expressive when all are accepted", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-safe",
        variant: "safe",
        title: "温和沟通建议",
        body: "这是一段完整的温和沟通建议正文。".repeat(5),
        coverText: "温和提醒",
        tags: ["沟通", "关系"]
      },
      {
        id: "candidate-expressive",
        variant: "expressive",
        title: "更有情绪张力的表达",
        body: "这是一段完整的温和沟通建议正文，风格更有情绪张力，也更像经验分享。".repeat(10),
        coverText: "经验提醒",
        tags: ["沟通", "关系", "经验"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "关系", "经验"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async () => ({ verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }),
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async () => ({
      aggregate: {
        recommendedVerdict: "pass",
        analysisVerdict: "pass",
        reasons: []
      }
    })
  });

  assert.equal(result.recommendedCandidateId, "candidate-safe");
  assert.equal(result.scoredCandidates[0].id, "candidate-safe");
  assert.equal(result.scoredCandidates[1].id, "candidate-expressive");
});

test("scoreGenerationCandidates never recommends a hard block candidate over an accepted one", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-hard-block",
        variant: "expressive",
        title: "强刺激表达",
        body: "这是一段很完整但不合规的正文。".repeat(20),
        coverText: "刺激封面",
        tags: ["沟通", "经验", "成长"]
      },
      {
        id: "candidate-observe",
        variant: "natural",
        title: "自然表达",
        body: "自然表达正文",
        coverText: "",
        tags: []
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "关系", "经验", "成长"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.id === "candidate-hard-block"
        ? { verdict: "hard_block", finalVerdict: "hard_block", score: 0, suggestions: ["删除刺激表达"] }
        : { verdict: "observe", finalVerdict: "observe", score: 0, suggestions: [] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    })
  });

  assert.equal(result.recommendedCandidateId, "candidate-observe");
  assert.equal(result.scoredCandidates[0].id, "candidate-observe");
  assert.equal(result.scoredCandidates[1].id, "candidate-hard-block");
  assert.match(result.recommendationReason, /合规风险更低/);
});

test("scoreGenerationCandidates exposes blocker reasons when the final draft still needs manual review", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-manual-review",
        variant: "safe",
        title: "仍需观察的表达",
        body: "这是一段还没完全收敛的正文。".repeat(18),
        coverText: "先别急着发",
        tags: ["沟通", "科普"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "科普"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async () => ({
      verdict: "manual_review",
      finalVerdict: "manual_review",
      score: 38,
      suggestions: ["标题语气还可以再收一点"]
    }),
    semanticReviewCandidate: async () => ({
      status: "ok",
      review: {
        verdict: "manual_review",
        reasons: ["语义上仍然带一点暗示感"]
      }
    }),
    crossReviewCandidate: async () => ({
      aggregate: {
        recommendedVerdict: "manual_review",
        analysisVerdict: "manual_review",
        reasons: ["交叉复判认为生活建议和刺激联想挨得太近"]
      }
    })
  });

  assert.deepEqual(result.scoredCandidates[0].blockerReasons, [
    "标题语气还可以再收一点",
    "语义上仍然带一点暗示感",
    "交叉复判认为生活建议和刺激联想挨得太近"
  ]);
  assert.match(result.recommendationReason, /仍需人工复核/);
});

test("scoreGenerationCandidates ignores invalid repair drafts that look like leaked editing prompts", async () => {
  const originalCandidate = {
    id: "candidate-risk",
    variant: "safe",
    title: "原始标题",
    body: "原始正文内容。".repeat(40),
    coverText: "原始封面",
    tags: ["沟通", "经验"]
  };

  const result = await scoreGenerationCandidates({
    candidates: [originalCandidate],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "经验"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async () => ({
      verdict: "manual_review",
      finalVerdict: "manual_review",
      score: 40,
      suggestions: ["再收一点表达"]
    }),
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async () => ({
      aggregate: {
        recommendedVerdict: "manual_review",
        analysisVerdict: "manual_review",
        reasons: ["需要继续观察"]
      }
    }),
    repairCandidate: async () => ({
      title: "",
      body:
        "你好像忘记粘贴**当前合规改写后的具体文本**了。\n\n请把下面这几块内容贴给我，我立刻帮你做人味化处理：\n1. **当前合规改写标题**\n2. **当前合规改写正文**\n3. **当前合规改写封面文案**",
      coverText: "",
      tags: [],
      rewriteNotes: "需要你补充文本"
    })
  });

  assert.equal(result.scoredCandidates[0].repair.attempted, true);
  assert.equal(result.scoredCandidates[0].repair.applied, false);
  assert.match(result.scoredCandidates[0].repair.error, /无效稿件|保留修复前版本/);
  assert.equal(result.scoredCandidates[0].finalDraft.title, originalCandidate.title);
  assert.equal(result.scoredCandidates[0].finalDraft.coverText, originalCandidate.coverText);
  assert.equal(result.scoredCandidates[0].finalDraft.body, originalCandidate.body);
});

test("scoreGenerationCandidates preserves original cover text and tags when repair output omits them", async () => {
  const originalCandidate = {
    id: "candidate-partial-repair",
    variant: "safe",
    title: "原始标题",
    body: "原始正文内容。".repeat(32),
    coverText: "原始封面钩子",
    tags: ["沟通", "经期科普", "关系提醒"]
  };

  const result = await scoreGenerationCandidates({
    candidates: [originalCandidate],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "经期科普"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.title.includes("修复后")
        ? { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }
        : { verdict: "manual_review", finalVerdict: "manual_review", score: 35, suggestions: ["标题再收一点"] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    }),
    repairCandidate: async () => ({
      title: "修复后标题",
      body: "修复后的完整正文。".repeat(20),
      coverText: "",
      tags: [],
      rewriteNotes: "这轮只动了标题和正文"
    })
  });

  assert.equal(result.scoredCandidates[0].repair.applied, true);
  assert.equal(result.scoredCandidates[0].finalDraft.title, "修复后标题");
  assert.equal(result.scoredCandidates[0].finalDraft.coverText, originalCandidate.coverText);
  assert.deepEqual(result.scoredCandidates[0].finalDraft.tags, originalCandidate.tags);
});

test("scoreGenerationCandidates does not let placeholder repair values overwrite good title cover or tags", async () => {
  const originalCandidate = {
    id: "candidate-placeholder-repair",
    variant: "safe",
    title: "原始好标题",
    body: "原始正文内容。".repeat(30),
    coverText: "原始封面钩子",
    tags: ["沟通", "经期科普", "关系提醒"]
  };

  const result = await scoreGenerationCandidates({
    candidates: [originalCandidate],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "经期科普"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.body.includes("修复后的完整正文")
        ? { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }
        : { verdict: "manual_review", finalVerdict: "manual_review", score: 35, suggestions: ["正文再收一点"] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    }),
    repairCandidate: async () => ({
      title: "抱歉，我还需要你补充正文",
      body: "修复后的完整正文。".repeat(20),
      coverText: "未生成封面文案",
      tags: ["标签待补", "沟通"],
      rewriteNotes: "本轮主要补正文"
    })
  });

  assert.equal(result.scoredCandidates[0].repair.applied, true);
  assert.equal(result.scoredCandidates[0].finalDraft.title, originalCandidate.title);
  assert.equal(result.scoredCandidates[0].finalDraft.coverText, originalCandidate.coverText);
  assert.deepEqual(result.scoredCandidates[0].finalDraft.tags, originalCandidate.tags);
});

test("scoreGenerationCandidates continues to the next repair round after an invalid repair draft", async () => {
  let repairCalls = 0;

  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-retry-after-invalid",
        variant: "safe",
        title: "原始标题",
        body: "原始正文内容。".repeat(35),
        coverText: "原始封面",
        tags: ["沟通", "经验"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "经验"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.title.includes("第二轮修复成功")
        ? { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }
        : { verdict: "manual_review", finalVerdict: "manual_review", score: 40, suggestions: ["再收一点表达"] },
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

      if (repairCalls === 1) {
        return {
          body:
            "你好像忘记粘贴**当前合规改写后的具体文本**了。\n\n请把下面这几块内容贴给我，我立刻帮你做人味化处理。",
          rewriteNotes: "无效修复"
        };
      }

      return {
        title: "第二轮修复成功",
        body: "第二轮修复后的完整正文。".repeat(20),
        coverText: "第二轮封面",
        tags: ["沟通", "经验"],
        rewriteNotes: "第二轮修复成功"
      };
    }
  });

  assert.equal(repairCalls, 2);
  assert.equal(result.scoredCandidates[0].repair.attempts, 2);
  assert.equal(result.scoredCandidates[0].repair.invalidDraftCount, 1);
  assert.equal(result.scoredCandidates[0].repair.applied, true);
  assert.equal(result.scoredCandidates[0].finalDraft.title, "第二轮修复成功");
});

test("scoreGenerationCandidates preserves referenced sample ids when repair output omits them", async () => {
  const result = await scoreGenerationCandidates({
    candidates: [
      {
        id: "candidate-reference-ids",
        variant: "safe",
        title: "原始标题",
        body: "原始正文内容。".repeat(28),
        coverText: "原始封面",
        tags: ["沟通", "经验"],
        referencedSampleIds: ["sample-1", "sample-2"]
      }
    ],
    styleProfile: {
      status: "active",
      preferredTags: ["沟通", "经验"],
      tone: "温和克制"
    },
    brief: { topic: "沟通" },
    analyzeCandidate: async (candidate) =>
      candidate.title.includes("修复后标题")
        ? { verdict: "pass", finalVerdict: "pass", score: 0, suggestions: [] }
        : { verdict: "manual_review", finalVerdict: "manual_review", score: 35, suggestions: ["标题再收一点"] },
    semanticReviewCandidate: async () => ({ status: "unavailable", message: "测试不调用模型" }),
    crossReviewCandidate: async ({ analysis }) => ({
      aggregate: {
        recommendedVerdict: analysis.finalVerdict || analysis.verdict,
        analysisVerdict: analysis.finalVerdict || analysis.verdict,
        reasons: []
      }
    }),
    repairCandidate: async () => ({
      title: "修复后标题",
      body: "修复后的完整正文。".repeat(18),
      coverText: "修复后封面",
      tags: ["沟通", "经验"]
    })
  });

  assert.deepEqual(result.scoredCandidates[0].finalDraft.referencedSampleIds, ["sample-1", "sample-2"]);
});
