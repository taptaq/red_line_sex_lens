import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend exposes success samples, lifecycle, style profile, and generation workbench controls", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="generation-workbench-form"/);
  assert.match(indexHtml, /id="generation-style-profile-select"/);
  assert.match(indexHtml, /id="success-sample-form"/);
  assert.match(indexHtml, /id="note-lifecycle-pane"/);
  assert.match(indexHtml, /id="style-profile-pane"/);
  assert.match(appJs, /\/api\/generate-note/);
  assert.match(appJs, /\/api\/success-samples/);
  assert.match(appJs, /\/api\/note-lifecycle/);
  assert.match(appJs, /save-lifecycle-generation/);
  assert.match(appJs, /finalDraft/);
  assert.match(appJs, /\/api\/style-profile\/draft/);
  assert.match(appJs, /activate-style-profile/);
  assert.match(appJs, /renderGenerationResult/);
  assert.match(styles, /\.lifecycle-update-grid/);
  assert.match(styles, /\.generation-repair-banner/);
  assert.match(styles, /\.style-profile-version-card/);
  assert.match(styles, /\.generation-candidate-card/);
  assert.match(styles, /\.style-profile-card/);
});
