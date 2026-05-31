import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { buildSampleLibraryCalibrationEvidenceState } from "../web/sample-library-calibration.js";

async function readFrontendFiles() {
  const [indexHtml, appJs, styles, styleProfileViewJs, sampleLibraryCalibrationViewJs, themeInspirationViewJs, sampleLibraryRecordViewJs, analysisReviewViewJs, sampleLibraryModalViewJs, sampleLibrarySectionsViewJs, sampleLibraryFormHelpersJs] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/style-profile-view.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/sample-library-calibration-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/theme-inspiration-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/sample-library-record-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/analysis-review-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/sample-library-modal-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/sample-library-sections-view.js"), "utf8").catch(() => ""),
    fs.readFile(path.join(process.cwd(), "web/sample-library-form-helpers.js"), "utf8").catch(() => "")
  ]);

  return {
    indexHtml,
    appJs,
    styles,
    styleProfileViewJs,
    sampleLibraryCalibrationViewJs,
    themeInspirationViewJs,
    sampleLibraryRecordViewJs,
    analysisReviewViewJs,
    sampleLibraryModalViewJs,
    sampleLibrarySectionsViewJs,
    sampleLibraryFormHelpersJs
  };
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

function extractSourceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `expected ${startMarker} to exist`);

  const endIndex = source.indexOf(endMarker, startIndex);
  assert.notEqual(endIndex, -1, `expected ${endMarker} after ${startMarker}`);

  return source.slice(startIndex, endIndex);
}

test("frontend exposes a list-first sample library workspace with one primary create action", async () => {
  const { indexHtml, appJs, styles, styleProfileViewJs, sampleLibraryCalibrationViewJs, sampleLibraryRecordViewJs, sampleLibrarySectionsViewJs, sampleLibraryFormHelpersJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="feedback-center-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="custom-lexicon-pane"[^>]*>自定义词库</);
  assert.doesNotMatch(indexHtml, /data-tab-target="seed-lexicon-pane"[^>]*>种子词库</);
  assert.match(indexHtml, /id="rules-maintenance-panel"/);
  assert.match(indexHtml, /规则维护/);
  assert.doesNotMatch(indexHtml, /<details id="rules-maintenance-panel"[^>]*\sopen[>\s]/);
  assert.doesNotMatch(indexHtml, /id="rules-maintenance-shortcuts"/);
  assert.doesNotMatch(indexHtml, /如果某条回流已经能确定要补规则，这里给你一个直达入口/);
  assert.doesNotMatch(indexHtml, /data-summary-action="open-custom-lexicon"/);
  assert.doesNotMatch(indexHtml, /data-summary-action="open-seed-lexicon"/);
  assert.match(indexHtml, /id="lexicon-workspace-modal"/);
  assert.match(indexHtml, /id="lexicon-workspace-modal-title"/);
  assert.match(indexHtml, /id="lexicon-workspace-modal-content"/);
  assert.match(indexHtml, /data-lexicon-workspace-tab="custom"/);
  assert.match(indexHtml, /data-lexicon-workspace-tab="seed"/);
  assert.match(indexHtml, /data-lexicon-workspace-tab="inner-space"/);
  assert.match(indexHtml, /data-action="open-lexicon-workspace-modal" data-tab="seed"/);
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
  assert.match(sampleLibraryPaneHtml, /id="sample-library-pools-button"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"[\s\S]*aria-controls="sample-library-import-block"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-button"[\s\S]*aria-expanded="false"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-input"/);
  assert.match(sampleLibraryPaneHtml, /accept="\.md,\.markdown,text\/markdown"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-import-result"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-import-commit-button"/);
  assert.match(sampleLibraryPaneHtml, /aria-controls="sample-library-modal"/);
  assert.match(sampleLibraryPaneHtml, /aria-expanded="false"/);
  assert.match(indexHtml, /新增学习样本/);
  assert.match(appJs, /saveLabel:\s*"保存学习样本"/);
  assert.match(indexHtml, /id="sample-library-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-filter"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-search-input"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-likes-filter"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-favorites-filter"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-comments-filter"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-views-filter"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-shares-filter"/);
  assert.match(indexHtml, /name="collectionType"/);
  assert.match(sampleLibrarySectionsViewJs, /<select name="collectionType">/);
  assert.match(sampleLibrarySectionsViewJs, /name="views"/);
  assert.match(sampleLibrarySectionsViewJs, /name="shares"/);
  assert.match(indexHtml, /id="analyze-collection-type-select"/);
  assert.match(indexHtml, /id="generation-collection-type-select"/);
  assert.match(indexHtml, /id="generation-model-selection"/);
  assert.doesNotMatch(indexHtml, /id="analyze-collection-type-add"/);
  assert.doesNotMatch(indexHtml, /id="generation-collection-type-add"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-collection-type-add"/);
  assert.match(indexHtml, /name="briefing"/);
  assert.match(indexHtml, /一句话需求/);
  assert.match(indexHtml, /id="generation-draft-block"/);
  assert.match(indexHtml, /data-generation-mode-visible="draft_optimize"/);
  assert.doesNotMatch(indexHtml, /name="topic"/);
  assert.doesNotMatch(indexHtml, /name="sellingPoints"/);
  assert.doesNotMatch(indexHtml, /name="audience"/);
  assert.doesNotMatch(indexHtml, /name="constraints"/);
  assert.match(indexHtml, /id="generation-advanced-panel"/);
  assert.match(indexHtml, /高级偏好/);
  assert.match(indexHtml, /生成模型/);
  assert.match(indexHtml, /name="lengthMode"/);
  assert.match(indexHtml, /name="tagReferences"/);
  assert.match(indexHtml, /短文（默认，&lt;1000字）/);
  assert.match(indexHtml, /长文（&gt;1000字）/);
  assert.match(indexHtml, /内容工作台/);
  assert.match(indexHtml, /学习样本/);
  assert.match(indexHtml, /系统校准/);
  assert.match(indexHtml, /id="support-workspace-panel"/);
  assert.doesNotMatch(indexHtml, /低频维护与人工复核/);
  assert.doesNotMatch(indexHtml, /<details id="support-workspace-panel"/);
  assert.doesNotMatch(indexHtml, /class="support-workspace-summary"/);
  assert.match(indexHtml, /class="[^"]*\bsupport-feedback-card\b[^"]*"/);
  assert.match(indexHtml, /class="[^"]*\bsupport-samples-card\b[^"]*"/);
  assert.match(sampleLibraryPaneHtml, /class="[^"]*\bsample-library-workspace\b[^"]*"/);
  assert.match(sampleLibraryWorkspaceHtml, /id="sample-library-record-list"/);
  assert.match(sampleLibraryWorkspaceHtml, /class="[^"]*\bsample-library-record-list\b[^"]*"/);
  assert.doesNotMatch(sampleLibraryWorkspaceHtml, /id="sample-library-detail"/);
  assert.doesNotMatch(sampleLibraryWorkspaceHtml, /id="sample-library-base-section"/);
  assert.doesNotMatch(sampleLibraryWorkspaceHtml, /id="sample-library-reference-section"/);
  assert.doesNotMatch(sampleLibraryWorkspaceHtml, /id="sample-library-lifecycle-section"/);
  assert.doesNotMatch(sampleLibraryWorkspaceHtml, /id="sample-library-calibration-section"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-detail"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-base-section"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-reference-section"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-lifecycle-section"/);
  assert.doesNotMatch(indexHtml, /id="sample-library-calibration-section"/);
  assert.match(indexHtml, /id="sample-library-modal"/);
  assert.match(indexHtml, /id="sample-library-modal-title"/);
  assert.match(indexHtml, /id="sample-library-modal-content"/);
  assert.match(indexHtml, /id="sample-library-modal-save"/);
  assert.match(indexHtml, /id="sample-library-modal-cancel"/);
  assert.match(indexHtml, /id="sample-library-pools-modal"/);
  assert.match(indexHtml, /id="sample-library-pools-modal-title"/);
  assert.match(indexHtml, /id="sample-library-pools-modal-content"/);
  assert.match(indexHtml, /data-sample-pool-tab="reference"/);
  assert.match(indexHtml, /data-sample-pool-tab="regular"/);
  assert.match(indexHtml, /data-sample-pool-tab="negative"/);
  assert.match(sampleLibraryPaneHtml, /日常记录/);
  assert.match(sampleLibraryPaneHtml, /生效流转说明/);
  assert.match(sampleLibraryPaneHtml, /只保存基础内容：先进入学习样本记录列表/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-flow-reference-threshold"/);
  assert.match(sampleLibraryPaneHtml, /回填生命周期属性：先用于发布结果复盘和候选筛选，不会单独直接放宽内容校验/);
  assert.match(sampleLibraryPaneHtml, /仅保存到学习样本：不会直接进入内容检测规则/);
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
  assert.match(appJs, /setActionGateHint\("sample-library-create-action-hint"/);
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
  assert.match(indexHtml, /id="generation-style-profile-button"/);
  assert.match(indexHtml, /查看\s*\/\s*编辑当前风格画像/);

  assert.match(appJs, /\/api\/sample-library/);
  assert.match(appJs, /\/api\/admin\/style-profile/);
  assert.match(appJs, /collectionType:\s*String\(form\.get\("collectionType"\)/);
  assert.match(appJs, /views:\s*Number\(source\.metrics\?\.views \?\? source\.views \?\? 0\) \|\| 0/);
  assert.match(appJs, /shares:\s*Number\(source\.metrics\?\.shares \?\? source\.shares \?\? 0\) \|\| 0/);
  assert.match(appJs, /sampleLibraryRecords:\s*\[\s*\]/);
  assert.match(appJs, /adminDataLoading:\s*\{\s*phase:\s*"initial"/);
  assert.match(appJs, /summaryLoading:\s*\{\s*phase:\s*"initial"/);
  assert.match(appJs, /sampleLibraryLoading:\s*\{\s*phase:\s*"initial"/);
  assert.match(appJs, /sampleLibraryCollectionFilter:\s*"all"/);
  assert.match(appJs, /selectedSampleLibraryRecordId:\s*""/);
  assert.match(appJs, /sampleLibraryDetailStep:\s*"base"/);
  assert.match(appJs, /sampleLibraryFilter:\s*"all"/);
  assert.match(appJs, /function\s+filterSampleLibraryRecords\s*\(/);
  assert.doesNotMatch(appJs, /function\s+getSelectedSampleLibraryRecord\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryList\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryRecordStepLabel\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /function\s+refreshSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /from "\.\/sample-library-record-view\.js"/);
  assert.match(appJs, /function\s+setSummaryLoadingState\s*\(/);
  assert.match(appJs, /function\s+renderSummaryLoadingPlaceholders\s*\(/);
  assert.match(appJs, /function\s+setSampleLibraryLoadingState\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryLoadingPlaceholders\s*\(/);
  assert.doesNotMatch(appJs, /function\s+renderSampleLibraryDetail\s*\(/);
  assert.doesNotMatch(appJs, /function\s+setSampleLibraryDetailStep\s*\(/);
  assert.doesNotMatch(appJs, /function\s+renderSampleLibraryDetailStepState\s*\(/);
  assert.match(appJs, /function\s+openSampleLibraryDetailModal\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryDetailModal\s*\(/);
  assert.match(appJs, /sampleLibraryPoolsModal/);
  assert.match(appJs, /function\s+classifySampleLibraryPool\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryPoolsModal\s*\(/);
  assert.match(appJs, /function\s+openSampleLibraryPoolsModal\s*\(/);
  assert.match(appJs, /function\s+closeSampleLibraryPoolsModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryCalibrationPredictionFromCurrentState\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryCalibrationRetroComparison\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryCreateButtonExpanded\s*\(/);
  assert.match(appJs, /function\s+setSampleLibraryModalOpen\s*\(/);
  assert.match(appJs, /function\s+getAnalyzeActionRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncFeedbackActions\s*\(/);
  assert.match(appJs, /function\s+getGenerationRequirementMessage\s*\(/);
  assert.match(appJs, /generation-model-selection/);
  assert.match(appJs, /generation:\s*String\(byId\("generation-model-selection"\)\?\.value \|\| "auto"\)\.trim\(\) \|\| "auto"/);
  assert.match(appJs, /lengthMode:\s*String\(form\.get\("lengthMode"\) \|\| "short"\)\.trim\(\) \|\| "short"/);
  assert.match(appJs, /function\s+syncGenerationActions\s*\(/);
  assert.match(appJs, /from "\.\/analysis-review-view\.js"/);
  assert.match(appJs, /function\s+openStyleProfileModal\s*\(/);
  assert.match(appJs, /function\s+saveStyleProfileModal\s*\(/);
  assert.match(sampleLibraryFormHelpersJs, /function\s+getSampleLibraryCreateRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryCreateActions\s*\(/);
  assert.match(appJs, /publish:\s*\{\s*metrics:\s*\{\s*views:\s*payload\.views \|\| 0/s);
  assert.match(appJs, /function\s+setActionGateHint\s*\(/);
  assert.match(appJs, /const\s+REFERENCE_METRIC_THRESHOLD\s*=\s*\{/);
  assert.match(appJs, /function\s+getReferenceThresholdFlowGuideText\s*\(/);
  assert.match(appJs, /function\s+getReferenceThresholdReferenceDescription\s*\(/);
  assert.match(appJs, /function\s+getReferenceThresholdPoolsSubtitleText\s*\(/);
  assert.match(appJs, /function\s+syncReferenceThresholdCopy\s*\(/);
  assert.match(appJs, /byId\("sample-library-flow-reference-threshold"\)/);
  assert.match(appJs, /byId\("sample-library-pools-modal-subtitle"\)/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-reference-pool-section"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-regular-pool-section"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="sample-library-negative-pool-section"/);
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
  assert.match(sampleLibraryRecordViewJs, /sample-library-record-step/);
  assert.match(appJs, /卡点/);
  assert.match(appJs, /data-summary-action/);
  assert.match(appJs, /summary-card-button/);
  assert.match(appJs, /function handleSummaryAction\(/);
  assert.match(appJs, /summaryAction:\s*dailyFlowCount \? "open-review-queue" : "open-sample-library"/);
  assert.match(appJs, /summaryAction:\s*"open-feedback-center"/);
  assert.match(appJs, /summaryAction:\s*"open-sample-library"/);
  assert.doesNotMatch(appJs, /if \(action === "open-style-profile"\)/);
  assert.match(appJs, /if \(action === "open-lifecycle"\)/);
  assert.doesNotMatch(appJs, /if \(action === "open-custom-lexicon"\)/);
  assert.doesNotMatch(appJs, /if \(action === "open-seed-lexicon"\)/);
  assert.match(appJs, /if \(summaryAction\)/);
  assert.match(appJs, /await handleSummaryAction\(summaryAction\.dataset\.summaryAction\)/);
  assert.match(appJs, /if \(action === "open-review-queue"\)\s*\{[\s\S]*ensureSupportWorkspaceOpen\(\);[\s\S]*openReviewQueueModal\(\)/);
  assert.match(appJs, /revealSampleLibraryReflowPane\(\)/);
  assert.match(appJs, /openSampleLibraryCreateModal\(\)/);
  assert.match(appJs, /if \(action === "open-style-profile-modal"\)/);
  assert.match(appJs, /function\s+openSampleLibraryRecord\s*\([\s\S]*openSampleLibraryRecordInlineEditorModal\(recordId\)/);
  assert.doesNotMatch(appJs, /byId\("sample-library-lifecycle-section"\)\?\.scrollIntoView/);
  assert.doesNotMatch(appJs, /sample-library-detail-step-summary/);
  assert.doesNotMatch(appJs, /sample-library-detail-step-body/);
  assert.doesNotMatch(appJs, /setSampleLibraryDetailStep\("base"\)/);
  assert.match(appJs, /nextStep:\s*"reference"/);
  assert.match(appJs, /nextStep:\s*"lifecycle"/);
  assert.match(appJs, /nextStep:\s*"calibration"/);
  assert.match(appJs, /data-action="prefill-sample-library-modal-calibration-prediction"/);
  assert.match(sampleLibraryCalibrationViewJs, /从当前检测预填预判/);
  assert.match(appJs, /setSampleLibraryCalibrationPredictionFields\(/);
  assert.match(appJs, /function\s+openSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /kind:\s*"record-list-inline-editor"/);
  assert.match(appJs, /function ensureSupportWorkspaceOpen\(/);
  assert.match(appJs, /styleProfile:\s*adminData\.styleProfile && typeof adminData\.styleProfile === "object" \? adminData\.styleProfile : null/);
  assert.match(styleProfileViewJs, /sourceSamples[\s\S]*?\.map/);
  assert.match(styleProfileViewJs, /formatDate\(current\?\.updatedAt\)/);
  assert.match(styleProfileViewJs, /优先使用通义千问、Kimi、深度求索生成画像，失败后回退到本地规则汇总/);
  assert.match(appJs, /syncStyleProfileStateFromPayload\(response\)/);
  assert.match(appJs, /async function openLexiconWorkspaceModal\(tab = "custom"/);
  assert.match(appJs, /function closeLexiconWorkspaceModal\(/);
  assert.match(appJs, /function renderLexiconWorkspaceModal\(/);
  assert.match(appJs, /function refreshAdminDataState\s*\(/);
  assert.match(appJs, /async function openLexiconWorkspaceModal\(tab = "custom"[\s\S]*await refreshAdminDataState\(\);/);
  assert.match(appJs, /async function openLexiconWorkspaceModal\(tab = "custom"[\s\S]*ensureSupportWorkspaceOpen\(\);\s*ensureSampleLibraryAdvancedPanelOpen\(\);\s*ensureRulesMaintenanceOpen\(\);/);
  assert.match(appJs, /function buildLexiconWorkspaceLexiconFormMarkup\(scope = "custom"/);
  assert.match(appJs, /function buildInnerSpaceWorkspaceFormMarkup\(/);
  assert.match(appJs, /dataset\.lexiconWorkspaceForm/);
  assert.match(appJs, /openLexiconWorkspaceModal\("custom"/);
  assert.match(appJs, /openLexiconWorkspaceModal\(button\.dataset\.tab \|\| "custom"\)/);
  assert.match(appJs, /byId\("support-workspace-panel"\)/);
  assert.match(appJs, /function ensureSampleLibraryAdvancedPanelOpen\(/);
  assert.match(appJs, /byId\("sample-library-advanced-panel"\)/);
  assert.match(appJs, /activateTab\("data-maintenance", "sample-library-pane"\)/);
  assert.match(appJs, /if \(action === "close-lexicon-workspace-modal"\)/);
  assert.match(appJs, /data-lexicon-workspace-tab/);
  assert.match(appJs, /prefill-custom-draft[\s\S]*openLexiconWorkspaceModal\("custom"/);

  assert.match(styles, /\.sample-library-workspace/);
  assert.match(styles, /\.sample-library-record-list/);
  assert.match(styles, /\.sample-library-flow-guide/);
  assert.match(styles, /\.sample-library-flow-list/);
  assert.match(styles, /\.sample-library-modal/);
  assert.match(styles, /\.sample-library-modal-dialog/);
  assert.match(styles, /\.sample-library-modal\s*\{[\s\S]*z-index:\s*74;/);
  assert.match(styles, /\.sample-library-pools-modal\s*\{[\s\S]*z-index:\s*72;/);
  assert.match(styles, /\.sample-library-detail-summary-card/);
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
  assert.doesNotMatch(styles, /\.rules-maintenance-shortcuts/);
  assert.doesNotMatch(styles, /\.rules-maintenance-shortcut-actions/);
  assert.match(styles, /\.lexicon-workspace-modal/);
  assert.match(styles, /\.lexicon-workspace-dialog/);
  assert.match(styles, /\.lexicon-workspace-tab-strip/);
  assert.match(styles, /\.lexicon-workspace-tab/);
  assert.match(styles, /\.lexicon-workspace-content/);
  assert.match(styles, /\.sample-library-record-step/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /min-width:\s*0/);
  assert.match(styles, /\.lifecycle-update-grid\s*\{/);
  assert.match(styles, /\.sample-library-calibration-grid\s*\{/);
  assert.match(sampleLibrarySectionsViewJs, /class="lifecycle-primary-grid"/);
  assert.match(sampleLibrarySectionsViewJs, /class="lifecycle-metrics-grid"/);
  assert.match(sampleLibrarySectionsViewJs, /<span>浏览数<\/span>/);
  assert.match(sampleLibrarySectionsViewJs, /<span>分享数<\/span>/);
  assert.match(sampleLibraryRecordViewJs, /浏览 \${escapeHtml\(String\(publish\.metrics\.views \|\| 0\)\)}/);
  assert.match(sampleLibraryRecordViewJs, /分享 \${escapeHtml\(String\(publish\.metrics\.shares \|\| 0\)\)}/);
  assert.match(styles, /\.lifecycle-primary-grid\s*\{/);
  assert.match(styles, /\.lifecycle-metrics-grid\s*\{/);
  assert.match(styles, /\.sample-library-metric-grid\s*\{/);
  assert.match(styles, /\.sample-library-metric-pill\s*\{/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1\.1fr\)\s*minmax\(0,\s*0\.9fr\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(140px,\s*1fr\)\)/);
  assert.match(styles, /white-space:\s*normal/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.lifecycle-update-grid > \*\s*\{/);
  assert.match(styles, /\.workspace-support\s*>\s*\*\s*\{/);
  assert.match(styles, /\.support-workspace-panel/);
  assert.match(styles, /\.support-workspace-summary/);
  assert.match(styles, /\.sample-library-advanced-panel/);
  assert.match(styles, /\.tab-panels/);
  assert.match(styles, /\.tab-panel/);
  assert.match(styles, /\.sample-library-workspace\s*>\s*\*/);
  assert.doesNotMatch(styles, /\.sample-library-detail\s*>\s*\*/);
  assert.match(styles, /max-width:\s*100%/);
  assert.match(styles, /\.action-gate-hint\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)/);
  assert.match(styles, /\.tag-picker-selected\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*display:\s*grid;/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\)/);

  const refreshAllStart = appJs.indexOf("async function refreshAll()");
  const refreshAllEnd = appJs.indexOf("async function fileToDataUrl", refreshAllStart);
  const refreshAllSource = appJs.slice(refreshAllStart, refreshAllEnd);
  assert.ok(refreshAllStart !== -1 && refreshAllEnd !== -1, "expected refreshAll source");
  assert.match(refreshAllSource, /Promise\.all\(\[\s*[\s\S]*apiJson\("\/api\/summary"\)[\s\S]*apiJson\(collectionTypesApi\)[\s\S]*refreshAdminDataState\(\)[\s\S]*refreshSampleLibraryWorkspace\(\)/);
  assert.match(refreshAllSource, /const hasExistingSummary = Boolean\(appState\.summaryData\)/);
  assert.match(refreshAllSource, /const summaryPhase = hasExistingSummary \? "refresh" : "initial";/);
  assert.match(refreshAllSource, /setSummaryLoadingState\(summaryPhase\)/);
  assert.match(refreshAllSource, /if \(summaryPhase === "initial"\) \{\s*renderSummaryLoadingPlaceholders\(\);/);
});

test("analysis view renders external prohibited-word summary inside the rule detection card", async () => {
  const { analysisReviewViewJs } = await readFrontendFiles();

  assert.match(analysisReviewViewJs, /外部违禁词摘要/);
  assert.match(analysisReviewViewJs, /外部违禁词命中与建议/);
  assert.match(analysisReviewViewJs, /结果不完整：外部违禁词检测失败/);
});

test("sample library list and summary area show loading placeholders before first data sync", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const renderSampleLibraryListSource = extractSourceBetween(
    appJs,
    "function sampleLibraryRecordListSummaryText(",
    "function buildSampleLibraryRecordListModalMarkup("
  );

  const nodes = {
    "sample-library-record-list": { innerHTML: "", dataset: {} },
    "sample-library-list-count": { textContent: "", dataset: {} },
    "sample-library-record-preview-open-button": { hidden: false }
  };
  const appState = {
    sampleLibraryFilter: "all",
    sampleLibraryCollectionFilter: "all",
    selectedSampleLibraryRecordId: "",
    sampleLibraryLoading: {
      phase: "initial",
      error: ""
    }
  };
  const renderSampleLibraryListWithState = new Function(
    "byId",
    "appState",
    "sampleLibraryFilterLabel",
    "sampleLibraryCollectionFilterLabel",
    "isSampleLibraryInitialLoading",
    "sampleLibraryRecordListSummaryText",
    `${renderSampleLibraryListSource}; return renderSampleLibraryList;`
  )(
    (id) => nodes[id] || null,
    appState,
    () => "全部记录",
    () => "全部合集",
    () => appState.sampleLibraryLoading.phase === "initial",
    (count, filterLabel, collectionLabel) => `${count} 条 · ${filterLabel} · ${collectionLabel}`
  );

  renderSampleLibraryListWithState([]);

  assert.equal(nodes["sample-library-list-count"].textContent, "加载中...");
  assert.equal(nodes["sample-library-record-preview-open-button"].hidden, true);
  assert.equal(nodes["sample-library-record-list"].innerHTML, "");

  assert.match(appJs, /const hasExistingSampleLibraryRecords = appState\.sampleLibraryRecords\.length > 0/);
  assert.match(appJs, /const phase = hasExistingSampleLibraryRecords \? "refresh" : "initial";/);
  assert.match(appJs, /setSampleLibraryLoadingState\(phase\)/);
  assert.match(appJs, /if \(phase === "initial"\) \{\s*renderSampleLibraryLoadingPlaceholders\(\);/);
  assert.match(appJs, /summary-grid/);
  assert.match(appJs, /sample-library-record-list/);
});

test("refreshAll clears admin loading state before re-rendering admin sections", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const refreshAllSource = extractSourceBetween(appJs, "async function refreshAll()", "async function fileToDataUrl");

  const appState = {
    summaryData: null,
    summaryLoading: { phase: "initial", error: "" },
    adminDataLoading: { phase: "initial", error: "" },
    adminData: {
      seedLexicon: [],
      customLexicon: [],
      innerSpaceTerms: [],
      feedbackLog: [],
      falsePositiveLog: [],
      reviewQueue: [],
      styleProfile: null
    },
    collectionTypeOptions: []
  };
  const renderPhases = [];
  const refreshAll = new Function(
    "appState",
    "apiJson",
    "collectionTypesApi",
    "refreshAdminDataState",
    "refreshSampleLibraryWorkspace",
    "refreshDraftIdeas",
    "setSummaryLoadingState",
    "renderSummaryLoadingPlaceholders",
    "renderSummary",
    "renderQueue",
    "renderAdminData",
    "renderLexiconWorkspaceModal",
    "renderCollectionTypeSelectors",
    "setAdminDataLoadingState",
    `${refreshAllSource}; return refreshAll;`
  )(
    appState,
    async (url) =>
      url === "/api/summary"
        ? { reviewQueueCount: 0, feedbackCount: 0, sampleLibraryCount: 0 }
        : { options: [{ value: "collection-a", label: "合集 A" }] },
    "/api/collection-types",
    async () => {
      appState.adminData = {
        seedLexicon: [],
        customLexicon: [],
        innerSpaceTerms: [],
        feedbackLog: [],
        falsePositiveLog: [],
        reviewQueue: [{ id: "review-1", phrase: "词条" }],
        styleProfile: null
      };
    },
    async () => [],
    async () => {},
    (phase) => {
      appState.summaryLoading.phase = phase;
    },
    () => {},
    () => {},
    () => {
      renderPhases.push(`queue:${appState.adminDataLoading.phase}`);
    },
    () => {
      renderPhases.push(`admin:${appState.adminDataLoading.phase}`);
    },
    () => {
      renderPhases.push(`modal:${appState.adminDataLoading.phase}`);
    },
    () => {},
    (phase, error = "") => {
      appState.adminDataLoading = { phase, error: String(error || "") };
    }
  );

  await refreshAll();

  assert.deepEqual(renderPhases, ["queue:idle", "admin:idle", "modal:idle"]);
});

test("sample library workspace exposes record preview and full-list modal controls", async () => {
  const { indexHtml, appJs, sampleLibraryModalViewJs } = await readFrontendFiles();
  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');
  const sortHelperSource = extractSourceBetween(
    appJs,
    "function sortSampleLibraryRecordsByPublishedAtDesc(",
    "function filterSampleLibraryRecords("
  );
  const filterHelperSource = extractSourceBetween(
    appJs,
    "function filterSampleLibraryRecords(",
    "function getSampleLibraryRecordStepLabel("
  );
  const modalBuilderSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordListModalMarkup(",
    "function buildSampleLibraryRecordInlineEditorModalMarkup("
  );
  const focusSource = extractSourceBetween(
    appJs,
    "function focusSampleLibraryRecordFromModal(",
    "function renderSampleLibraryCalibrationReplayResult("
  );

  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-list"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-preview-open-button"/);
  assert.match(sampleLibraryPaneHtml, /查看全部记录列表/);
  assert.doesNotMatch(appJs, /const SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT = 3/);
  assert.doesNotMatch(appJs, /function\s+getSampleLibraryRecordPreviewItems\s*\(/);
  assert.doesNotMatch(appJs, /function\s+openSampleLibraryRecordListModal\s*\(/);
  assert.match(sampleLibraryModalViewJs, /function\s+buildSampleLibraryRecordListModalMarkup\s*\(/);
  assert.match(appJs, /previewOpenButton\.hidden = items\.length === 0/);
  assert.match(appJs, /renderSampleLibraryRecordListModal\(\)/);
  assert.match(appJs, /if \(action === "open-sample-library-record-from-modal"\)/);
  assert.match(appJs, /if \(action === "open-sample-library-record-list-modal"\)/);
  assert.match(modalBuilderSource, /open-sample-library-record-from-modal/);
  assert.doesNotMatch(modalBuilderSource, /SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT/);

  const filterSampleLibraryRecords = new Function(
    "appState",
    "getSampleRecordReference",
    "hasTrackedLifecycle",
    "getSampleRecordCollectionType",
    "getSampleLibraryCalibrationListState",
    "getSampleRecordPublish",
    `${sortHelperSource}; ${filterHelperSource}; return filterSampleLibraryRecords;`
  )(
    { sampleLibraryFilter: "all", sampleLibraryCollectionFilter: "all" },
    () => ({ enabled: false }),
    () => false,
    () => "default",
    () => ({ key: "other" }),
    (item) => item.publish || {}
  );

  const filteredItems = filterSampleLibraryRecords([
    { id: "record-1", publish: { publishedAt: "2026-05-01" }, updatedAt: "2026-05-01T09:00:00.000Z" },
    { id: "record-2", publish: { publishedAt: "2026-05-08" }, updatedAt: "2026-05-08T09:00:00.000Z" },
    { id: "record-3", publish: { publishedAt: "" }, updatedAt: "2026-05-07T08:00:00.000Z", createdAt: "2026-05-07T08:00:00.000Z" },
    { id: "record-4", publish: { publishedAt: "2026-05-06" }, updatedAt: "2026-05-06T09:00:00.000Z" }
  ]);

  assert.deepEqual(filteredItems.map((item) => item.id), ["record-2", "record-3", "record-4", "record-1"]);

  const focusCalls = [];
  const focusSampleLibraryRecordFromModal = new Function(
    "closeSampleLibraryModal",
    "openSampleLibraryRecord",
    `${focusSource}; return focusSampleLibraryRecordFromModal;`
  )(
    () => focusCalls.push("close"),
    (recordId, step) => focusCalls.push(["open", recordId, step])
  );

  focusSampleLibraryRecordFromModal("record-4", "base");
  assert.deepEqual(focusCalls, ["close", ["open", "record-4", "base"]]);
});

test("sample library record modal upgrades to inline master-detail editing", async () => {
  const { appJs, styles, sampleLibraryModalViewJs } = await readFrontendFiles();
  const openInlineEditorSource = extractSourceBetween(
    appJs,
    "function openSampleLibraryRecordInlineEditorModal(",
    "function buildSampleLibraryRecordInlineEditorDraft("
  );
  const inlineEditorSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorModalMarkup(",
    "function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup("
  );
  const sidebarSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorSidebarMarkup(",
    "function readSampleLibraryRecordInlineEditorDraftFromModal("
  );
  const listModalOpenSource = extractSourceBetween(
    appJs,
    'if (action === "open-sample-library-record-list-modal") {',
    'if (action === "open-sample-library-delete-modal") {'
  );

  assert.match(appJs, /function\s+openSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorDraft\s*\(/);
  assert.match(appJs, /function\s+filterSampleLibraryRecordInlineEditorItems\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorPatchPayload\s*\(/);
  assert.match(sampleLibraryModalViewJs, /function\s+buildSampleLibraryRecordInlineEditorModalMarkup\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /function\s+requestSampleLibraryRecordInlineEditorSwitch\s*\(/);
  assert.match(appJs, /function\s+requestCloseSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /kind:\s*"record-list-inline-editor"/);
  assert.match(openInlineEditorSource, /titleFilter:\s*""/);
  assert.match(openInlineEditorSource, /kind:\s*"record-list-inline-editor"/);
  assert.match(openInlineEditorSource, /renderSampleLibraryRecordInlineEditorModal\(\)/);
  assert.match(listModalOpenSource, /openSampleLibraryRecordInlineEditorModal\(/);
  assert.doesNotMatch(listModalOpenSource, /openSampleLibraryRecordListModal\(/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-layout/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-sidebar/);
  assert.match(inlineEditorSource, /sample-library-record-inline-editor-detail/);
  assert.match(sidebarSource, /name="recordTitleFilter"/);
  assert.match(inlineEditorSource, /buildSampleLibraryBaseEditorSectionMarkup\(/);
  assert.match(inlineEditorSource, /buildSampleLibraryReferenceEditorSectionMarkup\(/);
  assert.match(inlineEditorSource, /buildSampleLibraryLifecycleEditorSectionMarkup\(/);
  assert.match(inlineEditorSource, /buildSampleLibraryCalibrationEditorSectionsMarkup\(/);
  assert.match(inlineEditorSource, /保存整条记录/);
  assert.match(inlineEditorSource, /data-action="switch-sample-library-record-inline-editor-record"/);
  assert.match(inlineEditorSource, /data-action="open-sample-library-delete-modal"/);
  assert.match(styles, /\.sample-library-record-inline-editor-layout\s*\{[\s\S]*align-items:\s*stretch;/);
  assert.match(styles, /\.sample-library-modal-content\s*\{[\s\S]*overflow:\s*auto;/);
  assert.match(
    styles,
    /\.sample-library-modal\[data-modal-kind="record-list-inline-editor"\] \.sample-library-modal-dialog\s*\{[\s\S]*height:\s*min\(860px,\s*calc\(100vh - 2rem\)\);/
  );
  assert.match(
    styles,
    /\.sample-library-modal\[data-modal-kind="record-list-inline-editor"\] \.sample-library-modal-content\s*\{[\s\S]*height:\s*100%;[\s\S]*overflow:\s*hidden;/
  );
  assert.match(styles, /\.sample-library-record-inline-editor-sidebar-list\s*\{[\s\S]*overflow:\s*auto;/);
  assert.match(styles, /\.sample-library-record-inline-editor-detail\s*\{[\s\S]*overflow:\s*auto;/);
  assert.match(styles, /\.sample-library-record-inline-editor-filter\s*\{/);
});

test("record inline editor keeps one unified patch payload and dirty-aware record switching", async () => {
  const { appJs, sampleLibraryModalViewJs } = await readFrontendFiles();
  const renderModalSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorModal(",
    "function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup("
  );
  const switchConfirmMarkupSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(",
    "function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup("
  );
  const switchConfirmRenderSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorSwitchConfirmModal(",
    "function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup("
  );
  const closeConfirmMarkupSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup(",
    "function buildSampleLibraryNoteModalMarkup("
  );
  const closeConfirmRenderSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorCloseConfirmModal(",
    "function requestSampleLibraryRecordInlineEditorSwitch("
  );
  const draftHelperSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorDraft(",
    "function buildSampleLibraryRecordInlineEditorPatchPayload("
  ).replace(/^export\s+/gm, "");
  const payloadHelperSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function buildSampleLibraryRecordInlineEditorPatchPayload(",
    "function isSampleLibraryRecordInlineEditorDirty("
  ).replace(/^export\s+/gm, "");
  const dirtyHelperSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function isSampleLibraryRecordInlineEditorDirty(",
    "function filterSampleLibraryRecordInlineEditorItems("
  ).replace(/^export\s+/gm, "");
  const filterItemsHelperSource = extractSourceBetween(
    sampleLibraryModalViewJs,
    "function filterSampleLibraryRecordInlineEditorItems(",
    "function buildSampleLibraryRecordInlineEditorSidebarMarkup("
  ).replace(/^export\s+/gm, "");
  const switchHelperSource = extractSourceBetween(
    appJs,
    "function requestSampleLibraryRecordInlineEditorSwitch(",
    "function requestCloseSampleLibraryRecordInlineEditorModal("
  );
  const switchConfirmSaveSource = extractSourceBetween(
    appJs,
    "function saveSampleLibraryRecordInlineEditorSwitchConfirmModal(",
    "function saveSampleLibraryRecordInlineEditorCloseConfirmModal("
  );
  const closeHelperSource = extractSourceBetween(
    appJs,
    "function requestCloseSampleLibraryRecordInlineEditorModal(",
    "function saveSampleLibraryRecordInlineEditorCloseConfirmModal("
  );
  const closeConfirmSaveSource = extractSourceBetween(
    appJs,
    "function saveSampleLibraryRecordInlineEditorCloseConfirmModal(",
    "function saveSampleLibraryRecordInlineEditorModal("
  );
  const modalChangeHandlerSource = extractSourceBetween(
    appJs,
    'byId("sample-library-modal-content")?.addEventListener("change", (event) => {',
    'byId("sample-library-modal-content")?.addEventListener("input", (event) => {'
  );
  const modalInputHandlerSource = extractSourceBetween(
    appJs,
    'byId("sample-library-modal-content")?.addEventListener("input", (event) => {',
    'byId("sample-library-modal-content")?.addEventListener("click", (event) => {'
  );
  const deleteModalSource = extractSourceBetween(
    appJs,
    "function openSampleLibraryDeleteModal(",
    "function buildFeedbackRuleQueueModalMarkup("
  );
  const escapeHandlerSource = extractSourceBetween(
    appJs,
    'document.addEventListener("keydown", (event) => {',
    'if (appState.sampleLibraryPoolsModal?.open) {'
  );

  const buildDraft = new Function(
    "getSampleRecordNote",
    "getSampleRecordCollectionType",
    "getSampleRecordReference",
    "getSampleRecordPublish",
    "getSampleRecordCalibration",
    `${draftHelperSource}; return buildSampleLibraryRecordInlineEditorDraft;`
  )(
    (record) => record.note || {},
    (record) => record.note?.collectionType || "",
    (record) => record.reference || {},
    (record) => record.publish || {},
    (record) => record.calibration || {}
  );

  const record = {
    id: "note-4",
    note: { title: "标题", body: "正文", coverText: "封面", collectionType: "all", tags: ["a"] },
    reference: { enabled: true, tier: "passed", notes: "ref" },
    publish: { status: "published_passed", metrics: { likes: 1, favorites: 2, comments: 3, views: 4, shares: 5 } },
    calibration: { prediction: { predictedStatus: "published_passed" }, retro: { notes: "retro" } }
  };

  const draft = buildDraft(record);
  assert.equal(draft.note.title, "标题");
  assert.equal(draft.reference.enabled, true);
  assert.equal(draft.publish.metrics.views, 4);
  assert.equal(draft.publish.metrics.shares, 5);

  const buildPatchPayload = new Function(`${payloadHelperSource}; return buildSampleLibraryRecordInlineEditorPatchPayload;`)();
  const payload = buildPatchPayload("note-4", draft);
  assert.deepEqual(Object.keys(payload).sort(), ["calibration", "id", "note", "publish", "reference"]);
  assert.equal(payload.id, "note-4");
  assert.equal(payload.note.title, "标题");
  assert.equal(payload.note.collectionType, "all");
  assert.deepEqual(payload.note.tags, ["a"]);
  assert.equal(payload.reference.enabled, true);
  assert.equal(payload.reference.tier, "passed");
  assert.equal(payload.publish.status, "published_passed");
  assert.equal(payload.publish.metrics.likes, 1);
  assert.equal(payload.publish.metrics.views, 4);
  assert.equal(payload.publish.metrics.shares, 5);
  assert.equal(payload.calibration.prediction.predictedStatus, "published_passed");
  assert.equal(payload.calibration.retro.notes, "retro");

  const filterInlineEditorItems = new Function(
    "getSampleRecordTitle",
    `${filterItemsHelperSource}; return filterSampleLibraryRecordInlineEditorItems;`
  )((item) => String(item?.note?.title || item?.title || ""));
  assert.deepEqual(
    filterInlineEditorItems(
      [
        { id: "record-1", note: { title: "纸片人入门" } },
        { id: "record-2", note: { title: "玩具避坑清单" } },
        { id: "record-3", note: { title: "纸片人进阶玩法" } }
      ],
      "纸片人",
      { getSampleRecordTitle: (item) => String(item?.note?.title || item?.title || "") }
    ).map((item) => item.id),
    ["record-1", "record-3"]
  );

  const isDirty = new Function(`${dirtyHelperSource}; return isSampleLibraryRecordInlineEditorDirty;`)();
  assert.equal(isDirty({ draft, initialSnapshot: draft }), false);
  assert.equal(
    isDirty({
      draft: structuredClone(draft),
      initialSnapshot: structuredClone(draft)
    }),
    false
  );
  assert.equal(
    isDirty({
      draft: { ...draft, note: { ...draft.note, title: "新标题" } },
      initialSnapshot: draft
    }),
    true
  );

  assert.match(switchHelperSource, /isSampleLibraryRecordInlineEditorDirty\(/);
  assert.match(switchHelperSource, /kind:\s*"record-list-inline-editor-switch-confirm"/);
  assert.match(switchHelperSource, /targetRecordId:\s*String\(recordId \|\| ""\)/);
  assert.match(switchHelperSource, /renderSampleLibraryRecordInlineEditorSwitchConfirmModal\(\)/);
  assert.doesNotMatch(switchHelperSource, /pendingAction:\s*\{\s*type:\s*"switch-record"/);
  assert.match(closeHelperSource, /isSampleLibraryRecordInlineEditorDirty\(/);
  assert.match(closeHelperSource, /kind:\s*"record-list-inline-editor-close-confirm"/);
  assert.match(closeHelperSource, /renderSampleLibraryRecordInlineEditorCloseConfirmModal\(\)/);
  assert.doesNotMatch(closeHelperSource, /pendingAction:\s*\{\s*type:\s*"close"/);
  assert.match(closeHelperSource, /modalState\?\.kind === "record-list-inline-editor-switch-confirm" && modalState\.returnTo\?\.kind === "record-list-inline-editor"/);
  assert.match(closeHelperSource, /modalState\?\.kind === "delete-record" && modalState\.returnTo\?\.kind === "record-list-inline-editor"/);
  assert.match(renderModalSource, /saveLabel:\s*"保存整条记录"/);
  assert.match(renderModalSource, /cancelLabel:\s*"关闭"/);
  assert.match(appJs, /function\s+syncSampleLibraryRecordInlineEditorFilterResults\s*\(/);
  assert.match(renderModalSource, /const allItems = filterSampleLibraryRecords\(appState\.sampleLibraryRecords\);/);
  assert.match(renderModalSource, /const items = filterSampleLibraryRecordInlineEditorItems\(\s*allItems,/);
  assert.match(renderModalSource, /const selectedRecord =\s*allItems\.find\(/);
  assert.match(switchConfirmMarkupSource, /是否切换并丢弃未保存修改/);
  assert.match(switchConfirmMarkupSource, /继续切换后，当前这条记录里尚未保存的修改会被丢弃/);
  assert.match(switchConfirmRenderSource, /title:\s*"切换前确认"/);
  assert.match(switchConfirmRenderSource, /saveLabel:\s*"继续切换"/);
  assert.match(switchConfirmRenderSource, /cancelLabel:\s*"返回编辑"/);
  assert.match(closeConfirmMarkupSource, /是否关闭并丢弃未保存修改/);
  assert.match(closeConfirmMarkupSource, /继续关闭后，当前这条记录里尚未保存的修改会被丢弃/);
  assert.match(closeConfirmRenderSource, /title:\s*"关闭前确认"/);
  assert.match(closeConfirmRenderSource, /saveLabel:\s*"继续关闭"/);
  assert.match(closeConfirmRenderSource, /cancelLabel:\s*"返回编辑"/);
  assert.match(appJs, /saveButton\.classList\.toggle\("button-danger",\s*modalKind === "record-list-inline-editor-switch-confirm" \|\| modalKind === "record-list-inline-editor-close-confirm"\)/);
  assert.match(appJs, /saveButton\.classList\.remove\("button-danger"\)/);
  assert.match(switchConfirmSaveSource, /openSampleLibraryRecordInlineEditorModal\(modalState\.targetRecordId\)/);
  assert.match(closeConfirmSaveSource, /closeSampleLibraryModal\(\)/);
  assert.match(appJs, /modalState\?\.kind === "record-list-inline-editor-switch-confirm"[\s\S]*saveSampleLibraryRecordInlineEditorSwitchConfirmModal\(\)/);
  assert.match(appJs, /modalState\?\.kind === "record-list-inline-editor-close-confirm"[\s\S]*saveSampleLibraryRecordInlineEditorCloseConfirmModal\(\)/);
  assert.match(deleteModalSource, /const returnTo = appState\.sampleLibraryModal\?\.kind === "record-list-inline-editor" \? \{ \.\.\.appState\.sampleLibraryModal \} : null;/);
  assert.match(deleteModalSource, /kind:\s*"delete-record"/);
  assert.match(
    modalChangeHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*syncSampleLibraryRecordInlineEditorFilterResults\(\);/
  );
  assert.match(
    modalInputHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*syncSampleLibraryRecordInlineEditorFilterResults\(\);/
  );
  assert.doesNotMatch(
    modalChangeHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*renderSampleLibraryRecordInlineEditorModal\(\);/
  );
  assert.doesNotMatch(
    modalInputHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*renderSampleLibraryRecordInlineEditorModal\(\);/
  );
  assert.doesNotMatch(
    modalChangeHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*setSelectionRange\(/
  );
  assert.doesNotMatch(
    modalInputHandlerSource,
    /fieldName === "recordTitleFilter"[\s\S]*setSelectionRange\(/
  );
  assert.match(escapeHandlerSource, /appState\.sampleLibraryModal\?\.kind === "record-list-inline-editor-switch-confirm"/);
  assert.match(escapeHandlerSource, /appState\.sampleLibraryModal\?\.kind === "record-list-inline-editor-close-confirm"/);
  assert.match(escapeHandlerSource, /requestCloseSampleLibraryRecordInlineEditorModal\(\)/);
  assert.match(appJs, /method:\s*"PATCH"[\s\S]*note:[\s\S]*reference:[\s\S]*publish:[\s\S]*calibration:/);
});

test("feedback review shortcuts keep candidate phrases separate from context categories", async () => {
  const { appJs } = await readFrontendFiles();
  const reviewActionStart = appJs.indexOf('if (action === "send-feedback-to-review-queue") {');
  const falsePositiveActionStart = appJs.indexOf('if (action === "send-feedback-to-false-positive") {', reviewActionStart);
  const reviewActionSource = appJs.slice(reviewActionStart, falsePositiveActionStart);

  assert.ok(reviewActionStart !== -1 && falsePositiveActionStart !== -1, "expected send-feedback-to-review-queue block");
  assert.match(reviewActionSource, /suspiciousPhrases:\s*uniqueStrings\(\[[\s\S]*button\.dataset\.suspiciousPhrases[\s\S]*button\.dataset\.feedbackModelSuspiciousPhrases[\s\S]*\]\)/);
  assert.match(reviewActionSource, /contextCategories:\s*splitCSV\(button\.dataset\.feedbackModelContextCategories \|\| ""\)/);
  assert.match(reviewActionSource, /openFeedbackRuleQueueModal\(\{/);
});

test("sample pool classification treats false positive lifecycle outcomes as negative samples", async () => {
  const { appJs } = await readFrontendFiles();
  const classifyStart = appJs.indexOf("function classifySampleLibraryPool(record = {}) {");
  const classifyEnd = appJs.indexOf("function sampleLibraryPoolLabel", classifyStart);
  const classifySource = appJs.slice(classifyStart, classifyEnd);

  assert.ok(classifyStart !== -1 && classifyEnd !== -1, "expected classifySampleLibraryPool source");
  assert.match(classifySource, /\["limited", "violation", "false_positive"\]\.includes\(publish\.status\)/);
});

test("negative pool actions route false positive lifecycle records to lifecycle editing instead of fake restore", async () => {
  const { sampleLibraryRecordViewJs } = await readFrontendFiles();
  const actionMarkupStart = sampleLibraryRecordViewJs.indexOf("export function buildSamplePoolActionMarkup(record = {}, pool = \"reference\", helpers = {}) {");
  const actionMarkupEnd = sampleLibraryRecordViewJs.indexOf("export function renderSamplePoolCards", actionMarkupStart);
  const actionMarkupSource = sampleLibraryRecordViewJs.slice(actionMarkupStart, actionMarkupEnd);

  assert.ok(actionMarkupStart !== -1 && actionMarkupEnd !== -1, "expected buildSamplePoolActionMarkup source");
  assert.match(actionMarkupSource, /\["limited", "violation", "false_positive"\]\.includes\(publish\.status\)/);
  assert.match(actionMarkupSource, /data-action="open-sample-library-delete-modal"/);
  assert.match(actionMarkupSource, /class="button button-danger button-small" data-action="open-sample-library-delete-modal"/);
  assert.doesNotMatch(
    actionMarkupSource,
    /\["limited", "violation"\]\.includes\(publish\.status\)[\s\S]*restore-sample-from-negative-pool/
  );
});

test("reference candidate qualification uses the same content-length floor as runtime references", async () => {
  const { appJs } = await readFrontendFiles();
  const candidateStart = appJs.indexOf("function isQualifiedReferenceCandidate(record = {}) {");
  const candidateEnd = appJs.indexOf("function classifySampleLibraryPool", candidateStart);
  const candidateSource = appJs.slice(candidateStart, candidateEnd);

  assert.ok(candidateStart !== -1 && candidateEnd !== -1, "expected isQualifiedReferenceCandidate source");
  assert.match(candidateSource, /title\.length >= 4/);
  assert.match(candidateSource, /body\.length >= 16/);
  assert.match(candidateSource, /coverText\.length >= 4/);
  assert.doesNotMatch(candidateSource, /const hasContent = Boolean\(getSampleRecordTitle\(record\) \|\| getSampleRecordBody\(record\) \|\| getSampleRecordCoverText\(record\)\);/);
});

test("sample pool explanation distinguishes direct engagement from views-assisted qualification", async () => {
  const { indexHtml, appJs, styles, sampleLibraryRecordViewJs } = await readFrontendFiles();
  assert.match(appJs, /function evaluateReferenceSampleThreshold\(metrics = \{\}\) \{/);
  assert.match(appJs, /likes:\s*30/);
  assert.match(appJs, /directViews:\s*2000/);
  assert.match(appJs, /supportViews:\s*1000/);
  assert.match(appJs, /favorites:\s*20/);
  assert.match(appJs, /comments:\s*10/);
  assert.match(appJs, /shares:\s*20/);
  assert.match(appJs, /nearLikes:\s*15/);
  assert.match(appJs, /nearFavorites:\s*10/);
  assert.match(appJs, /nearComments:\s*5/);
  assert.match(appJs, /nearShares:\s*10/);
  assert.match(appJs, /互动直达达标/);
  assert.match(appJs, /浏览直达达标/);
  assert.match(appJs, /互动接近达标，已由高浏览补足/);
  assert.doesNotMatch(appJs, /qualification\.reason \|\| "互动达标"/);
  assert.match(appJs, /function\s+getSamplePoolWhyHelperText\s*\(/);
  assert.match(appJs, /至少一项已经单独达到参考门槛/);
  assert.match(appJs, /当前由浏览数单独达到参考门槛/);
  assert.match(appJs, /再由高浏览补足后进入参考池/);
  assert.match(sampleLibraryRecordViewJs, /sample-pool-why-helper/);
  assert.match(appJs, /只有浏览高，核心互动还没接近达标/);
  assert.match(indexHtml, /id="sample-library-flow-reference-threshold"/);
  assert.match(indexHtml, /id="sample-library-pools-modal-subtitle"/);
  assert.match(appJs, /function\s+getReferenceThresholdDirectRuleText\s*\(/);
  assert.match(appJs, /function\s+getReferenceThresholdAssistRuleText\s*\(/);
  assert.match(appJs, /function\s+getReferenceThresholdRequirementText\s*\(/);
  assert.match(styles, /\.sample-pool-why-helper\s*\{/);
});

test("sample pool modal folds counts into tab titles instead of rendering duplicate summary cards", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const modalSource = extractSourceBetween(appJs, "function renderSampleLibraryPoolsModal()", "function openSampleLibraryPoolsModal");
  const poolsContentInputSource = extractSourceBetween(
    appJs,
    'byId("sample-library-modal-save")?.addEventListener("click", async () => {',
    'byId("rewrite-model-selection").addEventListener("change", () => {'
  );
  const poolsTabClickSource = extractSourceBetween(
    appJs,
    'const samplePoolTab = event.target.closest("[data-sample-pool-tab]");',
    'const lexiconWorkspaceTab = event.target.closest("[data-lexicon-workspace-tab]");'
  );

  assert.match(appJs, /function\s+formatSamplePoolTabLabel\s*\(/);
  assert.match(appJs, /function\s+filterSamplePoolRecordsByTitle\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryPoolsModalSearchResults\s*\(/);
  assert.match(
    appJs,
    /sampleLibraryPoolsModal:\s*\{\s*open:\s*false,\s*tab:\s*"reference",\s*search:\s*"",\s*metricFilters:\s*\{\s*likes:\s*"",\s*favorites:\s*"",\s*comments:\s*"",\s*views:\s*"",\s*shares:\s*""\s*\}\s*\}/
  );
  assert.match(modalSource, /const poolSearch = String\(appState\.sampleLibraryPoolsModal\?\.search \|\| ""\);/);
  assert.match(modalSource, /const poolMetricFilters = appState\.sampleLibraryPoolsModal\?\.metricFilters \|\| \{\}/);
  assert.match(modalSource, /const filteredRecords = filterSamplePoolRecords\(/);
  assert.match(modalSource, /const filteredSummary = buildSamplePoolSummary\(filteredRecords\);/);
  assert.match(modalSource, /button\.textContent = formatSamplePoolTabLabel\(tab,\s*filteredSummary\[tab\] \|\| 0\)/);
  assert.match(modalSource, /name="samplePoolTitleFilter"/);
  assert.match(modalSource, /name="samplePoolLikesFilter"/);
  assert.match(modalSource, /name="samplePoolFavoritesFilter"/);
  assert.match(modalSource, /name="samplePoolCommentsFilter"/);
  assert.match(modalSource, /name="samplePoolViewsFilter"/);
  assert.match(modalSource, /name="samplePoolSharesFilter"/);
  assert.match(modalSource, /data-action="clear-sample-pool-filters"/);
  assert.match(modalSource, /清空全部筛选/);
  assert.match(modalSource, /value="\$\{escapeHtml\(poolSearch\)\}"/);
  assert.match(modalSource, /按标题搜索全部样本池/);
  assert.match(modalSource, /当前筛选下没有匹配的记录/);
  assert.match(
    appJs,
    /open:\s*true,\s*tab:\s*\["reference", "regular", "negative"\]\.includes\(pool\) \? pool : "reference",\s*search:\s*"",\s*metricFilters:\s*\{\s*likes:\s*"",\s*favorites:\s*"",\s*comments:\s*"",\s*views:\s*"",\s*shares:\s*""\s*\}/
  );
  assert.match(
    appJs,
    /open:\s*false,\s*tab:\s*String\(appState\.sampleLibraryPoolsModal\?\.tab \|\| "reference"\),\s*search:\s*"",\s*metricFilters:\s*\{\s*likes:\s*"",\s*favorites:\s*"",\s*comments:\s*"",\s*views:\s*"",\s*shares:\s*""\s*\}/
  );
  assert.match(
    poolsContentInputSource,
    /byId\("sample-library-pools-modal-content"\)\?\.addEventListener\("input", \(event\) => \{[\s\S]*fieldName === "samplePoolTitleFilter"[\s\S]*syncSampleLibraryPoolsModalSearchResults\(\);/
  );
  assert.doesNotMatch(
    poolsContentInputSource,
    /fieldName === "samplePoolTitleFilter"[\s\S]*renderSampleLibraryPoolsModal\(\);/
  );
  assert.match(poolsContentInputSource, /fieldName === "samplePoolLikesFilter"/);
  assert.match(poolsContentInputSource, /fieldName === "samplePoolFavoritesFilter"/);
  assert.match(poolsContentInputSource, /fieldName === "samplePoolCommentsFilter"/);
  assert.match(poolsContentInputSource, /fieldName === "samplePoolViewsFilter"/);
  assert.match(poolsContentInputSource, /fieldName === "samplePoolSharesFilter"/);
  assert.match(appJs, /if \(action === "clear-sample-pool-filters"\)/);
  assert.match(
    appJs,
    /action === "clear-sample-pool-filters"[\s\S]*sampleLibraryPoolsModal = \{[\s\S]*open:\s*true,[\s\S]*tab:\s*String\(appState\.sampleLibraryPoolsModal\?\.tab \|\| "reference"\),[\s\S]*search:\s*"",[\s\S]*metricFilters:\s*\{\s*likes:\s*"",\s*favorites:\s*"",\s*comments:\s*"",\s*views:\s*"",\s*shares:\s*""\s*\}/
  );
  assert.match(
    poolsTabClickSource,
    /sampleLibraryPoolsModal = \{[\s\S]*open:\s*true,[\s\S]*tab:\s*String\(samplePoolTab\.dataset\.samplePoolTab \|\| "reference"\),[\s\S]*search:\s*String\(appState\.sampleLibraryPoolsModal\?\.search \|\| ""\),[\s\S]*metricFilters:\s*\{[\s\S]*appState\.sampleLibraryPoolsModal\?\.metricFilters/
  );
  assert.doesNotMatch(modalSource, /sample-pool-summary-grid/);
  assert.doesNotMatch(modalSource, /条记录/);
  assert.doesNotMatch(styles, /\.sample-pool-summary-grid\s*\{/);
  assert.doesNotMatch(styles, /\.sample-pool-summary-card\s*\{/);
});

test("frontend keeps the analyze picker regression surface in the main UI file", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="analyze-tag-picker"/);
  assert.match(appJs, /\/api\/analyze-tag-options/);
  assert.match(appJs, /const presetAnalyzeTags = \[[\s\S]*"愉悦"[\s\S]*\]/);
  assert.match(appJs, /const presetAnalyzeTags = \[[\s\S]*"大人也要玩玩具"[\s\S]*\]/);
  assert.match(appJs, /const presetAnalyzeTags = \[[\s\S]*"悦己"[\s\S]*\]/);
  assert.match(appJs, /const presetAnalyzeTags = \[[\s\S]*"深夜话题"[\s\S]*\]/);
  assert.match(appJs, /function setAnalyzeTagDropdownOpen\(/);
  assert.match(appJs, /function toggleAnalyzePresetTag\(/);
  assert.match(appJs, /function renderAnalyzeTagOptions\(/);
  assert.doesNotMatch(appJs, /byId\("sample-library-search-input"\)\.addEventListener\("input"/);
  assert.doesNotMatch(appJs, /byId\("sample-library-likes-filter"\)\.addEventListener\("input"/);
  assert.doesNotMatch(appJs, /byId\("sample-library-favorites-filter"\)\.addEventListener\("input"/);
  assert.doesNotMatch(appJs, /byId\("sample-library-comments-filter"\)\.addEventListener\("input"/);
  assert.doesNotMatch(appJs, /byId\("sample-library-views-filter"\)\.addEventListener\("input"/);
  assert.doesNotMatch(appJs, /byId\("sample-library-shares-filter"\)\.addEventListener\("input"/);
});

test("sample library create button toggles with explicit expanded state and scroll feedback", async () => {
  const { appJs, sampleLibraryModalViewJs, sampleLibrarySectionsViewJs } = await readFrontendFiles();

  assert.match(sampleLibrarySectionsViewJs, /function\s+buildSampleLibraryModalTagPickerMarkup\s*\(/);
  assert.match(appJs, /function\s+initializeSampleLibraryModalTagPicker\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryModalTagOptions\s*\(/);
  assert.match(appJs, /function\s+writeSampleLibraryModalTags\s*\(/);
  assert.match(sampleLibraryModalViewJs, /function\s+buildSampleLibraryCreateModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openSampleLibraryCreateModal\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryCreateModal\s*\(/);
  assert.match(appJs, /function\s+fillSampleLibraryCreateModalFromCurrent\s*\(/);
  assert.match(sampleLibrarySectionsViewJs, /class="tag-picker field-wide sample-library-modal-tag-picker"/);
  assert.match(sampleLibrarySectionsViewJs, /name="tags" type="hidden"/);
  assert.match(sampleLibrarySectionsViewJs, /class="tag-picker-trigger sample-library-modal-tag-trigger"/);
  assert.match(sampleLibrarySectionsViewJs, /class="tag-picker-dropdown sample-library-modal-tag-dropdown"/);
  assert.match(sampleLibrarySectionsViewJs, /sample-library-modal-tag-custom/);
  assert.match(appJs, /renderSampleLibraryModalTagOptions\(\)[\s\S]*uniqueStrings\(analyzeTagOptions\)/);
  assert.match(appJs, /byId\("sample-library-create-button"\)\.addEventListener\("click", openSampleLibraryCreateModal\)/);
  assert.match(appJs, /openSampleLibraryCreateModal\(\)/);
  assert.doesNotMatch(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
});

test("sample library base editing and record deletion now route through modal confirmations", async () => {
  const { appJs, sampleLibraryModalViewJs, sampleLibraryFormHelpersJs } = await readFrontendFiles();

  assert.match(sampleLibraryModalViewJs, /function\s+buildSampleLibraryBaseModalMarkup\s*\(/);
  assert.match(sampleLibraryFormHelpersJs, /function\s+readSampleLibraryModalBasePayload\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryDetailBaseModal\s*\(/);
  assert.match(sampleLibraryModalViewJs, /function\s+buildSampleLibraryDeleteModalMarkup\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryDeleteModal\s*\(/);
  assert.match(appJs, /data-action="open-sample-library-base-modal"/);
  assert.match(sampleLibraryModalViewJs, /data-action="open-sample-library-delete-modal"/);
  assert.match(appJs, /if \(action === "open-sample-library-base-modal"\)/);
  assert.match(appJs, /if \(action === "open-sample-library-delete-modal"\)/);
  assert.doesNotMatch(appJs, /data-action="save-sample-library-base"/);
});

test("frontend gates secondary sample-library and lifecycle-save actions with inline hints", async () => {
  const { appJs, analysisReviewViewJs } = await readFrontendFiles();
  const referenceStateSource = extractSourceBetween(
    appJs,
    "function syncSampleLibraryReferenceSectionState(",
    "function getSampleLibraryCalibrationPredictionPrefillRequirementMessage("
  );
  const syncDetailActionsFunction = appJs.match(/function\s+syncSampleLibraryDetailActions\s*\([\s\S]*?\n}\n/)?.[0] || "";
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function buildLexiconEntry(", generationStart);
  const generationSource = appJs.slice(generationStart, generationEnd);

  assert.match(appJs, /function\s+getSampleLibraryDetailBaseRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryDetailReferenceRequirementMessage\s*\(/);
  assert.doesNotMatch(appJs, /function\s+getSampleLibraryDetailLifecycleRequirementMessage\s*\(/);
  assert.doesNotMatch(appJs, /function\s+getSampleLibraryDetailCalibrationRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryDetailActions\s*\(/);
  assert.match(appJs, /function\s+getLifecycleSaveRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncLifecycleResultActions\s*\(/);

  assert.match(appJs, /sample-library-base-action-hint/);
  assert.match(appJs, /sample-library-reference-action-hint/);
  assert.match(appJs, /sample-library-lifecycle-action-hint/);
  assert.match(appJs, /sample-library-calibration-action-hint/);
  assert.match(analysisReviewViewJs, /id="analysis-lifecycle-action-hint"/);
  assert.match(analysisReviewViewJs, /id="rewrite-lifecycle-action-hint"/);

  assert.match(appJs, /setActionGateHint\("sample-library-base-action-hint",\s*""\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-reference-action-hint",\s*""\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-lifecycle-action-hint",\s*""\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-calibration-action-hint",\s*""\)/);
  assert.match(syncDetailActionsFunction, /prefill-sample-library-modal-calibration-prediction/);
  assert.doesNotMatch(syncDetailActionsFunction, /prefill-sample-library-calibration-prediction/);
  assert.match(appJs, /function\s+getSampleLibraryCalibrationPredictionPrefillSourceSummary\s*\(/);
  assert.match(appJs, /setSampleLibraryCalibrationPrefillMessage/);
  assert.match(appJs, /已根据当前检测结果填充内容。/);
  assert.match(appJs, /setActionGateHint\("analysis-lifecycle-action-hint",\s*analysisMessage\)/);
  assert.match(appJs, /setActionGateHint\("rewrite-lifecycle-action-hint",\s*rewriteMessage\)/);

  assert.doesNotMatch(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("input",\s*syncSampleLibraryDetailActions\)/);
  assert.doesNotMatch(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("change",\s*syncSampleLibraryDetailActions\)/);
  assert.doesNotMatch(appJs, /renderSampleLibraryDetail\(selectedRecord\);[\s\S]*syncSampleLibraryDetailActions\(\)/);
  assert.match(appJs, /openSampleLibraryRecordInlineEditorModal\(sampleLibraryRecord\.dataset\.sampleLibraryRecordId \|\| ""\)/);
  assert.match(appJs, /renderAnalysis\(result[\s\S]*analysis-lifecycle-action-hint/);
  assert.match(appJs, /renderRewriteResult\(result\)[\s\S]*rewrite-lifecycle-action-hint/);
  assert.doesNotMatch(generationSource, /generation-lifecycle-action-hint/);
  assert.match(appJs, /function\s+syncSampleLibraryReferenceSectionState\s*\(/);
  assert.match(appJs, /tierSelect\.value[\s\S]*enabledCheckbox\.checked = true/);
  assert.match(appJs, /source === "checkbox" && enabledCheckbox\.checked !== true[\s\S]*tierSelect\.value = ""/);
  assert.doesNotMatch(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("change",\s*syncSampleLibraryReferenceSectionState\)/);
  assert.match(appJs, /const enabled = root\?\.querySelector\('\[name="enabled"\]'\)\?\.checked === true \|\| Boolean\(tier\)/);
  assert.match(appJs, /predictionMatchedLabel\(comparison\.matched\)/);
  assert.match(appJs, /comparison\.missReasonSuggestion/);

  class FakeInputElement {
    constructor(checked = false) {
      this.checked = checked;
    }
  }

  class FakeSelectElement {
    constructor(value = "") {
      this.value = value;
    }
  }

  const syncSampleLibraryReferenceSectionState = new Function(
    "HTMLInputElement",
    "HTMLSelectElement",
    "syncSampleLibraryDetailActions",
    `${referenceStateSource}; return syncSampleLibraryReferenceSectionState;`
  )(FakeInputElement, FakeSelectElement, () => {});

  const enabledCheckbox = new FakeInputElement(false);
  const tierSelect = new FakeSelectElement("passed");
  const card = {
    querySelector(selector) {
      if (selector === '[name="enabled"]') return enabledCheckbox;
      if (selector === '[name="tier"]') return tierSelect;
      return null;
    }
  };

  syncSampleLibraryReferenceSectionState(card, { source: "checkbox" });
  assert.equal(enabledCheckbox.checked, false);
  assert.equal(tierSelect.value, "");

  tierSelect.value = "performed";
  syncSampleLibraryReferenceSectionState(card, { source: "tier" });
  assert.equal(enabledCheckbox.checked, true);
  assert.equal(tierSelect.value, "performed");
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

test("frontend explains the recommended retro review timing around T+7 only", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /function\s+buildSampleLibraryRetroTimingHint\s*\(/);
  assert.match(appJs, /建议至少等到 T\+7 再做发布后复盘/);
  assert.match(appJs, /当前适合做终局复盘和参考样本确认/);
  assert.match(appJs, /sample-library-retro-timing-hint/);
  assert.match(appJs, /sample-library-retro-timing-hint--pending/);
  assert.match(appJs, /sample-library-retro-timing-hint--final-review/);
  assert.match(styles, /\.sample-library-retro-timing-hint/);
  assert.match(styles, /\.sample-library-retro-timing-hint--pending/);
  assert.match(styles, /\.sample-library-retro-timing-hint--final-review/);
});

test("frontend surfaces calibration visibility directly in the sample-library list", async () => {
  const { indexHtml, appJs, styles, sampleLibraryRecordViewJs } = await readFrontendFiles();

  assert.match(indexHtml, /<option value="calibration_pending">待复盘<\/option>/);
  assert.match(indexHtml, /<option value="calibration_matched">已命中<\/option>/);
  assert.match(indexHtml, /<option value="calibration_mismatch">有偏差<\/option>/);
  assert.match(appJs, /function\s+getSampleLibraryCalibrationListState\s*\(/);
  assert.match(appJs, /filter === "calibration_pending"/);
  assert.match(appJs, /filter === "calibration_matched"/);
  assert.match(appJs, /filter === "calibration_mismatch"/);
  assert.match(appJs, /sample-library-calibration-pill/);
  assert.match(sampleLibraryRecordViewJs, /riskLevelLabel\(calibration\.prediction\.predictedRiskLevel\)/);
  assert.match(styles, /\.sample-library-calibration-pill/);
});

test("frontend renders prediction evidence inside the sample-library calibration modal", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /function\s+buildSampleLibraryCalibrationEvidenceMarkup\s*\(/);
  assert.match(styles, /\.sample-library-calibration-evidence/);

  const evidence = buildSampleLibraryCalibrationEvidenceState({
    confidence: 78,
    evidenceSummary: "这条记录与 1 条历史样本的结构高度相似。",
    evidenceSamples: [{ id: "record-1", title: "历史样本 1" }],
    evidenceSignals: ["标题短语命中", "标签重合"]
  });

  assert.equal(evidence.confidence, 78);
  assert.equal(evidence.summary, "这条记录与 1 条历史样本的结构高度相似。");
  assert.deepEqual(evidence.samples, [{ id: "record-1", title: "历史样本 1" }]);
  assert.deepEqual(evidence.signals, ["标题短语命中", "标签重合"]);
  assert.match(evidence.confidenceNote, /当前置信度 78/);
});

test("frontend keeps publish prediction prefill conservative while reusing the same prediction payload for evidence and feedback", async () => {
  const { appJs } = await readFrontendFiles();
  const fieldSetterSource = extractSourceBetween(
    appJs,
    "function setSampleLibraryCalibrationPredictionFields(",
    "function setSampleLibraryCalibrationPrefillMessage("
  );

  assert.match(appJs, /function\s+isSampleLibraryCalibrationPredictionFieldEmpty\s*\(/);
  assert.match(fieldSetterSource, /if\s*\(\s*isSampleLibraryCalibrationPredictionFieldEmpty\(name,\s*field\)\s*\)\s*\{/);
  assert.match(fieldSetterSource, /syncSampleLibraryCalibrationEvidencePanel\(section,\s*prediction\)/);
  assert.match(appJs, /setSampleLibraryCalibrationPrefillMessage\(prediction\.successMessage \|\| prefillSource\.successMessage \|\| "已预填预判字段。"\)/);
});

test("runRewriteFromPayload reuses beforeAnalysis when the rewrite API omits the legacy analysis field", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /appState\.latestAnalysis = result\.beforeAnalysis \|\| result\.analysis \|\| appState\.latestAnalysis/);
  assert.match(appJs, /try \{\s*renderRewriteResult\(\{/);
  assert.match(appJs, /renderRewriteResult\(\{[\s\S]*?\}\);\s*\} catch[\s\S]*?const falsePositiveSources = buildFalsePositiveCaptureSources/);
  assert.match(appJs, /analysisSnapshot: appState\.latestAnalysis/);
  assert.match(appJs, /renderAnalysis\(appState\.latestAnalysis,/);
  assert.match(appJs, /改写结果渲染失败/);
  assert.match(appJs, /error\.message \|\| "改写结果渲染失败"/);
});

test("frontend exposes a calibration review queue with quick jumps back to sample detail", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="sample-library-calibration-review-queue"/);
  assert.match(indexHtml, /批量复盘队列/);
  assert.match(appJs, /function\s+getSampleLibraryCalibrationReviewQueueItems\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryCalibrationReviewQueue\s*\(/);
  assert.match(appJs, /T\+7 终局复盘提醒/);
  assert.match(appJs, /data-action="open-sample-library-record"/);
  assert.match(appJs, /data-action="open-sample-library-calibration"/);
  assert.match(appJs, /if \(action === "open-sample-library-record"\)/);
  assert.match(appJs, /if \(action === "open-sample-library-calibration"\)/);
  assert.match(styles, /\.sample-library-calibration-queue/);
  assert.match(styles, /\.sample-library-calibration-queue-card/);
});

test("frontend labels review-queue promotion actions as whitelist or violation lexicon explicitly", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /候选词 \/ 语境人工复核队列/);
  assert.match(indexHtml, /主页面只保留入口摘要/);
  assert.match(appJs, /打开人工复核队列/);
  assert.match(appJs, /白名单生效预演/);
  assert.match(appJs, /违规词库生效预演/);
  assert.match(appJs, /建议加入宽松白名单/);
  assert.match(appJs, /建议加入违规词库：/);
  assert.match(appJs, /\? "加入白名单" : "加入违规词库"/);
  assert.doesNotMatch(appJs, /按建议入库/);
});

test("frontend also surfaces T+7 retro reminders in the manual review queue area", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="review-queue"/);
  assert.match(appJs, /function\s+getManualReviewRetroReminderQueueItems\s*\(/);
  assert.match(appJs, /function\s+openReviewQueueModal\s*\(/);
  assert.match(appJs, /function\s+buildReviewQueueModalMarkup\s*\(/);
  assert.match(appJs, /kind:\s*"review-queue-list"/);
  assert.match(appJs, /2026-05-11/);
  assert.match(appJs, /const retroReminderItems = getManualReviewRetroReminderQueueItems\(/);
  assert.match(appJs, /T\+7 终局复盘提醒/);
  assert.match(appJs, /data-action="open-sample-library-calibration"/);
  assert.match(appJs, /进入发布后复盘/);
  assert.match(
    styles,
    /\.workspace-support\s*\{[\s\S]*?grid-template-columns:\s*minmax\(420px,\s*0\.96fr\)\s+minmax\(520px,\s*1\.12fr\);[\s\S]*?align-items:\s*stretch;[\s\S]*?\}/
  );
  assert.match(
    styles,
    /\.review-queue-entry-card\s*\{/
  );
  assert.match(
    styles,
    /\.review-queue-entry-metrics\s*\{/
  );
  assert.doesNotMatch(styles, /\.queue-panel\s*\{[\s\S]*?min-height:\s*980px/);
  assert.match(
    styles,
    /@media \(max-width:\s*1240px\)\s*\{[\s\S]*?\.workspace-main,\s*\.workspace-support\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\}[\s\S]*?\.panel-sticky\s*\{[\s\S]*?position:\s*static;[\s\S]*?\}[\s\S]*?\}/
  );
});

test("frontend generation workbench consolidates strategy inputs into one brief field and keeps draft fields mode-gated", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /name="briefing"/);
  assert.match(indexHtml, /一句话需求/);
  assert.match(indexHtml, /id="generation-briefing-improve"/);
  assert.match(indexHtml, /AI润色优化/);
  assert.match(indexHtml, /class="generation-briefing-improve-row"/);
  assert.match(
    indexHtml,
    /class="generation-briefing-improve-row"[\s\S]*id="generation-briefing-improve"[\s\S]*id="generation-briefing-improve-result"[\s\S]*<\/div>/
  );
  assert.match(indexHtml, /id="generation-briefing-improve-result"/);
  assert.match(indexHtml, /name="referenceTitle"/);
  assert.match(indexHtml, /参考标题/);
  assert.match(indexHtml, /name="tagReferences"/);
  assert.match(indexHtml, /name="tagReferences"/);
  assert.match(indexHtml, /标签提示词/);
  assert.match(indexHtml, /只当作提示词参考/);
  assert.match(indexHtml, /id="generation-draft-block"/);
  assert.match(indexHtml, /data-generation-mode-visible="draft_optimize"/);
  assert.match(appJs, /briefing: String\(form\.get\("briefing"\) \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /referenceTitle: String\(form\.get\("referenceTitle"\) \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /draft: \{/);
  assert.match(appJs, /title: String\(form\.get\("draftTitle"\) \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /body: String\(form\.get\("draftBody"\) \|\| ""\)\.trim\(\)/);
  assert.match(appJs, /function syncGenerationModeFields\s*\(/);
  assert.match(appJs, /async function improveGenerationBriefingFromCurrentInput\s*\(/);
  assert.match(appJs, /\/api\/generate-note-briefing/);
  assert.match(appJs, /generation-briefing-improve-result/);
  assert.match(appJs, /data-generation-mode-visible/);
  assert.match(appJs, /payload\.brief\?\.briefing/);
  assert.match(styles, /\.generation-briefing-improve-row\s*\{/);
  assert.match(styles, /\.generation-briefing-improve-row\s*\{[\s\S]*display:\s*flex;/);
  assert.match(styles, /\.generation-briefing-improve-row\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /\.generation-briefing-improve-row\s+\.helper-text\s*\{/);
});

test("frontend generation result now focuses on a single final draft card instead of three candidate comparisons", async () => {
  const { appJs, styles } = await readFrontendFiles();
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function buildLexiconEntry(", generationStart);
  const generationSource = appJs.slice(generationStart, generationEnd);

  assert.match(appJs, /const recommended = \(result\.scoredCandidates \|\| \[\]\)\.find/);
  assert.match(appJs, /const displayItem = recommended \|\| \(result\.scoredCandidates \|\| \[\]\)\[0\] \|\| null/);
  assert.match(appJs, /function\s+buildGenerationBlockerReasonsMarkup\s*\(/);
  assert.match(appJs, /function\s+buildGenerationRepairSummary\s*\(/);
  assert.match(appJs, /<span>当前卡点<\/span>/);
  assert.match(appJs, /const blockerReasonsMarkup = buildGenerationBlockerReasonsMarkup\(displayItem\);/);
  assert.match(appJs, /const repairSummary = buildGenerationRepairSummary\(repair\);/);
  assert.match(appJs, /<span class="model-scope-kicker">最终稿<\/span>/);
  assert.match(appJs, /function\s+generationVariantLabel\s*\(/);
  assert.match(appJs, /if \(variant === "final"\) return "最终稿";/);
  assert.match(appJs, /<span class="meta-pill">\$\{escapeHtml\(variantLabel\)\}<\/span>/);
  assert.doesNotMatch(appJs, /<span class="meta-pill">final<\/span>/);
  assert.doesNotMatch(appJs, /<div class="generation-candidate-grid">/);
  assert.match(generationSource, /data-action="copy-generation-publish"/);
  assert.match(generationSource, /封面图 Prompt/);
  assert.match(generationSource, /data-action="copy-generation-cover-image-prompt"/);
  assert.match(generationSource, /generation-publish-copy-hint/);
  assert.match(generationSource, /generation-cover-image-prompt-copy-hint/);
  assert.match(generationSource, /repairSummary\.title/);
  assert.match(generationSource, /repairSummary\.description/);
  assert.doesNotMatch(generationSource, /data-action="save-lifecycle-generation"/);
  assert.doesNotMatch(generationSource, /buildPlatformOutcomeActions\("generation"/);
  assert.match(generationSource, /class="[^"]*\bgeneration-body-reader\b[^"]*"/);
  assert.match(generationSource, /class="[^"]*\bgeneration-cover-image-prompt-reader\b[^"]*"/);
  assert.match(styles, /\.generation-blocker-box\s*\{/);
  assert.match(styles, /\.generation-blocker-box ul\s*\{/);
  assert.match(appJs, /if \(action === "copy-generation-cover-image-prompt"\)/);
  assert.match(styles, /\.generation-candidate-card\.is-recommended\s*\{[\s\S]*overflow:\s*visible;/);
  assert.match(styles, /\.generation-body-reader\s*\{[\s\S]*max-height:\s*none;[\s\S]*overflow:\s*visible;/);
  assert.match(styles, /\.generation-cover-image-prompt-reader\s*\{[\s\S]*max-height:\s*16rem;[\s\S]*overflow:\s*auto;/);
  assert.match(
    styles,
    /\.generation-body-reader\s*\{[\s\S]*white-space:\s*pre-wrap;[\s\S]*overflow-wrap:\s*anywhere;/
  );
});

test("frontend localizes generation and lifecycle fallback labels instead of exposing raw enums", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /if \(variant === "final"\) return "最终稿";/);
  assert.match(appJs, /if \(!normalized\) return "生成稿";/);
  assert.match(appJs, /if \(\s*normalized === "manual"\s*\) return "手动记录";/);
  assert.match(appJs, /"生成稿" : normalized;/);
  assert.match(appJs, /"手动记录" : normalized;/);
  assert.match(appJs, /const generatedName = finalDraft\?\.title \|\| generationVariantLabel\(finalDraft\?\.variant\) \|\| "未命名";/);
  assert.match(appJs, /payload\.name = `\$\{isRecommended \? "最终推荐稿" : "生成候选稿"\} \/ \$\{generatedName\}`;/);
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

test("sample library calibration modal renders visible evidence with matched samples and explanation", async () => {
  const { appJs, styles, sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  assert.match(appJs, /from "\.\/sample-library-calibration-view\.js"/);
  const uniqueStringsSource = appJs.match(/function\s+uniqueStrings\s*\([\s\S]*?\n}\n/)?.[0] || "";
  const parseHelperSource =
    sampleLibraryCalibrationViewJs.match(/export function\s+parseSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0].replace(
      "export function",
      "function"
    ) || "";
  const retroChipGroupHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+buildSampleLibraryRetroChipGroupMarkup\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const signalCategoriesSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryCalibrationSignalCategories\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const suggestionHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryRetroSignalSuggestions\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const evidenceHelperSource = extractSourceBetween(
    sampleLibraryCalibrationViewJs,
    "export function buildSampleLibraryCalibrationEvidenceMarkup(",
    "export function deriveSampleLibraryRetroSignalSuggestions("
  ).replace("export function buildSampleLibraryCalibrationEvidenceMarkup", "function buildSampleLibraryCalibrationEvidenceMarkup");
  const normalizedCalibrationSectionsSource = sampleLibraryCalibrationViewJs
    .slice(sampleLibraryCalibrationViewJs.indexOf("export function buildSampleLibraryCalibrationEditorSectionsMarkup("))
    .replace("export function buildSampleLibraryCalibrationEditorSectionsMarkup", "function buildSampleLibraryCalibrationEditorSectionsMarkup");
  const helpers = new Function(
    "buildSampleLibraryModalSectionMarkup",
    "escapeHtml",
    "getSampleLibraryCalibrationPredictionPrefillSourceSummary",
    "getSampleLibraryRetroTimingHintClassName",
    "joinCSV",
    "uniqueStrings",
    "sampleLibraryRetroChipPresets",
    "buildSampleLibraryCalibrationEvidenceState",
    `${parseHelperSource}
${retroChipGroupHelperSource}
${uniqueStringsSource}
${signalCategoriesSource}
${suggestionHelperSource}
${evidenceHelperSource}
${normalizedCalibrationSectionsSource}
return {
  buildSampleLibraryCalibrationEvidenceMarkup,
  buildSampleLibraryCalibrationEditorSectionsMarkup
};`
  )(
    ({ body = "" } = {}) => body,
    (value) => String(value || ""),
    () => "当前预填来源：当前检测结果。",
    () => "helper-text",
    (items = []) => (Array.isArray(items) ? items.join(", ") : ""),
    (items = []) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))],
    {
      missReason: ["标题偏弱"],
      validatedSignals: ["标题结构"],
      invalidatedSignals: ["标题判断失准"],
      ruleImprovementCandidate: ["同类标题结构可提权"]
    },
    buildSampleLibraryCalibrationEvidenceState
  );

  const evidenceMarkup = helpers.buildSampleLibraryCalibrationEvidenceMarkup(
    {
      confidence: 84,
      evidenceSamples: [{ id: "record-1", title: "历史样本 1" }],
      evidenceSignals: ["标题短语命中", "标签重合"],
      evidenceSummary: "这条记录与 1 条历史样本的结构高度相似。"
    },
    {
      buildSampleLibraryCalibrationEvidenceState,
      escapeHtml: (value) => String(value || "")
    }
  );
  const modalMarkup = helpers.buildSampleLibraryCalibrationEditorSectionsMarkup(
    {
      prediction: {
        confidence: 84,
        evidenceSamples: [{ id: "record-1", title: "历史样本 1" }],
        evidenceSignals: ["标题短语命中", "标签重合"],
        evidenceSummary: "这条记录与 1 条历史样本的结构高度相似。"
      },
      retro: {}
    },
    {
      buildSampleLibraryModalSectionMarkup: ({ body = "" } = {}) => body,
      buildSampleLibraryCalibrationEvidenceMarkup: (prediction) =>
        helpers.buildSampleLibraryCalibrationEvidenceMarkup(prediction, {
          buildSampleLibraryCalibrationEvidenceState,
          escapeHtml: (value) => String(value || "")
        }),
      buildSampleLibraryRetroChipGroupMarkup: () => "",
      escapeHtml: (value) => String(value || ""),
      getSampleLibraryCalibrationPredictionPrefillSourceSummary: () => "当前预填来源：当前检测结果。",
      getSampleLibraryRetroTimingHintClassName: () => "helper-text",
      joinCSV: (items = []) => (Array.isArray(items) ? items.join(", ") : ""),
      parseSampleLibraryRetroChipField: () => ({ selected: [], supplement: "" }),
      sampleLibraryRetroChipPresets: {
        missReason: ["标题偏弱"],
        validatedSignals: ["标题结构"],
        invalidatedSignals: ["标题判断失准"],
        ruleImprovementCandidate: ["同类标题结构可提权"]
      }
    }
  );

  assert.match(evidenceMarkup, /sample-library-calibration-evidence/);
  assert.match(evidenceMarkup, /历史样本 1/);
  assert.match(evidenceMarkup, /标题短语命中/);
  assert.match(evidenceMarkup, /结构高度相似/);
  assert.match(evidenceMarkup, /置信度 84/);
  assert.match(evidenceMarkup, /可回看信号/);
  assert.match(evidenceMarkup, /标题结构|开头切口|合集匹配|标签匹配/);
  assert.doesNotMatch(evidenceMarkup, /一键合规改写/);
  assert.match(modalMarkup, /sample-library-calibration-evidence/);
  assert.match(modalMarkup, /历史样本 1/);
  assert.match(modalMarkup, /结构高度相似/);
  assert.match(styles, /\.sample-library-calibration-evidence\b/);
});

test("frontend derives reviewable fallback signal chips from basic rule evidence when no higher-order historical signals exist", async () => {
  const { sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  const signalCategoriesSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryCalibrationSignalCategories\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";

  const { deriveSampleLibraryCalibrationSignalCategories } = new Function(
    `${signalCategoriesSource}; return { deriveSampleLibraryCalibrationSignalCategories };`
  )();

  const categories = deriveSampleLibraryCalibrationSignalCategories({
    evidenceSignals: ["检测结论：观察通过", "规则分：80"]
  });

  assert.deepEqual(categories, ["规则检测", "分数参考"]);
});

test("manual-review prediction evidence surfaces a compliance rewrite action", async () => {
  const { appJs, sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  const evidenceHelperSource = extractSourceBetween(
    sampleLibraryCalibrationViewJs,
    "export function buildSampleLibraryCalibrationEvidenceMarkup(",
    "export function deriveSampleLibraryRetroSignalSuggestions("
  ).replace("export function buildSampleLibraryCalibrationEvidenceMarkup", "function buildSampleLibraryCalibrationEvidenceMarkup");
  const signalCategoriesSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryCalibrationSignalCategories\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const helpers = new Function(
    "buildSampleLibraryCalibrationEvidenceState",
    "escapeHtml",
    `${signalCategoriesSource}
${evidenceHelperSource}
return { buildSampleLibraryCalibrationEvidenceMarkup };`
  )(
    (prediction = {}) => ({
      samples: prediction.evidenceSamples || [],
      signals: prediction.evidenceSignals || [],
      summary: prediction.evidenceSummary || "",
      confidence: prediction.confidence || 0,
      confidenceNote: "当前置信度 80 / 100"
    }),
    (value) => String(value || "")
  );

  const markup = helpers.buildSampleLibraryCalibrationEvidenceMarkup(
    {
      predictedStatus: "limited",
      confidence: 80,
      evidenceSamples: [{ id: "record-1", title: "历史样本 1" }],
      evidenceSignals: ["检测结论：人工复核", "标题短语命中"],
      evidenceSummary: "证据摘要：检测结论：人工复核；标题短语命中。"
    },
    {
      buildSampleLibraryCalibrationEvidenceState: (prediction = {}) => ({
        samples: prediction.evidenceSamples || [],
        signals: prediction.evidenceSignals || [],
        summary: prediction.evidenceSummary || "",
        confidence: prediction.confidence || 0,
        confidenceNote: "当前置信度 80 / 100"
      }),
      escapeHtml: (value) => String(value || "")
    }
  );

  assert.match(markup, /一键合规改写/);
});

test("prediction evidence rewrite action reuses the main rewrite flow for manual-review records", async () => {
  const { appJs, sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  assert.match(sampleLibraryCalibrationViewJs, /data-action="rewrite-sample-library-calibration-record"/);
  assert.match(appJs, /async function runRewriteFromPayload\(/);
  assert.match(appJs, /await runRewriteFromPayload\(getAnalyzePayload\(\),/);
  assert.match(appJs, /await runRewriteFromPayload\(payload,\s*\{/);
  assert.match(appJs, /apiJson\("\/api\/rewrite"/);
  assert.match(appJs, /openResultPanel\("rewrite-result-panel"\)/);
  assert.match(appJs, /renderRewriteResult\(/);
  assert.match(appJs, /normalizeRewritePayload\(result\.rewrite\)/);
  assert.match(appJs, /buildAnalyzePayloadFromSampleLibraryRecord\(/);
});

test("style profile modal surfaces retro feedback hints and reference sorting context", async () => {
  const styleProfileViewJs = await fs.readFile(path.join(process.cwd(), "web/style-profile-view.js"), "utf8");
  const modalSource = extractSourceBetween(
    styleProfileViewJs,
    "export function buildStyleProfileModalMarkup(profileState = null, helpers = {}) {",
    "export function readStyleProfileModalPayload(contentNode, helpers = {}) {"
  ).replace("export function buildStyleProfileModalMarkup", "function buildStyleProfileModalMarkup");
  const buildStyleProfileModalMarkup = new Function(
    "helpers",
    `${modalSource}
return buildStyleProfileModalMarkup;`
  );
  const helpers = {
    buildSampleLibraryModalSectionMarkup: ({ title = "", description = "", body = "" } = {}) =>
      `<section><h2>${title}</h2><p>${description}</p>${body}</section>`,
    escapeHtml: (value) => String(value || ""),
    joinCSV: (items) => (Array.isArray(items) ? items.join(", ") : ""),
    joinLineList: (items) => (Array.isArray(items) ? items.join("\n") : ""),
    formatDate: (value) => String(value || ""),
    buildStyleProfileGenerationLabel: () => "本地规则"
  };

  const markup = buildStyleProfileModalMarkup(helpers)({
    current: {
      topic: "身体探索",
      name: "身体探索画像",
      updatedAt: "2026-05-21T00:00:00.000Z",
      sourceSampleIds: ["reference-a"],
      sourceSamples: [
        {
          id: "reference-a",
          title: "被验证过的参考样本",
          collectionType: "身体探索"
        }
      ],
      generationMeta: {
        generatedAt: "2026-05-21T00:00:00.000Z",
        retroHintsSummary: "styleHints: 已验证：标题结构；ruleCandidates: 同类标题结构可提权"
      }
    }
  }, helpers);

  assert.match(markup, /反哺线索/);
  assert.match(markup, /已验证：标题结构/);
  assert.match(markup, /同类标题结构可提权/);
  assert.match(markup, /来源样本按权重优先排序/);
});

test("calibration retro section ties review chips to the current prediction context", async () => {
  const { appJs, sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  const uniqueStringsSource = appJs.match(/function\s+uniqueStrings\s*\([\s\S]*?\n}\n/)?.[0] || "";
  const signalCategoriesSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryCalibrationSignalCategories\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const suggestionHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+deriveSampleLibraryRetroSignalSuggestions\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const sectionSource =
    sampleLibraryCalibrationViewJs
      .slice(sampleLibraryCalibrationViewJs.indexOf("export function buildSampleLibraryCalibrationEditorSectionsMarkup("))
      .replace("export function buildSampleLibraryCalibrationEditorSectionsMarkup", "function buildSampleLibraryCalibrationEditorSectionsMarkup");
  const helpers = new Function(
    "buildSampleLibraryModalSectionMarkup",
    "buildSampleLibraryRetroChipGroupMarkup",
    "buildSampleLibraryCalibrationEvidenceMarkup",
    "parseSampleLibraryRetroChipField",
    "sampleLibraryRetroChipPresets",
    "joinCSV",
    "escapeHtml",
    "getSampleLibraryCalibrationPredictionPrefillSourceSummary",
    "getSampleLibraryRetroTimingHintClassName",
    "predictionMatchedLabel",
    "buildSampleLibraryCalibrationEvidenceState",
    "uniqueStrings",
    "deriveSampleLibraryCalibrationSignalCategories",
    `${uniqueStringsSource}
${signalCategoriesSource}
${suggestionHelperSource}
${sectionSource}
return { buildSampleLibraryCalibrationEditorSectionsMarkup };`
  )(
    ({ title = "", description = "", body = "" } = {}) => `<section><h2>${title}</h2><p>${description}</p>${body}</section>`,
    () => "",
    () => "",
    () => ({ selected: [], supplement: "" }),
    {
      missReason: ["标题偏弱"],
      validatedSignals: ["标题结构"],
      invalidatedSignals: ["标签判断失准"],
      ruleImprovementCandidate: ["同类标题结构可提权"]
    },
    (items) => (Array.isArray(items) ? items.join(", ") : ""),
    (value) => String(value || ""),
    () => "当前预判将影响复盘输入。",
    () => ({ text: "建议至少等到 T+7 再做发布后复盘。", state: "pending" }),
    () => "预判未命中",
    () => ({ samples: [], signals: [], summary: "", confidenceNote: "" }),
    (items) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))]
  );

  const markup = helpers.buildSampleLibraryCalibrationEditorSectionsMarkup(
    {
      prediction: {
        predictedStatus: "limited",
        predictedRiskLevel: "medium",
        predictedPerformanceTier: "low",
        confidence: 72
      },
      retro: {
        actualPerformanceTier: "high",
        predictionMatched: false,
        missReason: "",
        validatedSignals: [],
        invalidatedSignals: [],
        ruleImprovementCandidate: ""
      },
      comparisonStatusLabel: "预判未命中",
      missReasonSuggestion: "发布后复盘会围绕当前预判的偏差来补充。",
      referenceAction: {},
      retroTimingHint: { text: "建议至少等到 T+7 再做发布后复盘。", state: "pending" }
    },
    {
      buildSampleLibraryModalSectionMarkup: ({ title = "", description = "", body = "" } = {}) =>
        `<section><h2>${title}</h2><p>${description}</p>${body}</section>`,
      buildSampleLibraryRetroChipGroupMarkup: () => "",
      buildSampleLibraryCalibrationEvidenceMarkup: () => "",
      parseSampleLibraryRetroChipField: () => ({ selected: [], supplement: "" }),
      sampleLibraryRetroChipPresets: {
        missReason: ["标题偏弱"],
        validatedSignals: ["标题结构"],
        invalidatedSignals: ["标签判断失准"],
        ruleImprovementCandidate: ["同类标题结构可提权"]
      },
      joinCSV: (items) => (Array.isArray(items) ? items.join(", ") : ""),
      escapeHtml: (value) => String(value || ""),
      getSampleLibraryCalibrationPredictionPrefillSourceSummary: () => "当前预判将影响复盘输入。",
      getSampleLibraryRetroTimingHintClassName: () => "helper-text"
    }
  );

  assert.match(markup, /当前预判/);
  assert.match(markup, /限流/);
  assert.match(markup, /低表现/);
  assert.match(markup, /中风险/);
  assert.match(markup, /发布后复盘会围绕当前预判的偏差来补充/);
  assert.match(markup, /建议优先关注/);
  assert.match(markup, /被推翻信号/);
});

test("retro chip helpers split existing text into selected chips and supplement text", async () => {
  const { sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  const parseHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+parseSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const serializeHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+serializeSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";

  const helpers = new Function(
    `${parseHelperSource}
${serializeHelperSource}
return { parseSampleLibraryRetroChipField, serializeSampleLibraryRetroChipField };`
  )();

  const parsed = helpers.parseSampleLibraryRetroChipField(
    "标题偏弱、合集不匹配、标签不准\n\n补充：封面与正文承接太弱。",
    ["标题偏弱", "合集不匹配", "标签不准", "风险判断偏差"]
  );

  assert.deepEqual(parsed.selected, ["标题偏弱", "合集不匹配", "标签不准"]);
  assert.match(parsed.supplement, /封面与正文承接太弱/);
  assert.equal(
    helpers.serializeSampleLibraryRetroChipField(parsed.selected, parsed.supplement),
    "标题偏弱、合集不匹配、标签不准\n\n补充：封面与正文承接太弱。"
  );
});

test("calibration modal renders retro multi-select chip groups", async () => {
  const { appJs, styles, sampleLibraryCalibrationViewJs } = await readFrontendFiles();

  assert.match(appJs, /sampleLibraryRetroChipPresets/);
  assert.match(sampleLibraryCalibrationViewJs, /偏差原因/);
  assert.match(sampleLibraryCalibrationViewJs, /被验证信号/);
  assert.match(sampleLibraryCalibrationViewJs, /被推翻信号/);
  assert.match(sampleLibraryCalibrationViewJs, /规则优化候选/);
  assert.match(sampleLibraryCalibrationViewJs, /sample-library-retro-chip-group/);
  assert.match(sampleLibraryCalibrationViewJs, /sample-library-retro-chip/);
  assert.match(sampleLibraryCalibrationViewJs, /sample-library-retro-supplement/);
  assert.match(styles, /\.sample-library-retro-chip-group/);
  assert.match(styles, /\.sample-library-retro-chip/);
  assert.match(styles, /\.sample-library-retro-chip\.is-selected/);
  assert.match(styles, /\.sample-library-retro-supplement/);
});

test("retro chip selections serialize back into the existing text fields", async () => {
  const { appJs, sampleLibraryCalibrationViewJs, sampleLibraryFormHelpersJs } = await readFrontendFiles();
  const splitCsvSource = appJs.match(/function\s+splitCSV\s*\([\s\S]*?\n}\n/)?.[0] || "";
  const uniqueStringsSource = appJs.match(/function\s+uniqueStrings\s*\([\s\S]*?\n}\n/)?.[0] || "";
  const serializeHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+serializeSampleLibraryRetroChipField\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const readRetroListSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+readSampleLibraryRetroChipListValue\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const readRetroFieldSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+readSampleLibraryRetroChipFieldValue\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const readPayloadSource =
    sampleLibraryFormHelpersJs
      .match(/export function\s+readSampleLibraryModalCalibrationPayload\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";

  const fakeContentNode = {
    querySelector(selector) {
      const fieldMap = {
        '[name="predictedStatus"]': { value: "positive_performance" },
        '[name="predictedRiskLevel"]': { value: "low" },
        '[name="predictedPerformanceTier"]': { value: "high" },
        '[name="predictionConfidence"]': { value: "88" },
        '[name="predictionReason"]': { value: "existing reason" },
        '[name="predictionModel"]': { value: "gpt-5.4" },
        '[name="predictionCreatedAt"]': { value: "2026-05-21" },
        '[name="actualPerformanceTier"]': { value: "medium" },
        '[name="predictionMatched"]': { checked: true },
        '[name="missReason"]': { value: "旧值" },
        '[name="missReasonSupplement"]': { value: "补充：封面与正文承接太弱。" },
        '[name="validatedSignals"]': { value: "旧值" },
        '[name="validatedSignalsSupplement"]': { value: "补充：评论区承接稳定" },
        '[name="invalidatedSignals"]': { value: "旧值" },
        '[name="invalidatedSignalsSupplement"]': { value: "补充：浏览预估偏高" },
        '[name="shouldBecomeReference"]': { checked: false },
        '[name="ruleImprovementCandidate"]': { value: "旧值" },
        '[name="ruleImprovementCandidateSupplement"]': { value: "补充：增加封面衔接判断。" },
        '[name="retroNotes"]': { value: "72 小时后复盘" },
        '[name="reviewedAt"]': { value: "2026-05-21" }
      };

      return fieldMap[selector] || null;
    },
    querySelectorAll(selector) {
      const selectedMap = {
        '[name="missReason"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected': [
          { textContent: "标题偏弱" },
          { textContent: "合集不匹配" }
        ],
        '[name="validatedSignals"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected': [
          { textContent: "标题结构" },
          { textContent: "风格稳定" }
        ],
        '[name="invalidatedSignals"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected': [
          { textContent: "标题判断失准" }
        ],
        '[name="ruleImprovementCandidate"] ~ .sample-library-retro-chip-list .sample-library-retro-chip.is-selected': [
          { textContent: "同类标题结构可提权" }
        ]
      };

      return selectedMap[selector] || [];
    }
  };

  const helpersFactory = new Function(
    `${splitCsvSource}
${uniqueStringsSource}
${serializeHelperSource}
${readRetroListSource}
${readRetroFieldSource}
${readPayloadSource}
return {
  readSampleLibraryModalCalibrationPayload,
  readSampleLibraryRetroChipFieldValue,
  readSampleLibraryRetroChipListValue,
  splitCSV,
  uniqueStrings
};`
  );
  const helpers = helpersFactory();
  const payload = helpers.readSampleLibraryModalCalibrationPayload(fakeContentNode, {
    readSampleLibraryRetroChipFieldValue: helpers.readSampleLibraryRetroChipFieldValue,
    readSampleLibraryRetroChipListValue: helpers.readSampleLibraryRetroChipListValue,
    splitCSV: helpers.splitCSV,
    uniqueStrings: helpers.uniqueStrings
  });

  assert.equal(payload.retro.missReason, "标题偏弱、合集不匹配\n\n补充：封面与正文承接太弱。");
  assert.deepEqual(payload.retro.validatedSignals, ["标题结构", "风格稳定", "补充：评论区承接稳定"]);
  assert.deepEqual(payload.retro.invalidatedSignals, ["标题判断失准", "补充：浏览预估偏高"]);
  assert.equal(payload.retro.ruleImprovementCandidate, "同类标题结构可提权\n\n补充：增加封面衔接判断。");
});

test("retro chips toggle selected state when clicked in the calibration editor", async () => {
  const { appJs, sampleLibraryCalibrationViewJs } = await readFrontendFiles();
  const toggleHelperSource =
    sampleLibraryCalibrationViewJs
      .match(/export function\s+toggleSampleLibraryRetroChipSelection\s*\([\s\S]*?\n}\n/)?.[0]
      .replace("export function", "function") || "";
  const classList = {
    values: new Set(),
    toggle(name) {
      if (this.values.has(name)) {
        this.values.delete(name);
        return false;
      }

      this.values.add(name);
      return true;
    },
    contains(name) {
      return this.values.has(name);
    }
  };
  const chip = {
    classList
  };
  const helpers = new Function(`${toggleHelperSource}
return { toggleSampleLibraryRetroChipSelection };`)();

  helpers.toggleSampleLibraryRetroChipSelection(chip);
  assert.equal(classList.contains("is-selected"), true);

  helpers.toggleSampleLibraryRetroChipSelection(chip);
  assert.equal(classList.contains("is-selected"), false);
  assert.match(appJs, /event\.target\.closest\("\.sample-library-retro-chip"\)/);
  assert.match(appJs, /toggleSampleLibraryRetroChipSelection\(retroChip\)/);
});

test("frontend exposes an inner-space terminology workspace for rewrite and generation guidance", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /data-lexicon-workspace-tab="inner-space"/);
  assert.match(indexHtml, /id="lexicon-workspace-modal"/);
  assert.match(indexHtml, /内太空术语表/);
  assert.match(appJs, /function buildInnerSpaceWorkspaceFormMarkup\s*\(/);
  assert.match(appJs, /适用合集/);
  assert.match(appJs, /\/api\/admin\/inner-space-terms/);
  assert.match(appJs, /const raw = await response\.text\(\);/);
  assert.match(appJs, /payload = JSON\.parse\(raw\);/);
  assert.match(appJs, /async function refreshInnerSpaceTermsState\s*\(/);
  assert.match(appJs, /const innerSpaceTermsPayload = await apiJson\(innerSpaceTermsApi\)/);
  assert.match(appJs, /catch \(error\) \{[\s\S]*const adminData = await apiJson\("\/api\/admin\/data"\)/);
  assert.match(appJs, /if \(normalizedTab === "inner-space"\) \{[\s\S]*await refreshInnerSpaceTermsState\(\);/);
  assert.match(appJs, /if \(normalizedTab === "inner-space"\) \{[\s\S]*renderLexiconWorkspaceModal\(\);/);
  assert.match(appJs, /from "\.\/admin-panels-view\.js"/);
  assert.match(appJs, /function\s+setAdminDataLoadingState\s*\(/);
  assert.match(appJs, /function\s+syncAdminDataLoadingUI\s*\(/);
  assert.match(appJs, /function\s+renderAdminDataLoadingPlaceholders\s*\(/);
  assert.match(appJs, /const phase = hasExistingAdminData \? "refresh" : "initial";/);
  assert.match(appJs, /setAdminDataLoadingState\(phase\)/);
  assert.match(appJs, /if \(phase === "initial"\) \{\s*renderAdminDataLoadingPlaceholders\(\);/);
  assert.match(appJs, /setAdminDataLoadingState\("idle"\)/);
  assert.match(appJs, /renderAdminDataLoadingPlaceholders\(\)/);
  assert.match(appJs, /data-loading="\$\{escapeHtml\(String\(isRefreshing\)\)\}"/);
  assert.match(appJs, /加载中\.\.\./);
  assert.match(appJs, /data-lexicon-workspace-form="inner-space"/);
  assert.match(appJs, /lexicon-workspace-result/);
  assert.match(appJs, /delete-inner-space-term/);
});

test("frontend exposes platform outcome shortcuts from analysis and rewrite results", async () => {
  const { appJs, analysisReviewViewJs } = await readFrontendFiles();
  const analysisStart = analysisReviewViewJs.indexOf("function renderAnalysis(");
  const rewriteStart = analysisReviewViewJs.indexOf("function renderRewriteResult(", analysisStart);
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function buildLexiconEntry(", generationStart);
  const analysisSource = analysisReviewViewJs.slice(analysisStart, rewriteStart);
  const rewriteSource = analysisReviewViewJs.slice(rewriteStart, analysisReviewViewJs.indexOf("function buildCrossReviewMarkup(", rewriteStart));

  assert.match(appJs, /function\s+buildPlatformOutcomeActions\s*\(/);
  assert.match(appJs, /function\s+buildPlatformOutcomeModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openPlatformOutcomeModal\s*\(/);
  assert.match(appJs, /function\s+savePlatformOutcomeModal\s*\(/);
  assert.match(appJs, /function\s+savePlatformOutcomeFromCurrent\s*\(/);
  assert.match(analysisSource, /buildPlatformOutcomeActions\("analysis"\)/);
  assert.match(rewriteSource, /buildPlatformOutcomeActions\("rewrite"\)/);
  assert.doesNotMatch(appJs, /buildPlatformOutcomeActions\("generation"/);
  assert.match(analysisReviewViewJs, /data-action="save-platform-outcome"/);
  assert.match(analysisReviewViewJs, /平台通过/);
  assert.match(analysisReviewViewJs, /平台违规/);
  assert.match(analysisReviewViewJs, /效果好/);
  assert.match(analysisReviewViewJs, /效果一般/);
  assert.match(analysisReviewViewJs, /系统误判/);
  assert.match(analysisReviewViewJs, /name="platformOutcomeViews"/);
  assert.match(analysisReviewViewJs, /name="platformOutcomeShares"/);
  assert.match(analysisReviewViewJs, /name="platformOutcomeNotes"/);
  assert.match(appJs, /publishStatus:\s*button\.dataset\.publishStatus/);
  assert.match(appJs, /openPlatformOutcomeModal\(\{/);
  assert.match(appJs, /views:\s*payload\.views \|\| 0/);
  assert.match(appJs, /shares:\s*payload\.shares \|\| 0/);
  assert.match(appJs, /await savePlatformOutcomeFromCurrent/);
});

test("frontend explains how saved platform outcomes feed future detection and generation", async () => {
  const { appJs, analysisReviewViewJs } = await readFrontendFiles();

  assert.match(analysisReviewViewJs, /已作为生成风格参考/);
  assert.match(analysisReviewViewJs, /已进入误判降权候选/);
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
  const { indexHtml, appJs, sampleLibrarySectionsViewJs } = await readFrontendFiles();

  assert.doesNotMatch(indexHtml, /legacy-lexicon-workspace/);
  assert.doesNotMatch(indexHtml, /id="custom-lexicon-form"/);
  assert.doesNotMatch(indexHtml, /id="seed-lexicon-form"/);
  assert.doesNotMatch(indexHtml, /id="inner-space-terms-form"/);

  assert.match(appJs, /function\s+getSampleLibraryPrefillAnalysisRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryPrefillRewriteRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryPrefillActions\s*\(/);
  assert.match(sampleLibrarySectionsViewJs, /data-action="prefill-sample-library-create-analysis"/);
  assert.match(sampleLibrarySectionsViewJs, /data-action="prefill-sample-library-create-rewrite"/);
  assert.match(appJs, /async function\s+submitLexiconWorkspaceLexiconForm\s*\(/);
  assert.match(appJs, /async function\s+submitLexiconWorkspaceInnerSpaceForm\s*\(/);
  assert.match(appJs, /function buildLexiconWorkspaceLexiconFormMarkup\s*\(/);
  assert.match(appJs, /data-lexicon-workspace-form="inner-space"/);

  assert.match(appJs, /setActionGateHint\("sample-library-prefill-action-hint",\s*analysisMessage \|\| rewriteMessage\)/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("submit"/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("input"/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("change"/);
});

test("frontend exposes temporary generation reference asset uploads and payload wiring", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /<details[^>]*class="[^"]*\badmin-accordion\b[^"]*\bgeneration-reference-assets\b[^"]*"/);
  assert.match(indexHtml, /<details[^>]*class="[^"]*\badmin-accordion\b[^"]*\bgeneration-reference-assets\b[^"]*"[^>]*>/);
  assert.match(indexHtml, /<summary>临时参考素材<\/summary>/);
  assert.match(indexHtml, /id="generation-reference-image-input"/);
  assert.match(indexHtml, /id="generation-reference-image-input"[\s\S]*accept="image\/\*"/);
  assert.match(indexHtml, /id="generation-reference-text-input"/);
  assert.match(indexHtml, /id="generation-reference-text-input"[\s\S]*accept="\.txt,\.md,\.markdown,text\/plain,text\/markdown"/);
  assert.match(indexHtml, /id="generation-reference-assets-preview"/);
  assert.match(indexHtml, /name="materialText"/);
  assert.match(indexHtml, /素材文本/);
  assert.match(indexHtml, /id="generation-reference-search-button"/);
  assert.match(indexHtml, /AI搜索参考资料/);
  assert.match(indexHtml, /id="generation-reference-search-result"/);
  assert.match(indexHtml, /id="generation-reference-search-modal"/);
  assert.match(indexHtml, /id="generation-reference-search-modal-content"/);
  assert.match(indexHtml, /data-action="close-generation-reference-search-modal"/);

  assert.match(appJs, /generationReferenceAssets:\s*\{\s*images:\s*\[\],\s*textFiles:\s*\[\],\s*message:\s*""\s*\}/);
  assert.match(appJs, /generationReferenceSearch:\s*\{\s*open:\s*false,\s*loading:\s*false,\s*message:\s*"",\s*items:\s*\[\],\s*selectedIndices:\s*\[\]\s*\}/);
  assert.match(appJs, /generationReferenceAssetsPending:\s*Promise\.resolve\(\)/);
  assert.match(appJs, /generationReferenceAssetsLocked:\s*false/);
  assert.match(appJs, /const GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES = 4 \* 1024 \* 1024/);
  assert.match(appJs, /const GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES = 512 \* 1024/);
  assert.match(appJs, /const GENERATION_REFERENCE_TOTAL_MAX_BYTES = 12 \* 1024 \* 1024/);
  assert.match(appJs, /async function readGenerationReferenceImageFiles\s*\(/);
  assert.match(appJs, /async function readGenerationReferenceTextFiles\s*\(/);
  assert.match(appJs, /Promise\.allSettled\(/);
  assert.match(appJs, /async function awaitGenerationReferenceAssetsReady\s*\(/);
  assert.match(appJs, /function serializeGenerationReferenceAssets\s*\(/);
  assert.match(appJs, /async function captureGenerationReferenceAssetsForRequest\s*\(/);
  assert.match(appJs, /function releaseGenerationReferenceAssetsRequestLock\s*\(/);
  assert.match(appJs, /function getGenerationReferenceAssetsTotalBytes\s*\(/);
  assert.match(appJs, /function resetGenerationReferenceAssets\s*\(/);
  assert.match(appJs, /function renderGenerationReferenceAssets\s*\(/);
  assert.match(appJs, /async function openGenerationReferenceSearchModal\s*\(/);
  assert.match(appJs, /function renderGenerationReferenceSearchModal\s*\(/);
  assert.match(appJs, /function appendGenerationMaterialText\s*\(/);
  assert.match(appJs, /function appendMultipleGenerationMaterialTexts\s*\(/);
  assert.match(appJs, /function getGenerationReferenceSearchRequirementMessage\s*\(/);
  assert.match(appJs, /function syncGenerationReferenceSearchAction\s*\(/);
  assert.match(appJs, /const selectedFiles = Array\.from\(input\?\.files \|\| \[\]\)/);
  assert.match(appJs, /if \(input\) \{\s*input\.value = "";\s*\}\s*\n\s*if \(appState\.generationReferenceAssetsLocked\)/);
  assert.match(appJs, /const operation = \(\) => \{[\s\S]*collectAcceptedGenerationReferenceFiles\([\s\S]*readGenerationReferenceImageFiles/);
  assert.match(appJs, /const operation = \(\) => \{[\s\S]*collectAcceptedGenerationReferenceFiles\([\s\S]*readGenerationReferenceTextFiles/);
  assert.match(appJs, /appState\.generationReferenceAssetsPending = appState\.generationReferenceAssetsPending\.catch\(\(\) => \{\}\)\.then\(operation\)/);
  assert.match(appJs, /input\.value = ""/);
  assert.doesNotMatch(appJs, /const referenceAssets = await captureGenerationReferenceAssetsForRequest\(\);[\s\S]*const payload = getGenerationPayload\(\{ referenceAssets \}\);[\s\S]*\/api\/generate-note-briefing/);
  assert.match(appJs, /const payload = getGenerationPayload\(\{\s*includeReferenceAssets:\s*false\s*\}\);[\s\S]*\/api\/generate-note-briefing/);
  assert.match(appJs, /\/api\/generate-reference-materials/);
  assert.match(appJs, /data-action="toggle-generation-reference-material"/);
  assert.match(appJs, /data-action="apply-generation-reference-materials"/);
  assert.match(appJs, /setGatedButtonState\(searchButton,\s*!requirementMessage,\s*requirementMessage\)/);
  assert.match(appJs, /const referenceAssets = await captureGenerationReferenceAssetsForRequest\(\);[\s\S]*const payload = getGenerationPayload\(\{ referenceAssets \}\);[\s\S]*\/api\/generate-note[\s\S]*resetGenerationReferenceAssets\(\)[\s\S]*releaseGenerationReferenceAssetsRequestLock\(\)/);
  assert.match(
    appJs,
    /if \(includeReferenceAssets\) \{[\s\S]*payload\.referenceAssets = \{[\s\S]*\.\.\.\(referenceAssets \|\| serializeGenerationReferenceAssets\(\)\)[\s\S]*materialText:\s*String\(form\.get\("materialText"\) \|\| ""\)\.trim\(\)/
  );

  assert.match(styles, /\.generation-reference-assets\b/);
  assert.match(styles, /\.generation-reference-files\b/);
  assert.match(styles, /\.generation-reference-chip-list\b/);
  assert.match(styles, /\.generation-reference-chip\b/);
  assert.match(styles, /\.generation-material-text-block\b/);
  assert.match(styles, /\.generation-reference-search-modal\b/);
  assert.match(styles, /\.generation-reference-search-modal\s+\.modal-card\b/);
  assert.match(styles, /\.generation-reference-result-card\b/);
  assert.match(styles, /\.generation-reference-selection\b/);
  assert.match(styles, /\.generation-reference-selection-indicator\b/);
  assert.match(styles, /\.generation-reference-selection\s*\{[\s\S]*position:\s*relative/);
  assert.match(styles, /\.generation-reference-selection input\s*\{[\s\S]*inset:\s*0/);
});

test("generation reference search button is gated until briefing has content", async () => {
  const { appJs } = await readFrontendFiles();
  const payloadSource = extractSourceBetween(appJs, "function getGenerationPayload(", "async function handleGenerationReferenceImageSelection(");
  const gateSource = extractSourceBetween(appJs, "function getGenerationReferenceSearchRequirementMessage()", "function syncSampleLibraryCreateActions()");

  const formNode = {
    values: {
      mode: "from_scratch",
      collectionType: "科普",
      lengthMode: "short",
      briefing: "",
      materialText: "",
      referenceTitle: "",
      tagReferences: "",
      draftTitle: "",
      draftBody: ""
    },
    querySelector(selector) {
      if (selector === '[name="mode"]') {
        return { value: this.values.mode };
      }
      return null;
    }
  };
  const searchButton = { disabled: false, dataset: {}, title: "" };
  const hints = [];

  const helpers = new Function(
    "byId",
    "FormData",
    "getSelectedModelSelections",
    "serializeGenerationReferenceAssets",
    "setGatedButtonState",
    "setActionGateHint",
    `${payloadSource}\n${gateSource}; return { getGenerationReferenceSearchRequirementMessage, syncGenerationReferenceSearchAction, getGenerationPayload };`
  )(
    (id) => {
      if (id === "generation-workbench-form") {
        return formNode;
      }
      if (id === "generation-reference-search-button") {
        return searchButton;
      }
      return null;
    },
    class TestFormData {
      constructor(form) {
        this.form = form;
      }
      get(name) {
        return this.form.values[name];
      }
    },
    () => ({ generation: "auto" }),
    () => ({ images: [], textFiles: [] }),
    (button, enabled, hint = "") => {
      button.disabled = !enabled;
      button.title = hint;
    },
    (id, message) => {
      hints.push({ id, message });
    }
  );

  assert.equal(helpers.getGenerationReferenceSearchRequirementMessage(), "请先填写一句话需求。");
  helpers.syncGenerationReferenceSearchAction();
  assert.equal(searchButton.disabled, true);
  assert.equal(searchButton.title, "请先填写一句话需求。");

  formNode.values.briefing = "写一篇轻松科普";
  assert.equal(helpers.getGenerationReferenceSearchRequirementMessage(), "");
  helpers.syncGenerationReferenceSearchAction();
  assert.equal(searchButton.disabled, false);
});

test("getGenerationPayload only includes materialText inside referenceAssets for generation requests", async () => {
  const { appJs } = await readFrontendFiles();
  const payloadSource = extractSourceBetween(appJs, "function getGenerationPayload(", "async function handleGenerationReferenceImageSelection(");

  class TestFormData {
    constructor(form) {
      this.form = form;
    }

    get(name) {
      return this.form.values[name];
    }
  }

  const formNode = {
    values: {
      mode: "from_scratch",
      collectionType: "科普",
      lengthMode: "short",
      briefing: "一句话需求",
      materialText: "手写素材",
      referenceTitle: "参考标题",
      tagReferences: "沟通",
      draftTitle: "标题",
      draftBody: "正文"
    }
  };

  const getGenerationPayload = new Function(
    "FormData",
    "byId",
    "getSelectedModelSelections",
    "serializeGenerationReferenceAssets",
    `${payloadSource}; return getGenerationPayload;`
  )(
    TestFormData,
    () => formNode,
    () => ({ generation: "auto" }),
    () => ({ images: [], textFiles: [] })
  );

  const briefingPayload = getGenerationPayload({ includeReferenceAssets: false });
  const generationPayload = getGenerationPayload({ referenceAssets: { images: [], textFiles: [] } });

  assert.equal("materialText" in briefingPayload.brief, false);
  assert.equal("referenceAssets" in briefingPayload, false);
  assert.equal(generationPayload.referenceAssets.materialText, "手写素材");
});

test("generation result rendering includes temporary reference warning details when server skips assets", async () => {
  const { appJs } = await readFrontendFiles();
  const generationStart = appJs.indexOf("function generationVariantLabel(");
  const generationEnd = appJs.indexOf("function renderAdminData(", generationStart);
  const generationSource = appJs.slice(generationStart, generationEnd);
  const nodes = {
    "generation-result": { innerHTML: "" }
  };

  const renderGenerationResult = new Function(
    "byId",
    "escapeHtml",
    "joinCSV",
    "verdictLabel",
    "syncLifecycleResultActions",
    `${generationSource}; return renderGenerationResult;`
  )(
    (id) => nodes[id] || null,
    (value) => String(value || ""),
    (items = []) => (Array.isArray(items) ? items.join(", ") : String(items || "")),
    () => "通过",
    () => {}
  );

  renderGenerationResult({
    recommendationReason: "推荐这版",
    recommendedCandidateId: "candidate-1",
    referenceAssets: {
      warnings: ["图片 1 超过大小限制", "文本 1 已跳过"]
    },
    scoredCandidates: [
      {
        id: "candidate-1",
        variant: "final",
        title: "标题",
        coverText: "封面",
        body: "正文",
        tags: ["科普"],
        generationNotes: "说明",
        safetyNotes: "安全提醒",
        coverImagePrompt: "prompt",
        scores: { total: 90 },
        style: { score: 80 },
        analysis: { finalVerdict: "pass" }
      }
    ]
  });

  assert.match(nodes["generation-result"].innerHTML, /部分临时参考素材已跳过或暂不可用/);
  assert.match(nodes["generation-result"].innerHTML, /图片 1 超过大小限制/);
  assert.match(nodes["generation-result"].innerHTML, /文本 1 已跳过/);
});

test("generation reference image selections serialize deterministically under the 5-image cap", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const renders = [];
  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    latestGeneration: null
  };
  const deferred = new Map();
  const inputA = { files: [{ name: "A1" }, { name: "A2" }, { name: "A3" }, { name: "A4" }], value: "batch-a" };
  const inputB = { files: [{ name: "B1" }, { name: "B2" }, { name: "B3" }, { name: "B4" }], value: "batch-b" };
  const nodes = {
    "generation-result": { innerHTML: "" }
  };
  const generationFormNode = {
    handler: null,
    addEventListener(type, handler) {
      if (type === "submit") {
        this.handler = handler;
      }
    }
  };
  const submitState = { busy: [] };
  const submitHandler = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceImageSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async (file) =>
      new Promise((resolve, reject) => {
        deferred.set(file.name, { resolve, reject });
      }),
    async () => {
      throw new Error("text files not used in this test");
    },
    () => {
      renders.push(appState.generationReferenceAssets.images.map((file) => file.name));
    },
    (value) => String(value || ""),
    (id) => {
      if (id === "generation-workbench-form") {
        return generationFormNode;
      }

      return nodes[id] || null;
    },
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    (button, isBusy, label) => {
      submitState.busy.push({ button, isBusy, label });
    }
  );

  const selectionAPromise = submitHandler.handleGenerationReferenceImageSelection({ currentTarget: inputA });
  const selectionBPromise = submitHandler.handleGenerationReferenceImageSelection({ currentTarget: inputB });

  await Promise.resolve();
  await Promise.resolve();
  assert.equal(deferred.has("B1"), false, "later selection reads should not start before earlier selection finishes");
  assert.deepEqual(appState.generationReferenceAssets.images, [], "later selection should wait for earlier selection chain");

  deferred.get("A1").resolve("data:A1");
  deferred.get("A2").resolve("data:A2");
  deferred.get("A3").resolve("data:A3");
  deferred.get("A4").resolve("data:A4");

  await selectionAPromise;
  await Promise.resolve();
  await Promise.resolve();

  deferred.get("B1").resolve("data:B1");
  deferred.get("B2").resolve("data:B2");
  deferred.get("B3").resolve("data:B3");
  deferred.get("B4").resolve("data:B4");
  await selectionBPromise;

  assert.deepEqual(
    appState.generationReferenceAssets.images.map((file) => file.name),
    ["A1", "A2", "A3", "A4", "B1"],
    "expected first selection to consume cap slots before second selection appends remainder"
  );
  assert.equal(inputA.value, "");
  assert.equal(inputB.value, "");
});

test("generation reference image handler snapshots same-input reselection before queueing", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve()
  };
  const deferred = new Map();
  const input = {
    files: [{ name: "A1" }, { name: "A2" }, { name: "A3" }],
    value: "first-batch"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceImageSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async (file) =>
      new Promise((resolve) => {
        deferred.set(file.name, { resolve });
      }),
    async () => {
      throw new Error("text files not used in this test");
    },
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const firstPromise = helpers.handleGenerationReferenceImageSelection({ currentTarget: input });
  input.files = [{ name: "B1" }, { name: "B2" }];
  input.value = "second-batch";
  const secondPromise = helpers.handleGenerationReferenceImageSelection({ currentTarget: input });
  await Promise.resolve();
  await Promise.resolve();

  deferred.get("A1").resolve("data:A1");
  deferred.get("A2").resolve("data:A2");
  deferred.get("A3").resolve("data:A3");
  await firstPromise;
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(deferred.has("B1"), true, "expected queued second image batch to start from its snapshot after first batch");

  deferred.get("B1").resolve("data:B1");
  deferred.get("B2").resolve("data:B2");
  await secondPromise;

  assert.deepEqual(
    appState.generationReferenceAssets.images.map((file) => file.name),
    ["A1", "A2", "A3", "B1", "B2"],
    "expected second batch on the same input to be preserved from the queued snapshot"
  );
  assert.equal(input.value, "");
});

test("generation reference text handler snapshots files before queued execution", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve()
  };
  const deferred = new Map();
  const input = {
    files: [{ name: "T1" }],
    value: "first-text"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceTextSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async () => {
      throw new Error("images not used in this test");
    },
    async (file) =>
      new Promise((resolve) => {
        deferred.set(file.name, { resolve });
      }),
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const firstPromise = helpers.handleGenerationReferenceTextSelection({ currentTarget: input });
  input.files = [{ name: "T2" }];
  input.value = "second-text";
  const secondPromise = helpers.handleGenerationReferenceTextSelection({ currentTarget: input });
  await Promise.resolve();
  await Promise.resolve();

  deferred.get("T1").resolve("base64:T1");
  await firstPromise;
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(deferred.has("T2"), true, "expected queued second text batch to start from its snapshot after first batch");

  deferred.get("T2").resolve("base64:T2");
  await secondPromise;

  assert.deepEqual(
    appState.generationReferenceAssets.textFiles.map((file) => file.name),
    ["T1", "T2"],
    "expected text selections to use queued file snapshots instead of the live input control"
  );
  assert.equal(input.value, "");
});

test("generation reference request capture freezes image assets against later mutation", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [{ name: "seed-image", type: "image/png", size: 1, dataUrl: "data:seed-image" }],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const deferred = new Map();
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceImageSelection,
  removeGenerationReferenceAsset,
  captureGenerationReferenceAssetsForRequest,
  releaseGenerationReferenceAssetsRequestLock
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async (file) =>
      new Promise((resolve) => {
        deferred.set(file.name, { resolve });
      }),
    async () => {
      throw new Error("text files not used in this test");
    },
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const input = {
    files: [{ name: "A1" }, { name: "A2" }],
    value: "pending-images"
  };
  const selectionPromise = helpers.handleGenerationReferenceImageSelection({ currentTarget: input });
  await Promise.resolve();
  await Promise.resolve();

  const capturePromise = helpers.captureGenerationReferenceAssetsForRequest();
  assert.equal(appState.generationReferenceAssetsLocked, true, "request capture should lock synchronously");

  helpers.removeGenerationReferenceAsset("image", 0);
  const lockedInput = {
    files: [{ name: "B1" }],
    value: "locked-images"
  };
  const lockedSelectionPromise = helpers.handleGenerationReferenceImageSelection({ currentTarget: lockedInput });

  deferred.get("A1").resolve("data:A1");
  deferred.get("A2").resolve("data:A2");
  await selectionPromise;

  const captured = await capturePromise;
  await lockedSelectionPromise;

  assert.deepEqual(captured.images.map((file) => file.name), ["seed-image", "A1", "A2"]);
  assert.equal(appState.generationReferenceAssetsLocked, true);
  assert.deepEqual(appState.generationReferenceAssets.images.map((file) => file.name), ["seed-image", "A1", "A2"]);
  assert.equal(lockedInput.value, "");

  helpers.releaseGenerationReferenceAssetsRequestLock();
  assert.equal(appState.generationReferenceAssetsLocked, false);
});

test("generation reference request capture freezes text assets against later mutation", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [{ name: "seed-text", contentBase64: "base64:seed-text" }],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const deferred = new Map();
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceTextSelection,
  captureGenerationReferenceAssetsForRequest,
  releaseGenerationReferenceAssetsRequestLock
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async () => {
      throw new Error("images not used in this test");
    },
    async (file) =>
      new Promise((resolve) => {
        deferred.set(file.name, { resolve });
      }),
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const input = {
    files: [{ name: "T1" }],
    value: "pending-text"
  };
  const selectionPromise = helpers.handleGenerationReferenceTextSelection({ currentTarget: input });
  await Promise.resolve();
  await Promise.resolve();

  const capturePromise = helpers.captureGenerationReferenceAssetsForRequest();
  assert.equal(appState.generationReferenceAssetsLocked, true, "text capture should lock synchronously");

  const lockedInput = {
    files: [{ name: "T2" }],
    value: "locked-text"
  };
  const lockedSelectionPromise = helpers.handleGenerationReferenceTextSelection({ currentTarget: lockedInput });

  deferred.get("T1").resolve("base64:T1");
  await selectionPromise;

  const captured = await capturePromise;
  await lockedSelectionPromise;

  assert.deepEqual(captured.textFiles.map((file) => file.name), ["seed-text", "T1"]);
  assert.deepEqual(appState.generationReferenceAssets.textFiles.map((file) => file.name), ["seed-text", "T1"]);
  assert.equal(lockedInput.value, "");

  helpers.releaseGenerationReferenceAssetsRequestLock();
  assert.equal(appState.generationReferenceAssetsLocked, false);
});

test("generation reference image handler keeps successful files from a mixed batch and clears input immediately", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const deferred = new Map();
  const input = {
    files: [{ name: "good-image", size: 1024 }, { name: "bad-image", size: 1024 }],
    value: "selected-images"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceImageSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async (file) =>
      new Promise((resolve, reject) => {
        deferred.set(file.name, { resolve, reject });
      }),
    async () => {
      throw new Error("text files not used in this test");
    },
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const selectionPromise = helpers.handleGenerationReferenceImageSelection({ currentTarget: input });
  assert.equal(input.value, "", "expected image input to clear immediately after snapshotting");
  await Promise.resolve();
  await Promise.resolve();

  deferred.get("good-image").resolve("data:good-image");
  deferred.get("bad-image").reject(new Error("read failed"));
  await selectionPromise;

  assert.deepEqual(appState.generationReferenceAssets.images.map((file) => file.name), ["good-image"]);
  assert.match(appState.generationReferenceAssets.message, /部分参考图片读取失败/);
});

test("generation reference text path stays stable after a zero-success batch and request capture sees no phantom files", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const deferred = new Map();
  const input = {
    files: [{ name: "bad-text", size: 1024 }],
    value: "selected-text"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceTextSelection,
  captureGenerationReferenceAssetsForRequest,
  releaseGenerationReferenceAssetsRequestLock
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async () => {
      throw new Error("images not used in this test");
    },
    async (file) =>
      new Promise((resolve, reject) => {
        deferred.set(file.name, { resolve, reject });
      }),
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  const selectionPromise = helpers.handleGenerationReferenceTextSelection({ currentTarget: input });
  assert.equal(input.value, "", "expected text input to clear immediately after snapshotting");
  await Promise.resolve();
  await Promise.resolve();

  deferred.get("bad-text").reject(new Error("read failed"));
  await selectionPromise;

  assert.deepEqual(appState.generationReferenceAssets.textFiles, []);
  assert.match(appState.generationReferenceAssets.message, /部分参考文本读取失败|参考文本读取失败/);

  const captured = await helpers.captureGenerationReferenceAssetsForRequest();
  assert.deepEqual(captured, { images: [], textFiles: [] });
  assert.equal(appState.generationReferenceAssetsLocked, true);
  helpers.releaseGenerationReferenceAssetsRequestLock();
  assert.equal(appState.generationReferenceAssetsLocked, false);
});

test("generation reference image handler skips oversize files before invoking readers", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const readerCalls = [];
  const input = {
    files: [
      { name: "too-big-image", size: 5 * 1024 * 1024 },
      { name: "ok-image", size: 1024 }
    ],
    value: "image-batch"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceImageSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async (file) => {
      readerCalls.push(file.name);
      return `data:${file.name}`;
    },
    async () => {
      throw new Error("text files not used in this test");
    },
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  await helpers.handleGenerationReferenceImageSelection({ currentTarget: input });

  assert.deepEqual(readerCalls, ["ok-image"]);
  assert.deepEqual(appState.generationReferenceAssets.images.map((file) => file.name), ["ok-image"]);
  assert.match(appState.generationReferenceAssets.message, /4 MB/);
});

test("generation reference text handler skips oversize files before invoking readers", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const generationHelpersSource = extractSourceBetween(
    appJs,
    "async function readGenerationReferenceImageFiles(",
    "function syncGenerationModeFields()"
  );

  const appState = {
    generationReferenceAssets: {
      images: [],
      textFiles: [],
      message: ""
    },
    generationReferenceAssetsPending: Promise.resolve(),
    generationReferenceAssetsLocked: false
  };
  const readerCalls = [];
  const input = {
    files: [
      { name: "too-big-text", size: 600 * 1024 },
      { name: "ok-text", size: 1024 }
    ],
    value: "text-batch"
  };
  const helpers = new Function(
    "appState",
    "GENERATION_REFERENCE_IMAGE_LIMIT",
    "GENERATION_REFERENCE_IMAGE_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TEXT_MAX_FILE_BYTES",
    "GENERATION_REFERENCE_TOTAL_MAX_BYTES",
    "fileToDataUrl",
    "fileToBase64",
    "renderGenerationReferenceAssets",
    "escapeHtml",
    "byId",
    "awaitGenerationReferenceAssetsReady",
    "getGenerationRequirementMessage",
    "syncGenerationActions",
    "setButtonBusy",
    `${generationHelpersSource}
return {
  handleGenerationReferenceTextSelection
};`
  )(
    appState,
    5,
    4 * 1024 * 1024,
    512 * 1024,
    12 * 1024 * 1024,
    async () => {
      throw new Error("images not used in this test");
    },
    async (file) => {
      readerCalls.push(file.name);
      return `base64:${file.name}`;
    },
    () => {},
    (value) => String(value || ""),
    () => null,
    async () => {
      await appState.generationReferenceAssetsPending;
    },
    () => "",
    () => {},
    () => {}
  );

  await helpers.handleGenerationReferenceTextSelection({ currentTarget: input });

  assert.deepEqual(readerCalls, ["ok-text"]);
  assert.deepEqual(appState.generationReferenceAssets.textFiles.map((file) => file.name), ["ok-text"]);
  assert.match(appState.generationReferenceAssets.message, /512 KB/);
});

test("generation reference search keeps modal closed when request resolves after explicit close", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationReferenceSearchModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  const appState = {
    generationReferenceSearch: {
      open: false,
      loading: false,
      message: "",
      items: [],
      selectedIndices: []
    }
  };
  const nodes = {
    "generation-reference-search-modal": { hidden: true },
    "generation-reference-search-modal-content": { innerHTML: "" },
    "generation-reference-search-result": { textContent: "" }
  };
  const formNode = {
    querySelector(selector) {
      if (selector === '[name="materialText"]') {
        return null;
      }
      return null;
    }
  };
  const request = {};
  request.promise = new Promise((resolve) => {
    request.resolve = resolve;
  });
  const events = [];
  const requestSequenceBox = { value: 0 };

  const helpers = new Function(
    "appState",
    "requestSequenceBox",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "Event",
    "HTMLTextAreaElement",
    "apiJson",
    "getGenerationPayload",
    "syncGenerationActions",
    `let generationReferenceSearchRequestSequence = requestSequenceBox.value;
${modalHelpersSource}
return {
  openGenerationReferenceSearchModal,
  closeGenerationReferenceSearchModal,
  getRequestSequence() {
    return generationReferenceSearchRequestSequence;
  }
};`
  )(
    appState,
    requestSequenceBox,
    (id) => {
      if (id === "generation-workbench-form") {
        return formNode;
      }
      return nodes[id] || null;
    },
    () => {
      events.push({ type: "syncBodyModalState", hidden: nodes["generation-reference-search-modal"].hidden });
    },
    (value) => String(value || ""),
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    class TestTextArea {},
    async () => request.promise,
    () => ({
      brief: {
        briefing: "需要一组参考资料"
      }
    }),
    () => {
      events.push({ type: "syncGenerationActions" });
    }
  );

  const pending = helpers.openGenerationReferenceSearchModal();
  helpers.closeGenerationReferenceSearchModal();
  request.resolve({
    items: [
      {
        title: "参考 1",
        reason: "命中主题",
        referenceText: "资料 A",
        sourceUrl: "https://example.com/a"
      }
    ]
  });
  await pending;
  requestSequenceBox.value = helpers.getRequestSequence();

  assert.equal(appState.generationReferenceSearch.open, false);
  assert.equal(nodes["generation-reference-search-modal"].hidden, true);
  assert.deepEqual(appState.generationReferenceSearch.items.map((item) => item.title), ["参考 1"]);
});

test("generation reference search empty results prefer a neutral empty-state message over backend message", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationReferenceSearchModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  const appState = {
    generationReferenceSearch: {
      open: false,
      loading: false,
      message: "",
      items: [],
      selectedIndices: []
    }
  };
  const nodes = {
    "generation-reference-search-modal": { hidden: true },
    "generation-reference-search-modal-content": { innerHTML: "" },
    "generation-reference-search-result": { textContent: "" }
  };
  const formNode = {
    querySelector() {
      return null;
    }
  };

  const helpers = new Function(
    "appState",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "Event",
    "HTMLTextAreaElement",
    "apiJson",
    "getGenerationPayload",
    "syncGenerationActions",
    `let generationReferenceSearchRequestSequence = 0;
${modalHelpersSource}
return {
  openGenerationReferenceSearchModal
};`
  )(
    appState,
    (id) => {
      if (id === "generation-workbench-form") {
        return formNode;
      }
      return nodes[id] || null;
    },
    () => {},
    (value) => String(value || ""),
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    class TestTextArea {},
    async () => ({
      items: [],
      message: "已基于拆分后的检索意图整理参考资料候选。"
    }),
    () => ({
      brief: {
        briefing: "需要一组参考资料"
      }
    }),
    () => {}
  );

  await helpers.openGenerationReferenceSearchModal();

  assert.doesNotMatch(nodes["generation-reference-search-modal-content"].innerHTML, /已基于拆分后的检索意图整理参考资料候选/);
  assert.match(nodes["generation-reference-search-modal-content"].innerHTML, /暂未找到可用的参考资料|暂无数据/);
  assert.equal(nodes["generation-reference-search-result"].textContent, "本次没有找到可回填的参考资料。");
});

test("generation reference search supports selecting multiple items and applying them together", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationReferenceSearchModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );
  const actionHandlerSource = extractSourceBetween(
    appJs,
    '  if (action === "close-sample-library-modal") {',
    '    if (action === "prefill-sample-library-modal-calibration-prediction") {'
  );
  const changeHandlerBody = [...appJs.matchAll(/document\.addEventListener\("change", \(event\) => \{([\s\S]*?)\n\}\);/g)][0][1];

  class TestTextArea {
    constructor(value = "") {
      this.value = value;
      this.events = [];
    }

    dispatchEvent(event) {
      this.events.push(event);
      return true;
    }
  }

  class HtmlTextAreaElement extends TestTextArea {}

  const materialField = new HtmlTextAreaElement("已有素材");
  const resultNode = { textContent: "" };
  const appState = {
    generationReferenceSearch: {
      open: true,
      loading: false,
      message: "",
      items: [
        {
          title: "参考 1",
          reason: "命中主题",
          referenceText: "资料 A",
          sourceUrl: "https://example.com/a"
        },
        {
          title: "参考 2",
          reason: "补充边界",
          referenceText: "资料 B",
          sourceUrl: "https://example.com/b"
        }
      ],
      selectedIndices: []
    }
  };
  const applyButtonNode = {
    textContent: "回填已选 0 条",
    disabled: true
  };
  const nodes = {
    "generation-reference-search-modal": { hidden: false },
    "generation-reference-search-modal-content": {
      innerHTML: "",
      querySelector(selector) {
        return selector === '[data-action="apply-generation-reference-materials"]' ? applyButtonNode : null;
      }
    },
    "generation-reference-search-result": resultNode
  };
  const formNode = {
    querySelector(selector) {
      if (selector === '[name="materialText"]') {
        return materialField;
      }
      return null;
    }
  };

  const helpers = new Function(
    "appState",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "Event",
    "HTMLTextAreaElement",
    `${modalHelpersSource}
return {
  renderGenerationReferenceSearchModal,
  appendMultipleGenerationMaterialTexts,
  closeGenerationReferenceSearchModal,
  syncGenerationReferenceSearchSelectionState
};`
  )(
    appState,
    (id) => {
      if (id === "generation-workbench-form") {
        return formNode;
      }
      return nodes[id] || null;
    },
    () => {},
    (value) => String(value || ""),
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    HtmlTextAreaElement
  );

  helpers.renderGenerationReferenceSearchModal();
  assert.match(nodes["generation-reference-search-modal-content"].innerHTML, /data-action="toggle-generation-reference-material"/);
  assert.match(nodes["generation-reference-search-modal-content"].innerHTML, /data-action="apply-generation-reference-materials"/);

  const actionRunner = new Function(
    "appState",
    "button",
    "action",
    "byId",
    "appendMultipleGenerationMaterialTexts",
    "closeGenerationReferenceSearchModal",
    "renderGenerationReferenceSearchModal",
    `${actionHandlerSource}`
  );
  const changeRunner = new Function(
    "appState",
    "event",
    "Element",
    "syncGenerationReferenceSearchSelectionState",
    `${changeHandlerBody}`
  );
  class TestElement {
    constructor(index) {
      this.dataset = { action: "toggle-generation-reference-material", index: String(index) };
      this.checked = true;
    }

    closest(selector) {
      return selector === '[data-action="toggle-generation-reference-material"]' ? this : null;
    }
  }

  changeRunner(
    appState,
    {
      target: new TestElement(0)
    },
    TestElement,
    helpers.syncGenerationReferenceSearchSelectionState
  );
  changeRunner(
    appState,
    {
      target: new TestElement(1)
    },
    TestElement,
    helpers.syncGenerationReferenceSearchSelectionState
  );

  assert.deepEqual(appState.generationReferenceSearch.selectedIndices, [0, 1]);

  actionRunner(
    appState,
    { dataset: { action: "apply-generation-reference-materials" } },
    "apply-generation-reference-materials",
    (id) => nodes[id] || null,
    helpers.appendMultipleGenerationMaterialTexts,
    helpers.closeGenerationReferenceSearchModal,
    helpers.renderGenerationReferenceSearchModal
  );

  assert.equal(materialField.value, "已有素材\n\n资料 A\n\n资料 B");
  assert.equal(resultNode.textContent, "已回填 2 条参考资料到素材文本。");
  assert.equal(appState.generationReferenceSearch.open, false);
});

test("generation reference search selection updates count through checkbox change events", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");

  assert.match(appJs, /document\.addEventListener\("change", \(event\) => \{/);
  assert.match(appJs, /toggle-generation-reference-material/);
  assert.match(appJs, /selectedIndices:\s*next/);
  assert.match(appJs, /回填已选 \$\{selectedCount\} 条/);
  assert.match(appJs, /function syncGenerationReferenceSearchSelectionState\s*\(/);
  assert.doesNotMatch(appJs, /selectedIndices:\s*next[\s\S]*renderGenerationReferenceSearchModal\(\)/);
});

test("appendGenerationMaterialText preserves existing trailing whitespace before appending", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationReferenceSearchModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  class TestTextArea {
    constructor(value = "") {
      this.value = value;
      this.events = [];
    }

    dispatchEvent(event) {
      this.events.push(event);
      return true;
    }
  }

  const materialField = new TestTextArea("已有素材  ");
  const formNode = {
    querySelector(selector) {
      if (selector === '[name="materialText"]') {
        return materialField;
      }
      return null;
    }
  };

  const helpers = new Function(
    "appState",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "Event",
    "HTMLTextAreaElement",
    "apiJson",
    "getGenerationPayload",
    "syncGenerationActions",
    `${modalHelpersSource}
return {
  appendGenerationMaterialText
};`
  )(
    {},
    (id) => (id === "generation-workbench-form" ? formNode : null),
    () => {},
    (value) => String(value || ""),
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    TestTextArea,
    async () => ({}),
    () => ({ brief: { briefing: "" } }),
    () => {}
  );

  helpers.appendGenerationMaterialText("新资料");

  assert.equal(materialField.value, "已有素材  \n\n新资料");
  assert.equal(materialField.events.length, 1);
  assert.equal(materialField.events[0].type, "input");
});

test("Escape closes generation reference search modal when open", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const keydownListeners = [...appJs.matchAll(/document\.addEventListener\("keydown", \(event\) => \{([\s\S]*?)\n\}\);/g)];
  assert.ok(keydownListeners.length >= 2, "expected at least two keydown listeners");
  const escapeHandlerBody = keydownListeners[1][1];

  const listeners = {};
  const appState = {
    sampleLibraryModal: null,
    sampleLibraryPoolsModal: { open: false },
    generationReferenceSearch: {
      open: true,
      loading: false,
      message: "",
      items: [],
      selectedIndices: []
    }
  };
  const nodes = {
    "generation-reference-search-modal": { hidden: false }
  };
  let closed = 0;

  const documentStub = {
    activeElement: null,
    addEventListener(type, handler) {
      listeners[type] = handler;
    }
  };

  const escapeHandler = new Function(
    "appState",
    "requestCloseSampleLibraryRecordInlineEditorModal",
    "closeSampleLibraryModal",
    "closeSampleLibraryPoolsModal",
    "closeGenerationReferenceSearchModal",
    "getSampleLibraryImportCards",
    "getSampleLibraryImportCardTagPicker",
    "getSampleLibraryImportCardTagTrigger",
    "setSampleLibraryImportCardTagDropdownOpen",
    "HTMLElement",
    "document",
    "event",
    `${escapeHandlerBody}`
  );

  escapeHandler(
    appState,
    () => {},
    () => {},
    () => {},
    () => {
      closed += 1;
      appState.generationReferenceSearch.open = false;
      nodes["generation-reference-search-modal"].hidden = true;
    },
    () => [],
    () => null,
    () => null,
    () => {},
    class TestElement {},
    documentStub,
    { key: "Escape" }
  );

  assert.equal(closed, 1);
  assert.equal(appState.generationReferenceSearch.open, false);
  assert.equal(nodes["generation-reference-search-modal"].hidden, true);
});

test("frontend exposes theme inspiration modal entry beside generation workbench controls", async () => {
  const { indexHtml, styles, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="generation-theme-inspiration-button"/);
  assert.match(indexHtml, />\s*主题灵感\s*</);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal"/);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal-content"/);
  assert.match(indexHtml, /id="generation-theme-inspiration-modal-detail"/);
  assert.match(appJs, /from "\.\/theme-inspiration-view\.js"/);

  assert.match(styles, /\.generation-theme-inspiration-modal\b/);
  assert.match(styles, /\.generation-theme-inspiration-modal-dialog\b/);
  assert.match(styles, /\.generation-theme-card\b/);
  assert.match(styles, /\.generation-theme-card-button\b/);
  assert.match(styles, /\.generation-theme-inspiration-modal-content\s+\.generation-theme-card\s*\{[\s\S]*border:\s*0/);
});

test("frontend exposes a draft inbox grid inside the main workbench footer area with filters and sorting", async () => {
  const { indexHtml, appJs, styles } = await readFrontendFiles();

  assert.match(indexHtml, /id="generation-draft-inbox-panel"/);
  assert.match(indexHtml, /id="draft-ideas-list"/);
  assert.match(indexHtml, /id="draft-ideas-toolbar"/);
  assert.match(indexHtml, /name="draftIdeasStatusView"/);
  assert.match(indexHtml, /name="draftIdeasSortOrder"/);
  assert.match(indexHtml, /待写选题/);
  assert.match(indexHtml, /待写/);
  assert.match(indexHtml, /已使用/);
  assert.match(styles, /\.generation-draft-inbox-panel\b/);
  assert.match(styles, /\.draft-ideas-list\b/);
  assert.match(styles, /\.draft-ideas-grid\b/);
  assert.match(styles, /\.draft-ideas-toolbar\b/);
  assert.match(appJs, /draftIdeasApi/);
  assert.match(appJs, /addDraftIdeaFromAccountPlannerCard/);
  assert.match(appJs, /addDraftIdeaFromThemeInspirationCard/);
  assert.match(appJs, /addDraftIdeaFromGenerationCandidate/);
  assert.match(appJs, /loadDraftIdeaIntoGenerationForm/);
  assert.match(appJs, /activateTab\("main-workbench",\s*"generation-workbench-pane"\)/);
  assert.match(appJs, /scrollIntoView\(\{\s*behavior:\s*"smooth"/);
  assert.match(appJs, /draftIdeasStatusView/);
  assert.match(appJs, /draftIdeasSortOrder/);
});

test("planner and theme inspiration detail actions expose local success and failure hints beside the buttons", async () => {
  const { appJs, indexHtml } = await readFrontendFiles();

  assert.match(indexHtml, /id="generation-theme-inspiration-modal-detail"/);
  assert.match(appJs, /sample-library-account-planner-detail-action-hint/);
  assert.match(appJs, /generation-theme-inspiration-detail-action-hint/);
  assert.match(appJs, /已将下一篇建议填入生成工作台，可直接继续生成/);
  assert.match(appJs, /已加入草稿区，可稍后继续写/);
  assert.match(appJs, /请先选择一张主题灵感卡片/);
});

test("theme inspiration modal helpers keep existing briefing and reference title, append safe fields, and retain latest refresh only", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const themeInspirationViewJs = await fs.readFile(path.join(process.cwd(), "web/theme-inspiration-view.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationThemeInspirationModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  class TestEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.bubbles = Boolean(init.bubbles);
    }
  }

  class TestInputElement {
    constructor(value = "") {
      this.value = value;
      this.disabled = false;
      this.events = [];
    }

    dispatchEvent(event) {
      this.events.push(event);
      return true;
    }
  }

  class TestTextAreaElement extends TestInputElement {}
  class TestSelectElement extends TestInputElement {}

  const requests = [];
  const deferredRequests = [];
  const cards = [
    {
      themeId: "theme-1",
      themeTitle: "边界感不是冷淡",
      hookAngle: "很多人以为这是问题，其实很常见。",
      whyNow: "这个主题兼具反差和科普价值。",
      discussionSignal: "多个高表现内容都反复命中。",
      sourceSignals: ["命中 2 条高表现内容"],
      expandAngles: ["从表达方式讲", "从关系安全感讲"],
      boundaryNotes: ["避免病理化表达"],
      tags: ["身体探索", "情绪反应"],
      prefillBriefing: "写一篇轻松科普，解释边界感为什么不一定异常。",
      prefillTopic: "边界感是不是冷淡",
      prefillConstraints: "避免病理化，不做医疗诊断。",
      prefillReferenceTitle: "怎么表达拒绝又不伤人？",
      prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。",
      prefillCollectionType: "科普"
    },
    {
      themeId: "theme-2",
      themeTitle: "第二张卡片",
      hookAngle: "另一个角度",
      whyNow: "补充讨论",
      discussionSignal: "也有价值",
      sourceSignals: [],
      expandAngles: [],
      boundaryNotes: [],
      tags: ["关系沟通"],
      prefillBriefing: "第二条 briefing",
      prefillTopic: "第二个主题",
      prefillConstraints: "",
      prefillReferenceTitle: "",
      prefillMaterialText: "",
      prefillCollectionType: "经验分享"
    }
  ];
  const nextCards = [
    {
      themeId: "theme-9",
      themeTitle: "最新灵感卡",
      hookAngle: "更新后的角度",
      whyNow: "应该保留最新响应",
      discussionSignal: "最新请求",
      sourceSignals: [],
      expandAngles: [],
      boundaryNotes: [],
      tags: ["健康科普"],
      prefillBriefing: "第三条 briefing",
      prefillTopic: "第三个主题",
      prefillConstraints: "",
      prefillReferenceTitle: "新参考标题",
      prefillMaterialText: "新一批素材",
      prefillCollectionType: "科普"
    }
  ];

  const detailNode = { innerHTML: "" };
  const generationHintNode = { textContent: "" };
  const refreshButton = { disabled: false, dataset: {}, textContent: "换一批灵感" };
  const modalNode = { hidden: true };
  const contentNode = {
    innerHTML: "",
    querySelector(selector) {
      if (selector === '[data-action="refresh-generation-theme-inspiration"]') {
        return refreshButton;
      }
      return null;
    }
  };
  const generationFields = {
    briefing: new TestTextAreaElement("已有一句话需求"),
    materialText: new TestTextAreaElement("已有素材"),
    referenceTitle: new TestInputElement("已有参考标题"),
    collectionType: new TestSelectElement(""),
    tagReferences: new TestInputElement(""),
    lengthMode: new TestSelectElement("short")
  };
  const formNode = {
    querySelector(selector) {
      if (selector === '[name="briefing"]') return generationFields.briefing;
      if (selector === '[name="materialText"]') return generationFields.materialText;
      if (selector === '[name="referenceTitle"]') return generationFields.referenceTitle;
      if (selector === '[name="collectionType"]') return generationFields.collectionType;
      if (selector === '[name="tagReferences"]') return generationFields.tagReferences;
      if (selector === '[name="lengthMode"]') return generationFields.lengthMode;
      return null;
    }
  };
  const appState = {
    generationThemeInspiration: {
      open: false,
      loading: false,
      items: [],
      selectedThemeId: "",
      message: "",
      resultMessage: ""
    }
  };
  const requestSequenceBox = { value: 0 };
  const syncEvents = [];

  const helpers = new Function(
    "appState",
    "requestSequenceBox",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "apiJson",
    "generationThemeInspirationsApi",
    "getSelectedModelSelections",
    "splitCSV",
    "joinCSV",
    "uniqueStrings",
    "appendGenerationMaterialText",
    "setActionGateHint",
    "Event",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "setButtonBusy",
    "syncGenerationActions",
    "themeInspirationViewFactory",
    `let generationThemeInspirationRequestSequence = requestSequenceBox.value;
const {
  getSelectedGenerationThemeInspiration: getSelectedGenerationThemeInspirationView,
  renderGenerationThemeInspirationDetail: renderGenerationThemeInspirationDetailView,
  renderGenerationThemeInspirationModal: renderGenerationThemeInspirationModalView
} = themeInspirationViewFactory();
${modalHelpersSource}
return {
  openGenerationThemeInspirationModal,
  closeGenerationThemeInspirationModal,
  refreshGenerationThemeInspirations,
  renderGenerationThemeInspirationModal,
  getSelectedGenerationThemeInspiration,
  applyGenerationThemeInspirationPrefill,
  getRequestSequence() {
    return generationThemeInspirationRequestSequence;
  }
};`
  )(
    appState,
    requestSequenceBox,
    (id) => {
      if (id === "generation-theme-inspiration-modal") return modalNode;
      if (id === "generation-theme-inspiration-modal-content") return contentNode;
      if (id === "generation-theme-inspiration-modal-detail") return detailNode;
      if (id === "generation-action-hint") return generationHintNode;
      if (id === "generation-workbench-form") return formNode;
      return null;
    },
    () => {
      syncEvents.push({ type: "syncBodyModalState", hidden: modalNode.hidden });
    },
    (value) => String(value || ""),
    async (url, options = {}) => {
      requests.push({ url, options });
      if (requests.length <= 2) {
        return { items: cards };
      }

      return await new Promise((resolve) => {
        deferredRequests.push({ resolve });
      });
    },
    "/api/generate-theme-inspirations",
    () => ({ generation: "auto" }),
    (value) =>
      String(value || "")
        .split(/[，,、]/)
        .map((item) => item.trim())
        .filter(Boolean),
    (items = []) => (Array.isArray(items) ? items.join(", ") : ""),
    (items = []) => [...new Set((Array.isArray(items) ? items : [items]).map((item) => String(item || "").trim()).filter(Boolean))],
    (nextText) => {
      const appended = String(nextText || "").trim();
      if (!appended) {
        return;
      }
      const currentValue = String(generationFields.materialText.value || "");
      generationFields.materialText.value = currentValue ? `${currentValue}\n\n${appended}` : appended;
      generationFields.materialText.dispatchEvent(new TestEvent("input", { bubbles: true }));
    },
    (id, message) => {
      if (id === "generation-action-hint") {
        generationHintNode.textContent = String(message || "");
      }
    },
    TestEvent,
    TestInputElement,
    TestTextAreaElement,
    TestSelectElement,
    (button, busy, busyLabel = "") => {
      if (!button) return;
      button.disabled = busy;
      button.dataset.busy = busy ? "true" : "";
      if (busyLabel) {
        button.textContent = busy ? busyLabel : "换一批灵感";
      }
    },
    () => {
      syncEvents.push({ type: "syncGenerationActions" });
    },
    new Function(`${themeInspirationViewJs.replace(/export function /g, "function ")}
return {
  getSelectedGenerationThemeInspiration,
  renderGenerationThemeInspirationDetail,
  renderGenerationThemeInspirationModal
};`)
  );

  const pendingOpen = helpers.openGenerationThemeInspirationModal();

  assert.equal(appState.generationThemeInspiration.open, true);
  assert.equal(modalNode.hidden, false);

  await pendingOpen;
  requestSequenceBox.value = helpers.getRequestSequence();

  assert.deepEqual(
    requests.map((request) => [request.url, request.options.method || "GET"]),
    [["/api/generate-theme-inspirations", "POST"]]
  );
  assert.equal(appState.generationThemeInspiration.loading, false);
  assert.equal(appState.generationThemeInspiration.selectedThemeId, "theme-1");
  assert.match(contentNode.innerHTML, /边界感不是冷淡/);
  assert.match(contentNode.innerHTML, /data-action="select-generation-theme-inspiration"/);
  assert.match(detailNode.innerHTML, /data-action="apply-generation-theme-inspiration"/);
  assert.match(detailNode.innerHTML, /很多人以为这是问题，其实很常见/);

  appState.generationThemeInspiration.selectedThemeId = "theme-2";
  helpers.renderGenerationThemeInspirationModal();
  assert.match(detailNode.innerHTML, /第二张卡片/);

  await helpers.refreshGenerationThemeInspirations();
  assert.equal(requests.length, 2);
  requestSequenceBox.value = helpers.getRequestSequence();

  const staleRefresh = helpers.refreshGenerationThemeInspirations();
  const latestRefresh = helpers.refreshGenerationThemeInspirations();
  assert.equal(requests.length, 4);
  deferredRequests[1].resolve({ items: nextCards });
  await latestRefresh;
  requestSequenceBox.value = helpers.getRequestSequence();
  deferredRequests[0].resolve({ items: cards });
  await staleRefresh;
  requestSequenceBox.value = helpers.getRequestSequence();

  assert.equal(appState.generationThemeInspiration.selectedThemeId, "theme-9");
  assert.match(contentNode.innerHTML, /最新灵感卡/);
  assert.doesNotMatch(contentNode.innerHTML, /边界感不是冷淡/);

  helpers.applyGenerationThemeInspirationPrefill(cards[0]);

  assert.equal(generationFields.briefing.value, "已有一句话需求");
  assert.equal(generationFields.referenceTitle.value, "已有参考标题");
  assert.equal(generationFields.collectionType.value, "科普");
  assert.equal(generationFields.tagReferences.value, "身体探索, 情绪反应");
  assert.equal(generationFields.materialText.value, "已有素材\n\n关键点：先共情、再说明边界、最后给替代沟通方式。");
  assert.equal(appState.generationThemeInspiration.open, false);
  assert.equal(modalNode.hidden, true);
  assert.match(generationHintNode.textContent, /已将主题灵感填入生成表单/);
  assert.ok(syncEvents.some((event) => event.type === "syncGenerationActions"));
});

test("theme inspiration modal reopens existing cached items without auto-requesting again", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const themeInspirationViewJs = await fs.readFile(path.join(process.cwd(), "web/theme-inspiration-view.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationThemeInspirationModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  const requests = [];
  const modalNode = { hidden: true };
  const contentNode = { innerHTML: "" };
  const detailNode = { innerHTML: "" };
  const appState = {
    generationThemeInspiration: {
      open: false,
      loading: false,
      items: [
        {
          themeId: "theme-1",
          themeTitle: "从表达方式讲",
          sourceThemeTitle: "边界感不是冷淡",
          hookAngle: "很多人把边界误解成疏远，其实很常见。",
          whyNow: "这个角度更容易拉出反差。",
          discussionSignal: "高表现内容里反复命中。",
          sourceSignals: ["命中 2 条高表现内容"],
          expandAngles: ["从关系安全感讲"],
          boundaryNotes: ["避免病理化表达"],
          tags: ["身体探索", "情绪反应"],
          prefillBriefing: "写一篇轻松科普，解释边界感为什么不等于冷淡。",
          prefillReferenceTitle: "怎么表达拒绝又不伤人？",
          prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
        }
      ],
      selectedThemeId: "theme-1",
      message: "",
      resultMessage: ""
    }
  };

  const helpers = new Function(
    "appState",
    "requestSequenceBox",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "apiJson",
    "generationThemeInspirationsApi",
    "getSelectedModelSelections",
    "splitCSV",
    "joinCSV",
    "uniqueStrings",
    "appendGenerationMaterialText",
    "setActionGateHint",
    "Event",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "setButtonBusy",
    "syncGenerationActions",
    "themeInspirationViewFactory",
    `let generationThemeInspirationRequestSequence = 0;
const {
  getSelectedGenerationThemeInspiration: getSelectedGenerationThemeInspirationView,
  renderGenerationThemeInspirationDetail: renderGenerationThemeInspirationDetailView,
  renderGenerationThemeInspirationModal: renderGenerationThemeInspirationModalView
} = themeInspirationViewFactory();
${modalHelpersSource}
return {
  openGenerationThemeInspirationModal
};`
  )(
    appState,
    { value: 0 },
    (id) => {
      if (id === "generation-theme-inspiration-modal") return modalNode;
      if (id === "generation-theme-inspiration-modal-content") return contentNode;
      if (id === "generation-theme-inspiration-modal-detail") return detailNode;
      if (id === "generation-workbench-form") return { querySelector() { return null; } };
      return null;
    },
    () => {},
    (value) => String(value || ""),
    async (url) => {
      requests.push(url);
      return { items: [] };
    },
    "/api/generate-theme-inspirations",
    () => ({ generation: "auto" }),
    () => [],
    () => "",
    () => [],
    () => {},
    () => {},
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    class TestInputElement {},
    class TestTextAreaElement {},
    class TestSelectElement {},
    () => {},
    () => {},
    new Function(`${themeInspirationViewJs.replace(/export function /g, "function ")}
return {
  getSelectedGenerationThemeInspiration,
  renderGenerationThemeInspirationDetail,
  renderGenerationThemeInspirationModal
};`)
  );

  await helpers.openGenerationThemeInspirationModal();

  assert.equal(requests.length, 0);
  assert.equal(appState.generationThemeInspiration.open, true);
  assert.equal(modalNode.hidden, false);
  assert.match(contentNode.innerHTML, /从表达方式讲/);
});

test("theme inspiration modal uses non-refresh auto-load first and explicit refresh afterwards", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const themeInspirationViewJs = await fs.readFile(path.join(process.cwd(), "web/theme-inspiration-view.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationThemeInspirationModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  const requests = [];
  const modalNode = {
    hidden: true,
    querySelector(selector) {
      if (selector === '[data-action="refresh-generation-theme-inspiration"]') {
        return refreshButton;
      }
      return null;
    }
  };
  const refreshButton = {
    setAttribute() {}
  };
  const contentNode = { innerHTML: "" };
  const detailNode = { innerHTML: "" };
  const appState = {
    generationThemeInspiration: {
      open: false,
      loading: false,
      items: [],
      selectedThemeId: "",
      message: "",
      resultMessage: ""
    }
  };

  const helpers = new Function(
    "appState",
    "requestSequenceBox",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "apiJson",
    "generationThemeInspirationsApi",
    "getSelectedModelSelections",
    "splitCSV",
    "joinCSV",
    "uniqueStrings",
    "appendGenerationMaterialText",
    "setActionGateHint",
    "Event",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "setButtonBusy",
    "syncGenerationActions",
    "themeInspirationViewFactory",
    `let generationThemeInspirationRequestSequence = 0;
const {
  getSelectedGenerationThemeInspiration: getSelectedGenerationThemeInspirationView,
  renderGenerationThemeInspirationDetail: renderGenerationThemeInspirationDetailView,
  renderGenerationThemeInspirationModal: renderGenerationThemeInspirationModalView
} = themeInspirationViewFactory();
${modalHelpersSource}
return {
  openGenerationThemeInspirationModal,
  refreshGenerationThemeInspirations
};`
  )(
    appState,
    { value: 0 },
    (id) => {
      if (id === "generation-theme-inspiration-modal") return modalNode;
      if (id === "generation-theme-inspiration-modal-content") return contentNode;
      if (id === "generation-theme-inspiration-modal-detail") return detailNode;
      if (id === "generation-collection-type-select") return { value: "科普" };
      if (id === "generation-workbench-form") return { querySelector() { return null; } };
      if (id === "generation-theme-inspiration-button") return refreshButton;
      return null;
    },
    () => {},
    (value) => String(value || ""),
    async (_url, options = {}) => {
      requests.push(JSON.parse(options.body));
      return {
        items: [
          {
            themeId: "theme-1",
            themeTitle: "从表达方式讲",
            sourceThemeTitle: "边界感不是冷淡",
            hookAngle: "很多人把边界误解成疏远，其实很常见。",
            whyNow: "这个角度更容易拉出反差。",
            discussionSignal: "高表现内容里反复命中。",
            sourceSignals: ["命中 2 条高表现内容"],
            expandAngles: ["从关系安全感讲"],
            boundaryNotes: ["避免病理化表达"],
            tags: ["身体探索", "情绪反应"],
            prefillBriefing: "写一篇轻松科普，解释边界感为什么不等于冷淡。",
            prefillReferenceTitle: "怎么表达拒绝又不伤人？",
            prefillMaterialText: "关键点：先共情、再说明边界、最后给替代沟通方式。"
          }
        ]
      };
    },
    "/api/generate-theme-inspirations",
    () => ({ generation: "deepseek" }),
    () => [],
    () => "",
    () => [],
    () => {},
    () => {},
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    class TestInputElement {},
    class TestTextAreaElement {},
    class TestSelectElement {},
    () => {},
    () => {},
    new Function(`${themeInspirationViewJs.replace(/export function /g, "function ")}
return {
  getSelectedGenerationThemeInspiration,
  renderGenerationThemeInspirationDetail,
  renderGenerationThemeInspirationModal
};`)
  );

  await helpers.openGenerationThemeInspirationModal();
  await helpers.refreshGenerationThemeInspirations();

  assert.equal(requests.length, 2);
  assert.equal(requests[0].refresh, false);
  assert.equal(requests[1].refresh, true);
});

test("theme inspiration modal shows specific empty and error messages instead of one generic empty state", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const themeInspirationViewJs = await fs.readFile(path.join(process.cwd(), "web/theme-inspiration-view.js"), "utf8");
  const modalHelpersSource = extractSourceBetween(
    appJs,
    "function setGenerationThemeInspirationModalOpen(",
    "function setSampleLibraryImportBlockOpen("
  );

  const appState = {
    generationThemeInspiration: {
      open: true,
      loading: false,
      items: [],
      selectedThemeId: "",
      message: "主题灵感加载失败",
      resultMessage: ""
    }
  };
  const modalNode = { hidden: false };
  const contentNode = { innerHTML: "" };
  const detailNode = { innerHTML: "" };

  const helpers = new Function(
    "appState",
    "byId",
    "syncBodyModalState",
    "escapeHtml",
    "Event",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "themeInspirationViewFactory",
    `const {
  getSelectedGenerationThemeInspiration: getSelectedGenerationThemeInspirationView,
  renderGenerationThemeInspirationDetail: renderGenerationThemeInspirationDetailView,
  renderGenerationThemeInspirationModal: renderGenerationThemeInspirationModalView
} = themeInspirationViewFactory();
${modalHelpersSource}
return { renderGenerationThemeInspirationModal };`
  )(
    appState,
    (id) => {
      if (id === "generation-theme-inspiration-modal") return modalNode;
      if (id === "generation-theme-inspiration-modal-content") return contentNode;
      if (id === "generation-theme-inspiration-modal-detail") return detailNode;
      return null;
    },
    () => {},
    (value) => String(value || ""),
    class TestEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.bubbles = Boolean(init.bubbles);
      }
    },
    class TestInputElement {},
    class TestTextAreaElement {},
    class TestSelectElement {},
    new Function(`${themeInspirationViewJs.replace(/export function /g, "function ")}
return {
  getSelectedGenerationThemeInspiration,
  renderGenerationThemeInspirationDetail,
  renderGenerationThemeInspirationModal
};`)
  );

  helpers.renderGenerationThemeInspirationModal();
  assert.match(contentNode.innerHTML, /主题灵感加载失败/);

  appState.generationThemeInspiration.message = "本次没有生成可直接使用的主题灵感。";
  helpers.renderGenerationThemeInspirationModal();
  assert.match(contentNode.innerHTML, /本次没有生成可直接使用的主题灵感/);
});

test("theme inspiration modal action handlers select cards, apply prefills, and show empty-selection guidance", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const actionHandlerSource = extractSourceBetween(
    appJs,
    '  if (action === "open-style-profile-modal") {',
    '  if (action === "open-false-positive-list-modal") {'
  );
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  const appState = {
    generationThemeInspiration: {
      open: true,
      loading: false,
      items: [
        {
          themeId: "theme-1",
          themeTitle: "主题 1",
          prefillBriefing: "briefing 1",
          prefillTopic: "topic 1"
        }
      ],
      selectedThemeId: "",
      message: "",
      resultMessage: ""
    },
    sampleLibraryPoolsModal: { open: false, tab: "reference", search: "", metricFilters: {} }
  };
  const resultNode = { textContent: "" };
  const generationHintNode = { textContent: "" };
  let refreshCalls = 0;
  let renderCalls = 0;
  let appliedThemeId = "";
  let closeCalls = 0;

  const runAction = new AsyncFunction(
    "appState",
    "button",
    "action",
    "byId",
    "setButtonBusy",
    "openStyleProfileModal",
    "openLexiconWorkspaceModal",
    "focusSampleLibraryRecordFromPools",
    "focusSampleLibraryRecordFromModal",
    "openSampleLibraryDetailModal",
    "closeSampleLibraryPoolsModal",
    "apiJson",
    "syncStyleProfileStateFromPayload",
    "renderSampleLibraryWorkspace",
    "openSampleLibraryImportAdvancedModal",
    "openSampleLibraryBaseModal",
    "openSampleLibraryRecordInlineEditorModal",
    "requestSampleLibraryRecordInlineEditorSwitch",
    "openSampleLibraryDeleteModal",
    "requestCloseSampleLibraryRecordInlineEditorModal",
    "closeLexiconWorkspaceModal",
    "closeGenerationReferenceSearchModal",
    "appendMultipleGenerationMaterialTexts",
    "renderGenerationReferenceSearchModal",
    "getSampleLibraryCalibrationPredictionPrefillSource",
    "buildSampleLibraryCalibrationPredictionFromCurrentState",
    "setSampleLibraryCalibrationPredictionFields",
    "setSampleLibraryCalibrationPrefillMessage",
    "getSampleLibraryReferenceApplicationState",
    "setSampleLibraryModalMessage",
    "applySampleLibraryReferenceFromRetro",
    "getLifecycleSaveRequirementMessage",
    "syncLifecycleResultActions",
    "openPlatformOutcomeModal",
    "openFeedbackRuleQueueModal",
    "splitCSV",
    "uniqueStrings",
    "openFeedbackFalsePositiveModal",
    "refreshGenerationThemeInspirations",
    "renderGenerationThemeInspirationModal",
    "getSelectedGenerationThemeInspiration",
    "applyGenerationThemeInspirationPrefill",
    "closeGenerationThemeInspirationModal",
    `${actionHandlerSource}`
  );

  await runAction(
    appState,
    { dataset: { action: "refresh-generation-theme-inspiration" } },
    "refresh-generation-theme-inspiration",
    (id) => {
      if (id === "generation-theme-inspiration-result") return resultNode;
      if (id === "generation-action-hint") return generationHintNode;
      return null;
    },
    () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    async () => ({}),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => ({ requirementMessage: "" }),
    () => ({}),
    () => {},
    () => {},
    () => ({ canApply: false, requirementMessage: "" }),
    () => {},
    async () => {},
    () => "",
    () => {},
    () => {},
    () => {},
    () => [],
    (items) => [...new Set(items)],
    () => {},
    async () => {
      refreshCalls += 1;
    },
    () => {
      renderCalls += 1;
    },
    () => appState.generationThemeInspiration.items.find((item) => item.themeId === appState.generationThemeInspiration.selectedThemeId) || null,
    (item) => {
      appliedThemeId = item?.themeId || "";
      appState.generationThemeInspiration.open = false;
    },
    () => {
      closeCalls += 1;
      appState.generationThemeInspiration.open = false;
    }
  );

  assert.equal(refreshCalls, 1);

  await runAction(
    appState,
    { dataset: { action: "select-generation-theme-inspiration", themeId: "theme-1" } },
    "select-generation-theme-inspiration",
    (id) => {
      if (id === "generation-theme-inspiration-result") return resultNode;
      if (id === "generation-action-hint") return generationHintNode;
      return null;
    },
    () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    async () => ({}),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => ({ requirementMessage: "" }),
    () => ({}),
    () => {},
    () => {},
    () => ({ canApply: false, requirementMessage: "" }),
    () => {},
    async () => {},
    () => "",
    () => {},
    () => {},
    () => {},
    () => [],
    (items) => [...new Set(items)],
    () => {},
    async () => {},
    () => {
      renderCalls += 1;
    },
    () => appState.generationThemeInspiration.items.find((item) => item.themeId === appState.generationThemeInspiration.selectedThemeId) || null,
    () => {},
    () => {}
  );

  assert.equal(appState.generationThemeInspiration.selectedThemeId, "theme-1");
  assert.ok(renderCalls >= 1);

  await runAction(
    appState,
    { dataset: { action: "apply-generation-theme-inspiration" } },
    "apply-generation-theme-inspiration",
    (id) => {
      if (id === "generation-theme-inspiration-result") return resultNode;
      if (id === "generation-action-hint") return generationHintNode;
      return null;
    },
    () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    async () => ({}),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => ({ requirementMessage: "" }),
    () => ({}),
    () => {},
    () => {},
    () => ({ canApply: false, requirementMessage: "" }),
    () => {},
    async () => {},
    () => "",
    () => {},
    () => {},
    () => {},
    () => [],
    (items) => [...new Set(items)],
    () => {},
    async () => {},
    () => {},
    () => appState.generationThemeInspiration.items.find((item) => item.themeId === appState.generationThemeInspiration.selectedThemeId) || null,
    (item) => {
      appliedThemeId = item?.themeId || "";
      appState.generationThemeInspiration.open = false;
    },
    () => {
      closeCalls += 1;
    }
  );

  assert.equal(appliedThemeId, "theme-1");

  appState.generationThemeInspiration.selectedThemeId = "";
  await runAction(
    appState,
    { dataset: { action: "apply-generation-theme-inspiration" } },
    "apply-generation-theme-inspiration",
    (id) => {
      if (id === "generation-theme-inspiration-result") return resultNode;
      if (id === "generation-action-hint") return generationHintNode;
      return null;
    },
    () => {},
    async () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    async () => ({}),
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => {},
    () => ({ requirementMessage: "" }),
    () => ({}),
    () => {},
    () => {},
    () => ({ canApply: false, requirementMessage: "" }),
    () => {},
    async () => {},
    () => "",
    () => {},
    () => {},
    () => {},
    () => [],
    (items) => [...new Set(items)],
    () => {},
    async () => {},
    () => {},
    () => null,
    () => {
      throw new Error("should not apply when nothing is selected");
    },
    () => {}
  );

  assert.match(generationHintNode.textContent, /请先选择一张主题灵感卡片/);
  assert.equal(closeCalls, 0);
});
