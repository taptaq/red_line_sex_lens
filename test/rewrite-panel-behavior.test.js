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
  assert.match(buildCrossReviewMarkupSource, /当前交叉复判会自动避开已选改写模型/);
  assert.match(buildCrossReviewMarkupSource, /model-scope-banner-review/);
  assert.match(buildCrossReviewMarkupSource, /不与改写模型重复/);
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

test("analysis panel distinguishes failed semantic attempts from successful semantic model output", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function renderAnalysis(");
  const end = source.indexOf("function renderRewriteResult(", start);
  const renderAnalysisSource = source.slice(start, end);

  assert.match(renderAnalysisSource, /语义复判未成功/);
  assert.match(renderAnalysisSource, /已尝试以下模型/);
  assert.doesNotMatch(renderAnalysisSource, /语义复判模型：\$\{escapeHtml\(`已尝试/);
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
  const actionGridStart = indexHtml.indexOf('<div class="model-action-grid">');
  const actionGridEnd = indexHtml.indexOf("</div>", actionGridStart);
  const actionGridHtml = indexHtml.slice(actionGridStart, actionGridEnd);

  assert.match(indexHtml, /id="semantic-model-selection"/);
  assert.match(indexHtml, /id="rewrite-model-selection"/);
  assert.match(indexHtml, /id="advanced-judgement-panel"/);
  assert.match(indexHtml, /高级判断/);
  assert.match(indexHtml, /id="cross-review-model-selection"/);
  assert.match(indexHtml, /id="cross-review-action-hint"/);
  assert.match(indexHtml, /只在结论接近或有分歧时再展开/);
  assert.doesNotMatch(actionGridHtml, /cross-review-model-selection/);
  assert.match(appJs, /\/api\/model-options/);
  assert.match(appJs, /modelSelection:\s*getSelectedModelSelections\(\)/);
  assert.match(appJs, /function syncCrossReviewModelSelectionRules\(/);
  assert.match(appJs, /function getCrossReviewActionRequirementMessage\(/);
  assert.match(appJs, /function syncCrossReviewActions\(/);
  assert.match(appJs, /function shouldRecommendCrossReview\(/);
  assert.match(appJs, /cross-review-model-selection/);
  assert.match(appJs, /rewrite-model-selection/);
  assert.match(appJs, /option\.disabled/);
});

test("feedback workbench exposes per-action model selectors and sends current selections with feedback model requests", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /id="feedback-screenshot-model-selection"/);
  assert.match(indexHtml, /id="feedback-suggestion-model-selection"/);
  assert.match(indexHtml, /id="feedback-advanced-panel"/);
  assert.match(indexHtml, /高级识别/);
  assert.match(indexHtml, /id="feedback-quick-submit"/);
  assert.match(indexHtml, /id="feedback-recognize-action-hint"/);
  assert.match(appJs, /getSelectedFeedbackModelSelections/);
  assert.match(appJs, /\/api\/feedback\/extract-screenshot/);
  assert.match(appJs, /\/api\/feedback/);
  assert.match(appJs, /modelSelection:\s*getSelectedFeedbackModelSelections\(\)/);
  assert.match(appJs, /function ensureFeedbackAdvancedPanelOpen\(/);
  assert.match(appJs, /function getFeedbackRecognizeRequirementMessage\(/);
});

test("generation workbench is folded into the main workbench as an optional branch", async () => {
  const [indexHtml, appJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="analyze-workbench-pane"/);
  assert.match(indexHtml, /data-tab-target="generation-workbench-pane"/);
  assert.match(indexHtml, /id="analyze-workbench-pane"/);
  assert.match(indexHtml, /id="generation-workbench-pane"/);
  assert.doesNotMatch(indexHtml, /id="generation-branch-panel"/);
  assert.doesNotMatch(indexHtml, /没有原稿？生成候选稿/);
  assert.match(indexHtml, /id="generation-workbench-form"/);
  assert.match(indexHtml, /id="generation-result"/);
  assert.match(indexHtml, /id="generation-action-hint"/);
  assert.match(appJs, /function revealGenerationWorkbenchPane\(/);
  assert.match(appJs, /byId\("generation-workbench-form"\)\.addEventListener\("submit"/);
});

test("main workbench no longer keeps a separate workflow assistant layer", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.doesNotMatch(indexHtml, /id="workflow-assistant"/);
  assert.doesNotMatch(indexHtml, /id="workflow-timeline"/);
  assert.doesNotMatch(appJs, /function getPendingFeedbackItems\s*\(/);
  assert.doesNotMatch(appJs, /function getPendingSampleLibraryItems\s*\(/);
  assert.doesNotMatch(appJs, /function getWorkflowAssistantState\s*\(/);
  assert.doesNotMatch(appJs, /function renderWorkflowAssistant\s*\(/);
  assert.doesNotMatch(appJs, /async function runWorkflowAction\(action = ""\)/);
  assert.doesNotMatch(appJs, /data-workflow-action/);
  assert.doesNotMatch(styles, /\.workflow-assistant-card/);
  assert.doesNotMatch(styles, /\.workflow-timeline/);
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
