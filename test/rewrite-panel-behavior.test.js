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
  assert.doesNotMatch(actionGridHtml, /cross-review-model-selection/);
  assert.match(appJs, /\/api\/model-options/);
  assert.match(appJs, /modelSelection:\s*getSelectedModelSelections\(\)/);
  assert.match(appJs, /function syncCrossReviewModelSelectionRules\(/);
  assert.match(appJs, /function getCrossReviewActionRequirementMessage\(/);
  assert.match(appJs, /function syncCrossReviewActions\(/);
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

test("workflow assistant prioritizes progressing the main publishing path before advanced review", async () => {
  const source = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const start = source.indexOf("function getWorkflowAssistantState()");
  const end = source.indexOf("function renderWorkflowAssistant()", start);
  const workflowSource = source.slice(start, end);
  const renderStart = source.indexOf("function renderWorkflowAssistant()");
  const renderEnd = source.indexOf("function hasAnalyzeInput()", renderStart);
  const renderSource = source.slice(renderStart, renderEnd);

  assert.match(source, /function getPendingFeedbackItems\s*\(/);
  assert.match(source, /function getPendingSampleLibraryItems\s*\(/);
  assert.match(workflowSource, /先处理回流反馈，再继续主链路/);
  assert.match(workflowSource, /先补样本库记录，再继续主链路/);
  assert.match(workflowSource, /open-feedback-center", label: "去处理优先反馈", tone: "button-alt"/);
  assert.match(workflowSource, /open-sample-library", label: "去补样本记录", tone: "button-alt"/);
  assert.match(workflowSource, /save-generation-final", label: "最终推荐稿进入生命周期", tone: "button-alt"/);
  assert.match(workflowSource, /save-rewrite", label: "保存改写稿生命周期", tone: "button-alt"/);
  assert.match(workflowSource, /cross-review", label: "需要时再做交叉复判", tone: "button-ghost"/);
  assert.match(workflowSource, /save-analysis", label: "保存检测记录", tone: "button-alt"/);
  assert.match(workflowSource, /cross-review", label: "需要时再做交叉复判", tone: "button-ghost"/);
  assert.doesNotMatch(workflowSource, /cross-review", label: "模型交叉复判", tone: "button-alt"/);
  assert.match(workflowSource, /actions:\s*\[\]/);
  assert.match(renderSource, /const actionItems = Array\.isArray\(state\.actions\) \? state\.actions : \[\]/);
  assert.match(renderSource, /actionItems\.length/);
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
