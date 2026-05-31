import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("analysis view renders external prohibited-word summary inside the rule detection card", async () => {
  const analysisReviewViewJs = await fs.readFile(path.join(process.cwd(), "web/analysis-review-view.js"), "utf8");

  assert.match(analysisReviewViewJs, /外部违禁词摘要/);
  assert.match(analysisReviewViewJs, /外部违禁词命中与建议/);
  assert.match(analysisReviewViewJs, /结果不完整：外部违禁词检测失败/);
  assert.match(analysisReviewViewJs, /外部建议优化文案/);
});
