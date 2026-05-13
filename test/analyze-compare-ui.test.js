import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function readFrontendFiles() {
  const root = process.cwd();
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(root, "web/index.html"), "utf8"),
    fs.readFile(path.join(root, "web/app.js"), "utf8"),
    fs.readFile(path.join(root, "web/styles.css"), "utf8")
  ]);

  return { indexHtml, appJs, styles };
}

test("analyze workbench exposes an all-model comparison trigger plus a dedicated modal renderer", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="analyze-compare-button"/);
  assert.match(indexHtml, /全部模型对比检测/);
  assert.match(appJs, /\/api\/analyze\/compare/);
  assert.match(appJs, /function\s+buildAnalyzeCompareModalMarkup\s*\(/);
  assert.match(appJs, /function\s+renderAnalyzeCompareModal\s*\(/);
  assert.match(appJs, /function\s+openAnalyzeCompareModal\s*\(/);
  assert.match(appJs, /function\s+buildAnalyzeCompareSummaryMarkup\s*\(/);
  assert.match(appJs, /function\s+buildAnalyzeCompareCardMarkup\s*\(/);
  assert.match(appJs, /kind:\s*"analysis-compare"/);
  assert.match(appJs, /hideSaveButton:\s*true/);
  assert.match(appJs, /hideCancelButton:\s*true/);
  assert.match(appJs, /byId\("analyze-compare-button"\)\.addEventListener\("click", async \(\) => \{/);
  assert.match(appJs, /setGatedButtonState\(compareButton,\s*enabled,\s*requirementMessage\)/);
});

test("analyze compare modal uses a roomy multi-card layout instead of squeezing all models into the main result block", async () => {
  const { styles, appJs } = await readFrontendFiles();

  assert.match(styles, /\.sample-library-modal\[data-modal-kind="analysis-compare"\] \.sample-library-modal-dialog\s*\{/);
  assert.match(styles, /\.sample-library-modal\[data-modal-kind="analysis-compare"\] \.sample-library-modal-dialog\s*\{[\s\S]*width:\s*min\(1180px,\s*calc\(100vw - 2rem\)\);/);
  assert.match(styles, /\.analyze-compare-summary-grid\s*\{/);
  assert.match(styles, /\.analyze-compare-card-grid\s*\{/);
  assert.match(styles, /\.analyze-compare-card\s*\{/);
  assert.match(appJs, /class="analyze-compare-summary-grid"/);
  assert.match(appJs, /class="analyze-compare-card-grid"/);
  assert.match(appJs, /class="analyze-compare-card"/);
});

test("analyze compare cards explain when long-term memory calibration changes the merged verdict", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /memoryCalibration/);
  assert.match(appJs, /长期记忆校准/);
  assert.match(appJs, /基础合并/);
  assert.match(appJs, /安全放宽|风险上调/);
  assert.match(appJs, /memory-calibration-label/);
  assert.match(styles, /\.memory-calibration-label/);
});

test("analyze compare summary shows semantic verdict variety as a count instead of stacking multiple verdicts as the main headline", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /summary\.semanticVerdicts/);
  assert.match(appJs, /semanticVerdictCount/);
  assert.match(appJs, /语义结论分布/);
  assert.match(appJs, /种语义结果/);
});

test("analyze compare summary shows disagreement state with clear wording instead of only a raw number", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /summary\.disagreementCount/);
  assert.match(appJs, /无分歧|有分歧/);
  assert.match(appJs, /最终结论一致|存在不同最终结论/);
});

test("analyze compare modal exposes one shared content action area instead of repeating content actions on each model card", async () => {
  const { appJs } = await readFrontendFiles();
  const cardFunction = appJs.match(/function buildAnalyzeCompareCardMarkup[\s\S]*?\n}\n/)?.[0] || "";

  assert.match(appJs, /class="analyze-compare-content-actions"/);
  assert.match(appJs, /name="analyzeCompareBasisSelection"/);
  assert.match(appJs, /保存基准/);
  assert.match(appJs, /class="analyze-compare-basis-pill"/);
  assert.match(appJs, /当前保存基准/);
  assert.match(appJs, /data-action="open-analyze-compare-false-positive"/);
  assert.match(appJs, /data-action="save-analyze-compare-lifecycle"/);
  assert.match(appJs, /记录这条内容为误报样本/);
  assert.match(appJs, /保存这条内容为生命周期记录/);
  assert.doesNotMatch(cardFunction, /open-analyze-compare-false-positive/);
  assert.doesNotMatch(cardFunction, /save-analyze-compare-lifecycle/);
  assert.doesNotMatch(cardFunction, /buildPlatformOutcomeActions\("analysis-compare"/);
});

test("analyze compare shared actions reuse the existing false-positive modal and lifecycle save flows", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /compareBasisSelection/);
  assert.match(appJs, /fieldName === "analyzeCompareBasisSelection"/);
  assert.match(appJs, /if \(action === "open-analyze-compare-false-positive"\)/);
  assert.match(appJs, /openFeedbackFalsePositiveModal\(\{/);
  assert.match(appJs, /if \(action === "save-analyze-compare-lifecycle"\)/);
  assert.match(appJs, /saveLifecycleFromCurrent\("analysis-compare"/);
});
