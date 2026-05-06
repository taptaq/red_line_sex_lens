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

function extractElementInnerHtml(html, marker) {
  const startMarker = marker;
  const startIndex = html.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `expected ${marker} to exist`);

  const tagStart = html.lastIndexOf("<", startIndex);
  assert.notEqual(tagStart, -1, `expected opening tag for ${marker}`);

  const openTagEnd = html.indexOf(">", startIndex);
  assert.notEqual(openTagEnd, -1, `expected end of opening tag for ${marker}`);

  const tagMatch = html.slice(tagStart, openTagEnd).match(/^<([a-z0-9-]+)/i);
  assert.ok(tagMatch, `expected tag name for ${marker}`);

  const tagName = tagMatch[1];
  let depth = 1;
  let cursor = openTagEnd + 1;
  let closeIndex = -1;

  while (cursor < html.length) {
    const nextOpen = html.indexOf(`<${tagName}`, cursor);
    const nextClose = html.indexOf(`</${tagName}>`, cursor);

    if (nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      cursor = nextOpen + tagName.length + 1;
      continue;
    }

    depth -= 1;

    if (depth === 0) {
      closeIndex = nextClose;
      break;
    }

    cursor = nextClose + tagName.length + 3;
  }

  assert.notEqual(closeIndex, -1, `expected closing tag for ${marker}`);

  return html.slice(openTagEnd + 1, closeIndex);
}

test("frontend exposes a list-first sample library workspace with one primary create action", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /data-tab-target="feedback-center-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="custom-lexicon-pane"[^>]*>自定义词库</);
  assert.doesNotMatch(indexHtml, /data-tab-target="seed-lexicon-pane"[^>]*>种子词库</);
  assert.match(indexHtml, /id="rules-maintenance-panel"/);
  assert.match(indexHtml, /规则维护/);
  assert.doesNotMatch(indexHtml, /<details id="rules-maintenance-panel"[^>]*\sopen[>\s]/);
  assert.match(indexHtml, /id="rules-maintenance-shortcuts"/);
  assert.match(indexHtml, /需要补规则/);
  assert.match(indexHtml, /data-summary-action="open-custom-lexicon"/);
  assert.match(indexHtml, /data-summary-action="open-seed-lexicon"/);
  assert.match(indexHtml, /id="custom-lexicon-pane"/);
  assert.match(indexHtml, /id="seed-lexicon-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="feedback-log-pane"[^>]*>反馈日志</);
  assert.doesNotMatch(indexHtml, /data-tab-target="false-positive-log-pane"[^>]*>误报样本</);
  assert.doesNotMatch(indexHtml, /data-tab-target="review-benchmark-pane"[^>]*>基准评测</);
  assert.doesNotMatch(indexHtml, /data-tab-target="model-performance-pane"[^>]*>模型看板</);
  assert.doesNotMatch(indexHtml, /data-tab-target="rewrite-pairs-pane"[^>]*>改写样本</);
  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');
  const sampleLibraryWorkspaceHtml = extractElementInnerHtml(sampleLibraryPaneHtml, "sample-library-workspace");
  const createButtonMatches = sampleLibraryPaneHtml.match(/id="sample-library-create-button"/g) || [];

  assert.equal(createButtonMatches.length, 1, "expected one primary sample library create action in the pane");
  assert.match(sampleLibraryPaneHtml, /id="sample-library-create-button"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"[\s\S]*aria-controls="sample-library-import-block"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"[\s\S]*aria-expanded="false"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-input"/);
  assert.match(sampleLibraryPaneHtml, /accept="application\/pdf,.pdf"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-result"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-import-commit-button"/);
  assert.match(sampleLibraryPaneHtml, /aria-controls="sample-library-create-form-shell"/);
  assert.match(sampleLibraryPaneHtml, /aria-expanded="false"/);
  assert.match(indexHtml, /新增学习样本/);
  assert.match(indexHtml, /保存学习样本/);
  assert.match(indexHtml, /id="sample-library-search-input"/);
  assert.match(indexHtml, /id="sample-library-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-type-select"/);
  assert.match(indexHtml, /name="collectionType"/);
  assert.match(indexHtml, /id="analyze-collection-type-select"/);
  assert.match(indexHtml, /id="generation-collection-type-select"/);
  assert.match(indexHtml, /id="generation-model-selection"/);
  assert.doesNotMatch(indexHtml, /id="analyze-collection-type-add"/);
  assert.doesNotMatch(indexHtml, /id="generation-collection-type-add"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-collection-type-add"/);
  assert.match(indexHtml, /id="generation-advanced-panel"/);
  assert.match(indexHtml, /高级偏好/);
  assert.match(indexHtml, /生成模型/);
  assert.match(indexHtml, /name="lengthMode"/);
  assert.match(indexHtml, /短文（默认，&lt;1000字）/);
  assert.match(indexHtml, /长文（&gt;1000字）/);
  assert.match(indexHtml, /内容工作台/);
  assert.match(indexHtml, /学习样本/);
  assert.match(indexHtml, /系统校准/);
  assert.match(indexHtml, /id="support-workspace-panel"/);
  assert.doesNotMatch(indexHtml, /低频维护与人工复核/);
  assert.doesNotMatch(indexHtml, /<details id="support-workspace-panel"[^>]*\sopen[>\s]/);
  assert.match(sampleLibraryPaneHtml, /class="[^"]*\bsample-library-workspace\b[^"]*"/);
  assert.match(sampleLibraryWorkspaceHtml, /id="sample-library-record-list"/);
  assert.match(sampleLibraryWorkspaceHtml, /id="sample-library-detail"/);
  assert.match(sampleLibraryWorkspaceHtml, /class="[^"]*\bsample-library-record-list\b[^"]*"/);
  assert.match(sampleLibraryWorkspaceHtml, /class="[^"]*\bsample-library-detail\b[^"]*"/);
  assert.ok(
    sampleLibraryWorkspaceHtml.indexOf('id="sample-library-record-list"') <
      sampleLibraryWorkspaceHtml.indexOf('id="sample-library-detail"'),
    "expected sample library list to appear before detail"
  );
  assert.match(indexHtml, /id="sample-library-base-section"/);
  assert.match(indexHtml, /id="sample-library-reference-section"/);
  assert.match(indexHtml, /id="sample-library-lifecycle-section"/);
  assert.match(indexHtml, /id="sample-library-calibration-section"/);
  assert.match(indexHtml, /data-sample-library-step="base"/);
  assert.match(indexHtml, /data-sample-library-step="reference"/);
  assert.match(indexHtml, /data-sample-library-step="lifecycle"/);
  assert.match(indexHtml, /data-sample-library-step="calibration"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-daily-panel"/);
  assert.match(sampleLibraryPaneHtml, /日常记录/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-advanced-panel"/);
  assert.match(sampleLibraryPaneHtml, /扩展维护/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /<details id="sample-library-advanced-panel"[^>]*\sopen[>\s]/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="rewrite-pairs-pane"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /改写成功样本/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /改写对照样本/);
  assert.match(sampleLibraryPaneHtml, /系统校准/);
  assert.match(sampleLibraryPaneHtml, /id="system-calibration-panel"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="review-benchmark-pane"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /调试与路由稳定性/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="model-performance-pane"/);
  assert.match(indexHtml, /id="analyze-action-hint"/);
  assert.match(indexHtml, /id="cross-review-action-hint"/);
  assert.match(indexHtml, /id="feedback-action-hint"/);
  assert.match(indexHtml, /id="generation-action-hint"/);
  assert.match(indexHtml, /id="sample-library-create-action-hint"/);
  assert.doesNotMatch(indexHtml, /data-sample-library-tab-target=/);
  assert.doesNotMatch(indexHtml, /id="success-sample-form"/);
  assert.doesNotMatch(indexHtml, /id="note-lifecycle-list"/);
  assert.doesNotMatch(indexHtml, /sample-library-tab-strip/);
  assert.doesNotMatch(indexHtml, /id="style-profile-topic"/);
  assert.doesNotMatch(indexHtml, /id="style-profile-draft-button"/);
  assert.doesNotMatch(indexHtml, /id="style-profile-result"/);
  assert.doesNotMatch(indexHtml, /id="style-profile-action-hint"/);
  assert.doesNotMatch(indexHtml, /name="styleProfileId"/);
  assert.doesNotMatch(indexHtml, /id="generation-style-profile-select"/);

  assert.match(appJs, /\/api\/sample-library/);
  assert.match(appJs, /collectionType:\s*String\(form\.get\("collectionType"\)/);
  assert.match(appJs, /sampleLibraryRecords:\s*\[\s*\]/);
  assert.match(appJs, /sampleLibraryCollectionFilter:\s*"all"/);
  assert.match(appJs, /selectedSampleLibraryRecordId:\s*""/);
  assert.match(appJs, /sampleLibraryDetailStep:\s*"base"/);
  assert.match(appJs, /sampleLibraryFilter:\s*"all"/);
  assert.match(appJs, /sampleLibrarySearch:\s*""/);
  assert.match(appJs, /function\s+filterSampleLibraryRecords\s*\(/);
  assert.match(appJs, /function\s+getSelectedSampleLibraryRecord\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryList\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryRecordStepLabel\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryDetail\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /function\s+refreshSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /function\s+setSampleLibraryDetailStep\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryDetailStepState\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryCalibrationPredictionFromCurrentState\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryCalibrationRetroComparison\s*\(/);
  assert.match(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
  assert.match(appJs, /function\s+getAnalyzeActionRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncFeedbackActions\s*\(/);
  assert.match(appJs, /function\s+getGenerationRequirementMessage\s*\(/);
  assert.match(appJs, /generation-model-selection/);
  assert.match(appJs, /generation:\s*String\(byId\("generation-model-selection"\)\?\.value \|\| "auto"\)\.trim\(\) \|\| "auto"/);
  assert.match(appJs, /lengthMode:\s*String\(form\.get\("lengthMode"\) \|\| "short"\)\.trim\(\) \|\| "short"/);
  assert.match(appJs, /function\s+syncGenerationActions\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryCreateRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryCreateActions\s*\(/);
  assert.match(appJs, /function\s+setActionGateHint\s*\(/);
  assert.doesNotMatch(appJs, /add-sample-library-to-benchmark/);
  assert.doesNotMatch(appJs, /add-false-positive-to-benchmark/);
  assert.doesNotMatch(appJs, /benchmarkSourceLabel/);
  assert.doesNotMatch(appJs, /样本已存在，未重复加入/);
  assert.doesNotMatch(appJs, /review-benchmark-pane/);
  assert.doesNotMatch(appJs, /ensureSystemCalibrationOpen\(\)/);
  assert.doesNotMatch(appJs, /function addCollectionTypeOption\(/);
  assert.match(appJs, /function renderSummary\(summary = \{\}\)/);
  const renderSummaryStart = appJs.indexOf("function renderSummary(summary = {})");
  const renderSummaryEnd = appJs.indexOf("function renderAnalysis(", renderSummaryStart);
  const renderSummarySource = appJs.slice(renderSummaryStart, renderSummaryEnd);
  assert.match(renderSummarySource, /待处理误判/);
  assert.match(renderSummarySource, /待补好样本/);
  assert.match(renderSummarySource, /今日内容流转/);
  assert.doesNotMatch(renderSummarySource, /待确认画像/);
  assert.doesNotMatch(renderSummarySource, /生命周期记录/);
  assert.match(appJs, /summary-card-meta/);
  assert.match(appJs, /summary-card-action/);
  assert.match(appJs, /sample-library-record-step/);
  assert.match(appJs, /卡点/);
  assert.match(appJs, /data-summary-action/);
  assert.match(appJs, /summary-card-button/);
  assert.match(appJs, /function handleSummaryAction\(/);
  assert.match(appJs, /summaryAction:\s*dailyFlowCount \? "open-review-queue" : "open-sample-library"/);
  assert.match(appJs, /summaryAction:\s*"open-feedback-center"/);
  assert.match(appJs, /summaryAction:\s*"open-sample-library"/);
  assert.doesNotMatch(appJs, /if \(action === "open-style-profile"\)/);
  assert.match(appJs, /if \(action === "open-lifecycle"\)/);
  assert.match(appJs, /if \(action === "open-custom-lexicon"\)/);
  assert.match(appJs, /if \(action === "open-seed-lexicon"\)/);
  assert.match(appJs, /if \(summaryAction\)/);
  assert.match(appJs, /await handleSummaryAction\(summaryAction\.dataset\.summaryAction\)/);
  assert.match(appJs, /ensureSupportWorkspaceOpen\(\);[\s\S]*byId\("review-queue"\)\?\.scrollIntoView/);
  assert.match(appJs, /revealFeedbackCenterPane\(\)/);
  assert.match(appJs, /setSampleLibraryCreateFormOpen\(true\)/);
  assert.match(appJs, /byId\("sample-library-lifecycle-section"\)\?\.scrollIntoView/);
  assert.match(appJs, /sample-library-detail-step-summary/);
  assert.match(appJs, /sample-library-detail-step-body/);
  assert.match(appJs, /setSampleLibraryDetailStep\("base"\)/);
  assert.match(appJs, /setSampleLibraryDetailStep\("reference"\)/);
  assert.match(appJs, /setSampleLibraryDetailStep\("lifecycle"\)/);
  assert.match(appJs, /setSampleLibraryDetailStep\("calibration"\)/);
  assert.match(appJs, /if \(action === "save-sample-library-base"\)[\s\S]*setSampleLibraryDetailStep\("reference"\)/);
  assert.match(appJs, /if \(action === "save-sample-library-reference"\)[\s\S]*setSampleLibraryDetailStep\("lifecycle"\)/);
  assert.match(appJs, /if \(action === "save-sample-library-lifecycle"\)[\s\S]*setSampleLibraryDetailStep\("calibration"\)/);
  assert.match(appJs, /if \(action === "save-sample-library-calibration"\)[\s\S]*calibration:/);
  assert.match(appJs, /data-action="prefill-sample-library-calibration-prediction"/);
  assert.match(appJs, /从当前检测预填预判/);
  assert.match(appJs, /setSampleLibraryCalibrationPredictionFields\(/);
  assert.match(appJs, /function ensureSupportWorkspaceOpen\(/);
  assert.match(appJs, /function ensureRulesMaintenanceOpen\(/);
  assert.match(appJs, /function revealRulesMaintenancePane\(/);
  assert.match(appJs, /byId\("rules-maintenance-panel"\)/);
  assert.match(appJs, /revealRulesMaintenancePane\("custom-lexicon-pane"\)/);
  assert.match(appJs, /revealRulesMaintenancePane\("seed-lexicon-pane"\)/);
  assert.match(appJs, /byId\("support-workspace-panel"\)/);
  assert.match(appJs, /function ensureSampleLibraryAdvancedPanelOpen\(/);
  assert.match(appJs, /byId\("sample-library-advanced-panel"\)/);
  assert.match(appJs, /activateTab\("data-maintenance", "feedback-center-pane"\)/);
  assert.match(appJs, /function revealRulesMaintenancePane\(targetId = "custom-lexicon-pane"\)/);
  assert.match(appJs, /window\.setTimeout\(\(\) => \{/);
  assert.match(appJs, /byId\(targetId\)\?\.scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(appJs, /ensureRulesMaintenanceOpen\(\);[\s\S]*byId\(targetId\)\?\.scrollIntoView/);
  assert.match(appJs, /ensureSampleLibraryAdvancedPanelOpen\(\);[\s\S]*byId\(targetId\)\?\.scrollIntoView/);

  assert.match(styles, /\.sample-library-workspace/);
  assert.match(styles, /\.sample-library-record-list/);
  assert.match(styles, /\.sample-library-detail/);
  assert.match(styles, /\.sample-library-import-block/);
  assert.match(styles, /\.sample-library-import-list/);
  assert.match(styles, /\.sample-library-import-card/);
  assert.match(styles, /\.shell\s*\{/);
  assert.match(styles, /width:\s*min\(1600px,\s*calc\(100% - 2\.4rem\)\)/);
  assert.match(styles, /\.form-grid\s*\{/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(styles, /\.meta-pill\s*\{/);
  assert.match(styles, /white-space:\s*normal/);
  assert.match(styles, /\.summary-card-meta/);
  assert.match(styles, /\.summary-card-action/);
  assert.match(styles, /\.summary-card-button/);
  assert.match(styles, /\.summary-card-button:hover:not\(:disabled\)/);
  assert.match(styles, /\.summary-card-button:focus-visible/);
  assert.match(styles, /\.rules-maintenance-shortcuts/);
  assert.match(styles, /\.rules-maintenance-shortcut-actions/);
  assert.match(styles, /\.sample-library-record-step/);
  assert.match(styles, /\.sample-library-detail-topbar\s*\{/);
  assert.match(styles, /\.sample-library-detail-topbar > \*\s*\{/);
  assert.match(styles, /\.sample-library-detail-section\[data-step-state="current"\]/);
  assert.match(styles, /\.sample-library-detail-step-summary/);
  assert.match(styles, /\.sample-library-detail-step-body/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /min-width:\s*0/);
  assert.match(styles, /\.sample-library-detail-topbar\s+\.item-actions\s*\{/);
  assert.match(styles, /justify-content:\s*flex-start/);
  assert.match(styles, /\.lifecycle-update-grid\s*\{/);
  assert.match(styles, /\.sample-library-calibration-grid\s*\{/);
  assert.match(appJs, /class="lifecycle-primary-grid"/);
  assert.match(appJs, /class="lifecycle-metrics-grid"/);
  assert.match(styles, /\.lifecycle-primary-grid\s*\{/);
  assert.match(styles, /\.lifecycle-metrics-grid\s*\{/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1\.1fr\)\s*minmax\(0,\s*0\.9fr\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(140px,\s*1fr\)\)/);
  assert.match(styles, /white-space:\s*normal/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.lifecycle-update-grid > \*\s*\{/);
  assert.match(styles, /\.workspace-support\s*>\s*\*\s*\{/);
  assert.match(styles, /\.support-workspace-panel/);
  assert.match(styles, /\.rules-maintenance-panel/);
  assert.match(styles, /\.rules-maintenance-summary/);
  assert.match(styles, /\.support-workspace-summary/);
  assert.match(styles, /\.sample-library-advanced-panel/);
  assert.match(styles, /\.tab-panels/);
  assert.match(styles, /\.tab-panel/);
  assert.match(styles, /\.sample-library-workspace\s*>\s*\*/);
  assert.match(styles, /\.sample-library-detail\s*>\s*\*/);
  assert.match(styles, /max-width:\s*100%/);
  assert.match(styles, /\.action-gate-hint\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)/);
  assert.match(styles, /\.tag-picker-selected\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*display:\s*grid;/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\)/);
});

test("frontend keeps the analyze picker regression surface in the main UI file", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="analyze-tag-picker"/);
  assert.match(appJs, /\/api\/analyze-tag-options/);
  assert.match(appJs, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(appJs, /function toggleAnalyzePresetTag\(/);
  assert.match(appJs, /function renderAnalyzeTagOptions\(/);
});

test("sample library create button toggles with explicit expanded state and scroll feedback", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
  assert.match(appJs, /button\.setAttribute\(expandedAttribute,\s*String\(!nextHidden\)\)/);
  assert.match(appJs, /const expandedAttribute = \["aria", "expanded"\]\.join\("-"\)/);
  assert.match(appJs, /shell\.hidden\s*=\s*nextHidden/);
  assert.match(appJs, /shell\?\.scrollIntoView\(\{\s*behavior:\s*"smooth",\s*block:\s*"nearest"\s*\}\)/);
  assert.match(appJs, /setSampleLibraryCreateFormOpen\(true\)/);
  assert.match(appJs, /setSampleLibraryCreateFormOpen\(false\)/);
});

test("frontend gates secondary sample-library and lifecycle-save actions with inline hints", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+getSampleLibraryDetailBaseRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryDetailReferenceRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryDetailLifecycleRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryDetailCalibrationRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryDetailActions\s*\(/);
  assert.match(appJs, /function\s+getLifecycleSaveRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncLifecycleResultActions\s*\(/);

  assert.match(appJs, /id="sample-library-base-action-hint"/);
  assert.match(appJs, /id="sample-library-reference-action-hint"/);
  assert.match(appJs, /id="sample-library-lifecycle-action-hint"/);
  assert.match(appJs, /id="sample-library-calibration-action-hint"/);
  assert.match(appJs, /id="analysis-lifecycle-action-hint"/);
  assert.match(appJs, /id="rewrite-lifecycle-action-hint"/);
  assert.match(appJs, /id="generation-lifecycle-action-hint"/);

  assert.match(appJs, /setActionGateHint\("sample-library-base-action-hint",\s*baseMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-reference-action-hint",\s*referenceMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-lifecycle-action-hint",\s*lifecycleMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-calibration-action-hint",\s*calibrationMessage\)/);
  assert.match(appJs, /setActionGateHint\("analysis-lifecycle-action-hint",\s*analysisMessage\)/);
  assert.match(appJs, /setActionGateHint\("rewrite-lifecycle-action-hint",\s*rewriteMessage\)/);
  assert.match(appJs, /setActionGateHint\("generation-lifecycle-action-hint",\s*generationMessage\)/);

  assert.match(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("input",\s*syncSampleLibraryDetailActions\)/);
  assert.match(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("change",\s*syncSampleLibraryDetailActions\)/);
  assert.match(appJs, /renderSampleLibraryDetail\(selectedRecord\);[\s\S]*syncSampleLibraryDetailActions\(\)/);
  assert.match(appJs, /renderAnalysis\(result[\s\S]*analysis-lifecycle-action-hint/);
  assert.match(appJs, /renderRewriteResult\(result\)[\s\S]*rewrite-lifecycle-action-hint/);
  assert.match(appJs, /renderGenerationResult\(result = \{\}\)[\s\S]*generation-lifecycle-action-hint/);
  assert.match(appJs, /function\s+syncSampleLibraryReferenceSectionState\s*\(/);
  assert.match(appJs, /tierSelect\.value[\s\S]*enabledCheckbox\.checked = true/);
  assert.match(appJs, /enabledCheckbox\.checked === false[\s\S]*tierSelect\.value = ""/);
  assert.match(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("change",\s*syncSampleLibraryReferenceSectionState\)/);
  assert.match(appJs, /const enabled = section\?\.querySelector\('\[name="enabled"\]'\)\?\.checked === true \|\| Boolean\(tier\)/);
  assert.match(appJs, /predictionMatchedLabel\(comparison\.matched\)/);
  assert.match(appJs, /comparison\.missReasonSuggestion/);
});

test("frontend suggests reference promotion and rule-improvement candidates from retro outcomes", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+buildSampleLibraryCalibrationRetroRecommendation\s*\(/);
  assert.match(appJs, /const recommendation = buildSampleLibraryCalibrationRetroRecommendation\(/);
  assert.match(appJs, /recommendation\.shouldBecomeReference/);
  assert.match(appJs, /recommendation\.ruleImprovementCandidate/);
  assert.match(appJs, /需要复盘发布状态判断/);
  assert.match(appJs, /需要复盘表现预估/);
});

test("frontend surfaces calibration visibility directly in the sample-library list", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /<option value="calibration_pending">待复盘<\/option>/);
  assert.match(indexHtml, /<option value="calibration_matched">已命中<\/option>/);
  assert.match(indexHtml, /<option value="calibration_mismatch">有偏差<\/option>/);
  assert.match(appJs, /function\s+getSampleLibraryCalibrationListState\s*\(/);
  assert.match(appJs, /filter === "calibration_pending"/);
  assert.match(appJs, /filter === "calibration_matched"/);
  assert.match(appJs, /filter === "calibration_mismatch"/);
  assert.match(appJs, /sample-library-calibration-pill/);
  assert.match(appJs, /riskLevelLabel\(calibration\.prediction\.predictedRiskLevel\)/);
  assert.match(appJs, /getSampleLibraryCalibrationListState\(item\)\.label/);
  assert.match(styles, /\.sample-library-calibration-pill/);
});

test("frontend exposes a calibration review queue with quick jumps back to sample detail", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-calibration-review-queue"/);
  assert.match(indexHtml, /批量复盘队列/);
  assert.match(appJs, /function\s+getSampleLibraryCalibrationReviewQueueItems\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryCalibrationReviewQueue\s*\(/);
  assert.match(appJs, /data-action="open-sample-library-record"/);
  assert.match(appJs, /data-action="open-sample-library-calibration"/);
  assert.match(appJs, /if \(action === "open-sample-library-record"\)/);
  assert.match(appJs, /if \(action === "open-sample-library-calibration"\)/);
  assert.match(styles, /\.sample-library-calibration-queue/);
  assert.match(styles, /\.sample-library-calibration-queue-card/);
});

test("frontend exposes a calibrated-history replay action in system calibration", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-calibration-replay-run"/);
  assert.match(indexHtml, /id="sample-library-calibration-replay-result"/);
  assert.match(indexHtml, /运行历史回放/);
  assert.match(appJs, /const sampleLibraryCalibrationReplayApi = "\/api\/sample-library\/calibration-replay"/);
  assert.match(appJs, /function renderSampleLibraryCalibrationReplayResult\s*\(/);
  assert.match(appJs, /data-action="run-sample-library-calibration-replay"/);
  assert.match(appJs, /sample-library-calibration-replay-result/);
  assert.match(appJs, /受影响样本/);
});

test("frontend exposes an inner-space terminology workspace for rewrite and generation guidance", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="inner-space-terms-pane"/);
  assert.match(indexHtml, /id="inner-space-terms-form"/);
  assert.match(indexHtml, /id="inner-space-terms-list"/);
  assert.match(indexHtml, /内太空术语表/);
  assert.match(indexHtml, /适用合集/);
  assert.match(appJs, /\/api\/admin\/inner-space-terms/);
  assert.match(appJs, /function renderInnerSpaceTermsList\s*\(/);
  assert.match(appJs, /inner-space-terms-form/);
  assert.match(appJs, /inner-space-terms-result/);
  assert.match(appJs, /delete-inner-space-term/);
});

test("frontend exposes platform outcome shortcuts from analysis rewrite and generation results", async () => {
  const { appJs } = await readFrontendFiles();
  const analysisStart = appJs.indexOf("function renderAnalysis(");
  const rewriteStart = appJs.indexOf("function renderRewriteResult(", analysisStart);
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function renderReviewQueueAdmin(", generationStart);
  const analysisSource = appJs.slice(analysisStart, rewriteStart);
  const rewriteSource = appJs.slice(rewriteStart, appJs.indexOf("function buildCrossReviewMarkup(", rewriteStart));
  const generationSource = appJs.slice(generationStart, generationEnd);

  assert.match(appJs, /function\s+buildPlatformOutcomeActions\s*\(/);
  assert.match(appJs, /function\s+savePlatformOutcomeFromCurrent\s*\(/);
  assert.match(analysisSource, /buildPlatformOutcomeActions\("analysis"\)/);
  assert.match(rewriteSource, /buildPlatformOutcomeActions\("rewrite"\)/);
  assert.match(generationSource, /buildPlatformOutcomeActions\("generation"/);
  assert.match(appJs, /data-action="save-platform-outcome"/);
  assert.match(appJs, /平台通过/);
  assert.match(appJs, /平台违规/);
  assert.match(appJs, /效果好/);
  assert.match(appJs, /效果一般/);
  assert.match(appJs, /系统误判/);
  assert.match(appJs, /publishStatus:\s*button\.dataset\.publishStatus/);
  assert.match(appJs, /await savePlatformOutcomeFromCurrent/);
});

test("frontend explains how saved platform outcomes feed future detection and generation", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /已作为生成风格参考/);
  assert.match(appJs, /已进入误判降权候选/);
  assert.match(appJs, /平台结果已回填到学习样本/);
  assert.match(appJs, /sample-library-create-result/);
  assert.doesNotMatch(appJs, /当前改写成功样本/);
  assert.doesNotMatch(appJs, /未命名成功样本/);
  assert.doesNotMatch(appJs, /当前没有成功样本/);
  assert.doesNotMatch(appJs, /当前没有风格画像，请先积累好样本。/);
  assert.doesNotMatch(appJs, /当前没有风格画像，请先积累成功样本。/);
  assert.doesNotMatch(appJs, /当前改写对照样本/);
});

test("frontend also gates prefill and lexicon submit actions that depend on prerequisite content", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-prefill-action-hint"/);
  assert.match(indexHtml, /id="custom-lexicon-action-hint"/);
  assert.match(indexHtml, /id="seed-lexicon-action-hint"/);

  assert.match(appJs, /function\s+getSampleLibraryPrefillAnalysisRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryPrefillRewriteRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryPrefillActions\s*\(/);
  assert.match(appJs, /function\s+getLexiconRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncLexiconFormActions\s*\(/);

  assert.match(appJs, /setActionGateHint\("sample-library-prefill-action-hint",\s*analysisMessage \|\| rewriteMessage\)/);
  assert.match(appJs, /setActionGateHint\("custom-lexicon-action-hint",\s*customMessage\)/);
  assert.match(appJs, /setActionGateHint\("seed-lexicon-action-hint",\s*seedMessage\)/);

  assert.match(appJs, /byId\("custom-lexicon-form"\)\.addEventListener\("input",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("custom-lexicon-form"\)\.addEventListener\("change",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("seed-lexicon-form"\)\.addEventListener\("input",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("seed-lexicon-form"\)\.addEventListener\("change",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /syncSampleLibraryPrefillActions\(\);[\s\S]*syncLexiconFormActions\(\)/);
});
