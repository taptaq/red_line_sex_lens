import test from "node:test";
import assert from "node:assert/strict";

import {
  checkProhibitedWords,
  mapExternalSensitiveSeverity,
  normalizeProhibitedWordsResult,
  normalizeProhibitedWordsFailure
} from "../src/prohibited-words.js";

test("mapExternalSensitiveSeverity maps low medium high signals into local verdict levels", () => {
  assert.equal(mapExternalSensitiveSeverity({ level: "low" }), "observe");
  assert.equal(mapExternalSensitiveSeverity({ level: "medium" }), "manual_review");
  assert.equal(mapExternalSensitiveSeverity({ level: "high" }), "hard_block");
});

test("normalizeProhibitedWordsResult returns a stable xiaohongshu payload", () => {
  const normalized = normalizeProhibitedWordsResult({
    platform: "xiaohongshu",
    hitCount: 2,
    level: "medium",
    highlightedText: "命中词上下文",
    suggestions: [{ term: "绝对词", replacement: "更稳表达", reason: "避免极限化宣传" }],
    optimizedText: "更稳版本"
  });

  assert.equal(normalized.status, "ok");
  assert.equal(normalized.platform, "xiaohongshu");
  assert.equal(normalized.hitCount, 2);
  assert.equal(normalized.severity, "manual_review");
  assert.equal(normalized.optimizedText, "更稳版本");
});

test("normalizeProhibitedWordsFailure preserves non-blocking error state", () => {
  const normalized = normalizeProhibitedWordsFailure(new Error("服务超时"));
  assert.equal(normalized.status, "error");
  assert.equal(normalized.platform, "xiaohongshu");
  assert.match(normalized.message, /服务超时/);
  assert.equal(normalized.severity, "unknown");
});

test("checkProhibitedWords sends xiaohongshu platform and returns normalized result", async () => {
  const originalApiKey = process.env.REDFOX_API_KEY;
  process.env.REDFOX_API_KEY = "ak_test";

  let captured = null;

  try {
    const result = await checkProhibitedWords(
      { title: "标题", body: "正文", coverText: "封面", tags: ["标签"] },
      {
        requestImpl: async ({ url, headers, body }) => {
          captured = { url, headers, body };
          return {
            hitCount: 1,
            level: "low",
            suggestions: [{ term: "秒杀", replacement: "优惠", reason: "营销风险" }]
          };
        }
      }
    );

    assert.equal(captured.body.platform, "xiaohongshu");
    assert.equal(result.status, "ok");
    assert.equal(result.severity, "observe");
  } finally {
    process.env.REDFOX_API_KEY = originalApiKey;
  }
});

test("checkProhibitedWords returns normalized failure instead of throwing", async () => {
  const originalApiKey = process.env.REDFOX_API_KEY;
  process.env.REDFOX_API_KEY = "ak_test";

  try {
    const result = await checkProhibitedWords(
      { body: "正文" },
      {
        requestImpl: async () => {
          throw new Error("接口超时");
        }
      }
    );

    assert.equal(result.status, "error");
    assert.match(result.message, /接口超时/);
  } finally {
    process.env.REDFOX_API_KEY = originalApiKey;
  }
});
