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

function extractSourceBetween(source, startMarker, endMarker) {
  const startIndex = source.indexOf(startMarker);
  assert.notEqual(startIndex, -1, `expected ${startMarker} to exist`);

  const endIndex = source.indexOf(endMarker, startIndex);
  assert.notEqual(endIndex, -1, `expected ${endMarker} after ${startMarker}`);

  return source.slice(startIndex, endIndex);
}

test("frontend exposes a list-first sample library workspace with one primary create action", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
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
  assert.match(appJs, /<select name="collectionType">/);
  assert.match(appJs, /name="views"/);
  assert.match(appJs, /name="shares"/);
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
  assert.doesNotMatch(indexHtml, /<details id="support-workspace-panel"[^>]*\sopen[>\s]/);
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
  assert.match(sampleLibraryPaneHtml, /id="sample-library-daily-panel"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-reflow-panel"/);
  assert.match(sampleLibraryPaneHtml, /回流待处理区/);
  assert.match(sampleLibraryPaneHtml, /待优先处理/);
  assert.match(sampleLibraryPaneHtml, /违规反馈/);
  assert.match(sampleLibraryPaneHtml, /误报案例/);
  assert.match(sampleLibraryPaneHtml, /id="feedback-priority-list"/);
  assert.match(sampleLibraryPaneHtml, /id="feedback-log-secondary-list"/);
  assert.match(sampleLibraryPaneHtml, /id="false-positive-summary"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="false-positive-pending-list"/);
  assert.doesNotMatch(sampleLibraryPaneHtml, /id="false-positive-history-list"/);
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
  assert.match(appJs, /function\s+openStyleProfileModal\s*\(/);
  assert.match(appJs, /function\s+buildStyleProfileModalMarkup\s*\(/);
  assert.match(appJs, /function\s+saveStyleProfileModal\s*\(/);
  assert.match(appJs, /function\s+buildStyleProfileGenerationLabel\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryCreateRequirementMessage\s*\(/);
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
  assert.doesNotMatch(appJs, /if \(action === "open-custom-lexicon"\)/);
  assert.doesNotMatch(appJs, /if \(action === "open-seed-lexicon"\)/);
  assert.match(appJs, /if \(summaryAction\)/);
  assert.match(appJs, /await handleSummaryAction\(summaryAction\.dataset\.summaryAction\)/);
  assert.match(appJs, /ensureSupportWorkspaceOpen\(\);[\s\S]*byId\("review-queue"\)\?\.scrollIntoView/);
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
  assert.match(appJs, /从当前检测预填预判/);
  assert.match(appJs, /setSampleLibraryCalibrationPredictionFields\(/);
  assert.match(appJs, /function\s+openSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryRecordInlineEditorModal\s*\(/);
  assert.match(appJs, /kind:\s*"record-list-inline-editor"/);
  assert.match(appJs, /function ensureSupportWorkspaceOpen\(/);
  assert.match(appJs, /styleProfile:\s*adminData\.styleProfile && typeof adminData\.styleProfile === "object" \? adminData\.styleProfile : null/);
  assert.match(appJs, /sourceSamples\.map/);
  assert.match(appJs, /formatDate\(current\?\.updatedAt\)/);
  assert.match(appJs, /优先使用通义千问、Kimi、深度求索生成画像，失败后回退到本地规则汇总/);
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
  assert.match(appJs, /class="lifecycle-primary-grid"/);
  assert.match(appJs, /class="lifecycle-metrics-grid"/);
  assert.match(appJs, /<span>浏览数<\/span>/);
  assert.match(appJs, /<span>分享数<\/span>/);
  assert.match(appJs, /浏览 \${escapeHtml\(String\(publish\.metrics\.views \|\| 0\)\)}/);
  assert.match(appJs, /分享 \${escapeHtml\(String\(publish\.metrics\.shares \|\| 0\)\)}/);
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
  assert.ok(
    refreshAllSource.indexOf("await refreshSampleLibraryWorkspace();") < refreshAllSource.indexOf("renderSummary(appState.summaryData);"),
    "expected refreshAll to update sample library state before rendering summary"
  );
  assert.match(refreshAllSource, /const hasExistingSummary = Boolean\(appState\.summaryData\)/);
  assert.match(refreshAllSource, /const summaryPhase = hasExistingSummary \? "refresh" : "initial";/);
  assert.match(refreshAllSource, /setSummaryLoadingState\(summaryPhase\)/);
  assert.match(refreshAllSource, /if \(summaryPhase === "initial"\) \{\s*renderSummaryLoadingPlaceholders\(\);/);
});

test("sample library list and summary area show loading placeholders before first data sync", async () => {
  const appJs = await fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8");
  const renderSampleLibraryListSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryList(",
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
    "getSampleLibraryRecordPreviewItems",
    "sampleLibraryFilterLabel",
    "sampleLibraryCollectionFilterLabel",
    "buildSampleLibraryRecordCardMarkup",
    "isSampleLibraryInitialLoading",
    "buildAdminDataLoadingBlockMarkup",
    `${renderSampleLibraryListSource}; return renderSampleLibraryList;`
  )(
    (id) => nodes[id] || null,
    appState,
    (items) => items.slice(0, 3),
    () => "全部记录",
    () => "全部合集",
    () => "",
    () => appState.sampleLibraryLoading.phase === "initial",
    (_message, { count = 2 } = {}) => `<div class="loading-block">加载中 ${count}</div>`
  );

  renderSampleLibraryListWithState([]);

  assert.equal(nodes["sample-library-list-count"].textContent, "加载中...");
  assert.equal(nodes["sample-library-record-preview-open-button"].hidden, true);
  assert.match(nodes["sample-library-record-list"].innerHTML, /加载中/);
  assert.doesNotMatch(nodes["sample-library-record-list"].innerHTML, /当前没有样本记录/);

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
  const { indexHtml, appJs } = await readFrontendFiles();
  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');
  const previewHelperSource = extractSourceBetween(
    appJs,
    "function getSampleLibraryRecordPreviewItems(",
    "function renderSampleLibraryList("
  );
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
    appJs,
    "function buildSampleLibraryRecordListModalMarkup(",
    "function renderSampleLibraryRecordListModal("
  );
  const focusSource = extractSourceBetween(
    appJs,
    "function focusSampleLibraryRecordFromModal(",
    "function renderSampleLibraryCalibrationReplayResult("
  );

  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-list"/);
  assert.match(sampleLibraryPaneHtml, /id="sample-library-record-preview-open-button"/);
  assert.match(sampleLibraryPaneHtml, /查看全部记录列表/);
  assert.match(appJs, /const SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT = 3/);
  assert.match(appJs, /function\s+getSampleLibraryRecordPreviewItems\s*\(/);
  assert.doesNotMatch(appJs, /function\s+openSampleLibraryRecordListModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryRecordListModalMarkup\s*\(/);
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

  const getSampleLibraryRecordPreviewItems = new Function(
    "appState",
    "SAMPLE_LIBRARY_RECORD_PREVIEW_LIMIT",
    `${previewHelperSource}; return getSampleLibraryRecordPreviewItems;`
  )({ selectedSampleLibraryRecordId: "record-1" }, 3);

  const previewItems = getSampleLibraryRecordPreviewItems(filteredItems);

  assert.deepEqual(
    previewItems.map((item) => item.id),
    ["record-2", "record-3", "record-4"],
    "expected preview to keep the first three publish-time-desc records"
  );

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
  const { appJs, styles } = await readFrontendFiles();
  const openInlineEditorSource = extractSourceBetween(
    appJs,
    "function openSampleLibraryRecordInlineEditorModal(",
    "function buildSampleLibraryRecordInlineEditorDraft("
  );
  const inlineEditorSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorModalMarkup(",
    "function renderSampleLibraryRecordInlineEditorModal("
  );
  const sidebarSource = extractSourceBetween(
    appJs,
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
  assert.match(appJs, /function\s+buildSampleLibraryRecordInlineEditorModalMarkup\s*\(/);
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
  const { appJs } = await readFrontendFiles();
  const renderModalSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorModal(",
    "function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup("
  );
  const switchConfirmMarkupSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorSwitchConfirmModalMarkup(",
    "function renderSampleLibraryRecordInlineEditorSwitchConfirmModal("
  );
  const switchConfirmRenderSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorSwitchConfirmModal(",
    "function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup("
  );
  const closeConfirmMarkupSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorCloseConfirmModalMarkup(",
    "function renderSampleLibraryRecordInlineEditorCloseConfirmModal("
  );
  const closeConfirmRenderSource = extractSourceBetween(
    appJs,
    "function renderSampleLibraryRecordInlineEditorCloseConfirmModal(",
    "function requestSampleLibraryRecordInlineEditorSwitch("
  );
  const draftHelperSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorDraft(",
    "function buildSampleLibraryRecordInlineEditorPatchPayload("
  );
  const payloadHelperSource = extractSourceBetween(
    appJs,
    "function buildSampleLibraryRecordInlineEditorPatchPayload(",
    "function isSampleLibraryRecordInlineEditorDirty("
  );
  const dirtyHelperSource = extractSourceBetween(
    appJs,
    "function isSampleLibraryRecordInlineEditorDirty(",
    "function filterSampleLibraryRecordInlineEditorItems("
  );
  const filterItemsHelperSource = extractSourceBetween(
    appJs,
    "function filterSampleLibraryRecordInlineEditorItems(",
    "function buildSampleLibraryRecordInlineEditorSidebarMarkup("
  );
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
    "function buildSampleLibraryReferenceEditorSectionMarkup("
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
      "纸片人"
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
  const { appJs } = await readFrontendFiles();
  const actionMarkupStart = appJs.indexOf("function buildSamplePoolActionMarkup(record = {}, pool = \"reference\") {");
  const actionMarkupEnd = appJs.indexOf("function renderSampleLibraryPoolsModal", actionMarkupStart);
  const actionMarkupSource = appJs.slice(actionMarkupStart, actionMarkupEnd);

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
  const { indexHtml, appJs, styles } = await readFrontendFiles();
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
  assert.match(appJs, /sample-pool-why-helper/);
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
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+buildSampleLibraryModalTagPickerMarkup\s*\(/);
  assert.match(appJs, /function\s+initializeSampleLibraryModalTagPicker\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryModalTagOptions\s*\(/);
  assert.match(appJs, /function\s+writeSampleLibraryModalTags\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryCreateModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openSampleLibraryCreateModal\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryCreateModal\s*\(/);
  assert.match(appJs, /function\s+fillSampleLibraryCreateModalFromCurrent\s*\(/);
  assert.match(appJs, /class="tag-picker field-wide sample-library-modal-tag-picker"/);
  assert.match(appJs, /name="tags" type="hidden"/);
  assert.match(appJs, /class="tag-picker-trigger sample-library-modal-tag-trigger"/);
  assert.match(appJs, /class="tag-picker-dropdown sample-library-modal-tag-dropdown"/);
  assert.match(appJs, /sample-library-modal-tag-custom/);
  assert.match(appJs, /renderSampleLibraryModalTagOptions\(\)[\s\S]*uniqueStrings\(analyzeTagOptions\)/);
  assert.match(appJs, /byId\("sample-library-create-button"\)\.addEventListener\("click", openSampleLibraryCreateModal\)/);
  assert.match(appJs, /openSampleLibraryCreateModal\(\)/);
  assert.doesNotMatch(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
});

test("sample library base editing and record deletion now route through modal confirmations", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+buildSampleLibraryBaseModalMarkup\s*\(/);
  assert.match(appJs, /function\s+readSampleLibraryModalBasePayload\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryDetailBaseModal\s*\(/);
  assert.match(appJs, /function\s+buildSampleLibraryDeleteModalMarkup\s*\(/);
  assert.match(appJs, /function\s+saveSampleLibraryDeleteModal\s*\(/);
  assert.match(appJs, /data-action="open-sample-library-base-modal"/);
  assert.match(appJs, /data-action="open-sample-library-delete-modal"/);
  assert.match(appJs, /if \(action === "open-sample-library-base-modal"\)/);
  assert.match(appJs, /if \(action === "open-sample-library-delete-modal"\)/);
  assert.doesNotMatch(appJs, /data-action="save-sample-library-base"/);
});

test("frontend gates secondary sample-library and lifecycle-save actions with inline hints", async () => {
  const { appJs } = await readFrontendFiles();
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
  assert.match(appJs, /id="analysis-lifecycle-action-hint"/);
  assert.match(appJs, /id="rewrite-lifecycle-action-hint"/);

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
  assert.match(styles, /\.sample-library-calibration-pill/);
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
  assert.match(indexHtml, /加入白名单、加入违规词库或删除/);
  assert.match(appJs, /白名单生效预演/);
  assert.match(appJs, /违规词库生效预演/);
  assert.match(appJs, /建议加入宽松白名单/);
  assert.match(appJs, /建议加入违规词库：/);
  assert.match(appJs, /\? "加入白名单" : "加入违规词库"/);
  assert.doesNotMatch(appJs, /按建议入库/);
});

test("frontend also surfaces T+7 retro reminders in the manual review queue area", async () => {
  const { appJs, styles } = await readFrontendFiles();

  assert.match(appJs, /function\s+getManualReviewRetroReminderQueueItems\s*\(/);
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
    /\.queue-panel\s*\{[\s\S]*?min-height:\s*980px;[\s\S]*?height:\s*100%;[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;[\s\S]*?\}/
  );
  assert.match(
    styles,
    /\.queue-panel \.queue\s*\{[\s\S]*?flex:\s*1 1 auto;[\s\S]*?min-height:\s*0;[\s\S]*?height:\s*100%;[\s\S]*?overflow:\s*auto;[\s\S]*?\}/
  );
  assert.match(
    styles,
    /@media \(max-width:\s*900px\)\s*\{[\s\S]*?\.queue-panel \.queue\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?max-height:\s*70vh;[\s\S]*?\}/
  );
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
  assert.match(generationSource, /generation-publish-copy-hint/);
  assert.match(generationSource, /repairSummary\.title/);
  assert.match(generationSource, /repairSummary\.description/);
  assert.doesNotMatch(generationSource, /data-action="save-lifecycle-generation"/);
  assert.doesNotMatch(generationSource, /buildPlatformOutcomeActions\("generation"/);
  assert.match(styles, /\.generation-blocker-box\s*\{/);
  assert.match(styles, /\.generation-blocker-box ul\s*\{/);
  assert.match(
    styles,
    /\.generation-candidate-card\.is-recommended \.rewrite-body-reader\s*\{[\s\S]*max-height:\s*none;[\s\S]*overflow:\s*visible;/
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
  assert.match(appJs, /function buildInnerSpaceTermsListMarkup\s*\(/);
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
  const { appJs } = await readFrontendFiles();
  const analysisStart = appJs.indexOf("function renderAnalysis(");
  const rewriteStart = appJs.indexOf("function renderRewriteResult(", analysisStart);
  const generationStart = appJs.indexOf("function renderGenerationResult(");
  const generationEnd = appJs.indexOf("function buildLexiconEntry(", generationStart);
  const analysisSource = appJs.slice(analysisStart, rewriteStart);
  const rewriteSource = appJs.slice(rewriteStart, appJs.indexOf("function buildCrossReviewMarkup(", rewriteStart));

  assert.match(appJs, /function\s+buildPlatformOutcomeActions\s*\(/);
  assert.match(appJs, /function\s+buildPlatformOutcomeModalMarkup\s*\(/);
  assert.match(appJs, /function\s+openPlatformOutcomeModal\s*\(/);
  assert.match(appJs, /function\s+savePlatformOutcomeModal\s*\(/);
  assert.match(appJs, /function\s+savePlatformOutcomeFromCurrent\s*\(/);
  assert.match(analysisSource, /buildPlatformOutcomeActions\("analysis"\)/);
  assert.match(rewriteSource, /buildPlatformOutcomeActions\("rewrite"\)/);
  assert.doesNotMatch(appJs, /buildPlatformOutcomeActions\("generation"/);
  assert.match(appJs, /data-action="save-platform-outcome"/);
  assert.match(appJs, /平台通过/);
  assert.match(appJs, /平台违规/);
  assert.match(appJs, /效果好/);
  assert.match(appJs, /效果一般/);
  assert.match(appJs, /系统误判/);
  assert.match(appJs, /name="platformOutcomeViews"/);
  assert.match(appJs, /name="platformOutcomeShares"/);
  assert.match(appJs, /name="platformOutcomeNotes"/);
  assert.match(appJs, /publishStatus:\s*button\.dataset\.publishStatus/);
  assert.match(appJs, /openPlatformOutcomeModal\(\{/);
  assert.match(appJs, /views:\s*payload\.views \|\| 0/);
  assert.match(appJs, /shares:\s*payload\.shares \|\| 0/);
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

  assert.doesNotMatch(indexHtml, /legacy-lexicon-workspace/);
  assert.doesNotMatch(indexHtml, /id="custom-lexicon-form"/);
  assert.doesNotMatch(indexHtml, /id="seed-lexicon-form"/);
  assert.doesNotMatch(indexHtml, /id="inner-space-terms-form"/);

  assert.match(appJs, /function\s+getSampleLibraryPrefillAnalysisRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryPrefillRewriteRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryPrefillActions\s*\(/);
  assert.match(appJs, /data-action="prefill-sample-library-create-analysis"/);
  assert.match(appJs, /data-action="prefill-sample-library-create-rewrite"/);
  assert.match(appJs, /async function\s+submitLexiconWorkspaceLexiconForm\s*\(/);
  assert.match(appJs, /async function\s+submitLexiconWorkspaceInnerSpaceForm\s*\(/);
  assert.match(appJs, /function buildLexiconWorkspaceLexiconFormMarkup\s*\(/);
  assert.match(appJs, /data-lexicon-workspace-form="inner-space"/);

  assert.match(appJs, /setActionGateHint\("sample-library-prefill-action-hint",\s*analysisMessage \|\| rewriteMessage\)/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("submit"/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("input"/);
  assert.match(appJs, /byId\("lexicon-workspace-modal-content"\)\?\.addEventListener\("change"/);
});
