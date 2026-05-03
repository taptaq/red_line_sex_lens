import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

async function readFrontendFiles() {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  return { indexHtml, appJs, styles };
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;

  if (start === -1 || end === -1 || end <= start) {
    return "";
  }

  return source.slice(start, end);
}

test("frontend exposes review benchmark maintenance tab and form skeleton", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();
  const calibrationStart = indexHtml.indexOf('<details id="system-calibration-panel"');
  const calibrationEnd = indexHtml.indexOf("</details>", calibrationStart);
  const calibrationPanel = indexHtml.slice(calibrationStart, calibrationEnd);
  const panelStart = indexHtml.indexOf('<section id="review-benchmark-pane">');
  const panelEnd = indexHtml.indexOf('<section id="model-performance-pane">', panelStart);
  const benchmarkPanel = indexHtml.slice(panelStart, panelEnd);

  assert.doesNotMatch(indexHtml, /data-tab-target="review-benchmark-pane"[^>]*>基准评测</);
  assert.match(indexHtml, /id="review-benchmark-pane"/);
  assert.match(indexHtml, /系统校准/);
  assert.match(indexHtml, /id="system-calibration-panel"/);
  assert.doesNotMatch(calibrationPanel, /<details id="system-calibration-panel"[^>]*\sopen[>\s]/);
  assert.match(calibrationPanel, /<summary[^>]*>/);
  assert.match(benchmarkPanel, /id="review-benchmark-form"/);
  assert.match(benchmarkPanel, /name="title"/);
  assert.match(benchmarkPanel, /name="body"/);
  assert.match(benchmarkPanel, /name="tags"/);
  assert.match(benchmarkPanel, /name="expectedType"/);
  assert.doesNotMatch(benchmarkPanel, /name="coverText"/);
  assert.match(indexHtml, />保存基准样本</);
  assert.match(indexHtml, /id="review-benchmark-run-button"/);
  assert.match(indexHtml, />运行基准评测</);
  assert.match(indexHtml, /id="review-benchmark-result"/);
  assert.match(indexHtml, /id="review-benchmark-list"/);
  assert.match(indexHtml, /id="review-benchmark-collection-filter"/);
  assert.match(indexHtml, /id="review-benchmark-type-filter"/);
  assert.match(indexHtml, /id="review-benchmark-source-filter"/);
  assert.match(indexHtml, /id="review-benchmark-view-filter"/);
  assert.match(indexHtml, /id="review-benchmark-action-hint"/);
  assert.match(benchmarkPanel, /name="collectionType"/);
  assert.match(appJs, /const reviewBenchmarkApi = "\/api\/review-benchmark"/);
  assert.match(appJs, /function renderReviewBenchmarkSamples/);
  assert.match(appJs, /function expectedTypeLabel/);
  assert.match(appJs, /function filterReviewBenchmarkSamples/);
  assert.match(appJs, /function buildReviewBenchmarkMismatchSummary/);
  assert.match(appJs, /function ensureSystemCalibrationOpen\(/);
  assert.match(appJs, /function getReviewBenchmarkSubmitRequirementMessage\(/);
  assert.match(appJs, /function getReviewBenchmarkRunRequirementMessage\(/);
  assert.match(appJs, /function syncReviewBenchmarkActions\(/);
  assert.match(appJs, /data-action="delete-review-benchmark"/);
});

test("review benchmark submit handler prevents native reload and posts to benchmark API", async () => {
  const { appJs } = await readFrontendFiles();
  const submitHandler = sliceBetween(
    appJs,
    'byId("review-benchmark-form").addEventListener("submit"',
    'byId("review-benchmark-run-button").addEventListener("click"'
  );

  assert.match(submitHandler, /byId\("review-benchmark-form"\)\.addEventListener\("submit", async \(event\) => \{/);
  assert.match(submitHandler, /event\.preventDefault\(\)/);
  assert.match(submitHandler, /new FormData\(formElement\)/);
  assert.match(submitHandler, /await addBenchmarkSample\(\{/);
  assert.match(submitHandler, /type: "manual"/);
  assert.match(submitHandler, /formElement\.reset\(\)/);
});

test("review benchmark filter controls are wired into app state and list rendering", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /reviewBenchmarkSamples:\s*\[\s*\]/);
  assert.match(appJs, /reviewBenchmarkCollectionFilter:\s*"all"/);
  assert.match(appJs, /reviewBenchmarkTypeFilter:\s*"all"/);
  assert.match(appJs, /reviewBenchmarkSourceFilter:\s*"all"/);
  assert.match(appJs, /reviewBenchmarkViewFilter:\s*"all"/);
  assert.match(appJs, /reviewBenchmarkLastRunResult:\s*null/);
  assert.match(appJs, /function filterReviewBenchmarkSamples\(/);
  assert.match(appJs, /byId\("review-benchmark-collection-filter"\)\.addEventListener\("change"/);
  assert.match(appJs, /byId\("review-benchmark-type-filter"\)\.addEventListener\("change"/);
  assert.match(appJs, /byId\("review-benchmark-source-filter"\)\.addEventListener\("change"/);
  assert.match(appJs, /byId\("review-benchmark-view-filter"\)\.addEventListener\("change"/);
  assert.match(appJs, /review-benchmark-list-count/);
  assert.match(styles, /\.shell\s*\{/);
  assert.match(styles, /width:\s*min\(1600px,\s*calc\(100% - 2\.4rem\)\)/);
  assert.match(styles, /\.review-benchmark-toolbar/);
  assert.match(styles, /\.review-benchmark-toolbar-filters/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.feedback-model-grid\s*,[\s\S]*\.review-provider-grid\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr;/);
  assert.match(styles, /@media\s*\(max-width:\s*1200px\)/);
  assert.match(styles, /\.sample-library-toolbar/);
  assert.match(styles, /\.workflow-assistant-card/);
  assert.match(styles, /\.false-positive-capture-form/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.sample-library-toolbar\s*,[\s\S]*\.review-benchmark-toolbar\s*,[\s\S]*\.false-positive-capture-form\s*,[\s\S]*\.cross-review-top\s*\{[\s\S]*grid-template-columns:\s*1fr;/);
});

test("review benchmark run button uses dedicated run endpoint and renders summary details", async () => {
  const { appJs } = await readFrontendFiles();
  const runHandler = sliceBetween(
    appJs,
    'byId("review-benchmark-run-button").addEventListener("click"',
    'initializeTabs();'
  );

  assert.match(runHandler, /byId\("review-benchmark-run-button"\)\.addEventListener\("click", async \(\) => \{/);
  assert.match(runHandler, /reviewBenchmarkApi}\/run/);
  assert.match(runHandler, /renderReviewBenchmarkResult\(/);
  assert.match(runHandler, /reviewBenchmarkViewFilter/);
  assert.match(appJs, /summary\.total/);
  assert.match(appJs, /matchedExpectation/);
  assert.match(appJs, /未匹配样本/);
  assert.match(appJs, /ensureSystemCalibrationOpen\(\)/);
});

test("review benchmark refresh chain is independent from admin aggregate data", async () => {
  const { appJs } = await readFrontendFiles();

  const refreshAllStart = appJs.indexOf("async function refreshAll()");
  const refreshAllEnd = appJs.indexOf("async function fileToDataUrl", refreshAllStart);
  const refreshAllSource = appJs.slice(refreshAllStart, refreshAllEnd);

  assert.match(appJs, /async function refreshReviewBenchmark\(\)/);
  assert.match(appJs, /await apiJson\(reviewBenchmarkApi\)/);
  assert.match(appJs, /renderReviewBenchmarkSamples\(payload\.items \|\| \[\]\)/);
  assert.doesNotMatch(refreshAllSource, /reviewBenchmark/);
});

test("review benchmark delete action has a live branch and refreshes list with feedback", async () => {
  const { appJs } = await readFrontendFiles();
  const deleteBranch = sliceBetween(
    appJs,
    'if (action === "delete-review-benchmark") {',
    'if (action === "confirm-style-profile") {'
  );

  assert.match(deleteBranch, /if \(action === "delete-review-benchmark"\) \{/);
  assert.match(deleteBranch, /method: "DELETE"/);
  assert.match(deleteBranch, /id: button\.dataset\.id/);
  assert.match(deleteBranch, /renderReviewBenchmarkSamples\(response\.items \|\| \[\]\)/);
  assert.match(deleteBranch, /基准样本已删除/);
  assert.match(deleteBranch, /return;/);
});

test("review benchmark result renderer shows totals, matched counts, and unmatched sample list", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const start = appJs.indexOf("function renderReviewBenchmarkResult(");
  const end = appJs.indexOf("function renderNoteLifecycle(", start);
  const renderSource = appJs.slice(start, end);

  assert.equal(start > -1, true);
  assert.equal(end > start, true);
  assert.match(renderSource, /总样本/);
  assert.match(renderSource, /匹配/);
  assert.match(renderSource, /未匹配/);
  assert.match(renderSource, /matchedExpectation/);
  assert.match(renderSource, /actualVerdict/);
  assert.match(renderSource, /send-review-benchmark-to-sample-library/);
  assert.match(renderSource, /send-review-benchmark-to-false-positive/);
  assert.match(renderSource, /回流到样本库/);
  assert.match(renderSource, /回流到误报日志/);
  assert.match(renderSource, /review-benchmark-result-grid/);
  assert.match(styles, /\.review-benchmark-result-grid/);
  assert.match(styles, /\.review-benchmark-mismatch-list/);
});

test("review benchmark mismatch actions expose recovery branches for sample library and false positive log", async () => {
  const { appJs } = await readFrontendFiles();
  const actionBranch = sliceBetween(
    appJs,
    'if (action === "send-review-benchmark-to-sample-library") {',
    'if (action === "delete-review-benchmark") {'
  );

  assert.match(actionBranch, /if \(action === "send-review-benchmark-to-sample-library"\) \{/);
  assert.match(actionBranch, /buildReviewBenchmarkMismatchSummary\(mismatch\)/);
  assert.match(actionBranch, /apiJson\(sampleLibraryApi, \{/);
  assert.match(actionBranch, /source: "benchmark_mismatch"/);
  assert.match(actionBranch, /notes: buildReviewBenchmarkMismatchSummary\(mismatch\)/);
  assert.match(actionBranch, /revealSampleLibraryPane\(\)/);
  assert.match(actionBranch, /if \(action === "send-review-benchmark-to-false-positive"\) \{/);
  assert.match(actionBranch, /apiJson\("\/api\/false-positive-log", \{/);
  assert.match(actionBranch, /source: "benchmark_mismatch"/);
  assert.match(actionBranch, /userNotes: buildReviewBenchmarkMismatchSummary\(mismatch\)/);
  assert.match(actionBranch, /revealFeedbackCenterPane\(\)/);
});

test("style profile draft supports inline manual editing controls and update flow", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const renderSource = sliceBetween(appJs, "function renderStyleProfile(", "function formatRate(");
  const styleProfileActionArea = sliceBetween(
    appJs,
    'if (action === "edit-style-profile-draft") {',
    'if (action === "activate-style-profile") {'
  );
  const styleProfileConfirmBranch = sliceBetween(
    appJs,
    'if (action === "confirm-style-profile") {',
    'if (action === "activate-style-profile") {'
  );
  const styleProfileConfirmCurrentBranch = sliceBetween(
    appJs,
    'if (updateAction === "confirm-current") {',
    "const updated = await apiJson"
  );

  assert.match(appJs, /styleProfileDraftEditing:\s*false/);
  assert.match(appJs, /styleProfileDraftForm:\s*\{/);
  assert.match(appJs, /function enterStyleProfileDraftEditMode\(/);
  assert.match(appJs, /function exitStyleProfileDraftEditMode\(/);
  assert.match(appJs, /function buildStyleProfileDraftPayload\(/);
  assert.match(renderSource, /人工编辑/);
  assert.match(renderSource, /保存修改/);
  assert.match(renderSource, /取消/);
  assert.match(renderSource, /name="topic"/);
  assert.match(renderSource, /name="tone"/);
  assert.match(renderSource, /name="titleStyle"/);
  assert.match(renderSource, /name="bodyStructure"/);
  assert.match(renderSource, /name="preferredTags"/);
  assert.match(styleProfileActionArea, /save-style-profile-draft/);
  assert.doesNotMatch(styleProfileActionArea, /revealStyleProfilePane\(/);
  assert.match(styleProfileConfirmBranch, /appState\.styleProfileState\?\.draft \? "update-draft" : "confirm-current"/);
  assert.match(styleProfileConfirmBranch, /action:\s*updateAction/);
  assert.match(styleProfileConfirmBranch, /if \(updateAction === "confirm-current"\) \{/);
  assert.doesNotMatch(styleProfileConfirmCurrentBranch, /body:\s*JSON\.stringify\(\{\}\)/);
  assert.match(renderSource, /draft \|\| isDraftEditing/);
  assert.match(renderSource, /cancel-style-profile-draft/);
  assert.match(appJs, /edit-style-profile-draft/);
  assert.match(appJs, /cancel-style-profile-draft/);
  assert.match(appJs, /confirm-current/);
  assert.match(renderSource, /style-profile-history-toggle/);
  assert.match(renderSource, /historyCount/);
  assert.match(renderSource, /展开历史版本/);
  assert.match(renderSource, /收起历史版本/);
  assert.match(renderSource, /Array\.isArray\(profileState\?\.versions\) \? profileState\.versions : \[\]/);
  assert.match(styles, /\.style-profile-form/);
  assert.match(styles, /\.style-profile-actions/);
  assert.match(styles, /\.style-profile-history-toggle/);
});
