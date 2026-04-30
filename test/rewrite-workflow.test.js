import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHumanizerMessages,
  buildPatchMessages,
  buildRewriteMessages,
  rewriteGenerationConfig,
  shouldPreferBaseRewriteBody
} from "../src/glm.js";
import { rewriteUntilAccepted } from "../src/server.js";

test("rewrite prompt requires preserving full body instead of shortening into a summary", () => {
  const messages = buildRewriteMessages({
    input: {
      title: "原标题",
      body: "第一段\n\n第二段\n\n第三段",
      coverText: "原封面",
      tags: ["关系沟通"]
    },
    analysis: {
      verdict: "manual_review",
      finalVerdict: "manual_review",
      hits: [],
      suggestions: []
    },
    semantic: null
  });

  const userPrompt = String(messages[1]?.content || "");

  assert.ok(rewriteGenerationConfig.baseMaxTokens >= 2200);
  assert.match(userPrompt, /不要把正文缩成摘要|不要明显缩短正文篇幅|尽量保留原文的信息量和段落结构/);
});

test("rewrite prompt includes retry guidance when a previous round still needs manual review", () => {
  const messages = buildRewriteMessages({
    input: {
      title: "原标题",
      body: "原正文",
      coverText: "原封面",
      tags: ["关系沟通"]
    },
    analysis: {
      verdict: "manual_review",
      finalVerdict: "manual_review",
      hits: [],
      suggestions: [],
      retryGuidance: {
        attempt: 2,
        summary: "上一轮仍被判定为人工复核，需要继续定向修改。",
        focusPoints: ["弱化功效承诺", "去掉可能被理解为导流的话术"]
      }
    },
    semantic: null
  });

  const userPrompt = String(messages[1]?.content || "");

  assert.match(userPrompt, /第 3 轮|第3轮/);
  assert.match(userPrompt, /上一轮仍被判定为人工复核/);
  assert.match(userPrompt, /弱化功效承诺/);
  assert.match(userPrompt, /去掉可能被理解为导流的话术/);
});

test("rewrite prompt only keeps the latest retry history item to reduce prompt bloat", () => {
  const messages = buildRewriteMessages({
    input: {
      title: "原标题",
      body: "原正文",
      coverText: "原封面"
    },
    analysis: {
      verdict: "manual_review",
      finalVerdict: "manual_review",
      retryGuidance: {
        attempt: 3,
        summary: "上一轮仍需人工复核",
        focusPoints: ["弱化导流感"]
      },
      retryHistory: [
        { attempt: 1, summary: "第一轮摘要", focusPoints: ["第一轮问题"] },
        { attempt: 2, summary: "第二轮摘要", focusPoints: ["第二轮问题"] }
      ]
    },
    semantic: null
  });

  const userPrompt = String(messages[1]?.content || "");

  assert.match(userPrompt, /第二轮摘要/);
  assert.doesNotMatch(userPrompt, /第一轮摘要/);
});

test("patch prompt asks for local patches tied to retry guidance", () => {
  const messages = buildPatchMessages({
    input: {
      title: "原标题",
      body: "想看的姐妹可以来问我",
      coverText: "原封面",
      tags: ["关系沟通"]
    },
    analysis: {
      verdict: "manual_review",
      finalVerdict: "manual_review",
      retryGuidance: {
        attempt: 1,
        summary: "上一轮仍有导流感",
        focusPoints: ["去掉疑似导流的话术", "保留原本分享语气"]
      },
      retryHistory: [{ attempt: 1, summary: "上一轮仍有导流感", focusPoints: ["去掉疑似导流的话术"] }]
    },
    semantic: null
  });

  const userPrompt = String(messages[1]?.content || "");

  assert.match(userPrompt, /"patches": \[/);
  assert.match(userPrompt, /addresses/);
  assert.match(userPrompt, /优先输出局部 patch/);
  assert.match(userPrompt, /去掉疑似导流的话术/);
});

test("prefers the base rewrite body when the humanizer output is suspiciously truncated", () => {
  const baseBody = "第一段完整内容。\n\n第二段完整内容。\n\n第三段完整内容。";
  const humanizedBody = "第一段完整内容。";

  assert.equal(shouldPreferBaseRewriteBody(baseBody, humanizedBody), true);
  assert.equal(shouldPreferBaseRewriteBody(baseBody, baseBody), false);
});

test("humanizer prompt asks for xiaohongshu-style humanization instead of generic anti-ai cleanup", () => {
  const messages = buildHumanizerMessages({
    input: {
      title: "原始标题",
      body: "今天随手试了一下这个功能，发现还真有点东西。",
      coverText: "原始封面",
      tags: ["关系沟通", "经验分享"]
    },
    analysis: {
      verdict: "observe",
      finalVerdict: "observe",
      suggestions: []
    },
    semantic: {
      summary: "整体风险较低",
      reasons: ["避免过强承诺"]
    },
    baseRewrite: {
      title: "合规标题",
      body: "这是已经过合规处理后的正文。",
      coverText: "合规封面",
      tags: ["关系沟通", "经验分享"],
      rewriteNotes: "去掉了敏感表达"
    }
  });

  const systemPrompt = String(messages[0]?.content || "");
  const userPrompt = String(messages[1]?.content || "");

  assert.match(systemPrompt, /小红书|平台分享/);
  assert.match(userPrompt, /优先保留真实场景和亲身体验/);
  assert.match(userPrompt, /不要编造“有一次”|不要写假设性例子/);
  assert.match(userPrompt, /开头尽量保留抓人感|第一句要让人想继续看/);
  assert.match(userPrompt, /可以使用口语化转场/);
  assert.match(userPrompt, /先理解读者处境|避免居高临下说教/);
});

test("rewriteUntilAccepted retries until merged analysis and cross review both pass", async () => {
  const rewrites = [
    {
      title: "第一轮标题",
      body: "第一轮正文",
      coverText: "第一轮封面",
      tags: ["标签1"]
    },
    {
      title: "第二轮标题",
      body: "第二轮正文",
      coverText: "第二轮封面",
      tags: ["标签2"]
    }
  ];
  const analyses = [
    { verdict: "manual_review", finalVerdict: "manual_review", score: 42, semanticReview: { status: "ok", review: {} } },
    { verdict: "observe", finalVerdict: "observe", score: 8, semanticReview: { status: "ok", review: {} } }
  ];
  const reviews = [{ aggregate: { recommendedVerdict: "pass" } }];
  let rewriteCallCount = 0;
  let analysisCallCount = 0;
  let reviewCallCount = 0;

  const result = await rewriteUntilAccepted({
    input: {
      title: "原标题",
      body: "原正文",
      coverText: "原封面",
      tags: ["原标签"]
    },
    beforeAnalysis: { verdict: "manual_review", finalVerdict: "manual_review", score: 44 },
    maxAttempts: 3,
    rewritePost: async () => rewrites[rewriteCallCount++],
    analyzeMerged: async () => analyses[analysisCallCount++],
    crossReview: async () => reviews[reviewCallCount++]
  });

  assert.equal(rewriteCallCount, 2);
  assert.equal(result.attempts, 2);
  assert.equal(result.accepted, true);
  assert.equal(result.stopReason, "accepted");
  assert.equal(result.rewrite.body, "第二轮正文");
  assert.equal(result.afterAnalysis.finalVerdict, "observe");
  assert.equal(result.afterCrossReview.aggregate.recommendedVerdict, "pass");
  assert.equal(reviewCallCount, 1);
});

test("rewriteUntilAccepted skips cross review on intermediate rounds that are still clearly failing", async () => {
  const rewrites = [
    {
      title: "第一轮标题",
      body: "第一轮正文",
      coverText: "第一轮封面",
      tags: []
    },
    {
      title: "第二轮标题",
      body: "第二轮正文",
      coverText: "第二轮封面",
      tags: []
    }
  ];
  const analyses = [
    { verdict: "manual_review", finalVerdict: "manual_review", score: 41, semanticReview: { status: "ok", review: {} } },
    { verdict: "observe", finalVerdict: "observe", score: 9, semanticReview: { status: "ok", review: {} } }
  ];
  let rewriteCallCount = 0;
  let analysisCallCount = 0;
  let reviewCallCount = 0;

  const result = await rewriteUntilAccepted({
    input: {
      title: "原标题",
      body: "原正文",
      coverText: "原封面"
    },
    beforeAnalysis: { verdict: "manual_review", finalVerdict: "manual_review", score: 44 },
    maxAttempts: 3,
    rewritePost: async () => rewrites[rewriteCallCount++],
    analyzeMerged: async () => analyses[analysisCallCount++],
    crossReview: async () => {
      reviewCallCount += 1;
      return { aggregate: { recommendedVerdict: "pass" } };
    }
  });

  assert.equal(reviewCallCount, 1);
  assert.equal(result.accepted, true);
  assert.equal(result.rounds?.[0]?.afterCrossReview, null);
  assert.equal(result.rounds?.[1]?.afterCrossReview?.aggregate?.recommendedVerdict, "pass");
});

test("rewriteUntilAccepted forwards the selected semantic, rewrite, and cross-review models to each model step", async () => {
  const seenSelections = {
    semantic: [],
    rewrite: [],
    crossReview: []
  };

  const result = await rewriteUntilAccepted({
    input: {
      title: "原标题",
      body: "原正文",
      coverText: "原封面"
    },
    beforeAnalysis: { verdict: "manual_review", finalVerdict: "manual_review", score: 44 },
    modelSelection: {
      semantic: "qwen",
      rewrite: "kimi",
      crossReview: "deepseek"
    },
    maxAttempts: 2,
    rewritePost: async ({ modelSelection }) => {
      seenSelections.rewrite.push(modelSelection);
      return {
        title: "改写标题",
        body: "改写正文",
        coverText: "改写封面",
        tags: []
      };
    },
    analyzeMerged: async (_, options = {}) => {
      seenSelections.semantic.push(options.modelSelection);
      return {
        verdict: "observe",
        finalVerdict: "observe",
        score: 8,
        semanticReview: { status: "ok", review: {} }
      };
    },
    crossReview: async ({ modelSelection }) => {
      seenSelections.crossReview.push(modelSelection);
      return {
        aggregate: {
          recommendedVerdict: "pass"
        }
      };
    }
  });

  assert.equal(result.accepted, true);
  assert.deepEqual(seenSelections.rewrite, ["kimi"]);
  assert.deepEqual(seenSelections.semantic, ["qwen"]);
  assert.deepEqual(seenSelections.crossReview, ["deepseek"]);
});

test("rewriteUntilAccepted feeds structured retry guidance into the next rewrite round", async () => {
  const rewriteCalls = [];
  const analyses = [
    {
      verdict: "manual_review",
      finalVerdict: "manual_review",
      score: 36,
      suggestions: ["弱化功效承诺"],
      semanticReview: {
        status: "ok",
        review: {
          suggestion: "去掉暗示导流的表达",
          reasons: ["语气里还有引导动作感"]
        }
      }
    },
    {
      verdict: "observe",
      finalVerdict: "observe",
      score: 8,
      suggestions: [],
      semanticReview: { status: "ok", review: {} }
    }
  ];
  const reviews = [
    {
      aggregate: {
        recommendedVerdict: "pass",
        reasons: [],
        falseNegativeSignals: []
      }
    }
  ];
  let analysisCallCount = 0;
  let reviewCallCount = 0;

  const result = await rewriteUntilAccepted({
    input: {
      title: "原标题",
      body: "原正文"
    },
    beforeAnalysis: { verdict: "manual_review", finalVerdict: "manual_review", score: 50, suggestions: [] },
    maxAttempts: 3,
    rewritePost: async ({ input, analysis }) => {
      rewriteCalls.push({
        input,
        analysis
      });

      return {
        title: `第${rewriteCalls.length}轮标题`,
        body: `第${rewriteCalls.length}轮正文`,
        coverText: "",
        tags: []
      };
    },
    analyzeMerged: async () => analyses[analysisCallCount++],
    crossReview: async () => reviews[reviewCallCount++]
  });

  assert.equal(rewriteCalls.length, 2);
  assert.equal(rewriteCalls[0].analysis.retryGuidance, undefined);
  assert.equal(rewriteCalls[1].analysis.retryGuidance.attempt, 1);
  assert.match(rewriteCalls[1].analysis.retryGuidance.summary, /人工复核/);
  assert.deepEqual(rewriteCalls[1].analysis.retryGuidance.focusPoints, [
    "弱化功效承诺",
    "去掉暗示导流的表达",
    "语气里还有引导动作感"
  ]);
  assert.equal(result.rounds?.length, 2);
  assert.deepEqual(result.rounds?.[0]?.guidance?.focusPoints, rewriteCalls[1].analysis.retryGuidance.focusPoints);
});

test("rewriteUntilAccepted stops after max attempts when the rewrite still needs manual review", async () => {
  let rewriteCallCount = 0;

  const result = await rewriteUntilAccepted({
    input: {
      title: "原标题",
      body: "原正文"
    },
    beforeAnalysis: { verdict: "manual_review", finalVerdict: "manual_review", score: 50 },
    maxAttempts: 2,
    rewritePost: async () => ({
      title: `第${rewriteCallCount + 1}轮标题`,
      body: `第${rewriteCallCount++ + 1}轮正文`,
      coverText: "",
      tags: []
    }),
    analyzeMerged: async () => ({
      verdict: "manual_review",
      finalVerdict: "manual_review",
      score: 39,
      semanticReview: { status: "ok", review: {} }
    }),
    crossReview: async () => ({
      aggregate: { recommendedVerdict: "manual_review" }
    })
  });

  assert.equal(result.attempts, 2);
  assert.equal(result.accepted, false);
  assert.equal(result.stopReason, "max_attempts_reached");
  assert.equal(result.rewrite.body, "第2轮正文");
});
