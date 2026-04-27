import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("rewrite result panel no longer renders the false positive capture block", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function renderRewriteResult(");
  const end = source.indexOf("function buildCrossReviewMarkup(", start);
  const renderRewriteResultSource = source.slice(start, end);

  assert.equal(start > -1, true);
  assert.equal(end > start, true);
  assert.doesNotMatch(renderRewriteResultSource, /buildFalsePositiveActionMarkup/);
  assert.doesNotMatch(renderRewriteResultSource, /falsePositiveMarkup/);
  assert.doesNotMatch(renderRewriteResultSource, /记录为误报样本/);
});

test("rewrite and cross review panels explain model responsibilities clearly", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const rewriteStart = source.indexOf("function renderRewriteResult(");
  const crossReviewStart = source.indexOf("function buildCrossReviewMarkup(");
  const crossReviewEnd = source.indexOf("function renderCrossReviewResult(", crossReviewStart);
  const renderRewriteResultSource = source.slice(rewriteStart, crossReviewStart);
  const buildCrossReviewMarkupSource = source.slice(crossReviewStart, crossReviewEnd);

  assert.match(renderRewriteResultSource, /改写模型来源/);
  assert.match(renderRewriteResultSource, /model-scope-banner-rewrite/);
  assert.match(renderRewriteResultSource, /本区只展示改写模型/);
  assert.match(buildCrossReviewMarkupSource, /当前交叉复判固定使用独立复判模型/);
  assert.match(buildCrossReviewMarkupSource, /model-scope-banner-review/);
  assert.match(buildCrossReviewMarkupSource, /不含 Kimi/);
});

test("analysis panel shows rule engine and semantic model source labels", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function renderAnalysis(");
  const end = source.indexOf("function renderRewriteResult(", start);
  const renderAnalysisSource = source.slice(start, end);

  assert.match(renderAnalysisSource, /规则检测模型/);
  assert.match(renderAnalysisSource, /本地规则引擎/);
  assert.match(renderAnalysisSource, /语义复判模型/);
  assert.match(renderAnalysisSource, /routeLabel/);
});

test("analysis panel shows false-positive downgrade signals when they affect rule detection", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function renderAnalysis(");
  const end = source.indexOf("function renderRewriteResult(", start);
  const renderAnalysisSource = source.slice(start, end);

  assert.match(renderAnalysisSource, /falsePositiveHints/);
  assert.match(renderAnalysisSource, /规则偏严反例/);
  assert.match(renderAnalysisSource, /宽松白名单/);
});

test("main workbench exposes per-action model selectors and sends current selections with model requests", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="semantic-model-selection"/);
  assert.match(indexHtml, /id="rewrite-model-selection"/);
  assert.match(indexHtml, /id="cross-review-model-selection"/);
  assert.match(appJs, /\/api\/model-options/);
  assert.match(appJs, /modelSelection:\s*getSelectedModelSelections\(\)/);
});

test("feedback workbench exposes per-action model selectors and sends current selections with feedback model requests", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="feedback-screenshot-model-selection"/);
  assert.match(indexHtml, /id="feedback-suggestion-model-selection"/);
  assert.match(appJs, /getSelectedFeedbackModelSelections/);
  assert.match(appJs, /\/api\/feedback\/extract-screenshot/);
  assert.match(appJs, /\/api\/feedback/);
  assert.match(appJs, /modelSelection:\s*getSelectedFeedbackModelSelections\(\)/);
});

test("rewrite result panel renders round-by-round retry guidance", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function renderRewriteResult(");
  const end = source.indexOf("function buildCrossReviewMarkup(", start);
  const renderRewriteResultSource = source.slice(start, end);

  assert.match(renderRewriteResultSource, /逐轮修正建议/);
  assert.match(renderRewriteResultSource, /rounds/);
  assert.match(renderRewriteResultSource, /focusPoints/);
  assert.match(renderRewriteResultSource, /实际修改/);
  assert.match(renderRewriteResultSource, /剩余风险/);
  assert.match(renderRewriteResultSource, /appliedPatches/);
});
