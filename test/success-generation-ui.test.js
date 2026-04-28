import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

test("frontend exposes success samples, style profile, and generation workbench controls", async () => {
  const [indexHtml, appJs, styles] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "web/index.html"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/app.js"), "utf8"),
    fs.readFile(path.join(process.cwd(), "web/styles.css"), "utf8")
  ]);

  assert.match(indexHtml, /id="generation-workbench-form"/);
  assert.match(indexHtml, /id="success-sample-form"/);
  assert.match(indexHtml, /id="style-profile-pane"/);
  assert.match(appJs, /\/api\/generate-note/);
  assert.match(appJs, /\/api\/success-samples/);
  assert.match(appJs, /\/api\/style-profile\/draft/);
  assert.match(appJs, /renderGenerationResult/);
  assert.match(styles, /\.generation-candidate-card/);
  assert.match(styles, /\.style-profile-card/);
});
