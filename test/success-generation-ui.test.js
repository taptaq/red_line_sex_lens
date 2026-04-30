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
  const sampleLibraryPaneHtml = extractElementInnerHtml(indexHtml, 'id="sample-library-pane"');
  const sampleLibraryWorkspaceHtml = extractElementInnerHtml(sampleLibraryPaneHtml, "sample-library-workspace");
  const createButtonMatches = sampleLibraryPaneHtml.match(/id="sample-library-create-button"/g) || [];

  assert.equal(createButtonMatches.length, 1, "expected one primary sample library create action in the pane");
  assert.match(sampleLibraryPaneHtml, /id="sample-library-create-button"/);
  assert.match(sampleLibraryPaneHtml, /aria-controls="sample-library-create-form-shell"/);
  assert.match(sampleLibraryPaneHtml, /aria-expanded="false"/);
  assert.match(indexHtml, /新增样本记录/);
  assert.match(indexHtml, /id="sample-library-search-input"/);
  assert.match(indexHtml, /id="sample-library-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-filter"/);
  assert.match(indexHtml, /id="sample-library-collection-type-select"/);
  assert.match(indexHtml, /name="collectionType"/);
  assert.match(indexHtml, /id="analyze-collection-type-select"/);
  assert.match(indexHtml, /id="generation-collection-type-select"/);
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
  assert.match(indexHtml, /id="style-profile-result"/);
  assert.match(indexHtml, /id="analyze-action-hint"/);
  assert.match(indexHtml, /id="feedback-action-hint"/);
  assert.match(indexHtml, /id="generation-action-hint"/);
  assert.match(indexHtml, /id="rewrite-pair-action-hint"/);
  assert.match(indexHtml, /id="sample-library-create-action-hint"/);
  assert.match(indexHtml, /id="style-profile-action-hint"/);

  assert.doesNotMatch(indexHtml, /data-sample-library-tab-target=/);
  assert.doesNotMatch(indexHtml, /id="success-sample-form"/);
  assert.doesNotMatch(indexHtml, /id="note-lifecycle-list"/);
  assert.doesNotMatch(indexHtml, /sample-library-tab-strip/);

  assert.match(appJs, /\/api\/sample-library/);
  assert.match(appJs, /collectionType:\s*String\(form\.get\("collectionType"\)/);
  assert.match(appJs, /sampleLibraryRecords:\s*\[\s*\]/);
  assert.match(appJs, /sampleLibraryCollectionFilter:\s*"all"/);
  assert.match(appJs, /selectedSampleLibraryRecordId:\s*""/);
  assert.match(appJs, /sampleLibraryFilter:\s*"all"/);
  assert.match(appJs, /sampleLibrarySearch:\s*""/);
  assert.match(appJs, /function\s+filterSampleLibraryRecords\s*\(/);
  assert.match(appJs, /function\s+getSelectedSampleLibraryRecord\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryList\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryDetail\s*\(/);
  assert.match(appJs, /function\s+renderSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /function\s+refreshSampleLibraryWorkspace\s*\(/);
  assert.match(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
  assert.match(appJs, /function\s+getAnalyzeActionRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncFeedbackActions\s*\(/);
  assert.match(appJs, /function\s+getGenerationRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncGenerationActions\s*\(/);
  assert.match(appJs, /function\s+getRewritePairRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncRewritePairActions\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryCreateRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryCreateActions\s*\(/);
  assert.match(appJs, /function\s+getStyleProfileDraftRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncStyleProfileDraftActions\s*\(/);
  assert.match(appJs, /function\s+setActionGateHint\s*\(/);
  assert.match(appJs, /add-sample-library-to-benchmark/);
  assert.match(appJs, /add-false-positive-to-benchmark/);
  assert.match(appJs, /benchmarkSourceLabel/);
  assert.match(appJs, /样本已存在，未重复加入/);
  assert.match(appJs, /review-benchmark-pane/);

  assert.match(styles, /\.sample-library-workspace/);
  assert.match(styles, /\.sample-library-record-list/);
  assert.match(styles, /\.sample-library-detail/);
  assert.match(styles, /\.shell\s*\{/);
  assert.match(styles, /width:\s*min\(1600px,\s*calc\(100% - 2\.4rem\)\)/);
  assert.match(styles, /\.form-grid\s*\{/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(220px,\s*1fr\)\)/);
  assert.match(styles, /\.meta-pill\s*\{/);
  assert.match(styles, /white-space:\s*normal/);
  assert.match(styles, /\.sample-library-detail-topbar\s*\{/);
  assert.match(styles, /\.sample-library-detail-topbar > \*\s*\{/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(styles, /min-width:\s*0/);
  assert.match(styles, /\.sample-library-detail-topbar\s+\.item-actions\s*\{/);
  assert.match(styles, /justify-content:\s*flex-start/);
  assert.match(styles, /\.lifecycle-update-grid\s*\{/);
  assert.match(appJs, /class="lifecycle-primary-grid"/);
  assert.match(appJs, /class="lifecycle-metrics-grid"/);
  assert.match(styles, /\.lifecycle-primary-grid\s*\{/);
  assert.match(styles, /\.lifecycle-metrics-grid\s*\{/);
  assert.match(styles, /grid-template-columns:\s*minmax\(220px,\s*1\.1fr\)\s*minmax\(180px,\s*0\.9fr\)/);
  assert.match(styles, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(140px,\s*1fr\)\)/);
  assert.match(styles, /\.workflow-assistant-actions\s+\.button\s*\{/);
  assert.match(styles, /white-space:\s*normal/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /\.lifecycle-update-grid > \*\s*\{/);
  assert.match(styles, /\.workspace-support\s*>\s*\*\s*\{/);
  assert.match(styles, /\.tab-panels/);
  assert.match(styles, /\.tab-panel/);
  assert.match(styles, /\.sample-library-workspace\s*>\s*\*/);
  assert.match(styles, /\.sample-library-detail\s*>\s*\*/);
  assert.match(styles, /max-width:\s*100%/);
  assert.match(styles, /\.action-gate-hint\s*\{/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)/);
  assert.match(styles, /\.tag-picker-selected\s*\{[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.tag-picker-selected\s*\{[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.tag-picker-selected\s*\{[\s\S]*mask-image:\s*none;/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.workflow-timeline\s*\{[\s\S]*repeat\(auto-fit,\s*minmax\(120px,\s*1fr\)\)/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*display:\s*grid;/);
  assert.match(styles, /@media\s*\(max-width:\s*1360px\)\s*\{[\s\S]*\.item-actions\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(180px,\s*1fr\)\)/);
});

test("sample library create button toggles with explicit expanded state and scroll feedback", async () => {
  const { appJs } = await readFrontendFiles();

  assert.match(appJs, /function\s+setSampleLibraryCreateFormOpen\s*\(/);
  assert.match(appJs, /button\.setAttribute\("aria-expanded",\s*String\(!nextHidden\)\)/);
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
  assert.match(appJs, /function\s+syncSampleLibraryDetailActions\s*\(/);
  assert.match(appJs, /function\s+getLifecycleSaveRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncLifecycleResultActions\s*\(/);

  assert.match(appJs, /id="sample-library-base-action-hint"/);
  assert.match(appJs, /id="sample-library-reference-action-hint"/);
  assert.match(appJs, /id="sample-library-lifecycle-action-hint"/);
  assert.match(appJs, /id="analysis-lifecycle-action-hint"/);
  assert.match(appJs, /id="rewrite-lifecycle-action-hint"/);
  assert.match(appJs, /id="generation-lifecycle-action-hint"/);

  assert.match(appJs, /setActionGateHint\("sample-library-base-action-hint",\s*baseMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-reference-action-hint",\s*referenceMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-lifecycle-action-hint",\s*lifecycleMessage\)/);
  assert.match(appJs, /setActionGateHint\("analysis-lifecycle-action-hint",\s*analysisMessage\)/);
  assert.match(appJs, /setActionGateHint\("rewrite-lifecycle-action-hint",\s*rewriteMessage\)/);
  assert.match(appJs, /setActionGateHint\("generation-lifecycle-action-hint",\s*generationMessage\)/);

  assert.match(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("input",\s*syncSampleLibraryDetailActions\)/);
  assert.match(appJs, /byId\("sample-library-detail"\)\?\.addEventListener\("change",\s*syncSampleLibraryDetailActions\)/);
  assert.match(appJs, /renderSampleLibraryDetail\(selectedRecord\);[\s\S]*syncSampleLibraryDetailActions\(\)/);
  assert.match(appJs, /renderAnalysis\(result[\s\S]*analysis-lifecycle-action-hint/);
  assert.match(appJs, /renderRewriteResult\(result\)[\s\S]*rewrite-lifecycle-action-hint/);
  assert.match(appJs, /renderGenerationResult\(result = \{\}\)[\s\S]*generation-lifecycle-action-hint/);
});

test("frontend also gates prefill and lexicon submit actions that depend on prerequisite content", async () => {
  const { indexHtml, appJs } = await readFrontendFiles();

  assert.match(indexHtml, /id="rewrite-pair-prefill-hint"/);
  assert.match(indexHtml, /id="sample-library-prefill-action-hint"/);
  assert.match(indexHtml, /id="custom-lexicon-action-hint"/);
  assert.match(indexHtml, /id="seed-lexicon-action-hint"/);

  assert.match(appJs, /function\s+getRewritePairPrefillRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryPrefillAnalysisRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+getSampleLibraryPrefillRewriteRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncSampleLibraryPrefillActions\s*\(/);
  assert.match(appJs, /function\s+getLexiconRequirementMessage\s*\(/);
  assert.match(appJs, /function\s+syncLexiconFormActions\s*\(/);

  assert.match(appJs, /setActionGateHint\("rewrite-pair-prefill-hint",\s*requirementMessage\)/);
  assert.match(appJs, /setActionGateHint\("sample-library-prefill-action-hint",\s*analysisMessage \|\| rewriteMessage\)/);
  assert.match(appJs, /setActionGateHint\("custom-lexicon-action-hint",\s*customMessage\)/);
  assert.match(appJs, /setActionGateHint\("seed-lexicon-action-hint",\s*seedMessage\)/);

  assert.match(appJs, /byId\("custom-lexicon-form"\)\.addEventListener\("input",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("custom-lexicon-form"\)\.addEventListener\("change",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("seed-lexicon-form"\)\.addEventListener\("input",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /byId\("seed-lexicon-form"\)\.addEventListener\("change",\s*syncLexiconFormActions\)/);
  assert.match(appJs, /syncRewritePairPrefillButton\(\);[\s\S]*syncSampleLibraryPrefillActions\(\);[\s\S]*syncLexiconFormActions\(\)/);
});
