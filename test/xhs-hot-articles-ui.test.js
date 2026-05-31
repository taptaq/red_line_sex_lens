import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");

test("generation result renders hot-article formula source without raw list leakage", () => {
  assert.match(appJs, /function buildGenerationHotArticleFormulaMarkup/);
  assert.match(appJs, /爆款公式来源/);
  assert.match(appJs, /hotArticleFormula\.references/);
  assert.match(appJs, /收藏/);
  assert.match(appJs, /分享/);
  assert.match(appJs, /评论/);
  assert.match(appJs, /点赞/);
  assert.match(appJs, /爆文规律暂不可用/);
  assert.doesNotMatch(appJs, /hotArticleFormula\.items\.map/);
});
