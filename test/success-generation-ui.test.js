import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend groups sample-related maintenance panels under one sample library pane and keeps generation workbench controls", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="generation-workbench-form"/);
  assert.match(indexHtml, /id="workflow-assistant"/);
  assert.match(indexHtml, /id="workflow-assistant-actions"/);
  assert.match(indexHtml, /id="generation-style-profile-select"/);
  assert.match(indexHtml, /id="success-sample-form"/);
  assert.match(indexHtml, /data-tab-target="sample-library-pane"/);
  assert.match(indexHtml, /id="sample-library-pane"/);
  assert.match(indexHtml, /id="success-samples-pane"/);
  assert.match(indexHtml, /id="note-lifecycle-pane"/);
  assert.match(indexHtml, /id="style-profile-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-success-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-lifecycle-pane"/);
  assert.match(indexHtml, /data-sample-library-tab-target="sample-library-style-pane"/);
  assert.match(indexHtml, />\s*参考样本\s*</);
  assert.match(indexHtml, />\s*生命周期\s*</);
  assert.match(indexHtml, />\s*风格画像\s*</);
  assert.doesNotMatch(indexHtml, /data-tab-target="success-samples-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="note-lifecycle-pane"/);
  assert.doesNotMatch(indexHtml, /data-tab-target="style-profile-pane"/);
  assert.match(appJs, /\/api\/generate-note/);
  assert.match(appJs, /\/api\/success-samples/);
  assert.match(appJs, /\/api\/note-lifecycle/);
  assert.match(appJs, /save-lifecycle-generation/);
  assert.match(appJs, /finalDraft/);
  assert.match(appJs, /\/api\/style-profile\/draft/);
  assert.match(appJs, /activate-style-profile/);
  assert.match(appJs, /sample-library-tab-target/);
  assert.match(appJs, /initializeSampleLibraryTabs/);
  assert.match(appJs, /resolveSampleLibraryTargetId/);
  assert.match(appJs, /revealStyleProfilePane/);
  assert.match(appJs, /success-samples-pane/);
  assert.match(appJs, /note-lifecycle-pane/);
  assert.match(appJs, /style-profile-pane/);
  assert.match(appJs, /renderGenerationResult/);
  assert.match(appJs, /renderWorkflowAssistant/);
  assert.match(appJs, /data-workflow-action/);
  assert.match(appJs, /action: "rewrite"/);
  assert.match(appJs, /action: "save-generation-final"/);
  assert.match(styles, /\.workflow-assistant-card/);
  assert.match(styles, /\.workflow-timeline/);
  assert.match(styles, /\.lifecycle-update-grid/);
  assert.match(styles, /\.generation-repair-banner/);
  assert.match(styles, /\.style-profile-version-card/);
  assert.match(styles, /\.generation-candidate-card/);
  assert.match(styles, /\.style-profile-card/);
  assert.match(styles, /\.sample-library-tab-strip/);
  assert.match(styles, /\.sample-library-tab-panel/);
});
