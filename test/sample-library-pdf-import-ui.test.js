import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("sample library frontend wires parse and commit flows for PDF imports", async () => {
  const appJs = await fs.readFile(new URL("../web/app.js", import.meta.url), "utf8");
  const requirementStart = appJs.indexOf("function getSampleLibraryImportCardRequirementMessage(card)");
  const requirementEnd = appJs.indexOf("function syncSampleLibraryImportCardActions(card)", requirementStart);
  const requirementSource = appJs.slice(requirementStart, requirementEnd);
  const commitStart = appJs.indexOf("async function commitSampleLibraryImportCard(card)");
  const commitEnd = appJs.indexOf("function syncSampleLibraryCreateButtonLabel()", commitStart);
  const commitSource = appJs.slice(commitStart, commitEnd);
  const importButtonStart = appJs.indexOf('byId("sample-library-import-button").addEventListener("click", () => {');
  const importButtonEnd = appJs.indexOf('byId("sample-library-import-input").addEventListener("change"', importButtonStart);
  const importButtonSource = appJs.slice(importButtonStart, importButtonEnd);

  assert.match(appJs, /const sampleLibraryPdfImportParseApi = "\/api\/sample-library\/pdf-import\/parse"/);
  assert.match(appJs, /const sampleLibraryPdfImportCommitApi = "\/api\/sample-library\/pdf-import\/commit"/);
  assert.match(appJs, /sampleLibraryImportDrafts:\s*\[\s*\]/);
  assert.match(appJs, /async function fileToBase64\(file\)/);
  assert.match(appJs, /file\.arrayBuffer\(\)/);
  assert.match(appJs, /async function parseSampleLibraryPdfFiles\(files = \[\]\)/);
  assert.match(appJs, /apiJson\(sampleLibraryPdfImportParseApi/);
  assert.match(appJs, /function renderSampleLibraryImportDrafts\(items = \[\]\)/);
  assert.match(appJs, /sample-library-import-result/);
  assert.match(appJs, /data-import-index/);
  assert.match(appJs, /name="collectionType"/);
  assert.match(appJs, /name="coverText"/);
  assert.match(appJs, /sample-library-import-advanced/);
  assert.match(appJs, /sample-library-import-advanced-summary/);
  assert.match(appJs, /name="referenceEnabled"/);
  assert.match(appJs, /name="referenceTier"/);
  assert.match(appJs, /name="referenceNotes"/);
  assert.match(appJs, /name="publishStatus"/);
  assert.match(appJs, /name="publishedAt"/);
  assert.match(appJs, /name="platformReason"/);
  assert.match(appJs, /name="publishNotes"/);
  assert.match(appJs, /sample-library-import-tag-picker/);
  assert.match(appJs, /sample-library-import-tag-trigger/);
  assert.match(appJs, /sample-library-import-tag-dropdown/);
  assert.match(appJs, /sample-library-import-tag-custom/);
  assert.match(appJs, /function syncSampleLibraryImportCardReferenceSectionState\(/);
  assert.match(appJs, /function syncSampleLibraryImportCardAdvancedSummary\(/);
  assert.match(appJs, /function initializeSampleLibraryImportTagPickers\(\)/);
  assert.match(appJs, /function writeSampleLibraryImportCardTags\(/);
  assert.match(appJs, /function buildSampleLibraryImportDuplicateKey\(/);
  assert.match(appJs, /function getSampleLibraryImportCardDuplicateMessage\(card\)/);
  assert.match(appJs, /async function commitSampleLibraryImportCard\(card\)/);
  assert.match(appJs, /apiJson\(sampleLibraryPdfImportCommitApi/);
  assert.match(appJs, /sample-library-import-input"\)\.addEventListener\("change"/);
  assert.match(appJs, /sample-library-import-button"\)\.addEventListener\("click"/);
  assert.match(appJs, /sample-library-import-single-commit/);

  assert.equal(requirementStart > -1, true);
  assert.match(requirementSource, /if \(!card\)/);
  assert.match(requirementSource, /title/);
  assert.match(requirementSource, /coverText/);
  assert.match(requirementSource, /body/);
  assert.match(requirementSource, /collectionType/);
  assert.match(requirementSource, /getSampleLibraryImportCardDuplicateMessage\(card\)/);
  assert.match(requirementSource, /请先填写标题、封面文案、正文和合集类型/);
  assert.match(requirementSource, /重复/);

  assert.equal(commitStart > -1, true);
  assert.match(commitSource, /const requirementMessage = getSampleLibraryImportCardRequirementMessage\(card\)/);
  assert.match(commitSource, /throw new Error\(requirementMessage\)/);
  assert.match(commitSource, /readSampleLibraryImportCardTags\(card\)/);
  assert.match(commitSource, /selected: true/);
  assert.match(commitSource, /coverText: card\.querySelector\('\[name="coverText"\]'\)\?\.value \|\| ""/);
  assert.match(commitSource, /referenceEnabled: card\.querySelector\('\[name="referenceEnabled"\]'\)\?\.checked === true/);
  assert.match(commitSource, /referenceTier: card\.querySelector\('\[name="referenceTier"\]'\)\?\.value \|\| ""/);
  assert.match(commitSource, /referenceNotes: card\.querySelector\('\[name="referenceNotes"\]'\)\?\.value \|\| ""/);
  assert.match(commitSource, /publishStatus: card\.querySelector\('\[name="publishStatus"\]'\)\?\.value \|\| "not_published"/);
  assert.match(commitSource, /publishedAt: card\.querySelector\('\[name="publishedAt"\]'\)\?\.value \|\| ""/);
  assert.match(commitSource, /platformReason: card\.querySelector\('\[name="platformReason"\]'\)\?\.value \|\| ""/);
  assert.match(commitSource, /publishNotes: card\.querySelector\('\[name="publishNotes"\]'\)\?\.value \|\| ""/);

  assert.equal(importButtonStart > -1, true);
  assert.match(importButtonSource, /setSampleLibraryImportBlockOpen\(true\)/);
  assert.ok(
    importButtonSource.indexOf("setSampleLibraryImportBlockOpen(true);") <
      importButtonSource.indexOf('byId("sample-library-import-input").click();'),
    "expected import disclosure to open before file selection"
  );

  assert.match(appJs, /class="tag-picker field-wide sample-library-import-tag-picker"/);
  assert.match(appJs, /name="tags" type="hidden"/);
  assert.match(appJs, /class="tag-picker-trigger sample-library-import-tag-trigger"/);
  assert.match(appJs, /class="tag-picker-dropdown sample-library-import-tag-dropdown"/);
  assert.match(appJs, /data-action="sample-library-import-single-commit"/);
  assert.match(appJs, /<span>封面文案<\/span>/);
  assert.match(appJs, /<summary class="sample-library-import-advanced-summary">/);
  assert.match(appJs, /高级属性/);
  assert.match(appJs, /参考属性/);
  assert.match(appJs, /生命周期属性/);
  assert.match(appJs, /value="\$\{escapeHtml\(item\?\.title \|\| ""\)\}"/);
  assert.match(appJs, /sample-library-import-card-hint/);
});
